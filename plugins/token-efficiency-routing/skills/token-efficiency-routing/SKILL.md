---
name: token-efficiency-routing
description: Use when starting any task, deciding what to read or search next, choosing a model or agent for a piece of work, or handing work to or receiving output from an agent.
---

# Token Efficiency & Task Routing

Core skill. Overrides default habits. Applies to the orchestrator and every agent.
**Goal, always:** keep context to the absolute minimum needed to complete the task. Fewer tokens keeps work moving.

Companion skills, loaded only when needed:
- `memory-recall`: check before any research or file reading (matching lines are also injected automatically with each prompt).
- `memory`: save durable results once a task finishes.
- `advanced-reasoning`: hard decisions only.

## Starting point
1. If `## state` in `.claude/memory.md` has a `next_action`, resume from it; don't re-plan. (It's loaded at session start.)
2. Otherwise pick the smallest step that produces evidence toward the goal.
3. Start it immediately. Finish each step with a `next_action` so the next one is obvious.

## Context
- Check recalled memory first; skip research it already answers.
- Search (Grep/Glob) before reading; read only the needed range.
- Don't reread files or repeat tool calls without a new reason.
- Load only the relevant section of any doc.
- Batch similar queries into one call or one parallel turn.
- Stop researching once evidence is sufficient.

## Routing: when spawning agents
The session's own model is fixed; route by choosing the agent.

| Task | Agent | Model |
|---|---|---|
| Extraction, classification, lookup, formatting | `extractor` | `haiku` |
| Routine implementation, edits, summaries | `worker` | `sonnet` |
| Strategy, hard analysis, final decisions | `reasoner` | `opus` |

Pick the smallest agent that can do the job; escalate only on low confidence or `partial` status.

## Handoffs
- Pass a summary, never the full research history.
- Send only the facts the receiving agent needs.
- Keep working memory (scratch, per task) separate from permanent memory (`.claude/memory.md`); persist only the latter.

## Output
- No progress narration. No long explanations unless asked.
- Agents return structured output only, with just the relevant fields:

```json
{
  "status": "complete",
  "decision": "advance",
  "confidence": 0.86,
  "evidence_count": 7,
  "key_findings": [],
  "risks": [],
  "next_action": "supplier_validation"
}
```

Never return reasoning chains or research logs to the orchestrator.

## Self-improvement
After each task, check: did any step waste tokens, repeat work, or stall on where to start?
- If yes, add one line under `## lessons` in `.claude/memory.md`: `- <pattern> -> <fix> (YYYY-MM-DD)`.
- Merge duplicates, delete lessons proven wrong, keep at most 15.
- Lessons load at every session start, so each one applies from the next session on.
