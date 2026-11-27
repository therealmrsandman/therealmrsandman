# ci

GitHub Actions in `.github/workflows/`.

## tests.yml (every PR, and pushes to main)
| Job | Steps |
|---|---|
| `token-efficiency-routing` | Python 3.12 · `py_compile` on `scripts/` and `tests/` · `python3 -B tests/test_hooks.py` |
| `token-meter` | Node 22 · installs a pinned `@anthropic-ai/claude-code` · `claude plugin validate` on both plugins · `claude plugin test .` in `plugins/token-meter` |

Bump the pinned CLI version on purpose and check that both jobs stay green.

## cleanup-branches.yml (Mondays 04:17 UTC, or by hand)
Deletes a `claude/*` branch only when all of these hold:
- it has no open PR;
- its last commit is older than 7 days;
- a PR from it was merged or closed, **or** `main` already contains all of its commits.

Unmerged branches with no PR are kept. The check uses PR state because a squash merge doesn't make a branch's commits part of `main`'s history. A run started by hand is a dry run by default.

Related: [[token-meter]], [[token-efficiency-routing]].
