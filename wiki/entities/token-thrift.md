# token-thrift (skill)

Bundled in `token-meter/skills/token-thrift/SKILL.md`. Rule: spend tokens only on what the user asked.

## Sections
1. **Context check:** read fill from meter. 70%+ same task → first line "run /compact". 50%+ unrelated topic → first line "run /clear first".
2. **Search recipe:** filtered grep first, then line range. No dir listings unless asked about structure.
3. **Noisy commands:** pipe tests/builds/CI logs to `grep … | head -30` or `tail -25`.
4. **Edit recipe** (added a473d42, 9e0abf1, 47c2b11): read target lines first, change with Edit not Write, no read-back after a successful Edit, Large file (300+) offset/limit at grep hit, don't re-read unchanged files.
5. **Reply shape:** answer + file:line + one assumption line. Nothing else.
6. **Quick reference table.**

## Status
Prose only; no tests. Open review items: frontmatter trigger doesn't cover editing work; minor wording on line 37; no fallback for non-unique Edit match.
