# -*- coding: utf-8 -*-
"""Apply a reviewed correction table to a raw ASR transcript.

    python apply_corrections.py in.txt corrections.json -o out.txt

The table is the 口径 ledger: every row says what the recogniser wrote, what it
should be, and why. A rule that matches nothing is an error — a rule that no
longer applies means the transcript changed and the ledger must be re-read.

Row shape: {"from": "<regex>", "to": "<replacement>", "why": "<reason>"}
`from` is a Python regex; use (?<![A-Za-z]) guards for Latin words.
"""
import argparse
import json
import re
import sys
from pathlib import Path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("table")
    ap.add_argument("-o", "--out", required=True)
    a = ap.parse_args()

    text = Path(a.src).read_text(encoding="utf-8")
    rules = json.loads(Path(a.table).read_text(encoding="utf-8"))
    total, dead = 0, []
    for row in rules:
        rx = re.compile(row["from"])
        text, n = rx.subn(row["to"], text)
        total += n
        if n == 0:
            dead.append(row["from"])
    if dead:
        print("rules that never matched:\n  " + "\n  ".join(dead))
        return 1
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    Path(a.out).write_text(text, encoding="utf-8")
    print("OK rules=%d replacements=%d -> %s" % (len(rules), total, a.out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
