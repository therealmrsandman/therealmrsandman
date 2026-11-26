---
name: token-efficiency-routing
description: Highest priority, core agent skill. Use at the start of every task and whenever spawning, routing to, or receiving output from an agent. Finds the logical starting point, governs context use, model choice, and agent output, and improves itself after each task.
---

# Token Efficiency & Task Routing

Core skill. Overrides default habits. Applies to the orchestrator and every agent.
Goal: keep tokens to a minimum so work keeps moving.

## Starting point
1. Resume from the last `next_action` or saved state if one exists; don't re-plan.
2. Otherwise pick the smallest step that produces evidence toward the goal.
3. Start it immediately. Finish each step with a `next_action` so the next one is obvious.

## Context
- Search (Grep/Glob) before reading; read only the needed range.
- Don't reread files or repeat tool calls without a new reason.
- Load only the relevant section of any doc.
- Batch similar queries into one call or one parallel turn.
- Stop researching once evidence is sufficient.
- Never redo completed research; reuse cached results.

## Routing
| Task | Model |
|---|---|
| Extraction, classification, lookup, formatting | `haiku` |
| Routine implementation, summaries | `sonnet` |
| Strategy, hard analysis, final decisions | `opus` |

Pick the smallest model that can do the job; escalate only on low confidence.

## Handoffs
- Pass a summary, never the full research history.
- Send only the facts the receiving agent needs.
- Keep working memory (scratch, per task) separate from permanent memory (durable facts, decisions); persist only the latter.

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
- If yes, add one line to **Lessons** below: the pattern and the fix.
- Merge duplicates, delete lessons proven wrong, keep at most 15 lines.
- Edit this file only when a lesson is confirmed; never log routine runs.

## Lessons
<!-- one line each: pattern -> fix -->
