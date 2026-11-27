# token-efficiency-routing

Claude Code plugin (`plugins/token-efficiency-routing/`, v2.0.0, Python standard library only). Keeps context to the minimum a task needs. Enabled in `.claude/settings.json`.

## Hooks (hooks/hooks.json → scripts/)
| Event | Script | What it does |
|---|---|---|
| `SessionStart` (startup, clear, compact) | `session_start.py` | Prints the core skill body (frontmatter stripped), then the last 15 lines of `## state` and `## lessons` from `.claude/memory.md`. |
| `UserPromptSubmit` | `recall.py` | Takes up to 8 prompt keywords (4+ chars, minus stop words), injects up to 12 matching memory lines (`MAX_LINES`), skipping `state`/`lessons`. Records prompts, recall hits and lines in the stats file. |
| `Stop` | `stop.py` | If the current task made 3+ tool calls (`MIN_TOOL_CALLS`), blocks once asking Claude to save to memory. A new prompt or slash command starts a new count; interrupts and local-command output do not. Skips when `stop_hook_active`. |

## Agents (model routing)
- `extractor` — Haiku, Read/Grep/Glob: lookups, extraction, classification.
- `worker` — Sonnet: routine, well-specified edits.
- `reasoner` — Opus, Read/Grep/Glob: hard decisions.
All reply with compact JSON only.

## Skills
- `token-efficiency-routing` — core rules: context, routing table, handoffs, output, self-improvement (lessons ≤ 15).
- `memory` — what to save to `.claude/memory.md`.
- `memory-recall` — grep memory mid-task before research.
- `advanced-reasoning` — send hard decisions to `reasoner`.

## Command
`/token-report` → `token_report.py`: model calls (incl. subagent transcripts), input tokens (fresh / cache write / cache read), output, cache hit rate, prompts with recall, memory entry count.

## Shared state
- `.claude/memory.md` — read by `session_start.py` and `recall.py`; written by Claude via the `memory` skill.
- `.claude/token-efficiency-stats.json` (+ `.lock`) — written by `recall.py` through `common.update_stats` (flock + atomic replace; keeps the 20 most recent sessions), read by `token_report.py`. Gitignored.

## Tests
`python3 -B tests/test_hooks.py` from the plugin root. It is a script (calls `sys.exit`), so pytest fails with INTERNALERROR. All checks pass (2026-11-27).
