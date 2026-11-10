#!/usr/bin/env python3
"""Classify a PR as green/yellow/red and validate green platform evidence."""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

from task_policy import grade_pull_request, load_policy


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", default=".")
    parser.add_argument("--policy", default=".github/task-grade-policy.json")
    parser.add_argument("--base", required=True)
    parser.add_argument("--head", default="HEAD")
    parser.add_argument("--head-sha", required=True)
    parser.add_argument("--pr-body", required=True, help="Path to a file containing the PR body")
    parser.add_argument("--output", required=True, help="Path to write the grade JSON")
    args = parser.parse_args()

    repo_root = Path(args.repo_root).resolve()
    policy_path = Path(args.policy)
    if not policy_path.is_absolute():
        policy_path = repo_root / policy_path
    policy = load_policy(policy_path)
    pr_body = Path(args.pr_body).read_text(encoding="utf-8")

    result = grade_pull_request(
        repo_root=repo_root,
        policy=policy,
        base_ref=args.base,
        head_ref=args.head,
        head_sha=args.head_sha,
        pr_body=pr_body,
    )

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    lines = [
        f"## Task grade: {result['grade']}",
        "",
        f"Head SHA: `{result['head_sha']}`",
        f"Merge conflict with base: `{result['merge_conflict']}`",
        "",
        "### Reasons",
    ]
    if result["reasons"]:
        lines.extend(f"- {reason}" for reason in result["reasons"])
    else:
        lines.append("- No red/yellow path triggers; green evidence checked.")
    if result["evidence_errors"]:
        lines.extend(["", "### Green evidence errors"])
        lines.extend(f"- {error}" for error in result["evidence_errors"])
    summary = "\n".join(lines) + "\n"
    print(summary)

    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary_path:
        with Path(summary_path).open("a", encoding="utf-8") as handle:
            handle.write(summary)
    return 0


if __name__ == "__main__":
    sys.exit(main())
