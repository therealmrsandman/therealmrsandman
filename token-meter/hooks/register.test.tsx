import { expect, test } from 'claude-code/testing'

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
