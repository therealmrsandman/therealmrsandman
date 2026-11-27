"""Print token usage and memory savings for the current session."""
import glob
import os
import sys

from common import MEMORY_REL, iter_jsonl, load_stats, memory_sections, project_dir

NO_DATA = "No session data yet. Send a prompt first, then run /token-report again."
# Report field -> key in a message's usage block.
FIELDS = {
    "input": "input_tokens",
    "cache_write": "cache_creation_input_tokens",
    "cache_read": "cache_read_input_tokens",
    "output": "output_tokens",
}

root = project_dir()
stats = load_stats(root)
sessions = stats.get("sessions", {})
# Claude Code sets CLAUDE_CODE_SESSION_ID for commands it runs, so with two sessions open
# each reports its own numbers. Without it, fall back to the session that prompted last.
sid = os.environ.get("CLAUDE_CODE_SESSION_ID") or stats.get("last")
s = sessions.get(sid, {}) if isinstance(sessions, dict) else {}

main = s.get("transcript") if isinstance(s, dict) else None
if not isinstance(main, str) or not os.path.isfile(main):
    print(NO_DATA)
    sys.exit(0)
# Subagent transcripts live in <transcript dir>/<session id>/subagents/*.jsonl.
files = [main] + sorted(glob.glob(os.path.join(main[:-6], "subagents", "*.jsonl")))

usage, seen = dict.fromkeys(FIELDS, 0), set()
turns = 0
for path in files:
    try:
        for entry in iter_jsonl(path):
            msg = entry.get("message")
            u = msg.get("usage") if isinstance(msg, dict) else None
            if not isinstance(u, dict):
                continue
            mid = msg.get("id")
            if mid:  # a message split over several lines repeats its id; count it once
                if mid in seen:
                    continue
                seen.add(mid)
            turns += 1
            for field, key in FIELDS.items():
                usage[field] += u.get(key) or 0
    except OSError:
        pass

total_in = usage["input"] + usage["cache_write"] + usage["cache_read"]
cache_rate = usage["cache_read"] / total_in if total_in else 0
mem_lines = sum(len(v) for v in memory_sections(root).values())
prompts = s.get("prompts", 0)

print("| Metric | Value |\n|---|---|")
print(f"| Model calls (incl. {len(files) - 1} agent transcripts) | {turns} |")
print(f"| Input tokens (fresh / cache write / cache read) | {usage['input']:,} / {usage['cache_write']:,} / {usage['cache_read']:,} |")
print(f"| Output tokens | {usage['output']:,} |")
print(f"| Cache hit rate | {cache_rate:.0%} |")
print(f"| Prompts with memory recall | {s.get('recall_hits', 0)} of {prompts} ({s.get('lines_recalled', 0)} lines) |")
print(f"| Memory entries in {MEMORY_REL} | {mem_lines} |")
