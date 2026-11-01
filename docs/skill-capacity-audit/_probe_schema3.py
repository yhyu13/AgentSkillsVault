"""Third key-only probe: locate the marker for slash-command skill invocations."""
import json
import os
import glob
import re
from collections import Counter

ROOT = os.path.expanduser("~/.claude/projects")

MARKERS = [
    "command-message", "command-args", "command-contents", "command-stdout",
    "local-command-stdout", "skill-invocation", "available-skills",
    "available skills", "user-invocable-only", "system-reminder",
]
marker_hits = Counter()
slash_first_token = Counter()
slash_all_tokens = Counter()
user_msg_shapes = Counter()

files = sorted(glob.glob(os.path.join(ROOT, "*", "*.jsonl")))
for path in files:
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
                if not isinstance(rec, dict) or rec.get("type") != "user":
                    continue
                msg = rec.get("message")
                if not isinstance(msg, dict):
                    continue
                content = msg.get("content")
                blobs = []
                if isinstance(content, str):
                    user_msg_shapes["str"] += 1
                    blobs.append(content)
                elif isinstance(content, list):
                    user_msg_shapes["list"] += 1
                    for blk in content:
                        if isinstance(blk, dict) and blk.get("type") == "text" \
                                and isinstance(blk.get("text"), str):
                            blobs.append(blk["text"])
                for b in blobs:
                    low = b.lower()
                    for m in MARKERS:
                        if m in low:
                            marker_hits[m] += 1
                    # leading slash command?
                    m = re.match(r"^\s*/([A-Za-z0-9._:-]+)", b)
                    if m:
                        slash_first_token[m.group(1)] += 1
                    for tok in re.findall(r"(?<![\w/])/([A-Za-z0-9._-]{2,40})", b):
                        slash_all_tokens[tok] += 1
    except Exception:
        continue

def show(title, counter, limit=45):
    print(f"\n=== {title} ===")
    for k, v in counter.most_common(limit):
        print(f"  {v:>6}  {k}")

show("user message content shape", user_msg_shapes)
show("marker hits in user messages", marker_hits)
show("leading /token in user messages", slash_first_token)
show("any /token in user messages", slash_all_tokens)
print(f"\nfiles scanned: {len(files)}")
