#!/usr/bin/env python3
"""Merge the sweep (stars/pushed_at/license) with the tree profile (vault shape) and score peers.

Vault-shape score (VSS, 0-10) — five dimensions, each scored from a measured fact:
  Scale      0-2.5  SKILL.md count (the vault's payload)
  Structure  0-2.5  distinct top-level category dirs holding skills + tree depth
  Tooling    0-2.0  install/sync/manifest scripts, CI, tests
  Curation   0-2.0  provenance/retire/score/audit docs, LICENSE present
  Liveness   0-1.0  pushed_at recency

Usage:
  python merge_score.py --sweep data/sweep-vault-peers.txt \
      --profile data/profile-vault-peers.tsv data/profile-vault-peers-pass2.tsv \
      --out data/peers-scored.tsv --min-skills 10
"""
import argparse
import datetime as dt
import json
import math
import subprocess
import sys

TODAY = dt.date.today()


def load_sweep(paths):
    meta = {}
    for p in paths:
        with open(p, encoding="utf-8-sig") as f:
            for ln in f:
                c = ln.rstrip("\n").split("\t")
                if len(c) < 6:
                    continue
                meta[c[1]] = {"stars": int(c[0] or 0), "license": c[2], "pushed": c[3], "topics": c[4], "desc": c[5]}
    return meta


def load_profile(paths):
    rows = {}
    for p in paths:
        with open(p, encoding="utf-8-sig") as f:
            head = f.readline().rstrip("\n").split("\t")
            for ln in f:
                c = ln.rstrip("\n").split("\t")
                if len(c) < len(head):
                    continue
                rows[c[0]] = dict(zip(head, c))
    return rows


def score_scale(n):
    if n >= 200: return 2.5
    if n >= 100: return 2.3
    if n >= 50: return 2.0
    if n >= 20: return 1.5
    if n >= 10: return 1.0
    return 0.5


def score_structure(cats, depth):
    if cats >= 12 and depth >= 3: return 2.5
    if cats >= 8: return 2.2
    if cats >= 4: return 1.8
    if cats >= 2: return 1.2
    return 0.4


def score_tooling(t, ci, tests):
    s = 1.0 if t >= 3 else (0.5 if t >= 1 else 0.0)
    return s + (0.5 if ci == "Y" else 0) + (0.5 if tests == "Y" else 0)


def score_curation(cur, lic):
    return (1.0 if cur == "Y" else 0.0) + (1.0 if lic != "NOLICENSE" else 0.0)


def score_live(pushed):
    try:
        d = dt.date.fromisoformat(pushed[:10])
    except Exception:  # noqa: BLE001
        return 0.0
    age = (TODAY - d).days
    if age <= 30: return 1.0
    if age <= 90: return 0.7
    if age <= 180: return 0.4
    return 0.1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sweep", nargs="+", required=True)
    ap.add_argument("--profile", nargs="+", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--min-skills", type=int, default=10)
    args = ap.parse_args()

    meta = load_sweep(args.sweep)
    prof = load_profile(args.profile)

    out = []
    for repo, r in prof.items():
        if r.get("n_skill") in (None, "ERR"):
            continue
        n = int(r["n_skill"] or 0)
        if n < args.min_skills:
            continue
        m = meta.get(repo, {})
        stars = m.get("stars", 0)
        lic = r.get("license") or m.get("license") or "NONE"
        if lic in ("", "NONE"):
            lic = "NOLICENSE"
        pushed = m.get("pushed", "")
        cats = int(r["n_cat"] or 0)
        depth = int(r["max_depth"] or 0)
        vss = (score_scale(n) + score_structure(cats, depth) + score_tooling(int(r["n_tooling"] or 0), r["ci"], r["tests"])
               + score_curation(r["curation"], lic) + score_live(pushed))
        out.append({
            "repo": repo, "stars": stars, "vss": round(vss, 2), "skills": n, "cats": cats,
            "depth": depth, "tooling": int(r["n_tooling"] or 0), "ci": r["ci"], "tests": r["tests"],
            "docs": r["docs"], "curation": r["curation"], "license": lic, "pushed": pushed[:10],
            "files": int(r["n_files"] or 0), "top_dirs": r["top_dirs"], "cat_sample": r["cat_sample"],
            "manifest": r["manifest_hits"], "desc": m.get("desc", ""),
        })
    out.sort(key=lambda x: (-x["vss"], -x["stars"]))
    cols = ["repo", "stars", "vss", "skills", "cats", "depth", "tooling", "ci", "tests", "docs",
            "curation", "license", "pushed", "files", "manifest", "cat_sample", "top_dirs", "desc"]
    with open(args.out, "w", encoding="utf-8") as f:
        f.write("\t".join(cols) + "\n")
        for o in out:
            f.write("\t".join(str(o[c]) for c in cols) + "\n")
    print(f"written {args.out}: {len(out)} rows", file=sys.stderr)


if __name__ == "__main__":
    main()
