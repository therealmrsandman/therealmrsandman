---
name: memory
description: Use when a task finishes or a durable fact, decision, or reusable result appears. Saves it to permanent memory in as few tokens as possible so it never has to be researched again.
---

# Memory

Permanent memory: `.claude/memory.md` in the project root. Create it if missing.
Working memory (scratch, drafts, raw research) stays in the session; never save it.

## Save only
- Decisions and their one-line reason.
- Verified facts that took real work to find.
- Reusable results (paths, commands, IDs, configs).
- Lessons for the core skill go in its **Lessons** section, not here.

## Format
One line per entry, grouped under a short `## topic` heading:
`- <fact or decision> (YYYY-MM-DD)`

## Rules
- Search the file before adding; update an entry instead of duplicating it.
- Replace outdated entries; delete wrong ones.
- No reasoning, logs, or quotes. Compress to the fewest words that stay unambiguous.
- Keep the file under 150 lines; merge or prune the oldest low-value entries when over.
