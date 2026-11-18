#!/usr/bin/env python3
"""Generate plugin + marketplace manifests so the vault installs without PowerShell.

Why (candidate #70): 15 of the 20 peer vaults ship `.claude-plugin/marketplace.json`, so a
user runs `/plugin marketplace add <repo>` and the harness pulls skills natively. This vault
only offers `scripts/sync-skills.ps1` (Windows, PowerShell, junctions). Measured 2026-11-13,
`claude plugin validate` validates a marketplace and a plugin offline and reports warnings —
so the generated manifests can be checked by the harness itself, not just by us.

No duplication: a plugin manifest lists explicit skill directories
(`"skills": ["./tier0/<name>", ...]`), pointing straight at `SKILL/<category>/tier<N>/<name>`.
The curated tree stays the single real copy; the plugin is a *view*, exactly like a junction.

    python scripts/build_marketplace.py            # write manifests
    python scripts/build_marketplace.py --check    # exit 1 if the tree and manifests disagree
    python scripts/build_marketplace.py --json     # print manifests, write nothing

Layout written:
    .claude-plugin/marketplace.json          one entry per category
    SKILL/<category>/.claude-plugin/plugin.json   explicit skills list for that category
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

MARKETPLACE = Path(".claude-plugin") / "marketplace.json"
OWNER_NAME = "yhyu13"
OWNER_URL = "https://github.com/yhyu13"
REPO_URL = "https://github.com/yhyu13/AgentSkillsVault"
VERSION = "1.0.0"

CATEGORY_BLURB = {
    "agents": "Agent behaviour, self-review loops and problem-solving methods.",
    "content": "Documents, decks, spreadsheets, PDFs and content repurposing.",
    "design": "HTML/visual design, slides, decks, diagrams and explainers.",
    "devops": "Observability, Grafana, deployment and infrastructure review.",
    "game-dev": "Godot/Phaser/Blender/UE game production and rendering.",
    "knowledge-vault": "Notes, knowledge bases and vault upkeep.",
    "management": "Reports, OKRs, strategy frameworks, PM and finance models.",
    "math": "Mathematical proof and rigour.",
    "software-development": "Engineering workflow: specs, review, debugging, skill quality.",
    "video": "Code-rendered video, motion design and cinema pipelines.",
    "writing": "Long-form and technical writing craft.",
}


def read_manifest(path: Path) -> list[tuple[str, str]]:
    rows = []
    for raw in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or line.count("|") < 2:
            continue
        name, src, tier = (p.strip() for p in line.split("|")[:3])
        if tier.upper() == "C" or src == "HOST" or not src.startswith("SKILL/"):
            continue
        rows.append((name, src))
    return rows


def group_by_category(rows: list[tuple[str, str]]) -> dict[str, list[tuple[str, str]]]:
    groups: dict[str, list[tuple[str, str]]] = {}
    for name, src in rows:
        parts = src.split("/")
        if len(parts) < 4:
            continue
        category = parts[1]
        groups.setdefault(category, []).append((name, "/".join(parts[2:])))
    return dict(sorted(groups.items()))


def plugin_manifest(category: str, skills: list[tuple[str, str]]) -> dict:
    return {
        "name": f"vault-{category}",
        "version": VERSION,
        "description": (f"{len(skills)} curated skills — {CATEGORY_BLURB.get(category, category)}. "
                        f"Provenance resolution status is recorded in skills-lock.json."),
        "author": {"name": OWNER_NAME, "url": OWNER_URL},
        "homepage": REPO_URL,
        "keywords": [category, "agent-skills", "skills-vault"],
        "skills": [f"./{rel}" for _, rel in sorted(skills)],
    }


def marketplace(groups: dict[str, list[tuple[str, str]]]) -> dict:
    total = sum(len(v) for v in groups.values())
    return {
        "name": "agentskillsvault",
        "owner": {"name": OWNER_NAME, "url": OWNER_URL},
        "metadata": {
            "description": (f"AgentSkillsVault — {total} curated agent skills across "
                            f"{len(groups)} categories, one plugin per category. "
                            f"Curated skills are generated from the install manifest; "
                            f"skills-lock.json records source-resolution status."),
            "version": VERSION,
        },
        "plugins": [
        {
            "name": f"vault-{cat}",
            "source": f"./SKILL/{cat}",
            "description": f"{len(skills)} skills — {CATEGORY_BLURB.get(cat, cat)}",
            "version": VERSION,
            "category": cat,
            "tags": sorted({cat, "agent-skills"}),
        }
        for cat, skills in groups.items()
        ],
    }


def build(root: Path) -> tuple[dict, dict[str, dict]]:
    rows = read_manifest(root / "scripts/install-manifest.txt")
    groups = group_by_category(rows)
    return marketplace(groups), {c: plugin_manifest(c, s) for c, s in groups.items()}


def write(root: Path, mkt: dict, plugins: dict[str, dict]) -> None:
    mp = root / MARKETPLACE
    mp.parent.mkdir(parents=True, exist_ok=True)
    mp.write_text(json.dumps(mkt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for cat, manifest in plugins.items():
        p = root / "SKILL" / cat / ".claude-plugin" / "plugin.json"
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    all_rows = {l.split("|")[0].strip() for l in (root / "scripts/install-manifest.txt")
                .read_text(encoding="utf-8-sig").splitlines()
                if l.strip() and not l.startswith("#") and l.count("|") == 2}
    packaged = sum(len(p["skills"]) for p in plugins.values())
    print(f"wrote {MARKETPLACE.as_posix()} ({len(plugins)} plugins, {packaged} skills)")
    if len(all_rows) != packaged:
        print(f"  note: {len(all_rows) - packaged} manifest skills are vendor/HOST rows, "
              f"not under SKILL/ — a plugin can only point at the curated tree")
    for cat, manifest in plugins.items():
        print(f"  SKILL/{cat}/.claude-plugin/plugin.json  {len(manifest['skills'])} skills")


def check(root: Path, mkt: dict, plugins: dict[str, dict]) -> int:
    problems: list[str] = []
    mp = root / MARKETPLACE
    if not mp.exists():
        print(f"marketplace: FAIL — {MARKETPLACE.as_posix()} missing; run without --check")
        return 1
    on_disk = json.loads(mp.read_text(encoding="utf-8"))
    if on_disk.get("plugins") != mkt["plugins"]:
        problems.append(f"{MARKETPLACE.as_posix()} is stale (plugin list differs from the tree)")
    for cat, manifest in plugins.items():
        p = root / "SKILL" / cat / ".claude-plugin" / "plugin.json"
        if not p.exists():
            problems.append(f"missing {p.relative_to(root).as_posix()}")
            continue
        if json.loads(p.read_text(encoding="utf-8")) != manifest:
            problems.append(f"stale {p.relative_to(root).as_posix()}")
        for rel in manifest["skills"]:
            if not (root / "SKILL" / cat / rel).is_dir():
                problems.append(f"skill path does not exist: SKILL/{cat}/{rel[2:]}")
    if problems:
        print(f"marketplace: FAIL — {len(problems)} problem(s)")
        for p in problems:
            print(f"- {p}")
        return 1
    print(f"marketplace: PASS ({len(plugins)} plugins, "
          f"{sum(len(p['skills']) for p in plugins.values())} skills)")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--root", default=".")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()
    root = Path(args.root).resolve()
    mkt, plugins = build(root)
    if args.json:
        print(json.dumps({"marketplace": mkt, "plugins": plugins}, ensure_ascii=False, indent=2))
        return 0
    if args.check:
        return check(root, mkt, plugins)
    write(root, mkt, plugins)
    return 0


if __name__ == "__main__":
    sys.exit(main())
