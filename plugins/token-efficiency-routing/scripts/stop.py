"""Stop: after a substantial task, ask once for a memory save. Silent otherwise."""
import json
import sys

from common import MEMORY_REL, iter_jsonl, read_input

MIN_TOOL_CALLS = 3
# User entries that are not a new task: interrupt markers and local-command output.
NOT_A_TASK = ("[Request interrupted", "<local-command")

data = read_input()
if data.get("stop_hook_active"):
    sys.exit(0)

tool_calls = 0
try:
    for e in iter_jsonl(data["transcript_path"]):
        if e.get("isMeta") or e.get("isSidechain") or e.get("isCompactSummary"):
            continue
        content = (e.get("message") or {}).get("content")
        if e.get("type") == "user":
            # A real prompt or a slash command (<command-...>) starts a new task; a tool result does not.
            texts = [content] if isinstance(content, str) else [
                c.get("text", "") for c in content or [] if isinstance(c, dict) and c.get("type") == "text"]
            if any(t and not t.startswith(NOT_A_TASK) for t in texts):
                tool_calls = 0
        elif e.get("type") == "assistant" and isinstance(content, list):
            tool_calls += sum(1 for c in content if isinstance(c, dict) and c.get("type") == "tool_use")
except Exception:
    sys.exit(0)

if tool_calls >= MIN_TOOL_CALLS:
    print(json.dumps({
        "decision": "block",
        "reason": (
            f"Memory check: save to {MEMORY_REL} (per the `memory` skill, one line each) any durable "
            "decision, verified fact or reusable result from this task; a token-waste lesson under "
            "`## lessons`; the next step under `## state`. If nothing qualifies, stop with no output."
        ),
    }))
