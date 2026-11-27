---
name: respect-partner-model-rule
description: Use when choosing a model for a subagent, reviewer or batch task and the human partner has stated a model or cost rule earlier in the session, or when a skill's text names a model for a step.
---

# Respect the Partner's Model Rule

## Rule

When the partner has stated a model or cost rule, it decides the model for every dispatch it covers. A skill's default model for a step does not override it.

## Procedure

1. Before picking a model, check the conversation for the partner's routing or cost rule.
2. If a rule covers the task, use the model the rule names for that task type.
3. If a skill names a stronger model and the rule points cheaper, follow the rule. Note the conflict in one line to the partner.
4. If the rule is silent on the task, use the skill's model.
5. If the task's stakes clearly exceed what the rule anticipated, ask the partner before dispatching.

## Red flags

| Thought | Reality |
|---|---|
| "The skill says most capable, so I'll use opus" | The partner's rule came first. |
| "The last error means I should upgrade" | A past error is a reason to ask, not to override the rule silently. |
