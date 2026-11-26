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
