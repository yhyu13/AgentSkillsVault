"""Key-only schema probe for Claude Code transcripts.

Prints the *shape* of transcript records (key names, tool names, tag names) and
never any message text or user content. Safe to run against the local transcript
store.
"""
import json
import os
import glob
from collections import Counter

ROOT = os.path.expanduser("~/.claude/projects")

top_keys = Counter()
record_types = Counter()
msg_roles = Counter()
content_block_types = Counter()
tool_names = Counter()
tool_input_keys = Counter()
slash_cmd_tags = Counter()

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
                if not isinstance(rec, dict):
                    continue
                for k in rec:
                    top_keys[k] += 1
                record_types[rec.get("type")] += 1
                msg = rec.get("message")
                if isinstance(msg, dict):
                    msg_roles[msg.get("role")] += 1
                    content = msg.get("content")
                    if isinstance(content, list):
                        for blk in content:
                            if isinstance(blk, dict):
                                bt = blk.get("type")
                                content_block_types[bt] += 1
                                if bt == "tool_use":
                                    tool_names[blk.get("name")] += 1
                                    inp = blk.get("input")
                                    if isinstance(inp, dict):
                                        for ik in inp:
                                            tool_input_keys[(blk.get("name"), ik)] += 1
                                if bt == "text" and isinstance(blk.get("text"), str):
                                    for tag in ("command-name", "command-message", "command-args",
                                                "skill", "local-command-stdout"):
                                        if "<" + tag + ">" in blk["text"]:
                                            slash_cmd_tags[tag] += 1
    except Exception:
        continue

def show(title, counter, limit=40):
    print(f"\n=== {title} ===")
    for k, v in counter.most_common(limit):
        print(f"  {v:>8}  {k}")

show("top-level record keys", top_keys)
show("record type", record_types)
show("message role", msg_roles)
show("content block type", content_block_types)
show("tool_use name", tool_names)
show("tool_use input keys (tool, key)", tool_input_keys, 60)
show("xml-ish tags seen in text blocks", slash_cmd_tags)
print(f"\nfiles scanned: {len(files)}")
