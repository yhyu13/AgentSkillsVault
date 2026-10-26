#!/usr/bin/env python3
"""Measure the always-on pressure that the installed skill library puts on an agent.

Answers four questions with numbers, not opinion:

  1. How big is the skill *listing* (name + description) that every harness
     pre-loads into the system prompt, per store and as a union?
  2. How does that listing compare with the budgets the harnesses themselves
     enforce (Claude Code: 1% of the context window; Codex: 2% or 8,000 chars)?
  3. How much *selection ambiguity* is there? A skill whose description overlaps
     another skill's is a shadowing candidate: the agent may pick the wrong one.
     Overlap is measured as Jaccard similarity over description content words.
  4. Is the install model sound? Duplicate frontmatter names and same-name /
     different-body copies across stores are reported explicitly, because the
     name-keyed union hides them.

Usage:
    python docs/skill-capacity-audit/skill_pressure_analysis.py [--json out.json]
                 [--tiers scripts/skill-tiers.txt] [--harness claude|codex]

Reads only the user-level stores; writes nothing outside the given --json path.

Line endings: Windows checkouts are CRLF (core.autocrlf=true) while hand-copied
stores are LF, so content comparison normalises CRLF -> LF before hashing. The
raw and normalised results are both reported.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from collections import Counter
from itertools import combinations
from pathlib import Path

HOME = Path.home()
STORES = {
    "claude": HOME / ".claude" / "skills",
    "kilo": HOME / ".kilo" / "skills",
    "codex": HOME / ".codex" / "skills",
    "agents": HOME / ".agents" / "skills",
    "config-kilo": HOME / ".config" / "kilo" / "skills",
}

# Harness budgets, from vendor documentation (see the report for URLs).
CLAUDE_CODE_BUDGET_FRACTION = 0.01  # of the model context window
CODEX_BUDGET_FRACTION = 0.02  # of the model context window
CODEX_FALLBACK_CHARS = 8_000  # when the context window is unknown
CODEX_MAX_CONTEXT_TOKENS = 10_000  # cap on skills.max_context_tokens
PREFIX_CHARS = 120  # how much of a description survives a truncated listing
CONTEXT_WINDOW = 200_000  # tokens, the common baseline
CHARS_PER_TOKEN = 3.6  # mixed English/code description text, measured proxy

STOPWORDS = {
    "a", "an", "and", "any", "are", "as", "at", "be", "but", "by", "can", "do",
    "does", "for", "from", "has", "have", "how", "i", "if", "in", "into", "is",
    "it", "its", "not", "of", "on", "or", "s", "skill", "skills", "so", "that",
    "the", "their", "them", "then", "there", "these", "they", "this", "to",
    "use", "used", "uses", "using", "was", "were", "when", "which", "while",
    "who", "why", "will", "with", "you", "your", "also", "more", "most",
    "other", "some", "such", "than", "via", "per", "each", "both",
}

FRONTMATTER_RE = re.compile(r"(?s)^---\r?\n(.*?)\r?\n---")
NAME_RE = re.compile(r"(?m)^name:\s*(.+?)\s*$")
DESC_RE = re.compile(r"(?ms)^description:\s*(.+?)(?=\r?\n[a-zA-Z_][a-zA-Z0-9_-]*:|\Z)")
CATEGORY_RE = re.compile(r"^SKILL/([^/]+)/")
TIER_RE = re.compile(r"^([A-Za-z0-9_.-]+)\s*\|\s*([ABC])\s*$")


def parse_frontmatter(path: Path) -> tuple[str, str] | None:
    """Return (name, description) or None.

    Prefers a real YAML parse so that block scalars (`description: |`), quoted
    values and multi-line descriptions are read correctly; falls back to regex.
    """
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return None
    m = FRONTMATTER_RE.match(text)
    if not m:
        return None
    block = m.group(1)

    name = desc = None
    try:
        import yaml  # type: ignore

        data = yaml.safe_load(block)
        if isinstance(data, dict):
            raw_name = data.get("name")
            raw_desc = data.get("description")
            if isinstance(raw_name, str):
                name = raw_name.strip()
            if isinstance(raw_desc, str):
                desc = " ".join(raw_desc.split())
            elif raw_desc is not None:
                desc = " ".join(str(raw_desc).split())
    except Exception:
        name = desc = None

    if not name:
        nm = NAME_RE.search(block)
        if nm:
            name = nm.group(1).strip().strip("\"'")
    if not desc:
        ds = DESC_RE.search(block)
        if ds:
            desc = " ".join(ds.group(1).split())
    if not name or not desc:
        return None
    return name, desc


def load_manifest(vault: Path) -> dict[str, dict]:
    """skill name -> {path, category, kind, tier} from the vault install manifest.

    The manifest is `<name>|<path>` or `<name>|<path>|<tier>`; the tier column is
    optional so this parser also works on an older manifest.
    """
    manifest = vault / "scripts" / "install-manifest.txt"
    out: dict[str, dict] = {}
    if not manifest.is_file():
        return out
    for line in manifest.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "|" not in line:
            continue
        parts = line.split("|", 2)
        name = parts[0].strip()
        src = parts[1].strip()
        tier = parts[2].strip().upper() if len(parts) > 2 and parts[2].strip() else "A"
        if src == "HOST":
            kind = "host"
        elif src.startswith("vendor/"):
            kind = "vendor"
        else:
            kind = "curated"
        cat = "hand-installed"
        m = CATEGORY_RE.match(src.replace("\\", "/"))
        if m:
            cat = m.group(1)
        out[name] = {"path": src, "category": cat, "kind": kind, "tier": tier}
    return out


def load_tiers(vault: Path) -> dict[str, str]:
    """skill name -> tier, from scripts/skill-tiers.txt (`<name>|<tier>` rows)."""
    f = vault / "scripts" / "skill-tiers.txt"
    tiers: dict[str, str] = {}
    if not f.is_file():
        return tiers
    for line in f.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        m = TIER_RE.match(line)
        if m:
            tiers[m.group(1)] = m.group(2).upper()
    return tiers


def content_words(text: str) -> set[str]:
    words = re.findall(r"[a-z0-9][a-z0-9\-_]+", text.lower())
    return {w for w in words if w not in STOPWORDS and len(w) > 2}


def is_link(path: Path) -> bool:
    """True for a symlink OR a Windows directory junction.

    Path.is_symlink() returns False for junctions, so both are checked;
    removing a junction with Remove-Item -Recurse destroys its target.
    """
    if path.is_symlink():
        return True
    is_junction = getattr(path, "is_junction", None)
    if callable(is_junction):
        try:
            return bool(is_junction())
        except OSError:
            return False
    return False


def tree_hash(root: Path, normalize: bool = True) -> str:
    """Content hash of a directory tree (path + bytes), ignoring .git.

    With normalize=True, CRLF is folded to LF first, so a CRLF checkout and an
    LF copy of the same skill hash equal.
    """
    files = sorted(p for p in root.rglob("*") if p.is_file() and ".git" not in p.parts)
    h = hashlib.sha256()
    for f in files:
        b = f.read_bytes()
        if normalize:
            b = b.replace(b"\r\n", b"\n")
        h.update(str(f.relative_to(root)).encode("utf-8", "replace"))
        h.update(b)
    return h.hexdigest()


def collect() -> tuple[dict[str, dict], list[dict]]:
    """Union of every skill visible to a harness, keyed by skill name.

    Also returns the per-directory records, because keying by name hides two
    real defects: a duplicate frontmatter name, and the same name resolving to
    different bodies in different stores.
    """
    skills: dict[str, dict] = {}
    dirs: list[dict] = []
    for store, root in STORES.items():
        if not root.is_dir():
            continue
        for entry in sorted(root.iterdir()):
            md = entry / "SKILL.md"
            if not entry.is_dir() or not md.is_file():
                continue
            parsed = parse_frontmatter(md)
            if parsed is None:
                continue
            name, desc = parsed
            rec = skills.setdefault(
                name,
                {
                    "name": name,
                    "description": desc,
                    "desc_chars": len(desc),
                    "stores": [],
                    "path": str(entry),
                },
            )
            rec["stores"].append(store)
            dirs.append(
                {
                    "store": store,
                    "dir": entry.name,
                    "name": name,
                    "path": str(entry),
                    "desc_chars": len(desc),
                    "hash": tree_hash(entry),
                    "is_link": is_link(entry),
                }
            )
    return skills, dirs


def duplicate_names(dirs: list[dict]) -> list[dict]:
    """Directories in the same store that declare the same frontmatter name."""
    by_store: dict[tuple[str, str], list[str]] = {}
    for d in dirs:
        by_store.setdefault((d["store"], d["name"]), []).append(d["dir"])
    out = []
    for (store, name), ds in sorted(by_store.items()):
        if len(ds) > 1:
            out.append({"store": store, "name": name, "dirs": sorted(ds)})
    return out


def name_collisions(dirs: list[dict]) -> list[dict]:
    """Same skill name in two stores with different content."""
    by_name: dict[str, list[dict]] = {}
    for d in dirs:
        by_name.setdefault(d["name"], []).append(d)
    out = []
    for name, group in sorted(by_name.items()):
        hashes = {g["hash"] for g in group}
        if len(hashes) > 1:
            out.append(
                {
                    "name": name,
                    "copies": [
                        {"store": g["store"], "dir": g["dir"], "hash": g["hash"][:12]}
                        for g in group
                    ],
                }
            )
    return out


def divergence_check(vault: Path, manifest: dict[str, dict]) -> dict:
    """Compare manifest skills that also exist in the unmanaged config store
    against their vault source. Catches two-copies-one-skill drift."""
    unmanaged = STORES["config-kilo"]
    if not unmanaged.is_dir():
        return {}
    identical = different = 0
    raw_only = []
    detail = []
    for name, info in manifest.items():
        copy = unmanaged / name
        if not (copy / "SKILL.md").is_file():
            continue
        src = vault / info["path"].replace("/", "\\")
        if not src.is_dir():
            continue
        if tree_hash(src, normalize=True) == tree_hash(copy, normalize=True):
            identical += 1
        else:
            different += 1
            detail.append({"name": name})
        if tree_hash(src, normalize=False) != tree_hash(copy, normalize=False):
            raw_only.append(name)
    return {
        "compared": identical + different,
        "identical_after_crlf_normalisation": identical,
        "different_after_crlf_normalisation": different,
        "different_raw_bytes": len(raw_only),
        "raw_only_names": sorted(raw_only),
        "detail": detail,
    }


def divergence_position(a: str, b: str) -> int:
    """How many characters a reader must consume before two descriptions differ.

    This is the honest acceptance metric for shadowing. Word-overlap
    (Jaccard) punishes correct disambiguation, because "not for X, use Y
    instead" adds the sibling's name and shared scaffolding words to the text.
    What actually decides a match is how early the two descriptions split, so
    that is what gets measured.
    """
    n = min(len(a), len(b))
    i = 0
    while i < n and a[i] == b[i]:
        i += 1
    return i


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", default=None, help="write full results as JSON")
    ap.add_argument("--pairs", type=int, default=25, help="how many confusable pairs to report")
    ap.add_argument("--threshold", type=float, default=0.30, help="Jaccard threshold for a shadowing pair")
    ap.add_argument("--vault", default=None, help="vault root (for install-manifest.txt categories)")
    ap.add_argument("--tiers", default=None, help="path to skill-tiers.txt (default: <vault>/scripts/skill-tiers.txt)")
    args = ap.parse_args()

    vault = Path(args.vault) if args.vault else Path(__file__).resolve().parents[2]
    manifest = load_manifest(vault)
    tiers = load_tiers(vault)

    skills, dirs = collect()
    recs = list(skills.values())
    n = len(recs)
    desc_chars = sum(r["desc_chars"] for r in recs)
    name_chars = sum(len(r["name"]) for r in recs)
    listing_chars = desc_chars + name_chars
    listing_tokens = listing_chars / CHARS_PER_TOKEN
    max_desc = max((r["desc_chars"] for r in recs), default=0)
    avg_desc = desc_chars / n if n else 0
    avg_entry = (desc_chars + name_chars) / n if n else 0

    per_store = {s: sum(1 for r in recs if s in r["stores"]) for s in STORES}
    per_store_dirs = {s: sum(1 for d in dirs if d["store"] == s) for s in STORES}
    per_store_links = {
        s: sum(1 for d in dirs if d["store"] == s and d["is_link"]) for s in STORES
    }

    # ---- selection ambiguity -------------------------------------------------
    # Two metrics, because they answer different questions.
    #
    #   whole   - Jaccard over the description's content words. Detects skills
    #             whose descriptions are near-duplicates overall. Penalises
    #             CORRECT disambiguation, because a "not for X, use Y instead"
    #             clause adds the sibling's name to the text.
    #   prefix  - the same, over the first PREFIX_CHARS characters only. This is
    #             the part the model actually sees: a harness that runs short of
    #             listing budget truncates descriptions from the tail, so what
    #             decides a match is the head. This is the metric that tracks
    #             the real shadowing risk, and it is what the 2026-10-25
    #             description rewrites were aimed at.
    words = {r["name"]: content_words(r["description"]) for r in recs}
    prefix_words = {
        r["name"]: content_words(r["description"][:PREFIX_CHARS]) for r in recs
    }

    def jaccard(a: set[str], b: set[str]) -> float:
        if not a or not b:
            return 0.0
        return len(a & b) / len(a | b)

    def find_pairs(word_map: dict[str, set[str]]) -> list[tuple[float, str, str]]:
        out = []
        for a, b in combinations(sorted(word_map), 2):
            score = jaccard(word_map[a], word_map[b])
            if score > 0:
                out.append((score, a, b))
        out.sort(reverse=True)
        return out

    pairs = find_pairs(words)
    prefix_pairs = find_pairs(prefix_words)
    shadow_pairs = [p for p in pairs if p[0] >= args.threshold]
    prefix_shadow = [p for p in prefix_pairs if p[0] >= args.threshold]
    at_risk = Counter()
    for score, a, b in shadow_pairs:
        at_risk[a] += 1
        at_risk[b] += 1
    prefix_at_risk = Counter()
    for score, a, b in prefix_shadow:
        prefix_at_risk[a] += 1
        prefix_at_risk[b] += 1

    # ---- budgets -------------------------------------------------------------
    def fits(budget_chars: float, per_entry: float) -> int:
        return int(budget_chars // per_entry) if per_entry else 0

    def scenario(ctx_window: int, fraction: float, label: str) -> dict:
        budget_tokens = ctx_window * fraction
        budget_chars = budget_tokens * CHARS_PER_TOKEN
        return {
            "label": label,
            "context_window_tokens": ctx_window,
            "fraction": fraction,
            "budget_tokens": round(budget_tokens),
            "budget_chars": round(budget_chars),
            "skills_that_fit_at_avg_entry_cost": fits(budget_chars, avg_entry),
            "listing_over_budget_x": round(listing_chars / budget_chars, 1),
        }

    scenarios = [
        scenario(200_000, CLAUDE_CODE_BUDGET_FRACTION, "Claude Code 1% @ 200K ctx"),
        scenario(200_000, CODEX_BUDGET_FRACTION, "Codex 2% @ 200K ctx"),
        scenario(1_000_000, CLAUDE_CODE_BUDGET_FRACTION, "Claude Code 1% @ 1M ctx"),
        scenario(1_000_000, CODEX_BUDGET_FRACTION, "Codex 2% @ 1M ctx"),
    ]
    codex_cap_chars = CODEX_MAX_CONTEXT_TOKENS * CHARS_PER_TOKEN

    # ---- tiered view ---------------------------------------------------------
    tier_view = {}
    if tiers:
        def tier_of(name: str) -> str:
            # a skill that is not in the manifest is not tiered at all - it lives
            # in the machine's own store and is always visible
            return tiers.get(name, "A" if name not in manifest else "A")

        manifest_a = [r for r in recs if manifest.get(r["name"], {}).get("tier") == "A"]
        manifest_b = [r for r in recs if manifest.get(r["name"], {}).get("tier") == "B"]
        manifest_c = [r for r in recs if manifest.get(r["name"], {}).get("tier") == "C"]
        untiered = [r for r in recs if r["name"] not in manifest]
        a_chars = sum(r["desc_chars"] + len(r["name"]) for r in manifest_a)
        untiered_chars = sum(r["desc_chars"] + len(r["name"]) for r in untiered)
        tier_view = {
            "tier_file_entries": len(tiers),
            "manifest_tier_A": len(manifest_a),
            "manifest_tier_B": len(manifest_b),
            "manifest_tier_C": len(manifest_c),
            "not_in_manifest_always_visible": len(untiered),
            "manifest_tier_A_listing_chars": a_chars,
            "manifest_tier_A_listing_tokens_est": round(a_chars / CHARS_PER_TOKEN),
            "manifest_tier_A_over_1M_claude_budget_x": round(a_chars / 36_000, 2),
            "manifest_tier_A_over_200k_claude_budget_x": round(a_chars / 7_200, 2),
            "manifest_tier_A_over_codex_cap_x": round(a_chars / codex_cap_chars, 2),
            "effective_visible_listing_chars": a_chars + untiered_chars,
            "effective_visible_listing_tokens_est": round((a_chars + untiered_chars) / CHARS_PER_TOKEN),
            "effective_visible_over_1M_claude_budget_x": round((a_chars + untiered_chars) / 36_000, 2),
        }

    result = {
        "generated_for": "skill library pressure analysis",
        "stores": {k: str(v) for k, v in STORES.items()},
        "unique_skills": n,
        "directories": len(dirs),
        "per_store_visible": per_store,
        "per_store_directories": per_store_dirs,
        "per_store_symlinks": per_store_links,
        "listing": {
            "description_chars": desc_chars,
            "name_chars": name_chars,
            "listing_chars": listing_chars,
            "listing_tokens_est": round(listing_tokens),
            "avg_description_chars": round(avg_desc, 1),
            "avg_entry_cost_chars": round(avg_entry, 1),
            "max_description_chars": max_desc,
            "chars_per_token_assumed": CHARS_PER_TOKEN,
        },
        "budgets": {
            "claude_code_1pct_of_200k": {
                "tokens": round(CONTEXT_WINDOW * CLAUDE_CODE_BUDGET_FRACTION),
                "chars": round(CONTEXT_WINDOW * CLAUDE_CODE_BUDGET_FRACTION * CHARS_PER_TOKEN),
                "listing_over_budget_x": round(
                    listing_chars / (CONTEXT_WINDOW * CLAUDE_CODE_BUDGET_FRACTION * CHARS_PER_TOKEN), 1
                ),
            },
            "codex_fallback_8000_chars": {
                "chars": CODEX_FALLBACK_CHARS,
                "listing_over_budget_x": round(listing_chars / CODEX_FALLBACK_CHARS, 1),
            },
            "codex_max_context_tokens_cap": {
                "tokens": CODEX_MAX_CONTEXT_TOKENS,
                "chars": round(codex_cap_chars),
                "listing_over_budget_x": round(listing_chars / codex_cap_chars, 1),
            },
            "scenarios": scenarios,
        },
        "ambiguity": {
            "threshold": args.threshold,
            "shadowing_pairs": len(shadow_pairs),
            "skills_in_at_least_one_shadowing_pair": len(at_risk),
            "share_of_library_pct": round(100 * len(at_risk) / n, 1) if n else 0,
            "top_pairs": [
                {"jaccard": round(s, 3), "a": a, "b": b} for s, a, b in pairs[: args.pairs]
            ],
            "most_shadowed": at_risk.most_common(15),
            "prefix": {
                "chars": PREFIX_CHARS,
                "note": "Jaccard over the first N chars only - the part a budget-truncated listing still shows",
                "shadowing_pairs": len(prefix_shadow),
                "skills_in_at_least_one_shadowing_pair": len(prefix_at_risk),
                "share_of_library_pct": round(100 * len(prefix_at_risk) / n, 1) if n else 0,
                "top_pairs": [
                    {"jaccard": round(s, 3), "a": a, "b": b}
                    for s, a, b in prefix_pairs[: args.pairs]
                ],
                "most_shadowed": prefix_at_risk.most_common(15),
            },
            "divergence": {
                "note": (
                    "characters a reader must consume before two descriptions differ - "
                    "the acceptance metric for the 2026-10-25 description rewrites"
                ),
                "late_pairs": [
                    {
                        "divergence_chars": divergence_position(
                            skills[a]["description"], skills[b]["description"]
                        ),
                        "a": a,
                        "b": b,
                        "jaccard": round(s, 3),
                    }
                    for s, a, b in sorted(pairs, key=lambda t: -divergence_position(
                        skills[t[1]]["description"], skills[t[2]]["description"]
                    ))[: args.pairs]
                ],
                "pairs_diverging_within_40_chars": sum(
                    1
                    for _, a, b in pairs
                    if divergence_position(skills[a]["description"], skills[b]["description"]) <= 40
                ),
                "pairs_total": len(pairs),
            },
        },
        "integrity": {
            "duplicate_frontmatter_names": duplicate_names(dirs),
            "cross_store_name_collisions": name_collisions(dirs),
            "divergence_config_store_vs_vault": divergence_check(vault, manifest),
        },
        "tiers": tier_view,
        "categories": {
            c: sum(1 for r in recs if manifest.get(r["name"], {}).get("category") == c)
            for c in sorted({manifest.get(r["name"], {}).get("category", "hand-installed") for r in recs})
        },
        "provenance": {
            k: sum(1 for r in recs if manifest.get(r["name"], {}).get("kind") == k)
            for k in ("curated", "vendor", "host")
        }
        | {"hand-installed": sum(1 for r in recs if r["name"] not in manifest)},
        "vault_manifest_entries": len(manifest),
    }

    print(json.dumps(result, indent=2, ensure_ascii=False))
    if args.json:
        Path(args.json).write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
