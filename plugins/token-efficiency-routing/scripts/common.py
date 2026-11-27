"""Shared helpers for token-efficiency-routing hooks. Standard library only."""
import json
import os
import sys

MEMORY_REL = os.path.join(".claude", "memory.md")
STATS_REL = os.path.join(".claude", "token-efficiency-stats.json")
MAX_SESSIONS = 20  # stats keep only the most recent sessions


def project_dir(data=None):
    return os.environ.get("CLAUDE_PROJECT_DIR") or (data or {}).get("cwd") or os.getcwd()


def read_input():
    try:
        data = json.load(sys.stdin)
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def iter_jsonl(path):
    """Yield each JSON object (dict) line of a .jsonl file; skip blank, bad or non-dict lines."""
    with open(path, encoding="utf-8", errors="replace") as f:
        for raw in f:
            try:
                entry = json.loads(raw)
            except ValueError:
                continue
            if isinstance(entry, dict):
                yield entry


def memory_sections(root):
    """Return {heading: [lines]} for .claude/memory.md, or {} if missing."""
    path = os.path.join(root, MEMORY_REL)
    if not os.path.isfile(path):
        return {}
    sections, heading = {}, ""
    with open(path, encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.rstrip("\n")
            if line.startswith("## "):
                heading = line[3:].strip().lower()
                sections.setdefault(heading, [])
            elif line.startswith("- "):
                sections.setdefault(heading, []).append(line)
    return sections


def load_stats(root):
    try:
        with open(os.path.join(root, STATS_REL), encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"sessions": {}}


def update_stats(root, fn):
    """Locked read-modify-write of the stats file, replaced atomically.

    Sessions are kept in least- to most-recently-used order; only the last MAX_SESSIONS stay.
    """
    try:
        os.makedirs(os.path.join(root, ".claude"), exist_ok=True)
        path = os.path.join(root, STATS_REL)
        with open(path + ".lock", "w") as lock:
            try:
                import fcntl
                fcntl.flock(lock, fcntl.LOCK_EX)
            except ImportError:
                pass  # no locking on Windows; atomic replace still prevents corruption
            stats = load_stats(root)
            fn(stats)
            sessions = stats.get("sessions")
            if isinstance(sessions, dict) and len(sessions) > MAX_SESSIONS:
                stats["sessions"] = dict(list(sessions.items())[-MAX_SESSIONS:])
            tmp = f"{path}.{os.getpid()}.tmp"
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(stats, f)
            os.replace(tmp, path)
    except Exception:
        pass
