# -*- coding: utf-8 -*-
"""PPTX layout gate via PowerPoint COM: the real laid-out text bounds.

For every shape with text we ask PowerPoint for TextFrame2.TextRange
.BoundHeight / .BoundWidth (the actual rendered extent of the text) and
compare it with the shape box, then look for text-on-text collisions.

Usage: python check_pptx_layout.py <deck.pptx> [--content content.json]
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# PowerPoint COM returns POINTS (Single) for Left/Top/Width/Height and
# TextRange.BoundWidth/BoundHeight. EMU is the OOXML layer, not this API.


def content_notes(path: str) -> set[str]:
    """Every note string the script knows about, normalised."""
    c = json.loads(Path(path).read_text(encoding="utf-8"))
    out: set[str] = set()

    def add(nd):
        if isinstance(nd, str) and nd.strip():
            out.add(re.sub(r"\s+", "", nd))

    for e in c.get("episodes", []):
        for sl in e.get("slides", []):
            add(sl.get("note"))
    for sec in ("course_cover", "agenda", "summary"):
        add((c.get(sec) or {}).get("note"))
    return out


def main():
    try:
        import win32com.client  # noqa: E402
    except ImportError:
        print("未测量：缺 pywin32（python -m pip install pywin32）")
        return 2
    if len(sys.argv) < 2:
        print("用法: python check_pptx_layout.py <deck.pptx>")
        return 2
    args = [a for a in sys.argv[1:]]
    content_path = ""
    if "--content" in args:
        i = args.index("--content")
        content_path = args[i + 1]
        args = args[:i] + args[i + 2:]
    deck = str(Path(args[0]).resolve())
    if not Path(deck).is_file():
        print(f"未测量：找不到 {deck}")
        return 2
    known = content_notes(content_path) if content_path else None
    try:
        app = win32com.client.Dispatch("PowerPoint.Application")
    except Exception as e:  # noqa: BLE001
        print(f"未测量：无法启动 PowerPoint COM（{e}）")
        return 2
    app.DisplayAlerts = 1
    pres = app.Presentations.Open(deck, ReadOnly=True, WithWindow=False)
    try:
        fails = []
        n_shapes = 0
        for si in range(1, pres.Slides.Count + 1):
            slide = pres.Slides(si)
            boxes = []
            for sh in slide.Shapes:
                n_shapes += 1
                try:
                    if not sh.HasTextFrame:
                        continue
                    tf = sh.TextFrame2
                    if not tf.HasText:
                        continue
                    tr = tf.TextRange
                    text = (tr.Text or "").strip()
                    if not text:
                        continue
                except Exception:
                    continue
                # shape geometry in points
                left, top = float(sh.Left), float(sh.Top)
                width, height = float(sh.Width), float(sh.Height)
                bh, bw = float(tr.BoundHeight), float(tr.BoundWidth)
                fs = tr.Font.Size
                anchor = tf.VerticalAnchor
                # where the text actually sits inside the box
                if anchor == 1:      # msoAnchorTop
                    ty = top
                elif anchor == 3:    # msoAnchorBottom
                    ty = top + height - bh
                else:                # middle
                    ty = top + (height - bh) / 2
                tx = left
                boxes.append({"t": text[:22], "l": tx, "r": tx + bw,
                              "tp": ty, "b": ty + bh, "fs": fs,
                              "box": (top, height), "bh": bh, "bw": bw,
                              "w": width, "h": height})
                if bh > height + 1.5:
                    fails.append(f"slide {si}: 文本超出框高 {bh:.0f}>{height:.0f}pt :: {text[:26]!r}")
                if bw > width + 1.5:
                    fails.append(f"slide {si}: 文本超出框宽 {bw:.0f}>{width:.0f}pt :: {text[:26]!r}")
            try:
                note = slide.NotesPage.Shapes(2).TextFrame.TextRange.Text.strip()
            except Exception:  # noqa: BLE001
                note = ""
            if not note:
                fails.append(f"slide {si}: 没有讲者备注")
            elif known is not None:
                flat = re.sub(r"\s+", "", note)
                # the deck appends 【讲稿】narration to the note; accept any known
                # note that appears inside the slide note
                if not any(k in flat for k in known):
                    fails.append(f"slide {si}: 备注与 content.json 对不上 :: {note[:24]!r}")
            for i in range(len(boxes)):
                for j in range(i + 1, len(boxes)):
                    a, b = boxes[i], boxes[j]
                    ox = min(a["r"], b["r"]) - max(a["l"], b["l"])
                    oy = min(a["b"], b["b"]) - max(a["tp"], b["tp"])
                    if ox > 3 and oy > 3:
                        fails.append(f"slide {si}: 文字重叠 {ox:.0f}x{oy:.0f}pt :: "
                                     f"{a['t']!r} × {b['t']!r}")
        print(f"检查 {pres.Slides.Count} 页 / {n_shapes} 个形状")
    finally:
        pres.Close()
        app.Quit()

    if fails:
        print(f"FAIL {len(fails)}:")
        for f in fails[:60]:
            print("  - " + f)
        return 1
    print("全部通过：无文本超框、无文字重叠。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
