# -*- coding: utf-8 -*-
"""Stage 4 — build the .pptx from deck/deck.json.

    python "$SKILL/scripts/build_deck.py" --project <dir>

Writes <dir>/deck/<slug>.pptx and <dir>/deck/build-report.json. Every slide gets
speaker notes containing the source timecode, so a reader can jump back to the
film instead of trusting the slide.

This step checks structure and character budgets only; it cannot see the drawn
slide. Run scripts/render_deck.py afterwards for the pixel check (overflow,
clipping, contrast) — a deck that never went through render_deck.py has not been
looked at.

Exit 2 for a spec that breaks the contract, 3 when python-pptx is missing.
"""
import argparse
import hashlib
import json
import pathlib
import sys

try:
    from pptx import Presentation
    from pptx.dml.color import RGBColor
    from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
    from pptx.util import Inches, Pt
except ImportError:                                     # pragma: no cover
    print("python-pptx is required: pip install python-pptx")
    sys.exit(3)

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import deckkit                                          # noqa: E402


def rgb(hex6: str) -> RGBColor:
    return RGBColor.from_string(hex6.upper())


def set_east_asian(run, typeface: str) -> None:
    """python-pptx only sets the latin typeface; without a:ea PowerPoint picks its own
    CJK font and the deck stops matching the rendered mirror."""
    from pptx.oxml.ns import qn
    rpr = run._r.get_or_add_rPr()
    ea = rpr.find(qn("a:ea"))
    if ea is None:
        ea = rpr.makeelement(qn("a:ea"), {})
        rpr.append(ea)
    ea.set("typeface", typeface)


def add_box(slide, box, text, theme):
    frame = slide.shapes.add_textbox(Inches(box["x"]), Inches(box["y"]),
                                     Inches(box["w"]), Inches(box["h"]))
    tf = frame.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = MSO_ANCHOR.TOP
    para = tf.paragraphs[0]
    para.alignment = PP_ALIGN.LEFT
    para.line_spacing = 1.18
    run = para.add_run()
    run.text = text
    run.font.size = Pt(box["size"])
    run.font.bold = bool(box.get("bold"))
    run.font.name = "Microsoft YaHei"
    run.font.color.rgb = rgb(theme[box["color"]])
    set_east_asian(run, "Microsoft YaHei")
    return frame


def bullet_rows(slide, boxes, theme):
    count = len([b for b in boxes if b["id"].startswith("head")])
    layout = deckkit.bullets_layout(count)
    size = layout["num_pt"]
    row = layout["row"]
    for index in range(max(count, 0)):
        y = next(b["y"] for b in boxes if b["id"] == "head%d" % index)
        mark = slide.shapes.add_textbox(Inches(deckkit.MARGIN), Inches(y),
                                        Inches(0.5), Inches(0.34))
        tf = mark.text_frame
        tf.word_wrap = False
        tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
        para = tf.paragraphs[0]
        run = para.add_run()
        run.text = "%02d" % (index + 1)
        run.font.size = Pt(size)
        run.font.bold = True
        run.font.name = "Microsoft YaHei"
        run.font.color.rgb = rgb(theme["accent"])
        rule = slide.shapes.add_shape(1, Inches(deckkit.MARGIN + 0.5), Inches(y + 0.16),
                                     Inches(0.06), Inches(row - 0.5))
        rule.fill.solid()
        rule.fill.fore_color.rgb = rgb(theme["line"])
        rule.line.fill.background()


def build(project: pathlib.Path) -> int:
    spec = deckkit.load(project)
    theme = deckkit.theme(spec)
    prs = Presentation()
    prs.slide_width = Inches(deckkit.SLIDE_W)
    prs.slide_height = Inches(deckkit.SLIDE_H)
    blank = prs.slide_layouts[6]
    slides = spec["slides"]
    report = {"slug": spec.get("slug") or project.name, "slides": [], "theme": theme}

    for number, item in enumerate(slides, 1):
        kind = item["kind"]
        slide = prs.slides.add_slide(blank)
        fill = slide.background.fill
        fill.solid()
        fill.fore_color.rgb = rgb(theme["paper"])

        fields = {
            "kicker": item.get("kicker", ""),
            "title": item.get("title", ""),
            "subtitle": item.get("subtitle", ""),
            "meta": item.get("meta", ""),
            "num": item.get("num", "%02d" % number),
            "lede": item.get("lede", ""),
            "quote": item.get("quote", ""),
            "attribution": item.get("attribution", ""),
            "evidence": ("依据：" + item["evidence"]) if item.get("evidence") else "",
        }
        boxes = deckkit.boxes(kind, item)
        drawn = []
        for box in boxes:
            if box["role"].startswith("head") or box["role"].startswith("body"):
                continue
            if box["role"] == "image":
                image = project / (item.get("image") or "")
                if item.get("image") and image.exists():
                    slide.shapes.add_picture(str(image), Inches(box["x"]), Inches(box["y"]),
                                             Inches(box["w"]), Inches(box["h"]))
                continue
            text = fields.get(box["role"], "")
            if not text:
                continue
            if box["role"] == "title":
                box = dict(box, size=deckkit.fit_title(text, box))
            add_box(slide, box, text, theme)
            drawn.append({"id": box["id"], "chars": len(text), "size": box["size"]})
        if kind == "content":
            bullets = item.get("bullets") or []
            if bullets:
                bullet_rows(slide, boxes, theme)
                for index, bullet in enumerate(bullets):
                    for role in ("head", "body"):
                        text = bullet.get(role, "")
                        box = next(b for b in boxes if b["id"] == role + str(index))
                        add_box(slide, box, text, theme)
                        drawn.append({"id": box["id"], "chars": len(text), "size": box["size"]})

        if kind in ("cover", "section"):
            rail_y = 3.42 if kind == "cover" else 4.98
            current = deckkit.chapter_of(spec, number - 1)
            chapters = deckkit.chapters(spec)
            for i, chapter in enumerate(chapters):
                y = rail_y + i * 0.4
                mark = slide.shapes.add_textbox(Inches(8.15), Inches(y), Inches(0.55), Inches(0.3))
                mp = mark.text_frame.paragraphs[0]
                mrun = mp.add_run()
                mrun.text = chapter["num"]
                mrun.font.size = Pt(11)
                mrun.font.bold = True
                mrun.font.name = "Microsoft YaHei"
                mrun.font.color.rgb = rgb(theme["accent"] if i == current else theme["line"])
                label = slide.shapes.add_textbox(Inches(8.7), Inches(y), Inches(3.9), Inches(0.3))
                lp = label.text_frame.paragraphs[0]
                lrun = lp.add_run()
                lrun.text = chapter["title"]
                lrun.font.size = Pt(12)
                lrun.font.name = "Microsoft YaHei"
                lrun.font.color.rgb = rgb(theme["ink"] if i == current else theme["mute"])
            rule = slide.shapes.add_shape(1, Inches(7.95), Inches(rail_y - 0.16),
                                         Inches(0.02), Inches(len(chapters) * 0.4 + 0.1))
            rule.fill.solid()
            rule.fill.fore_color.rgb = rgb(theme["line"])
            rule.line.fill.background()

        if kind == "quote":
            mark = slide.shapes.add_textbox(Inches(deckkit.MARGIN), Inches(1.06),
                                           Inches(0.8), Inches(0.6))
            mp = mark.text_frame.paragraphs[0]
            mrun = mp.add_run()
            mrun.text = "“"
            mrun.font.size = Pt(54)
            mrun.font.bold = True
            mrun.font.name = "Georgia"
            mrun.font.color.rgb = rgb(theme["accent"])
            rule = slide.shapes.add_shape(1, Inches(deckkit.MARGIN + 0.9), Inches(4.56),
                                         Inches(2.6), Inches(0.03))
            rule.fill.solid()
            rule.fill.fore_color.rgb = rgb(theme["accent"])
            rule.line.fill.background()

        if kind in ("content", "section", "quote"):
            chip = slide.shapes.add_textbox(Inches(deckkit.SLIDE_W - 3.1), Inches(0.46),
                                            Inches(2.38), Inches(0.3))
            chip.text_frame.margin_left = chip.text_frame.margin_right = 0
            para = chip.text_frame.paragraphs[0]
            para.alignment = PP_ALIGN.RIGHT
            run = para.add_run()
            run.text = "原片 " + item.get("timecode", "")
            run.font.size = Pt(11)
            run.font.name = "Microsoft YaHei"
            run.font.color.rgb = rgb(theme["mute"])

        footer = slide.shapes.add_textbox(Inches(deckkit.MARGIN), Inches(6.92),
                                          Inches(11.9), Inches(0.3))
        fpara = footer.text_frame.paragraphs[0]
        frun = fpara.add_run()
        bvid = (spec.get("source") or {}).get("bvid") or ""
        frun.text = " · ".join(x for x in (spec.get("title", ""), bvid) if x)
        frun.font.size = Pt(10)
        frun.font.name = "Microsoft YaHei"
        frun.font.color.rgb = rgb(theme["mute"])

        note_lines = [item.get("note", "")]
        if item.get("timecode"):
            note_lines.append("原片 %s %s" % (item["timecode"], item.get("evidence", "")))
        if spec.get("source", {}).get("url"):
            note_lines.append(spec["source"]["url"])
        slide.notes_slide.notes_text_frame.text = "\n".join(x for x in note_lines if x)

        report["slides"].append({"index": number, "kind": kind,
                                 "title": item.get("title", ""),
                                 "timecode": item.get("timecode", ""),
                                 "boxes": drawn})

    out_dir = project / "deck"
    out_dir.mkdir(parents=True, exist_ok=True)
    slug = report["slug"]
    target = out_dir / ("%s.pptx" % slug)
    prs.save(str(target))
    report["file"] = str(target.relative_to(project)).replace("\\", "/")
    report["deck_sha256"] = hashlib.sha256(
        (project / "deck" / "deck.json").read_bytes()).hexdigest()
    report["pptx_sha256"] = hashlib.sha256(target.read_bytes()).hexdigest()
    report["bytes"] = target.stat().st_size
    report["slide_count"] = len(slides)
    (out_dir / "build-report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print("wrote %s  slides=%d  %.1f KB" % (report["file"], len(slides),
                                            report["bytes"] / 1024))
    print('next: python "$SKILL/scripts/render_deck.py" --project .')
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", required=True)
    args = ap.parse_args()
    return build(pathlib.Path(args.project).expanduser().resolve())


if __name__ == "__main__":
    sys.exit(main())
