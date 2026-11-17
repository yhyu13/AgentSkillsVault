# -*- coding: utf-8 -*-
"""Validate a timeline against the fixed spoken-word timing contract."""
import json
import sys
from pathlib import Path

LEAD, GAP, TAIL = 1.4, 0.55, 2.6
payload = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
shots = payload["shots"]
errors = []
if abs(payload["lead"] - LEAD) > .001 or abs(payload["gap"] - GAP) > .001:
    errors.append("lead/gap mismatch")
expected = LEAD
for index, shot in enumerate(shots):
    if abs(shot["audioStart"] - expected) > .02:
        errors.append("%s audio start %.3f != %.3f" % (shot["id"], shot["audioStart"], expected))
    if shot["audioEnd"] < shot["audioStart"] + .5:
        errors.append("%s audio too short" % shot["id"])
    expected = shot["audioEnd"] + GAP
expected_total = shots[-1]["audioEnd"] + TAIL
if abs(payload["total"] - expected_total) > .05:
    errors.append("total %.3f != %.3f" % (payload["total"], expected_total))
if shots[0]["start"] != 0 or shots[-1]["end"] < payload["total"] - .01:
    errors.append("visual coverage has a gap")
for index, shot in enumerate(shots[:-1]):
    if abs(shot["end"] - shots[index + 1]["start"]) > .02:
        errors.append("%s leaves a visual gap before %s" % (shot["id"], shots[index + 1]["id"]))
if errors:
    print("\n".join(errors))
    sys.exit(1)
print("OK shots=%d total=%.2f" % (len(shots), payload["total"]))
