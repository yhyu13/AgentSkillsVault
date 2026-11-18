# -*- coding: utf-8 -*-
"""Check an agent-loop case folder. Exit 0 only when the ledger is complete.

Usage: python check_case.py <case-dir>
"""
import sys
from pathlib import Path

REQUIRED = ("CASE.md", "SOURCES.md", "TRACE.md", "CHECK.md")
SOURCE_COLS = ("权重", "请求", "历史")


def fail(msg):
    print("FAIL", msg)
    return 1


def table_rows(text):
    rows = []
    for line in text.splitlines():
        if not line.startswith("|"):
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if not cells or set(cells[0]) <= {"-", ":"}:
            continue
        rows.append(cells)
    return rows


def main():
    if len(sys.argv) != 2:
        return fail("usage: python check_case.py <case-dir>")
    root = Path(sys.argv[1])
    if not root.is_dir():
        return fail("not a directory: %s" % root)
    missing = [name for name in REQUIRED if not (root / name).is_file()]
    if missing:
        return fail("missing " + ", ".join(missing))
    case = (root / "CASE.md").read_text(encoding="utf-8")
    sources = (root / "SOURCES.md").read_text(encoding="utf-8")
    trace = (root / "TRACE.md").read_text(encoding="utf-8")
    if "步数上限：" not in case or "步数上限：" not in trace:
        return fail("step limit missing")
    limit = ""
    for line in case.splitlines():
        if line.startswith("- 步数上限："):
            limit = line.split("：", 1)[1].strip()
    if not limit.isdigit() or int(limit) < 1:
        return fail("step limit is not a positive integer")
    rows = table_rows(sources)
    if len(rows) < 2:
        return fail("SOURCES.md has no fact rows")
    header = rows[0]
    if any(col not in header for col in SOURCE_COLS):
        return fail("SOURCES.md is missing a source column")
    idx = [header.index(col) for col in SOURCE_COLS]
    facts = 0
    for row in rows[1:]:
        if len(row) <= max(idx) or not row[0] or row[0] == "事实":
            continue
        facts += 1
        if any(not row[i] for i in idx):
            return fail("fact has an empty source cell: %s" % row[0])
        if all(row[i] == "没有" for i in idx):
            return fail("fact is missing from weights, request, and history: %s" % row[0])
        if not any(len(row[i]) >= 8 for i in idx):
            return fail("fact has no source quote: %s" % row[0])
    if facts < 1:
        return fail("no facts")
    gap = "没有。系统消息" in sources or "没有工具语法" in sources
    if gap and "没有工具语法" not in case and "请求里没有工具" not in case:
        return fail("the request gap is not named in CASE.md")
    if "invalid input" in trace.lower() or "超时" in trace or "权限" in trace:
        if "错误" not in trace:
            return fail("tool failure has no error text")
    if "返回" not in trace and "到顶" not in trace:
        return fail("TRACE.md has neither 返回 nor 到顶")
    if "未写" in trace.split("停止：", 1)[-1].splitlines()[0]:
        return fail("stop state is still 未写")
    print("PASS facts=%d limit=%s" % (facts, limit))
    return 0


if __name__ == "__main__":
    sys.exit(main())
