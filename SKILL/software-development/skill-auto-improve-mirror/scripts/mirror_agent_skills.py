#!/usr/bin/env python3
"""Mirror Hermes skills -> ~/.agents/skills/ (Agent Skills spec), version-aware.

Copies each Hermes SKILL.md into the cross-tool skills dir, flattening category
subdirs into flat <name>/ folders and normalizing frontmatter. Update-aware and
conflict-safe: never renames, never clobbers target-side edits.

Usage:
  python3 mirror_agent_skills.py [--source DIR] [--target DIR] [--apply] [--dry-run]
"""
import argparse
import os
import re
import shutil
import sys
from pathlib import Path

HOME = Path.home()
DEFAULT_SOURCE = None
for cand in (
    os.environ.get("HERMES_HOME"),
    str(HOME / ".hermes"),
    os.path.join(os.environ.get("LOCALAPPDATA", ""), "hermes"),
):
    if cand and Path(cand, "skills").is_dir():
        DEFAULT_SOURCE = str(Path(cand, "skills"))
        break

FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)


def parse_frontmatter(text):
    """Return (metadata_dict, body). metadata has top-level keys plus a 'metadata' sub-dict."""
    m = FRONTMATTER_RE.match(text)
    if not m:
        return {}, text
    raw = m.group(1)
    body = text[m.end():]
    meta = {}
    cur = meta
    for line in raw.splitlines():
        if ":" not in line:
            continue
        indent = len(line) - len(line.lstrip())
        key, _, val = line.partition(":")
        key, val = key.strip(), val.strip().strip("'\"")
        if indent == 0:
            if val == "":
                cur = {}
                meta[key] = cur
            else:
                meta[key] = val
        else:
            cur[key] = val
    return meta, body


def get_version(meta):
    v = meta.get("version", "").strip()
    if v:
        return v
    sub = meta.get("metadata")
    if isinstance(sub, dict):
        return sub.get("version", "").strip()
    return ""


def version_tuple(v):
    parts = re.split(r"[.\-+]", v)
    out = []
    for p in parts:
        digits = re.sub(r"\D", "", p)
        out.append(int(digits) if digits else 0)
    return tuple(out)


def normalize(name, description, version, meta):
    """Build spec-clean frontmatter + return normalized SKILL.md content."""
    lines = ["---", f"name: {name}", f"description: {description}"]
    lic = meta.get("license", "").strip()
    if lic:
        lines.append(f"license: {lic}")
    sub = meta.get("metadata")
    kv = dict(sub) if isinstance(sub, dict) else {}
    if version:
        kv["version"] = version
    for k in ("author", "version"):
        top = meta.get(k)
        if top and k not in kv:
            kv[k] = str(top).strip()
    if kv:
        lines.append("metadata:")
        for k, v in kv.items():
            lines.append(f"  {k}: {v}")
    lines.append("---")
    return "\n".join(lines) + "\n"


def find_skills(source):
    """Yield (name, skill_dir, SKILL.md_path) for every SKILL.md under source."""
    for p in sorted(Path(source).rglob("SKILL.md")):
        yield p.parent, p


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", default=DEFAULT_SOURCE)
    ap.add_argument("--target", default=str(HOME / ".agents" / "skills"))
    ap.add_argument("--apply", action="store_true", help="write changes (default: dry-run)")
    ap.add_argument("--dry-run", action="store_true", help="explicit dry-run (default; no writes)")
    args = ap.parse_args()

    if not args.source or not Path(args.source).is_dir():
        print(f"ERROR: no source skills dir found (tried HERMES_HOME, ~/.hermes, LOCALAPPDATA).", file=sys.stderr)
        sys.exit(1)

    source = Path(args.source)
    target = Path(args.target)
    print(f"source: {source}")
    print(f"target: {target}")
    print(f"mode:   {'APPLY' if args.apply else 'DRY-RUN'}\n")

    rows = []  # (action, name, version_note)
    for skill_dir, sk in find_skills(source):
        meta, body = parse_frontmatter(sk.read_text(encoding="utf-8"))
        name = meta.get("name", "").strip()
        if not name:
            rows.append(("SKIP (no name)", sk.parent.name, ""))
            continue
        description = meta.get("description", "").strip()
        src_ver = get_version(meta)

        tdir = target / name
        tsk = tdir / "SKILL.md"

        if not tsk.exists():
            action, vnote = "COPY", f"{src_ver or '-'} -> new"
        else:
            tmeta, tbody = parse_frontmatter(tsk.read_text(encoding="utf-8"))
            tgt_ver = get_version(tmeta)
            if not src_ver or not tgt_ver:
                action, vnote = "CONFLICT (missing version)", f"{src_ver or '-'} / {tgt_ver or '-'}"
            elif version_tuple(src_ver) > version_tuple(tgt_ver):
                action, vnote = "UPDATE", f"{tgt_ver} -> {src_ver}"
            elif version_tuple(tgt_ver) > version_tuple(src_ver):
                action, vnote = "SKIP (target ahead)", f"{src_ver} < {tgt_ver}"
            elif tbody.strip() != body.strip():
                action, vnote = "CONFLICT (equal ver, diff body)", f"{src_ver}"
            else:
                action, vnote = "UNCHANGED", f"{src_ver}"

        rows.append((action, name, vnote))

        if args.apply and action in ("COPY", "UPDATE"):
            tdir.mkdir(parents=True, exist_ok=True)
            for item in skill_dir.iterdir():
                if item.name in ("SKILL.md",) or item.name == "__pycache__":
                    continue
                dst = tdir / item.name
                if item.is_dir():
                    if dst.exists():
                        shutil.rmtree(dst)
                    shutil.copytree(item, dst)
                else:
                    shutil.copy2(item, dst)
            tsk.write_text(normalize(name, description, src_ver, meta) + body, encoding="utf-8")

    # report
    print(f"{'ACTION':<32} {'VERSION':<24} NAME")
    for action, name, vnote in rows:
        print(f"{action:<32} {vnote:<24} {name}")

    counts = {}
    for action, _, _ in rows:
        key = action.split()[0]
        counts[key] = counts.get(key, 0) + 1
    print("\nsummary: " + ", ".join(f"{k}={v}" for k, v in sorted(counts.items())))
    if not args.apply:
        print("DRY-RUN: no files written. Re-run with --apply to write.")


if __name__ == "__main__":
    main()
