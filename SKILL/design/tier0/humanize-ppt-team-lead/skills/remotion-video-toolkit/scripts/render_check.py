#!/usr/bin/env python3
"""Pre-flight check for a Remotion project before spending render time.

Verifies the things that actually break a deck's video slot: missing Remotion
dependency, no Root registration, unknown composition id, and missing media
referenced from staticFile().

Usage:
    python scripts/render_check.py --project ./my-video
    python scripts/render_check.py --project ./my-video --composition Slot1
"""
import argparse
import json
import re
import sys
from pathlib import Path

SRC_CANDIDATES = ["src/Root.tsx", "src/Root.ts", "src/index.tsx", "src/index.ts"]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", required=True)
    ap.add_argument("--composition", default="")
    args = ap.parse_args()

    root = Path(args.project)
    if not root.is_dir():
        print(f"error: {root} is not a directory", file=sys.stderr)
        return 2

    problems, notes = [], []

    pkg = root / "package.json"
    if not pkg.is_file():
        problems.append("no package.json — not a node project")
    else:
        data = json.loads(pkg.read_text(encoding="utf-8"))
        deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
        if not any(k == "remotion" or k.startswith("@remotion/") for k in deps):
            problems.append("remotion not in dependencies")
        else:
            notes.append("remotion dependency present")

    src = next((root / c for c in SRC_CANDIDATES if (root / c).is_file()), None)
    if src is None:
        problems.append(f"no entry file among {', '.join(SRC_CANDIDATES)}")
        ids = []
    else:
        text = src.read_text(encoding="utf-8", errors="replace")
        ids = re.findall(r"""<Composition[^>]*\bid\s*=\s*["']([^"']+)["']""", text)
        if not ids:
            problems.append(f"no <Composition id=...> registered in {src.relative_to(root)}")
        else:
            notes.append(f"compositions: {', '.join(ids)}")
        for asset in re.findall(r"""staticFile\(\s*["']([^"']+)["']""", text):
            if not (root / "public" / asset).exists():
                problems.append(f"staticFile missing: public/{asset}")

    if args.composition and ids and args.composition not in ids:
        problems.append(f"composition '{args.composition}' not registered (have: {', '.join(ids)})")

    print(f"project     : {root.resolve()}")
    for n in notes:
        print(f"  ok    {n}")
    if problems:
        for p in problems:
            print(f"  FAIL  {p}")
        print(f"\n{len(problems)} problem(s) — fix before rendering")
        return 1
    print("\nready: npx remotion render src/index.ts <id> out.mp4")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
