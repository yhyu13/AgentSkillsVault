#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""初始化 04-business-model 阶段产出目录与骨架文件。"""
import sys
from datetime import date
from pathlib import Path

STAGE = "04-business-model"
TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates"
FILES = [
    ("lean-canvas.md", "lean-canvas.md"),
    ("business-model-canvas-lite.md", None),
    ("pricing-notes.md", None),
    ("risky-assumptions.md", None),
]


def main():
    base = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd() / "opc-doc"
    out = base / "outputs" / STAGE
    out.mkdir(parents=True, exist_ok=True)
    (base / "state").mkdir(parents=True, exist_ok=True)
    today = date.today().isoformat()
    created, skipped = [], []
    for target, tpl in FILES:
        dest = out / target
        if dest.exists():
            skipped.append(target)
            continue
        src = TEMPLATE_DIR / tpl if tpl else None
        if src and src.is_file():
            dest.write_text(src.read_text(encoding="utf-8").replace("{{DATE}}", today),
                            encoding="utf-8")
        else:
            dest.write_text(f"# {target}\n\n> 阶段 {STAGE} ｜ {today}\n\n"
                            f"（内容需用户确认后填写）\n", encoding="utf-8")
        created.append(target)
    print(f"stage: {STAGE}\ndir  : {out}")
    print("created:", ", ".join(created) or "(none)")
    print("skipped:", ", ".join(skipped) or "(none)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
