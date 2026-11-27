import { atom, read, update } from 'claude-code'
import type {
  EngineInterface,
  Register,
  SessionContextUsage,
  SessionCost,
  SessionRateLimit,
} from 'claude-code'

import type { Budget, Reading, Stats, ToolCost } from '../types'

const reading = atom({ plugin: 'token-meter', key: 'reading' } as const, null)
const warned = atom({ plugin: 'token-meter', key: 'warned' } as const, 0)
const isHidden = atom({ plugin: 'token-meter', key: 'isHidden' } as const, false)
const tools = atom({ plugin: 'token-meter', key: 'tools' } as const, [] as ToolCost[])
const budget = atom({ plugin: 'token-meter', key: 'budget' } as const, null as Budget | null)
const budgetWarned = atom({ plugin: 'token-meter', key: 'budgetWarned' } as const, 0)
// Context tokens added this session: the sum of each turn's growth.
const spent = atom({ plugin: 'token-meter', key: 'spent' } as const, 0)
const EMPTY_STATS: Stats = { peakPercent: 0, peakTokens: 0, compactions: 0, turns: [] }
const stats = atom({ plugin: 'token-meter', key: 'stats' } as const, EMPTY_STATS)
// Set once auto-compaction ran for the current crossing; cleared when context drops below the threshold.
const autoCompacted = atom({ plugin: 'token-meter', key: 'autoCompacted' } as const, false)

// Budget levels (%) that fire a one-time toast. The first also turns the band red.
const BUDGET_LEVELS = [80, 100] as const
const [BUDGET_RED] = BUDGET_LEVELS

// One turn adding more than this share of the window fires a spike toast.
const SPIKE = 0.15
// Rough chars-per-token for sizing a tool result's text.
const CHARS_PER_TOKEN = 4

// Context-fill levels (%) that trigger a one-time nudge toast.
const THRESHOLDS = [50, 70, 85] as const
const [, CTX_HIGH, CTX_FULL] = THRESHOLDS
// The band turns yellow from this fill (%); red from CTX_FULL.
const CTX_YELLOW = 60

// From 999_500 the "k" form would round to "1000k", so it switches to millions there.
const k = (n: number) =>
  n >= 999_500
    ? `${(n / 1e6).toFixed(1)}m`
    : n >= 1000
      ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`
      : `${n}`

const bar = (pct: number, width = 10) => {
  const filled = Math.max(0, Math.min(width, Math.round((pct / 100) * width)))
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

const money = (n: number) => `$${n.toFixed(2)}`
const fmtBudget = (b: Budget) => (b.kind === 'usd' ? money(b.limit) : `${k(b.limit)} tokens`)

const budgetPct = (b: Budget, usd: number | null, used: number) =>
  Math.round(((b.kind === 'usd' ? (usd ?? 0) : used) / b.limit) * 100)

const toBudget = (kind: Budget['kind'], n: number): Budget | 'off' | null => {
  if (n === 0) return 'off'
  const b: Budget = { kind, limit: n }
  return isBudget(b) ? b : null
}

// "$5", "5$", "2.50$" are dollars; "200000", "200k", "1.5m" are tokens.
const parseBudget = (raw: string): Budget | 'off' | null => {
  const s = raw.trim().toLowerCase().replace(/,/g, '')
  if (['off', 'clear', 'none'].includes(s)) return 'off'
  const usd = /^\$\s*(\d+(?:\.\d+)?)$|^(\d+(?:\.\d+)?)\s*\$$/.exec(s)
  if (usd) return toBudget('usd', Number(usd[1] ?? usd[2]))
  const tok = /^(\d+(?:\.\d+)?)\s*([km]?)$/.exec(s)
  if (!tok) return null
  return toBudget('tokens', Math.round(Number(tok[1]) * (tok[2] === 'k' ? 1e3 : tok[2] === 'm' ? 1e6 : 1)))
}

const isBudget = (v: unknown): v is Budget =>
  !!v &&
  typeof v === 'object' &&
  ((v as Budget).kind === 'usd' || (v as Budget).kind === 'tokens') &&
  Number.isFinite((v as Budget).limit) &&
  (v as Budget).limit > 0 &&
  (v as Budget).limit <= Number.MAX_SAFE_INTEGER

const colorFor = (pct: number) => (pct >= CTX_FULL ? 'red' : pct >= CTX_YELLOW ? 'yellow' : 'green')

const tip = (pct: number) =>
  pct >= CTX_FULL
    ? 'Context nearly full: /compact now, or /clear if the task is done.'
    : pct >= CTX_HIGH
      ? `Context over ${CTX_HIGH}%: consider /compact to cut the cost of every turn.`
      : 'Context past half: /clear between unrelated tasks keeps turns cheap.'

type Usage = { context: SessionContextUsage; cost?: SessionCost; rateLimits: SessionRateLimit[] }

// Shared by session.start and session.measure. autoAt is the auto-compaction threshold (0 = off).
async function measure($: EngineInterface, u: Usage, autoAt: number) {
  const [prev, [biggest]] = await Promise.all([read($, reading), read($, tools)])
  const tokens = u.context.tokens ?? 0
  const percent =
    u.context.percent ?? (u.context.window > 0 ? Math.round((tokens / u.context.window) * 100) : 0)
  const top = [...u.rateLimits].sort((a, b) => b.percentUsed - a.percentUsed)[0]
  const next: Reading = {
    tokens,
    window: u.context.window,
    percent,
    usd: u.cost ? u.cost.usd : null,
    limit: top ? { kind: top.kind, percentUsed: top.percentUsed } : null,
    turnDelta: prev && !prev.rebase ? tokens - prev.tokens : 0,
  }
  await update($, reading, () => next)
  // Any reading under the threshold re-arms auto-compaction, even mid-turn.
  if (autoAt > 0 && percent < autoAt) await update($, autoCompacted, () => false)

  await update($, stats, st => ({
    ...st,
    peakPercent: Math.max(st.peakPercent, percent),
    peakTokens: Math.max(st.peakTokens, tokens),
    turns:
      next.turnDelta > 0
        ? [...st.turns, { delta: next.turnDelta, ...(biggest ? { tool: biggest.name } : {}) }]
            .sort((a, b) => b.delta - a.delta)
            .slice(0, 3)
        : st.turns,
  }))

  const alerts: string[] = []
  const [used, b] = await Promise.all([
    update($, spent, n => n + Math.max(0, next.turnDelta)),
    read($, budget),
  ])
  if (b) {
    const pct = budgetPct(b, next.usd, used)
    const level = BUDGET_LEVELS.filter(l => pct >= l).pop() ?? 0
    if (level > (await read($, budgetWarned))) {
      await update($, budgetWarned, () => level)
      alerts.push(
        level >= 100
          ? `Budget reached: 100% of ${fmtBudget(b)} used. Wrap up or /clear; /meter budget off to dismiss.`
          : `Budget at ${level}% of ${fmtBudget(b)}. /compact or narrower reads will stretch it.`,
      )
    }
  }

  if (next.window > 0 && next.turnDelta > next.window * SPIKE) {
    alerts.push(
      `Token spike: +${k(next.turnDelta)} in one turn (${Math.round((next.turnDelta / next.window) * 100)}% of the window)` +
        (biggest ? `, mostly ${biggest.name}.` : '.'),
    )
  }

  const crossed = THRESHOLDS.filter(t => percent >= t).pop() ?? 0
  const last = await read($, warned)
  if (crossed > last) alerts.push(tip(percent))
  if (crossed !== last) await update($, warned, () => crossed)
  if (alerts.length) $.ui.toast(alerts.join(' '))

  $.ui.status(`ctx ${percent}% · ${k(tokens)}`)
}

// A new session or /clear starts the meter's per-conversation counters over.
// A dollar budget's warnings survive /clear: est. cost is session-wide, so it would only re-toast.
async function resetConversation($: EngineInterface, keepUsdWarnings: boolean) {
  await update($, warned, () => 0)
  await update($, tools, () => [])
  await update($, autoCompacted, () => false)
  await update($, spent, () => 0)
  await update($, stats, () => EMPTY_STATS)
  const b = await read($, budget)
  if (!(keepUsdWarnings && b?.kind === 'usd')) await update($, budgetWarned, () => 0)
}

// A short, copy-pasteable summary of the session.
async function report($: EngineInterface) {
  const [r, st, b, used] = await Promise.all([read($, reading), read($, stats), read($, budget), read($, spent)])
  const window = r?.window ?? 0
  const lines = [
    'Token meter report',
    `Peak context: ${st.peakPercent}% (${k(st.peakTokens)}/${k(window)})`,
    `Now: ${r?.percent ?? 0}% (${k(r?.tokens ?? 0)}/${k(window)})`,
    `Est. cost: ${r?.usd != null ? money(r.usd) : 'n/a'}`,
    `Compactions: ${st.compactions}`,
    `Biggest turns: ${st.turns.length ? st.turns.map(t => `+${k(t.delta)}${t.tool ? ` (${t.tool})` : ''}`).join(', ') : 'none yet'}`,
  ]
  if (b) lines.push(`Budget: ${budgetPct(b, r?.usd ?? null, used)}% of ${fmtBudget(b)}`)
  return lines.join('\n')
}

export const register: Register = (on, options) => {
  const raw = Number(options.autoCompactAt ?? 0) // off by default: nudges only
  const autoAt = Number.isFinite(raw) && raw > 0 ? Math.min(raw, 95) : 0

  // Opt-in: once a main-loop turn has finished, compact if the context passed the threshold.
  // (The engine refuses a compaction from prompt.submit, under the turn it starts.)
  on('turn.complete', async ($, e, next) => {
    const res = await next(e)
    if (autoAt === 0 || e.agentId !== undefined || e.isAborted) return res
    const r = await read($, reading) // measure() re-arms the latch whenever a reading is under autoAt
    if (r && r.percent >= autoAt && !(await read($, autoCompacted))) {
      await update($, autoCompacted, () => true)
      try {
        const done = await $.session.compact({ instructions: 'Keep the current task, open decisions and file paths.' })
        if (!('skip' in done && done.skip)) $.ui.toast(`Auto-compacted at ${r.percent}% (threshold ${autoAt}%).`)
      } catch {
        $.ui.toast(`Context at ${r.percent}%: auto-compact could not run; try /compact.`)
      }
    }
    return res
  })

  on('session.start', async ($, e, next) => {
    await update($, reading, () => null)
    await resetConversation($, false)
    const saved = await $.store.get('budget').catch(() => undefined) // a missing store must not stop the meter
    if (isBudget(saved)) await update($, budget, () => saved)
    await $.command.register({
      name: 'meter',
      description: 'Show/hide the token meter; report; budget <tokens|$>|off',
    })
    // plain call: free, no API request; on failure the first turn's measure fills the band
    await $.session.usage().then(u => measure($, u, autoAt), () => undefined)
    return next(e)
  })

  // Each turn starts a fresh top-3 list of its biggest tool results.
  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) await update($, tools, () => [])
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const r = await next(e)
    if (e.agentId === undefined && typeof r.text === 'string') {
      const cost = { name: e.tool, tokens: Math.round(r.text.length / CHARS_PER_TOKEN) }
      await update($, tools, list => [...list, cost].sort((a, b) => b.tokens - a.tokens).slice(0, 3))
    }
    return r
  })

  // Count compactions that happened (not skipped, not precomputed) in the main loop.
  // The context shrank outside any turn, so the next reading is a fresh base: no growth, spike or spend.
  on('session.compact', async ($, e, next) => {
    const r = await next(e)
    if (e.agentId === undefined && e.trigger !== 'precompute' && 'messages' in r) {
      // Bookkeeping only: a failure here must not fail the compaction itself.
      await Promise.all([
        update($, stats, st => ({ ...st, compactions: st.compactions + 1 })),
        update($, reading, prev => (prev ? { ...prev, turnDelta: 0, rebase: true } : prev)),
      ]).catch(() => undefined)
    }
    return r
  })

  on('session.measure', async ($, e, next) => {
    await measure($, e, autoAt)
    return next(e)
  })

  // /clear ends the conversation without a session.start or a fresh measure,
  // so zero the meter here rather than showing pre-clear usage until next turn.
  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear') {
      const prev = await read($, reading)
      if (prev) {
        await update($, reading, () => ({ ...prev, tokens: 0, percent: 0, turnDelta: 0, rebase: true }))
      }
      await resetConversation($, true)
      $.ui.status(prev ? `ctx 0% · 0` : undefined)
    }
    return next(e)
  })

  on('command.run', { command: 'meter' }, async ($, e) => {
    const [sub, ...rest] = e.args.trim().split(/\s+/)
    if (sub === 'report') return { text: await report($) }
    if (sub === 'budget') {
      const arg = rest.join(' ')
      if (!arg) {
        const b = await read($, budget)
        return { text: b ? `Budget: ${fmtBudget(b)}.` : 'No budget set. Try /meter budget $5 or /meter budget 500k.' }
      }
      const b = parseBudget(arg)
      if (b === null) return { text: `Could not read "${arg}". Try /meter budget $5 or /meter budget 500k.` }
      await update($, budgetWarned, () => 0)
      if (b === 'off') {
        await update($, budget, () => null)
        const ok = await $.store.delete('budget').then(() => true, () => false)
        return { text: ok ? 'Budget cleared.' : 'Budget cleared for this session (could not update the saved default).' }
      }
      await update($, budget, () => b)
      const saved = await $.store.set('budget', b).then(() => true, () => false)
      return {
        text: `Budget set: ${fmtBudget(b)} for this session` + (saved ? ' (saved as the default for new ones).' : ' (could not save it as the default).'),
      }
    }
    if (sub) return { text: 'Usage: /meter (show/hide) · /meter report · /meter budget <$N|tokens|off>' }
    const hidden = await update($, isHidden, v => !v)
    return { text: hidden ? 'Token meter hidden. Run /meter again to show it.' : 'Token meter shown.' }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const [r, hidden, top, b, used] = await Promise.all([
      read($, reading),
      read($, isHidden),
      read($, tools),
      read($, budget),
      read($, spent),
    ])
    if (e.props.hasSurvey || r === null || hidden) return next(e)

    const bPct = b ? budgetPct(b, r.usd, used) : 0
    const color = b && bPct >= BUDGET_RED ? 'red' : colorFor(r.percent)
    const { Box, Text } = $.ui.resolve(e)
    const head = `${bar(r.percent)} ${r.percent}%`
    // Highest priority first; segments are dropped from the end until the row fits.
    const segs = [
      `ctx ${k(r.tokens)}/${k(r.window)}`,
      b ? `budget ${bPct}% of ${fmtBudget(b)}` : '',
      r.turnDelta > 0 ? `+${k(r.turnDelta)} last turn` : '',
      r.usd !== null ? `~${money(r.usd)} est.` : '',
      top.length ? `top: ${top.map(t => `${t.name} ${k(t.tokens)}`).join(', ')}` : '',
      r.limit ? `${r.limit.kind.replace(/_/g, '-')} limit ${Math.round(r.limit.percentUsed)}%` : '',
    ].filter(Boolean)
    const line = () => segs.map(x => `  ${x}`).join('')
    while (segs.length > 1 && head.length + line().length > e.props.bodyColumns) segs.pop()
    // Still too wide with one segment: cut it short with "…" rather than overflow.
    const room = e.props.bodyColumns - head.length - 2 // 2 = the segment's leading spaces
    const [only = ''] = segs
    if (only.length > room) {
      if (room > 1) segs[0] = `${only.slice(0, room - 1)}…`
      else segs.pop()
    }

    return (
      <Box flexDirection="row">
        <Text color={color}>{head}</Text>
        <Text dimColor>{line()}</Text>
      </Box>
    )
  })
}
