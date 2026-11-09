#!/usr/bin/env python3
"""Parallel reference checker for a skills tree.

Same reference-extraction rules as score_skills.py (imported, not re-invented),
but the job here is only D-dimension: which relative paths in a SKILL.md do not
resolve inside the skill package.

Modes
  --jobs N     run skill checks in a thread pool (default: min(16, cpu))
  --serial     force one thread (used as the correctness oracle)
  --self-check run serial AND parallel, assert identical results, exit 1 on drift
  --vault DIR  also report refs that resolve against the vault root instead of
               the skill dir (usually means the skill assumes a project layout)

Outputs: human summary on stdout, optional --json / --md files. Exit code 1
with --fail-on-broken when any skill has an unresolved relative ref.

Usage:
  python check_refs.py --root <skills-dir> [--jobs 8] [--json out.json]
  python check_refs.py --root <skills-dir> --self-check
"""
import argparse
import fnmatch
import json
import os
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from score_skills import collect_refs, read_text  # noqa: E402

ALLOW_FILE = Path(__file__).resolve().parent / "refs-allow.txt"


def load_allow(path: Path):
    """<skill>|<fnmatch pattern>|<reason>; skill '*' matches every skill."""
    rules = []
    if not path.is_file():
        return rules
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split("|")
        if len(parts) < 2:
            continue
        rules.append((parts[0].strip(), parts[1].strip(),
                      (parts[2].strip() if len(parts) > 2 else "")))
    return rules


def is_allowed(skill: str, ref: str, rules):
    for sk, pat, _reason in rules:
        if sk not in ("*", skill):
            continue
        if fnmatch.fnmatch(ref, pat) or fnmatch.fnmatch(ref.rstrip("/"), pat):
            return True
    return False


def check_skill(skill_dir: Path, vault_root: Path = None, allow=()):
    raw = read_text(skill_dir / "SKILL.md")
    # strip frontmatter so provenance metadata is not counted as a link
    if raw.startswith("---"):
        end = raw.find("\n---", 3)
        body = raw[end + 4:] if end != -1 else raw
    else:
        body = raw
    refs = collect_refs(body)
    broken, vault_only, allowed = [], [], []
    for r in sorted(refs):
        cand = skill_dir / r
        alt = skill_dir / r.lstrip("./")
        if cand.exists() or alt.exists():
            continue
        if is_allowed(skill_dir.name, r, allow):
            allowed.append(r)
            continue
        if vault_root is not None and (vault_root / r.lstrip("./")).exists():
            vault_only.append(r)
            continue
        broken.append(r)
    return {
        "skill": skill_dir.name,
        "refs": len(refs),
        "broken": broken,
        "vault_only": vault_only,
        "allowed": allowed,
    }


def run(skills, vault_root, jobs, allow=()):
    if jobs <= 1:
        return [check_skill(s, vault_root, allow) for s in skills]
    with ThreadPoolExecutor(max_workers=jobs) as ex:
        return list(ex.map(lambda s: check_skill(s, vault_root, allow), skills))


def discover(root: Path):
    skip = {".git", "vendor", "docs", "TEMPLATE", "archived", "node_modules", ".github"}
    found = []
    for sm in root.rglob("SKILL.md"):
        parts = set(sm.relative_to(root).parts)
        if parts & skip:
            continue
        found.append(sm.parent)
    return sorted(found, key=lambda p: p.name.lower())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True)
    ap.add_argument("--vault", default="")
    ap.add_argument("--jobs", type=int, default=min(16, os.cpu_count() or 4))
    ap.add_argument("--serial", action="store_true")
    ap.add_argument("--self-check", action="store_true")
    ap.add_argument("--json", default="")
    ap.add_argument("--md", default="")
    ap.add_argument("--fail-on-broken", action="store_true")
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args()

    root = Path(args.root)
    vault_root = Path(args.vault) if args.vault else None
    skills = discover(root)
    if not skills:
        print("no skills found under %s" % root, file=sys.stderr)
        return 2

    jobs = 1 if args.serial else max(1, args.jobs)
    allow = load_allow(ALLOW_FILE)
    results = run(skills, vault_root, jobs, allow)

    if args.self_check:
        oracle = run(skills, vault_root, 1, allow)
        if oracle != results:
            print("SELF-CHECK FAILED: parallel != serial", file=sys.stderr)
            for a, b in zip(oracle, results):
                if a != b:
                    print("  %s: serial=%s parallel=%s" % (a["skill"], a, b), file=sys.stderr)
            return 1
        print("SELF-CHECK PASS: %d skills, serial == parallel(jobs=%d)" % (len(oracle), jobs))

    bad = [r for r in results if r["broken"]]
    vaultish = [r for r in results if r["vault_only"]]
    total_refs = sum(r["refs"] for r in results)
    total_broken = sum(len(r["broken"]) for r in results)

    if not args.quiet:
        print("skills=%d refs=%d broken_skills=%d broken_refs=%d vault_only_skills=%d jobs=%d"
              % (len(results), total_refs, len(bad), total_broken, len(vaultish), jobs))
        for r in bad:
            print("  BROKEN %s: %s" % (r["skill"], "; ".join(r["broken"][:8])))
        for r in vaultish:
            print("  VAULT-ONLY %s: %s" % (r["skill"], "; ".join(r["vault_only"][:8])))

    payload = {
        "root": str(root),
        "skills": len(results),
        "refs": total_refs,
        "broken_skills": len(bad),
        "broken_refs": total_broken,
        "results": results,
    }
    if args.json:
        Path(args.json).write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    if args.md:
        lines = ["# Reference check — %s" % root, "",
                 "| skill | refs | broken | broken paths |", "|---|---|---|---|"]
        for r in results:
            if r["broken"]:
                lines.append("| %s | %d | %d | %s |" % (r["skill"], r["refs"],
                                                       len(r["broken"]), "<br>".join(r["broken"])))
        lines += ["", "Total: %d skills, %d refs, %d broken refs in %d skills."
                  % (len(results), total_refs, total_broken, len(bad))]
        Path(args.md).write_text("\n".join(lines) + "\n", encoding="utf-8")

    if args.fail_on_broken and bad:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
