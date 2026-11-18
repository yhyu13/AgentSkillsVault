#!/usr/bin/env python3
"""Store visibility matrix — what each harness store *actually* holds.

Why this exists (SKILL_RADAR 2026-11-13, mechanism D1):
`scripts/verify-install.ps1` proves that every manifest entry is byte-identical in the
store it checks. It cannot see:
  - a store that is declared but empty (`~/.kilo/skills` = 0 entries),
  - store entries that are NOT ours (foreign installers),
  - a manifest skill that is missing from the primary store,
  - whether an entry is a real copy or a junction view.

This prints one row per store: declared? present? how many of the manifest names are
there, how many entries are foreign, and how many are reparse points (junction/symlink).

Read-only: it never writes, deletes or follows a junction.

Usage:
  python store_matrix.py --manifest scripts/install-manifest.txt
  python store_matrix.py --manifest ... --json out.json
"""
import argparse
import json
import os
import stat
import sys

STORES = [".agents", ".claude", ".kilo", ".codex", ".workbuddy", ".hub", ".mavis",
          ".minimax", ".cursor", ".copilot", ".kiro", ".lingma", ".qoder-cn", ".codebuddy"]
FILE_ATTRIBUTE_REPARSE_POINT = 0x400


def read_manifest(path):
    names, bands = [], {}
    with open(path, encoding="utf-8", errors="replace") as f:
        for ln in f:
            ln = ln.strip()
            if not ln or ln.startswith("#"):
                continue
            parts = ln.split("|")
            if len(parts) < 3 or parts[2].startswith("<"):
                continue
            names.append(parts[0])
            bands[parts[0]] = parts[2]
    return names, bands


def is_reparse(path):
    try:
        st = os.lstat(path)
    except OSError:
        return False
    if stat.S_ISLNK(st.st_mode):
        return True
    return bool(getattr(st, "st_file_attributes", 0) & FILE_ATTRIBUTE_REPARSE_POINT)


def scan_store(root):
    """Return {entry_name: {"reparse": bool, "has_skill_md": bool}} for one store."""
    out = {}
    try:
        entries = os.listdir(root)
    except OSError:
        return None
    for e in entries:
        p = os.path.join(root, e)
        out[e] = {
            "reparse": is_reparse(p),
            "has_skill_md": os.path.isfile(os.path.join(p, "SKILL.md")),
        }
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest", default="scripts/install-manifest.txt")
    ap.add_argument("--json", default="")
    ap.add_argument("--home", default=os.path.expanduser("~"))
    args = ap.parse_args()

    manifest, bands = read_manifest(args.manifest)
    mset = set(manifest)
    print(f"manifest: {len(manifest)} skills ({len(mset)} unique) from {args.manifest}\n")

    hdr = f"{'store':<14} {'entries':>7} {'ours':>5} {'foreign':>7} {'reparse':>7} {'no SKILL.md':>11}  {'of manifest present':>19}"
    print(hdr)
    print("-" * len(hdr))

    rows = {}
    for s in STORES:
        root = os.path.join(args.home, s, "skills")
        data = scan_store(root)
        if data is None:
            print(f"{s:<14} {'--':>7} {'--':>5} {'--':>7} {'--':>7} {'--':>11}  (store dir absent)")
            rows[s] = {"state": "absent"}
            continue
        ours = sum(1 for k in data if k in mset)
        foreign = len(data) - ours
        reparse = sum(1 for v in data.values() if v["reparse"])
        no_md = sum(1 for v in data.values() if not v["has_skill_md"])
        pct = f"{ours}/{len(mset)}"
        print(f"{s:<14} {len(data):>7} {ours:>5} {foreign:>7} {reparse:>7} {no_md:>11}  {pct:>19}")
        rows[s] = {"entries": len(data), "ours": ours, "foreign": foreign,
                   "reparse": reparse, "no_skill_md": no_md,
                   "missing_from_manifest": sorted(set(data) - mset)[:40]}

    present = {s: r for s, r in rows.items() if r.get("state") != "absent"}
    best = max(present, key=lambda s: present[s]["ours"]) if present else None
    print(f"\nbest-populated store: {best} ({present[best]['ours']}/{len(mset)})" if best else "\nno store found")
    if best:
        missing = sorted(mset - set(scan_store(os.path.join(args.home, best, "skills"))))
        print(f"manifest skills missing from {best}: {len(missing)}")
        for m in missing[:20]:
            print(f"  - {m}  (band {bands.get(m, '?')})")

    if args.json:
        with open(args.json, "w", encoding="utf-8") as f:
            json.dump({"manifest_size": len(mset), "stores": rows}, f, indent=1)
        print(f"\njson: {args.json}")


if __name__ == "__main__":
    main()
