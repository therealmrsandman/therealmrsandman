"""UserPromptSubmit: inject only the memory lines matching the prompt's keywords."""
import re

from common import MEMORY_REL, memory_sections, project_dir, read_input, update_stats

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
# The first 8 distinct keywords, in prompt order.
words = set(list(dict.fromkeys(w for w in TOKEN.findall(prompt) if len(w) >= 4 and w not in STOP))[:8])

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
    print(f"Recalled from {MEMORY_REL} (use before researching):")
    last = None
    for heading, line in hits:
        if heading != last:
            print(f"## {heading}")
            last = heading
        print(line)

sid = data.get("session_id")
if sid:
    def record(stats):
        sessions = stats.setdefault("sessions", {})
        # Re-insert so this session counts as the most recent when old ones are pruned.
        s = sessions[sid] = sessions.pop(sid, None) or {"prompts": 0, "recall_hits": 0, "lines_recalled": 0}
        s["prompts"] += 1
        s["recall_hits"] += bool(hits)
        s["lines_recalled"] += len(hits)
        if data.get("transcript_path"):
            s["transcript"] = data["transcript_path"]
        stats["last"] = sid
    update_stats(root, record)
