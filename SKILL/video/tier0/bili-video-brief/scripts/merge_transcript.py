# -*- coding: utf-8 -*-
"""Merge chunk_XX.txt into one transcript, shifting each chunk onto the real clock.

    python merge_transcript.py source/transcript --chunk-seconds 115 -o source/transcript/asr_raw.txt

Each chunk is transcribed independently (memory + resume), so its timestamps
start at 0. The chunk NUMBER therefore comes from the file name, not from the
position in the sorted list: a missing or renamed chunk must be an error, not a
silent 115-second slip for everything after it.
"""
import argparse
import re
import sys
from pathlib import Path

LINE = re.compile(r"^\[(\d+\.\d+)-(\d+\.\d+)\]\s*(.+)$")
NAME = re.compile(r"chunk_(\d+)\.txt$")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("dir")
    ap.add_argument("-o", "--out", required=True)
    ap.add_argument("--chunk-seconds", type=float, default=115.0)
    ap.add_argument("--tolerance", type=float, default=1.0)
    a = ap.parse_args()

    root = Path(a.dir)
    numbered = []
    for path in root.glob("chunk_[0-9][0-9].txt"):
        m = NAME.search(path.name)
        if not m:
            raise SystemExit("unexpected chunk name: %s" % path.name)
        numbered.append((int(m.group(1)), path))
    if not numbered:
        raise SystemExit("no chunk_NN.txt under %s" % root)
    numbered.sort()

    numbers = [n for n, _ in numbered]
    if numbers != list(range(len(numbers))):
        raise SystemExit("chunks are not contiguous from 00: %s — a missing chunk "
                         "would shift every later timestamp" % numbers)

    lines, prev_end = [], 0.0
    for index, path in numbered:
        offset = index * a.chunk_seconds
        rows = []
        for raw in path.read_text(encoding="utf-8").splitlines():
            m = LINE.match(raw.strip())
            if m:
                rows.append((float(m.group(1)), float(m.group(2)), m.group(3).strip()))
        if not rows:
            raise SystemExit("%s has no timed lines" % path.name)
        last = rows[-1][1]
        if last > a.chunk_seconds + a.tolerance:
            raise SystemExit("%s ends at %.1fs, longer than the %.0fs window"
                             % (path.name, last, a.chunk_seconds))
        if path != numbered[-1][1] and last < a.chunk_seconds - a.tolerance:
            raise SystemExit("%s ends at %.1fs but chunk %02d follows: audio was not "
                             "cut on a %.0fs grid" % (path.name, last, index + 1, a.chunk_seconds))
        for start, end, text in rows:
            s, e = start + offset, end + offset
            if s < prev_end - 0.05:
                raise SystemExit("overlap at %.2fs in %s" % (s, path.name))
            prev_end = e
            lines.append("[%.1f-%.1f] %s" % (s, e, text))

    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("OK chunks=%s lines=%d end=%.1fs -> %s"
          % (",".join("%02d" % n for n in numbers), len(lines), prev_end, a.out))


if __name__ == "__main__":
    sys.exit(main())
