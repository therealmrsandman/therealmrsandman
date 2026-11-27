---
name: respect-partner-model-rule
description: Use when choosing a model for a subagent, reviewer or batch task and the human partner has stated a model or cost rule earlier in the session, or when a skill's text names a model for a step.
---

# Respect the Partner's Model Rule

## Rule

When the partner has stated a model or cost rule, it decides the model for every dispatch it covers. A skill's default model for a step does not override it.

## What "covers" means

- A rule covers a task when it names that task type ("small models for extraction").
- A general cost clause ("keep costs low", "minimize spend") covers every dispatch.
- The rule is silent only when it names neither the task type nor a general cost clause.

## Procedure

1. Before picking a model, check the conversation for the partner's routing or cost rule.
2. If the rule names the task type, use the model it names.
3. If only a general cost clause covers the task, use the cheapest model that can do it: haiku for extraction, classification and lookup; sonnet for implementation, review and other judgment tasks.
4. If the rule is silent, use the skill's model.
5. If a skill names a stronger model than steps 2–3 give, follow the rule and note the conflict to the partner in one line, naming the skill's model so they can override.

## Red flags

| Thought | Reality |
|---|---|
| "The skill says most capable, so I'll use opus" | The partner's rule came first. Note the conflict; don't upgrade. |
| "The last error means I should upgrade" | Mention the past error in the conflict note; the partner decides whether to upgrade. |
