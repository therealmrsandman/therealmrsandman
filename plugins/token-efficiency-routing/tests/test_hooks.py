"""Run: python3 -B tests/test_hooks.py  (from the plugin root)"""
import json, os, subprocess, sys, tempfile, threading

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def run(script, payload, proj):
    env = dict(os.environ, CLAUDE_PLUGIN_ROOT=ROOT, CLAUDE_PROJECT_DIR=proj)
    p = subprocess.run([sys.executable, "-B", os.path.join(ROOT, "scripts", script)],
                       input=json.dumps(payload), capture_output=True, text=True, env=env)
    return p.returncode, p.stdout

def project(memory=""):
    d = tempfile.mkdtemp()
    os.makedirs(os.path.join(d, ".claude"))
    open(os.path.join(d, ".claude", "memory.md"), "w").write(memory)
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
    n = json.load(open(os.path.join(p, ".claude", "token-efficiency-stats.json")))["sessions"]["s"]["prompts"]
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
json.dump({"last": "sid", "sessions": {"sid": {"transcript": main}}}, open(os.path.join(q, ".claude", "token-efficiency-stats.json"), "w"))
_, out = run("token_report.py", {}, q)
check("report includes agent tokens", "| Output tokens | 200 |" in out)

sys.exit(1 if FAIL else 0)
