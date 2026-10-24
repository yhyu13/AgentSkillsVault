#!/usr/bin/env python3
"""Generate the tombstone files for the skills removed by the 2026-10-25 audit.

Writes:
  .kilo/removed-skills.txt  - machine denylist consumed by sync-vault-skills-v2.ps1
  REMOVED-SKILLS.md         - human record: name, defect class, repo path, vendor source
"""
import csv, json, sys
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8")

CSV = "docs/skill-capacity-audit/2026-10-25-defect-scores.csv"
rows = list(csv.DictReader(open(CSV, encoding="utf-8-sig")))
flagged = {r["skill"]: r for r in rows if r["defects"]}
plan = json.load(open("docs/skill-capacity-audit/2026-10-25-removal-plan.json",
                      encoding="utf-8"))

CLASS = {
    "U": "never usable",
    "E": "error references",
    "L": "low quality",
    "S": "not standalone",
}

names = sorted(flagged)

# ---------- machine denylist ----------
lines = [
    "# Skills retired from the vault by the 2026-10-25 defect audit.",
    "# sync-vault-skills-v2.ps1 reads this file and refuses to install these",
    "# names, even when a copy still exists under vendor/ (upstream archives).",
    "# Reasons and upstream paths: REMOVED-SKILLS.md",
]
lines += names
Path(".kilo/removed-skills.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")

# ---------- human record ----------
out = ["# Retired skills - 2026-10-25 defect audit", "",
       f"{len(names)} skills were removed from the vault and from every harness store",
       "(`~/.claude/skills`, `~/.kilo/skills`, `~/.codex/skills`, `~/.agents/skills`).", "",
       "Reason: each skill was flagged by at least one of the four audit classes -",
       "",
       "| class | meaning |",
       "|---|---|",
       "| U | never usable (hard dependency on an MCP server that is not connected) |",
       "| E | error references (SKILL.md points at payload files that do not exist) |",
       "| L | low quality (thin body, weak description, no trigger cue) |",
       "| S | not standalone (depends on another skill, a sibling path, or another repo) |",
       "",
       "Upstream copies under `vendor/` are kept on purpose: they are the source of",
       "truth for re-adding a skill once it is fixed. `.kilo/removed-skills.txt` stops",
       "the sync script from reinstalling them.", "",
       "| skill | class | promoted copy removed | upstream kept in vendor |",
       "|---|---|---|---|"]
for n in names:
    p = plan.get(n, {})
    cls = " ".join(f"{c} ({CLASS[c]})" for c in flagged[n]["defects"] if c in CLASS)
    dp = ", ".join(f"`{x}/`" for x in p.get("repo_delete", [])) or "_(promoted copy did not exist)_"
    vp = ", ".join(f"`{x}/`" for x in p.get("vendor_keep", [])) or "_(no vendor copy - removed outright)_"
    out.append(f"| `{n}` | {cls} | {dp} | {vp} |")
out.append("")
Path("REMOVED-SKILLS.md").write_text("\n".join(out), encoding="utf-8")
print(f"denylist: {len(names)} names -> .kilo/removed-skills.txt")
print(f"record   -> REMOVED-SKILLS.md")
