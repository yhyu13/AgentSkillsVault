#!/usr/bin/env python3
"""Read-only curated manifest consistency check for CI.

Does not regenerate the manifest and does not touch user skill stores.
Vendor/host rows are validated structurally; vendor submodule contents are not
required for this curated-only gate.
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path

SKIP_DIRS = {
    ".git",
    ".github",
    ".changeset",
    ".claude-plugin",
    ".out-of-scope",
    ".cindy-worktrees",
    ".worktrees",
    "node_modules",
    "archived",
    "vendor",
    "docs",
}
VALID_TIERS = {"A", "B", "C"}


def is_template_dir(name: str) -> bool:
    return name.startswith("TEMPLATE")


def parse_manifest(path: Path) -> tuple[dict[str, tuple[str, str]], list[str]]:
    rows: dict[str, tuple[str, str]] = {}
    errors: list[str] = []
    for line_number, raw in enumerate(path.read_text(encoding="utf-8-sig").splitlines(), start=1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split("|")
        if len(parts) != 3:
            errors.append(f"manifest line {line_number}: expected name|path|tier")
            continue
        name, source, tier = (part.strip() for part in parts)
        if not name or not source or tier not in VALID_TIERS:
            errors.append(f"manifest line {line_number}: invalid name/path/tier")
            continue
        if name in rows:
            errors.append(f"manifest duplicate skill name: {name}")
            continue
        rows[name] = (source, tier)
    return rows, errors


def parse_tiers(path: Path) -> dict[str, str]:
    tiers: dict[str, str] = {}
    if not path.exists():
        return tiers
    for raw in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "|" not in line:
            continue
        name, tier = (part.strip() for part in line.split("|", 1))
        if name:
            tiers[name] = tier.upper()
    return tiers


def frontmatter_fields(path: Path) -> dict[str, str]:
    text = path.read_text(encoding="utf-8-sig", errors="replace")
    match = re.match(r"^---\s*\n(.*?)\n---\s*\n", text, flags=re.DOTALL)
    if not match:
        return {}
    fields: dict[str, str] = {}
    for line in match.group(1).splitlines():
        field_match = re.match(r"^([A-Za-z0-9_-]+):\s*(.*)$", line)
        if field_match:
            fields[field_match.group(1)] = field_match.group(2).strip()
    return fields


def scan_curated(root: Path) -> tuple[dict[str, str], list[str]]:
    curated: dict[str, str] = {}
    errors: list[str] = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [
            name
            for name in dirnames
            if name not in SKIP_DIRS and not is_template_dir(name)
        ]
        if "SKILL.md" not in filenames:
            continue
        skill_file = Path(dirpath) / "SKILL.md"
        rel = Path(dirpath).relative_to(root).as_posix()
        leaf = Path(dirpath).name
        if leaf in curated:
            errors.append(f"duplicate curated leaf name: {leaf} ({curated[leaf]} and {rel})")
            continue
        fields = frontmatter_fields(skill_file)
        if not fields.get("name"):
            errors.append(f"{rel}/SKILL.md: missing frontmatter name")
        elif fields["name"] != leaf:
            errors.append(f"{rel}/SKILL.md: frontmatter name {fields['name']} != leaf {leaf}")
        if not fields.get("description"):
            errors.append(f"{rel}/SKILL.md: missing frontmatter description")
        curated[leaf] = rel
    return curated, errors


def check(root: Path) -> list[str]:
    manifest_path = root / "scripts/install-manifest.txt"
    rows, errors = parse_manifest(manifest_path)
    tiers = parse_tiers(root / "scripts/skill-tiers.txt")
    curated, scan_errors = scan_curated(root)
    errors.extend(scan_errors)

    removed_path = root / ".kilo/removed-skills.txt"
    removed: set[str] = set()
    if removed_path.exists():
        for raw in removed_path.read_text(encoding="utf-8-sig").splitlines():
            line = raw.strip()
            if line and not line.startswith("#"):
                removed.add(line.split("|", 1)[0].strip())
    for name in rows:
        if name in removed:
            errors.append(f"retired skill present in manifest: {name}")

    for name, rel in curated.items():
        if name not in rows:
            errors.append(f"curated skill missing from manifest: {name} ({rel})")
            continue
        source, tier = rows[name]
        if source != rel:
            errors.append(f"manifest path mismatch for {name}: {source} != {rel}")
        expected_tier = tiers.get(name, "A")
        if tier != expected_tier:
            errors.append(f"tier mismatch for {name}: {tier} != {expected_tier}")

    for name, (source, tier) in rows.items():
        if source == "HOST":
            continue
        if source.startswith("vendor/"):
            continue
        if name not in curated:
            errors.append(f"manifest curated source not found in tree: {name} ({source})")
        expected_tier = tiers.get(name, "A")
        if tier != expected_tier:
            errors.append(f"tier mismatch for {name}: {tier} != {expected_tier}")

    return sorted(set(errors))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=".")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    errors = check(root)
    if errors:
        print("manifest-consistency: FAIL")
        for error in errors:
            print(f"- {error}")
        return 1
    print("manifest-consistency: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
