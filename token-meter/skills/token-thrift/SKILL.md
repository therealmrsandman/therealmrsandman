---
name: token-thrift
description: Use when the user wants to save tokens or keep context small, when the context meter or /context shows the window filling up (70%+), when the user switches to unrelated work in a long session, or when answering in a session where cost or rate limits matter.
---

# Token Thrift

Every token you read or write stays in context and is re-sent on every later turn. Spend tokens only on what the user asked for.

## Context check (do this first, every turn)

Read the context fill from the token-meter line above the prompt (`█████░░░░░ 74%`), a `/context` result, or a session-state note. If none is visible, skip this section.

| Fill | Next task is | First line of your final message |
|---|---|---|
| 70%+ | the same task, continuing | `Context is at N%: run /compact before we go much further.` |
| 50%+ | unrelated to earlier work | `New topic and context is at N%: run /clear first, then re-ask.` |

Do the work anyway (the user decides), then open your final message with that line, so it is the last thing the user reads before typing.

## Search recipe

The first command is a filtered search for the thing asked about: `grep -rn PATTERN | head -20`, or Grep/Glob. Read only the matching line range (`sed -n 140,165p`). No directory or file listings unless the question is about structure.

## Reply shape

1. The answer or result (value, file:line, what changed).
2. Only what the user asked for. One version, one dialect: the most likely one.
3. Optionally, one sentence naming the key assumption (dialect, unit, scope).

The reply is these parts and ends after them. What you searched or double-checked is not one of the parts.

## Quick reference

| Situation | Thrifty move |
|---|---|
| Find a setting/symbol | Filtered grep first, then a line range |
| Context 70%+, mid-task | One line: suggest `/compact` |
| Unrelated request, context 50%+ | One line: suggest `/clear` |
| Writing code or SQL | One version, the likeliest dialect; ask instead of listing variants |
| Final reply | Answer + changed location; no search recap |
