#!/usr/bin/env python3
"""Generate and check `skills-lock.json` — machine-readable provenance for every installed skill.

Why (SKILL_RADAR/2026-11-13-install-integrity-probe.md §7, candidate #66):
provenance in this vault lives in `INSTRUCTION.md` as Markdown prose. Measured 2026-11-13:
27 of 28 path tokens in the submodule table no longer resolve, and 48 of 125 installed
skills have no per-skill row at all. The information is not wrong, it is *stranded* —
correct when written, orphaned by a later directory rename, with nothing joining the
table to the tree.

A lockfile is generated from the tree, so it cannot silently strand anything: a pointer
that does not resolve is a `--check` failure, not a paragraph nobody re-reads.

    python scripts/skills_lock.py                 # write skills-lock.json
    python scripts/skills_lock.py --check         # exit 1 on drift vs the lock (regressions only)
    python scripts/skills_lock.py --check --strict  # also exit 1 if ANY skill has no provenance

`--check` is a regression detector, not a perfection detector: the lock records today's
gaps (58 of 125 skills have no resolvable provenance as of 2026-11-13), so the gate fails
when the set changes or when a skill *loses* provenance — not because history was
imperfect. `--strict` is for the day someone backfills `INSTRUCTION.md`.

Design notes
------------
* `hash` is this tool's own tree hash — `<rel>|<size>|<sha256(file)>\\n` per file, sorted,
  hashed. It is deliberately an independent implementation of the same idea as
  `Get-TreeHash` in `scripts/verify-install.ps1`, not a byte-compatible copy: two
  implementations can catch each other's bugs, one cannot. Never compare the two values.
* `resolved: false` means "this skill is installed but no provenance record points at it".
  Local skills are legitimate, so this is recorded, not failed — but a skill that *was*
  resolved and no longer is (a rename, a flattened path, a deleted row) is a regression,
  and that is exactly the failure mode that stranded 27 of 28 pointers in §7.
* Read-only with respect to the vault and the harness stores. The only file written is
  the lock itself, and only when `--check` is absent.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
from pathlib import Path

VERSION = 1
LOCK_NAME = "skills-lock.json"

GH_RE = re.compile(r"github\.com/([\w.-]+)/([\w.-]+?)(?=[)`\s/]|\.git|$)")
REF_RE = re.compile(r"@\s*`?([0-9a-f]{7,40})`?")
VENDOR_RE = re.compile(r"`?(vendor/[\w.-]+)")
ORIGIN_KIND_RE = re.compile(r"\b(repo|sibling|local|host)\b", re.I)
SPLIT_RE = re.compile(r"\s*(?:/|\+|、)\s*")
NOISE_NAMES = {".git", "__pycache__", ".DS_Store", "node_modules"}
NOISE_SUFFIX = (".pyc", ".pyo")


def is_noise(rel: str) -> bool:
    parts = rel.split("/")
    if any(p in NOISE_NAMES for p in parts):
        return True
    return rel.endswith(NOISE_SUFFIX)


def canonical_file_bytes(data: bytes) -> bytes:
    """Normalize Git text checkout line endings before hashing.

    core.autocrlf can expose the same tracked text as CRLF on Windows and LF on
    Linux. Normalize NUL-free files to LF; retain binary assets byte-for-byte.
    """
    if b"\x00" in data:
        return data
    return data.replace(b"\r\n", b"\n")


def gitlinks(root: Path) -> list[tuple[str, str]]:
    """Every committed submodule as (path, sha), longest-first for prefix lookup."""
    try:
        out = subprocess.run(
            ["git", "-C", str(root), "ls-files", "-s"],
            capture_output=True, text=True, encoding="utf-8", errors="replace",
            check=False,
        ).stdout
    except OSError:
        return []
    links = []
    for line in out.splitlines():
        meta, _, path = line.partition("\t")
        parts = meta.split()
        if len(parts) >= 2 and parts[0] == "160000":
            links.append((path.strip(), parts[1]))
    links.sort(key=lambda p: len(p[0]), reverse=True)
    return links


def gitlink_sha(links: list[tuple[str, str]], rel: str) -> str:
    """Committed submodule SHA covering *rel*, or '' when it is not a gitlink.

    Hazard this fixes: `tree_hash` hashes what is ON DISK, but CI checks the
    tree out without `submodules: recursive`, so `vendor/**` (and
    `SKILL/video/tier1/tygg-ai-film-studio`) are EMPTY there. A lock generated
    on a machine with submodules initialised therefore failed `skills_lock
    --check` on every PR (2026-11-20), and the only way to keep CI green was to
    hand-blank those hashes — i.e. the check silently stopped covering 70+
    vendored skills. Recording the gitlink SHA keeps the guarantee (a submodule
    bump is still a change) and is identical locally and in CI.
    """
    for path, sha in links:
        if rel == path or rel.startswith(path + "/"):
            return sha
    return ""


def tree_hash(path: Path) -> tuple[str, int]:
    """(hash, file_count). Skips runtime droppings and normalizes text EOLs."""
    if not path.exists():
        return "", 0
    entries = []
    for dirpath, dirnames, filenames in os.walk(path):
        dirnames[:] = sorted(d for d in dirnames if d not in NOISE_NAMES)
        for fn in sorted(filenames):
            full = Path(dirpath) / fn
            rel = full.relative_to(path).as_posix()
            if is_noise(rel):
                continue
            try:
                data = canonical_file_bytes(full.read_bytes())
                size = len(data)
                digest = hashlib.sha256(data).hexdigest().upper()
            except OSError:
                continue
            entries.append((rel, size, digest))
    if not entries:
        return "", 0
    buf = "".join(f"{rel}|{size}|{digest}\n" for rel, size, digest in sorted(entries))
    return hashlib.sha256(buf.encode("utf-8")).hexdigest(), len(entries)


def read_manifest(path: Path) -> list[tuple[str, str, str]]:
    rows = []
    for raw in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split("|")
        if len(parts) != 3:
            continue
        name, src, tier = (p.strip() for p in parts)
        if name and src:
            rows.append((name, src, tier))
    return rows


def names_in_cell(cell: str) -> list[str]:
    out = []
    cleaned = re.sub(r"`", "", re.sub(r"\([^)]*\)", "", cell))
    for chunk in SPLIT_RE.split(cleaned):
        tok = chunk.strip(" .*—-")
        if not tok:
            continue
        if " " in tok:
            tok = tok.split()[0].strip(":*")
        if re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{2,}", tok or ""):
            out.append(tok)
    return out


def parse_instruction(path: Path) -> tuple[dict[str, dict], list[dict]]:
    """Return (by_skill_name, submodule_rows)."""
    if not path.exists():
        return {}, []
    lines = path.read_text(encoding="utf-8-sig", errors="replace").splitlines()
    by_name: dict[str, dict] = {}
    subs: list[dict] = []
    for idx, raw in enumerate(lines, start=1):
        line = raw.rstrip()
        if line.startswith("| `vendor/"):
            cells = [c.strip() for c in line.strip("|").split("|")]
            if len(cells) >= 5:
                subs.append({
                    "vendor": cells[0].strip("` "),
                    "repo": cells[1].strip("` "),
                    "ref": cells[2].strip("` "),
                    "licence": cells[3],
                    "installed": "|".join(cells[4:]),
                    "line": idx,
                })
            continue
        if not line.startswith("|"):
            continue
        cells = [c.strip() for c in line.strip("|").split("|")]
        if len(cells) != 3 or cells[0].lower().startswith("skill"):
            continue
        kind_m = ORIGIN_KIND_RE.search(cells[1])
        if not kind_m:
            continue
        for name in names_in_cell(cells[0]):
            if name in by_name:
                continue
            by_name[name] = {
                "type": kind_m.group(1).lower(),
                "cell": cells[1],
                "source": cells[2],
                "line": idx,
            }
    return by_name, subs


def origin_from_row(row: dict, instruction_rel: str) -> dict:
    src = row["source"]
    repo_m = GH_RE.search(src)
    ref_m = REF_RE.search(src)
    vend_m = VENDOR_RE.search(src)
    return {
        "type": "repo" if repo_m else row["type"],
        "repo": f"{repo_m.group(1)}/{repo_m.group(2)}" if repo_m else "",
        "ref": ref_m.group(1) if ref_m else "",
        "vendor": vend_m.group(1).rstrip("/") if vend_m else "",
        "evidence": f"{instruction_rel}:{row['line']}",
    }


def origin_from_submodule(sub: dict, skill_path: str, instruction_rel: str) -> dict:
    """Only claim a submodule origin when the row's installed text names this skill."""
    leaf = skill_path.rstrip("/").split("/")[-1]
    if not re.search(rf"(^|[^A-Za-z0-9._-]){re.escape(leaf)}([^A-Za-z0-9._-]|$)", sub["installed"]):
        return {}
    return {
        "type": "repo",
        "repo": sub["repo"],
        "ref": sub["ref"],
        "vendor": sub["vendor"],
        "evidence": f"{instruction_rel}:{sub['line']}",
    }


def build(root: Path) -> dict:
    manifest_rel = "scripts/install-manifest.txt"
    rows = read_manifest(root / manifest_rel)
    by_name, subs = parse_instruction(root / "INSTRUCTION.md")
    links = gitlinks(root)

    skills: dict[str, dict] = {}
    unresolved: list[str] = []
    for name, src, tier in rows:
        if src == "HOST":
            skills[name] = {"path": src, "tier": tier, "hash": "", "files": 0,
                            "origin": {"type": "host", "evidence": ""}, "resolved": True}
            continue
        target = root / src
        link = gitlink_sha(links, src)
        if link:
            digest, count = f"gitlink:{link}", 0
        else:
            digest, count = tree_hash(target)
        origin: dict = {}
        if name in by_name:
            origin = origin_from_row(by_name[name], "INSTRUCTION.md")
        if not origin:
            for sub in subs:
                candidate = origin_from_submodule(sub, src, "INSTRUCTION.md")
                if candidate:
                    origin = candidate
                    break
        resolved = bool(origin)
        if not resolved:
            origin = {"type": "unknown", "evidence": ""}
            unresolved.append(name)
        skills[name] = {
            "path": src,
            "tier": tier,
            "hash": digest,
            "files": count,
            "origin": origin,
            "resolved": resolved,
        }

    return {
        "version": VERSION,
        "generatedBy": "scripts/skills_lock.py",
        "note": ("hash is this tool's own tree hash; it is NOT byte-compatible with "
                 "Get-TreeHash in scripts/verify-install.ps1 (independent implementations)."),
        "counts": {
            "skills": len(skills),
            "resolved": sum(1 for s in skills.values() if s["resolved"]),
            "unresolved": len(unresolved),
        },
        "unresolved": sorted(unresolved),
        "skills": dict(sorted(skills.items())),
    }


def check(root: Path, lock_path: Path, current: dict, strict: bool) -> int:
    if not lock_path.exists():
        print(f"skills-lock: FAIL — {lock_path.name} missing; run without --check to generate")
        return 1
    try:
        locked = json.loads(lock_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        print(f"skills-lock: FAIL — {lock_path.name} is not valid JSON: {exc}")
        return 1

    failures: list[str] = []
    warnings: list[str] = []
    old_skills = locked.get("skills", {})
    new_skills = current["skills"]

    for name in sorted(set(new_skills) - set(old_skills)):
        failures.append(f"new skill not in lock: {name} — regenerate the lock")
    for name in sorted(set(old_skills) - set(new_skills)):
        failures.append(f"skill in lock but no longer installed: {name}")
    for name in sorted(set(old_skills) & set(new_skills)):
        old, new = old_skills[name], new_skills[name]
        if old.get("path") != new["path"]:
            failures.append(f"path moved for {name}: {old.get('path')} -> {new['path']}")
        elif old.get("hash") != new["hash"]:
            failures.append(f"content changed for {name} ({new['path']}) — regenerate if intended")
        if old.get("resolved") and not new["resolved"]:
            failures.append(f"provenance LOST for {name} — it had a record, now it has none "
                            f"(rename or flattened path? see the probe note §7)")
        elif new["resolved"] and not old.get("resolved"):
            failures.append(f"provenance GAINED for {name} — the lock is stale, regenerate it")
        if not new["resolved"] and new["path"] != "HOST":
            warnings.append(f"no provenance record: {name} ({new['path']})")
        if new["path"] != "HOST" and not new["hash"]:
            warnings.append(f"source dir empty or uninitialised: {name} ({new['path']})")

    old_unresolved = int(locked.get("counts", {}).get("unresolved", -1))
    new_unresolved = current["counts"]["unresolved"]
    if old_unresolved >= 0 and new_unresolved > old_unresolved:
        failures.append(f"unresolved provenance grew: {old_unresolved} -> {new_unresolved}")

    if strict:
        failures.extend(warnings)

    if failures:
        print(f"skills-lock: FAIL — {len(failures)} problem(s), {len(warnings)} warning(s)")
        for f in failures:
            print(f"- {f}")
        return 1
    print(f"skills-lock: PASS ({len(new_skills)} skills, "
          f"{current['counts']['resolved']} resolvable, {new_unresolved} without provenance)")
    if warnings:
        print(f"  {len(warnings)} informational warning(s); run with --strict to see them all")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--root", default=".")
    ap.add_argument("--out", default=LOCK_NAME)
    ap.add_argument("--check", action="store_true", help="verify the lock is current; do not write")
    ap.add_argument("--strict", action="store_true",
                    help="with --check, also fail on every informational warning (unresolved provenance)")
    ap.add_argument("--json", action="store_true", help="print the lock to stdout instead of writing")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    current = build(root)
    lock_path = root / args.out

    if args.json:
        print(json.dumps(current, ensure_ascii=False, indent=2))
        return 0

    if args.check:
        return check(root, lock_path, current, args.strict)

    lock_path.write_text(json.dumps(current, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    c = current["counts"]
    print(f"written {args.out}: {c['skills']} skills, {c['resolved']} with resolvable provenance, "
          f"{c['unresolved']} without")
    if c["unresolved"]:
        print("  unresolved (no per-skill provenance row and no matching submodule row):")
        for name in current["unresolved"][:15]:
            print(f"    - {name}")
        if c["unresolved"] > 15:
            print(f"    ... and {c['unresolved'] - 15} more")
    return 0


if __name__ == "__main__":
    sys.exit(main())
