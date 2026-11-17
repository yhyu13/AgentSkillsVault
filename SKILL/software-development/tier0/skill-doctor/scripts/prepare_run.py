#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Normalize a folder of session dumps into a run inventory.

The model reads transcripts; this script only validates, samples and counts.
It never reads a skill body and never writes outside --out.

Input: --sessions DIR of *.jsonl files. One JSON object per line:

    {"session_id": "...", "started_at": "2026-11-01T09:00:00Z",
     "project": "/abs/path/to/repo",
     "messages": [{"role": "user|assistant|tool", "text": "..."}]}

Output: <out>/inventory.json and <out>/transcripts/<session_id>.txt

Exit codes:
  0  ok
  2  window is empty: there were sessions, none inside --days
  3  bad arguments, a missing input/skill directory, or every session rejected

Sampling is round-robin across projects so one busy project cannot fill the
sample. Inside a project sessions are newest first, or shuffled when --seed is
given; the rule used is recorded in inventory.json.
"""

from __future__ import annotations

import argparse
import json
import random
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

SAFE_ID = re.compile(r"^[A-Za-z0-9._:-]{1,120}$")
MAX_FILE_BYTES = 12 * 1024 * 1024
SCOPES = {"repo", "global", "other"}


class Parser(argparse.ArgumentParser):
    def error(self, message):
        self.print_usage(sys.stderr)
        print("argument error: %s" % message, file=sys.stderr)
        raise SystemExit(3)


def parse_args(argv):
    p = Parser(description="Build a skill-doctor run inventory (exit 0/2/3).")
    p.add_argument("--sessions", required=True, help="folder of normalized .jsonl dumps")
    p.add_argument("--out", required=True, help="report directory (created if missing)")
    p.add_argument("--skills", action="append", default=[], metavar="[SCOPE=]DIR",
                   help="skill folder; optional scope prefix repo|global|other (default global)")
    p.add_argument("--days", type=int, default=45, help="lookback window (default 45)")
    p.add_argument("--max-sessions", type=int, default=12, help="cap on sampled sessions (default 12)")
    p.add_argument("--seed", type=int, default=0, help="shuffle inside each project (0 = newest first)")
    p.add_argument("--now", default="", help="ISO timestamp to treat as now (for repeatable runs)")
    return p.parse_args(argv)


def load_sessions(folder: Path):
    rows, bad = [], []
    for path in sorted(folder.glob("*.jsonl")):
        if path.stat().st_size > MAX_FILE_BYTES:
            bad.append({"file": path.name, "reason": "larger than 12 MiB"})
            continue
        for lineno, line in enumerate(path.read_text(encoding="utf-8", errors="replace").splitlines(), 1):
            if not line.strip():
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError as exc:
                bad.append({"file": path.name, "line": lineno, "reason": "json: %s" % exc.msg})
                continue
            sid = str(row.get("session_id", ""))
            if not SAFE_ID.match(sid) or not isinstance(row.get("messages"), list) or not row["messages"]:
                bad.append({"file": path.name, "line": lineno, "reason": "missing session_id or messages"})
                continue
            rows.append(row)
    return rows, bad


def flatten(row) -> str:
    out = []
    for msg in row["messages"]:
        text = str(msg.get("text", "")).strip()
        if text:
            out.append("[%s] %s" % (msg.get("role", "?"), text))
    return "\n".join(out)


def parse_skill_arg(raw: str):
    if "=" in raw:
        scope, folder = raw.split("=", 1)
        if scope not in SCOPES:
            print("unknown skill scope %r; use repo|global|other" % scope, file=sys.stderr)
            raise SystemExit(3)
        return scope, Path(folder).expanduser()
    return "global", Path(raw).expanduser()


def find_skills(specs):
    found = []
    for scope, base in specs:
        for skill_md in sorted(base.rglob("SKILL.md")):
            text = skill_md.read_text(encoding="utf-8", errors="replace")
            name = skill_md.parent.name
            if text.startswith("---"):
                head = text.split("---", 2)[1]
                for line in head.splitlines():
                    if line.lower().startswith("name:"):
                        name = line.split(":", 1)[1].strip().strip("\"'") or name
            found.append({"name": name, "path": str(skill_md), "scope": scope})
    return found


def sample(recent, limit, seed):
    """Round-robin across projects so one burst cannot fill the sample."""
    by_project = {}
    for when, row in recent:
        by_project.setdefault(str(row.get("project", "")), []).append((when, row))
    rng = random.Random(seed) if seed else None
    for bucket in by_project.values():
        bucket.sort(key=lambda item: item[0], reverse=True)
        if rng:
            rng.shuffle(bucket)
    order = sorted(by_project, key=lambda key: by_project[key][0][0], reverse=True)
    picked, index = [], 0
    while len(picked) < limit and order:
        progressed = False
        for key in list(order):
            bucket = by_project[key]
            if index < len(bucket):
                picked.append(bucket[index])
                progressed = True
                if len(picked) >= limit:
                    break
        if not progressed:
            break
        index += 1
    return picked


def main(argv=None):
    args = parse_args(argv)
    src, out = Path(args.sessions).expanduser(), Path(args.out).expanduser()
    if not src.is_dir():
        print("sessions folder does not exist: %s" % src, file=sys.stderr)
        return 3
    if args.max_sessions < 1 or args.days < 1:
        print("--max-sessions and --days must be positive", file=sys.stderr)
        return 3

    # Validate every declared skill folder and scope before writing anything.
    specs = [parse_skill_arg(raw) for raw in args.skills]
    for scope, base in specs:
        if not base.is_dir():
            print("skill folder [%s] does not exist: %s" % (scope, base), file=sys.stderr)
            return 3

    if args.now:
        try:
            now = datetime.fromisoformat(args.now.replace("Z", "+00:00"))
        except ValueError:
            print("--now is not an ISO timestamp: %s" % args.now, file=sys.stderr)
            return 3
    else:
        now = datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    cutoff = now - timedelta(days=args.days)

    rows, bad = load_sessions(src)
    recent = []
    for row in rows:
        stamp = str(row.get("started_at", ""))
        if not stamp:
            bad.append({"session_id": row["session_id"], "reason": "missing started_at"})
            continue
        try:
            when = datetime.fromisoformat(stamp.replace("Z", "+00:00"))
        except ValueError:
            bad.append({"session_id": row["session_id"], "reason": "unparseable started_at"})
            continue
        if when.tzinfo is None:
            when = when.replace(tzinfo=timezone.utc)
        if when >= cutoff:
            recent.append((when, row))
    recent.sort(key=lambda item: item[0], reverse=True)

    picked = sample(recent, args.max_sessions, args.seed)

    out.mkdir(parents=True, exist_ok=True)
    tdir = out / "transcripts"
    tdir.mkdir(exist_ok=True)
    for _, row in picked:
        (tdir / ("%s.txt" % row["session_id"])).write_text(flatten(row), encoding="utf-8")

    skills = find_skills(specs)
    inventory = {
        "generated_at": now.isoformat().replace("+00:00", "Z"),
        "harness": "normalized-jsonl",
        "window_days": args.days,
        "retention": {"transcripts_written": True,
                      "delete_after_run": "remove <out>/transcripts once scoring and evidence are done",
                      "keep": ["inventory.json", "scores.json", "scorecard.json", "evidence.json", "proposed/"]},
        "sampling": {
            "rule": ("newest first inside each project" if not args.seed
                     else "shuffled inside each project with seed %d" % args.seed) +
                    ", round-robin across projects (pass/fail is not visible at sample time)",
            "seed": args.seed,
            "max_sessions": args.max_sessions,
        },
        "sessions_scanned": len(rows),
        "sessions_sampled": len(picked),
        "skills_found": len(skills),
        "skills": skills,
        "sample": [{"session_id": row["session_id"], "started_at": row.get("started_at"),
                    "project": row.get("project", "")} for _, row in picked],
        "rejected_total": len(bad),
        "rejected": bad[:50],
    }
    (out / "inventory.json").write_text(json.dumps(inventory, ensure_ascii=False, indent=2), encoding="utf-8")

    print("scanned=%d sampled=%d skills=%d rejected=%d"
          % (len(rows), len(picked), len(skills), len(bad)))
    if not picked:
        if not recent:
            if not rows and bad:
                print("no session could be read (%d rejected); fix the export, do not widen the window"
                      % len(bad), file=sys.stderr)
                return 3
            print("nothing in the last %d days; raise --days or choose another folder" % args.days,
                  file=sys.stderr)
            return 2
        print("every session in the window was rejected (%d); fix the export, do not widen the window"
              % len(bad), file=sys.stderr)
        return 3
    return 0


if __name__ == "__main__":
    sys.exit(main())
