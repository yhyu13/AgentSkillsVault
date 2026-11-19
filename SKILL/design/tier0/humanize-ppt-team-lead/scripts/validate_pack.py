#!/usr/bin/env python3
"""Validate a deck workspace against the humanize-ppt-team stage contracts.

Three gates, matching SKILL.md / references/stage-contracts.md:

    --stage contracts  the six AST contract files exist and parse
    --stage render     at least one HTML entry opens cleanly by static checks
    --stage delivery   contracts + render + DELIVERY.md + referenced assets

Exit code 0 = gate passed, 1 = blocking problems found, 2 = usage error.
Static checks only: it cannot judge whether the story works.

Usage:
    python scripts/validate_pack.py --deck deck --stage contracts
    python scripts/validate_pack.py --deck deck --stage delivery
"""
import argparse
import json
import re
import sys
from pathlib import Path

CONTRACTS = [
    "brief/deck_brief.md",
    "brief/ast_outline.md",
    "brief/speaker_intent.md",
    "brief/asset_manifest.md",
    "plan/slide_plan.json",
    "plan/video_slots.json",
]

BAD_HTML = [
    (re.compile(r"file:///", re.I), "absolute file:/// path"),
    (re.compile(r"""src\s*=\s*["']\s*["']"""), "empty src"),
    (re.compile(r"\[必填\]"), "unfilled 必填 marker"),
    (re.compile(r"\bTODO\b"), "TODO marker"),
    (re.compile(r"[A-Za-z]:[\\/](?:Users|GitRepo|workbuddy)"), "local drive path"),
]

# 契约模板自带 `<受众>` `<封面标题>` 这类占位符。旧版只查 TODO，于是 untouched
# 骨架也能 GATE PASSED——门变成了装饰。这里把「尖括号但不是 HTML 标签」一律算
# 未填占位：`<用户>` `<...>` 全部命中，`<div>` `<br/>` `<h1>` 不命中。
ANGLE_RE = re.compile(r"<([^<>\n]{0,60})>")
HTML_TAG_RE = re.compile(r"^/?(?:[a-zA-Z][a-zA-Z0-9-]*)(?:\s[^<>]*)?/?$")
PLACEHOLDER_HINT_RE = re.compile(r"[^\x00-\x7f]|\.\.\.|xxx|XXX|占位|待填")


def find_placeholders(text):
    """Return the unreplaced `<...>` placeholders in *text* (HTML tags excluded)."""
    hits = []
    for m in ANGLE_RE.finditer(text):
        inner = m.group(1).strip()
        if HTML_TAG_RE.match(inner):
            continue
        if not PLACEHOLDER_HINT_RE.search(inner):
            continue
        hits.append(m.group(0))
    return hits



def ok(msg):
    print(f"  ok    {msg}")


def bad(problems, msg):
    print(f"  FAIL  {msg}")
    problems.append(msg)


def check_contracts(deck: Path, problems):
    for rel in CONTRACTS:
        p = deck / rel
        if not p.is_file():
            bad(problems, f"missing contract: {rel}")
        elif p.suffix == ".json":
            # JSON 的“空”要结构判断，不看字节数：`{"slots": []}` 是合法的
            # “本 deck 没有视频位”，15 字节就被判“看起来是空的”会逼人拿
            # 无意义内容把文件扑大（2026-11-20 实测发现）。
            try:
                data = json.loads(p.read_text(encoding="utf-8"))
            except json.JSONDecodeError as exc:
                bad(problems, f"{rel} is not valid JSON: {exc}")
            else:
                holes = find_placeholders(p.read_text(encoding="utf-8", errors="replace"))
                if data in ({}, [], None, ""):
                    bad(problems, f"contract looks empty: {rel}")
                elif holes:
                    bad(problems, f"unreplaced placeholder in {rel}: " + " ".join(dict.fromkeys(holes)))
                else:
                    ok(rel)
        elif p.stat().st_size < 20:
            bad(problems, f"contract looks empty: {rel}")
        else:
            # 存在且非空还不算写完：模板里的 `<受众>` 原样留着就是没填。
            # 旧版只查 TODO，空骨架轻松过门（2026-11-20 实测发现）。
            holes = find_placeholders(p.read_text(encoding="utf-8", errors="replace"))
            if holes:
                sample = " ".join(dict.fromkeys(holes))
                bad(problems, f"unreplaced placeholder in {rel}: {sample}")
            else:
                ok(rel)

    plan = deck / "plan" / "slide_plan.json"
    if plan.is_file():
        try:
            data = json.loads(plan.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            bad(problems, f"slide_plan.json is not valid JSON: {exc}")
            return
        slides = data.get("slides") or []
        if not slides:
            bad(problems, "slide_plan.json has no slides")
        nos = [s.get("no") for s in slides]
        if nos != list(range(1, len(nos) + 1)):
            bad(problems, f"slide numbering not continuous from 1: {nos[:8]}")
        for s in slides:
            if not (s.get("purpose") or "").strip():
                bad(problems, f"slide {s.get('no')} has no purpose")
                break
        ok(f"slide_plan.json: {len(slides)} slides, purpose present")

    vslots = deck / "plan" / "video_slots.json"
    if vslots.is_file():
        try:
            json.loads(vslots.read_text(encoding="utf-8"))
            ok("video_slots.json parses")
        except json.JSONDecodeError as exc:
            bad(problems, f"video_slots.json is not valid JSON: {exc}")


def check_render(deck: Path, problems):
    entries = sorted(p for p in (deck / "final").rglob("*.html"))
    if not entries:
        bad(problems, "no HTML entry under final/")
        return
    ok(f"{len(entries)} html file(s) under final/")
    for html in entries:
        text = html.read_text(encoding="utf-8", errors="replace")
        rel = html.relative_to(deck).as_posix()
        for rx, label in BAD_HTML:
            if rx.search(text):
                bad(problems, f"{rel}: {label}")
        for ref in re.findall(r"""(?:src|href)\s*=\s*["']([^"'#?]+)["']""", text):
            if ref.startswith(("http://", "https://", "data:", "mailto:")):
                continue
            if not (html.parent / ref).exists():
                bad(problems, f"{rel}: broken local asset {ref}")


def check_delivery(deck: Path, problems):
    check_contracts(deck, problems)
    check_render(deck, problems)

    delivery = deck / "DELIVERY.md"
    if not delivery.is_file():
        bad(problems, "missing DELIVERY.md")
    else:
        text = delivery.read_text(encoding="utf-8")
        for needle in ("主入口", "打开方式", "已知限制"):
            if needle not in text:
                bad(problems, f"DELIVERY.md lacks section: {needle}")
        ok("DELIVERY.md present with required sections")

    slots = deck / "plan" / "video_slots.json"
    if slots.is_file():
        try:
            data = json.loads(slots.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            data = {}
        for slot in data.get("slots") or []:
            sid = slot.get("id", "?")
            files = slot.get("deliverables") or {}
            found = [v for v in files.values() if (deck / v).is_file()]
            fallback = (slot.get("fallback") or "").strip()
            if not found and not fallback:
                bad(problems, f"video slot {sid}: no clip, no poster, no fallback")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--deck", default="deck")
    ap.add_argument("--stage", default="delivery",
                    choices=["contracts", "render", "delivery"])
    args = ap.parse_args()

    deck = Path(args.deck)
    if not deck.is_dir():
        print(f"error: {deck} is not a directory", file=sys.stderr)
        return 2

    print(f"deck   : {deck.resolve()}")
    print(f"stage  : {args.stage}")
    problems = []
    if args.stage == "contracts":
        check_contracts(deck, problems)
    elif args.stage == "render":
        check_render(deck, problems)
    else:
        check_delivery(deck, problems)

    if problems:
        print(f"\nGATE FAILED: {len(problems)} problem(s)")
        return 1
    print("\nGATE PASSED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
