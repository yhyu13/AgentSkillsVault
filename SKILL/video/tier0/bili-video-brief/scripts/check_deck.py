# -*- coding: utf-8 -*-
"""Structural check for a generated .pptx before it is shown to anyone.

    python check_deck.py decks/x.pptx [--max-pages 16] [--min-notes 0.8]

Catches what a text dump cannot: shapes that leave the slide, text boxes too
small for their font, unreadably small type, missing speaker notes and pages
that carry no text at all. It does not judge design; it refuses to hand over a
deck with mechanical defects.

Exit 0 = pass, 1 = defects found, 2 = cannot read the file.
"""
import argparse
import sys
from pathlib import Path

from pptx import Presentation
from pptx.util import Emu

EMU = 914400.0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("path")
    ap.add_argument("--max-pages", type=int, default=16)
    ap.add_argument("--min-notes", type=float, default=0.8,
                    help="share of slides that must carry speaker notes")
    ap.add_argument("--min-body-pt", type=float, default=9.0)
    a = ap.parse_args()

    p = Path(a.path)
    if not p.is_file():
        print("missing deck: %s" % p)
        return 2
    prs = Presentation(str(p))
    W, H = prs.slide_width / EMU, prs.slide_height / EMU
    errors, notes, empty = [], 0, []

    for i, slide in enumerate(prs.slides, 1):
        texts = []
        if slide.has_notes_slide and slide.notes_slide.notes_text_frame is not None:
            if slide.notes_slide.notes_text_frame.text.strip():
                notes += 1
        for sh in slide.shapes:
            left, top = sh.left / EMU, sh.top / EMU
            w, h = sh.width / EMU, sh.height / EMU
            if left < -0.05 or top < -0.05 or left + w > W + 0.05 or top + h > H + 0.05:
                errors.append("p%d: %s leaves the slide (%.2f,%.2f %.2fx%.2f)"
                              % (i, sh.shape_type, left, top, w, h))
            if not sh.has_text_frame:
                continue
            runs = [r for para in sh.text_frame.paragraphs for r in para.runs if r.text.strip()]
            if not runs:
                continue
            texts.append(sh.text_frame.text)
            size = max((r.font.size.pt for r in runs if r.font.size), default=18.0)
            if size < a.min_body_pt:
                errors.append("p%d: %.1fpt text is below %.0fpt" % (i, size, a.min_body_pt))
            # crude fit check: CJK glyph ~1 em wide, latin ~0.55 em
            cjk = sum(1 for c in sh.text_frame.text if '\u4e00' <= c <= '\u9fff')
            latin = len(sh.text_frame.text) - cjk
            need = (cjk * 1.0 + latin * 0.55) * size / 72.0
            lines = max(1, int(need / max(w, 0.5) + 0.999))
            need_h = lines * size * 1.35 / 72.0
            if need_h > h + 0.12 and not sh.text_frame.word_wrap is False:
                errors.append("p%d: text needs ~%.2fin but the box is %.2fin tall"
                              % (i, need_h, h))
        if not texts:
            empty.append(i)

    if len(prs.slides) > a.max_pages:
        errors.append("%d pages > %d" % (len(prs.slides), a.max_pages))
    if empty:
        errors.append("pages with no text: %s" % empty)
    if notes < a.min_notes * len(prs.slides):
        errors.append("only %d/%d pages have speaker notes" % (notes, len(prs.slides)))

    if errors:
        print("\n".join(errors[:25]))
        return 1
    print("OK pages=%d notes=%d size=%.2fx%.2fin" % (len(prs.slides), notes, W, H))
    return 0


if __name__ == "__main__":
    sys.exit(main())
