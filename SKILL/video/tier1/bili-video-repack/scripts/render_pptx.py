#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Approximate PPTX renderer for visual QA on machines without LibreOffice.

Reads a .pptx with python-pptx and re-draws every slide with PIL:
solid fills, images, and text runs (size / weight / colour / alignment).
It is a rough approximation, not a PowerPoint renderer: it is meant to catch
overflow, overlap, misalignment, stretched images and low-contrast text.

Usage:
    python render_pptx.py deck.pptx --out qa --width 1920 [--sheet sheet.png]
"""
from __future__ import annotations

import argparse
import io
import os
import sys

from PIL import Image, ImageDraw, ImageFont
from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE_TYPE
from pptx.enum.text import MSO_ANCHOR
from pptx.util import Emu

FONT_CANDIDATES = [
    r"C:\Windows\Fonts\msyh.ttc",
    r"C:\Windows\Fonts\NotoSansSC-VF.ttf",
    r"C:\Windows\Fonts\simhei.ttf",
    r"C:\Windows\Fonts\simsun.ttc",
]
BOLD_CANDIDATES = [
    r"C:\Windows\Fonts\msyhbd.ttc",
    r"C:\Windows\Fonts\msyh.ttc",
    r"C:\Windows\Fonts\simhei.ttf",
]
EMU_PER_IN = 914400.0
_cache: dict = {}


def _font(size_px: int, bold: bool = False):
    key = (size_px, bold)
    if key in _cache:
        return _cache[key]
    paths = BOLD_CANDIDATES if bold else FONT_CANDIDATES
    font = None
    for p in paths:
        if os.path.exists(p):
            try:
                font = ImageFont.truetype(p, size_px)
                break
            except Exception:
                continue
    if font is None:
        font = ImageFont.load_default()
    _cache[key] = font
    return font


def _rgb(color_obj, default=(0, 0, 0)):
    try:
        rgb = color_obj.rgb
        return (rgb[0], rgb[1], rgb[2])
    except Exception:
        return default


def _solid_fill(shape):
    try:
        fill = shape.fill
        if fill.type is not None and fill.type == 1:  # MSO_FILL.SOLID
            return _rgb(fill.fore_color, None)
    except Exception:
        pass
    return None


def _line_color(shape):
    try:
        ln = shape.line
        if ln.fill.type is not None and ln.fill.type == 1:
            return _rgb(ln.color, None), max(1, int(round((ln.width or 12700) / 12700)))
    except Exception:
        pass
    return None, 0


def _para_text(para):
    """Paragraph text including hard line breaks (<a:br/>), which runs[] drops."""
    ns = "{http://schemas.openxmlformats.org/drawingml/2006/main}"
    parts = []
    for child in para._p:
        tag = child.tag.split("}")[-1]
        if tag == "r":
            t = child.find(ns + "t")
            parts.append(t.text if t is not None and t.text else "")
        elif tag == "br":
            parts.append("\n")
    return "".join(parts)


def _wrap(draw, text, font, max_w):
    """Character-level wrap that also breaks on spaces (CJK has no spaces)."""
    if not text:
        return [""]
    lines = []
    for seg in text.split("\n"):
        if seg == "":
            lines.append("")
            continue
        cur = ""
        for ch in seg:
            trial = cur + ch
            if draw.textlength(trial, font=font) <= max_w or not cur:
                cur = trial
                continue
            if ch in " ，。、；：？！）】》”’%,.;:?!)]" and len(cur) > 1:
                # avoid starting a line with closing punctuation
                lines.append(cur[:-1])
                cur = cur[-1] + ch
            else:
                lines.append(cur)
                cur = ch
        if cur:
            lines.append(cur)
    return lines


def _draw_text_frame(draw, shape, x, y, w, h, scale, pxi):
    tf = shape.text_frame
    ml = (tf.margin_left or 0) * scale
    mr = (tf.margin_right or 0) * scale
    mt = (tf.margin_top or 0) * scale
    mb = (tf.margin_bottom or 0) * scale
    cx, cy = x + ml, y + mt
    cw = max(4.0, w - ml - mr)
    ch = max(4.0, h - mt - mb)

    blocks = []
    for para in tf.paragraphs:
        runs = [r for r in para.runs if r.text]
        if not runs:
            blocks.append((para, [], 12 * scale))
            continue
        size = runs[0].font.size or Emu(18 * 12700)
        # px per inch for this render (scale is px per EMU) -> pt -> px
        blocks.append((para, runs, (size.pt / 72.0) * pxi))

    total_h = 0
    layout = []
    for para, runs, line_h in blocks:
        text = _para_text(para)
        font = _font(max(8, int(round(line_h))), bool(runs and runs[0].font.bold))
        lines = _wrap(draw, text, font, cw)
        spacing = (para.space_after.pt if para.space_after else 0) / 72.0 * pxi
        layout.append((para, runs, font, lines, line_h, spacing))
        total_h += line_h * len(lines) + spacing

    anchor = tf.vertical_anchor
    if anchor == MSO_ANCHOR.MIDDLE:
        cy = y + (h - total_h) / 2
    elif anchor == MSO_ANCHOR.BOTTOM:
        cy = y + h - mb - total_h

    overflow = total_h > ch + 1.5
    for para, runs, font, lines, line_h, spacing in layout:
        align = para.alignment
        color = (40, 40, 40)
        if runs:
            try:
                if runs[0].font.color and runs[0].font.color.rgb is not None:
                    color = _rgb(runs[0].font.color, color)
            except Exception:
                pass
        for i, line in enumerate(lines):
            tw = draw.textlength(line, font=font)
            tx = cx
            if align is not None and str(align).startswith("CENTER"):
                tx = cx + (cw - tw) / 2
            elif align is not None and str(align).startswith("RIGHT"):
                tx = cx + cw - tw
            draw.text((tx, cy), line, font=font, fill=color)
            cy += line_h
        cy += spacing
    return overflow


def render(pptx_path: str, out_dir: str, width: int = 1920, sheet_path: str | None = None):
    os.makedirs(out_dir, exist_ok=True)
    prs = Presentation(pptx_path)
    sw = prs.slide_width
    sh = prs.slide_height
    scale = width / float(sw)
    pxi = scale * EMU_PER_IN          # pixels per inch on the rendered image
    height = int(round(sh * scale))
    report = []

    images = []
    for idx, slide in enumerate(prs.slides, start=1):
        bg = (255, 255, 255)
        try:
            f = slide.background.fill
            if f.type == 1:
                bg = _rgb(f.fore_color, bg)
        except Exception:
            pass
        img = Image.new("RGB", (width, height), bg)
        draw = ImageDraw.Draw(img)
        overflows = []

        for shape in slide.shapes:
            x = shape.left * scale
            y = shape.top * scale
            w = shape.width * scale
            h = shape.height * scale
            try:
                if shape.shape_type == MSO_SHAPE_TYPE.PICTURE:
                    blob = shape.image.blob
                    pim = Image.open(io.BytesIO(blob)).convert("RGBA")
                    pim = pim.resize((max(1, int(round(w))), max(1, int(round(h)))), Image.LANCZOS)
                    img.paste(pim, (int(round(x)), int(round(y))), pim)
                    continue
            except Exception:
                pass

            fill = _solid_fill(shape)
            lcol, lw = _line_color(shape)
            if fill or lcol:
                try:
                    st = str(shape.shape_type)
                except Exception:
                    st = ""
                radius = 0
                if "ROUNDED" in st.upper():
                    radius = int(min(w, h) * 0.12)
                box = [x, y, x + w, y + h]
                if radius > 0:
                    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=lcol, width=lw or 0)
                elif "OVAL" in st.upper():
                    draw.ellipse(box, fill=fill, outline=lcol, width=lw or 0)
                else:
                    draw.rectangle(box, fill=fill, outline=lcol, width=lw or 0)

            if shape.has_text_frame and shape.text_frame.text.strip():
                if _draw_text_frame(draw, shape, x, y, w, h, scale, pxi):
                    overflows.append(shape.text_frame.text.strip()[:40])

        out_path = os.path.join(out_dir, f"slide-{idx:02d}.png")
        img.save(out_path)
        images.append(out_path)
        report.append((idx, overflows))

    if sheet_path and images:
        cols = 3
        rows = (len(images) + cols - 1) // cols
        tw, th = 640, int(640 * height / width)
        sheet = Image.new("RGB", (cols * tw, rows * th), (235, 235, 235))
        for i, p in enumerate(images):
            im = Image.open(p).resize((tw - 8, th - 8), Image.LANCZOS)
            sheet.paste(im, ((i % cols) * tw + 4, (i // cols) * th + 4))
        sheet.save(sheet_path)

    print(f"rendered {len(images)} slides -> {out_dir}")
    for idx, ov in report:
        if ov:
            print(f"  slide {idx}: possible text overflow -> {ov}")
    return report


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pptx")
    ap.add_argument("--out", default="qa")
    ap.add_argument("--width", type=int, default=1920)
    ap.add_argument("--sheet", default=None)
    a = ap.parse_args()
    render(a.pptx, a.out, a.width, a.sheet)


if __name__ == "__main__":
    sys.exit(main())
