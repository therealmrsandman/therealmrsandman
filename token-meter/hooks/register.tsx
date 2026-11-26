import { atom, read, update } from 'claude-code'
import type { Register, SessionContextUsage, SessionCost, SessionRateLimit } from 'claude-code'

import type { Reading } from '../types'

const reading = atom({ plugin: 'token-meter', key: 'reading' } as const, null)
const warned = atom({ plugin: 'token-meter', key: 'warned' } as const, 0)
const isHidden = atom({ plugin: 'token-meter', key: 'isHidden' } as const, false)

// Context-fill levels (%) that trigger a one-time nudge toast.
const THRESHOLDS = [50, 70, 85]

const k = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`)

const bar = (pct: number, width = 10) => {
  const filled = Math.max(0, Math.min(width, Math.round((pct / 100) * width)))
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

const colorFor = (pct: number) => (pct >= 85 ? 'red' : pct >= 60 ? 'yellow' : 'green')

const tip = (pct: number) =>
  pct >= 85
    ? 'Context nearly full: /compact now, or /clear if the task is done.'
    : pct >= 70
      ? 'Context over 70%: consider /compact to cut the cost of every turn.'
      : 'Context past half: /clear between unrelated tasks keeps turns cheap.'

type Usage = { context: SessionContextUsage; cost?: SessionCost; rateLimits: SessionRateLimit[] }

// Shared by session.start and session.measure.
async function measure($: any, u: Usage) {
  const prev = await read($, reading)
  const tokens = u.context.tokens ?? 0
  const percent = u.context.percent ?? Math.round((tokens / u.context.window) * 100)
  const top = [...u.rateLimits].sort((a, b) => b.percentUsed - a.percentUsed)[0]
  const next: Reading = {
    tokens,
    window: u.context.window,
    percent,
    usd: u.cost ? u.cost.usd : null,
    limit: top ? { kind: top.kind, percentUsed: top.percentUsed } : null,
    turnDelta: prev ? tokens - prev.tokens : 0,
  }
  await update($, reading, () => next)

  const crossed = THRESHOLDS.filter(t => percent >= t).pop() ?? 0
  const last = await read($, warned)
  if (crossed > last) $.ui.toast(tip(percent))
  if (crossed !== last) await update($, warned, () => crossed)

  $.ui.status(`ctx ${percent}% · ${k(tokens)}`)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await measure($, await $.session.usage()) // plain call: free, no API request
    await $.command.register({ name: 'meter', description: 'Show or hide the token meter bar' })
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    await measure($, e)
    return next(e)
  })

  on('command.run', { name: 'meter' }, async ($, e, next) => {
    const hidden = await update($, isHidden, v => !v)
    return { text: hidden ? 'Token meter hidden. Run /meter again to show it.' : 'Token meter shown.' }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const r = await read($, reading)
    if (e.props.hasSurvey || r === null || (await read($, isHidden))) return next(e)

    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="row">
        <Text color={colorFor(r.percent)}>
          {bar(r.percent)} {r.percent}%
        </Text>
        <Text dimColor>
          {'  '}ctx {k(r.tokens)}/{k(r.window)}
          {r.turnDelta > 0 ? `  +${k(r.turnDelta)} last turn` : ''}
          {r.usd !== null ? `  ~$${r.usd.toFixed(2)} est.` : ''}
          {r.limit ? `  ${r.limit.kind.replace('_', '-')} limit ${Math.round(r.limit.percentUsed)}%` : ''}
        </Text>
      </Box>
    )
  })
}
