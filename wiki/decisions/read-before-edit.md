# Decision: read-before-Edit in token-thrift

**Context:** Edit recipe (a473d42) said "change with Edit" but not "read first". Reviewer flagged it. Assumed Edit tool refuses unread files.

**Test:** Edit on a scratch copy never Read in session → succeeded. Premise not confirmed here.

**Decision (user-chosen):** add read-first step anyway as defensive guidance. Commit 47c2b11, pushed to `claude/lucid-mccarthy-2txr1t`, in PR #7.

**Open:** behavioral A/B (fresh session, with vs without skill, 300+ line file) not run.
