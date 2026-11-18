#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Enforce the subtitle spec on every .srt in a directory.

Spec (the one this pipeline ships with):
  - at most 18 CJK characters per line
  - at most 2 lines per cue
  - at least 1.2 s per cue
  - cues never overlap and start is monotonic

Usage:
  python check_subtitles.py out --glob "*.srt"
  python check_subtitles.py work/ep1 --max-cjk 20 --min-dur 1.0
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

CJK = re.compile(r"[\u4e00-\u9fff]")
TS = re.compile(r"(\d+):(\d+):(\d+)[,.](\d+)\s*-->\s*(\d+):(\d+):(\d+)[,.](\d+)")


def secs(h, m, s, ms) -> float:
    return int(h) * 3600 + int(m) * 60 + int(s) + int(ms.ljust(3, "0")) / 1000


def check_file(p: Path, max_cjk: int, max_lines: int, min_dur: float,
               allow_overlap: bool) -> tuple[list[str], str]:
    bad: list[str] = []
    blocks = [b for b in p.read_text(encoding="utf-8", errors="replace").split("\n\n") if b.strip()]
    prev_end = -1.0
    worst_len = worst_dur = 0
    for n, b in enumerate(blocks, 1):
        m = TS.search(b)
        if not m:
            bad.append(f"cue {n}: 时间戳格式异常")
            continue
        t0, t1 = secs(*m.group(1, 2, 3, 4)), secs(*m.group(5, 6, 7, 8))
        if t1 <= t0:
            bad.append(f"cue {n}: 结束不晚于开始")
        if not allow_overlap and t0 < prev_end - 0.001:
            bad.append(f"cue {n}: 与上一条重叠 {prev_end - t0:.2f}s")
        prev_end = max(prev_end, t1)
        txt = [ln for ln in b.strip().splitlines() if "-->" not in ln]
        if txt and txt[0].strip().isdigit():   # cue index line, not content
            txt = txt[1:]
        if len(txt) > max_lines:
            bad.append(f"cue {n}: {len(txt)} 行 (>{max_lines})")
        for ln in txt:
            n_cjk = len(CJK.findall(ln))
            worst_len = max(worst_len, n_cjk)
            if n_cjk > max_cjk:
                bad.append(f"cue {n}: 一行 {n_cjk} 汉字 (>{max_cjk}) :: {ln!r}")
        dur = t1 - t0
        if worst_dur == 0:
            worst_dur = dur
        worst_dur = min(worst_dur, dur)
        if dur < min_dur:
            bad.append(f"cue {n}: 时长 {dur:.2f}s (<{min_dur}s)")
    summary = (f"{len(blocks)} 条 / 最长行 {worst_len} 汉字 / 最短 {worst_dur:.2f}s")
    return bad, summary


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("dir")
    ap.add_argument("--glob", default="*.srt")
    ap.add_argument("--max-cjk", type=int, default=18)
    ap.add_argument("--max-lines", type=int, default=2)
    ap.add_argument("--min-dur", type=float, default=1.2)
    ap.add_argument("--allow-overlap", action="store_true")
    a = ap.parse_args()
    files = sorted(Path(a.dir).glob(a.glob))
    if not files:
        print(f"FAIL: {a.dir} 下没有匹配 {a.glob} 的字幕文件")
        return 1
    failed = 0
    for p in files:
        bad, summary = check_file(p, a.max_cjk, a.max_lines, a.min_dur, a.allow_overlap)
        print(f"{p.name}: {summary}")
        for msg in bad[:12]:
            print("   - " + msg)
        if len(bad) > 12:
            print(f"   ... 另有 {len(bad) - 12} 条")
        failed += 1 if bad else 0
    print("\n字幕规范全部通过。" if not failed else f"\nFAIL: {failed}/{len(files)} 个文件不合格")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
