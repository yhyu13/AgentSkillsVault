from pathlib import Path

p = Path("REMOVED-SKILLS.md")
t = p.read_text(encoding="utf-8")

row = ("| `orchestrate` | L (never loadable) | _(no promoted copy - removed outright)_ "
       "| _(no vendor copy - removed outright)_ |\n")
anchor = "| `media-use`"
i = t.find(anchor)
j = t.find("\n", i) + 1
t = t[:j] + row + t[j:]

note = ("## Retired skills - 2026-10-25 defect audit\n\n"
        "> `orchestrate` is listed too: it was an empty orphan directory with no\n"
        "> `SKILL.md`, so no harness could ever load it. It had no upstream source and\n"
        "> was removed rather than kept as a dangling entry.\n")
t = t.replace("## Retired skills - 2026-10-25 defect audit\n", note, 1)

p.write_text(t, encoding="utf-8")
print("tombstone updated; skill rows:", t.count("\n| `"))
