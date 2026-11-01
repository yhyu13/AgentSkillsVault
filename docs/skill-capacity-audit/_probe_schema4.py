"""Fourth key-only probe: session timeline, client version, and skill-visibility signal."""
import json
import os
import glob
from collections import Counter
from datetime import datetime

ROOT = os.path.expanduser("~/.claude/projects")

files = sorted(glob.glob(os.path.join(ROOT, "*", "*.jsonl")))
sessions = {}
versions = Counter()
entrypoints = Counter()
has_listing = Counter()
skill_calls_total = 0

LISTING_MARKERS = (
    "The following skills are available",
    "available for use with the Skill tool",
    "skills are available",
)

for path in files:
    project = os.path.basename(os.path.dirname(path))
    sid = os.path.basename(path)[:-6]
    key = (project, sid)
    st = sessions.setdefault(key, {
        "first": None, "last": None, "cwd": None, "records": 0,
        "skill_calls": 0, "skill_names": Counter(), "listing": False,
    })
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    rec = json.loads(line)
                except Exception:
                    continue
                if not isinstance(rec, dict):
                    continue
                st["records"] += 1
                ts = rec.get("timestamp")
                if ts:
                    if st["first"] is None or ts < st["first"]:
                        st["first"] = ts
                    if st["last"] is None or ts > st["last"]:
                        st["last"] = ts
                if rec.get("cwd") and not st["cwd"]:
                    st["cwd"] = rec["cwd"]
                if rec.get("version"):
                    versions[str(rec["version"])] += 1
                if rec.get("entrypoint"):
                    entrypoints[str(rec["entrypoint"])] += 1
                msg = rec.get("message")
                if not isinstance(msg, dict):
                    continue
                content = msg.get("content")
                blobs = []
                if isinstance(content, str):
                    blobs.append(content)
                elif isinstance(content, list):
                    for blk in content:
                        if not isinstance(blk, dict):
                            continue
                        if blk.get("type") == "tool_use" and blk.get("name") == "Skill":
                            s = (blk.get("input") or {}).get("skill")
                            if s:
                                st["skill_calls"] += 1
                                st["skill_names"][str(s)] += 1
                                skill_calls_total += 1
                        if blk.get("type") == "text" and isinstance(blk.get("text"), str):
                            blobs.append(blk["text"])
                for b in blobs:
                    for m in LISTING_MARKERS:
                        if m in b:
                            st["listing"] = True
                            has_listing[m] += 1
                            break
    except Exception:
        continue

print("=== client version (record count) ===")
for k, v in versions.most_common(12):
    print(f"  {v:>7}  {k}")
print("\n=== entrypoint ===")
for k, v in entrypoints.most_common(12):
    print(f"  {v:>7}  {k}")
print("\n=== sessions containing a skill-listing marker ===")
for k, v in has_listing.most_common():
    print(f"  {v:>7}  {k!r}")

# timeline by month
months = Counter()
for st in sessions.values():
    t = st["first"] or ""
    if len(t) >= 7:
        months[t[:7]] += 1
print("\n=== sessions by first-timestamp month ===")
for k, v in sorted(months.items()):
    print(f"  {v:>5}  {k}")

with_skill = {k: v for k, v in sessions.items() if v["skill_calls"]}
print(f"\ntotal sessions: {len(sessions)}")
print(f"sessions with >=1 Skill tool call: {len(with_skill)}")
print(f"total Skill tool calls: {skill_calls_total}")
print("\n=== sessions with Skill calls (project, date, calls) ===")
for (proj, sid), v in sorted(with_skill.items(), key=lambda kv: -(kv[1]["skill_calls"])):
    print(f"  {v['skill_calls']:>3}  {v['first'][:19] if v['first'] else '?':<20} {proj}")
    for n, c in v["skill_names"].most_common():
        print(f"        -> {n}  x{c}")
