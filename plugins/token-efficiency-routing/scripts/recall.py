"""UserPromptSubmit: inject only the memory lines matching the prompt's keywords."""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import memory_sections, project_dir, read_input, update_stats  # noqa: E402

STOP = set("""about after again also because been before being between both could does doing
during each from have having here into just more most other over same should some such than
that their them then there these they this those through under until very were what when where
which while with would your please make need want like using used help code file files""".split())
MAX_LINES = 12

data = read_input()
root = project_dir(data)

TOKEN = re.compile(r"[a-z][a-z0-9_.-]*[a-z0-9]")
prompt = data.get("prompt")
prompt = prompt.lower() if isinstance(prompt, str) else ""
words = []
for w in TOKEN.findall(prompt):
    if len(w) >= 4 and w not in STOP and w not in words:
        words.append(w)
words = set(words[:8])

hits = []
if words:
    for heading, lines in memory_sections(root).items():
        if heading in ("state", "lessons"):
            continue  # already loaded at session start
        for line in lines:
            if words & set(TOKEN.findall(line.lower())):
                hits.append((heading, line))
hits = hits[:MAX_LINES]

if hits:
    print("Recalled from .claude/memory.md (use before researching):")
    last = None
    for heading, line in hits:
        if heading != last:
            print(f"## {heading}")
            last = heading
        print(line)

sid = data.get("session_id")
if sid:
    def record(stats):
        s = stats.setdefault("sessions", {}).setdefault(sid, {"prompts": 0, "recall_hits": 0, "lines_recalled": 0})
        s["prompts"] += 1
        s["recall_hits"] += 1 if hits else 0
        s["lines_recalled"] += len(hits)
        if data.get("transcript_path"):
            s["transcript"] = data["transcript_path"]
        stats["last"] = sid
    update_stats(root, record)
