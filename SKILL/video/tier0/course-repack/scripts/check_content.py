#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Validate a multi-episode course script before anything expensive runs.

Catches, with file/line precision:
  - broken JSON
  - missing meta / episodes / slides
  - unknown slide type
  - a slide without narration, or without a speaker note
  - a narration sentence longer than 2 subtitle lines (2 x 18 CJK chars)
  - episode ids that are not 1..N

Usage:
  python check_content.py content/content.json
  python check_content.py content/content.json --max-sentence 36
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SLIDE_TYPES = {"cover", "chapter", "hero", "steps", "conclusion",
               "try", "review", "takeaway"}
sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent))
from sentences import cjk_len as _cjk_len  # noqa: E402
from sentences import split_sentences as sentences  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("content")
    ap.add_argument("--max-sentence", type=int, default=36,
                    help="CJK chars per sentence; 36 = two 18-char subtitle lines")
    a = ap.parse_args()
    p = Path(a.content)
    if not p.is_file():
        print(f"找不到 {p}")
        return 2
    raw = p.read_text(encoding="utf-8")
    try:
        c = json.loads(raw)
    except json.JSONDecodeError as e:
        lines = raw.splitlines()
        i = e.lineno - 1
        print(f"FAIL {p.name}: JSON 第 {e.lineno} 行第 {e.colno} 列: {e.msg}")
        for k in range(max(0, i - 1), min(len(lines), i + 2)):
            print(("  >> " if k == i else "     ") + f"{k + 1:>4}: {lines[k]}")
        return 1

    bad: list[str] = []
    meta = c.get("meta")
    if not isinstance(meta, dict):
        bad.append("缺 meta 对象")
    else:
        for k in ("title", "subtitle", "source"):
            if not (meta.get(k) or "").strip():
                bad.append(f"meta.{k} 为空")
    eps = c.get("episodes")
    if not isinstance(eps, list) or not eps:
        bad.append("episodes 必须是非空数组")
        eps = []
    if [e.get("id") for e in eps] != list(range(1, len(eps) + 1)):
        bad.append(f"episode id 必须是 1..{len(eps)} 连续，实际 {[e.get('id') for e in eps]}")

    sm = c.get("summary")
    if isinstance(sm, dict) and len(sm.get("bullets") or []) > 6:
        bad.append(f"summary: bullets {len(sm['bullets'])} 条，上限 6")

    for sec in ("course_cover", "agenda", "summary"):
        obj = c.get(sec)
        if isinstance(obj, dict) and not (obj.get("note") or "").strip():
            bad.append(f"{sec}: 缺讲者备注 note（PPTX 每页都要有备注）")

    total_slides = total_chars = 0
    for ep in eps:
        tag = f"ep{ep.get('id')}"
        if not ep.get("title"):
            bad.append(f"{tag}: 缺 title")
        slides = ep.get("slides") or []
        if not slides:
            bad.append(f"{tag}: 没有 slides")
        elif len(slides) < 3:
            bad.append(f"{tag}: 只有 {len(slides)} 页，一集至少 cover + 内容 + takeaway 三页")
        for i, sl in enumerate(slides, 1):
            where = f"{tag} slide {i}"
            if sl.get("type") not in SLIDE_TYPES:
                bad.append(f"{where}: type={sl.get('type')!r} 不在 {sorted(SLIDE_TYPES)}")
            if not (sl.get("head") or sl.get("hero")):
                bad.append(f"{where}: head 和 hero 都为空")
            if not (sl.get("note") or "").strip():
                bad.append(f"{where}: 缺讲者备注 note")
            h = sl.get("hero")
            if h is not None and not h.get("value"):
                bad.append(f"{where}: hero 对象缺 value")
            if sl.get("type") == "hero" and not ((h or {}).get("value") and (h or {}).get("label")):
                bad.append(f"{where}: hero 页必须同时有 hero.value 和 hero.label")
            if sl.get("type") == "steps":
                st = sl.get("steps") or []
                if not 2 <= len(st) <= 6:
                    bad.append(f"{where}: steps 需要 2-6 步（两行是上限），实际 {len(st)}")
                for j, x in enumerate(st, 1):
                    if not (x.get("t") or x.get("title") or "").strip():
                        bad.append(f"{where}: 第 {j} 步缺标题（t 或 title）")
            if len(sl.get("bullets") or []) > 4:
                bad.append(f"{where}: bullets 最多 4 条（多了拆页，不要缩字号）")
            narr = (sl.get("narration") or "").strip()
            if not narr:
                bad.append(f"{where}: 缺 narration")
                continue
            total_slides += 1
            total_chars += _cjk_len(narr)
            for s in sentences(narr):
                n = _cjk_len(s)
                if n > a.max_sentence:
                    bad.append(f"{where}: 单句 {n} 汉字 (>{a.max_sentence}) :: {s[:30]}")
    print(f"{p.name}: {len(eps)} 集 / {total_slides} 页 / {total_chars} 汉字口播")
    for m in bad[:30]:
        print("  - " + m)
    if len(bad) > 30:
        print(f"  ... 另有 {len(bad) - 30} 条")
    print("内容契约通过。" if not bad else f"FAIL: {len(bad)} 条问题")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
