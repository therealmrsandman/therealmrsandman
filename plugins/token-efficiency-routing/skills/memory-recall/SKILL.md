---
name: memory-recall
description: Use when about to research, read files, search the web, or brief an agent on a topic that may have come up in an earlier session.
---

# Memory Recall

Matching lines are injected automatically with each prompt. Use this skill mid-task, when a new topic comes up.
If `.claude/memory.md` doesn't exist, skip recall and proceed.

1. Pick 2-4 keywords from the task.
2. Grep `.claude/memory.md` for them (case-insensitive). Never read the whole file.
3. Use only the matching lines plus their `## topic` heading.
4. If they answer the question, stop and act on them. Skip the research.
5. If nothing matches, proceed, and save the result with `memory` afterwards.

When handing off to an agent, pass only the recalled lines it needs, not the search output.
If a recalled entry proves wrong, fix or delete it with `memory`.
