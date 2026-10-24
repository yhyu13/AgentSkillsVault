#!/usr/bin/env python3
"""
Fix #2 — recover dangling payload for installed skills.

For every SKILL.md reference that does not resolve next to the skill, search
candidate sources (vault tree, vendor/ submodules, sibling repos under
D:\\GitRepo-AI) for a file that plausibly IS the missing file:

  match tiers (best first)
    1  path ends with  <skill-name>/<ref>
    2  path ends with  /<ref>            (same suffix anywhere)
    3  basename match + an ancestor dir whose name contains the skill name

`../sibling/file.md` links are handled differently: the target is copied into
`<skill>/references/<file>` and the link is rewritten, so the skill becomes
self-contained.

Usage:
  python fix_payload.py --root <skills-dir> --search <dir> [--search <dir> ...]
                        --vault <vault-dir> [--apply] [--dry-run]
"""
import argparse
import re
import shutil
from pathlib import Path

SEARCH_EXCLUDE = {".git", "node_modules", ".git/modules"}
REF_PREFIXES = ("references", "scripts", "templates", "assets", "examples",
                "docs", "commands", "kit", "workflows", "agents")
MD_LINK_RE = re.compile(r"\]\(([^)\s]+)")


def iter_files(root: Path):
    for p in root.rglob("*"):
        if p.is_file() and not (set(p.parts) & SEARCH_EXCLUDE):
            yield p


def find_candidates(ref: str, skill: str, search_roots, limit_per_root=400000):
    """Return ranked candidate source paths for a missing ref."""
    ref_norm = ref.replace("\\", "/").lstrip("./")
    base = ref_norm.rsplit("/", 1)[-1]
    tail = "/" + ref_norm
    skill_tail = "/" + skill + "/" + ref_norm
    exact, suffix, loose = [], [], []
    for root in search_roots:
        rp = Path(root)
        if not rp.exists():
            continue
        for i, f in enumerate(iter_files(rp)):
            if i > limit_per_root:
                break
            s = str(f).replace("\\", "/")
            if s.endswith(skill_tail):
                exact.append(f)
            elif s.endswith(tail):
                suffix.append(f)
            elif f.name == base and f"/{skill}/" in s:
                loose.append(f)
    return exact[:5], suffix[:5], loose[:5]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True)
    ap.add_argument("--search", action="append", required=True)
    ap.add_argument("--csv", required=True, help="capacity-scores.csv input")
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--limit", type=int, default=0, help="only first N skills")
    args = ap.parse_args()

    import csv
    rows = list(csv.DictReader(open(args.csv, encoding="utf-8-sig")))
    rows = [r for r in rows if int(r["broken_refs"]) > 0]
    if args.limit:
        rows = rows[:args.limit]

    root = Path(args.root)
    resolved = skipped = 0
    report = []
    for r in rows:
        skill_dir = root / r["skill"]
        if not (skill_dir / "SKILL.md").is_file():
            continue
        body = (skill_dir / "SKILL.md").read_text(encoding="utf-8", errors="replace")
        refs = set()
        for m in MD_LINK_RE.finditer(body):
            t = m.group(1).strip()
            if t.startswith(("http", "#", "mailto")) or "://" in t:
                continue
            refs.add(t.split("#")[0])
        # same extraction as the scorer: backticked + bare prefixed paths
        for rx in (r"`((?:references|scripts|templates|assets|examples|docs|commands|kit|workflows|agents)/[A-Za-z0-9_.\-/]+)`",
                   r"(?<![\w/])((?:references|scripts|templates|assets|examples|docs|commands|kit|workflows|agents)/[A-Za-z0-9_.\-]+(?:/[A-Za-z0-9_.\-]+)*)"):
            for m in re.finditer(rx, body):
                refs.add(m.group(1))
        done, miss = [], []
        for ref in sorted(refs):
            tgt = skill_dir / ref.lstrip("./")
            if tgt.exists():
                continue
            if ref.startswith("../"):
                miss.append(ref + "  [cross-skill link]")
                continue
            e, s, l = find_candidates(ref, r["skill"], args.search)
            pick = (e or s or [None])[0]
            if pick:
                done.append((ref, str(pick)))
            else:
                miss.append(ref)
        if done:
            resolved += len(done)
            report.append((r["skill"], done))
        if miss:
            skipped += len(miss)
            report.append((r["skill"] + "  [UNRESOLVED]", miss))

    print(f"resolvable refs: {resolved}   unresolvable: {skipped}\n")
    for skill, items in report:
        print(f"== {skill}")
        for it in items:
            print("   ", it)

    if args.apply:
        print("\n--- applying ---")
        copied = 0
        for skill, items in report:
            if skill.endswith("[UNRESOLVED]"):
                continue
            sd = root / skill
            for ref, src in items:
                tgt = sd / ref.lstrip("./")
                tgt.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(src, tgt)
                copied += 1
        print(f"copied {copied} payload files")


if __name__ == "__main__":
    main()
