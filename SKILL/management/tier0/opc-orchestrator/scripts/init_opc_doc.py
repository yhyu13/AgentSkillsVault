#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""初始化 opc-doc/ 全量目录骨架与状态文件。

用法::

    python scripts/init_opc_doc.py              # 建到 ./opc-doc
    python scripts/init_opc_doc.py D:/work/opc-doc

只创建不存在的目录与文件，可重复执行。
"""
import sys
from datetime import date
from pathlib import Path

TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates"
STAGES = ["00-orchestrator", "01-resource-audit", "02-niche-positioning",
          "03-value-proposition", "04-business-model", "05-opportunity-score",
          "06-mvp-design", "07-conversion-loop", "08-asset-ops",
          "09-dashboard-review"]
STATE_FILES = [
    ("current-stage.json", "state-current-stage.json"),
    ("decisions.json", "state-decisions.json"),
    ("user-preferences.json", "state-user-preferences.json"),
    # SKILL.md 的「输入」与「回写状态」都把 assumptions.json 列为必读必写，
    # 但旧版脚本/模板都没造它，首次运行必然读一个不存在的文件。
    ("assumptions.json", "state-assumptions.json"),
]


def write_if_absent(dest: Path, tpl: str, today: str) -> bool:
    if dest.exists():
        return False
    src = TEMPLATE_DIR / tpl
    body = src.read_text(encoding="utf-8") if src.is_file() else "{}\n"
    dest.write_text(body.replace("{{DATE}}", today), encoding="utf-8")
    return True


def main() -> int:
    base = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd() / "opc-doc"
    today = date.today().isoformat()
    made_dirs, made_files = [], []
    for sub in ("inputs", "state", "outputs", "reviews"):
        d = base / sub
        if not d.exists():
            d.mkdir(parents=True, exist_ok=True)
            made_dirs.append(sub)
    for stage in STAGES:
        d = base / "outputs" / stage
        if not d.exists():
            d.mkdir(parents=True)
            made_dirs.append(f"outputs/{stage}")
    for name, tpl in STATE_FILES:
        if write_if_absent(base / "state" / name, tpl, today):
            made_files.append(f"state/{name}")
    summary = base / "outputs" / "00-orchestrator" / "session-summary.md"
    if write_if_absent(summary, "session-summary.md", today):
        made_files.append("outputs/00-orchestrator/session-summary.md")
    print(f"base : {base}")
    print("dirs :", ", ".join(made_dirs) or "(already complete)")
    print("files:", ", ".join(made_files) or "(already complete)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
