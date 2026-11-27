# Follow-ups after PR #20

**Goal:** Land the dashboard editor regression test in CI and the token-meter baseline/reset refactor, each reviewed, as one follow-up PR after #20 merges.

## Global Constraints
- Push only to `claude/amazing-pascal-xxjczi`; open PRs as drafts; merge only when the user has asked.
- Suites stay green: `cd plugins/token-meter && claude plugin test .` (37 pass), `python3 -B tests/test_hooks.py` in plugins/token-efficiency-routing, and the dashboard editor test (15 PASS).
- No behaviour change in dashboard.html or token-meter.

### Task 1: Dashboard editor test in CI
**Files:** `tests/dashboard-editors.test.js` (new), `.github/workflows/tests.yml` (new job `dashboard`, Playwright pinned to an exact version), `wiki/entities/ci.md`.
- [ ] The test exits 1 on any failure and resolves dashboard.html relative to itself.
- [ ] The CI job installs the pinned Playwright plus chromium and runs the test.

### Task 2: token-meter baseline/reset refactor
**Files:** `plugins/token-meter/hooks/register.tsx` (and tests only to pin existing behaviour).
- [ ] The spend step, the turn base and turnDelta come from one baseline/reset function called once from measure().
- [ ] 37 tests pass; `claude plugin validate plugins/token-meter` passes.

### Task 3: Integrate
- [ ] After #20 merges: cherry-pick both commits onto the session branch, run every suite, open a draft PR.
