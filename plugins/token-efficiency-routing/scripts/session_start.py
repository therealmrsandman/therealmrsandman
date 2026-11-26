"""SessionStart: load core rules plus saved state and lessons from project memory."""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import memory_sections, project_dir, read_input  # noqa: E402

data = read_input()
plugin_root = os.environ.get("CLAUDE_PLUGIN_ROOT") or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
skill = os.path.join(plugin_root, "skills", "token-efficiency-routing", "SKILL.md")

try:
    text = open(skill, encoding="utf-8").read()
    text = re.sub(r"\A---\n.*?\n---\n", "", text, flags=re.S).strip()
    print("Token-efficiency rules (already loaded; do not invoke the skill again):\n")
    print(text)
except OSError:
    pass

sections = memory_sections(project_dir(data))
for name in ("state", "lessons"):
    lines = sections.get(name)
    if lines:
        print(f"\n## {name} (from .claude/memory.md)")
        print("\n".join(lines[-15:]))
