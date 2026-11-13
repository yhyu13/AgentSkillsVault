#!/usr/bin/env python3
"""How much substance is actually inside a skill library?

One API call per repo (recursive tree, blobs carry `size`). Computes the median
SKILL.md size, the share of stubs (<1 KB), and how many skills ship a
`references/` or `scripts/` payload — i.e. whether the library is hand-written or
generated at scale.

Usage:
  python skill_substance.py --repos-file data/finalists.txt --out data/substance.tsv

Output TSV: repo  n_skill  n_unique  total_kb  median_b  p10_b  p90_b  pct_lt1k  pct_ge2k  with_refs  with_scripts  trunc

`n_unique` counts distinct SKILL.md **content** (git blob sha). Several libraries keep a
real copy of every skill in each harness dotdir (`.claude/skills/X/SKILL.md`,
`.codex/skills/X/SKILL.md`, …), so `n_skill` over-counts the curated set by the number of
mirrors. Rank on `n_unique`, not `n_skill`.
"""
import argparse
import json
import re
import statistics
import subprocess
import sys
import time

SKILL_RE = re.compile(r"(^|/)SKILL\.md$", re.I)


def gh_json(args):
    p = subprocess.run(["gh"] + args, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if p.returncode != 0:
        raise RuntimeError(p.stderr.strip()[:200])
    return json.loads(p.stdout)


def profile(repo):
    d = gh_json(["api", f"repos/{repo}/git/trees/HEAD?recursive=1",
                 "--jq", '{truncated: .truncated, blobs: [.tree[] | select(.type=="blob") | {path, size, sha}]}'])
    blobs = d.get("blobs") or []
    skill_blobs = [b for b in blobs if SKILL_RE.search(b["path"]) and "/" in b["path"]]
    if not skill_blobs:
        return "\t".join([repo] + ["0"] * 11)
    n_unique = len({b.get("sha") for b in skill_blobs})
    skills = [(b["path"].rsplit("/", 1)[0], b.get("size") or 0) for b in skill_blobs]
    sizes = sorted(s for _, s in skills)
    dirs = {p for p, _ in skills}
    with_refs = len({b["path"].rsplit("/", 2)[0] for b in blobs
                     if "/references/" in b["path"] and b["path"].rsplit("/", 2)[0] in dirs})
    with_scripts = len({b["path"].rsplit("/", 2)[0] for b in blobs
                        if "/scripts/" in b["path"] and b["path"].rsplit("/", 2)[0] in dirs})
    n = len(sizes)
    p10 = sizes[max(0, int(n * 0.10) - 1)]
    p90 = sizes[min(n - 1, int(n * 0.90))]
    lt1k = sum(1 for s in sizes if s < 1024) / n
    ge2k = sum(1 for s in sizes if s >= 2048) / n
    return "\t".join([repo, str(n), str(n_unique), f"{sum(sizes)/1024:.0f}", str(int(statistics.median(sizes))),
                      str(int(p10)), str(int(p90)), f"{lt1k:.2f}", f"{ge2k:.2f}",
                      str(with_refs), str(with_scripts), "T" if d.get("truncated") else "-"])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repos-file", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    repos = [ln.strip() for ln in open(args.repos_file, encoding="utf-8-sig") if ln.strip() and not ln.startswith("#")]
    rows = ["\t".join(["repo", "n_skill", "n_unique", "total_kb", "median_b", "p10_b", "p90_b", "pct_lt1k",
                       "pct_ge2k", "with_refs", "with_scripts", "trunc"])]
    for i, r in enumerate(repos, 1):
        try:
            rows.append(profile(r))
            print(f"[{i}/{len(repos)}] {r} ok", file=sys.stderr)
        except Exception as e:  # noqa: BLE001
            rows.append("\t".join([r] + ["ERR"] * 11))
            print(f"[{i}/{len(repos)}] ! {r}: {e}", file=sys.stderr)
        time.sleep(0.2)
    open(args.out, "w", encoding="utf-8").write("\n".join(rows) + "\n")
    print(f"written {args.out}: {len(rows)-1} rows", file=sys.stderr)


if __name__ == "__main__":
    main()
