# -*- coding: utf-8 -*-
"""content.json -> narration lines (one SENTENCE per line) + map(line -> slide index).

Usage: python make_narration.py content/content.json --out work/narration

One slide may carry several sentences; each sentence becomes its own subtitle cue
(<=18 chars per line after wrapping) while still belonging to the same slide.
"""
from __future__ import annotations

import argparse
import json
import pathlib
import re
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from sentences import cjk_len, split_sentences  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("content")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    content = json.loads(pathlib.Path(a.content).read_text(encoding="utf-8"))
    outdir = pathlib.Path(a.out)
    outdir.mkdir(parents=True, exist_ok=True)

    for ep in content["episodes"]:
        lines: list[str] = []
        slide_of: list[int] = []
        for si, sl in enumerate(ep["slides"]):
            narr = (sl.get("narration") or "").strip()
            if not narr:
                raise SystemExit(f"ep{ep['id']} slide {si + 1} ({sl.get('type')}) 缺 narration")
            sents = split_sentences(narr)
            for s in sents:
                lines.append(s)
                slide_of.append(si)
        (outdir / f"ep{ep['id']}.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
        (outdir / f"ep{ep['id']}.map.json").write_text(
            json.dumps({"slide_of": slide_of}, ensure_ascii=False), encoding="utf-8")
        chars = sum(cjk_len(x) for x in lines)
        print(f"ep{ep['id']}: {len(ep['slides'])} 页 -> {len(lines)} 条字幕 / {chars} 字"
              f" / 均 {chars // max(len(lines), 1)} 字")


if __name__ == "__main__":
    sys.exit(main())
