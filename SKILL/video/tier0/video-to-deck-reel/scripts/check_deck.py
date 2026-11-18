# -*- coding: utf-8 -*-
"""Structural + overflow gate on the real .pptx (not on a preview).

    python check_deck.py <project>/ppt/deck.pptx [--max-slides 16] [--json out.json]
                         [--transcript source/transcript/transcript_clean.txt]
                         [--duration 522]

Failures, all measured on the pptx XML through python-pptx:

  count     more than --max-slides, or zero slides
  trace     a slide whose notes do not carry a source timecode (mm:ss) and the
            word 原片. A slide that cannot be traced to a minute of the source
            is an opinion slide.
  bounds    a shape that leaves the slide rectangle
  size      text under 8 pt
  overflow  estimated wrapped height above the shape height by more than 15%.
            Estimation is deliberate: no PowerPoint on this machine can render
            the pptx, so width is computed per character (CJK 1.0 em, Latin
            0.52 em) and compared with the frame. It under-reports: a pass here
            still needs the preview PNGs looked at.
  number    with --transcript, any figure on a slide that is not in the
            transcript. Slide copy is the most quotable surface of the deck, so
            it gets the same provenance rule as the narration.

Exit 1 with a per-slide table of the worst offenders.
"""
import argparse
import json
import math
import os
import re
import sys

from pptx import Presentation
from pptx.util import Emu

TITLE_PT = 22
BODY_MIN_PT = 8.0        # footer/metadata sits at 8-9 pt; below 8 is unreadable on a projector
LINE_FACTOR = 1.45
INSET = 0.08          # inches, both sides
FILL_LIMIT = 1.15


def char_em(ch):
    return 1.0 if ord(ch) > 0x2E7F else 0.52


def est_lines(text, size_pt, width_in):
    """Estimated wrapped line count.

    Each paragraph costs one line before any wrapping, and the trailing first
    line is not free: the previous version started at 1 and never charged a
    paragraph, so a two-paragraph box that needed 4 lines was estimated at 3
    and could report fill 0.9 while really overflowing.
    """
    avail = max(0.2, width_in - INSET * 2) * 72.0
    lines, cursor = 0, 0.0
    for para in text.split("\n"):
        cursor = 0.0
        lines += 1
        if not para:
            continue
        for ch in para:
            w = char_em(ch) * size_pt
            if cursor + w > avail:
                lines += 1
                cursor = w
            else:
                cursor += w
    return lines


def shape_texts(shape):
    out = []
    if not shape.has_text_frame:
        return out
    for para in shape.text_frame.paragraphs:
        text = "".join(run.text for run in para.runs)
        if not text.strip():
            continue
        size = None
        for run in para.runs:
            if run.font.size is not None:
                size = run.font.size.pt
                break
        if size is None:
            size = 18.0
        out.append((text, size))
    return out


def notes_text(slide):
    try:
        return slide.notes_slide.notes_text_frame.text or ""
    except Exception:
        return ""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pptx")
    ap.add_argument("--max-slides", type=int, default=16)
    ap.add_argument("--transcript", default="",
                    help="transcript_clean.txt: every slide figure must appear there")
    ap.add_argument("--duration", type=float, default=0.0,
                    help="source duration in seconds; timecodes beyond it fail")
    ap.add_argument("--json", default="")
    ap.add_argument("--quiet", action="store_true")
    a = ap.parse_args()

    prs = Presentation(a.pptx)
    # Slide figures are almost always Arabic digits; Chinese numerals in copy are
    # ordinals and classifiers (第四版, 一篇). Checking digits only keeps the gate
    # usable, and a fabricated figure is what it is for.
    problems = []
    rows = []
    transcript_text = ""
    if a.transcript:
        transcript_text = open(a.transcript, encoding="utf-8").read()
        if len(re.findall(r"[一-鿿]", transcript_text)) < 200:
            problems.append("--transcript %s 不像逐字稿（汉字 < 200）："
                            "空文件过闸等于没有数字检查" % a.transcript)
    digit = re.compile(r"\d+(?:\.\d+)?%?")
    # compare values, not substrings: "9" must not be backed by "90 人"
    # timestamps are not quantities: without stripping them, "20" from [00:20-00:28]
    # would back an invented "20 人"
    tr_clean = re.sub(r"\d{1,2}:\d{2}(?::\d{2})?", " ", transcript_text)
    tr_clean = re.sub(r"\[\d+\]", " ", tr_clean)
    tr_values = {round(float(t.rstrip("%")), 3) for t in digit.findall(tr_clean)}
    sw = prs.slide_width.inches
    sh = prs.slide_height.inches

    if not prs.slides:
        problems.append("pptx 没有幻灯片")
    if len(prs.slides) > a.max_slides:
        problems.append("幻灯片 %d 页，超过 %d" % (len(prs.slides), a.max_slides))

    for idx, slide in enumerate(prs.slides, 1):
        note = notes_text(slide)
        stamp = re.search(r"(\d{1,2}):(\d{2})(?:\s*[-–]\s*(\d{1,2}):(\d{2}))?", note)
        if "原片" not in note or not stamp:
            problems.append("p%02d 备注缺少原片时间" % idx)
        else:
            # 99:99 is a placeholder that used to pass this gate; so does a range
            # whose end is before its start, and an mm:ss past the source.
            pairs = [(int(stamp.group(1)), int(stamp.group(2)))]
            if stamp.group(3):
                pairs.append((int(stamp.group(3)), int(stamp.group(4))))
            secs = [m * 60 + s for m, s in pairs]
            for (m, s), sec in zip(pairs, secs):
                # mm:ss means minutes < 60 unless a real duration says the source
                # is long enough for a 61:00-style timecode to be legitimate
                if s > 59 or (m > 59 and not (a.duration and sec <= a.duration + 1)):
                    problems.append("p%02d 时间码不合法 %02d:%02d" % (idx, m, s))
                elif sec > 3 * 3600:
                    problems.append("p%02d 时间码超出片长范围 %02d:%02d" % (idx, m, s))
                elif a.duration and sec > a.duration + 1:
                    problems.append("p%02d 时间码 %02d:%02d 超出原片 %.0fs"
                                    % (idx, m, s, a.duration))
            if len(secs) == 2 and secs[1] < secs[0]:
                problems.append("p%02d 时间码区间倒置 %02d:%02d-%02d:%02d"
                                % (idx, pairs[0][0], pairs[0][1], pairs[1][0], pairs[1][1]))
        biggest = 0.0
        worst = (0.0, "")
        for shape in slide.shapes:
            need_total, height = 0.0, shape.height.inches
            label = ""
            for text, size in shape_texts(shape):
                need_total += est_lines(text, size, shape.width.inches) * size * LINE_FACTOR / 72.0
                label = label or text[:26].replace(chr(10), " ")
            if height > 0 and need_total:
                fill = need_total / height
                if fill > worst[0]:
                    worst = (fill, label)
        tiny = []
        for shape in slide.shapes:
            left, top = shape.left.inches, shape.top.inches
            width, height = shape.width.inches, shape.height.inches
            if left < -0.02 or top < -0.02 or left + width > sw + 0.02 or top + height > sh + 0.02:
                problems.append("p%02d 形状越界 %.2f,%.2f %.2fx%.2f"
                                % (idx, left, top, width, height))
            name = (shape.name or "").strip().lower()
            for text, size in shape_texts(shape):
                biggest = max(biggest, size)
                # footers carry the source timecode and duration, which nobody
                # speaks; a page number is not a claim either.
                # Exempt by shape identity, never by what the text looks like:
                # build_deck.js names the page number "pageno" and the source line
                # "provenance". A caveat box ("caveat") is checked like body copy,
                # and a hand-made deck that skips the names gets fully checked.
                # ...and a strict grammar for decks not built by build_deck.js:
                # exactly "原片 mm:ss-mm:ss", nothing else, so a caveat cannot
                # hide behind the prefix.
                is_footer = (name in ("pageno", "provenance", "item-index")
                             or re.fullmatch(r"原片\s*\d{1,2}:\d{2}\s*[-–—]\s*\d{1,2}:\d{2}", text.strip()) is not None)
                scan = re.sub(r"\d{1,2}:\d{2}(?::\d{2})?", " ", text)
                if transcript_text and not is_footer:
                    for m2 in digit.finditer(scan):
                        token = m2.group()
                        # a number glued to a latin word with no CJK around it is a
                        # model version or a unit (SEEDANCE 2.5, 720p, GPT-6), not
                        # a quantity. Documented residual: "CPU 90%" with no CJK
                        # copy nearby is skipped too.
                        window = scan[max(0, m2.start() - 3):m2.end() + 3]
                        if (re.search(r"[A-Za-z]", window)
                                and not re.search(r"[\u4e00-\u9fff]", window)):
                            continue
                        value = round(float(token.rstrip("%")), 3)
                        if value not in tr_values:
                            problems.append("p%02d 数字 %s 不在逐字稿：%s"
                                            % (idx, token,
                                               text[:26].replace(chr(10), " ")))
                if size < BODY_MIN_PT:
                    tiny.append((round(size, 1), text[:18]))
                lines = est_lines(text, size, width)
                need = lines * size * LINE_FACTOR / 72.0
                if height > 0:
                    fill = need / height
                    if fill > worst[0]:
                        worst = (fill, text[:26].replace("\n", " "))
        if biggest < TITLE_PT:
            problems.append("p%02d 没有标题级文字（最大 %.0fpt）" % (idx, biggest))
        if tiny:
            problems.append("p%02d 字号过小 %s" % (idx, tiny[:2]))
        if worst[0] > FILL_LIMIT:
            problems.append("p%02d 可能溢出 fill=%.2f 「%s」" % (idx, worst[0], worst[1]))
        rows.append({"slide": idx, "title_pt": round(biggest, 1),
                     "max_fill": round(worst[0], 2), "note": note[:70]})

    if not a.quiet:
        print("%-6s %-8s %-9s %s" % ("slide", "title", "fill", "notes"))
        for r in rows:
            print("%-6d %-8.1f %-9.2f %s" % (r["slide"], r["title_pt"], r["max_fill"], r["note"]))
    if a.json:
        json.dump({"slides": rows, "problems": problems}, open(a.json, "w", encoding="utf-8"),
                  ensure_ascii=False, indent=2)
    if problems:
        print("\n".join(problems))
        return 1
    print("PASS slides=%d size=%.2fx%.2f in" % (len(rows), sw, sh))
    return 0


if __name__ == "__main__":
    sys.exit(main())
