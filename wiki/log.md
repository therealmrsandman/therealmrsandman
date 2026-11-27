# Log

- 2026-11-26 — Wiki bootstrapped by hand (Pith setup.py absent). Pages: index, token-meter, token-thrift, context-budget, read-before-edit.
- 2026-11-26 — token-thrift edit recipe: a473d42, 9e0abf1 (edit recipe), 47c2b11 (read-first). PR #7 open, description updated.
- 2026-11-26 — Plugin tests 32/32 via `claude plugin test`. Validation passes.
- 2026-11-26 — PR #7 merged into main (merge commit 7d75538) after Codex review of ec16709 found no issues.
- 2026-11-26 — Added entities/register-hooks: events, state atoms, constants, /meter command.
- 2026-11-26 — PR #12 (disable unused plugins, session memory, task dashboard) and PR #13 (memory follow-up) merged into main.
- 2026-11-27 — token-meter enabled in `.claude/settings.json`. Added `docs/repo-map.html`.
- 2026-11-27 — Wiki audit against code: brought register-hooks from `claude/lucid-mccarthy-2txr1t`; removed stale `.catch` warning (validate now clean); fixed autoCompactAt range and token-thrift context rule; added entities/token-efficiency-routing.
- 2026-11-27 — Cleanup: token-meter band/report reads batched, k() shows millions, narrow band truncates with …; Python hooks share iter_jsonl, prune stats to 20 sessions, slash commands reset the stop count; dashboard markdown keeps code out of emphasis; repo-map counts computed; README lists both plugins. Tests 34/34 and 8/8.
- 2026-11-27 — PR #14 squash-merged (0fcf593); Codex no findings, CI green. Stale claude/ branches deleted. Added `.github/workflows/cleanup-branches.yml` (weekly).
- 2026-11-27 — token-meter measures growth per turn (one Biggest-turns entry and at most one spike per turn); /token-report follows CLAUDE_CODE_SESSION_ID so two open sessions each see their own numbers.
- 2026-11-27 — PR #16 merged (8fa161a). token-meter moved to plugins/token-meter; CLI pinned in CI; py_compile step; wiki CI page.
- 2026-11-27 — PR #21 merged (1ebf9f9). `dashboard` CI job runs the inline-editor Playwright test; token-meter baseline/reset folded into advance()/baseOf(); `.claude/worktrees/` ignored.
