# Memory

## lessons
- Synthetic 20-item test too easy to separate models; use harder, ambiguous items and more reps before ranking (2026-11-26)
- Session 4bcb0feb: 116 main calls all on opus, avg context 142k, 15.8M cache-read tokens; only 1 subagent (opus, explicit model). Delegate to haiku/sonnet.
- .claude/token-efficiency-stats.json(.lock) are plugin runtime files: gitignored, never commit.
- gh api search/issues needs "is:issue" in q (else HTTP 422) -> include it first try (2026-11-26)

- Synced plugins disable as "<name>@synced": false in enabledPlugins; claude-code-guide lookup cost 125k tokens -> reuse this, no re-lookup (2026-11-26)
- Planning or dispatch skills invoked with no work named -> ask for the spec or problem list before writing anything; do not guess scope (2026-11-26)
- Each text-only pressure-test subagent cost ~79k tokens (subagent_tokens); batch scenarios and keep prompts short before spawning (2026-11-26)
- 20-ticket label test (synthetic, my key): haiku 20/20, sonnet 20/20, opus 19/20 (missed #9 nonprofit discount -> billing). Each subagent ~79k tokens regardless of model; no cost saving shown (2026-11-26)
## state
- PR #12 merged (deaea3e); main merged into branch (f70b6bf); draft PR #13 open for memory follow-up.
- Disabled 11 unused synced plugins via "<name>@synced": false in .claude/settings.json (effective next session; verify skill list shrank).
- Diagnosis workspace: /root/.superpowers/diagnosing-superpowers/4bcb0feb-9293-5326-bb0a-da70bf496648/ — report.md written (§7 likely); issue search done (closest obra/superpowers #2096, #2034, #2710); next: user picks comment-on-existing vs new issue draft.
- Productivity memory bootstrap awaits where todos live.
- PR #13 (draft): mergeable clean, no CI check runs, no review threads at 2026-11-26; PR check-ins stopped, next GitHub event or user message resumes.
- Baseline done for model-routing skill (B reproduced). Model quality test done (above). Next: harder ticket set with more reps, or with-skill run; await go.
