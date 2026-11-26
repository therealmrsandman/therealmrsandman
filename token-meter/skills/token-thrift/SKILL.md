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
| 50%+ | unrelated to earlier work | Line 1 is `New topic and context is at N%: run /clear first, then re-ask.` Line 2 onward answers the user's question in full. |

Do the work anyway (the user decides). Line 1 of your final message is that context line; the answer to the user's question follows from line 2.

## Search recipe

The first command is a filtered search for the thing asked about: `grep -rn PATTERN | head -20`, or Grep/Glob. Read only the matching line range (`sed -n 140,165p`). No directory or file listings unless the question is about structure.

## Noisy commands recipe

Test runners, builds, linters, installs and CI logs (`gh run view --log-failed`) end in a filter, so only the verdict enters context:

- Failures: `<cmd> 2>&1 | grep -E 'FAIL|✕|Error|error TS' | head -30`
- Summary: `<cmd> 2>&1 | tail -25`

Order: the failing test file(s) by path first, filtered; then the wider suite once, piped to `tail -25` for its summary line. Re-run unfiltered only the single test whose filtered output was not enough.

## Reply shape

1. The answer or result (value, file:line, what changed).
2. Only what the user asked for. One version, one dialect: the most likely one.
3. Optionally, one sentence naming the key assumption (dialect, unit, scope).

The reply is these parts and ends after them. What you searched or double-checked is not one of the parts.

## Quick reference

| Situation | Thrifty move |
|---|---|
| Find a setting/symbol | Filtered grep first, then a line range |
| Run tests / build / CI log | Pipe to `grep … \| head -30` or `tail -25` |
| Context 70%+, mid-task | One line: suggest `/compact` |
| Unrelated request, context 50%+ | One line: suggest `/clear` |
| Writing code or SQL | One version, the likeliest dialect; ask instead of listing variants |
| Final reply | Answer + changed location; no search recap |
