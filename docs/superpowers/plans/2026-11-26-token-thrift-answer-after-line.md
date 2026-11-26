# token-thrift: answer after the context line Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decide whether token-thrift's 50%+ "unrelated topic" rule should make the reply answer the user's question after the context-check line, and change SKILL.md only if measured reps show it does.

**Architecture:** A scored micro-experiment of two wordings under fresh subagents, then a conditional one-row edit to `token-meter/skills/token-thrift/SKILL.md`.

**Tech Stack:** Markdown skill file, fresh general-purpose subagents, git.

**Spec:** None. Rulings come from the plan's own text and the writing-skills rule that behavior-shaping guidance is micro-tested (5+ reps per variant, every flagged match read).

## Global Constraints

- Commit to branch `claude/lucid-mccarthy-2txr1t` only. Do not merge.
- Log agent ID and wording together at dispatch time, before reading any result.
- Score every reply by reading it: PASS only if line 1 is the exact template sentence and line 2 onward answers the question.

## Review Focus

1. A reply with the line and no answer (the failure under study).
2. A paraphrased line ("Context is at 74%…") counts as a fail for line 1.
3. Subagent ends without a report: count as missing, never as pass.

---

### Task 1: Baseline (current wording), 5 reps

**Files:**
- Modify: none
- Test: scratchpad scoring table (not committed)

**Interfaces:**
- Consumes: current SKILL.md row: "`New topic and context is at N%: run /clear first, then re-ask.`"
- Produces: a table of agent ID, wording, verbatim line 1, answers-question Y/N.

- [ ] **Step 1: Dispatch 5 fresh subagents** with the current row and the PostgreSQL streaming-replica request. Record each agent ID with `baseline` before dispatch.

- [ ] **Step 2: Score each reply** against the Review Focus rules. Quote line 1 verbatim.

- [ ] **Step 3: Verify** the table has 5 rows, or a named missing-report row for each gap.

### Task 2: Recipe wording, 5 reps

**Files:**
- Modify: none (test copies carry the variant wording in the dispatch prompt only)

**Interfaces:**
- Consumes: variant row "Line 1 is `New topic and context is at N%: run /clear first, then re-ask.` Line 2 onward answers the user's question in full."
- Produces: a second scored table, same columns, each agent ID recorded as `recipe` at dispatch.

- [ ] **Step 1: Dispatch 5 fresh subagents** with the recipe row and the same request. Record IDs as `recipe` before dispatch.

- [ ] **Step 2: Score** exactly as in Task 1.

### Task 3: Decide

**Files:**
- Modify: `token-meter/skills/token-thrift/SKILL.md` only if the recipe variant wins

**Interfaces:**
- Consumes: both scored tables.
- Produces: a ruling in the ledger: "adopt recipe" or "keep current", with the pass counts.

- [ ] **Step 1: Adopt the recipe** only if recipe passes at least 4 of 5 and beats baseline by at least 2. Otherwise keep the current row.

- [ ] **Step 2: If adopted, edit SKILL.md row 17** to the recipe wording. Run `claude plugin validate token-meter`. Expected: validation passes.

- [ ] **Step 3: Commit** the SKILL.md change (only if adopted) and push to `claude/lucid-mccarthy-2txr1t`. Do not merge.

```bash
git add token-meter/skills/token-thrift/SKILL.md
git commit -m "token-thrift: answer after the context line"
git push -u origin claude/lucid-mccarthy-2txr1t
```
