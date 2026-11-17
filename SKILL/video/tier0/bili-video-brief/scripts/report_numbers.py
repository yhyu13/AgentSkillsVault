# -*- coding: utf-8 -*-
"""Print the canonical numbers for a delivery, so docs stop drifting.

    python scripts/report_numbers.py <project-dir> [--md]

Reads reel/narration.json, reel/audio/timings.json and reel/timeline.json and
reports the two speech-rate metrics explicitly, because they disagree by design:

  汉字/秒  counts only CJK characters  — the number that predicts reading pace
  字符/秒  counts every character      — the number an editor sees in a word count

Any doc that quotes a rate without naming the metric is wrong at least half the
time.
"""
import argparse
import json
import re
import sys
from pathlib import Path

CJK = re.compile(r"[\u4e00-\u9fff]")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("project")
    ap.add_argument("--md", action="store_true", help="wrap the output in a markdown table")
    a = ap.parse_args()

    root = Path(a.project)
    need = [root / "reel/narration.json", root / "reel/audio/timings.json", root / "reel/timeline.json"]
    for p in need:
        if not p.is_file():
            print("missing %s" % p)
            return 2
    segs = json.loads(need[0].read_text(encoding="utf-8"))["segments"]
    tim = json.loads(need[1].read_text(encoding="utf-8"))
    tl = json.loads(need[2].read_text(encoding="utf-8"))

    cjk = sum(len(CJK.findall(s["text"])) for s in segs)
    chars = sum(len(s["text"]) for s in segs)
    speech = sum(s["seconds"] for s in tim["segments"])
    total = tl["total"]
    fps = tl.get("fps", 30)
    frames = round(total * fps)

    rows = [
        ("口播段数", len(segs)),
        ("汉字数", cjk),
        ("全部字符", chars),
        ("口播实测", "%.2f 秒" % speech),
        ("汉字/秒", "%.2f" % (cjk / speech)),
        ("字符/秒", "%.2f" % (chars / speech)),
        ("成片时长", "%.2f 秒" % total),
        ("帧数", frames),
        ("画幅", "%d×%d @ %d fps" % (tl["width"], tl["height"], fps)),
    ]
    if a.md:
        print("| 项 | 值 |")
        print("|---|---|")
        for k, v in rows:
            print("| %s | %s |" % (k, v))
    else:
        for k, v in rows:
            print("%-8s %s" % (k, v))
    return 0


if __name__ == "__main__":
    sys.exit(main())
