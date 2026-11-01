"""Second key-only probe: how slash-command / skill invocations are recorded."""
import json
import os
import glob
import re
from collections import Counter

ROOT = os.path.expanduser("~/.claude/projects")

content_shape = Counter()
slug_counter = Counter()
cmd_name_counter = Counter()
skill_tool_counter = Counter()
prompt_source = Counter()
user_text_has_cmd = Counter()

CMD_RE = re.compile(r"<command-name>\s*/?([A-Za-z0-9._-]+)\s*</command-name>")
SKILL_TOOL_RE = re.compile(r"^skill$", re.I)

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
                if rec.get("slug"):
                    slug_counter[str(rec.get("slug"))] += 1
                if rec.get("promptSource"):
                    prompt_source[str(rec.get("promptSource"))] += 1
                msg = rec.get("message")
                if not isinstance(msg, dict):
                    continue
                content = msg.get("content")
                if isinstance(content, str):
                    content_shape[("user" if msg.get("role") == "user" else "assistant", "str")] += 1
                    hits = CMD_RE.findall(content)
                    for h in hits:
                        cmd_name_counter[h] += 1
                    if hits:
                        user_text_has_cmd[rec.get("type")] += 1
                elif isinstance(content, list):
                    for blk in content:
                        if not isinstance(blk, dict):
                            continue
                        if blk.get("type") == "tool_use" and blk.get("name") == "Skill":
                            inp = blk.get("input") or {}
                            s = inp.get("skill")
                            if s:
                                skill_tool_counter[str(s)] += 1
                        if blk.get("type") == "text" and isinstance(blk.get("text"), str):
                            hits = CMD_RE.findall(blk["text"])
                            for h in hits:
                                cmd_name_counter[h] += 1
                            if hits:
                                user_text_has_cmd[rec.get("type")] += 1
    except Exception:
        continue

def show(title, counter, limit=60):
    print(f"\n=== {title} ===")
    for k, v in counter.most_common(limit):
        print(f"  {v:>6}  {k}")

show("message content shape", content_shape)
show("promptSource", prompt_source)
show("records whose text contains <command-name> (by record type)", user_text_has_cmd)
show("<command-name> values", cmd_name_counter)
show("Skill tool input.skill values", skill_tool_counter)
show("record 'slug' values", slug_counter)
print(f"\nfiles scanned: {len(files)}")
