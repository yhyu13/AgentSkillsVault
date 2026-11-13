#!/usr/bin/env python3
"""Authenticated GitHub search sweep for the "skill-vault peers" radar.

Difference from gh_sweep.py: it shells out to the authenticated `gh` CLI, so the
search quota is 30 req/min (not 10) and the account's token scopes apply.

Usage:
  python gh_scan_vaults.py sweep   --queries-file data/queries-vault-peers.txt --out data/sweep-vault-peers.txt
  python gh_scan_vaults.py verify  --repos-file  data/verify-vault-peers.txt  --out data/verify-vault-peers.txt

Output (sweep):   stars \t full_name \t license \t pushed_at \t topics \t description
Output (verify):  stars \t full_name \t license \t pushed_at \t size_kb \t default_branch \t fork \t archived \t description
"""
import argparse
import json
import subprocess
import sys
import time

FIELDS_SWEEP = ("stargazers_count", "full_name", "license", "pushed_at", "topics", "description")


def gh(args):
    p = subprocess.run(["gh"] + args, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if p.returncode != 0:
        raise RuntimeError(f"gh {' '.join(args)} -> {p.returncode}: {p.stderr.strip()[:300]}")
    return p.stdout


def gh_json(args):
    return json.loads(gh(args))


def lic_of(item):
    return (item.get("license") or {}).get("spdx_id") or "NONE"


def clean(s):
    return (s or "").replace("\t", " ").replace("\n", " ").replace("\r", " ")


def search(query, per_page):
    out = gh([
        "api", "-X", "GET", "search/repositories",
        "-f", f"q={query}", "-f", "sort=stars", "-f", "order=desc",
        "-f", f"per_page={per_page}",
        "--jq", "{total: .total_count, items: [.items[] | {stargazers_count, full_name, license, pushed_at, topics, description}]}",
    ])
    return json.loads(out)


def repo_get(full_name):
    return gh_json(["api", f"repos/{full_name}", "--jq",
                    "{stargazers_count, full_name, license, pushed_at, size, default_branch, fork, archived, description}"])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["sweep", "verify"])
    ap.add_argument("--out", required=True)
    ap.add_argument("--queries-file", default="")
    ap.add_argument("--repos-file", default="")
    ap.add_argument("--per-page", type=int, default=100)
    ap.add_argument("--sleep", type=float, default=2.5)
    args = ap.parse_args()

    if args.mode == "sweep":
        with open(args.queries_file, encoding="utf-8-sig") as f:
            queries = [ln.strip() for ln in f if ln.strip() and not ln.startswith("#")]
        seen = {}
        for q in queries:
            try:
                res = search(q, args.per_page)
            except Exception as e:  # noqa: BLE001
                print(f"  ! {q} -> {e}", file=sys.stderr)
                time.sleep(30)
                continue
            print(f"# {q} (total {res.get('total')})", file=sys.stderr)
            for it in res.get("items", []):
                seen.setdefault(it["full_name"], it)
            time.sleep(args.sleep)
        rows = []
        for it in sorted(seen.values(), key=lambda x: -x["stargazers_count"]):
            rows.append("\t".join([
                str(it["stargazers_count"]), it["full_name"], lic_of(it),
                it["pushed_at"], ",".join(it.get("topics") or []), clean(it.get("description")),
            ]))
        with open(args.out, "w", encoding="utf-8") as f:
            f.write("\n".join(rows) + "\n")
        print(f"written {args.out}: {len(rows)} unique repos from {len(queries)} queries", file=sys.stderr)
    else:
        with open(args.repos_file, encoding="utf-8-sig") as f:
            repos = [ln.strip() for ln in f if ln.strip() and not ln.startswith("#")]
        rows = []
        for r in repos:
            try:
                it = repo_get(r)
            except Exception as e:  # noqa: BLE001
                print(f"  ! {r} -> {e}", file=sys.stderr)
                rows.append("\t".join(["NOT_FOUND", r]))
                continue
            rows.append("\t".join([
                str(it["stargazers_count"]), it["full_name"], lic_of(it), it["pushed_at"],
                str(it.get("size")), str(it.get("default_branch")), str(it.get("fork")),
                str(it.get("archived")), clean(it.get("description")),
            ]))
            print(f"  ok {r} {it['stargazers_count']}", file=sys.stderr)
            time.sleep(1.0)
        with open(args.out, "w", encoding="utf-8") as f:
            f.write("\n".join(rows) + "\n")
        print(f"written {args.out}: {len(rows)} rows", file=sys.stderr)


if __name__ == "__main__":
    main()
