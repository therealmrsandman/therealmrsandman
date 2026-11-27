# register.tsx (hook module)

The single hook module for [[token-meter]]. Declared in `token-meter/hooks/hooks.json`, implemented in `token-meter/hooks/register.tsx`, tested in `register.test.tsx` (32 tests, run with `claude plugin test .`).

## Events handled

| Event | What it does |
|---|---|
| `session.start` | Clears the reading, resets per-conversation counters, restores the saved budget, registers `/meter`, takes a first measurement (no API request). |
| `turn.start` | For main-loop turns: clears the top-3 tool list and opens a turn whose growth is measured from the current reading. |
| `tool.call` | Estimates a tool result's size (chars / 4) and keeps the top 3. |
| `session.measure` | Updates the reading, peak stats, turn growth (since the turn began, so a turn with several readings is one entry and one spike), spend (per reading), budget and threshold toasts, and the status line. |
| `session.compact` | Counts real compactions and rebases the reading so the next turn does not look like a spike. |
| `session.end` (reason `clear`) | Zeroes the meter so pre-`/clear` usage does not linger. |
| `turn.complete` | Only when `autoCompactAt` > 0: compacts once per crossing of the threshold. |
| `command.run` (`meter`) | `/meter` toggles visibility; `/meter report`; `/meter budget <$N \| tokens \| off>`. |
| `ui.render` (`AbovePrompt`) | Draws the one-line band: bar, percent, tokens, budget, last-turn growth, cost, top tools, rate limit. Drops segments from the end to fit the width. |

## State atoms (plugin `token-meter`)

`reading`, `warned`, `isHidden`, `tools`, `budget`, `budgetWarned`, `spent`, `stats`, `autoCompacted`, `turn`, `turnSeq`, `spiked`. Their meaning is in [[context-budget]].

## Constants

Values live in `token-meter/hooks/register.tsx`; the tips, band colours and budget red are derived from them.

- `THRESHOLDS`: context-fill toasts, one per level (`CTX_HIGH`, `CTX_FULL` are its upper two).
- `CTX_YELLOW`: context fill at which the band turns yellow.
- `BUDGET_LEVELS`: budget toasts, one per level; the first (`BUDGET_RED`) also turns the band red.
- `SPIKE`: share of the window one turn must add to fire a spike toast.
- `CHARS_PER_TOKEN`: rough size of tool output.

## Decisions recorded in code comments

- Auto-compaction is off by default and runs only after a finished main-loop turn, because the engine refuses compaction from `prompt.submit`.
- A dollar budget's warnings survive `/clear`, because estimated cost is session-wide.

## Open items

- None. The `.catch` validator warning is resolved; `claude plugin validate` reports nothing (2026-11-27).
