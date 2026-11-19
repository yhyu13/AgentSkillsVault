#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""初始化 09-dashboard-review 阶段产出（按日期命名，并确保 reviews/ 存在）。"""
import sys
from datetime import date
from pathlib import Path

STAGE = "09-dashboard-review"
TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates"


def main() -> int:
    base = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd() / "opc-doc"
    out = base / "outputs" / STAGE
    reviews = base / "reviews"
    out.mkdir(parents=True, exist_ok=True)
    reviews.mkdir(parents=True, exist_ok=True)
    today = date.today()
    stamp = today.strftime("%Y%m%d")
    readable = today.isoformat()

    created = []
    dest = out / f"review-{stamp}.md"
    if dest.exists():
        print("skipped:", dest.name)
    else:
        src = TEMPLATE_DIR / "review.md"
        body = src.read_text(encoding="utf-8") if src.is_file() else "# 复盘\n"
        dest.write_text(body.replace("{{DATE}}", readable), encoding="utf-8")
        created.append(dest.name)

    dpath = reviews / "dashboard.json"
    if dpath.exists():
        print("skipped: reviews/dashboard.json（追加写入，不覆盖）")
    else:
        src = TEMPLATE_DIR / "dashboard.json"
        body = src.read_text(encoding="utf-8") if src.is_file() else '{"reviews": []}\n'
        dpath.write_text(body, encoding="utf-8")
        created.append("reviews/dashboard.json")

    upstream = base / "outputs"
    have = sorted(p.name for p in upstream.iterdir() if p.is_dir()) if upstream.exists() else []
    print(f"stage: {STAGE}\ndir  : {out}\ndate : {readable}")
    print("created:", ", ".join(created) or "(none)")
    print("available upstream stages:", ", ".join(have) or "(none)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
