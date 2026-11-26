---
name: advanced-reasoning
description: Use only for strategic decisions, difficult analysis, conflicting evidence, or high-cost/irreversible choices. Reasons deeply on a minimal context and returns a compact decision.
---

# Advanced Reasoning

Use the strongest model (`opus`). Not for lookups, extraction, or routine steps.

## Input (keep it minimal)
- The question, in one sentence.
- Constraints and success criteria.
- Only the evidence that bears on the decision: recalled memory lines and summarized findings, never raw logs.

## Method
1. State the options (2-4).
2. For each: key evidence for and against, main risk.
3. Check the strongest counter-argument to the leading option.
4. Decide. Stop once one option is clearly better; don't gather more evidence than the decision needs.

## Output
Return only:
```json
{
  "decision": "",
  "confidence": 0.0,
  "key_findings": [],
  "risks": [],
  "next_action": ""
}
```
Save the decision and its one-line reason with `memory`.
