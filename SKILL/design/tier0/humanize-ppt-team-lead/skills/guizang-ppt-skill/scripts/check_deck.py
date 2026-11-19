#!/usr/bin/env python3
"""Sanity-check a generated magazine-style deck before handing it to the user.

Checks the failure modes that actually happen with a single-file HTML deck:
unfilled 必填 markers, absolute/local paths, missing image files, a missing
motion library, and slide count drift.

Usage:
    python scripts/check_deck.py path/to/index.html
    python scripts/check_deck.py path/to/index.html --expect-slides 12
"""
import argparse
import re
import sys
from pathlib import Path

MARKER_RE = re.compile(r"\[必填\]")
ABS_PATH_RE = re.compile(r"""(?:src|href)\s*=\s*["'](?:[A-Za-z]:[\\/]|file:///|/)""")
SLIDE_RE = re.compile(r"""class\s*=\s*["'][^"']*\bslide\b""")
# 模板自带一条说明注释：`<section class="slide ...">` 插入位说明。不去掉注释
# 就会把它数成第 4 页——每一支从模板起步的 deck 都会被误判（2026-11-20 实测）。
HTML_COMMENT_RE = re.compile(r"<!--.*?-->", re.S)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("html")
    ap.add_argument("--expect-slides", type=int, default=0)
    args = ap.parse_args()

    p = Path(args.html)
    if not p.is_file():
        print(f"error: {p} not found", file=sys.stderr)
        return 2

    text = p.read_text(encoding="utf-8", errors="replace")
    # 标记与资产检查看原文；页数统计要看去掉注释后的内容。
    code = HTML_COMMENT_RE.sub("", text)
    problems = []

    if MARKER_RE.search(text):
        problems.append("unfilled [必填] marker still in the deck")

    if ABS_PATH_RE.search(text):
        problems.append("absolute or drive-letter asset path — will break when copied")

    for ref in re.findall(r"""(?:src|href)\s*=\s*["']([^"'#?]+)["']""", text):
        if ref.startswith(("http://", "https://", "data:", "#")):
            continue
        if not (p.parent / ref).exists():
            problems.append(f"missing local asset: {ref}")

    if "motion" not in text.lower():
        problems.append("no motion library reference — animations will not run")

    slides = len(SLIDE_RE.findall(code))
    if args.expect_slides and slides != args.expect_slides:
        problems.append(f"slide count {slides} != expected {args.expect_slides}")

    print(f"deck  : {p.resolve()}")
    print(f"slides: {slides}")
    if problems:
        for msg in problems:
            print(f"  FAIL  {msg}")
        print(f"\n{len(problems)} problem(s)")
        return 1
    print("  ok    no marker, no absolute path, all assets present")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
