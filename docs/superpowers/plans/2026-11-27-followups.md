# Follow-ups after PR #20 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge #20. Then ship the dashboard CI test (worktree commit `3333e34`) and the token-meter baseline/reset refactor (worktree commit `da0eb29`) as one reviewed follow-up PR, and close out docs and memory.

**Architecture:** Both commits are already built in agent worktrees. This plan integrates them onto `claude/amazing-pascal-xxjczi` after #20 merges, applies the review rulings, and ships.

**Tech Stack:** GitHub Actions, Playwright 1.63.0 (Node 22), Claude Code plugin CLI 2.1.332, TypeScript hooks.

**Spec:** the user's chat requests of 2026-11-27 (Q2 "commit that browser test so CI runs it", Q3 "token-meter baseline/reset refactor"). No separate spec, so rulings are provisional.

## Global Constraints
- Push only to `claude/amazing-pascal-xxjczi`; open PRs as drafts; merge only when the user has asked.
- Suites stay green:
  - `cd plugins/token-meter && claude plugin test .` (37 pass);
  - `python3 -B tests/test_hooks.py` in plugins/token-efficiency-routing;
  - `node tests/dashboard-editors.test.js` (15 PASS).
- No behaviour change in dashboard.html or token-meter.

## Review Focus
- Cherry-picking onto the squashed main: `tests.yml` must keep all three jobs (token-efficiency-routing, token-meter, dashboard).
- First CI run of the `dashboard` job: `npx playwright install --with-deps chromium` must succeed on ubuntu-latest (Task 5 checks the run).
- The test's subtask-edit check must not silently skip (Task 3).
- The `turn` atom comment vs. actual behaviour: readings between turns count toward the last turn (Task 4).
- Agent worktrees in `.claude/worktrees/` must never be committed (Task 6).

---

### Task 1: Merge PR #20
- [ ] Confirm CI is green on the current head (Codex found nothing on `80eba5a`). Squash-merge with `expectedHeadSha` set to that head.

### Task 2: Gate the Task 2 review
- [x] Read `.superpowers/sdd/2026-11-27-followups/task-2-review.md`. Fix any Critical or Important finding in the refactor worktree and get a scoped re-review, or park it with a ruling. Add a ledger line.

### Task 3: Integrate both commits
- [ ] `git fetch origin main && git checkout -B claude/amazing-pascal-xxjczi origin/main && git cherry-pick 3333e34 da0eb29`.
- [ ] In `tests/dashboard-editors.test.js`, make the subtask-edit check unconditional: drop `if (await p.$(S))`. Run `node tests/dashboard-editors.test.js`: expect 15 PASS, exit 0.
- [ ] Commit: `test: never skip the subtask-edit check`.

### Task 4: Correct the `turn` atom comment
**Files:** `plugins/token-meter/hooks/register.tsx` (comment only).
- [ ] Reword it to: readings between turns add to the last turn until `session.start` or `/clear` resets it. Run `claude plugin test .`: expect 37 pass. Commit.

### Task 5: Verify all suites locally
- [ ] Run all three commands from Global Constraints, `claude plugin validate plugins/token-meter`, and `claude plugin validate .`. All must pass.

### Task 6: Ignore agent worktrees
- [ ] Append `.claude/worktrees/` to `.gitignore`. Check that `git status --short` is empty. Commit.

### Task 7: Docs and memory
- [ ] `wiki/entities/ci.md` already has the dashboard row (from 3333e34). In `.claude/memory.md` `## state`: drop the "token-meter baseline/reset refactor" item and add "#20 merged; follow-up PR open". Append a `wiki/log.md` entry. Commit.

### Task 8: Open the follow-up PR
- [ ] Push, open a draft PR covering tasks 3–7, subscribe to it, and arm a 50-minute check-in.

### Task 9: CI and Codex
- [ ] Confirm all three jobs pass, including the first `dashboard` run. Mark the PR ready, then fix any real Codex findings with a test.

### Task 10: Merge and clean up
- [ ] Merge only on the user's ask. Then remove the agent worktrees (`git worktree remove` on both) and delete this plan's `.superpowers/sdd/2026-11-27-followups` workspace.
