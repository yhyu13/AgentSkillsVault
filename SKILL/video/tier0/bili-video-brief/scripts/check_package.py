# -*- coding: utf-8 -*-
"""Self-check for this skill package.

    python scripts/check_package.py <skill-dir>

Checks that every path the docs promise exists, that every script parses,
that the frontmatter is usable, and that the example files are real JSON.
A skill that documents a script it does not ship is worse than one that
documents nothing.

Exit 0 = pass, 1 = defects, 2 = not a skill directory.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

REQUIRED = [
    "SKILL.md",
    "references/summary-contract.md",
    "references/transcript-zh.md",
    "references/deck.md",
    "references/showreel-handoff.md",
    "references/measured-run.md",
    "references/pitfalls.md",
    "examples/summary.md",
    "examples/demo/summary.md",
    "examples/demo/transcript.txt",
    "assets/corrections.example.json",
    "assets/narration.example.json",
    "assets/timeline.example.json",
    "scripts/fetch_bili.py",
    "scripts/transcribe_zh.py",
    "scripts/merge_transcript.py",
    "scripts/apply_corrections.py",
    "scripts/refine_segment.py",
    "scripts/check_transcript.py",
    "scripts/check_summary.py",
    "scripts/check_deck.py",
    "scripts/render_pptx.py",
    "scripts/tts_edge.py",
    "scripts/build_audio.py",
    "scripts/check_timeline.py",
    "scripts/shot.mjs",
    "scripts/render_video.mjs",
]

PATH_RX = re.compile(r"`((?:references|scripts|assets|examples)/[A-Za-z0-9_.\-\u4e00-\u9fff/]+)`")
FRONT_RX = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.S)


def main():
    if len(sys.argv) < 2:
        print("usage: check_package.py <skill-dir>")
        return 2
    root = Path(sys.argv[1])
    if not (root / "SKILL.md").is_file():
        print("no SKILL.md in %s" % root)
        return 2
    errors = []

    for rel in REQUIRED:
        if not (root / rel).is_file():
            errors.append("missing %s" % rel)

    text = (root / "SKILL.md").read_text(encoding="utf-8")
    m = FRONT_RX.match(text)
    if not m:
        errors.append("SKILL.md has no YAML frontmatter")
    else:
        head = m.group(1)
        for key in ("name:", "description:", "version:"):
            if key not in head:
                errors.append("frontmatter missing %s" % key)
        if "name: bili-video-brief" not in head:
            errors.append("frontmatter name does not match the leaf directory")

    for ref in sorted(set(PATH_RX.findall(text))):
        if not (root / ref).exists():
            errors.append("SKILL.md points at %s which does not exist" % ref)

    for py in sorted((root / "scripts").glob("*.py")):
        try:
            compile(py.read_text(encoding="utf-8").lstrip("﻿"), str(py), "exec")
        except SyntaxError as exc:
            errors.append("%s does not compile: %s" % (py.name, exc.lineno))
    for js in sorted((root / "scripts").glob("*.mjs")):
        r = subprocess.run(["node", "--check", str(js)], capture_output=True, text=True)
        if r.returncode != 0:
            errors.append("%s fails node --check: %s" % (js.name, r.stderr.strip()[:120]))

    for js in sorted((root / "assets").glob("*.json")) + sorted((root / "scripts").glob("*.json")):
        try:
            json.loads(js.read_text(encoding="utf-8"))
        except Exception as exc:
            errors.append("%s is not valid JSON: %s" % (js.name, exc))

    for marker in ("TODO", "FIXME", "待补充", "占位"):
        if marker in text:
            errors.append("SKILL.md still contains %s" % marker)

    if errors:
        print("\n".join(errors))
        return 1
    print("OK files=%d scripts=%d" % (
        sum(1 for p in root.rglob("*") if p.is_file()),
        len(list((root / "scripts").glob("*")))))
    return 0


if __name__ == "__main__":
    sys.exit(main())
