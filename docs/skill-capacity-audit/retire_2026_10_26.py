#!/usr/bin/env python3
"""Second retirement pass, 2026-10-26 - cross-review of two independent audits.

Two agents scored the installed library independently on this machine; this
script retires the skills both flagged as unusable or redundant, plus the
service-account families the owner chose to drop (PlanetScale, Dynatrace,
Grafana Cloud-only). It edits the vault's bookkeeping only; the user stores
are pruned by scripts/sync-skills.ps1 -Prune afterwards.

Writes (all CRLF, matching the existing files):
  SKILL/...                    deletes the curated skill dirs (vendor/ untouched)
  scripts/skill-tiers.txt      drops retired rows; demotes 7 tier-A skills to B
  scripts/build-manifest.ps1   drops tripo-3d-generation from $VendorSkills
  .kilo/pinned-skills.txt      drops tripo-3d-generation
  .kilo/removed-skills.txt     appends the 49 names (sync refuses them)
  REMOVED-SKILLS.md            appends a 2026-10-26 section with reasons

Usage (repo root):  py -3 docs/skill-capacity-audit/retire_2026_10_26.py [--dry-run]
"""
import shutil, sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
DRY = "--dry-run" in sys.argv
V = Path(__file__).resolve().parents[2]
NL = "\r\n"

# name -> (class, reason, both_reports_agreed)
NOT_USABLE = "U (never usable here)"
NOT_ALONE = "S (not standalone)"
REDUNDANT = "D (redundant)"
SERVICE = "X (needs external account)"
RETIRE = {
    "monte-carlo-proactive-monitoring": (NOT_ALONE, "pure router: every step loads `monitoring-advisor`/`prevent`, both retired 2026-10-25; no logic of its own", True),
    "ltx2": (NOT_USABLE, "runs `tools/ltx2.py` and cites `docs/ltx2.md`, neither shipped; needs a Modal A100 endpoint", True),
    "runpod": (NOT_USABLE, "runs 5 `tools/*.py` scripts that are not shipped; needs a RunPod account", True),
    "acestep": (NOT_USABLE, "runs `tools/music_gen.py`/`tools/sfx.py`, not shipped; needs a Modal or RunPod endpoint", True),
    "ideogram4": (NOT_USABLE, "runs `tools/ideogram4.py`/`tools/flux2.py`, not shipped; needs an Ideogram API key", True),
    "tripo-3d-generation": (SERVICE, "calls an unofficial proxy `tripo-proxy.darknessporo.workers.dev` (trust risk) for a paid API", True),
    "taste-output": (REDUNDANT, "generic \"never truncate\" override with no subject; harness default behaviour", True),
    "debugger-persona": (REDUNDANT, "subset of `systematic-debugging` + `diagnosing-bugs` + `shuorenhua`", True),
    "skill-auto-improve-mirror": (NOT_USABLE, "written for Hermes (`skill_view`, `~/.hermes`); no Hermes install on this machine; was tier A", True),
}
for n in ("autonomous-execution-mode", "best-practices-matrix", "change-gates-and-approval-contract",
          "codebase-sqlcommenter-instrumentation", "customer-report-template", "postgres-safety-review",
          "pscale-cli-automation", "query-insights-and-tags", "readonly-inventory", "safe-orchestrator",
          "schema-recommendations-agent-loop", "traffic-control-recommendations", "vitess-safety-review",
          "webhook-automation-recommendations"):
    RETIRE["planetscale-" + n] = (SERVICE, "needs a PlanetScale org + `pscale`; one assessment split 14 ways (the orchestrator reads its 13 siblings by `../` path, so the family goes together)", True)
for n in ("alerting", "app-dashboards", "dql-essentials", "obs-analytics", "obs-logs", "obs-problems",
          "obs-services", "obs-tracing", "platform-costs", "sec-insights", "setup-oneagent"):
    RETIRE["dt-" + n] = (SERVICE, "needs a Dynatrace tenant + token; `dtctl` not installed", True)
for n in ("adaptive-metrics", "admin", "app-observability", "cloud-integrations", "cost-management",
          "database-observability", "dpm-finder", "fleet-management", "frontend-session-rca",
          "infrastructure", "ml-ai", "oncall-irm", "private-connectivity", "send-data", "performance-rca"):
    RETIRE["grafana-" + n] = (SERVICE, "Grafana Cloud only (stack + `glc_` token / `gcx`); the self-hostable Grafana skills stay", True)

DEMOTE = ["implement", "grill-me", "grill-with-docs",       # thin aliases, user-invocable only
          "code-review", "brainstorming", "game-dev-loop",  # route to missing skills
          "skill-distill"]                                  # written for another repo

VENDOR_ONLY = {"tripo-3d-generation"}


def rewrite(path: Path, lines):
    if not DRY:
        path.write_bytes((NL.join(lines) + NL).encode("utf-8"))


def read_lines(path: Path):
    return path.read_bytes().decode("utf-8").replace("\r\n", "\n").rstrip("\n").split("\n")


def main():
    # ---- manifest is the map from name -> vault path
    man = {}
    for l in read_lines(V / "scripts/install-manifest.txt"):
        if l and not l.startswith("#"):
            n, p, *_ = l.split("|")
            man[n] = p
    missing = sorted(set(RETIRE) - set(man))
    assert not missing, f"not in manifest: {missing}"

    # ---- 1. delete curated dirs
    deleted = []
    for n in sorted(RETIRE):
        p = man[n]
        if p.startswith("vendor/"):
            continue
        d = V / p
        assert d.is_dir() and (d / "SKILL.md").is_file(), d
        deleted.append(p)
        if not DRY:
            shutil.rmtree(d)
    # drop now-empty family dirs
    for fam in ("SKILL/devops/monte-carlo", "SKILL/devops/planetscale", "SKILL/devops/dynatrace"):
        d = V / fam
        if d.is_dir() and not DRY and not any(d.rglob("SKILL.md")):
            shutil.rmtree(d)

    # ---- 2. tiers
    tf = V / "scripts/skill-tiers.txt"
    out, dropped, demoted = [], 0, []
    for l in read_lines(tf):
        name = l.split("|", 1)[0].strip() if "|" in l and not l.startswith("#") else None
        if name in RETIRE:
            dropped += 1
            continue
        if name in DEMOTE and l.strip().endswith("|A"):
            l = f"{name}|B"
            demoted.append(name)
        out.append(l)
    rewrite(tf, out)

    # ---- 3. vendor list in build-manifest.ps1 + pinned list
    bm = V / "scripts/build-manifest.ps1"
    lines = read_lines(bm)
    kept = [l for l in lines if not any(f"'{n}|vendor/" in l for n in VENDOR_ONLY)]
    for i, l in enumerate(kept):           # the previous entry now ends the array
        if l.strip() == ")" and kept[i - 1].rstrip().endswith("',"):
            kept[i - 1] = kept[i - 1].rstrip()[:-1]
            break
    rewrite(bm, kept)
    pf = V / ".kilo/pinned-skills.txt"
    rewrite(pf, [l for l in read_lines(pf) if l.strip() not in VENDOR_ONLY])

    # ---- 4. denylist
    rf = V / ".kilo/removed-skills.txt"
    cur = read_lines(rf)
    have = {l.strip() for l in cur}
    add = [n for n in sorted(RETIRE) if n not in have]
    cur += ["# --- 2026-10-26 cross-review retirement (REMOVED-SKILLS.md, second section) ---"] + add
    rewrite(rf, cur)

    # ---- 5. human record
    rm = V / "REMOVED-SKILLS.md"
    rec = read_lines(rm)
    rec[2] = rec[2].replace("68 skills were removed", "68 skills were removed on 2026-10-25 and 49 more on 2026-10-26")
    rec += ["", "## Retired skills - 2026-10-26 cross-review", "",
            "Two agents audited the installed library independently on this machine",
            "(packaging score + whether it runs here + whether it stands alone + overlap).",
            "Retired: everything both reports flagged as broken or redundant, plus the",
            "service-account families the owner chose to drop (PlanetScale, Dynatrace,",
            "and the Grafana Cloud-only skills; the self-hostable Grafana skills stay).",
            "",
            "| class | meaning |", "|---|---|",
            "| U | never usable here (payload scripts not shipped, or the host app is absent) |",
            "| S | not standalone (only routes to skills that no longer exist) |",
            "| D | redundant (duplicates another installed skill, or has no subject) |",
            "| X | needs an external account this machine does not have |",
            "",
            "Also on 2026-10-26, without retiring: `implement`, `grill-me`, `grill-with-docs`,",
            "`code-review`, `brainstorming`, `game-dev-loop` and `skill-distill` moved from",
            "tier A to tier B (still installed, no longer in the always-visible listing).",
            "Fixes for the skills that stay are queued in `SKILL_CANDIDATES.md`.",
            "",
            "| skill | class | reason | promoted copy removed | upstream kept in vendor |",
            "|---|---|---|---|---|"]
    for n in sorted(RETIRE):
        cls, why, _ = RETIRE[n]
        p = man[n]
        removed = "_(vendor-only; not copied into SKILL/)_" if p.startswith("vendor/") else f"`{p[len('SKILL/'):]}/`"
        if p.startswith("vendor/"):
            up = f"`{p}/`"
        elif n.startswith("planetscale-"):
            up = "`vendor/planetscale-skills/`"
        elif n.startswith("dt-"):
            up = "`vendor/dynatrace-for-ai/`"
        elif n.startswith("grafana-"):
            up = "`vendor/grafana-skills/`"
        elif n == "monte-carlo-proactive-monitoring":
            up = "`vendor/mc-agent-toolkit/`"
        elif n in ("ltx2", "runpod", "acestep", "ideogram4"):
            up = "`vendor/claude-code-video-toolkit/` (with the `tools/` it needs)"
        elif n == "taste-output":
            up = "_(sibling repo `taste-skill`, `output-skill`)_"
        else:
            up = "_(local skill - git history only)_"
        rec.append(f"| `{n}` | {cls} | {why} | {removed} | {up} |")
    rewrite(rm, rec)

    print(f"{'DRY ' if DRY else ''}retired {len(RETIRE)}; dirs deleted {len(deleted)}; "
          f"tier rows dropped {dropped}; demoted {demoted}; denylist +{len(add)}")


if __name__ == "__main__":
    main()
