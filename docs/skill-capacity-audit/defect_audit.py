#!/usr/bin/env python3
"""
Defect auditor for installed agent skills.

For every skill in an installed store (default ~/.claude/skills) this classifies
four failure modes the owner cares about:

  U  never usable        - the harness cannot trigger or run it
                            (no YAML frontmatter, name mismatch, zero resolvable
                             payload, hard dependency on an MCP/tool/CLI that is
                             not present in this environment)
  E  error reference     - SKILL.md points at relative files that do not exist
  L  low quality         - too thin to be useful (no body, no payload dirs,
                            placeholder-only body)
  S  not standalone      - the skill only works because something outside its
                            own directory exists (sibling skill, host absolute
                            path, upstream repo checkout, vendored payload that
                            was not copied in)

Also emits, per skill, the location of the same skill inside the vault.

Usage:
  python defect_audit.py --root ~/.claude/skills --vault . \
      --out docs/skill-capacity-audit --date 2026-10-25
"""
import argparse
import csv
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

FM_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.S)
MD_LINK_RE = re.compile(r"\]\(([^)\s]+)")
CODE_PATH_RE = re.compile(
    r"`((?:references|scripts|templates|assets|examples|docs|commands|kit|"
    r"workflows|agents|evals|plans)/[A-Za-z0-9_.\-/]+)`")
BARE_PATH_RE = re.compile(
    r"(?<![\w/])((?:references|scripts|templates|assets|examples|docs|"
    r"commands|kit|workflows|agents|evals|plans)/[A-Za-z0-9_.\-]+"
    r"(?:/[A-Za-z0-9_.\-]+)*)")
PLACEHOLDER_RE = re.compile(
    r"\[(?:TODO|FIXME|TBD|XXX|WIP)\]"
    r"|\b(?:TODO|FIXME|TBD|XXX)\s*[:：]",
    re.I)
PAYLOAD_DIRS = ("references", "scripts", "templates", "assets", "examples",
                "docs", "commands", "kit", "workflows", "agents", "evals")
# a payload path claim = <payload dir>/.../<file.ext>
PAYLOAD_PATH_RE = re.compile(
    r"(?:references|scripts|templates|assets|examples|docs|commands|kit|"
    r"workflows|agents|evals)/[A-Za-z0-9_.\-]+(?:/[A-Za-z0-9_.\-]+)*")
# words that look like a path but are prose (accounting terms, role names)
_PROSE_TAIL_RE = re.compile(r"^[a-z]{4,}$")


def _is_payload_claim(ref: str) -> bool:
    """True when the ref claims a file that should live inside this skill."""
    if "..." in ref or ref.startswith(("..", "../")):
        return False
    head = ref.split("/", 1)[0]
    if head not in PAYLOAD_DIRS:
        return False
    tail = ref.rsplit("/", 1)[-1]
    if "." not in tail:                 # directory-shaped, not a file claim
        return False
    if _PROSE_TAIL_RE.match(tail):      # "assets/liabilities" style prose
        return False
    return True


def _line_exempt(text: str, ref: str) -> bool:
    """True when the sentence around the ref means 'this lives elsewhere'."""
    for line in text.splitlines():
        if ref not in line:
            continue
        low = line.lower()
        if any(k in low for k in ("that repo", "the repo", "upstream",
                                  "in `docs/", "create", "should be",
                                  "top index", "you will", "your project")):
            return True
    return False

# MCP / external tool names a skill can hard-depend on
MCP_RE = re.compile(r"mcp__[a-z0-9_]+", re.I)
MCP_WORDS_RE = re.compile(
    r"\b(blender|context7|sequentialthinking|memory)\s+mcp\b"
    r"|\bMCP\s+server\b|\bMCP\s+tools?\b", re.I)
CLI_RE = re.compile(
    r"`\b(npx|npm|pnpm|yarn|pip|pipx|uv|uvx|brew|apt-get|apt|cargo|go|git|"
    r"curl|wget|docker|kubectl|helm|terraform|ffmpeg|ffprobe|python3?|node|"
    r"deno|bun|playwright|chromium|chrome|blender|gh|psql|gsutil|aws|gcloud|"
    r"az|claude|mcp)\b")
# host-specific absolute paths -> not portable / not standalone
HOSTPATH_RE = re.compile(
    r"(?:[A-Za-z]:[\\/](?:Users|GitRepo-AI|home|opt|srv|mnt|tmp|var)[\\/][^\s`\"')]+)"
    r"|(?:/(?:home|Users|mnt|srv)/[^\s`\"')]+)")
# cross-skill dependency: "use the X skill", "see ../other", skill name references
CROSS_SKILL_RE = re.compile(
    r"\b(?:see|use|refer to|follow|per)\s+(?:the\s+)?`?([a-z0-9][a-z0-9-]{3,40})`?\s+skill\b",
    re.I)
# words that are never a skill name
_NOT_A_SKILL = {"this", "that", "these", "those", "each", "other", "another",
                "same", "own", "given", "above", "below", "first", "second",
                "target", "source", "current", "one", "any", "all", "next"}
SIBLING_PATH_RE = re.compile(r"\.\./[A-Za-z0-9_.\-/]+")
VENDOR_HINT_RE = re.compile(
    r"\b(vendor/[a-z0-9-]+|D:\\GitRepo-AI|~/[A-Za-z0-9_.\-/]+|"
    r"\$HOME/\.claude/skills|\.claude/skills/)\b")


def read_text(p: Path) -> str:
    try:
        return p.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""


def parse_frontmatter(text: str):
    m = FM_RE.match(text)
    if not m:
        # maybe frontmatter exists but not at position 0 (BOM / leading blank)
        m2 = FM_RE.search(text)
        if not m2:
            return {}, text
        m = m2
    block = m.group(1)
    body = text[m.end():]
    data, key, buf = {}, None, []
    for line in block.splitlines():
        if re.match(r"^[A-Za-z_][\w\-]*:", line):
            if key:
                data[key] = " ".join(buf).strip().strip('"\'')
            k, _, v = line.partition(":")
            key, buf = k.strip(), [v.strip()]
        elif key:
            buf.append(line.strip())
    if key:
        data[key] = " ".join(buf).strip().strip('"\'')
    return data, body


def collect_refs(text: str):
    refs = set()
    for m in MD_LINK_RE.finditer(text):
        t = m.group(1).strip().strip("<>")
        if t.startswith(("http://", "https://", "#", "mailto:")) or "://" in t:
            continue
        refs.add(t.split("#")[0])
    for rx in (CODE_PATH_RE, BARE_PATH_RE):
        for m in rx.finditer(text):
            refs.add(m.group(1))
    return {r for r in refs
            if r and not r.startswith(("~", "/", "$")) and "://" not in r
            and not r.endswith((".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"))}


def build_vault_map(vault: Path):
    """skill name -> list of repo-relative paths (vault dirs, excluding vendor)."""
    vmap = defaultdict(list)
    for sm in vault.rglob("SKILL.md"):
        parts = sm.relative_to(vault).parts
        if "vendor" in parts or ".git" in parts or "node_modules" in parts:
            continue
        vmap[sm.parent.name].append(str(sm.parent.relative_to(vault)).replace("\\", "/"))
    return vmap


def build_git_map(vault: Path):
    """skill name -> repo-relative path from the git index (committed layout)."""
    import subprocess
    try:
        out = subprocess.run(["git", "ls-files"], cwd=str(vault),
                             capture_output=True, text=True, timeout=60)
    except Exception:
        return {}
    gmap = defaultdict(list)
    for line in out.stdout.splitlines():
        if line.endswith("SKILL.md") and "/vendor/" not in f"/{line}":
            gmap[line.split("/")[-2]].append(line.rsplit("/", 1)[0])
    return gmap


def build_vendor_map(vault: Path):
    """skill name -> vendor path (upstream checkout inside this repo)."""
    vmap = defaultdict(list)
    vendor = vault / "vendor"
    if not vendor.is_dir():
        return vmap
    for sm in vendor.rglob("SKILL.md"):
        try:
            rel = sm.parent.relative_to(vault)
        except ValueError:
            continue
        if "node_modules" in rel.parts:
            continue
        vmap[sm.parent.name].append(str(rel).replace("\\", "/"))
    return vmap


def audit(skill_dir: Path, vault: Path, vmap, gmap, vmap_vendor, installed_names):
    raw = read_text(skill_dir / "SKILL.md")
    fm, body = parse_frontmatter(raw)
    name = (fm.get("name") or "").strip()
    desc = (fm.get("description") or "").strip()
    full = raw

    # ---------- E: error references ----------
    # only count refs that CLAIM a file inside this skill package
    refs = collect_refs(body)
    broken, broken_vault_resolvable = [], []
    for r in sorted(refs):
        if not _is_payload_claim(r):
            continue
        if _line_exempt(body, r):
            continue
        cand = skill_dir / r.lstrip("./")
        if not cand.exists():
            broken.append(r)
            for vp in vmap.get(skill_dir.name, []):
                if (vault / vp / r.lstrip("./")).exists():
                    broken_vault_resolvable.append(r)
                    break
    # non-file path claims (directories, sibling skills) -> standalone issues
    other_refs = sorted(r for r in refs if not _is_payload_claim(r))

    # ---------- payload ----------
    subdirs = {p.name for p in skill_dir.iterdir() if p.is_dir()}
    payload_dirs = sorted(subdirs & set(PAYLOAD_DIRS))
    extra_files = [p for p in skill_dir.rglob("*")
                   if p.is_file() and p.name != "SKILL.md"]
    n_extra = len(extra_files)
    blen = len(body.strip())

    # ---------- U: never usable ----------
    u_reasons = []
    if not fm:
        u_reasons.append("no-yaml-frontmatter(harness-cannot-trigger)")
    if name and name != skill_dir.name:
        u_reasons.append(f"name-mismatch(frontmatter={name})")
    if fm and not desc:
        u_reasons.append("empty-description")
    # hard dependency on an MCP tool namespace that is not connected here
    mcp_calls = {m.lower() for m in MCP_RE.findall(full)}
    unavailable = sorted(m for m in mcp_calls
                         if m not in ("mcp__blender", "mcp__context7"))
    if unavailable:
        u_reasons.append("requires-unavailable-mcp:" + ",".join(unavailable)[:60])
    # the whole skill is a pointer at material that was never shipped
    if blen < 600 and not payload_dirs and refs and all(
            not (skill_dir / r.lstrip("./")).exists() for r in refs):
        u_reasons.append("body-is-pointer-to-unshipped-payload")
    if n_extra == 0 and blen < 250 and not payload_dirs:
        u_reasons.append("empty-package")

    # ---------- L: low quality ----------
    l_reasons = []
    # slash-command style skills (disable-model-invocation) are deliberately thin
    manual = "disable-model-invocation" in fm
    if not manual:
        if blen < 200:
            l_reasons.append(f"body-tiny({blen}ch)")
        elif blen < 700:
            l_reasons.append(f"body-thin({blen}ch)")
        if not payload_dirs and blen < 700:
            l_reasons.append("no-payload-dirs")
        if n_extra == 0 and blen < 700:
            l_reasons.append("single-file")
        if PLACEHOLDER_RE.search(body) and not payload_dirs:
            l_reasons.append("placeholder-markers")
        if fm and desc and len(desc) < 40:
            l_reasons.append(f"weak-description({len(desc)}ch-no-trigger-cue)")

    # ---------- S: not standalone ----------
    s_reasons = []
    hostpaths = sorted(set(HOSTPATH_RE.findall(full)))
    if hostpaths:
        s_reasons.append("host-absolute-path")
    vendor_hits = sorted(set(VENDOR_HINT_RE.findall(full)))
    if vendor_hits:
        s_reasons.append("depends-on-external-repo-path")
    sibs = sorted({r for r in other_refs if r.startswith("..")})
    if sibs:
        s_reasons.append("sibling-relative-path:" + ",".join(sibs[:2]))
    # cross-skill dependency only matters when the other skill is NOT installed
    cross = sorted({m.group(1).lower() for m in CROSS_SKILL_RE.finditer(full)})
    cross_missing = []
    for c in cross:
        if c in _NOT_A_SKILL or c == skill_dir.name.lower():
            continue
        # accept a prefix/suffix match: "monitoring-advisor" ~ "monte-carlo-monitoring-advisor"
        if c in installed_names or any(n.endswith("-" + c) or n.startswith(c + "-")
                                       for n in installed_names):
            continue
        cross_missing.append(c)
    if cross_missing:
        s_reasons.append("cross-skill-dependency(not-installed):"
                         + ",".join(cross_missing[:4]))
    if broken_vault_resolvable:
        s_reasons.append("refs-resolve-only-in-vault(payload-not-copied)")
    if broken and not payload_dirs:
        s_reasons.append("claims-payload-but-ships-none")
    if not payload_dirs and other_refs and not hostpaths and not vendor_hits:
        s_reasons.append("references-unshipped-payload")
    # a skill that genuinely cannot run without an MCP server
    mcp_required = False
    if "mcp" in skill_dir.name.lower():
        mcp_required = True
    elif re.search(r"(requires?|must (?:have|install|connect|register)|"
                   r"\u9700\u8981|\u5fc5\u987b).{0,50}\bMCP\b", full, re.I):
        mcp_required = True
    if mcp_required and not unavailable:
        s_reasons.append("mcp-server-required")

    # ---------- combined severity ----------
    defects = []
    if u_reasons:
        defects.append("U")
    if broken:
        defects.append("E")
    if l_reasons:
        defects.append("L")
    if s_reasons:
        defects.append("S")

    vpaths = vmap.get(skill_dir.name, [])
    gpaths = gmap.get(skill_dir.name, [])
    # is the defect upstream (also broken in the vault copy) or introduced by install?
    vault_broken_same = 0
    if broken and vpaths:
        vp = vault / vpaths[0]
        for r in broken:
            if not (vp / r.lstrip("./")).exists():
                vault_broken_same += 1
    return {
        "skill": skill_dir.name,
        "installed_path": str(skill_dir).replace("\\", "/"),
        "vault_path": vpaths[0] if vpaths else "",
        "git_path": gpaths[0] if gpaths else "",
        "vendor_path": vmap_vendor.get(skill_dir.name, [""])[0],
        "vault_paths_all": " | ".join(vpaths),
        "in_vault": "Y" if vpaths else "N",
        "defects": "".join(defects),
        "U_never_usable": "; ".join(u_reasons),
        "E_error_refs": f"{len(broken)}/{len(refs)}",
        "E_broken_list": "; ".join(broken[:8]),
        "E_resolvable_in_vault": len(broken_vault_resolvable),
        "E_origin": ("upstream" if broken and vault_broken_same == len(broken)
                     else ("copy-loss" if broken and vault_broken_same == 0
                           else ("partial" if broken else ""))),
        "L_low_quality": "; ".join(l_reasons),
        "S_not_standalone": "; ".join(s_reasons),
        "frontmatter": "Y" if fm else "N",
        "name": name,
        "body_chars": blen,
        "desc_chars": len(desc),
        "payload_dirs": ",".join(payload_dirs),
        "extra_files": n_extra,
        "refs_total": len(refs),
        "host_paths": " | ".join(hostpaths[:3]),
        "vendor_hits": " | ".join(vendor_hits[:3]),
        "clis": ",".join(sorted(set(CLI_RE.findall(full)))[:10]),
        "severity": len(defects),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True)
    ap.add_argument("--vault", default=".")
    ap.add_argument("--out", required=True)
    ap.add_argument("--date", default="2026-01-01")
    a = ap.parse_args()

    root, vault, out = Path(a.root), Path(a.vault), Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    vmap = build_vault_map(vault)
    gmap = build_git_map(vault)
    vmap_vendor = build_vendor_map(vault)

    skills = sorted([p for p in root.iterdir()
                     if p.is_dir() and (p / "SKILL.md").is_file()],
                    key=lambda p: p.name.lower())
    installed_names = {p.name.lower() for p in skills}
    rows = [audit(p, vault, vmap, gmap, vmap_vendor, installed_names) for p in skills]
    rows.sort(key=lambda r: (-r["severity"], r["skill"]))

    csv_path = out / f"{a.date}-defect-scores.csv"
    with csv_path.open("w", newline="", encoding="utf-8-sig") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)

    def cnt(tag):
        return sum(1 for r in rows if tag in r["defects"])

    meta = {
        "date": a.date,
        "installed_skills": len(rows),
        "not_in_vault": [r["skill"] for r in rows if r["in_vault"] == "N"],
        "U_never_usable": cnt("U"),
        "E_error_refs": cnt("E"),
        "L_low_quality": cnt("L"),
        "S_not_standalone": cnt("S"),
        "clean": sum(1 for r in rows if not r["defects"]),
        "multi_defect": [r["skill"] for r in rows if r["severity"] >= 3],
    }
    (out / f"{a.date}-defect-meta.json").write_text(
        json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(meta, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
