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
    with open(data["transcript_path"], encoding="utf-8", errors="replace") as f:
        for raw in f:
            try:
                e = json.loads(raw)
            except ValueError:
                continue
            if not isinstance(e, dict) or e.get("isMeta") or e.get("isSidechain") or e.get("isCompactSummary"):
                continue
            content = (e.get("message") or {}).get("content")
            if e.get("type") == "user":
                # Only a real prompt (not a tool result or command/interrupt marker) starts a new task.
                texts = [content] if isinstance(content, str) else [
                    c.get("text", "") for c in content or [] if isinstance(c, dict) and c.get("type") == "text"]
                if any(t and not t.startswith(("[Request interrupted", "<command-", "<local-command")) for t in texts):
                    tool_calls = 0
            elif e.get("type") == "assistant" and isinstance(content, list):
                tool_calls += sum(1 for c in content if isinstance(c, dict) and c.get("type") == "tool_use")
except Exception:
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
