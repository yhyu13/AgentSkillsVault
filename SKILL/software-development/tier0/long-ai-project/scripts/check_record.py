#!/usr/bin/env python3
"""Check one long-ai-project stage record for the required evidence fields."""

import argparse
import re
import sys
from pathlib import Path


REQUIRED = {
    "阶段": re.compile(r"^阶段:\s*\S+", re.M),
    "产物": re.compile(r"^产物:\s*\S+", re.M),
    "证据": re.compile(r"^证据:\s*\S+", re.M),
    "通过条件": re.compile(r"^通过条件:\s*\S+", re.M),
    "缺口": re.compile(r"^缺口:\s*\S+", re.M),
    "下一步": re.compile(r"^下一步:\s*\S+", re.M),
}
SIGNOFF = ("验收人", "时间", "关键路径", "结果")


def missing_fields(text: str) -> list[str]:
    missing = [name for name, pattern in REQUIRED.items() if not pattern.search(text)]
    if "验证" in text and any(label not in text for label in SIGNOFF):
        missing.append("人工签收")
    return missing


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("record")
    args = parser.parse_args()
    text = Path(args.record).read_text(encoding="utf-8")
    missing = missing_fields(text)
    if missing:
        print("MISSING " + ", ".join(missing))
        return 1
    print("OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
