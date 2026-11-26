
## Plugins

### token-efficiency-routing
Keeps Claude's context to the minimum a task needs, and shows you the savings.

- **Always on:** core rules, your saved next step and lessons load at every session start.
- **Automatic memory recall:** each prompt pulls in only the matching lines from `.claude/memory.md`.
- **Memory save prompt:** after a substantial task, Claude is asked once to save decisions, facts and lessons.
- **Model routing:** `extractor` (Haiku), `worker` (Sonnet) and `reasoner` (Opus) agents return compact JSON.
- **`/token-report`:** tokens used, cache hit rate, and how often memory answered a prompt.

```bash
/plugin marketplace add therealmrsandman/therealmrsandman
/plugin install token-efficiency-routing@therealmrsandman
```

Requires `python3`. Commit `.claude/memory.md` to share memory; add `.claude/token-efficiency-stats.json` to `.gitignore`.
