#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Curve modeled rubric labels into the report scorecard, deterministically.

The model judges each transcript against references/rubrics.md and writes labels.
This script validates the labels against the inventory, computes the weighted
score and flags the sessions that may be used as evidence. It does not read
transcripts and does not decide whether an edit is allowed.

Input (--scores): scores.json

    {"sessions": [
       {"session_id": "s1", "skills_used": ["skill-doctor"],
        "efficiency": {"label": "mostly_efficient", "reason": "..."},
        "code_quality": {"label": "insufficient_evidence", "reason": "..."},
        "procedure_compliance": {"label": "mostly_efficient", "reason": "..."},
        "verbosity": {"label": "mostly_efficient", "reason": "..."}}
     ]}

--inventory is required: every session_id must appear in inventory.json, so a
score cannot be invented after the fact. `skills_used` is required per session
(an empty list is valid) and drives `skill_coverage`.

Exit codes: 0 ok, 3 bad arguments, 5 malformed scores or unknown session.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

DIMS = ("efficiency", "code_quality", "procedure_compliance", "verbosity")
WEIGHTS = {"efficiency": 0.25, "code_quality": 0.25, "procedure_compliance": 0.20,
           "verbosity": 0.15, "skill_coverage": 0.15}
FOUR_LABELS = {"highly_efficient": 1.0, "mostly_efficient": 0.8,
               "mostly_inefficient": 0.4, "highly_inefficient": 0.2}
ALLOWED = {dim: dict(FOUR_LABELS) for dim in DIMS}
ALLOWED["code_quality"]["insufficient_evidence"] = None
GRADES = [(0.90, "A"), (0.80, "B"), (0.70, "C"), (0.60, "D"), (0.00, "F")]


class Parser(argparse.ArgumentParser):
    def error(self, message):
        self.print_usage(sys.stderr)
        print("argument error: %s" % message, file=sys.stderr)
        raise SystemExit(3)


def parse_args(argv):
    p = Parser(description="Score a skill-doctor run (exit 0/3/5).")
    p.add_argument("--scores", required=True)
    p.add_argument("--inventory", required=True, help="inventory.json from prepare_run.py")
    p.add_argument("--out", default="", help="write scorecard.json and scorecard.md here")
    p.add_argument("--allow-partial", action="store_true",
                   help="accept a scores.json that covers fewer sessions than the inventory sampled")
    return p.parse_args(argv)


def curve(value: float) -> float:
    return 0.5 + 0.5 * value


def grade_of(overall: float) -> str:
    for floor, letter in GRADES:
        if overall >= floor:
            return letter
    return "F"


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def main(argv=None):
    args = parse_args(argv)
    try:
        data = load_json(Path(args.scores).expanduser())
        inventory = load_json(Path(args.inventory).expanduser())
    except (OSError, json.JSONDecodeError) as exc:
        print("cannot read input: %s" % exc, file=sys.stderr)
        return 5

    sessions = data.get("sessions") or []
    sample = inventory.get("sample") or []
    known = {row["session_id"] for row in sample}
    if not sessions:
        print("scores.json has no sessions", file=sys.stderr)
        return 5
    scored_ids = [str(row.get("session_id", "")) for row in sessions]
    if len(set(scored_ids)) != len(scored_ids):
        print("INVALID scores.json repeats a session_id; score each sampled session once", file=sys.stderr)
        return 5
    if known and not args.allow_partial and set(scored_ids) != known:
        print("INVALID scores cover %d of %d sampled sessions; score them all or pass --allow-partial"
              % (len(set(scored_ids) & known), len(known)), file=sys.stderr)
        return 5

    errors, raw = [], {dim: [] for dim in DIMS}
    failed, failed_dims, skills_used_total = [], {}, 0
    for row in sessions:
        sid = str(row.get("session_id", "?"))
        if sid not in known:
            errors.append("%s: session id is not in inventory.json" % sid)
            continue
        if not isinstance(row.get("skills_used"), list):
            errors.append("%s: missing skills_used (use [] when none)" % sid)
            continue
        if row["skills_used"]:
            skills_used_total += 1
        bad, bad_dims = False, []
        for dim in DIMS:
            cell = row.get(dim) or {}
            label = cell.get("label")
            if label not in ALLOWED[dim]:
                errors.append("%s/%s: label %r not allowed here" % (sid, dim, label))
                bad = True
                continue
            if not str(cell.get("reason", "")).strip():
                errors.append("%s/%s: label without a reason" % (sid, dim))
                bad = True
                continue
            score = ALLOWED[dim][label]
            if score is not None:
                raw[dim].append(score)
                if score < 0.5:
                    bad = True
                    bad_dims.append(dim)
        if bad:
            failed.append(sid)
            failed_dims[sid] = bad_dims
    if errors:
        for line in errors:
            print("INVALID " + line, file=sys.stderr)
        return 5

    # code_quality may legitimately have no evidence; every other dimension must.
    missing = [dim for dim in DIMS if not raw[dim] and dim != "code_quality"]
    if missing:
        print("INVALID no numeric score for: %s" % ", ".join(missing), file=sys.stderr)
        return 5

    means = {dim: (sum(values) / len(values) if values else None) for dim, values in raw.items()}
    notes = []
    if not raw["code_quality"]:
        means["code_quality"] = 0.5
        notes.append("code_quality had no evidence; set to 0.5 and say so in the findings")

    sampled = len(known) or len(sessions)
    skills_found = int(inventory.get("skills_found") or 0)
    coverage = 0.0 if not sampled or not skills_found else min(1.0, skills_used_total / sampled)

    curved = {dim: curve(means[dim]) for dim in DIMS}
    overall = (WEIGHTS["efficiency"] * curved["efficiency"]
               + WEIGHTS["code_quality"] * curved["code_quality"]
               + WEIGHTS["procedure_compliance"] * curved["procedure_compliance"]
               + WEIGHTS["verbosity"] * curved["verbosity"]
               + WEIGHTS["skill_coverage"] * coverage)

    if not failed and len(sessions) >= 5:
        notes.append("no session failed any rubric; before trusting this, re-read two transcripts and check the labels")

    card = {
        "scores": dict({key: round(value, 4) for key, value in curved.items()},
                       skill_coverage=round(coverage, 4), overall=round(overall, 4)),
        "grade": grade_of(overall),
        "raw_means": {key: round(value, 4) for key, value in means.items()},
        "stats": {"sessions_scored": len(sessions), "sessions_sampled": sampled,
                  "skills_found": skills_found, "sessions_with_skill": skills_used_total},
        "failed_conversations": sorted(set(failed)),
        "failed_dimensions": {sid: failed_dims.get(sid, []) for sid in sorted(set(failed))},
        "notes": notes,
    }

    print(json.dumps(card, ensure_ascii=False, indent=2))
    if args.out:
        out = Path(args.out).expanduser()
        out.mkdir(parents=True, exist_ok=True)
        (out / "scorecard.json").write_text(json.dumps(card, ensure_ascii=False, indent=2), encoding="utf-8")
        rows = ["| dimension | raw mean | curved | weight |", "|---|---:|---:|---:|"]
        for dim in DIMS:
            rows.append("| %s | %.3f | %.3f | %.2f |" % (dim, means[dim], curved[dim], WEIGHTS[dim]))
        rows.append("| skill_coverage | - | %.3f | %.2f |" % (coverage, WEIGHTS["skill_coverage"]))
        rows.append("| **overall** | - | **%.3f** | 1.00 |" % overall)
        body = ["# Skill Doctor scorecard", "",
                "Grade: **%s** (%.3f)" % (card["grade"], overall), "",
                "\n".join(rows), "",
                "Failed conversations: %s" % (", ".join(card["failed_conversations"]) or "none"), ""]
        body += ["- " + note for note in notes]
        (out / "scorecard.md").write_text("\n".join(body), encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
