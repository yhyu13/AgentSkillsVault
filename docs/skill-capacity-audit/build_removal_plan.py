"""Build the removal plan for the skills flagged in the defect audit.

Prints, per flagged skill:
  - repo dirs to delete (category dirs only; vendor/ submodules are left alone)
  - vendor upstream path (kept as the source of truth for re-adding)
"""
import csv, json, sys, os
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8")

VAULT = Path(".").resolve()
CSV = "docs/skill-capacity-audit/2026-10-25-defect-scores.csv"

rows = list(csv.DictReader(open(CSV, encoding="utf-8-sig")))
flagged = {r["skill"]: r for r in rows if r["defects"]}

# every repo dir that is a skill (has SKILL.md), split into promoted vs vendor
promoted, vendor = {}, {}
for sm in VAULT.rglob("SKILL.md"):
    if ".git" in sm.parts or "node_modules" in sm.parts:
        continue
    rel = str(sm.parent.relative_to(VAULT)).replace("\\", "/")
    (vendor if rel.startswith("vendor/") else promoted).setdefault(
        sm.parent.name, []).append(rel)

plan = {}
for name, r in sorted(flagged.items()):
    plan[name] = {
        "defects": r["defects"],
        "repo_delete": sorted(promoted.get(name, [])),
        "vendor_keep": sorted(vendor.get(name, [])),
        "installed": True,
    }

# repo dirs with a SKILL.md whose dir name is NOT an installed skill (orphans)
orphan_repo = sorted(set(promoted) - {r["skill"] for r in rows})
print("== plan ==")
n_del = 0
for name, p in sorted(plan.items()):
    if p["repo_delete"]:
        n_del += len(p["repo_delete"])
        print(f"{name:42s} [{p['defects']}] DEL {p['repo_delete']}")
    else:
        v = p["vendor_keep"][0] if p["vendor_keep"] else "(none)"
        print(f"{name:42s} [{p['defects']}] vendor-only: {v}")
print(f"\nflagged skills: {len(plan)}")
print(f"repo dirs to delete: {n_del}")
print(f"repo skill dirs NOT in the installed set: {orphan_repo}")

json.dump(plan, open("docs/skill-capacity-audit/2026-10-25-removal-plan.json", "w",
                     encoding="utf-8"), indent=2, ensure_ascii=False)
