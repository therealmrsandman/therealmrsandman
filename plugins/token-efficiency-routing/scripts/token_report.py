"""Print token usage and memory savings for the current session."""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import MEMORY_REL, load_stats, memory_sections, project_dir  # noqa: E402

root = project_dir()
stats = load_stats(root)
sid = stats.get("last")
s = stats.get("sessions", {}).get(sid, {})

usage, seen = {"input": 0, "cache_write": 0, "cache_read": 0, "output": 0}, set()
turns = 0
try:
    with open(s["transcript"], encoding="utf-8") as f:
        for raw in f:
            try:
                msg = (json.loads(raw).get("message") or {})
            except ValueError:
                continue
            u = msg.get("usage")
            if not u or msg.get("id") in seen:
                continue
            seen.add(msg.get("id"))
            turns += 1
            usage["input"] += u.get("input_tokens", 0)
            usage["cache_write"] += u.get("cache_creation_input_tokens", 0)
            usage["cache_read"] += u.get("cache_read_input_tokens", 0)
            usage["output"] += u.get("output_tokens", 0)
except (KeyError, OSError):
    print("No session data yet. Send a prompt first, then run /token-report again.")
    sys.exit(0)

total_in = usage["input"] + usage["cache_write"] + usage["cache_read"]
cache_rate = usage["cache_read"] / total_in if total_in else 0
mem_lines = sum(len(v) for v in memory_sections(root).values())
prompts = s.get("prompts", 0)

print("| Metric | Value |\n|---|---|")
print(f"| Model calls | {turns} |")
print(f"| Input tokens (fresh / cache write / cache read) | {usage['input']:,} / {usage['cache_write']:,} / {usage['cache_read']:,} |")
print(f"| Output tokens | {usage['output']:,} |")
print(f"| Cache hit rate | {cache_rate:.0%} |")
print(f"| Prompts with memory recall | {s.get('recall_hits', 0)} of {prompts} ({s.get('lines_recalled', 0)} lines) |")
print(f"| Memory entries in {MEMORY_REL} | {mem_lines} |")
