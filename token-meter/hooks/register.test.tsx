import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

const BAND = {
  plugin: 'token-meter',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isCollapsed: false,
    isWorking: false,
    maxRows: 3,
    bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 3 },
    view: {},
  },
} as const

const METER = {
  command: 'meter',
  args: '',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: false, columns: 100 },
} as const

const usage = (tokens: number, usd = 0.5) => ({
  context: { tokens, window: 200_000, percent: Math.round((tokens / 200_000) * 100) },
  rateLimits: [{ kind: 'five_hour', percentUsed: 23 }],
  cost: { usd },
})

test('the band shows context fill, tokens, turn growth, cost and limit', async ($, on) => {
  on('session.usage', () => ({ value: { startedAt: 0, ...usage(40_000) } }))
  on('command.register', () => ({ value: { command: 'meter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.measure', (_, e) => ({ changed: e.changed }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.session.measure({ ...usage(96_000, 0.84), changed: ['context'] })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /48%/ }))?.text).toContain('48%')
  const detail = await ui.find({ type: 'Text', text: /ctx/ })
  expect(detail?.text).toContain('ctx 96k/200k')
  expect(detail?.text).toContain('+56k last turn')
  expect(detail?.text).toContain('~$0.84 est.')
  expect(detail?.text).toContain('five-hour limit 23%')
  await ui.unmount()
})

test('/meter hides the band and shows it again', async ($, on) => {
  on('session.measure', (_, e) => ({ changed: e.changed }))
  on('command.run', () => ({ text: 'engine' }))

  await $.session.measure({ ...usage(20_000), changed: ['context'] })

  expect((await $.command.run(METER)).text).toContain('hidden')
  let ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /ctx/ })).toBeUndefined()
  await ui.unmount()

  expect((await $.command.run(METER)).text).toContain('shown')
  ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /ctx/ }))?.text).toContain('ctx 20k/200k')
  await ui.unmount()
})

test('/clear zeroes the meter', async ($, on) => {
  on('session.measure', (_, e) => ({ changed: e.changed }))
  on('session.end', (_, e) => ({ sessionId: e.sessionId }))

  await $.session.measure({ ...usage(150_000), changed: ['context'] })
  await $.session.end({ reason: 'clear', sessionId: 's1', resume: { id: 's1' } })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /%/ }))?.text).toContain('0%')
  expect((await ui.find({ type: 'Text', text: /ctx/ }))?.text).toContain('ctx 0/200k')
  await ui.unmount()
})

test('a turn adding >15% of the window fires a spike toast', async ($, on) => {
  const toasts: string[] = []
  on('ui.toast', (_, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  on('session.measure', (_, e) => ({ changed: e.changed }))

  await $.session.measure({ ...usage(10_000), changed: ['context'] })
  await $.session.measure({ ...usage(30_000), changed: ['context'] }) // +10%: quiet
  expect(toasts.some(t => /spike/i.test(t))).toBe(false)
  await $.session.measure({ ...usage(70_000), changed: ['context'] }) // +20%
  expect(toasts.find(t => /spike/i.test(t))).toContain('+40k')
})

test('the band names the three biggest tool calls of the last turn', async ($, on) => {
  on('session.measure', (_, e) => ({ changed: e.changed }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('tool.call', (_, e) => {
    const sizes: Record<string, number> = { Read: 40_000, Bash: 8_000, Grep: 2_000, Glob: 400 }
    const size = sizes[e.tool] ?? 0
    return { result: {}, text: 'x'.repeat(size) } as never
  })

  await $.turn.start({ text: 'go', turnId: 't1' })
  for (const tool of ['Glob', 'Read', 'Grep', 'Bash']) await $.tool.call({ tool, tool_use_id: tool } as never)
  await $.session.measure({ ...usage(30_000), changed: ['context'] })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const detail = (await ui.find({ type: 'Text', text: /ctx/ }))?.text ?? ''
  expect(detail).toContain('top: Read 10k, Bash 2.0k, Grep 500')
  expect(detail).not.toContain('Glob')
  await ui.unmount()

  await $.turn.start({ text: 'next', turnId: 't2' }) // a new turn clears the list
  const ui2 = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui2.find({ type: 'Text', text: /ctx/ }))?.text).not.toContain('top:')
  await ui2.unmount()
})

const budgetRun = (args: string) => ({ ...METER, args })

test('/meter budget $ turns the bar red and toasts at 80% and 100%', async ($, on) => {
  const toasts: string[] = []
  mock.store(on)
  on('ui.toast', (_, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  on('session.measure', (_, e) => ({ changed: e.changed }))

  expect((await $.command.run(budgetRun('budget $2'))).text).toContain('$2.00')
  await $.session.measure({ ...usage(10_000, 1.0), changed: ['context'] })
  expect(toasts.filter(t => /budget/i.test(t))).toHaveLength(0)

  await $.session.measure({ ...usage(12_000, 1.7), changed: ['context'] })
  expect(toasts.filter(t => /budget/i.test(t))).toEqual([expect.stringContaining('80%')])
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const pct = await ui.find({ type: 'Text', text: /6%/ })
  expect(pct?.props.color).toBe('red')
  expect((await ui.find({ type: 'Text', text: /ctx/ }))?.text).toContain('budget 85% of $2.00')
  await ui.unmount()

  await $.session.measure({ ...usage(13_000, 2.1), changed: ['context'] })
  await $.session.measure({ ...usage(14_000, 2.2), changed: ['context'] })
  expect(toasts.filter(t => /budget/i.test(t))).toHaveLength(2)
  expect(toasts.at(-1)).toContain('100%')
})

test('a token budget counts context added this session and is read back from the store', async ($, on) => {
  const toasts: string[] = []
  mock.store(on, { budget: { kind: 'tokens', limit: 50_000 } })
  on('ui.toast', (_, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  on('session.usage', () => ({ value: { startedAt: 0, ...usage(10_000) } }))
  on('command.register', () => ({ value: { command: 'meter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.measure', (_, e) => ({ changed: e.changed }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.session.measure({ ...usage(35_000), changed: ['context'] }) // +25k = 50%
  await $.session.measure({ ...usage(52_000), changed: ['context'] }) // +42k = 84%
  expect(toasts.find(t => /budget/i.test(t))).toContain('80%')
  expect((await $.command.run(budgetRun('budget off'))).text).toMatch(/cleared/i)
})

test('/meter report summarizes peak, cost, compactions and biggest turns', async ($, on) => {
  on('session.measure', (_, e) => ({ changed: e.changed }))
  on('session.compact', () => ({ messages: [{ role: 'user', text: 'summary', toolUses: [] }] }))

  await $.session.measure({ ...usage(20_000, 0.2), changed: ['context'] })
  await $.session.measure({ ...usage(80_000, 0.6), changed: ['context'] }) // +60k
  await $.session.measure({ ...usage(90_000, 0.9), changed: ['context'] }) // +10k
  await $.session.compact({ trigger: 'plugin', messages: [{ role: 'user', text: 'hi', toolUses: [] }] })
  await $.session.measure({ ...usage(15_000, 1.0), changed: ['context'] })
  await $.session.measure({ ...usage(40_000, 1.25), changed: ['context'] }) // +25k

  const text = (await $.command.run({ ...METER, args: 'report' })).text ?? ''
  expect(text).toContain('Peak context: 45% (90k/200k)')
  expect(text).toContain('Est. cost: $1.25')
  expect(text).toContain('Compactions: 1')
  expect(text).toContain('Biggest turns: +60k, +25k, +10k')
  expect(text.split('\n').length).toBeLessThanOrEqual(8)
})

test('the band draws as one row on terminal, desktop, vscode and mobile', async ($, on) => {
  mock.store(on, { budget: { kind: 'usd', limit: 5 } })
  on('session.usage', () => ({ value: { startedAt: 0, ...usage(40_000) } }))
  on('command.register', () => ({ value: { command: 'meter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.measure', (_, e) => ({ changed: e.changed }))

  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    await $.session.start({ cwd: '/', surface, isInteractive: true })
    await $.session.measure({ ...usage(96_000, 0.84), changed: ['context'] })
    const ui = await $.ui.mount({ ...BAND, surface })
    const row = await ui.find({ type: 'Box' })
    expect(row?.props.flexDirection).toBe('row')
    expect((await ui.find({ type: 'Text', text: /48%/ }))?.text).toContain('48%')
    const detail = (await ui.find({ type: 'Text', text: /ctx/ }))?.text ?? ''
    expect(detail).toContain('ctx 96k/200k')
    expect(detail).toContain('budget 17% of $5.00')
    expect(detail).not.toContain('\n')
    await ui.unmount()
  }
})

const done = (turnId: string) =>
  ({ answer: 'ok', durationMs: 1, isAborted: false, turnId, reason: 'answer' }) as const

const autoCompactHarness = (on: On, compacts: string[], toasts: string[] = []) => {
  on('session.measure', (_, e) => ({ changed: e.changed }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('session.messages', () => ({ value: [{ role: 'user', text: 'hi', toolUses: [] }] }) as never)
  on('session.compact', (_, e) => {
    compacts.push(e.instructions ? 'compact' : 'compact (no instructions)')
    return { messages: [{ role: 'user', text: 'summary', toolUses: [] }] }
  })
  on('ui.toast', (_, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
}

test('auto-compaction defaults to 80%', async ($, on) => {
  const compacts: string[] = []
  autoCompactHarness(on, compacts)
  await $.session.measure({ ...usage(150_000), changed: ['context'] }) // 75%
  await $.turn.complete(done('a'))
  expect(compacts).toEqual([])
  await $.session.measure({ ...usage(164_000), changed: ['context'] }) // 82%
  await $.turn.complete(done('b'))
  expect(compacts).toHaveLength(1)
})

test('autoCompactAt 0 turns auto-compaction off', { options: { autoCompactAt: 0 } }, async ($, on) => {
  const compacts: string[] = []
  autoCompactHarness(on, compacts)
  await $.session.measure({ ...usage(190_000), changed: ['context'] })
  await $.turn.complete(done('next'))
  expect(compacts).toEqual([])
})

test('autoCompactAt compacts after the turn once the context passes it', { options: { autoCompactAt: 70 } }, async ($, on) => {
  const compacts: string[] = []
  autoCompactHarness(on, compacts)
  await $.session.measure({ ...usage(120_000), changed: ['context'] }) // 60%
  await $.turn.complete(done('a'))
  expect(compacts).toEqual([])
  await $.session.measure({ ...usage(150_000), changed: ['context'] }) // 75%
  await $.turn.complete(done('b'))
  expect(compacts).toEqual(['compact'])
  await $.turn.complete(done('c')) // not again until a fresh reading
  expect(compacts).toEqual(['compact'])
})

test('after /clear the next turn is not counted as a spike, and est. cost stays', async ($, on) => {
  const toasts: string[] = []
  on('ui.toast', (_, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  on('session.measure', (_, e) => ({ changed: e.changed }))
  on('session.end', (_, e) => ({ sessionId: e.sessionId }))

  await $.session.measure({ ...usage(120_000, 2.5), changed: ['context'] })
  await $.session.end({ reason: 'clear', sessionId: 's1', resume: { id: 's1' } })
  let ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /ctx/ }))?.text).toContain('~$2.50 est.')
  await ui.unmount()

  await $.session.measure({ ...usage(40_000, 2.6), changed: ['context'] }) // fresh base context
  expect(toasts.some(t => /spike/i.test(t))).toBe(false)
  ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /ctx/ }))?.text).not.toContain('last turn')
  await ui.unmount()
})

test('auto-compaction does not repeat while context stays above the threshold', { options: { autoCompactAt: 70 } }, async ($, on) => {
  const compacts: string[] = []
  autoCompactHarness(on, compacts)
  await $.session.measure({ ...usage(164_000), changed: ['context'] }) // 82%
  await $.turn.complete(done('a'))
  await $.session.measure({ ...usage(148_000), changed: ['context'] }) // 74% after compaction
  await $.turn.complete(done('b'))
  expect(compacts).toHaveLength(1)
  await $.session.measure({ ...usage(100_000), changed: ['context'] }) // 50%: below, re-arms
  await $.turn.complete(done('c'))
  await $.session.measure({ ...usage(150_000), changed: ['context'] }) // 75%: crosses again
  await $.turn.complete(done('d'))
  expect(compacts).toHaveLength(2)
})

test('the band fits bodyColumns on a narrow surface', async ($, on) => {
  mock.store(on, { budget: { kind: 'usd', limit: 5 } })
  on('session.usage', () => ({ value: { startedAt: 0, ...usage(40_000) } }))
  on('command.register', () => ({ value: { command: 'meter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.measure', (_, e) => ({ changed: e.changed }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('tool.call', () => ({ result: {}, text: 'x'.repeat(40_000) }) as never)

  await $.session.start({ cwd: '/', surface: 'mobile', isInteractive: true })
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.tool.call({ tool: 'Read', tool_use_id: 'r1' } as never)
  await $.session.measure({ ...usage(96_000, 0.84), changed: ['context'] })

  const ui = await $.ui.mount({ ...BAND, surface: 'mobile', props: { ...BAND.props, bodyColumns: 50 } })
  const pct = (await ui.find({ type: 'Text', text: /%/ }))?.text ?? ''
  const detail = (await ui.find({ type: 'Text', text: /ctx/ }))?.text ?? ''
  expect(pct.length + detail.length).toBeLessThanOrEqual(50)
  expect(detail).toContain('ctx 96k/200k')
  await ui.unmount()
})

test('an unknown /meter subcommand explains usage and leaves the band shown', async ($, on) => {
  on('session.measure', (_, e) => ({ changed: e.changed }))
  await $.session.measure({ ...usage(20_000), changed: ['context'] })
  expect((await $.command.run({ ...METER, args: 'reprot' })).text).toMatch(/report.*budget/)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /ctx/ })).toBeDefined()
  await ui.unmount()
})

test('/meter budget accepts $0 as off and commas in amounts', async ($, on) => {
  mock.store(on)
  expect((await $.command.run({ ...METER, args: 'budget 1,000,000' })).text).toContain('1000k tokens')
  expect((await $.command.run({ ...METER, args: 'budget $0' })).text).toMatch(/cleared/i)
})

test('/clear re-arms auto-compaction', { options: { autoCompactAt: 70 } }, async ($, on) => {
  const compacts: string[] = []
  autoCompactHarness(on, compacts)
  on('session.end', (_, e) => ({ sessionId: e.sessionId }))
  await $.session.measure({ ...usage(164_000), changed: ['context'] }) // 82%
  await $.turn.complete(done('a'))
  expect(compacts).toHaveLength(1)
  await $.session.end({ reason: 'clear', sessionId: 's1', resume: { id: 's1' } })
  // A large first turn after /clear can land at or above the threshold right away;
  // that is the case where a latch left over from before /clear would skip compaction.
  await $.session.measure({ ...usage(150_000), changed: ['context'] }) // 75%
  await $.turn.complete(done('b'))
  expect(compacts).toHaveLength(2)
})

test('after /clear, auto-compaction still runs once per crossing', { options: { autoCompactAt: 70 } }, async ($, on) => {
  const compacts: string[] = []
  autoCompactHarness(on, compacts)
  on('session.end', (_, e) => ({ sessionId: e.sessionId }))
  await $.session.measure({ ...usage(164_000), changed: ['context'] }) // 82%
  await $.turn.complete(done('a'))
  await $.session.end({ reason: 'clear', sessionId: 's1', resume: { id: 's1' } })
  await $.session.measure({ ...usage(40_000), changed: ['context'] }) // 20%
  await $.turn.complete(done('b'))
  expect(compacts).toHaveLength(1)
  await $.session.measure({ ...usage(150_000), changed: ['context'] }) // 75%: crosses again
  await $.turn.complete(done('c'))
  expect(compacts).toHaveLength(2)
  await $.session.measure({ ...usage(160_000), changed: ['context'] }) // 80%: same crossing
  await $.turn.complete(done('d'))
  expect(compacts).toHaveLength(2)
})

const sessionHarness = (on: On, toasts: string[] = []) => {
  on('session.usage', () => ({ value: { startedAt: 0, ...usage(10_000) } }))
  on('command.register', () => ({ value: { command: 'meter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.measure', (_, e) => ({ changed: e.changed }))
  on('session.end', (_, e) => ({ sessionId: e.sessionId }))
  on('ui.toast', (_, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
}
const START = { cwd: '/', surface: 'terminal', isInteractive: true } as const
const CLEAR = { reason: 'clear', sessionId: 's1', resume: { id: 's1' } } as const

test('session.start resets spent tokens and the report', async ($, on) => {
  sessionHarness(on)
  mock.store(on, { budget: { kind: 'tokens', limit: 100_000 } })
  await $.session.start(START)
  await $.session.measure({ ...usage(70_000), changed: ['context'] }) // +60k
  await $.session.start(START)
  const text = (await $.command.run(budgetRun('report'))).text
  expect(text).toContain('Biggest turns: none yet')
  expect(text).toContain('Peak context: 5%')
  expect(text).toContain('Budget: 0% of 100k tokens')
})

test('/clear resets spent tokens and the report', async ($, on) => {
  sessionHarness(on)
  mock.store(on, { budget: { kind: 'tokens', limit: 100_000 } })
  await $.session.start(START)
  await $.session.measure({ ...usage(70_000), changed: ['context'] }) // +60k
  await $.session.end(CLEAR)
  const text = (await $.command.run(budgetRun('report'))).text
  expect(text).toContain('Biggest turns: none yet')
  expect(text).toContain('Peak context: 0%')
  expect(text).toContain('Budget: 0% of 100k tokens')
})

test('a token budget warns again when it is re-crossed after /clear', async ($, on) => {
  const toasts: string[] = []
  sessionHarness(on, toasts)
  mock.store(on, { budget: { kind: 'tokens', limit: 50_000 } })
  await $.session.start(START)
  await $.session.measure({ ...usage(52_000), changed: ['context'] }) // +42k = 84%
  await $.session.end(CLEAR)
  await $.session.measure({ ...usage(10_000), changed: ['context'] }) // fresh base
  await $.session.measure({ ...usage(52_000), changed: ['context'] }) // +42k = 84% again
  expect(toasts.filter(t => /Budget at 80%/.test(t))).toHaveLength(2)
})

for (const [label, saved] of [
  ['a string', 'garbage'],
  ['an infinite limit', { kind: 'usd', limit: Infinity }],
  ['an unsafe limit', { kind: 'tokens', limit: 1e300 }],
  ['a negative limit', { kind: 'tokens', limit: -5 }],
  ['an unknown kind', { kind: 'eur', limit: 5 }],
] as const) {
  test(`a stored budget that is ${label} is ignored`, async ($, on) => {
    sessionHarness(on)
    mock.store(on, { budget: saved })
    await $.session.start(START)
    expect((await $.command.run(budgetRun('budget'))).text).toMatch(/No budget set/)
    const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
    expect((await ui.find({ type: 'Text', text: /ctx/ }))?.text).not.toContain('budget')
    await ui.unmount()
  })
}

test('a store that fails to read does not stop the meter', async ($, on) => {
  sessionHarness(on)
  on('store.get', () => {
    throw new Error('corrupt store')
  })
  await $.session.start(START)
  expect((await $.command.run(budgetRun('budget'))).text).toMatch(/No budget set/)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /ctx/ }))?.text).toContain('ctx 10k/200k')
  await ui.unmount()
})

test('/meter budget rejects an amount too large to count safely', async ($, on) => {
  mock.store(on)
  expect((await $.command.run(budgetRun('budget 99999999999999999999'))).text).toMatch(/Could not read/)
})

test('a compaction resets the turn baseline: no false growth, spike or spend', async ($, on) => {
  const compacts: string[] = []
  const toasts: string[] = []
  autoCompactHarness(on, compacts, toasts)
  on('command.run', () => ({ text: 'engine' }))
  await $.session.measure({ ...usage(100_000), changed: ['context'] })
  await $.session.measure({ ...usage(110_000), changed: ['context'] }) // +10k
  await $.session.compact({ trigger: 'manual', messages: [{ role: 'user', text: 'hi', toolUses: [] }] } as never)
  // The first reading after a compaction is the new base, whichever way it moved.
  await $.session.measure({ ...usage(150_000), changed: ['context'] })
  let ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /ctx/ }))?.text).not.toContain('last turn')
  await ui.unmount()
  expect(toasts.some(t => /spike/i.test(t))).toBe(false)
  await $.session.measure({ ...usage(160_000), changed: ['context'] }) // +10k
  ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /ctx/ }))?.text).toContain('+10k last turn')
  await ui.unmount()
  const text = (await $.command.run(budgetRun('report'))).text
  expect(text).toContain('Compactions: 1')
  expect(text).toContain('Biggest turns: +10k, +10k')
})

test('a reading below the threshold re-arms auto-compaction mid-turn', { options: { autoCompactAt: 70 } }, async ($, on) => {
  const compacts: string[] = []
  autoCompactHarness(on, compacts)
  await $.session.measure({ ...usage(164_000), changed: ['context'] }) // 82%
  await $.turn.complete(done('a'))
  expect(compacts).toHaveLength(1)
  await $.session.measure({ ...usage(60_000), changed: ['context'] }) // 30%: the compaction took
  await $.session.measure({ ...usage(150_000), changed: ['context'] }) // 75%: a new crossing
  await $.turn.complete(done('b'))
  expect(compacts).toHaveLength(2)
})

test('missing usage numbers leave a readable band', async ($, on) => {
  on('session.usage', () => {
    throw new Error('no usage yet')
  })
  on('command.register', () => ({ value: { command: 'meter' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.measure', (_, e) => ({ changed: e.changed }))
  mock.store(on)
  await $.session.start(START)
  expect((await $.command.run(budgetRun('report'))).text).toContain('Est. cost: n/a')
  await $.session.measure({ context: { window: 0 }, rateLimits: [], changed: ['context'] })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /%/ }))?.text).toContain('0%')
  const detail = (await ui.find({ type: 'Text', text: /ctx/ }))?.text ?? ''
  expect(detail).toBe('  ctx 0/0')
  await ui.unmount()
})
