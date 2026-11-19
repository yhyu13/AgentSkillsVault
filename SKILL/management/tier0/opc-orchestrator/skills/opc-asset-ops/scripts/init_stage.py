#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""初始化 08-asset-ops 阶段产出（按日期命名，不覆盖历史）。"""
import sys
from datetime import date
from pathlib import Path

STAGE = "08-asset-ops"
TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates"
FILES = [
    ("asset-inventory-{stamp}.md", "asset-inventory.md"),
    ("action-plan-{stamp}.md", "action-plan.md"),
]


def main() -> int:
    base = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd() / "opc-doc"
    out = base / "outputs" / STAGE
    out.mkdir(parents=True, exist_ok=True)
    today = date.today()
    stamp = today.strftime("%Y%m%d")
    readable = today.isoformat()
    created, skipped = [], []
    for pattern, tpl in FILES:
        target = pattern.format(stamp=stamp)
        dest = out / target
        if dest.exists():
            skipped.append(target)
            continue
        src = TEMPLATE_DIR / tpl
        body = (src.read_text(encoding="utf-8") if src.is_file()
                else f"# {target}\n")
        dest.write_text(body.replace("{{DATE}}", readable), encoding="utf-8")
        created.append(target)
    print(f"stage: {STAGE}\ndir  : {out}\ndate : {readable}")
    print("created:", ", ".join(created) or "(none)")
    print("skipped:", ", ".join(skipped) or "(none)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
