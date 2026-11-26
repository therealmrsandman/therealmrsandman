# Memory

## lessons
- Session 4bcb0feb: 116 main calls all on opus, avg context 142k, 15.8M cache-read tokens; only 1 subagent (opus, explicit model). Delegate to haiku/sonnet.
- .claude/token-efficiency-stats.json(.lock) are plugin runtime files: gitignored, never commit.
- gh api search/issues needs "is:issue" in q (else HTTP 422) -> include it first try (2026-11-26)

- Synced plugins disable as "<name>@synced": false in enabledPlugins; claude-code-guide lookup cost 125k tokens -> reuse this, no re-lookup (2026-11-26)
## state
- PR #12 merged (deaea3e): plugin disable + memory + TASKS/dashboard on main.
- Disabled 11 unused synced plugins via "<name>@synced": false in .claude/settings.json (effective next session; verify skill list shrank).
- Diagnosis workspace: /root/.superpowers/diagnosing-superpowers/4bcb0feb-9293-5326-bb0a-da70bf496648/ — report.md written (§7 likely); issue search done (closest obra/superpowers #2096, #2034, #2710); next: user picks comment-on-existing vs new issue draft.
- Productivity memory bootstrap awaits where todos live.
