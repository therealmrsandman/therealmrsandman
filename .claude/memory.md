# Memory

## lessons
- origin/HEAD is not set in this clone: diff with git fetch origin main && git diff origin/main...HEAD (2026-11-27)
- plugins/token-efficiency-routing/tests/test_hooks.py is a script that calls sys.exit at import: pytest gives INTERNALERROR; run with python3 tests/test_hooks.py (2026-11-26)
- Synthetic 20-item test too easy to separate models; use harder, ambiguous items and more reps before ranking (2026-11-26)
- Session 4bcb0feb: 116 main calls all on opus, avg context 142k, 15.8M cache-read tokens; only 1 subagent (opus, explicit model). Delegate to haiku/sonnet.
- .claude/token-efficiency-stats.json(.lock) are plugin runtime files: gitignored, never commit.
- gh api search/issues needs "is:issue" in q (else HTTP 422) -> include it first try (2026-11-26)
- Synced plugins disable as "<name>@synced": false in enabledPlugins; claude-code-guide lookup cost 125k tokens -> reuse this, no re-lookup (2026-11-26)
- Planning or dispatch skills invoked with no work named -> ask for the spec or problem list before writing anything; do not guess scope (2026-11-26)
- Each text-only pressure-test subagent cost ~79k tokens (subagent_tokens); batch scenarios and keep prompts short before spawning (2026-11-26)
- 20-ticket label test (synthetic, my key): haiku 20/20, sonnet 20/20, opus 19/20 (missed #9 nonprofit discount -> billing). Each subagent ~79k tokens regardless of model; no cost saving shown (2026-11-26)
- Text-only subagents sometimes end with no SubagentHandback; resend via SendMessage costs another run. Make the prompt demand the exact output lines first (2026-11-26)
- Inline text-only subagent prompts for pressure tests ended without reports; file-based scenario (read file, write answer file) worked (2026-11-26)
- Pressure-test prompts not saved to disk can't be rerun exactly -> save every scenario file in the scratchpad at creation (2026-11-26)
## state
- Routing skill committed 309a650 at .claude/skills/respect-partner-model-rule; user chose keep branch (remote had been auto-deleted after PR #13 merge; push recreated it). Next: user gives diagnosis summary and productivity todos location (2026-11-27).
- Code review fixes (2026-11-27): stale state removed; skill now defines "covers" (general cost clause covers every dispatch -> cheapest model that can do the task) and dropped the conflicting 'ask the partner' step (conflict note now names the skill's model). Edited skill text NOT yet pressure-tested; next: rerun A/B/C with full SKILL.md if user wants (~80k tokens each).
- Disabled 11 unused synced plugins via "<name>@synced": false in .claude/settings.json (effective next session; verify skill list shrank).
- Diagnosis workspace: /root/.superpowers/diagnosing-superpowers/4bcb0feb-9293-5326-bb0a-da70bf496648/ — report.md written (§7 likely); issue search done (closest obra/superpowers #2096, #2034, #2710); next: user picks comment-on-existing vs new issue draft.
- Productivity memory bootstrap awaits where todos live.
- Routing skill pressure tests (pre-fix text, 2026-11-26): A (extraction) haiku; C (label 300 tickets) haiku; B (final review) runs 1-4 haiku, sonnet, sonnet, sonnet (baseline opus); conflict noted every run. A and C prompts reconstructed, compare loosely; B varies between runs.
