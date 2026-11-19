#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""初始化 06-mvp-design 阶段产出目录与骨架文件。"""
import sys
from datetime import date
from pathlib import Path

STAGE = "06-mvp-design"
TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates"
FILES = [
    ("mvp-spec.md", "mvp-spec.md"),
    ("experiment-plan.md", "experiment-plan.md"),
    ("human-ai-split.md", "human-ai-split.md"),
]
REQUIRED_UPSTREAM = ["04-business-model/risky-assumptions.md"]


def check_upstream(base: Path) -> list:
    missing = []
    for rel in REQUIRED_UPSTREAM:
        if not (base / "outputs" / rel).exists():
            missing.append(rel)
    return missing


def main() -> int:
    base = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd() / "opc-doc"
    missing = check_upstream(base)
    if missing:
        print("[warn] 缺少上游产出，建议先补：", ", ".join(missing))
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
