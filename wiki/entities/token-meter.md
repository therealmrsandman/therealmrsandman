# token-meter

Claude Code plugin (`token-meter/`, v0.1.0). Enabled in `.claude/settings.json` since 2026-11-27. Adds one line above the prompt:
`█████░░░░░ 48%  ctx 96k/200k  +6.2k last turn  ~$0.84 est.  five-hour limit 23%`

## Parts
- **Band** (`ui.render` AbovePrompt): context bar (green, yellow ≥60%, red ≥85%), ctx tokens, last-turn growth, est. cost, top-3 tool calls by result size (≈ chars ÷ 4), fullest rate-limit window.
- **Toasts:** one-time at 50%, 70%, 85% (suggest /compact or /clear); spike toast when one turn adds >15% of window (`SPIKE = 0.15`).
- **Budget:** `/meter budget $5` (est. cost) or `/meter budget 500k` (context tokens added this session). Bar red ≥80%; toast at 80% and 100% (`BUDGET_LEVELS`). `off` clears; stored in plugin store.
- **Report:** `/meter report` — peak context, now, est. cost, compactions, 3 biggest turns.
- **Auto-compaction:** off by default. Plugin option `autoCompactAt` (default 0 = off; values above 95 are clamped to 95). Runs once per crossing after a turn.
- **Toggle:** `/meter` hides/shows band.

## Hooks (hooks/register.tsx, details in [[register-hooks]])
turn.start, turn.complete, tool.call, session.start, session.measure, session.compact, session.end, command.run{meter}, ui.render{AbovePrompt}.

## State atoms (plugin "token-meter")
reading, warned, isHidden, tools, budget, budgetWarned, spent, stats, autoCompacted.

## Types (types/index.d.ts)
ToolCost, Budget, Turn, Stats, Reading (`rebase` flag set on /clear and compaction).

## Tests
`claude plugin test token-meter` → 32 pass (rechecked 2026-11-27). Runner is the CLI, not bun. Test kit `claude-code/testing` lives in harness types, gitignored shim.

## Validation
`claude plugin validate token-meter` passes with nothing to report (2026-11-27). The earlier `.catch` warnings on `tool.call` and `session.compact` are gone: `session.compact` bookkeeping and the store read in `session.start` now catch errors.

## Open
Icon is a placeholder; replace before directory submission (README).
