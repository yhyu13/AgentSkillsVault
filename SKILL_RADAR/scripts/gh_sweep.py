#!/usr/bin/env python3
"""GitHub search-API sweeps for the SKILL_RADAR agent-startup radar.

Usage:
  python gh_sweep.py sweep --out data/sweep.txt --topics 'topic:agent-skills' --topics '"ai employee" in:name,description'
  python gh_sweep.py verify --out data/verify.txt --repo owner/name --repo owner/name

Output TSV: stars, full_name, license, pushed_at, topics(csv), description
Unauthenticated GitHub search: 10 req/min -> sleeps 8s between calls, backs off on 403.
"""
import argparse
import json
import sys
import time
import urllib.parse
import urllib.request

API = "https://api.github.com/search/repositories"
UA = {"User-Agent": "skill-radar", "Accept": "application/vnd.github+json"}


def search(query, per_page=40):
    url = f"{API}?q={urllib.parse.quote(query)}&sort=stars&order=desc&per_page={per_page}"
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:  # noqa: BLE001
            wait = 20 if attempt == 0 else 60
            print(f"  ! {query} -> {e} (retry in {wait}s)", file=sys.stderr)
            time.sleep(wait)
    return None


def row(item):
    lic = (item.get("license") or {}).get("spdx_id", "NONE")
    desc = (item.get("description") or "").replace("\t", " ").replace("\n", " ")
    topics = ",".join(item.get("topics") or [])
    return "\t".join([
        str(item.get("stargazers_count", 0)),
        item.get("full_name", ""),
        lic,
        item.get("pushed_at", ""),
        topics,
        desc,
    ])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["sweep", "verify"])
    ap.add_argument("--out", required=True)
    ap.add_argument("--topics", action="append", default=[])
    ap.add_argument("--repo", action="append", default=[])
    ap.add_argument("--per-page", type=int, default=40)
    ap.add_argument("--queries-file", default="", help="file with one query per line (superset of --topics)")
    args = ap.parse_args()

    if args.queries_file:
        with open(args.queries_file, encoding="utf-8-sig") as f:
            args.topics = [ln.strip() for ln in f if ln.strip() and not ln.startswith("#")]

    rows = []
    if args.mode == "sweep":
        for t in args.topics:
            q = t if (" " not in t and ":" not in t) or t.startswith("topic:") else t
            res = search(q, args.per_page)
            if not res:
                continue
            print(f"# {q} (total {res.get('total_count')})")
            for item in res.get("items", []):
                rows.append(row(item))
            time.sleep(16)
    else:
        repos = args.repo or args.topics
        for r in repos:
            res = search(f"repo:{r}", 1)
            if res and res.get("total_count"):
                for item in res.get("items", []):
                    rows.append(row(item))
            else:
                rows.append(f"NOT_FOUND\t{r}")
            time.sleep(16)

    with open(args.out, "w", encoding="utf-8") as f:
        f.write("\n".join(rows) + "\n")
    print(f"written: {args.out} ({len(rows)} rows)")


if __name__ == "__main__":
    main()
