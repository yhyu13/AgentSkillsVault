#!/usr/bin/env python3
"""
Fix #1 — frontmatter contract defects.

Two mechanical defects are repaired, nothing else is touched:

  A. UTF-8 BOM in front of a valid `---` fence.
     Strict YAML loaders choke on the BOM, so the skill has no usable
     frontmatter.  Fix: strip the 3 BOM bytes, keep the rest byte-identical.

  B. No `---` fence at all: `name:` / `description:` sit in the body as
     plain text.  Fix: lift that metadata block into a real frontmatter
     header and delete it from the body.  The body (title, sections) is
     otherwise untouched.

Usage:
  python fix_frontmatter.py --root <dir> [<dir> ...] [--dry-run]
"""
import argparse
import re
import sys
from pathlib import Path

KEY_RE = re.compile(r"^([A-Za-z_][A-Za-z0-9_\-]*):(?:\s+(.*))?$")
CONT_RE = re.compile(r"^\s+\S")


def split_meta(lines):
    """Return (meta_lines, start, end) for the contiguous metadata block."""
    start = None
    for i, ln in enumerate(lines):
        if KEY_RE.match(ln) and KEY_RE.match(ln).group(1) == "name":
            start = i
            break
    if start is None:
        return None, None, None
    end = start
    i = start
    in_desc = False
    while i < len(lines):
        ln = lines[i]
        m = KEY_RE.match(ln)
        if m:
            key, val = m.group(1), (m.group(2) or "")
            in_desc = key == "description" and val.strip() in (">", "|", ">-", "|-")
            if not in_desc:
                end = i
            i += 1
            continue
        if in_desc and (CONT_RE.match(ln) or ln.strip() == ""):
            i += 1
            continue
        break
    return lines[start:end + 1], start, end


def fix_file(path: Path, dry: bool):
    raw = path.read_bytes()
    if raw.startswith(b"\xef\xbb\xbf"):
        # defect A: BOM in front of an otherwise valid fence -> strip BOM only
        if not dry:
            path.write_bytes(raw[3:])
        return "BOM"
    text = raw.decode("utf-8", "replace")
    if text.lstrip().startswith("---"):
        return None                      # valid fence, nothing to do
    kind = "NOFENCE"

    lines = text.splitlines()
    meta, start, end = split_meta(lines)
    if not meta:
        return None

    fields = {}
    order = []
    cur = None
    for ln in meta:
        m = KEY_RE.match(ln)
        if m:
            cur = m.group(1)
            fields[cur] = (m.group(2) or "").strip()
            order.append(cur)
        elif cur:
            fields[cur] = (fields[cur] + " " + ln.strip()).strip()

    fm_lines = ["---"]
    for k in order:
        v = fields[k]
        if not v:
            fm_lines.append(f"{k}:")
            continue
        if k == "description" and len(v) > 90:
            fm_lines.append("description: >")
            for chunk in wrap(v, 88):
                fm_lines.append("  " + chunk)
        else:
            fm_lines.append(f"{k}: {v}")
    fm_lines.append("---")
    fm_lines.append("")

    rest = lines[:start] + lines[end + 1:]
    # collapse the blank gap left by the removed metadata block
    while rest and rest[start - 1].strip() == "" and rest[start].strip() == "":
        del rest[start]
    new_text = "\n".join(fm_lines + rest).rstrip() + "\n"

    if not dry:
        path.write_text(new_text, encoding="utf-8", newline="\n")
    return kind


def wrap(text: str, width: int):
    words, line, out = text.split(), "", []
    for w in words:
        if len(line) + len(w) + 1 > width and line:
            out.append(line)
            line = w
        else:
            line = f"{line} {w}".strip()
    if line:
        out.append(line)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", action="append", required=True)
    ap.add_argument("--exclude", action="append", default=[],
                    help="path part to skip (e.g. vendor, .git)")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    counts = {"BOM": 0, "NOFENCE": 0}
    for root in args.root:
        rp = Path(root)
        if not rp.exists():
            continue
        for f in rp.rglob("SKILL.md"):
            if any(part in args.exclude for part in f.parts):
                continue
            try:
                kind = fix_file(f, args.dry_run)
            except Exception as exc:      # never abort the whole sweep
                print(f"ERROR {f}: {exc}")
                continue
            if kind:
                counts[kind] += 1
                print(f"{'DRY ' if args.dry_run else ''}{kind:<8} {f}")
    print(f"\nfixed: BOM={counts['BOM']} NOFENCE={counts['NOFENCE']}"
          f"{' (dry run)' if args.dry_run else ''}")


if __name__ == "__main__":
    sys.exit(main())
