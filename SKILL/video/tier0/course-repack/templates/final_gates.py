#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Final acceptance for one course pack: five gate families, exit code is the verdict.

Copy this into <slug>/tools/ and edit GATES to the scripts you actually have.
A gate that cannot measure (e.g. PowerPoint COM missing) must return non-zero --
"not measured" is never a pass.
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PY = sys.executable

GATES = [
    ("内容", [PY, str(ROOT / "scripts" / "check_content.py"), str(ROOT / "content" / "content.json")]),
    ("字幕", [PY, str(ROOT / "scripts" / "check_subtitles.py"), str(ROOT / "out")]),
    ("可见性", [PY, str(ROOT / "scripts" / "check_visibility.py"), str(ROOT / "content" / "content.json")]),
    ("PPTX 版面", [PY, str(ROOT / "scripts" / "check_pptx_layout.py"), str(ROOT / "out" / "deck.pptx"),
                   "--content", str(ROOT / "content" / "content.json")]),
    ("成片", [PY, str(ROOT / "scripts" / "check_videos.py"), str(ROOT / "out")]),
]


def main() -> int:
    failed: list[str] = []
    for name, cmd in GATES:
        print(f"\n{'=' * 70}\n== {name}\n{'=' * 70}", flush=True)
        if not Path(cmd[1]).exists():
            print(f"!!! {name} 脚本不存在: {cmd[1]}")
            failed.append(f"{name}(missing)")
            continue
        r = subprocess.run(cmd, capture_output=True, text=True, errors="replace")
        tail = (r.stdout or "").strip().splitlines()[-14:]
        print("\n".join(tail), flush=True)
        if r.stderr.strip():
            print(r.stderr.strip()[-800:], flush=True)
        if r.returncode:
            failed.append(name)
            print(f"!!! {name} 退出码 {r.returncode}", flush=True)
    print(f"\n{'=' * 70}")
    if failed:
        print("未通过: " + ", ".join(failed))
        return 1
    print(f"全部 {len(GATES)} 道闸通过")
    return 0


if __name__ == "__main__":
    sys.exit(main())
