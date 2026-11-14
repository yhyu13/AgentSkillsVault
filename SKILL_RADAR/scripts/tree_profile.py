#!/usr/bin/env python3
"""Measure "vault shape" of a GitHub repo — is it a curated multi-skill library like AgentSkillsVault?

Uses ONE API call per repo (recursive git tree at HEAD), so a 250-repo scan costs 250 core requests.

Usage:
  python tree_profile.py --repos-file data/candidates-vault-peers.txt --out data/profile-vault-peers.tsv

Output TSV columns:
  repo  stars_placeholder  n_skill  n_cat  max_depth  n_files  truncated  tooling  ci  tests  docs
  curation  flat  top_dirs  cat_sample  license_missing
"""
import argparse
import json
import re
import subprocess
import sys
import time

SKILL_RE = re.compile(r"(^|/)SKILL\.md$", re.I)
TOOLING_RE = re.compile(r"(^|/)(scripts?|tools?|bin)/.*\.(ps1|sh|py|js|ts|mjs)$", re.I)
MANIFEST_RE = re.compile(r"(manifest|install|sync|verify|lock|registry|catalog)", re.I)
CURATION_RE = re.compile(r"(removed|retire|deprecat|provenance|score|tier|quality|audit|governance|inventory|adoption|attribution)", re.I)


def gh_json(args):
    p = subprocess.run(["gh"] + args, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if p.returncode != 0:
        raise RuntimeError(p.stderr.strip()[:200])
    return json.loads(p.stdout)


def profile(repo):
    data = gh_json([f"api", f"repos/{repo}/git/trees/HEAD?recursive=1",
                    "--jq", "{truncated: .truncated, paths: [.tree[] | select(.type==\"blob\") | .path], trees: [.tree[] | select(.type==\"tree\") | .path]}"])
    paths = data.get("paths") or []
    trees = data.get("trees") or []
    skill_paths = [p for p in paths if SKILL_RE.search(p)]
    skill_dirs = sorted({p.rsplit("/", 1)[0] for p in skill_paths if "/" in p} or {"."})
    cats = set()
    depth = {}
    for d in skill_dirs:
        parts = d.split("/")
        depth[len(parts)] = depth.get(len(parts), 0) + 1
        if len(parts) > 1:
            cats.add(parts[0])
    top_level = sorted({p.split("/")[0] for p in paths if "/" in p})
    tooling = sorted({p for p in paths if TOOLING_RE.search(p)})
    manifests = sorted({p for p in paths if MANIFEST_RE.search(p) and p.count("/") <= 2 and p.lower().endswith((".ps1", ".py", ".sh", ".js", ".ts", ".txt", ".json", ".yaml", ".yml"))})
    curation = sorted({p for p in paths if CURATION_RE.search(p) and p.count("/") == 0})
    has_ci = any(p.startswith(".github/workflows/") for p in paths)
    has_tests = any(p.lower().startswith("test") for p in paths) or any("/tests/" in p.lower() for p in paths)
    has_docs = any(p.startswith("docs/") for p in paths)
    has_license = any(p.upper().startswith("LICENSE") for p in paths)
    max_depth = max(depth) if depth else 0
    flat = depth.get(1, 0)
    row = [
        repo, str(len(skill_paths)), str(len(cats)), str(max_depth), str(len(paths)),
        "T" if data.get("truncated") else "-",
        str(len(tooling)), "Y" if has_ci else "-", "Y" if has_tests else "-", "Y" if has_docs else "-",
        "Y" if curation else "-", str(flat),
        "|".join(top_level[:12]), "|".join(sorted(cats)[:10]), "" if has_license else "NOLICENSE",
        "|".join(manifests[:6]),
    ]
    return "\t".join(row)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repos-file", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--min-skills", type=int, default=0, help="only keep rows with at least N SKILL.md")
    args = ap.parse_args()

    with open(args.repos_file, encoding="utf-8-sig") as f:
        repos = [ln.strip() for ln in f if ln.strip() and not ln.startswith("#")]

    header = "\t".join(["repo", "n_skill", "n_cat", "max_depth", "n_files", "trunc", "n_tooling",
                        "ci", "tests", "docs", "curation", "flat_skills", "top_dirs", "cat_sample",
                        "license", "manifest_hits"])
    rows = [header]
    for i, r in enumerate(repos, 1):
        try:
            row = profile(r)
        except Exception as e:  # noqa: BLE001
            rows.append("\t".join([r] + ["ERR"] * 15))
            print(f"[{i}/{len(repos)}] ! {r}: {e}", file=sys.stderr)
            continue
        if args.min_skills and int(row.split("\t")[1]) < args.min_skills:
            print(f"[{i}/{len(repos)}] . {r}: {row.split(chr(9))[1]} skills (dropped)", file=sys.stderr)
            continue
        rows.append(row)
        print(f"[{i}/{len(repos)}] + {r}: {row.split(chr(9))[1]} skills", file=sys.stderr)
        time.sleep(0.15)
    with open(args.out, "w", encoding="utf-8") as f:
        f.write("\n".join(rows) + "\n")
    print(f"written {args.out}: {len(rows)-1} rows", file=sys.stderr)


if __name__ == "__main__":
    main()
