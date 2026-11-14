# -*- coding: utf-8 -*-
"""Shared paths for the course-repack scripts.

Copy the whole scripts/ directory into <slug>/scripts/. ROOT is then <slug>.
Override with COURSE_ROOT when the scripts live somewhere else.
"""
from __future__ import annotations

import json
import os
import shutil
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(os.environ.get("COURSE_ROOT") or Path(__file__).resolve().parents[1])
TOOLS = Path(__file__).resolve().parent
SKILL = TOOLS.parent
SRC = ROOT / "src"
WORK = ROOT / "work"
OUT = ROOT / "out"
CONTENT = ROOT / "content" / "content.json"


def asset(rel: str) -> Path:
    """Project file first, then this skill's own templates/ (running inside the skill).

    A project copy is expected to hold scene/template.html and design/*.json. If
    they are missing, the fallback only works while the script still lives inside
    the skill directory -- copy templates/ into the project for a portable setup.
    """
    p = ROOT / rel
    if p.exists():
        return p
    return SKILL / "templates" / rel


def find_ffmpeg() -> str:
    exe = shutil.which("ffmpeg")
    if exe:
        return exe
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:  # noqa: BLE001
        return "ffmpeg"


def themed_template(template_path: Path, design_path: Path) -> str:
    """Inject design.json colors/fonts into the scene template's :root.

    Without this the video palette is a second copy of design.json and the two
    drift the moment someone edits one of them.
    """
    tpl = Path(template_path).read_text(encoding="utf-8")
    d = json.loads(Path(design_path).read_text(encoding="utf-8"))
    def css(v: str) -> str:
        v = str(v).strip()
        # design.json stores bare hex ("0E1A2B"); CSS needs "#0E1A2B".
        if len(v) in (6, 8) and all(ch in "0123456789abcdefABCDEF" for ch in v):
            return "#" + v
        return v

    decl = [f"--{k}:{css(v)}" for k, v in (d.get("colors") or {}).items()]
    f = d.get("fonts") or {}
    if f.get("cjkWeb"):
        decl.append(f"--cjk:{f['cjkWeb']}")
    if f.get("numWeb"):
        decl.append(f"--num:{f['numWeb']}")
    if decl:
        tpl = tpl.replace("</head>", "<style>:root{" + ";".join(decl) + "}</style></head>", 1)
    return tpl


FF_PATH = find_ffmpeg()

# Only when the scripts sit inside a real project. Importing from the skill
# directory must not litter it with empty src/work/out.
if ROOT != SKILL:
    for d in (SRC, WORK, OUT):
        try:
            d.mkdir(parents=True, exist_ok=True)
        except OSError:
            pass
