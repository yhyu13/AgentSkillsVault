#!/usr/bin/env python3
"""Per-skill selection score for the install-scope decision.

Why this exists
---------------
`docs/skill-capacity-audit/score_skills.py` measures the *shape* of a package:
frontmatter, body length, whether `references/` and `scripts/` exist, link
integrity. Its own rubric (`quality-rubric.md`) says so. Two consequences make
it unfit as the only input to "should this skill be installed":

  * 3 of the 10 points are structurally unreachable for a docs-only skill —
    C_payload needs payload dirs (2.0) and E_hygiene needs >=1 real script (0.5).
    Ceiling = A 3.0 + B 2.0 + C 0 + D 2.0 + E 0.5 = **7.5**, i.e. tier2 at best.
    On 2026-11-20 that capped 99 of 312 curated skills; 242 have no script at all.
  * The install gate then kept "the top N bands per category" using that
    absolute number, so a category full of methodology docs (management) had
    its whole top band dropped the moment one higher-band skill arrived, while
    a category full of tool skills (game-dev) kept 4 of 37. Retention ranged
    11%..94% across categories — that is the band rule talking, not quality.

This script produces the number the gate now ranks on:

    select = capacity
             + 1.0   if a behavioural trigger test PASSed   (direct evidence)
             - 1.0   if it ABSTAINed                        (real defect)
             + clamp(quality - 8.0, -1, +1)                  if a quality review exists

Capacity stays the base because it is the only signal that covers all 312
skills; behavioural/quality adjust it where evidence exists. Neither is
invented here: `--behavioral` reads the trigger run, `--quality` reads the
quality ledger.

Usage
-----
    python scripts/install_scores.py                       # human table
    python scripts/install_scores.py --json                # one JSON object per line
    python scripts/install_scores.py --out scores.csv

`build-manifest.ps1` calls this with --json and ranks each category on `select`.
Exit code 0 always unless the vault cannot be scanned; a missing evidence file
is a warning, never a silent zero.
"""
from __future__ import annotations

import argparse
import csv
import json
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
VAULT = HERE.parent
SCORER = VAULT / "docs" / "skill-capacity-audit" / "score_skills.py"
BEHAVIORAL = VAULT / "docs" / "skill-capacity-audit" / "2026-11-18-trigger-merged.json"
QUALITY = VAULT / "docs" / "skill-capacity-audit" / "2026-11-18-quality-ledger.json"

PASS_BONUS = 1.0
ABSTAIN_PENALTY = -1.0
# A WRONG verdict means it fired on a prompt it should not have — as damaging as
# never firing at all, so it takes the same penalty. TIMEOUT is neutral: no
# evidence either way, and the run itself is what failed.
WRONG_PENALTY = -1.0
QUALITY_PIVOT = 8.0
QUALITY_CLAMP = 1.0


def run_capacity_scorer(root: Path) -> list[dict]:
    """Run the capacity scorer and return its rows."""
    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / "scores"
        proc = subprocess.run(
            [sys.executable, str(SCORER), "--root", str(root), "--recursive",
             "--out", str(out), "--date", "install-scores"],
            capture_output=True, text=True, encoding="utf-8", errors="replace",
        )
        if proc.returncode != 0:
            sys.stderr.write(proc.stdout + proc.stderr)
            raise SystemExit(f"score_skills.py failed (exit {proc.returncode})")
        csvs = sorted(out.glob("*-capacity-scores.csv"))
        if not csvs:
            raise SystemExit("score_skills.py wrote no scores csv")
        with csvs[-1].open(encoding="utf-8-sig") as fh:
            return list(csv.DictReader(fh))


def load_evidence(path: Path, key_set: set[str], what: str) -> dict[str, dict]:
    if not path.is_file():
        print(f"warning: {what} evidence not found at {path} — ranking on capacity only",
              file=sys.stderr)
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data.get("entries") or data.get("results") or data
    if isinstance(entries, dict):
        entries = [{"skill": k, **v} for k, v in entries.items()]
    table = {}
    for e in entries:
        name = e.get("skill") or e.get("name")
        if name:
            table[name] = e
    matched = sum(1 for n in table if n in key_set)
    print(f"note: {what} evidence covers {matched} of {len(key_set)} skills", file=sys.stderr)
    return table


def _parts(rel_path: str) -> list[str]:
    return [p for p in rel_path.replace("\\", "/").split("/") if p]


def is_nested_payload(rel_path: str) -> bool:
    """`SKILL/<cat>/tier<N>/<leaf>/skills/<sub>` is payload of a lead skill.

    Same rule build-manifest.ps1 and check_manifest.py apply, so the ranking
    set is exactly the installable set.
    """
    parts = _parts(rel_path)
    for i, p in enumerate(parts):
        if p == "skills" and i >= 2 and parts[i - 2].startswith("tier") \
                and parts[i - 2][4:].isdigit():
            return True
    return False


def band_of(rel_path: str) -> str:
    for p in _parts(rel_path):
        if p.startswith("tier") and p[4:].isdigit():
            return p
    return ""


def category_of(rel_path: str) -> str:
    parts = _parts(rel_path)
    # `SKILL/<category>/tier<N>/<leaf>` — take the segment right before tierN so
    # an absolute path (store or vault root) does not leak into the category.
    for i, p in enumerate(parts):
        if p.startswith("tier") and p[4:].isdigit() and i > 0:
            return parts[i - 1]
    if "SKILL" in parts and len(parts) > parts.index("SKILL") + 1:
        return parts[parts.index("SKILL") + 1]
    return ""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=str(VAULT / "SKILL"),
                    help="tree to score (default: SKILL/)")
    ap.add_argument("--behavioral", default=str(BEHAVIORAL))
    ap.add_argument("--quality", default=str(QUALITY))
    ap.add_argument("--json", action="store_true", help="emit JSON lines")
    ap.add_argument("--out", default="", help="write csv here instead of stdout")
    args = ap.parse_args()

    root = Path(args.root)
    if not root.is_dir():
        raise SystemExit(f"error: {root} is not a directory")

    rows = run_capacity_scorer(root)
    names = {r["skill"] for r in rows}
    behavioral = load_evidence(Path(args.behavioral), names, "behavioural")
    quality = load_evidence(Path(args.quality), names, "quality")

    out_rows = []
    for r in rows:
        name = r["skill"]
        rel = Path(r["path"]).as_posix()
        if is_nested_payload(r["path"]):
            continue
        capacity = float(r["score"] or 0)
        beh = behavioral.get(name, {})
        verdict = (beh.get("verdict") or "").upper()
        qrow = quality.get(name, {})
        qval = qrow.get("quality")
        try:
            qval = float(qval) if qval is not None else None
        except (TypeError, ValueError):
            qval = None

        select = capacity
        if verdict == "PASS":
            select += PASS_BONUS
        elif verdict in ("ABSTAIN", "WRONG"):
            select += (ABSTAIN_PENALTY if verdict == "ABSTAIN" else WRONG_PENALTY)
        if qval is not None:
            select += max(-QUALITY_CLAMP, min(QUALITY_CLAMP, qval - QUALITY_PIVOT))

        out_rows.append({
            "skill": name,
            "category": category_of(rel),
            "band": band_of(rel),
            "path": rel,
            "capacity": round(capacity, 2),
            "behavioral": verdict,
            "quality": "" if qval is None else round(qval, 2),
            "select": round(select, 2),
        })

    out_rows.sort(key=lambda r: (r["category"], -r["select"], r["skill"]))

    if args.out:
        with open(args.out, "w", encoding="utf-8", newline="") as fh:
            w = csv.DictWriter(fh, fieldnames=list(out_rows[0].keys()))
            w.writeheader()
            w.writerows(out_rows)
        print(f"scores written: {len(out_rows)} rows -> {args.out}", file=sys.stderr)
        return 0

    if args.json:
        for r in out_rows:
            print(json.dumps(r, ensure_ascii=False))
        return 0

    print(f"{'category':<22}{'skill':<34}{'band':>6}{'cap':>7}{'beh':>9}{'q':>6}{'select':>8}")
    for r in out_rows:
        print(f"{r['category']:<22}{r['skill']:<34}{r['band']:>6}{r['capacity']:>7}"
              f"{r['behavioral'] or '-':>9}{r['quality'] or '-':>6}{r['select']:>8}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
