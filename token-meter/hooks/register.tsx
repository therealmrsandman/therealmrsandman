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
// Set once auto-compaction ran for the current crossing; a fresh reading clears it.
const autoCompacted = atom({ plugin: 'token-meter', key: 'autoCompacted' } as const, false)

// Budget levels (%) that fire a one-time toast.
const BUDGET_LEVELS = [80, 100]

// One turn adding more than this share of the window fires a spike toast.
const SPIKE = 0.15
// Rough chars-per-token for sizing a tool result's text.
const CHARS_PER_TOKEN = 4

// Context-fill levels (%) that trigger a one-time nudge toast.
const THRESHOLDS = [50, 70, 85]

const k = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`)

const bar = (pct: number, width = 10) => {
  const filled = Math.max(0, Math.min(width, Math.round((pct / 100) * width)))
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

const money = (n: number) => `$${n.toFixed(2)}`
const fmtBudget = (b: Budget) => (b.kind === 'usd' ? money(b.limit) : `${k(b.limit)} tokens`)

const budgetPct = (b: Budget, r: Reading, used: number) =>
  Math.round(((b.kind === 'usd' ? (r.usd ?? 0) : used) / b.limit) * 100)

// "$5", "5$", "2.50$" are dollars; "200000", "200k", "1.5m" are tokens.
const parseBudget = (raw: string): Budget | 'off' | null => {
  const s = raw.trim().toLowerCase()
  if (['off', 'clear', 'none', '0'].includes(s)) return 'off'
  const usd = /^\$\s*(\d+(?:\.\d+)?)$|^(\d+(?:\.\d+)?)\s*\$$/.exec(s)
  if (usd) {
    const n = Number(usd[1] ?? usd[2])
    return n > 0 ? { kind: 'usd', limit: n } : null
  }
  const tok = /^(\d+(?:\.\d+)?)\s*([km]?)$/.exec(s)
  if (!tok) return null
  const n = Math.round(Number(tok[1]) * (tok[2] === 'k' ? 1e3 : tok[2] === 'm' ? 1e6 : 1))
  return n > 0 ? { kind: 'tokens', limit: n } : null
}

const isBudget = (v: unknown): v is Budget =>
  !!v &&
  typeof v === 'object' &&
  ((v as Budget).kind === 'usd' || (v as Budget).kind === 'tokens') &&
  typeof (v as Budget).limit === 'number' &&
  (v as Budget).limit > 0

const colorFor = (pct: number) => (pct >= 85 ? 'red' : pct >= 60 ? 'yellow' : 'green')

const tip = (pct: number) =>
  pct >= 85
    ? 'Context nearly full: /compact now, or /clear if the task is done.'
    : pct >= 70
      ? 'Context over 70%: consider /compact to cut the cost of every turn.'
      : 'Context past half: /clear between unrelated tasks keeps turns cheap.'

type Usage = { context: SessionContextUsage; cost?: SessionCost; rateLimits: SessionRateLimit[] }

// Shared by session.start and session.measure.
async function measure($: EngineInterface, u: Usage) {
  const prev = await read($, reading)
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
    turnDelta: prev ? tokens - prev.tokens : 0,
  }
  await update($, reading, () => next)
  await update($, autoCompacted, () => false)

  const biggest = (await read($, tools))[0]
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

  const used = await update($, spent, n => n + Math.max(0, next.turnDelta))
  const b = await read($, budget)
  if (b) {
    const pct = budgetPct(b, next, used)
    const level = BUDGET_LEVELS.filter(l => pct >= l).pop() ?? 0
    if (level > (await read($, budgetWarned))) {
      await update($, budgetWarned, () => level)
      $.ui.toast(
        level >= 100
          ? `Budget reached: 100% of ${fmtBudget(b)} used. Wrap up or /clear; /meter budget off to dismiss.`
          : `Budget at ${level}% of ${fmtBudget(b)}. /compact or narrower reads will stretch it.`,
      )
    }
  }

  if (next.window > 0 && next.turnDelta > next.window * SPIKE) {
    const top = (await read($, tools))[0]
    $.ui.toast(
      `Token spike: +${k(next.turnDelta)} in one turn (${Math.round((next.turnDelta / next.window) * 100)}% of the window)` +
        (top ? `, mostly ${top.name}.` : '.'),
    )
  }

  const crossed = THRESHOLDS.filter(t => percent >= t).pop() ?? 0
  const last = await read($, warned)
  if (crossed > last) $.ui.toast(tip(percent))
  if (crossed !== last) await update($, warned, () => crossed)

  $.ui.status(`ctx ${percent}% · ${k(tokens)}`)
}

// A short, copy-pasteable summary of the session.
async function report($: EngineInterface) {
  const r = await read($, reading)
  const st = await read($, stats)
  const b = await read($, budget)
  const window = r?.window ?? 0
  const lines = [
    'Token meter report',
    `Peak context: ${st.peakPercent}% (${k(st.peakTokens)}/${k(window)})`,
    `Now: ${r?.percent ?? 0}% (${k(r?.tokens ?? 0)}/${k(window)})`,
    `Est. cost: ${r?.usd != null ? money(r.usd) : 'n/a'}`,
    `Compactions: ${st.compactions}`,
    `Biggest turns: ${st.turns.length ? st.turns.map(t => `+${k(t.delta)}${t.tool ? ` (${t.tool})` : ''}`).join(', ') : 'none yet'}`,
  ]
  if (b) lines.push(`Budget: ${budgetPct(b, r ?? { tokens: 0, window, percent: 0, usd: null, limit: null, turnDelta: 0 }, await read($, spent))}% of ${fmtBudget(b)}`)
  return lines.join('\n')
}

export const register: Register = (on, options) => {
  const raw = Number(options.autoCompactAt ?? 0)
  const autoAt = Number.isFinite(raw) && raw > 0 ? Math.min(raw, 95) : 0

  // Opt-in: once a main-loop turn has finished, compact if the context passed the threshold.
  // (The engine refuses a compaction from prompt.submit, under the turn it starts.)
  on('turn.complete', async ($, e, next) => {
    const res = await next(e)
    if (autoAt === 0 || e.agentId !== undefined || e.isAborted) return res
    const r = await read($, reading)
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
    const saved = await $.store.get('budget').catch(() => undefined) // a missing store must not stop the meter
    if (isBudget(saved)) await update($, budget, () => saved)
    await measure($, await $.session.usage()) // plain call: free, no API request
    await $.command.register({
      name: 'meter',
      description: 'Show/hide the token meter; report; budget <tokens|$>|off',
    })
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
  on('session.compact', async ($, e, next) => {
    const r = await next(e)
    if (e.agentId === undefined && e.trigger !== 'precompute' && 'messages' in r) {
      await update($, stats, st => ({ ...st, compactions: st.compactions + 1 }))
    }
    return r
  })

  on('session.measure', async ($, e, next) => {
    await measure($, e)
    return next(e)
  })

  // /clear ends the conversation without a session.start or a fresh measure,
  // so zero the meter here rather than showing pre-clear usage until next turn.
  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear') {
      const prev = await read($, reading)
      if (prev) {
        await update($, reading, () => ({ ...prev, tokens: 0, percent: 0, usd: null, turnDelta: 0 }))
      }
      await update($, warned, () => 0)
      await update($, tools, () => [])
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
        await $.store.delete('budget')
        return { text: 'Budget cleared.' }
      }
      await update($, budget, () => b)
      await $.store.set('budget', b)
      return { text: `Budget set: ${fmtBudget(b)} for this session (saved as the default for new ones).` }
    }
    const hidden = await update($, isHidden, v => !v)
    return { text: hidden ? 'Token meter hidden. Run /meter again to show it.' : 'Token meter shown.' }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const r = await read($, reading)
    if (e.props.hasSurvey || r === null || (await read($, isHidden))) return next(e)

    const top = await read($, tools)
    const b = await read($, budget)
    const bPct = b ? budgetPct(b, r, await read($, spent)) : 0
    const color = b && bPct >= 80 ? 'red' : colorFor(r.percent)
    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="row">
        <Text color={color}>
          {bar(r.percent)} {r.percent}%
        </Text>
        <Text dimColor>
          {'  '}ctx {k(r.tokens)}/{k(r.window)}
          {r.turnDelta > 0 ? `  +${k(r.turnDelta)} last turn` : ''}
          {r.usd !== null ? `  ~$${r.usd.toFixed(2)} est.` : ''}
          {b ? `  budget ${bPct}% of ${fmtBudget(b)}` : ''}
          {top.length ? `  top: ${top.map(t => `${t.name} ${k(t.tokens)}`).join(', ')}` : ''}
          {r.limit ? `  ${r.limit.kind.replace(/_/g, '-')} limit ${Math.round(r.limit.percentUsed)}%` : ''}
        </Text>
      </Box>
    )
  })
}
