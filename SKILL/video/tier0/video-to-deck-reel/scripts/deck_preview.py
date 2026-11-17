# -*- coding: utf-8 -*-
"""Render a preview page straight from the .pptx geometry (no second layout).

    python deck_preview.py <project>/ppt/deck.pptx [-o <project>/ppt/preview.html]

There is no PowerPoint or LibreOffice on this machine, so the pptx cannot be
rasterised by an office engine. Instead of re-implementing the layout in HTML
(which drifts the moment one side changes), this walks the real pptx shapes and
emits one absolutely-positioned div per shape at the same coordinates. If a box
is 3.4in wide in the file, it is 3.4in wide here.

What it can prove: copy, order, density, alignment, colour, whether a line runs
past its box.
What it cannot prove: PowerPoint's own line breaking, font substitution, and
anything the XML expresses outside position/size/fill/run properties.

Screenshot it with shot_preview.mjs, which writes one PNG per slide.
"""
import argparse
import html
import json
import os
import sys

from pptx import Presentation
from pptx.enum.text import PP_ALIGN
from pptx.util import Emu

PX_PER_IN = 96.0
ALIGN = {PP_ALIGN.LEFT: "left", PP_ALIGN.RIGHT: "right",
         PP_ALIGN.CENTER: "center", PP_ALIGN.JUSTIFY: "justify"}


def px(emu):
    return round(Emu(emu).inches * PX_PER_IN, 2)


def color_of(obj):
    try:
        rgb = obj.rgb
        return "#%02x%02x%02x" % (rgb[0], rgb[1], rgb[2])
    except Exception:
        return None


def fill_of(shape):
    try:
        if shape.fill.type is not None and shape.fill.type == 1:
            return color_of(shape.fill.fore_color)
    except Exception:
        pass
    return None


def line_of(shape):
    try:
        if shape.line.color and shape.line.color.rgb is not None:
            return color_of(shape.line.color), max(1.0, Emu(shape.line.width or 12700).pt * 96 / 72)
    except Exception:
        return None
    return None


def text_html(shape):
    tf = shape.text_frame
    out = []
    for para in tf.paragraphs:
        runs = []
        for run in para.runs:
            chunk = html.escape(run.text).replace("\n", "<br>")
            if not chunk:
                continue
            font = run.font
            size = font.size.pt if font.size is not None else None
            color = color_of(font.color) or "#eceae5"
            weight = 700 if font.bold else 400
            style = f"color:{color};font-weight:{weight};"
            if size:
                style += f"font-size:{size}pt;"
            if font.italic:
                style += "font-style:italic;"
            runs.append(f'<span style="{style}">{chunk}</span>')
        if runs:
            align = ALIGN.get(para.alignment, "left")
            out.append(f'<div style="text-align:{align}">{"".join(runs)}</div>')
    return "".join(out)


def shape_html(shape, sid):
    x, y, w, h = px(shape.left), px(shape.top), px(shape.width), px(shape.height)
    base = (f"position:absolute;left:{x}px;top:{y}px;width:{w}px;height:{max(h, 1)}px;"
            "box-sizing:border-box;overflow:hidden;")
    parts = []

    fill = fill_of(shape)
    border = line_of(shape)
    is_line = getattr(shape, "shape_type", None) == 9 or (h <= 2 < w)
    if is_line and border:
        parts.append(f'<div style="{base}background:{border[0]};height:{max(1, border[1])}px"></div>')
    elif fill and shape.has_text_frame and shape.text_frame.text.strip():
        style = base + f"background:{fill};"
        if border:
            style += f"border:{border[1]}px solid {border[0]};border-radius:6px;"
        body = text_html(shape)
        parts.append(f'<div style="{style}padding:14px 16px;font-family:\'Microsoft YaHei\',sans-serif;'
                     f"line-height:1.45;\">{body}</div>")
    elif fill or border:
        style = base + (f"background:{fill};" if fill else "")
        if border:
            style += f"border:{border[1]}px solid {border[0]};"
        parts.append(f'<div style="{style}"></div>')

    if shape.has_text_frame and shape.text_frame.text.strip() and not (fill and not is_line and parts):
        body = text_html(shape)
        parts.append(f'<div style="{base}padding:6px 8px;font-family:\'Microsoft YaHei\',sans-serif;'
                     f"line-height:1.45;\">{body}</div>")
    return "".join(parts)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pptx")
    ap.add_argument("-o", "--out", default="")
    a = ap.parse_args()

    prs = Presentation(a.pptx)
    W = px(prs.slide_width)
    H = px(prs.slide_height)
    out = a.out or os.path.join(os.path.dirname(a.pptx), "preview.html")

    pages = []
    for idx, slide in enumerate(prs.slides, 1):
        bg = "#101318"
        try:
            if slide.background.fill.type == 1:
                bg = color_of(slide.background.fill.fore_color) or bg
        except Exception:
            pass
        shapes = "".join(shape_html(s, idx) for s in slide.shapes)
        pages.append(
            f'<div class="slide" id="s{idx:02d}" style="position:relative;width:{W}px;height:{H}px;'
            f'background:{bg};overflow:hidden">{shapes}'
            f'<div style="position:absolute;left:16px;bottom:-22px;font:11px Georgia;color:#555">'
            f"slide {idx}</div></div>")

    page = f"""<!doctype html><meta charset="utf-8">
<title>deck preview</title>
<style>
  body {{ margin: 0; background: #05070a; font-family: "Microsoft YaHei", sans-serif; }}
  .slide {{ margin: 0 auto 26px; box-shadow: 0 0 0 1px #1c222c; }}
  .wrap {{ padding: 0; }}
</style>
<div class="wrap">{''.join(pages)}</div>
"""
    with open(out, "w", encoding="utf-8") as f:
        f.write(page)
    print("OK %s slides=%d %dx%d px" % (out, len(prs.slides), W, H))
    return 0


if __name__ == "__main__":
    sys.exit(main())
