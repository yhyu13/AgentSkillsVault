#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fit a string to a box using real font metrics, not guesses.

The same measured size must feed BOTH the video renderer and the PPTX builder,
otherwise the deck and the film drift apart at the first long line.

Usage as a library:
    from fit_text import fit_text
    fit_text("从一个人，到全球的学习者社群", w=1318, h=230, base=120, minimum=36)

Usage as a CLI:
    python fit_text.py "some text" --w 1318 --h 230 --base 120 --min 36 --json
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from functools import lru_cache
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

try:
    from PIL import ImageFont
except ImportError:  # explicit, actionable failure instead of a traceback
    ImageFont = None

SAFETY = 1.04  # PowerPoint / PIL metric drift, measured on YaHei at 20-150 px
CJK_RE = re.compile(r"[\u2e80-\u9fff\uff00-\uffef\u3000-\u303f]")

# First existing path wins. Add your own with --cjk-font / --num-font.
FONT_CANDIDATES = {
    "cjk": [
        r"C:\Windows\Fonts\msyh.ttc",
        "/System/Library/Fonts/PingFang.ttc",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
    ],
    "num": [
        r"C:\Windows\Fonts\arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ],
}


def pick_font(face: str, override: str | None = None) -> str:
    if override:
        if not Path(override).is_file():
            raise SystemExit(f"--{face}-font 指向的文件不存在: {override}")
        return override
    for p in FONT_CANDIDATES[face]:
        if Path(p).is_file():
            return p
    raise SystemExit(
        f"找不到 {face} 字体；用 --{face}-font <ttf/ttc 路径> 指定一个。"
    )


@lru_cache(maxsize=512)
def _font(path: str, size: int):
    if ImageFont is None:
        raise SystemExit("缺少 Pillow：python -m pip install pillow")
    return ImageFont.truetype(path, size)


def is_cjk(ch: str) -> bool:
    return bool(CJK_RE.match(ch))


def _char_width(ch: str, face: str, size: int, cjk_path: str, num_path: str) -> float:
    if face == "cjk":
        return _font(cjk_path, size).getlength(ch)
    if face == "num" or not is_cjk(ch):
        return _font(num_path, size).getlength(ch)
    return _font(cjk_path, size).getlength(ch)


def wrap(text: str, face: str, size: int, width: float,
         cjk_path: str, num_path: str) -> list[str]:
    """Greedy wrap by measured advance width. Respects explicit newlines."""
    lines: list[str] = []
    for para in text.split("\n"):
        if not para:
            lines.append("")
            continue
        cur, cur_w = "", 0.0
        for ch in para:
            w = _char_width(ch, face, size, cjk_path, num_path)
            if cur and cur_w + w > width:
                lines.append(cur)
                cur, cur_w = ch, w
            else:
                cur += ch
                cur_w += w
        if cur:
            lines.append(cur)
    return lines or [""]


def fit_text(text: str, w: float, h: float, base: int, minimum: int = 36,
             lh: float = 1.14, face: str = "cjk",
             cjk_font: str | None = None, num_font: str | None = None) -> dict:
    """Largest size in [minimum, base] whose wrapped block fits w x h at line height lh."""
    cjk_path = pick_font("cjk", cjk_font)
    num_path = pick_font("num", num_font)
    best = None
    lo, hi = minimum, max(minimum, base)
    while lo <= hi:
        mid = (lo + hi) // 2
        lines = wrap(text, face, mid, w / SAFETY, cjk_path, num_path)
        longest = max((_font(cjk_path, mid).getlength(x) if face == "cjk"
                       else sum(_char_width(c, face, mid, cjk_path, num_path) for c in x))
                      for x in lines)
        block_h = len(lines) * mid * lh / SAFETY
        if longest <= w and block_h <= h:
            best = {"size": mid, "lines": lines, "line_count": len(lines),
                    "width": round(longest, 1), "height": round(block_h, 1),
                    "overflow": False}
            lo = mid + 1
        else:
            hi = mid - 1
    if best is None:
        lines = wrap(text, face, minimum, w / SAFETY, cjk_path, num_path)
        best = {"size": minimum, "lines": lines, "line_count": len(lines),
                "width": None, "height": None, "overflow": True}
    return best


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("text")
    ap.add_argument("--w", type=float, required=True, help="box width in design px")
    ap.add_argument("--h", type=float, required=True, help="box height in design px")
    ap.add_argument("--base", type=int, default=120)
    ap.add_argument("--min", type=int, default=36)
    ap.add_argument("--lh", type=float, default=1.14)
    ap.add_argument("--face", choices=["cjk", "num", "mixed"], default="cjk")
    ap.add_argument("--cjk-font", default=None)
    ap.add_argument("--num-font", default=None)
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    # "mixed" is the num face with per-character script switching inside wrap()
    face = "mixed" if a.face == "mixed" else a.face
    r = fit_text(a.text, a.w, a.h, a.base, a.min, a.lh, face, a.cjk_font, a.num_font)
    if a.json:
        print(json.dumps(r, ensure_ascii=False))
    else:
        print(f"size={r['size']}px lines={r['line_count']} overflow={r['overflow']}")
        for ln in r["lines"]:
            print("  " + ln)
    return 1 if r["overflow"] else 0


if __name__ == "__main__":
    sys.exit(main())
