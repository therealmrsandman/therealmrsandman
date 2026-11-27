# Next Ten Steps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land PR #16, then make the repo layout consistent and CI reproducible, and bring docs and memory up to date.

**Architecture:** Small, independent changes, one commit each, shipped on the session branch `claude/amazing-pascal-xxjczi` as one follow-up PR after #16 merges. Each task ends with the existing test suites green.

**Tech Stack:** GitHub Actions, Claude Code plugin CLI (`claude plugin test|validate`), Python 3.12 stdlib, TypeScript hooks.

**Spec:** the user's request of 2026-11-27 ("10 steps ahead") and the deferred items in `.claude/memory.md` `## state`.

## Global Constraints
- Push only to `claude/amazing-pascal-xxjczi`; open PRs as drafts; merge only when the user has asked.
- Every task must leave both suites green: `claude plugin test .` (token-meter, 37 tests) and `python3 -B tests/test_hooks.py` (token-efficiency-routing).
- No behaviour change to either plugin, except Task 3, which moves token-meter without changing its code.

## Review Focus
- Moved plugin path: the marketplace `source` and CI `working-directory` must both change, or install and CI break. Task 3 runs validate and the CI job.
- Wiki `[[links]]` and file paths after the move: Task 3 greps for any remaining `token-meter/` paths outside `plugins/`.
- Pinned CLI version: the pin must be a version that actually installs. Task 2 installs it locally first.
- Cleanup workflow on its first run: do a dry run before the schedule ever fires (Task 5).
- Memory `## state` lines that refer to work outside the repo must be kept, not deleted (Task 8).

---

### Task 1: Merge PR #16
- [ ] Wait for Codex's review of `37e9671`. Fix any real findings with a test, push, and confirm CI is green.
- [ ] Squash-merge with `expectedHeadSha` set to the current head.

### Task 2: Pin the Claude Code CLI in CI
**Files:** Modify `.github/workflows/tests.yml`
- [ ] Read the version that is installed locally: `claude --version`.
- [ ] Replace `npm install -g @anthropic-ai/claude-code` with `npm install -g @anthropic-ai/claude-code@<that version>`.
- [ ] Commit: `ci: pin Claude Code CLI version`.

### Task 3: Move token-meter under plugins/
**Files:** `git mv token-meter plugins/token-meter`. Modify `.claude-plugin/marketplace.json` (`source: "./plugins/token-meter"`), `.github/workflows/tests.yml` (validate path and working-directory), `README.md`, and the `wiki/entities/*.md` paths.
- [ ] Move the directory and update every reference.
- [ ] Verify: `claude plugin validate plugins/token-meter`, `claude plugin validate .` (the marketplace) and `cd plugins/token-meter && claude plugin test .` give 37 pass.
- [ ] Verify: `grep -rn "token-meter/" --include=*.md --include=*.json --include=*.yml . | grep -v "plugins/token-meter\|wiki/log\|docs/superpowers"` prints nothing.
- [ ] Commit: `refactor: move token-meter under plugins/`.

### Task 4: Refresh docs/repo-map.html
- [ ] Update the tree for `plugins/token-meter` and both workflows, and drop the "sits at the repo root" note. Commit.

### Task 5: Dry-run the cleanup workflow
- [ ] After merge, start `cleanup-branches` by hand with `dry_run: true`. Read its log and report which branches it would delete.

### Task 6: Python syntax check in CI
**Files:** Modify `.github/workflows/tests.yml`, job `token-efficiency-routing`.
- [ ] Add the step `python3 -m py_compile scripts/*.py tests/*.py`. Run it locally; it should exit 0. Commit.

### Task 7: Wiki page for CI
**Files:** Create `wiki/entities/ci.md`; modify `wiki/index.md`.
- [ ] Document the jobs in `tests.yml` and the deletion rules in `cleanup-branches.yml`, and link the page from the index. Commit.

### Task 8: Prune memory state
**Files:** `.claude/memory.md`
- [ ] Replace the PR #14 line with the merged state of #15 and #16. Keep the lines about work outside the repo. Commit.

### Task 9: Open the follow-up PR
- [ ] Push, open a draft PR covering tasks 2–8, subscribe to it, and confirm CI is green.

### Task 10: Wiki log and hand-off
- [ ] Append a `wiki/log.md` entry, push, and report to the user. Remaining items: merging the dashboard's duplicate editors, and the token-meter baseline/reset refactor.
