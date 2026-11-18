# -*- coding: utf-8 -*-
"""Check the structural marks of a proactively invoked skill.

The checks are necessary, not sufficient. A passing result does not prove
that an agent will select the skill.
"""
import re
import sys
from pathlib import Path

FRONT = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.S)


def fail(message):
    print(message)
    sys.exit(1)


def main():
    if len(sys.argv) != 2:
        fail("usage: check_skill.py <skill-dir>")
    root = Path(sys.argv[1])
    skill = root / "SKILL.md"
    if not skill.is_file():
        fail("missing SKILL.md")
    text = skill.read_text(encoding="utf-8")
    match = FRONT.match(text)
    if not match:
        fail("missing frontmatter")
    block = match.group(1)
    name = re.search(r"^name:\s*(\S+)", block, re.M)
    desc = re.search(r"^description:\s*(.+)", block, re.M)
    if not name or name.group(1) != root.name:
        fail("name does not match directory")
    if not desc or len(desc.group(1)) < 40:
        fail("description too short")
    if "不用于" not in desc.group(1) and "不要用于" not in desc.group(1):
        fail("description has no boundary")
    body = text[match.end():]
    for marker in ("描述", "references/", "scripts/", "为什么做", "验收", "先由人核对"):
        if marker not in body:
            fail("body missing " + marker)
    if "退出码 0" not in body or "不算完成" not in body:
        fail("body does not keep the checker below a real trial")
    for ref in re.findall(r"\]\(([^)]+)\)", body):
        if ref.startswith(("http://", "https://", "#")):
            continue
        if not (root / ref.split("#", 1)[0]).exists():
            fail("broken link " + ref)
    scripts = [p for p in (root / "scripts").glob("*")
               if p.is_file() and p.suffix.lower() in {".py", ".sh", ".mjs", ".js", ".ps1"}]
    copied = root.resolve() != Path(__file__).resolve().parents[1]
    real = [p for p in scripts if p.stat().st_size >= 400 and not (copied and p.name == "check_skill.py")]
    if not real:
        fail("no task script; a copied checker does not count")
    print("OK " + root.name)


if __name__ == "__main__":
    main()
