#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""初始化 07-conversion-loop 阶段产出目录与骨架文件。"""
import sys
from datetime import date
from pathlib import Path

STAGE = "07-conversion-loop"
TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates"
FILES = [
    ("channel-strategy.md", "channel-strategy.md"),
    ("content-plan.md", "content-plan.md"),
    ("conversion-path.md", "conversion-path.md"),
]


def main() -> int:
    base = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd() / "opc-doc"
    if not (base / "outputs" / "06-mvp-design").exists():
        print("[warn] 未发现 06-mvp-design 产出，转换路径可能缺少依据")
    out = base / "outputs" / STAGE
    out.mkdir(parents=True, exist_ok=True)
    today = date.today().isoformat()
    created, skipped = [], []
    for target, tpl in FILES:
        dest = out / target
        if dest.exists():
            skipped.append(target)
            continue
        src = TEMPLATE_DIR / tpl
        if src.is_file():
            dest.write_text(src.read_text(encoding="utf-8").replace("{{DATE}}", today),
                            encoding="utf-8")
        else:
            dest.write_text(f"# {target}\n\n> 阶段 {STAGE} ｜ {today}\n", encoding="utf-8")
        created.append(target)
    print(f"stage: {STAGE}\ndir  : {out}")
    print("created:", ", ".join(created) or "(none)")
    print("skipped:", ", ".join(skipped) or "(none)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
