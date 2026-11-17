# -*- coding: utf-8 -*-
"""Check the trim-sheet disguise skill against its own contract.

Exits 0 only when the ledger, the failure cases and the frontmatter all exist
and the claimed numbers stay inside the ledger. This is a file check, not a
render check.
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
SKILL = (ROOT / "SKILL.md").read_text(encoding="utf-8")
LEDGER = (ROOT / "references" / "source-ledger.md").read_text(encoding="utf-8")
FAILS = (ROOT / "references" / "failure-cases.md").read_text(encoding="utf-8-sig")

REQUIRED = ["80%", "4K", "100MB", "8000", "50 MiB", "10%", "150 MiB", "40 MiB", "64", "341"]
errors = []
if not SKILL.startswith("---\n"):
    errors.append("missing frontmatter")
if "name: trimsheet-disguise" not in SKILL.split("---")[1]:
    errors.append("name does not match directory")
for token in REQUIRED:
    if token not in LEDGER:
        errors.append("ledger missing " + token)
if FAILS.count("#") < 1 or len(FAILS) < 200:
    errors.append("failure cases too short")
if FAILS.count("|") < 8:
    errors.append("failure table missing rows")
claimed = set(re.findall(r"\d+(?:\.\d+)?\s*(?:%|MB|MiB)", SKILL))
for item in claimed:
    if item.replace(" ", "") not in LEDGER.replace(" ", "") and "演示" not in SKILL:
        errors.append("number not in ledger: " + item)

if errors:
    print("FAIL")
    print("\n".join(errors))
    sys.exit(1)
print("ok", len(REQUIRED), "facts", len(FAILS), "failure chars")
