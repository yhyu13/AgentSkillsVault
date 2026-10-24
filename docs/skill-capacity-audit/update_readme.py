"""Remove retired skills from README.md without touching the file's existing
byte-level encoding damage (the file contains lossy '?' substitutions, so it is
NOT valid UTF-8 - all surgery is done on bytes).

Two shapes are handled:
  1. table rows  "| <cat>/<name> | <cat> | <desc> |"   -> drop the whole row
  2. tree tokens "<name>/" inside a grouped tree line      -> drop the token
"""
import json, re, sys
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8")

plan = json.load(open("docs/skill-capacity-audit/2026-10-25-removal-plan.json",
                      encoding="utf-8"))
removed_paths = set()
for n, p in plan.items():
    for rel in p["repo_delete"]:
        removed_paths.add(rel)                      # e.g. design/storyboard
        removed_paths.add(rel.rsplit("/", 1)[0])     # e.g. video (category)
names = set(plan.keys())

p = Path("README.md")
raw = p.read_bytes()
lines = raw.split(b"\r\n")

# ---------- 1. table rows ----------
kept, dropped_rows = [], 0
for l in lines:
    if l.startswith(b"|"):
        cells = [c.strip() for c in l.strip().strip(b"|").split(b"|")]
        if cells:
            path = cells[0].decode("utf-8", "replace").rstrip("/")
            if path in removed_paths:
                dropped_rows += 1
                continue
    kept.append(l)
lines = kept

# ---------- 2. tree tokens ----------
dropped_tokens = 0
for i, l in enumerate(lines):
    new = l
    for n in names:
        pat = re.compile(rb"(^|[ \t])" + re.escape(n.encode()) + rb"/")
        new2, cnt = pat.subn(rb"\1", new)
        if cnt:
            dropped_tokens += cnt
            new = new2
    lines[i] = new

# ---------- 3. pointer to the tombstone ----------
note = [
    b"## Retired skills",
    b"",
    b"67 skills were removed on 2026-10-25 after the defect audit flagged them as",
    b"never usable, carrying error references, low quality, or not standalone.",
    b"See `REMOVED-SKILLS.md` for the list, the reason for each, and the upstream",
    b"`vendor/` copy kept for re-adding. `.kilo/removed-skills.txt` stops the sync",
    b"script from reinstalling them.",
    b"",
]
# insert before the final section separator / at the end of the file
lines = lines + [b""] + note

p.write_bytes(b"\r\n".join(lines))
print(f"README.md: dropped {dropped_rows} table rows, {dropped_tokens} tree tokens")
