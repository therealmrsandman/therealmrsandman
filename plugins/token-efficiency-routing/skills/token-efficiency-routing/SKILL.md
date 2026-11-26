---
name: token-efficiency-routing
description: Highest priority. Use at the start of every task and whenever spawning, routing to, or receiving output from an agent. Governs context use, model choice, and agent output format.
---

# Token Efficiency & Task Routing

Overrides default habits. Applies to the orchestrator and every agent.

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
