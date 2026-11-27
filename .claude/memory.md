# Memory

## lessons
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
- Cloud session git proxy only allows pushing its own branch: deleting other remote branches returns 403 -> ask the user to delete them on GitHub's Branches page (2026-11-27)
- User said branches were deleted but list_branches still showed them (local delete) -> always verify with list_branches before reporting done (2026-11-27)
- Squash merges leave merged branches non-ancestors of main -> stale-branch cleanup must check PR state, not git ancestry alone (2026-11-27)
- Another session recreated a branch the user had deleted (intelligent-sagan, pushed "branch kept") -> never push to a branch after its PR merged or the user deleted it; restart from main on a new branch instead (2026-11-27)
## state
- PRs #14–#21 merged 2026-11-27 (#21: dashboard editor test in CI, token-meter advance()/baseOf() refactor). Doc-fix follow-up PR open.
- Disabled 11 unused synced plugins via "<name>@synced": false in .claude/settings.json (effective next session; verify skill list shrank).
- Diagnosis workspace: /root/.superpowers/diagnosing-superpowers/4bcb0feb-9293-5326-bb0a-da70bf496648/ — report.md written (§7 likely); issue search done (closest obra/superpowers #2096, #2034, #2710); next: user picks comment-on-existing vs new issue draft.
- Productivity memory bootstrap awaits where todos live.
- Skill respect-partner-model-rule committed at .claude/skills/respect-partner-model-rule/SKILL.md (from intelligent-sagan 309a650). With-skill file-based B reps: run1 haiku, run2 sonnet, run3 sonnet, run4 sonnet (baseline opus). Skill conflict noted every run. Next: decide whether to commit the skill to the repo; A and C prompts were reconstructed, so compare loosely.
- With-skill file-based results (2026-11-26): A (extraction) haiku; C (label 300 tickets) haiku; B repeat run 2 = sonnet (run 1 = haiku). B varies between runs: one-run results are not stable (2026-11-26)
