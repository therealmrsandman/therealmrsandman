"""Stop: after a substantial task, ask once for a memory save. Silent otherwise."""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import read_input  # noqa: E402

MIN_TOOL_CALLS = 3

data = read_input()
if data.get("stop_hook_active"):
    sys.exit(0)

tool_calls = 0
try:
    with open(data["transcript_path"], encoding="utf-8") as f:
        for raw in f:
            try:
                e = json.loads(raw)
            except ValueError:
                continue
            content = (e.get("message") or {}).get("content")
            if e.get("type") == "user":
                # A real prompt (not a tool result) starts a new task.
                if isinstance(content, str) or any(
                    isinstance(c, dict) and c.get("type") == "text" for c in content or []
                ):
                    tool_calls = 0
            elif e.get("type") == "assistant" and isinstance(content, list):
                tool_calls += sum(1 for c in content if isinstance(c, dict) and c.get("type") == "tool_use")
except (KeyError, OSError):
    sys.exit(0)

if tool_calls >= MIN_TOOL_CALLS:
    print(json.dumps({
        "decision": "block",
        "reason": (
            "Memory check: save to .claude/memory.md (per the `memory` skill, one line each) any durable "
            "decision, verified fact or reusable result from this task; a token-waste lesson under "
            "`## lessons`; the next step under `## state`. If nothing qualifies, stop with no output."
        ),
    }))
