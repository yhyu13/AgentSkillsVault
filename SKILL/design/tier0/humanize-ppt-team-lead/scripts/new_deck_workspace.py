#!/usr/bin/env python3
"""Scaffold a deck workspace from the contract templates in ../templates/.

Creates the directory layout described in SKILL.md section 3 and seeds the
contract files so the outline stage starts from a schema instead of guessing.

Usage:
    python scripts/new_deck_workspace.py --out deck --title "分享主题"
"""
import argparse
import json
import shutil
from pathlib import Path

HERE = Path(__file__).resolve().parent
TEMPLATES = HERE.parent / "templates"

DIRS = ["brief", "plan", "final/guizang", "final/frontend-slides",
        "presenter", "videos", "assets"]

MD_TEMPLATES = {
    "brief/deck_brief.md": "deck_brief.md",
    "brief/ast_outline.md": "ast_outline.md",
    "brief/speaker_intent.md": "speaker_intent.md",
    "brief/asset_manifest.md": "asset_manifest.md",
    "DELIVERY.md": "delivery_manifest.md",
}
JSON_TEMPLATES = {
    "plan/slide_plan.json": "slide_plan.json",
    "plan/video_slots.json": "video_slots.json",
}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="deck", help="workspace dir")
    ap.add_argument("--title", default="Untitled deck")
    ap.add_argument("--force", action="store_true",
                    help="overwrite existing contract files")
    args = ap.parse_args()

    root = Path(args.out)
    for d in DIRS:
        (root / d).mkdir(parents=True, exist_ok=True)

    created, skipped = [], []
    for rel, tpl in MD_TEMPLATES.items():
        dest = root / rel
        src = TEMPLATES / tpl
        if dest.exists() and not args.force:
            skipped.append(rel)
            continue
        text = src.read_text(encoding="utf-8").replace("<标题>", args.title)
        dest.write_text(text, encoding="utf-8")
        created.append(rel)

    for rel, tpl in JSON_TEMPLATES.items():
        dest = root / rel
        src = TEMPLATES / tpl
        if dest.exists() and not args.force:
            skipped.append(rel)
            continue
        data = json.loads(src.read_text(encoding="utf-8"))
        if dest.name == "slide_plan.json":
            data["meta"]["title"] = args.title
        dest.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n",
                        encoding="utf-8")
        created.append(rel)

    (root / "brief" / "run-log.md").touch()
    (root / "brief" / "source.md").touch()

    print(f"workspace: {root.resolve()}")
    print(f"created  : {len(created)}")
    for c in created:
        print(f"  + {c}")
    if skipped:
        print(f"kept     : {len(skipped)} (use --force to overwrite)")
    print("\nnext: fill brief/deck_brief.md, then run validate_pack.py --stage contracts")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
