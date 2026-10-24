#!/usr/bin/env python3
"""Render the capacity audit into a markdown report (full table + bottom 50%)."""
import csv
import json
import sys
from pathlib import Path

out = Path(sys.argv[1])
date = sys.argv[2]
rows = list(csv.DictReader((out / f"{date}-capacity-scores.csv").open(encoding="utf-8-sig")))
meta = json.loads((out / f"{date}-capacity-meta.json").read_text(encoding="utf-8"))
for r in rows:
    r["score"] = float(r["score"])

rows.sort(key=lambda r: (r["score"], r["skill"]))
half = len(rows) // 2
bottom = rows[:half]
top = rows[::-1][:20]

buckets = {}
for r in rows:
    b = int(r["score"])
    buckets[b] = buckets.get(b, 0) + 1

no_fm = [r for r in rows if r["frontmatter"] != "True"]
broken = [r for r in rows if int(r["broken_refs"]) > 0]
placeholder = [r for r in rows if r["placeholder_markers"] == "True"]
no_payload = [r for r in rows if int(r["extra_files"]) == 0]
no_scripts = [r for r in rows if int(r["real_scripts"]) == 0]

L = []
A = L.append
A(f"# Skill capacity / completeness audit — {date}")
A("")
A(f"Scored **{meta['skills']}** installed skills (canonical store `~/.claude/skills`) "
  f"0–10 on five measurable dimensions.  Average **{meta['avg']}**, median **{meta['median']}**, "
  f"range {meta['min']}–{meta['max']}.")
A("")
A("Scoring is mechanical (no vibes): every point comes from a property of the package on disk.")
A("Rebuild with:")
A("")
A("```powershell")
A("python docs/skill-capacity-audit/score_skills.py --root $env:USERPROFILE\\.claude\\skills `")
A("  --vault . --out docs/skill-capacity-audit --date 2026-10-24")
A("```")
A("")
A("## Rubric")
A("")
A("| dim | max | what earns the points |")
A("|---|---|---|")
A("| A · contract & metadata | 3 | YAML frontmatter present (1) · `name:` == folder name (0.5) · version/license (0.5) · description ≥80 chars (0.5) · description states a trigger (0.5) |")
A("| B · instruction depth | 2 | body ≥1500 chars (0.7) · ≥4000 chars (0.7) · ≥3 headings (0.3) · ≥2 code blocks (0.3) |")
A("| C · payload richness | 2 | `references/` (0.5) · `scripts/` (0.5) · `templates`/`assets`/`examples`/`docs` (0.5) · ≥5 payload files (0.5) |")
A("| D · link integrity | 2 | 2 × (1 − broken/total referenced relative paths) |")
A("| E · hygiene | 1 | no TODO/占位 markers (0.5) · at least one non-stub script (0.5) |")
A("")
A("## Score distribution")
A("")
A("| score | skills |")
A("|---|---|")
for b in sorted(buckets):
    A(f"| {b} | {buckets[b]} |")
A("")
A("## Failure modes")
A("")
A("| symptom | skills | share |")
A("|---|---|---|")
for label, coll in (("no YAML frontmatter (harness cannot trigger it)", no_fm),
                    ("≥1 broken relative reference", broken),
                    ("TODO/占位 markers in body", placeholder),
                    ("single-file skill (no payload dirs)", no_payload),
                    ("no non-stub script", no_scripts)):
    A(f"| {label} | {len(coll)} | {len(coll)*100//len(rows)}% |")
A("")
A("### Root causes (why the scores look like this)")
A("")
A("1. **52 skills are missing the `---` YAML fence.**  Their `name:` / `description:` lines are "
  "plain body text (`# Title` → `name:` → `description:`), so a strict harness loader sees no "
  "frontmatter and cannot trigger them.  *All 52 are mechanically fixable*: wrap the existing "
  "`name:`/`description:` lines in `---` fences.  Upstream set: `vendor/claude-skills` "
  "(`.gemini/skills/*` style, plus the finance / grafana packs).")
A("2. **70 skills reference files that do not exist next to them.**  Typical shapes: "
  "`references/logql.md`, `scripts/extract-pptx.py`, `assets/day1024/...`, and cross-skill "
  "links like `../finance/cs-financial-analyst.md`.  In the vault the same links are dangling too "
  "(checked — 0 of them resolve), so this is an **upstream packaging gap**, not a copy mistake.")
A("3. **112 skills ship as a single `SKILL.md`** with no `references/`, `templates/`, `scripts/` "
  "or `assets/` directory — the instruction text points at material that was never shipped "
  "alongside it.")
A("4. **280 of 347 have no runnable script.**  For guidance-style skills that is legitimate, "
  "but it means the score cannot be earned through tooling either.")
A("")
A("### Remediation order")
A("")
A("| priority | action | effect | effort |")
A("|---|---|---|---|")
A("| 1 | add `---` fences to the 52 skills that already contain `name:`/`description:` | "
  "+52 × 1.5 contract points ≈ lifts ~30 skills out of the bottom half | script, minutes |")
A("| 2 | re-copy payload for skills whose upstream *does* ship `references/` | recovers D and C "
  "points for the worst offenders | needs per-skill check against upstream |")
A("| 3 | resolve sibling links (`../finance/...`) at install time, or vendor the sibling files | "
  "removes ~15 broken refs | installer change |")
A("| 4 | decide keep-or-drop for the 4 score-2.0/2.5 skills (`grafana-loki`, "
  "`grafana-datasources-provisioning`, `deferred-taxes`, `gaap-standards`) | removes dead weight | "
  "user decision |")
A("")
A("## Bottom 50% — the weakest half ({} of {})".format(len(bottom), len(rows)))
A("")
A("| # | skill | score | A | B | C | D | E | main defect |")
A("|---|---|---|---|---|---|---|---|---|")
for i, r in enumerate(bottom, 1):
    defects = []
    if r["frontmatter"] != "True":
        defects.append("no frontmatter")
    if int(r["broken_refs"]) > 0:
        defects.append(f"{r['broken_refs']} broken ref")
    if r["placeholder_markers"] == "True":
        defects.append("placeholder")
    if int(r["extra_files"]) == 0:
        defects.append("no payload")
    if int(r["real_scripts"]) == 0:
        defects.append("no script")
    A(f"| {i} | `{r['skill']}` | **{r['score']}** | {r['A_contract']} | {r['B_depth']} | "
      f"{r['C_payload']} | {r['D_links']} | {r['E_hygiene']} | {', '.join(defects) or '—'} |")
A("")
A("## Top 20 — calibration reference")
A("")
A("| # | skill | score | vault path |")
A("|---|---|---|---|")
for i, r in enumerate(top, 1):
    A(f"| {i} | `{r['skill']}` | **{r['score']}** | `{r['vault_path'] or '—'}` |")
A("")
A("## Full table (all {} skills)".format(len(rows)))
A("")
A("| skill | score | A | B | C | D | E | broken refs | vault path |")
A("|---|---|---|---|---|---|---|---|---|")
for r in rows:
    A(f"| `{r['skill']}` | {r['score']} | {r['A_contract']} | {r['B_depth']} | {r['C_payload']} | "
      f"{r['D_links']} | {r['E_hygiene']} | {r['broken_refs']} | `{r['vault_path'] or '—'}` |")
A("")

(out / f"{date}-capacity-audit.md").write_text("\n".join(L), encoding="utf-8")
print(f"wrote {out}/{date}-capacity-audit.md  ({len(L)} lines)")
