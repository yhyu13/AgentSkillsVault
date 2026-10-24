"""Mark retired skills inside INSTRUCTION.md's provenance tables.

The provenance record is kept (it says where a skill came from, which is what
you need to re-add it once fixed), but every retired skill is now tagged so a
reader can tell at a glance that it is no longer installed.
"""
import json, re, sys
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8")

plan = json.load(open("docs/skill-capacity-audit/2026-10-25-removal-plan.json",
                      encoding="utf-8"))
names = sorted(plan)
tok = {n: re.compile(r"(?<![\w-])" + re.escape(n) + r"(?![\w-])") for n in names}

p = Path("INSTRUCTION.md")
text = p.read_text(encoding="utf-8")
lines = text.split("\n")
out, tagged_rows, tagged_tokens = [], 0, 0

for l in lines:
    if l.startswith("|") and "---" not in l:
        cells = l.split("|")
        head = cells[1] if len(cells) > 2 else ""
        new_head, hit = head, False
        for n in names:
            if tok[n].search(new_head):
                new_head = tok[n].sub(lambda m, n=n: f"{m.group(0)} (retired)", new_head)
                hit = True
                tagged_tokens += 1
        if hit:
            cells[1] = new_head
            l = "|".join(cells)
            tagged_rows += 1
    out.append(l)

text = "\n".join(out)

note = (
    "> **Retired skills (2026-10-25).** 67 skills were removed from the vault and from\n"
    "> every harness store after the defect audit flagged them as *never usable*,\n"
    "> carrying *error references*, *low quality*, or *not standalone*. The origin rows\n"
    "> below are kept for provenance and are tagged `(retired)`, but those skills are no\n"
    "> longer installed. See `REMOVED-SKILLS.md` for the reason per skill and the\n"
    "> upstream `vendor/` copy kept for re-adding; `.kilo/removed-skills.txt` stops the\n"
    "> sync script from reinstalling them.\n"
    "\n"
)
anchor = "> **Rule:** every skill in this vault is a **copy of**"
if anchor in text:
    text = text.replace(anchor, note + anchor, 1)
else:
    text = note + text

p.write_text(text, encoding="utf-8")
print(f"INSTRUCTION.md: tagged {tagged_tokens} tokens across {tagged_rows} rows")
