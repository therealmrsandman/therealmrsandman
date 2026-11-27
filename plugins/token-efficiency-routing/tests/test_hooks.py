"""Run: python3 -B tests/test_hooks.py  (from the plugin root)"""
import json, os, subprocess, sys, tempfile, threading

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from common import MEMORY_REL, STATS_REL  # noqa: E402

def run(script, payload, proj):
    env = dict(os.environ, CLAUDE_PLUGIN_ROOT=ROOT, CLAUDE_PROJECT_DIR=proj)
    p = subprocess.run([sys.executable, "-B", os.path.join(ROOT, "scripts", script)],
                       input=json.dumps(payload), capture_output=True, text=True, env=env)
    return p.returncode, p.stdout

def project(memory=""):
    d = tempfile.mkdtemp()
    os.makedirs(os.path.dirname(os.path.join(d, MEMORY_REL)))
    open(os.path.join(d, MEMORY_REL), "w").write(memory)
    return d

def transcript(entries):
    f = tempfile.NamedTemporaryFile("w", suffix=".jsonl", delete=False)
    f.write("\n".join(json.dumps(e) for e in entries)); f.close()
    return f.name

TOOL = {"type": "assistant", "message": {"content": [{"type": "tool_use"}]}}
FAIL = []
def check(name, cond):
    print(("PASS " if cond else "FAIL ") + name)
    if not cond: FAIL.append(name)

# 1. recall matches whole words only
p = project("## misc\n- latest release uses report.py export\n- port 8080 for proxy\n")
_, out = run("recall.py", {"prompt": "which port?"}, p)
check("recall whole-word", "port 8080" in out and "latest release" not in out)

# 2. stop ignores meta user entries (skill loads) when counting tools
t = transcript([{"type": "user", "message": {"content": "do task"}}, TOOL, TOOL,
                {"type": "user", "isMeta": True, "message": {"content": [{"type": "text", "text": "skill body"}]}},
                TOOL, TOOL])
_, out = run("stop.py", {"transcript_path": t}, p)
check("stop ignores isMeta reset", '"block"' in out)

# 3. concurrent stats writes keep valid JSON and all counts
p = project("")
def hit(i): run("recall.py", {"prompt": "x", "session_id": "s"}, p)
ts = [threading.Thread(target=hit, args=(i,)) for i in range(20)]
[t.start() for t in ts]; [t.join() for t in ts]
try:
    n = json.load(open(os.path.join(p, STATS_REL)))["sessions"]["s"]["prompts"]
except Exception:
    n = -1
check("stats concurrent prompts == 20", n == 20)

# 4. robustness: odd input never crashes
rc1, _ = run("recall.py", {"prompt": None}, p)
bad = tempfile.NamedTemporaryFile("wb", suffix=".jsonl", delete=False); bad.write(b'\xff\xfe{bad\n'); bad.close()
rc2, _ = run("stop.py", {"transcript_path": bad.name}, p)
rc3, _ = run("stop.py", {"transcript_path": None}, p)
check("odd input exit 0", (rc1, rc2, rc3) == (0, 0, 0))

# 5. /token-report counts subagent transcripts
q = project()
d = tempfile.mkdtemp(); main = os.path.join(d, "sid.jsonl")
os.makedirs(os.path.join(d, "sid", "subagents"))
u = lambda i: json.dumps({"message": {"id": i, "usage": {"output_tokens": 100}}}) + "\n"
open(main, "w").write(u("a")); open(os.path.join(d, "sid", "subagents", "x.jsonl"), "w").write(u("b"))
json.dump({"last": "sid", "sessions": {"sid": {"transcript": main}}}, open(os.path.join(q, STATS_REL), "w"))
_, out = run("token_report.py", {}, q)
check("report includes agent tokens", "| Output tokens | 200 |" in out)

# 6. a slash command after a saved task starts a new task: no second memory prompt
cmd = {"type": "user", "message": {"content": "<command-name>/token-report</command-name>"}}
t = transcript([{"type": "user", "message": {"content": "do task"}}, TOOL, TOOL, TOOL, cmd,
                {"type": "assistant", "message": {"content": [{"type": "text", "text": "report"}]}}])
_, out = run("stop.py", {"transcript_path": t}, p)
check("stop resets after <command- prompt", out.strip() == "")
t = transcript([{"type": "user", "message": {"content": "do task"}}, TOOL, TOOL,
                {"type": "user", "message": {"content": "<local-command-stdout>ok</local-command-stdout>"}}, TOOL])
_, out = run("stop.py", {"transcript_path": t}, p)
check("stop keeps counting past <local-command output", '"block"' in out)

# 7. stats keep only the 20 most recent sessions
r = project()
for i in range(25):
    run("recall.py", {"prompt": "x", "session_id": f"s{i}"}, r)
run("recall.py", {"prompt": "x", "session_id": "s0"}, r)  # s0 was pruned; now it is the newest again
ids = list(json.load(open(os.path.join(r, STATS_REL)))["sessions"])
check("stats pruned to 20 most recent", len(ids) == 20 and ids[-1] == "s0" and "s5" not in ids and "s6" in ids)

sys.exit(1 if FAIL else 0)
