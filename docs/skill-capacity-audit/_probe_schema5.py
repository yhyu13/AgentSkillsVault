"""Fifth key-only probe: per-day coverage + detection of skill-listing text."""
import json
import os
import glob
import re
from collections import Counter, defaultdict

ROOT = os.path.expanduser("~/.claude/projects")

PATTERNS = {
    "listing_available": re.compile(r"skills are available", re.I),
    "listing_skill_tool": re.compile(r"Skill tool", re.I),
    "listing_any_skill": re.compile(r"skill", re.I),
    "reminder": re.compile(r"system-reminder", re.I),
}

files = sorted(glob.glob(os.path.join(ROOT, "*", "*.jsonl")))
by_day = defaultdict(lambda: {"sessions": 0, "records": 0, "skill_calls": 0, "listing": 0})
recent = []

for path in files:
    project = os.path.basename(os.path.dirname(path))
    sid = os.path.basename(path)[:-6]
    first_ts = None
    last_ts = None
    records = 0
    skill_calls = 0
    hit = Counter()
    user_msgs = 0
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
                records += 1
                ts = rec.get("timestamp")
                if ts:
                    if first_ts is None or ts < first_ts:
                        first_ts = ts
                    if last_ts is None or ts > last_ts:
                        last_ts = ts
                msg = rec.get("message")
                if not isinstance(msg, dict):
                    continue
                content = msg.get("content")
                blobs = []
                if isinstance(content, str):
                    blobs.append(content)
                elif isinstance(content, list):
                    for blk in content:
                        if isinstance(blk, dict):
                            if blk.get("type") == "tool_use" and blk.get("name") == "Skill":
                                skill_calls += 1
                            if blk.get("type") == "text" and isinstance(blk.get("text"), str):
                                blobs.append(blk["text"])
                for b in blobs:
                    for name, rx in PATTERNS.items():
                        if rx.search(b):
                            hit[name] += 1
    except Exception:
        continue
    day = (first_ts or "")[:10]
    d = by_day[day]
    d["sessions"] += 1
    d["records"] += records
    d["skill_calls"] += skill_calls
    if hit["listing_available"] or hit["listing_skill_tool"]:
        d["listing"] += 1
    recent.append((last_ts or "", project, sid[:8], records, skill_calls,
                   hit["listing_available"], hit["listing_skill_tool"], hit["listing_any_skill"]))

print("=== per-day session coverage ===")
print(f"{'day':<12}{'sessions':>9}{'records':>9}{'skillcalls':>12}{'with_listing':>14}")
for day in sorted(by_day):
    d = by_day[day]
    print(f"{day:<12}{d['sessions']:>9}{d['records']:>9}{d['skill_calls']:>12}{d['listing']:>14}")

print("\n=== 20 most recent sessions by last timestamp ===")
print(f"{'last_ts':<21}{'project':<52}{'sess':<9}{'recs':>6}{'sk':>4}{'list':>6}{'skTool':>8}{'anySkill':>9}")
for row in sorted(recent, reverse=True)[:20]:
    ts, proj, sid, recs, sc, la, lst, anysk = row
    print(f"{ts[:19]:<21}{proj[:50]:<52}{sid:<9}{recs:>6}{sc:>4}{la:>6}{lst:>8}{anysk:>9}")
