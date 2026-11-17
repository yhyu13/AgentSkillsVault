# -*- coding: utf-8 -*-
"""Shared deck geometry, capacity budget and spec validation.

build_deck.py (python-pptx) and render_deck.py (HTML mirror for QA) both import
this module, so a box cannot be measured in one renderer and drawn in another.
Units are inches for the slide and points for type; the mirror converts with
96 dpi (1 pt = 4/3 px), the same ratio PowerPoint uses at 100 % zoom.

Capacity is a budget, not a measurement: each box declares how many characters
fit at its size. build_deck.py shrinks body type to the floor before failing,
and render_deck.py measures the real wrapping in Chromium. Both must pass.
"""
from __future__ import annotations

import json
import pathlib

SLIDE_W, SLIDE_H = 13.333, 7.5
MARGIN = 0.72
BODY_FLOOR = 14.0
TITLE_SIZES = (54.0, 40.0, 34.0, 31.0, 28.0)
TITLE_FLOOR = 26.0

KINDS = ("cover", "section", "content", "quote", "end")


def theme(spec: dict) -> dict:
    default = {"paper": "F4EFE6", "ink": "14161A", "accent": "E4572E",
               "card": "FFFBF5", "mute": "5C5750", "line": "D9CFBF"}
    merged = dict(default)
    merged.update(spec.get("theme") or {})
    return merged


def boxes(kind: str, slide: dict) -> list[dict]:
    """Return text boxes in draw order. `size` is the point size to start from."""
    right = SLIDE_W - MARGIN
    if kind == "cover":
        return [
            {"id": "kicker", "x": MARGIN, "y": 0.62, "w": 8.0, "h": 0.34,
             "size": 13, "bold": True, "color": "accent", "role": "kicker"},
            {"id": "title", "x": MARGIN, "y": 1.18, "w": 11.4, "h": 1.35,
             "size": 54, "bold": True, "color": "ink", "role": "title",
             "chars": len(slide.get("title", "")), "budget": 26},
            {"id": "subtitle", "x": MARGIN, "y": 2.66, "w": 11.0, "h": 0.55,
             "size": 22, "bold": False, "color": "mute", "role": "subtitle",
             "chars": 24, "budget": 44},
            {"id": "meta", "x": MARGIN, "y": 5.42, "w": 11.6, "h": 0.9,
             "size": 13, "bold": False, "color": "mute", "role": "meta"},
        ]
    if kind == "section":
        return [
            {"id": "num", "x": MARGIN, "y": 0.96, "w": 3.1, "h": 2.6,
             "size": 132, "bold": True, "color": "accent", "role": "num"},
            {"id": "title", "x": MARGIN + 3.25, "y": 1.5, "w": 8.3, "h": 1.5,
             "size": 40, "bold": True, "color": "ink", "role": "title",
             "chars": len(slide.get("title", "")), "budget": 20},
            {"id": "lede", "x": MARGIN + 3.25, "y": 3.18, "w": 8.0, "h": 1.5,
             "size": 19, "bold": False, "color": "mute", "role": "lede",
             "chars": len(slide.get("lede", "")), "budget": 72},
        ]
    if kind == "content":
        out = [
            {"id": "kicker", "x": MARGIN, "y": 0.46, "w": 7.6, "h": 0.32,
             "size": 12.5, "bold": True, "color": "accent", "role": "kicker"},
            {"id": "title", "x": MARGIN, "y": 0.82, "w": 9.6, "h": 0.95,
             "size": 34, "bold": True, "color": "ink", "role": "title",
             "chars": len(slide.get("title", "")), "budget": 30},
        ]
        bullets = slide.get("bullets") or []
        has_image = bool(slide.get("image"))
        has_lede = bool(slide.get("lede"))
        layout = bullets_layout(len(bullets))
        top = layout["top"] + (0.5 if has_lede else 0.0)
        row = layout["row"]
        for i, bullet in enumerate(bullets):
            y = top + i * row
            out.append({"id": "head%d" % i, "x": MARGIN + 0.62, "y": y,
                        "w": 7.9 if has_image else 8.7, "h": 0.38,
                        "size": 19 if len(bullets) <= 3 else 17, "bold": True,
                        "color": "ink", "role": "head",
                        "chars": len(bullet.get("head", "")), "budget": 24})
            out.append({"id": "body%d" % i, "x": MARGIN + 0.62, "y": y + 0.40,
                        "w": 8.1 if has_image else 8.9, "h": 0.62,
                        "size": 16 if len(bullets) <= 3 else 14.5, "bold": False,
                        "color": "mute", "role": "body",
                        "chars": len(bullet.get("body", "")), "budget": 56})
        if has_image:
            out.append({"id": "image", "x": 9.62, "y": 1.84, "w": 2.98, "h": 1.68,
                        "role": "image"})
        if has_lede:
            out.append({"id": "lede", "x": MARGIN, "y": 1.80, "w": 11.2, "h": 0.42,
                        "size": 15.5, "bold": False, "color": "mute", "role": "lede",
                        "chars": len(slide["lede"]), "budget": 60})
        if slide.get("evidence"):
            out.append({"id": "evidence", "x": MARGIN + 0.62, "y": 6.38, "w": 11.2, "h": 0.34,
                        "size": 12.5, "bold": False, "color": "mute", "role": "evidence",
                        "chars": len(slide["evidence"]) + 3, "budget": 96})
        return out
    if kind == "quote":
        return [
            {"id": "kicker", "x": MARGIN, "y": 0.72, "w": 7.0, "h": 0.32,
             "size": 12.5, "bold": True, "color": "accent", "role": "kicker"},
            {"id": "quote", "x": MARGIN + 0.9, "y": 1.86, "w": 10.4, "h": 2.5,
             "size": 32, "bold": True, "color": "ink", "role": "quote",
             "chars": len(slide.get("quote", "")), "budget": 84},
            {"id": "attribution", "x": MARGIN + 0.9, "y": 4.86, "w": 10.4, "h": 0.5,
             "size": 14, "bold": False, "color": "mute", "role": "attribution",
             "chars": len(slide.get("attribution", "")), "budget": 72},
        ]
    return [
        {"id": "kicker", "x": MARGIN, "y": 0.66, "w": 7.0, "h": 0.32,
         "size": 13, "bold": True, "color": "accent", "role": "kicker"},
        {"id": "title", "x": MARGIN, "y": 1.42, "w": 10.8, "h": 1.2,
         "size": 44, "bold": True, "color": "ink", "role": "title",
         "chars": len(slide.get("title", "")), "budget": 22},
        {"id": "lede", "x": MARGIN, "y": 2.9, "w": 10.6, "h": 1.9,
         "size": 18, "bold": False, "color": "mute", "role": "lede",
         "chars": len(slide.get("lede", "")), "budget": 110},
    ]


def validate(spec: dict) -> list[str]:
    """Structural problems that must stop the build. Empty list = ok."""
    problems = []
    slides = spec.get("slides") or []
    if not 8 <= len(slides) <= 20:
        problems.append("deck has %d slides; 8–20 keeps a 51-minute film at summary length"
                        % len(slides))
    if not spec.get("source", {}).get("bvid") and not spec.get("source", {}).get("url"):
        problems.append("source.bvid or source.url is required — slides without provenance are unverifiable")
    for i, slide in enumerate(slides, 1):
        kind = slide.get("kind")
        if kind not in KINDS:
            problems.append("slide %d: kind %r not in %s" % (i, kind, KINDS))
            continue
        if kind == "content":
            bullets = slide.get("bullets") or []
            if not 2 <= len(bullets) <= 4:
                problems.append("slide %d: %d bullets; content slides take 2–4" % (i, len(bullets)))
            for j, bullet in enumerate(bullets, 1):
                if not (bullet.get("head") or "").strip() or not (bullet.get("body") or "").strip():
                    problems.append("slide %d bullet %d: head and body are both required" % (i, j))
        if kind in ("content", "section", "quote") and not (slide.get("timecode") or "").strip():
            problems.append("slide %d: no timecode — every claim points back to the film" % i)
        if not (slide.get("note") or "").strip():
            problems.append("slide %d: no speaker note (put the source line and what to say)" % i)
        for box in boxes(kind, slide):
            budget = box.get("budget")
            chars = box.get("chars")
            if budget and chars and chars > budget * 1.45:
                problems.append("slide %d %s: %d chars is far past the %d budget"
                                % (i, box["id"], chars, budget))
    return problems


def bullets_layout(count: int) -> dict:
    """Vertical rhythm and marker size for a content slide. build_deck.py and
    render_deck.py both read it, so the pptx and the mirror cannot drift."""
    return {"top": 1.92 if count <= 3 else 1.78,
            "row": 1.28 if count <= 3 else 1.06,
            "num_pt": 15.0 if count <= 3 else 13.5}


def fit_title(text: str, box: dict) -> float:
    """Title size for one box: start at the designed size, shrink 3 pt at a time until the
    text fits the character budget. Never grows, never shrinks below TITLE_FLOOR."""
    size = float(box["size"])
    limit = float(box.get("budget") or 30) * 1.1
    while size > TITLE_FLOOR and len(text) * (size / float(box["size"])) > limit:
        size -= 3.0
    return max(size, TITLE_FLOOR)


def chapters(spec: dict) -> list[dict]:
    """Section dividers in order: what the section rail draws on cover/section slides."""
    out = []
    for slide in spec.get("slides") or []:
        if slide.get("kind") == "section":
            out.append({"num": slide.get("num", ""), "title": slide.get("title", "")})
    return out


def chapter_of(spec: dict, index: int) -> int:
    """0-based section index that slide `index` belongs to (1-based slide numbers)."""
    seen = -1
    for i, slide in enumerate((spec.get("slides") or [])[:index], 1):
        if slide.get("kind") == "section":
            seen += 1
    return max(seen, 0)


def read(project: pathlib.Path) -> dict:
    """Load the spec without judging it. A checker that refuses to look at a bad
    deck cannot report what is wrong with it."""
    path = project / "deck" / "deck.json"
    if not path.exists():
        raise SystemExit("missing deck/deck.json")
    return json.loads(path.read_text(encoding="utf-8"))


def load(project: pathlib.Path) -> dict:
    path = project / "deck" / "deck.json"
    if not path.exists():
        raise SystemExit("missing deck/deck.json")
    spec = json.loads(path.read_text(encoding="utf-8"))
    problems = validate(spec)
    if problems:
        print("deck spec problems:")
        for p in problems:
            print("  - " + p)
        raise SystemExit(2)
    return spec
