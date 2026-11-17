#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gate a proposed SKILL.md change before it becomes a pull request.

The gate is mechanical on purpose: it can prove that an edit is small, that the
evidence names a failing session and dimension, that the quote really occurs in
that transcript, that no transcript text was pasted in, that the file carries no
secrets or leftover markers, and that every relative link resolves against the
skill's real directory. It cannot prove the
edit is a good idea - that is the human reviewer's job, and the output says so.

Usage:
  python3 scripts/check_skill_edit.py --current repo/skill/SKILL.md \
      --proposed run/proposed/skill/SKILL.md --scorecard run/scorecard.json \
      --evidence run/evidence.json [--name skill-doctor] [--base-dir repo/skill]

Exit codes: 0 pass, 1 gate failed, 3 bad arguments, 5 unreadable input.
"""

from __future__ import annotations

import argparse
import difflib
import json
import re
import sys
from pathlib import Path

MAX_QUOTE = 400
MIN_QUOTE = 6
MIN_COPY = 6
COPY_WINDOW = 8      # 8 CJK chars, or
COPY_WIDE = 24        # 24 chars when the run is mostly ASCII
SECRET_PATTERNS = [
    (re.compile(r"\bsk-[A-Za-z0-9]{20,}\b"), "OpenAI-style key"),
    (re.compile(r"\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b"), "GitHub token"),
    (re.compile(r"\bAKIA[0-9A-Z]{16}\b"), "AWS access key"),
    (re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{10,}\b"), "Slack token"),
    (re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"), "private key block"),
]
PLACEHOLDERS = re.compile(r"\b(TODO|TBD|FIXME|XXX)\b|占位符?\s*[:：]|待补充?\s*[:：]|<\s*fill", re.IGNORECASE)
LINK = re.compile(r"\[[^\]]*\]\(([^)]+)\)")
BACKTICK_PATH = re.compile(r"`((?:references|scripts|templates|assets|examples)/[^`\s]+)`")
SCORERS = {"efficiency", "code_quality", "procedure_compliance", "verbosity"}


class Parser(argparse.ArgumentParser):
    def error(self, message):
        self.print_usage(sys.stderr)
        print("argument error: %s" % message, file=sys.stderr)
        raise SystemExit(3)


def parse_args(argv):
    p = Parser(description="Mechanical gate for a proposed skill edit (exit 0/1/3/5).")
    p.add_argument("--proposed", required=True, help="path to the proposed SKILL.md")
    p.add_argument("--current", default="", help="path to the shipped SKILL.md")
    p.add_argument("--new-skill", action="store_true", help="declare that this file has no shipped version yet")
    p.add_argument("--evidence", required=True, help="evidence.json built from failing sessions")
    p.add_argument("--scorecard", required=True, help="scorecard.json from rubric_score.py")
    p.add_argument("--base-dir", default="", help="folder the proposed file's relative links resolve into")
    p.add_argument("--transcripts", default="", help="folder of transcripts; verifies quotes and blocks copied 8-CJK / 24-ASCII char runs")
    p.add_argument("--name", default="", help="expected skill name (default: folder name)")
    p.add_argument("--max-lines", type=int, default=30, help="absolute cap on changed lines (default 30)")
    p.add_argument("--max-ratio", type=float, default=0.20, help="cap on changed/current lines (default 0.20)")
    return p.parse_args(argv)


def frontmatter(text):
    if not text.startswith("---"):
        return {}
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}
    meta, key, buf = {}, None, []
    for line in parts[1].splitlines():
        if line[:1] in (" ", "	") and key:
            buf.append(line.strip())
            continue
        if key:
            meta[key] = " ".join(buf).strip().strip("\"'") if buf else meta[key]
            key, buf = None, []
        if ":" in line:
            name, value = line.split(":", 1)
            name = name.strip().lower()
            value = value.strip()
            if value in (">", ">-", "|", "|-", ">+", "|+"):
                key, buf = name, []
                meta[name] = ""
            elif value:
                meta[name] = value.strip("\"'")
    if key:
        meta[key] = " ".join(buf).strip().strip("\"'") if buf else meta.get(key, "")
    return meta


def strip_code(text: str) -> str:
    """Remove fenced blocks and inline code so quoted markers are not mistakes."""
    text = re.sub(r"```.*?```", " ", text, flags=re.S)
    return re.sub(r"`[^`]*`", " ", text)


def relative_links(text, base: Path):
    targets, missing = [], []
    for raw in LINK.findall(text) + BACKTICK_PATH.findall(text):
        target = raw.split("#", 1)[0].strip()
        if not target or target.startswith(("http://", "https://", "mailto:", "/", "#")):
            continue
        if "<" in target or ">" in target or "…" in target or "..." in target or "*" in target:
            continue
        targets.append(target)
        if not (base / target).exists():
            missing.append(target)
    return targets, missing


def norm(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def main(argv=None):
    args = parse_args(argv)
    proposed_path = Path(args.proposed).expanduser()
    if not proposed_path.is_file():
        print("proposed file does not exist: %s" % proposed_path, file=sys.stderr)
        return 5
    if not args.current and not args.new_skill:
        print("--current is required; pass --new-skill only for a file that has no shipped version", file=sys.stderr)
        return 3
    current_path = Path(args.current).expanduser() if args.current else None
    if current_path and not current_path.is_file():
        print("current file does not exist: %s" % current_path, file=sys.stderr)
        return 5
    try:
        evidence = json.loads(Path(args.evidence).expanduser().read_text(encoding="utf-8"))
        card = json.loads(Path(args.scorecard).expanduser().read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print("cannot read input: %s" % exc, file=sys.stderr)
        return 5

    try:
        proposed = proposed_path.read_text(encoding="utf-8")
        current = current_path.read_text(encoding="utf-8") if current_path else ""
    except UnicodeDecodeError as exc:
        print("cannot read input as UTF-8: %s" % exc, file=sys.stderr)
        return 5
    added_text = proposed
    if current:
        added_text = chr(10).join(
            line[1:] for line in difflib.unified_diff(current.splitlines(), proposed.splitlines(),
                                                      lineterm="", n=0)
            if line.startswith("+") and not line.startswith("+++"))
    meta = frontmatter(proposed)
    failures, warnings = [], []

    expected_name = args.name or proposed_path.parent.name
    if not meta:
        failures.append("frontmatter: missing or unterminated YAML block")
    else:
        if meta.get("name") != expected_name:
            failures.append("frontmatter: name %r does not match %r" % (meta.get("name"), expected_name))
        description = meta.get("description", "")
        if len(description) < 80:
            failures.append("frontmatter: description is %d chars, need 80+" % len(description))
        if not meta.get("version"):
            warnings.append("frontmatter: no version; bump it when the behaviour changes")
        if current:
            old = frontmatter(current)
            if old.get("version") and old.get("version") == meta.get("version"):
                warnings.append("frontmatter: version unchanged from the shipped file")

    if current:
        diff = list(difflib.unified_diff(current.splitlines(), proposed.splitlines(), lineterm="", n=0))
        added = sum(1 for line in diff if line.startswith("+") and not line.startswith("+++"))
        removed = sum(1 for line in diff if line.startswith("-") and not line.startswith("---"))
        changed = added + removed
        if changed == 0:
            failures.append("diff: the proposed file is identical to the current one")
        allowance = max(args.max_lines, int(len(current.splitlines()) * args.max_ratio))
        if changed > allowance:
            failures.append("diff: %d changed lines exceeds the allowance of %d" % (changed, allowance))
        if current.splitlines() and removed / len(current.splitlines()) >= 0.40:
            failures.append("diff: removes %.0f%% of the file; rewrite a section, not the document"
                            % (100 * removed / len(current.splitlines())))
    else:
        added = removed = changed = len(proposed.splitlines())
        if changed > 400:
            failures.append("new skill: %d lines is too large to review in one pull request" % changed)

    rows = evidence.get("evidence") if isinstance(evidence, dict) else evidence
    if not isinstance(rows, list) or not rows:
        failures.append("evidence: no entries")
        rows = []
    failed = set(card.get("failed_conversations") or [])
    failed_dims = card.get("failed_dimensions") or {}
    if failed and not failed_dims:
        failures.append("scorecard: no failed_dimensions map, so the evidence cannot be tied to a rubric")
    if not failed:
        failures.append("scorecard: no failing conversation, so there is nothing to justify an edit")
    for index, row in enumerate(rows, 1):
        tag = "evidence[%d]" % index
        if not isinstance(row, dict):
            failures.append("%s: not an object" % tag)
            continue
        session = str(row.get("session_id", ""))
        scorer = str(row.get("scorer", ""))
        quote = str(row.get("quote", ""))
        change = str(row.get("change", ""))
        if not session:
            failures.append("%s: no session_id" % tag)
        elif session not in failed:
            failures.append("%s: session %s is not in failed_conversations" % (tag, session))
        if scorer not in SCORERS:
            failures.append("%s: scorer %r is not one of %s" % (tag, scorer, sorted(SCORERS)))
        elif session in failed_dims and scorer not in failed_dims[session]:
            failures.append("%s: %s did not fail %s; it failed %s"
                            % (tag, session, scorer, failed_dims[session] or "nothing"))
        if not change.strip():
            failures.append("%s: no change description" % tag)
        if args.transcripts and session:
            tx = Path(args.transcripts).expanduser() / ("%s.txt" % session)
            if not tx.is_file():
                failures.append("%s: no transcript for session %s" % (tag, session))
            else:
                tx_norm = norm(tx.read_text(encoding="utf-8", errors="replace"))
                probe = norm(quote)
                if probe not in tx_norm:
                    failures.append("%s: the quote does not occur verbatim in that session's transcript"
                                    % tag)
        if len(quote.strip()) < MIN_QUOTE:
            failures.append("%s: no usable quote" % tag)
        elif len(quote) > MAX_QUOTE:
            failures.append("%s: quote is %d chars, cap is %d" % (tag, len(quote), MAX_QUOTE))
        elif len(norm(quote)) >= MIN_COPY and norm(quote) in norm(added_text):
            failures.append("%s: the transcript quote is pasted into SKILL.md; paraphrase it" % tag)

    if args.transcripts:
        tdir = Path(args.transcripts).expanduser()
        if not tdir.is_dir():
            print("transcripts folder does not exist: %s" % tdir, file=sys.stderr)
            return 5
        body_norm = norm(added_text)
        copied = []
        for path in sorted(tdir.glob("*.txt")):
            whole = norm(re.sub(r"^\[[^\]]*\]\s*", "",
                                " ".join(path.read_text(encoding="utf-8", errors="replace").splitlines()),
                                flags=re.M))
            for i in range(0, max(0, len(whole) - COPY_WINDOW + 1)):
                chunk = whole[i:i + COPY_WINDOW]
                cjk = sum(1 for ch in chunk if "一" <= ch <= "鿿")
                wide = whole[i:i + COPY_WIDE]
                long_ascii = len(wide) == COPY_WIDE and sum(
                    1 for ch in wide if "一" <= ch <= "鿿") < 4
                if cjk >= 5 and chunk in body_norm:
                    copied.append((path.name, chunk))
                    break
                if long_ascii and wide in body_norm:
                    copied.append((path.name, wide))
                    break
        for name, chunk in copied:
            failures.append("transcripts: %s text appears verbatim in the proposed file (%r)" % (name, chunk))

    for pattern, label in SECRET_PATTERNS:
        if pattern.search(proposed):
            failures.append("secrets: %s found in the proposed file" % label)
    hit = PLACEHOLDERS.search(strip_code(proposed))
    if hit:
        failures.append("placeholder: %r left in the proposed file" % hit.group(0))

    base = Path(args.base_dir).expanduser() if args.base_dir else (
        current_path.parent if current_path else proposed_path.parent)
    if not base.is_dir():
        print("base dir does not exist: %s" % base, file=sys.stderr)
        return 5
    targets, missing = relative_links(proposed, base)
    for target in missing:
        failures.append("link: %s does not exist under %s" % (target, base))

    if args.max_lines != 30 or abs(args.max_ratio - 0.20) > 1e-9:
        warnings.append("policy: size caps overridden (max_lines=%d, max_ratio=%.2f); record the reason in the PR"
                        % (args.max_lines, args.max_ratio))

    result = {
        "gate": "PASS" if not failures else "FAIL",
        "policy": {"max_lines": args.max_lines, "max_ratio": args.max_ratio,
                   "quote_cap": MAX_QUOTE, "description_min": 80},
        "name": expected_name,
        "changed_lines": {"added": added, "removed": removed, "total": changed},
        "evidence_entries": len(rows),
        "links_checked": {"count": len(targets), "base": str(base)},
        "failures": failures,
        "warnings": warnings,
        "human_still_required": [
            "Is the behavioural rule right, and is it owned by the surface you edited?",
            "Does the edit pass the regression set (references/verifiability.md)?",
            "Should this merge now, with a named reviewer?",
        ],
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if not failures else 1


if __name__ == "__main__":
    sys.exit(main())
