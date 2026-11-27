# register.tsx (hook module)

The single hook module for [[token-meter]]. Declared in `token-meter/hooks/hooks.json`, implemented in `token-meter/hooks/register.tsx`, tested in `register.test.tsx` (32 tests, run with `claude plugin test .`).

## Events handled

| Event | What it does |
|---|---|
| `session.start` | Clears the reading, resets per-conversation counters, restores the saved budget, registers `/meter`, takes a first measurement (no API request). |
| `turn.start` | Clears the top-3 tool list for main-loop turns. |
| `tool.call` | Estimates a tool result's size (chars / 4) and keeps the top 3. |
| `session.measure` | Updates the reading, peak stats, per-turn growth, spend, budget and threshold toasts, and the status line. |
| `session.compact` | Counts real compactions and rebases the reading so the next turn does not look like a spike. |
| `session.end` (reason `clear`) | Zeroes the meter so pre-`/clear` usage does not linger. |
| `turn.complete` | Only when `autoCompactAt` > 0: compacts once per crossing of the threshold. |
| `command.run` (`meter`) | `/meter` toggles visibility; `/meter report`; `/meter budget <$N \| tokens \| off>`. |
| `ui.render` (`AbovePrompt`) | Draws the one-line band: bar, percent, tokens, budget, last-turn growth, cost, top tools, rate limit. Drops segments from the end to fit the width. |

## State atoms (plugin `token-meter`)

`reading`, `warned`, `isHidden`, `tools`, `budget`, `budgetWarned`, `spent`, `stats`, `autoCompacted`. Their meaning is in [[context-budget]].

## Constants

- `THRESHOLDS = [50, 70, 85]`: context-fill toasts, one per level.
- `BUDGET_LEVELS = [80, 100]`: budget toasts, one per level.
- `SPIKE = 0.15`: a turn adding more than 15% of the window fires a spike toast.
- `CHARS_PER_TOKEN = 4`: rough size of tool output.

## Decisions recorded in code comments

- Auto-compaction is off by default and runs only after a finished main-loop turn, because the engine refuses compaction from `prompt.submit`.
- A dollar budget's warnings survive `/clear`, because estimated cost is session-wide.

## Open items

- None. The `.catch` validator warning is resolved; `claude plugin validate` reports nothing (2026-11-27).
