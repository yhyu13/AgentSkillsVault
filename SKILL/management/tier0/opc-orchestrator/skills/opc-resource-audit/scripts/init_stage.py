#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""初始化 01-resource-audit 阶段产出目录与骨架文件。

用法::

    python scripts/init_stage.py            # 写到 ./opc-doc
    python scripts/init_stage.py D:/work/opc-doc

已存在的文件不会被覆盖，可重复执行。
"""
import sys
from datetime import date
from pathlib import Path

STAGE = "01-resource-audit"
TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates"
FILES = [
    ("inventory.md", "inventory.md"),
    ("scorecard.json", "scorecard.json"),
]


def render(name: str, today: str) -> str:
    src = TEMPLATE_DIR / name
    if src.is_file():
        return src.read_text(encoding="utf-8").replace("{{DATE}}", today)
    return f"# {name}\n\n> 阶段 {STAGE} ｜ {today}\n"


def main() -> int:
    base = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd() / "opc-doc"
    out = base / "outputs" / STAGE
    out.mkdir(parents=True, exist_ok=True)
    (base / "state").mkdir(parents=True, exist_ok=True)
    today = date.today().isoformat()
    created, kept = [], []
    for target, tpl in FILES:
        dest = out / target
        if dest.exists():
            kept.append(target)
            continue
        dest.write_text(render(tpl, today), encoding="utf-8")
        created.append(target)
    print(f"stage: {STAGE}")
    print(f"dir  : {out}")
    print("created:", ", ".join(created) if created else "(none)")
    print("kept   :", ", ".join(kept) if kept else "(none)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
