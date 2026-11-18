#!/usr/bin/env python3
"""Provenance coverage — how much of "where did this skill come from" is machine-readable today?

Mechanism D2 from `SKILL_RADAR/2026-11-13-agent-skill-vault-peers-top20.md`: peers ship a
`skills-lock.json` where provenance is data. Here it is a Markdown table in `INSTRUCTION.md`.
This script measures the gap without changing anything:

  1. parse every provenance row  `| skill | origin | source |`
  2. explode multi-skill rows (`a / b + c`, `(retired)` suffixes, backticks)
  3. join against the install manifest (the set of skills that actually matter)
  4. report coverage, origin-type mix, and how many `repo` rows name a resolvable source

Read-only. Nothing is written except the optional --json report.

Usage:
  python provenance_coverage.py --manifest scripts/install-manifest.txt --instruction INSTRUCTION.md
"""
import argparse
import json
import os
import re
import sys

SPLIT_RE = re.compile(r"\s*(?:/|\+|、|,| and )\s*")
CLEAN_RE = re.compile(r"[`*]|\((?:retired|submodule|vendored|distilled|local|wrapped)[^)]*\)", re.I)
URL_RE = re.compile(r"github\.com/([\w.-]+/[\w.-]+)")
VENDOR_RE = re.compile(r"`?(vendor/[\w.-]+)")
BACKTICK_RE = re.compile(r"`([^`]+)`")


def read_manifest(path):
    """[(name, vault_path)] for every installed row."""
    out = []
    for ln in open(path, encoding="utf-8", errors="replace"):
        t = ln.strip()
        if not t or t.startswith("#") or t.count("|") < 2:
            continue
        parts = t.split("|")
        if parts[2].strip().upper() in ("C", "HOST"):
            continue
        out.append((parts[0].strip(), parts[1].strip()))
    return out


PATH_TOKEN_RE = re.compile(r"([a-z][a-z0-9-]*/[a-z0-9 ._*-]+)")


def parse_submodule_table(path):
    """Rows of the `| vendor/... | repo | commit | licence | 装 <paths> |` table."""
    rows, on = [], False
    for ln in open(path, encoding="utf-8", errors="replace"):
        t = ln.rstrip()
        if t.startswith("| `vendor/") or t.startswith("| vendor/"):
            cells = [c.strip() for c in t.strip("|").split("|")]
            if len(cells) < 5:
                continue
            rows.append({"vendor": cells[0].strip("` "), "repo": cells[1].strip("` "),
                         "commit": cells[2].strip("` "), "licence": cells[3],
                         "installed_text": "|".join(cells[4:])})
    return rows


def glob_links(manifest_rows, sub_rows):
    """Map skill name -> submodule row when the row's installed text names a path prefix."""
    linked = {}
    for name, vault_path in manifest_rows:
        vp = vault_path[len("SKILL/"):] if vault_path.startswith("SKILL/") else vault_path
        for r in sub_rows:
            txt = r["installed_text"]
            for tok in PATH_TOKEN_RE.findall(txt):
                tok = tok.split("（")[0].strip().strip("*/ ")
                if tok and vp.startswith(tok.rstrip("/")):
                    linked.setdefault(name, r)
                    break
            if name in linked:
                break
    return linked


def parse_rows(path):
    """Yield dicts for every 3-column provenance row in an INSTRUCTION-style table."""
    rows, in_table = [], False
    for lineno, ln in enumerate(open(path, encoding="utf-8", errors="replace"), 1):
        t = ln.rstrip("\n")
        if t.startswith("| skill |") or t.startswith("| 模板 |"):
            in_table = True
            continue
        if in_table:
            if not t.startswith("|"):
                in_table = False
                continue
            if re.match(r"^\|[\s:|-]+\|$", t):
                continue
            cells = [c.strip() for c in t.strip("|").split("|")]
            if len(cells) < 3:
                continue
            rows.append({"line": lineno, "skill_cell": cells[0], "origin": cells[1], "source": cells[2]})
    return rows


def names_in(cell):
    out = []
    for chunk in SPLIT_RE.split(cell):
        c = CLEAN_RE.sub("", chunk).strip(" .`")
        if not c or len(c) > 60:
            continue
        if " " in c and not re.match(r"^[\w.-]+$", c):
            # a sentence, not a skill name — keep only the leading token if it looks like one
            c = c.split()[0].strip("()`")
        if re.match(r"^[a-z0-9][a-z0-9._-]{2,}$", c):
            out.append(c)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest", default="scripts/install-manifest.txt")
    ap.add_argument("--instruction", default="INSTRUCTION.md")
    ap.add_argument("--json", default="")
    args = ap.parse_args()

    manifest_rows = read_manifest(args.manifest)
    manifest = [n for n, _ in manifest_rows]
    rows = parse_rows(args.instruction)
    sub_rows = parse_submodule_table(args.instruction)
    print(f"manifest: {len(manifest)} installed skills | provenance rows parsed: {len(rows)} from {args.instruction}\n")

    index = {}
    for r in rows:
        for n in names_in(r["skill_cell"]):
            index.setdefault(n, []).append(r)

    covered = [n for n in manifest if n in index]
    globbed = glob_links(manifest_rows, sub_rows)
    only_glob = [n for n in manifest if n not in index and n in globbed]
    uncovered = [n for n in manifest if n not in index and n not in globbed]
    print(f"submodule-table rows parsed: {len(sub_rows)}")
    print(f"per-skill provenance row:      {len(covered)}/{len(manifest)} ({len(covered)*100//max(1,len(manifest))}%)")
    print(f"+ linked only via a glob row:  {len(only_glob)}  ->  machine-resolvable {len(covered)+len(only_glob)}/{len(manifest)} "
          f"({(len(covered)+len(only_glob))*100//max(1,len(manifest))}%)")
    print(f"no provenance at all:          {len(uncovered)}")
    for n in uncovered[:30]:
        print(f"  ? {n}")
    if len(uncovered) > 30:
        print(f"  ... and {len(uncovered)-30} more")

    kinds = {}
    for n in covered:
        k = index[n][0]["origin"]
        k = re.sub(r"[\s(].*$", "", k) or "other"
        kinds[k] = kinds.get(k, 0) + 1
    print(f"\norigin-type mix over covered skills: {dict(sorted(kinds.items(), key=lambda x: -x[1]))}")

    no_src = [n for n in covered if not (URL_RE.search(index[n][0]["source"]) or BACKTICK_RE.search(index[n][0]["source"]))]
    print(f"covered skills whose source cell names no repo URL and no path: {len(no_src)}")
    for n in no_src[:10]:
        print(f"  ! {n}: {index[n][0]['source'][:90]}")

    repos = {}
    for n in covered:
        m = URL_RE.search(index[n][0]["source"])
        if m:
            repos.setdefault(m.group(1), []).append(n)
    # authoritative repo -> vendor mapping comes from .gitmodules, not directory names
    declared = {}
    try:
        for ln in open(".gitmodules", encoding="utf-8", errors="replace"):
            m = re.search(r"url\s*=\s*https://github\.com/([\w.-]+/[\w.-]+?)(?:\.git)?\s*$", ln.strip())
            if m:
                declared[m.group(1).lower()] = True
            m2 = re.search(r"path\s*=\s*(.+)$", ln.strip())
            if m2:
                declared.setdefault("_paths", set())
    except OSError:
        pass
    vendor_missing = []
    for url, skills in sorted(repos.items()):
        if url.lower() in declared:
            continue
        vendor_missing.append((url, len(skills)))
    print(f"\ndistinct upstream repos referenced: {len(repos)}")
    print(f"of those, no matching vendor/<dir>: {len(vendor_missing)}")
    for u, c in vendor_missing[:12]:
        print(f"  x {u}  ({c} skill{'s' if c > 1 else ''})")

    if args.json:
        json.dump({"manifest": len(manifest), "covered": len(covered), "uncovered": uncovered,
                   "origin_mix": kinds, "repos": {k: len(v) for k, v in repos.items()},
                   "vendor_missing": vendor_missing}, open(args.json, "w", encoding="utf-8"), indent=1)
        print(f"\njson: {args.json}")


if __name__ == "__main__":
    main()
