#!/usr/bin/env python3
"""Import the quality ledger that lives OUTSIDE the vault.

`score_skills.py` measures structure: frontmatter, body length, payload dirs,
links, placeholders.  The number it prints is a capacity score, and the audit
docs say so every time — but nothing else in this repo records whether a skill
is any *good*, so a 10.00 reads as "good".

`C:/Git-repo-my/个人成长/agent-skill-vote` already does the other half:

  * a 7-dimension read-only rubric — Contract, Executability, Resistance,
    Recoverability, Boundaries, Honesty, Cost of misuse — where HIGH needs a
    weighted score >= 8 **and** no single dimension below 7;
  * a rule that a document-only review cannot promote a skill to the ledger's
    "9 and above, install and follow as written" line;
  * per-skill records with reviewer, date and the one defect that kept it down.

This script copies those verdicts into a machine-readable ledger so the vault
can show capacity and quality side by side instead of pretending capacity is
quality.  It reads two sources:

  votes.json                              (the 9 fully scored skills)
  <date>-tier0-independent-review.md      (27 skills, weighted + verdict + defect)

Usage
  python import_quality_ledger.py --vote-dir <dir> --out quality-ledger.json
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

RUBRIC = {
    "dimensions": ["contract", "executability", "resistance", "recoverability",
                   "boundaries", "honesty", "cost_of_misuse"],
    "high_threshold": 8.0,
    "dimension_floor": 7.0,
    "rule": "HIGH = weighted >= 8 and no single dimension below 7; a "
            "document-only review never promotes a skill to the "
            "9-and-above execution line",
}

# votes.json keeps the score a skill got at vote time.  For these two that score
# is the PRE-FIX review, and the ledger README records the re-review after the
# fixes landed (8.0 HIGH, same reviewer).  Importing 5.0 / 7.0 as the current
# number would publish something the source itself has already superseded, so
# the newer record wins and the old one is kept under `history`.
SUPERSEDED = {
    "fable52-reproduction": {
        "quality": 8.0, "verdict": "HIGH", "date": "2026-11-14",
        "note": "修复复核 8.0 HIGH（同一评审者），覆盖可安装 / 可执行 / 证据 / 边界；"
                "votes.json 里的 5.0 是修复前的文档评审",
        "origin": "agent-skill-vote/README.md#fable52-reproduction",
    },
    "quality-first-delivery": {
        "quality": 8.0, "verdict": "HIGH", "date": "2026-11-14",
        "note": "2026.11.14.5 的 Q2 复核 8.0 HIGH；votes.json 里的 7.0 是初版",
        "origin": "agent-skill-vote/README.md#quality-first-delivery",
    },
}


def _who(value) -> str:
    """reviewer is a string in some records and a dict in others."""
    if isinstance(value, dict):
        return str(value.get("channel") or value.get("role") or value.get("worker_id")
                   or value)
    return str(value or "")


TABLE_ROW = re.compile(r"^\|\s*([^|]+?)\s*\|\s*([0-9.]+)\s*\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|")


def from_votes(path: Path) -> list:
    if not path.is_file():
        return []
    blob = json.loads(path.read_text(encoding="utf-8"))
    out = []
    for vote in blob.get("votes", []):
        review = vote.get("independent_review") or {}
        if isinstance(review, list):          # several rounds on one skill
            review = review[-1] if review else {}
        if not isinstance(review, dict):
            review = {}
        score = vote.get("score")
        if score is None:
            continue
        out.append({
            "skill": vote.get("name") or vote.get("id"),
            "quality": float(score),
            "verdict": (vote.get("verdict") or "").strip(),
            "reviewer": _who(review.get("reviewer") or vote.get("reviewer")),
            "date": review.get("date") or vote.get("voted") or "",
            "note": (vote.get("why") or "")[:400],
            "origin": "votes.json#%s" % (vote.get("id") or vote.get("name")),
        })
    return out


def from_tier0_review(path: Path) -> list:
    if not path.is_file():
        return []
    out = []
    for line in path.read_text(encoding="utf-8").splitlines():
        m = TABLE_ROW.match(line.strip())
        if not m:
            continue
        skill, weighted, verdict, defect = m.groups()
        if skill.lower() in ("skill", "name") or not re.match(r"^[a-z0-9][\w.-]*$", skill):
            continue
        try:
            score = float(weighted)
        except ValueError:
            continue
        out.append({
            "skill": skill,
            "quality": score,
            "verdict": verdict.strip(),
            "reviewer": "2026-11-15 只读评审",
            "date": "2026-11-15",
            "note": defect.strip(),
            "origin": "%s#%s" % (path.name, skill),
        })
    return out


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--vote-dir", default=r"C:/Git-repo-my/个人成长/agent-skill-vote")
    ap.add_argument("--review-file", default="2026-11-15-tier0-independent-review.md")
    ap.add_argument("--out", required=True)
    args = ap.parse_args(argv)

    vote_dir = Path(args.vote_dir)
    entries = from_votes(vote_dir / "votes.json")
    entries += from_tier0_review(vote_dir / args.review_file)

    # A skill reviewed twice keeps the higher-evidence record: the later date
    # wins, and on the same date the fuller note wins.
    best = {}
    for e in entries:
        key = e["skill"]
        if key not in best or (e["date"], len(e["note"])) > (best[key]["date"],
                                                             len(best[key]["note"])):
            best[key] = e

    for skill, newer in SUPERSEDED.items():
        old_row = best.get(skill)
        if not old_row or old_row["quality"] == newer["quality"]:
            continue
        best[skill] = dict(newer, skill=skill, history=[
            {k: old_row[k] for k in ("quality", "verdict", "date", "origin")}])

    rows = sorted(best.values(), key=lambda r: (-r["quality"], r["skill"]))
    payload = {
        "source": str(vote_dir),
        "rubric": RUBRIC,
        "entries": rows,
        "counts": {
            "skills": len(rows),
            "at_or_above_9": sum(1 for r in rows if r["quality"] >= 9),
            "high": sum(1 for r in rows if "HIGH" in r["verdict"].upper()),
        },
    }
    Path(args.out).write_text(json.dumps(payload, indent=2, ensure_ascii=False),
                              encoding="utf-8")
    print("quality ledger: %d skills (%d >= 9, %d HIGH) -> %s"
          % (len(rows), payload["counts"]["at_or_above_9"],
             payload["counts"]["high"], args.out))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
