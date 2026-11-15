#!/usr/bin/env python3
"""Audit the harness stores: what is actually in them, and which side of a drift is newer.

Why (SKILL_RADAR/2026-11-13-install-integrity-probe.md, candidates #65 / #73 / #74 / #75):
`scripts/verify-install.ps1` answers one question — *is each manifest entry present in the
primary store and tree-hash-identical to the vault?* Measured 2026-11-13, four things fall
outside that question and all four were true on this machine:

  1. an entire declared store was empty (`~/.kilo/skills`) and nothing said so;
  2. 102 of 227 entries in the primary store were not ours;
  3. `~/.claude/skills` was host-projected — 192 symlinks into the primary store — so
     treating it as a vault-owned view double-counts;
  4. a MISMATCH was `__pycache__` only, and another had the store copy *newer* than the
     vault (the source-of-truth direction inverted).

So this tool reports four classes the hasher cannot:
    ours / foreign / reparse / missing,   and   DRIFT vs DRIFT-REVERSE with an mtime verdict.

    python scripts/audit_stores.py            # human report
    python scripts/audit_stores.py --json out.json
    python scripts/audit_stores.py --fail-on-drift   # exit 1 on real drift (CI)

Read-only. It never writes, deletes or follows a junction, and it never runs a skill.
`__pycache__` / `*.pyc` are excluded from hashing so that *running* a skill does not read
as corruption — that is the noise fix distilled from the probe (noise, not signal).
"""

from __future__ import annotations

import argparse
import json
import os
import stat
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from skills_lock import is_noise, tree_hash  # noqa: E402  (shared, not duplicated)

STORES = [".agents", ".claude", ".kilo", ".codex", ".workbuddy", ".hub", ".mavis", ".minimax",
          ".cursor", ".copilot", ".kiro", ".lingma", ".qoder-cn", ".codebuddy"]
REPARSE = 0x400


def is_reparse(path: Path) -> bool:
    try:
        st = os.lstat(path)
    except OSError:
        return False
    return stat.S_ISLNK(st.st_mode) or bool(getattr(st, "st_file_attributes", 0) & REPARSE)


def newest_mtime(path: Path) -> float:
    latest = 0.0
    for dirpath, dirnames, filenames in os.walk(path):
        dirnames[:] = [d for d in dirnames if d not in ("__pycache__", ".git")]
        for fn in filenames:
            if fn.endswith((".pyc", ".pyo")):
                continue
            try:
                latest = max(latest, (Path(dirpath) / fn).stat().st_mtime)
            except OSError:
                pass
    return latest


def read_scope(root: Path) -> dict:
    scope = {"primaryStore": ".agents", "linkViews": False}
    p = root / "scripts/install-scope.json"
    if p.exists():
        try:
            scope.update(json.loads(p.read_text(encoding="utf-8-sig")))
        except json.JSONDecodeError:
            pass
    return scope


def read_manifest(path: Path) -> dict[str, str]:
    rows = {}
    for raw in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or line.count("|") < 2:
            continue
        name, src, tier = (p.strip() for p in line.split("|")[:3])
        if tier.upper() == "C":
            continue
        rows[name] = src
    return rows


def scan_store(home: Path, store: str, manifest: dict[str, str]) -> dict:
    root = home / store / "skills"
    if not root.is_dir():
        return {"state": "absent"}
    entries = sorted(p.name for p in root.iterdir())
    ours = [e for e in entries if e in manifest]
    reparse = [e for e in entries if is_reparse(root / e)]
    into_primary = sum(
        1 for e in reparse
        if str((root / e).resolve()).startswith(str((home / ".agents" / "skills").resolve()))
    )
    return {
        "state": "present",
        "entries": len(entries),
        "ours": len(ours),
        "foreign": len(entries) - len(ours),
        "reparse": len(reparse),
        "reparse_into_primary": into_primary,
        "foreign_names": sorted(set(entries) - set(manifest))[:25],
    }


def audit_primary(vault: Path, home: Path, manifest: dict[str, str], primary: str) -> list[dict]:
    results = []
    store_root = home / primary / "skills"
    for name, rel in sorted(manifest.items()):
        if rel == "HOST":
            continue
        src = vault / rel
        inst = store_root / name
        if not inst.exists():
            results.append({"name": name, "path": rel, "status": "MISSING",
                            "detail": "not in the primary store — run sync-skills.ps1"})
            continue
        if not src.exists():
            results.append({"name": name, "path": rel, "status": "NOSRC",
                            "detail": "vault source missing (submodule not initialised?)"})
            continue
        h_src, n_src = tree_hash(src)
        if not h_src:
            # A declared dir with no files is an uninitialised submodule / empty stub,
            # not drift. Reported separately so it cannot masquerade as corruption.
            results.append({"name": name, "path": rel, "status": "NOSRC",
                            "detail": "vault source is empty (submodule not initialised?)"})
            continue
        h_inst, n_inst = tree_hash(inst)
        if h_src == h_inst:
            results.append({"name": name, "path": rel, "status": "MATCH", "detail": f"{n_src} files"})
            continue
        m_src, m_inst = newest_mtime(src), newest_mtime(inst)
        if m_inst > m_src + 1:
            status, detail = "DRIFT-REVERSE", "store copy is NEWER — sync would overwrite it"
        elif m_src > m_inst + 1:
            status, detail = "DRIFT", "vault copy is newer — sync will fix it"
        else:
            status, detail = "DRIFT", "sizes differ, mtimes equal — inspect by hand"
        files_src = {p.relative_to(src).as_posix() for p in src.rglob("*") if p.is_file() and not is_noise(str(p.relative_to(src)))}
        files_inst = {p.relative_to(inst).as_posix() for p in inst.rglob("*") if p.is_file() and not is_noise(str(p.relative_to(inst)))}
        only_vault = sorted(files_src - files_inst)[:5]
        only_store = sorted(files_inst - files_src)[:5]
        results.append({
            "name": name, "path": rel, "status": status, "detail": detail,
            "files_vault": n_src, "files_store": n_inst,
            "only_in_vault": only_vault, "only_in_store": only_store,
            "store_newer_than_vault": m_inst > m_src + 1,
        })
    return results


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--root", default=".")
    ap.add_argument("--home", default=str(Path.home()))
    ap.add_argument("--json", default="")
    ap.add_argument("--fail-on-drift", action="store_true",
                    help="exit 1 when any real drift / missing entry is found")
    ap.add_argument("--quiet", action="store_true", help="only print problems")
    args = ap.parse_args()

    vault = Path(args.root).resolve()
    home = Path(args.home).resolve()
    scope = read_scope(vault)
    manifest = read_manifest(vault / "scripts/install-manifest.txt")
    primary = scope.get("primaryStore", ".agents")
    print(f"manifest: {len(manifest)} skills | primary store: {primary} | "
          f"linkViews: {str(scope.get('linkViews')).lower()}\n")

    stores = {s: scan_store(home, s, manifest) for s in STORES}
    if not args.quiet:
        hdr = f"{'store':<14}{'entries':>8}{'ours':>6}{'foreign':>8}{'reparse':>8}{'->primary':>10}  state"
        print(hdr)
        print("-" * len(hdr))
        for s, d in stores.items():
            if d["state"] == "absent":
                print(f"{s:<14}{'--':>8}{'--':>6}{'--':>8}{'--':>8}{'--':>10}  absent")
                continue
            note = ""
            if d["entries"] == 0:
                note = "  <-- EMPTY: declared but holds nothing"
            elif d["reparse"] and d["reparse_into_primary"] == d["reparse"]:
                note = "  <-- fully host-projected"
            print(f"{s:<14}{d['entries']:>8}{d['ours']:>6}{d['foreign']:>8}{d['reparse']:>8}"
                  f"{d['reparse_into_primary']:>10}  {note}")

    results = audit_primary(vault, home, manifest, primary)
    counts: dict[str, int] = {}
    for r in results:
        counts[r["status"]] = counts.get(r["status"], 0) + 1

    problems = [r for r in results if r["status"] not in ("MATCH",)]
    print(f"\nprimary-store content: " + ", ".join(f"{k}={v}" for k, v in sorted(counts.items())))
    if problems:
        print()
        for r in problems:
            print(f"{r['status']:<14}{r['name']:<34}{r['path']}")
            print(f"{'':<14}{r['detail']}")
            if r.get("only_in_vault"):
                print(f"{'':<14}only in vault: {', '.join(r['only_in_vault'])}")
            if r.get("only_in_store"):
                print(f"{'':<14}only in store: {', '.join(r['only_in_store'])}")

    drift = counts.get("DRIFT", 0) + counts.get("DRIFT-REVERSE", 0)
    missing = counts.get("MISSING", 0)
    if args.json:
        Path(args.json).write_text(json.dumps({
            "primary": primary, "link_views": scope.get("linkViews"),
            "manifest": len(manifest), "stores": stores, "results": results, "counts": counts,
        }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"\njson: {args.json}")

    print(f"\nsummary: match={counts.get('MATCH', 0)} drift={drift} missing={missing} "
          f"nosrc={counts.get('NOSRC', 0)}")
    if args.fail_on_drift and (drift or missing):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
