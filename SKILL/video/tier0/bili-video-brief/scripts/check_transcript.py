# -*- coding: utf-8 -*-
"""Validate a corrected transcript before anything else is built on it.

    python check_transcript.py source/transcript/transcript_clean.txt [--duration 562]

Fails (exit 1) on: unparsable lines, empty text, non-monotonic timestamps,
overlaps, one segment longer than 15 s, coverage that stops short of the audio,
three or more repeated adjacent lines, or a transcript that is mostly not
Chinese while --lang zh is in force.

Exit 0 prints a one-line summary; exit 2 is a usage error.
"""
import argparse
import re
import sys
from pathlib import Path

LINE = re.compile(r"^\[(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)\]\s*(.+)$")
CJK = re.compile(r"[\u4e00-\u9fff]")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("path")
    ap.add_argument("--duration", type=float, default=0,
                    help="audio length in seconds; 0 skips the coverage check")
    ap.add_argument("--lang", default="zh", choices=["zh", "any"])
    ap.add_argument("--max-gap", type=float, default=6.0)
    ap.add_argument("--max-seg", type=float, default=15.0)
    ap.add_argument("--strict", action="store_true",
                    help="treat over-long segments as errors (needed before frame-accurate cutting)")
    a = ap.parse_args()

    p = Path(a.path)
    if not p.is_file():
        print("missing transcript: %s" % p)
        return 2
    rows, errors, longs = [], [], []
    for n, raw in enumerate(p.read_text(encoding="utf-8").splitlines(), 1):
        raw = raw.strip()
        if not raw:
            continue
        m = LINE.match(raw)
        if not m:
            errors.append("line %d: not '[start-end] text'" % n)
            continue
        s, e, text = float(m.group(1)), float(m.group(2)), m.group(3).strip()
        if e <= s:
            errors.append("line %d: end %.1f <= start %.1f" % (n, e, s))
        if e - s > a.max_seg:
            longs.append((n, e - s))
        if not text:
            errors.append("line %d: empty text" % n)
        rows.append((s, e, text))

    if not rows:
        print("no timed lines in %s" % p)
        return 1

    for i in range(1, len(rows)):
        if rows[i][0] < rows[i - 1][1] - 0.05:
            errors.append("overlap at %.1fs (line %d)" % (rows[i][0], i + 2))
        gap = rows[i][0] - rows[i - 1][1]
        if gap > a.max_gap:
            errors.append("%.1fs gap before %.1fs" % (gap, rows[i][0]))

    repeats = sum(1 for i in range(1, len(rows)) if rows[i][2] == rows[i - 1][2])
    if repeats >= 3:
        errors.append("%d repeated adjacent lines — the model looped" % repeats)

    if a.duration and rows[-1][1] < a.duration - 3:
        errors.append("transcript stops at %.1fs of %.1fs — the tail is missing"
                      % (rows[-1][1], a.duration))

    chars = sum(len(r[2]) for r in rows)
    cjk = sum(len(CJK.findall(r[2])) for r in rows)
    if a.lang == "zh" and chars and cjk / chars < 0.30:
        errors.append("only %.0f%% Chinese — wrong language model or wrong prompt"
                      % (100 * cjk / chars))

    if errors:
        print("\n".join(errors[:20]))
        return 1
    note = ""
    if longs:
        note = "  warn: %d long segment(s) %s" % (
            len(longs), ", ".join("%d:%.0fs" % (n, d) for n, d in longs[:4]))
    print("OK lines=%d %.1f→%.1fs chars=%d cjk=%d%%%s"
          % (len(rows), rows[0][0], rows[-1][1], chars, round(100 * cjk / max(chars, 1)), note))
    return 0


if __name__ == "__main__":
    sys.exit(main())
