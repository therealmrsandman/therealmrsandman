"""Shared helpers for token-efficiency-routing hooks. Standard library only."""
import json
import os

MEMORY_REL = os.path.join(".claude", "memory.md")
STATS_REL = os.path.join(".claude", "token-efficiency-stats.json")


def project_dir(data=None):
    return os.environ.get("CLAUDE_PROJECT_DIR") or (data or {}).get("cwd") or os.getcwd()


def read_input():
    try:
        import sys
        return json.load(sys.stdin)
    except Exception:
        return {}


def memory_sections(root):
    """Return {heading: [lines]} for .claude/memory.md, or {} if missing."""
    path = os.path.join(root, MEMORY_REL)
    if not os.path.isfile(path):
        return {}
    sections, heading = {}, ""
    with open(path, encoding="utf-8", errors="ignore") as f:
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


def save_stats(root, stats):
    try:
        os.makedirs(os.path.join(root, ".claude"), exist_ok=True)
        with open(os.path.join(root, STATS_REL), "w", encoding="utf-8") as f:
            json.dump(stats, f)
    except Exception:
        pass
