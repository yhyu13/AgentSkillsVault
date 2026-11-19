#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""初始化 02-niche-positioning 阶段产出目录与骨架文件。"""
import sys
from datetime import date
from pathlib import Path

STAGE = "02-niche-positioning"
TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates"
FILES = [
    ("three-ring-analysis.md", "three-ring-analysis.md"),
    ("candidates.md", None),
    ("target-segment.json", "target-segment.json"),
    ("positioning-statement.md", None),
]


def render(name, today):
    if name is None:
        return None
    src = TEMPLATE_DIR / name
    if src.is_file():
        return src.read_text(encoding="utf-8").replace("{{DATE}}", today)
    return f"# {name}\n\n> 阶段 {STAGE} ｜ {today}\n"


def main():
    base = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd() / "opc-doc"
    out = base / "outputs" / STAGE
    out.mkdir(parents=True, exist_ok=True)
    (base / "state").mkdir(parents=True, exist_ok=True)
    today = date.today().isoformat()
    existing, created = [], []
    for target, tpl in FILES:
        dest = out / target
        if dest.exists():
            existing.append(target)
            continue
        body = render(tpl, today)
        if body is None:
            existing.append(target + "(需要用户确认后手写)")
            continue
        dest.write_text(body, encoding="utf-8")
        created.append(target)
    print(f"stage: {STAGE}\ndir  : {out}")
    print("created:", ", ".join(created) or "(none)")
    print("pending:", ", ".join(existing) or "(none)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
