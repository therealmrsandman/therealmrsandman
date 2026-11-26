---
name: memory-recall
description: Use before any research, file reading, or agent handoff. Pulls only the memory lines relevant to the current task so known results are reused instead of rediscovered.
---

# Memory Recall

1. Pick 2-4 keywords from the task.
2. Grep `.claude/memory.md` for them (case-insensitive). Never read the whole file.
3. Use only the matching lines plus their `## topic` heading.
4. If they answer the question, stop and act on them. Skip the research.
5. If nothing matches, proceed, and save the result with `memory` afterwards.

When handing off to an agent, pass only the recalled lines it needs, not the search output.
If a recalled entry proves wrong, fix or delete it with `memory`.
