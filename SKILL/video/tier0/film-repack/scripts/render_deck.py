# -*- coding: utf-8 -*-
"""Stage 4b — look at the deck before anyone else does.

    python "$SKILL/scripts/render_deck.py" --project <dir> [--dpi 1.5] [--keep]

There is no PowerPoint or LibreOffice on every machine, so this renders an HTML
mirror built from the SAME geometry module (scripts/deckkit.py) as the .pptx —
same inches, same point sizes, same font, same 1.18 line spacing. It then:
  · measures every text box for vertical/horizontal overflow (Chromium wrapping)
  · screenshots each slide at 1920×1080 into deck/qa/slide-NN.png
  · checks WCAG AA contrast for body text on paper
  · writes deck/qa/report.json

A mirror can still disagree with PowerPoint by a line on exotic fonts, so the
report says so. What it does catch — text spilling out of its box, a title
wrapped to five lines, grey-on-grey body copy — is exactly what a reader sees.

Exit 1 on overflow or contrast failure, 4 when Playwright/Chromium is missing.
"""
import argparse
import html
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import deckkit                                          # noqa: E402

PX = 96.0
PT = 96.0 / 72.0


def luminance(hex6: str) -> float:
    h = hex6.lstrip("#")
    channels = [int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]
    lin = [c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4 for c in channels]
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]


def contrast(a: str, b: str) -> float:
    la, lb = luminance(a), luminance(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def rail_html(spec: dict, index: int, theme: dict, kind: str) -> str:
    chapters = deckkit.chapters(spec)
    if not chapters:
        return ""
    y0 = 3.42 if kind == "cover" else 4.98
    current = deckkit.chapter_of(spec, index)
    parts = ['<div class="vline" style="left:%.1fpx;top:%.1fpx;height:%.1fpx"></div>'
             % (7.95 * PX, (y0 - 0.16) * PX, (len(chapters) * 0.4 + 0.1) * PX)]
    for i, chapter in enumerate(chapters):
        y = y0 + i * 0.4
        colour = theme["accent"] if i == current else theme["line"]
        parts.append('<div class="box railnum" data-id="rail%d" style="left:%.1fpx;top:%.1fpx;width:%.1fpx;color:#%s">%s</div>'
                     % (i, 8.15 * PX, y * PX, 0.55 * PX, colour, html.escape(chapter["num"])))
        parts.append('<div class="box railtitle" data-id="rail%dt" style="left:%.1fpx;top:%.1fpx;width:%.1fpx;color:#%s">%s</div>'
                     % (i, 8.7 * PX, y * PX, 3.9 * PX,
                        theme["ink"] if i == current else theme["mute"],
                        html.escape(chapter["title"])))
    return "\n".join(parts)


def slide_html(index: int, item: dict, theme: dict, spec: dict | None = None) -> str:
    kind = item["kind"]
    fields = {"kicker": item.get("kicker", ""), "title": item.get("title", ""),
              "subtitle": item.get("subtitle", ""), "meta": item.get("meta", ""),
              "num": item.get("num", "%02d" % index), "lede": item.get("lede", ""),
              "quote": item.get("quote", ""), "attribution": item.get("attribution", ""),
              "evidence": ("依据：" + item["evidence"]) if item.get("evidence") else ""}
    parts = ['<div class="slide" id="s%d">' % index]
    if spec is not None and kind in ("cover", "section"):
        parts.append(rail_html(spec, index, theme, kind))
    if kind == "quote":
        parts.append('<div class="box deco qmark" style="left:%.1fpx;top:%.1fpx">“</div>'
                     % (deckkit.MARGIN * PX, 1.06 * PX))
        parts.append('<div class="qrule" style="left:%.1fpx;top:%.1fpx"></div>'
                     % ((deckkit.MARGIN + 0.9) * PX, 4.56 * PX))
    if kind == "cover":
        parts.append('<div class="rule" style="left:%.1fpx;top:%.1fpx;width:%.1fpx"></div>'
                     % (deckkit.MARGIN * PX, 2.24 * PX, 3.2 * PX))
    for box in deckkit.boxes(kind, item):
        role = box["role"]
        if role.startswith("head") or role.startswith("body"):
            continue
        if role == "image":
            src = item.get("image") or ""
            if src:
                parts.append('<img class="box deco still" src="img/%s" '
                             'style="left:%.2fpx;top:%.2fpx;width:%.2fpx;height:%.2fpx">'
                             % (html.escape(pathlib.Path(src).name), box["x"] * PX,
                                box["y"] * PX, box["w"] * PX, box["h"] * PX))
            continue
        text = fields.get(role, "")
        if not text:
            continue
        size = deckkit.fit_title(text, box) if box["id"] == "title" else box["size"]
        parts.append(
            '<div class="box" data-id="%s" style="left:%.2fpx;top:%.2fpx;width:%.2fpx;height:%.2fpx;'
            'font-size:%.2fpx;font-weight:%s;color:%s;line-height:1.18">%s</div>'
            % (box["id"], box["x"] * PX, box["y"] * PX, box["w"] * PX, box["h"] * PX,
               size * PT, "700" if box.get("bold") else "400",
               "#" + theme[box["color"]], html.escape(text).replace("\n", "<br>")))
    if kind == "content":
        bullets = item.get("bullets") or []
        boxes = deckkit.boxes(kind, item)
        count = len([b for b in boxes if b["id"].startswith("head")])
        layout = deckkit.bullets_layout(count)
        row = layout["row"]
        for i, bullet in enumerate(bullets):
            y = next(b["y"] for b in boxes if b["id"] == "head%d" % i)
            num_size = layout["num_pt"]
            parts.append('<div class="box num" data-id="num%d" style="left:%.2fpx;top:%.2fpx;'
                         'width:%.2fpx;font-size:%.2fpx">%02d</div>'
                         % (i, deckkit.MARGIN * PX, y * PX, 0.5 * PX, num_size * PT, i + 1))
            parts.append('<div class="vrule" style="left:%.2fpx;top:%.2fpx;width:%.2fpx;height:%.2fpx"></div>'
                         % ((deckkit.MARGIN + 0.5) * PX, (y + 0.16) * PX, 0.06 * PX, (row - 0.5) * PX))
            for role in ("head", "body"):
                raw = bullet.get(role, "")
                box = next(b for b in boxes if b["id"] == role + str(i))
                parts.append(
                    '<div class="box" data-id="%s" style="left:%.2fpx;top:%.2fpx;width:%.2fpx;'
                    'height:%.2fpx;font-size:%.2fpx;font-weight:%s;color:%s;line-height:1.18">%s</div>'
                    % (box["id"], box["x"] * PX, box["y"] * PX, box["w"] * PX, box["h"] * PX,
                       box["size"] * PT, "700" if box.get("bold") else "400",
                       "#" + theme[box["color"]], html.escape(raw)))
    if kind in ("content", "section", "quote"):
        parts.append('<div class="box chip" style="left:%.2fpx;top:%.2fpx;width:%.2fpx;height:%.2fpx">%s</div>'
                     % ((deckkit.SLIDE_W - 3.1) * PX, 0.46 * PX, 2.38 * PX, 0.3 * PX,
                        html.escape("原片 " + item.get("timecode", ""))))
    parts.append('<div class="box foot" style="left:%.2fpx;top:%.2fpx;width:%.2fpx;height:%.2fpx">%s</div>'
                 % (deckkit.MARGIN * PX, 6.92 * PX, 11.9 * PX, 0.3 * PX,
                    html.escape(item.get("footer", ""))))
    parts.append("</div>")
    return "\n".join(parts)


def build_html(spec: dict, theme: dict) -> str:
    body = "\n".join(slide_html(i, item, theme, spec) for i, item in enumerate(spec["slides"], 1))
    return """<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;background:#888;}
.slide{position:relative;width:%(w).1fpx;height:%(h).1fpx;background:#%(paper)s;overflow:hidden;
  font-family:"Microsoft YaHei","PingFang SC",sans-serif;margin:0 auto 18px;}
.box{position:absolute;white-space:pre-wrap;word-break:break-word;overflow:visible;}
.chip{font-size:14.7px;color:#%(mute)s;text-align:right;line-height:1.18}
.foot{font-size:13.3px;color:#%(mute)s;line-height:1.18}
.num{font-size:20px;font-weight:700;color:#%(accent)s;line-height:1.18}
.rule{position:absolute;height:3px;background:#%(accent)s}
.vrule{position:absolute;background:#%(line)s}
.vline{position:absolute;width:1.5px;background:#%(line)s}
.railnum{font-size:14.7px;font-weight:700;line-height:1.18}
.railtitle{font-size:16px;line-height:1.18}
.still{object-fit:cover;border-radius:3px}
.qmark{font-family:Georgia,serif;font-size:72px;font-weight:700;color:#%(accent)s;line-height:1}
.qrule{position:absolute;width:249px;height:3px;background:#%(accent)s}
</style></head><body>%(body)s</body></html>""" % {
        "w": deckkit.SLIDE_W * PX, "h": deckkit.SLIDE_H * PX, "paper": theme["paper"],
        "mute": theme["mute"], "accent": theme["accent"], "line": theme["line"], "body": body}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", required=True)
    ap.add_argument("--dpi", type=float, default=1.5, help="1920x1080 at 1.5 (1280x720 @96dpi)")
    ap.add_argument("--keep", action="store_true", help="keep deck/qa/deck.html")
    args = ap.parse_args()
    project = pathlib.Path(args.project).expanduser().resolve()
    # Structural problems are reported, but the measurement still runs: "80 chars"
    # and "text spills 18 px out of its box" are different diagnoses and a user
    # needs the second one to know what to fix.
    spec = deckkit.read(project)
    problems = deckkit.validate(spec)
    for problem in problems:
        print("spec: " + problem)
    theme = deckkit.theme(spec)
    qa = project / "deck" / "qa"
    qa.mkdir(parents=True, exist_ok=True)
    img_dir = qa / "img"
    img_dir.mkdir(exist_ok=True)
    for slide in spec["slides"]:
        src = slide.get("image")
        if src and (project / src).exists():
            (img_dir / pathlib.Path(src).name).write_bytes((project / src).read_bytes())
    page_path = qa / "deck.html"
    page_path.write_text(build_html(spec, theme), encoding="utf-8")

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("playwright is required: pip install playwright && playwright install chromium")
        return 4

    footer = "%s · %s" % (spec.get("title", ""), (spec.get("source") or {}).get("bvid", ""))
    page_path.write_text(build_html(
        {"slides": [dict(item, footer=footer) for item in spec["slides"]]}, theme),
        encoding="utf-8")

    import hashlib
    report = {"mirror": "html (same geometry as pptx; not a PowerPoint render)",
              "deck_sha256": hashlib.sha256(
                  (project / "deck" / "deck.json").read_bytes()).hexdigest(),
              "spec_problems": problems, "slides": [], "contrast": {},
              "passed": not problems}
    body_contrast = contrast("#" + theme["ink"], "#" + theme["paper"])
    mute_contrast = contrast("#" + theme["mute"], "#" + theme["paper"])
    report["contrast"] = {"ink_on_paper": round(body_contrast, 2),
                          "mute_on_paper": round(mute_contrast, 2)}
    if mute_contrast < 4.5:
        report["passed"] = False

    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch()
            context = browser.new_context(viewport={"width": 1280, "height": 720},
                                          device_scale_factor=args.dpi)
            page = context.new_page()
            page.goto(page_path.as_uri())
            page.wait_for_timeout(300)
            page.evaluate("document.fonts.ready")
            for index in range(1, len(spec["slides"]) + 1):
                overflow = page.evaluate("""(idx) => {
                    const root = document.getElementById('s' + idx);
                    const out = [];
                    root.querySelectorAll('.box').forEach(el => {
                        if (el.classList.contains('deco')) return;
                        const id = el.dataset.id || el.className;
                        const dy = el.scrollHeight - el.clientHeight;
                        const dx = el.scrollWidth - el.clientWidth;
                        const box = el.getBoundingClientRect(), slide = root.getBoundingClientRect();
                        const leak = Math.round(box.bottom + dy - slide.bottom);
                        if (dy > 2 || dx > 2 || leak > 0)
                            out.push({id, dy, dx, leak, text: el.textContent.slice(0, 40)});
                    });
                    return out;
                }""", index)
                shot = qa / ("slide-%02d.png" % index)
                page.locator("#s%d" % index).screenshot(path=str(shot))
                entry = {"index": index, "kind": spec["slides"][index - 1]["kind"],
                         "png": str(shot.relative_to(project)).replace("\\", "/"),
                         "overflow": overflow}
                if overflow:
                    report["passed"] = False
                report["slides"].append(entry)
                mark = "FAIL" if overflow else "ok"
                print("  slide %02d %-22s %s" % (index,
                                                 spec["slides"][index - 1].get("title", "")[:22],
                                                 mark))
            browser.close()
    except Exception as exc:
        print("playwright failed: %s" % str(exc)[:300])
        return 4

    (qa / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2),
                                    encoding="utf-8")
    if not args.keep:
        page_path.unlink(missing_ok=True)
    print("contrast ink/paper %.2f  mute/paper %.2f (AA needs 4.5 for body text)"
          % (body_contrast, mute_contrast))
    if problems:
        print("FAIL deck spec — fix deck.json and re-run; the mirror below still measured every slide")
    if not report["passed"]:
        for slide in report["slides"]:
            for item in slide["overflow"]:
                print("FAIL slide %02d %s dy=%d dx=%d below-slide=%d  %r"
                      % (slide["index"], item["id"], item["dy"], item["dx"],
                         item["leak"], item["text"]))
        print("fix deck.json (shorten copy or move the box) and re-run; do not ship unrendered slides")
        return 1
    print("PASS deck render check — %d slides in %s"
          % (len(report["slides"]), qa.relative_to(project)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
