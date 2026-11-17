# -*- coding: utf-8 -*-
"""Attach the slide index to an existing timing.json (tts episode -> timing.json).

An external TTS tool emits one segment per narration line, in order. We map each line
back to the slide it belongs to so the scene can hold one slide across several cues.
"""
from __future__ import annotations

import argparse
import json
import pathlib
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("work")      # work/epN
    ap.add_argument("mapfile")   # work/narration/epN.map.json
    a = ap.parse_args()
    work = pathlib.Path(a.work)
    timing_p = work / "timing.json"
    timing = json.loads(timing_p.read_text(encoding="utf-8"))
    slide_of = json.loads(pathlib.Path(a.mapfile).read_text(encoding="utf-8"))["slide_of"]
    segs = timing["segments"]
    if len(segs) != len(slide_of):
        raise SystemExit(f"segment/line 数不一致: {len(segs)} vs {len(slide_of)}")
    for s, si in zip(segs, slide_of):
        s["slide"] = si
    timing_p.write_text(json.dumps(timing, ensure_ascii=False, indent=2), encoding="utf-8")
    (work / "timing.js").write_text("window.TIMING = " + json.dumps(timing, ensure_ascii=False) + ";",
                                    encoding="utf-8")
    print(f"attached slide index to {len(segs)} segments -> {timing_p}")


if __name__ == "__main__":
    sys.exit(main())
