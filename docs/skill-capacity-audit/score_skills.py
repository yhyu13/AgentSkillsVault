#!/usr/bin/env python3
"""
Skill capacity / completeness auditor.

Scores every installed skill 0-10 on five objective dimensions and writes
a full CSV + markdown report.  No vibes: every point is derived from a
measurable property of the skill package on disk.

Dimensions (max points)
  A. Contract & metadata   0-3   frontmatter valid, name==dir, description
                                  has substance + trigger cue, version/license
  B. Instruction depth     0-2   SKILL.md size, headings, code blocks
  C. Payload richness      0-2   references/ scripts/ templates|assets|examples
  D. Link integrity        0-2   every referenced relative path must exist
  E. Hygiene / executability 0-1 no TODO/placeholder markers, real scripts

Usage:  python score_skills.py --root <skills-dir> [--vault <vault-dir>]
                                --out <out-dir> [--date YYYY-MM-DD]
"""
import argparse
import csv
import hashlib
import json
import os
import re
import sys
from collections import defaultdict
from pathlib import Path

FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.S)
PAYLOAD_DIRS = ("references", "scripts", "templates", "assets", "examples",
                "docs", "commands", "kit", "workflows", "agents")
TRIGGER_CUES = ("use when", "use this when", "use this skill when", "trigger",
                "触发", "适用", "什么时候", "when the user", "invoked when")
PLACEHOLDER_RE = re.compile(
    r"\b(TODO|FIXME|TBD|XXX|WIP|coming soon|to be written|placeholder)\b"
    r"|待补充|待完善|占位|未实现", re.I)
MD_LINK_RE = re.compile(r"\]\(([^)\s]+)")
CODE_PATH_RE = re.compile(
    r"`((?:references|scripts|templates|assets|examples|docs|commands|kit|"
    r"workflows|agents)/[A-Za-z0-9_.\-/]+)`")
BARE_PATH_RE = re.compile(
    r"(?<![\w/])((?:references|scripts|templates|assets|examples|docs|"
    r"commands|kit|workflows|agents)/[A-Za-z0-9_.\-]+(?:/[A-Za-z0-9_.\-]+)*)")
SCRIPT_EXT = (".py", ".sh", ".bash", ".mjs", ".js", ".ts", ".ps1", ".rb")


def read_text(p: Path) -> str:
    try:
        return p.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""


def parse_frontmatter(text: str):
    m = FRONTMATTER_RE.match(text)
    if not m:
        # no YAML frontmatter -> whole file is body (and the contract is broken)
        return {}, text
    block = m.group(1)
    body = text[m.end():]
    data = {}
    key = None
    buf = []
    for line in block.splitlines():
        if re.match(r"^[A-Za-z_][\w\-]*:", line):
            if key:
                data[key] = " ".join(buf).strip().strip('"\'')
            k, _, v = line.partition(":")
            key = k.strip()
            buf = [v.strip()]
        elif key:
            buf.append(line.strip())
    if key:
        data[key] = " ".join(buf).strip().strip('"\'')
    return data, body


def collect_refs(text: str):
    refs = set()
    for m in MD_LINK_RE.finditer(text):
        t = m.group(1).strip()
        if t.startswith(("http://", "https://", "#", "mailto:")):
            continue
        t = t.strip("<>")
        if "://" in t:          # autolink with angle brackets / bare URL
            continue
        refs.add(t.split("#")[0])
    for rx in (CODE_PATH_RE, BARE_PATH_RE):
        for m in rx.finditer(text):
            refs.add(m.group(1))
    return {r for r in refs
            if r and not r.startswith(("~", "/", "$")) and "://" not in r}


def audit(skill_dir: Path, vault_dir: Path = None, vault_rel: str = None):
    skill_md = skill_dir / "SKILL.md"
    raw = read_text(skill_md)
    fm, body = parse_frontmatter(raw)
    name = (fm.get("name") or "").strip()
    desc = (fm.get("description") or "").strip()
    lower_desc = desc.lower()

    # --- A. contract & metadata (0-3)
    a = 0.0
    a += 1.0 if fm else 0.0
    a += 0.5 if name and name == skill_dir.name else 0.0
    a += 0.5 if (fm.get("version") or (fm.get("metadata") or "")) else 0.0
    a += 0.5 if len(desc) >= 80 else (0.25 if len(desc) >= 30 else 0.0)
    a += 0.5 if any(c in lower_desc for c in TRIGGER_CUES) else 0.0
    a = min(a, 3.0)

    # --- B. instruction depth (0-2)
    b = 0.0
    blen = len(body)
    b += 0.7 if blen >= 1500 else (0.35 if blen >= 600 else 0.0)
    b += 0.7 if blen >= 4000 else 0.0
    headings = len(re.findall(r"^#{1,6}\s", body, re.M))
    b += 0.3 if headings >= 3 else 0.0
    b += 0.3 if body.count("```") >= 4 else 0.0
    b = min(b, 2.0)

    # --- C. payload richness (0-2)
    c = 0.0
    subdirs = {p.name for p in skill_dir.iterdir() if p.is_dir()}
    has_refs = "references" in subdirs
    has_scripts = "scripts" in subdirs
    has_other = bool(subdirs & {"templates", "assets", "examples", "docs",
                                 "commands", "kit", "workflows", "agents"})
    c += 0.5 if has_refs else 0.0
    c += 0.5 if has_scripts else 0.0
    c += 0.5 if has_other else 0.0
    extra = [p for p in skill_dir.rglob("*") if p.is_file() and p.name != "SKILL.md"]
    c += 0.5 if len(extra) >= 5 else (0.25 if len(extra) >= 2 else 0.0)
    c = min(c, 2.0)

    # --- D. link integrity (0-2)
    refs = collect_refs(body)
    broken = []
    broken_resolvable_in_vault = []
    for r in sorted(refs):
        cand = skill_dir / r
        if not cand.exists():
            # tolerate ./ and trailing punctuation
            alt = skill_dir / r.lstrip("./")
            if not alt.exists():
                broken.append(r)
                if vault_dir is not None and vault_rel is not None:
                    vp = vault_dir / vault_rel
                    if vp is not None and (vp / r.lstrip("./")).exists():
                        broken_resolvable_in_vault.append(r)
    ratio = (len(broken) / len(refs)) if refs else 0.0
    d = 2.0 * (1.0 - ratio)
    if refs and not broken:
        d = min(d + 0.0, 2.0)
    d = max(0.0, min(d, 2.0))

    # --- E. hygiene / executability (0-1)
    e = 0.0
    placeholder = bool(PLACEHOLDER_RE.search(body))
    scripts = [p for p in skill_dir.rglob("*")
               if p.is_file() and p.suffix.lower() in SCRIPT_EXT]
    stub_scripts = [p for p in scripts if p.stat().st_size < 120]
    real_scripts = len([p for p in scripts if p.stat().st_size >= 120])
    e += 0.0 if placeholder else 0.5
    e += 0.5 if real_scripts >= 1 else 0.0
    e = min(e, 1.0)

    score = round(a + b + c + d + e, 2)

    norm = re.sub(r"\s+", " ", body.strip().lower())
    body_hash = hashlib.md5(norm.encode("utf-8", "replace")).hexdigest()

    return {
        "skill": skill_dir.name,
        "path": str(skill_dir),
        "score": score,
        "A_contract": round(a, 2),
        "B_depth": round(b, 2),
        "C_payload": round(c, 2),
        "D_links": round(d, 2),
        "E_hygiene": round(e, 2),
        "frontmatter": bool(fm),
        "name_matches_dir": bool(name) and name == skill_dir.name,
        "desc_chars": len(desc),
        "body_chars": blen,
        "headings": headings,
        "code_blocks": body.count("```") // 2,
        "extra_files": len(extra),
        "refs_checked": len(refs),
        "broken_refs": len(broken),
        "broken_list": "; ".join(broken[:6]),
        "broken_resolvable_in_vault": len(broken_resolvable_in_vault),
        "placeholder_markers": placeholder,
        "scripts": len(scripts),
        "real_scripts": real_scripts,
        "stub_scripts": len(stub_scripts),
        "payload_dirs": ",".join(sorted(subdirs & set(PAYLOAD_DIRS))),
        "body_hash": body_hash,
        "license": (fm.get("license") or "")[:40],
        "version": (fm.get("version") or "")[:20],
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True, help="skills dir (canonical store)")
    ap.add_argument("--vault", default="", help="vault dir (to map vault paths)")
    ap.add_argument("--out", required=True)
    ap.add_argument("--date", default="2026-01-01")
    args = ap.parse_args()

    root = Path(args.root)
    vault = Path(args.vault) if args.vault else None
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    skills = sorted([p for p in root.iterdir()
                     if p.is_dir() and (p / "SKILL.md").is_file()],
                    key=lambda p: p.name.lower())

    # vault path map (skill name -> category/name)
    vmap = {}
    if vault:
        for sm in vault.rglob("SKILL.md"):
            if ".git" in sm.parts or "vendor" in sm.parts:
                continue
            vmap.setdefault(sm.parent.name, sm.parent.relative_to(vault))
    rows = [audit(p, vault, vmap.get(p.name)) for p in skills]
    for r in rows:
        r["vault_path"] = str(vmap.get(r["skill"], ""))

    # duplicate detection on normalized body
    groups = defaultdict(list)
    for r in rows:
        groups[r["body_hash"]].append(r["skill"])
    dups = {k: v for k, v in groups.items() if len(v) > 1}
    for r in rows:
        r["duplicate_of"] = "; ".join(
            x for x in dups.get(r["body_hash"], []) if x != r["skill"])

    rows.sort(key=lambda r: (r["score"], r["skill"]))
    csv_path = out / f"{args.date}-capacity-scores.csv"
    with csv_path.open("w", newline="", encoding="utf-8-sig") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)

    meta = {
        "date": args.date,
        "root": str(root),
        "skills": len(rows),
        "avg": round(sum(r["score"] for r in rows) / len(rows), 2),
        "median": rows[len(rows) // 2]["score"],
        "min": rows[0]["score"],
        "max": rows[-1]["score"],
        "dup_groups": len(dups),
        "broken_ref_skills": sum(1 for r in rows if r["broken_refs"]),
        "no_frontmatter": sum(1 for r in rows if not r["frontmatter"]),
        "name_mismatch": sum(1 for r in rows if not r["name_matches_dir"]),
    }
    (out / f"{args.date}-capacity-meta.json").write_text(
        json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(meta, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    sys.exit(main())
