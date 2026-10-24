import csv, sys, os
sys.stdout.reconfigure(encoding="utf-8")

P = "docs/skill-capacity-audit/2026-10-25-defect-scores.csv"
rows = list(csv.DictReader(open(P, encoding="utf-8-sig")))

def loc(r):
    if r["vault_path"]:
        return "`" + r["vault_path"] + "`"
    if r["git_path"]:
        return "git:`" + r["git_path"] + "`"
    if r["vendor_path"]:
        return "vendor only: `" + r["vendor_path"] + "`"
    return "**absent from this repo**"

TAGS = {
    "U": ("1. Never usable", "U_never_usable"),
    "E": ("2. Error references", "E_broken_list"),
    "L": ("3. Low quality", "L_low_quality"),
    "S": ("4. Not standalone", "S_not_standalone"),
}

out = []
out.append("# Installed skill defect audit - 2026-10-25\n")
out.append("Store: `~/.claude/skills` | Vault: `D:\\GitRepo-AI\\AgentSkillsVault`")
n = len(rows)
out.append("| metric | count | share |")
out.append("|---|---|---|")
for tag in "UELS":
    c = sum(1 for r in rows if tag in r["defects"])
    out.append(f"| {TAGS[tag][0]} | {c} | {c*100//n}% |")
clean = sum(1 for r in rows if not r["defects"])
out.append(f"| no defect found | {clean} | {clean*100//n}% |")
out.append(f"| **installed skills scanned** | **{n}** | |\n")

for tag in "UELS":
    title, col = TAGS[tag]
    sel = [r for r in rows if tag in r["defects"]]
    sel.sort(key=lambda r: (r["skill"]))
    out.append(f"## {title} ({len(sel)})\n")
    out.append("| skill | location in this repo | evidence |")
    out.append("|---|---|---|")
    for r in sel:
        ev = r[col]
        if tag == "E":
            ev = f"{r['E_error_refs']} broken ({r['E_origin']}) - `{ev}`"
        out.append(f"| `{r['skill']}` | {loc(r)} | {ev} |")
    out.append("")

orph = [r for r in rows if not r["vault_path"] and not r["git_path"]]
orph.sort(key=lambda r: r["skill"])
out.append(f"## Installed but not promoted into a category dir ({len(orph)})\n")
out.append("| skill | in this repo? | defects |")
out.append("|---|---|---|")
for r in orph:
    tags = "".join(t for t in "UELS" if t in r["defects"]) or "-"
    where = ("vendor:`%s`" % r["vendor_path"]) if r["vendor_path"] else "**absent**"
    out.append(f"| `{r['skill']}` | {where} | {tags} |")
out.append("")

multi = [r for r in rows if int(r["severity"]) >= 3]
multi.sort(key=lambda r: -int(r["severity"]))
out.append(f"## Multiple defects at once ({len(multi)})\n")
out.append("| skill | defects | location |")
out.append("|---|---|---|")
for r in multi:
    out.append(f"| `{r['skill']}` | {r['defects']} | {loc(r)} |")
out.append("")

open("docs/skill-capacity-audit/2026-10-25-defect-report.md", "w",
     encoding="utf-8").write("\n".join(out))
print("wrote", len(out), "lines")
for r in multi:
    print(r["severity"], r["skill"], r["defects"], loc(r))