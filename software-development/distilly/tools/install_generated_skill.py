#!/usr/bin/env python3
"""Install a generated Distilly skill into a supported host discovery path."""

from __future__ import annotations

import argparse
from pathlib import Path

from hosts import HOSTS, generated_skills_dir as default_skills_dir
from install_generated_skill_common import install_generated_skill


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Install only a generated skill's self-contained SKILL.md, rewriting "
            "legacy frontmatter to its canonical command name"
        )
    )
    parser.add_argument("--skill-dir", required=True, help="Generated skill directory")
    parser.add_argument("--host", required=True, choices=sorted(HOSTS))
    parser.add_argument(
        "--skills-dir",
        help="Override the host skill root (the canonical command directory is appended)",
    )
    parser.add_argument("--force", action="store_true", help="Overwrite an existing installed copy")
    parser.add_argument("--dry-run", action="store_true", help="Resolve install paths without writing files")
    args = parser.parse_args()

    skills_dir = (
        Path(args.skills_dir).expanduser()
        if args.skills_dir
        else default_skills_dir(args.host)
    )
    result = install_generated_skill(
        Path(args.skill_dir).expanduser(),
        skills_dir,
        force=args.force,
        dry_run=args.dry_run,
        host=args.host,
    )
    print(result["command_name"])
    print(result["skill_dir"])


if __name__ == "__main__":
    main()
