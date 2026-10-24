# Skill capacity / completeness audit — 2026-10-24

Scored **347** installed skills (canonical store `~/.claude/skills`) 0–10 on five measurable dimensions.  Average **6.52**, median **6.45**, range 2.0–10.0.

Scoring is mechanical (no vibes): every point comes from a property of the package on disk.
Rebuild with:

```powershell
python docs/skill-capacity-audit/score_skills.py --root $env:USERPROFILE\.claude\skills `
  --vault . --out docs/skill-capacity-audit --date 2026-10-24
```

## Rubric

| dim | max | what earns the points |
|---|---|---|
| A · contract & metadata | 3 | YAML frontmatter present (1) · `name:` == folder name (0.5) · version/license (0.5) · description ≥80 chars (0.5) · description states a trigger (0.5) |
| B · instruction depth | 2 | body ≥1500 chars (0.7) · ≥4000 chars (0.7) · ≥3 headings (0.3) · ≥2 code blocks (0.3) |
| C · payload richness | 2 | `references/` (0.5) · `scripts/` (0.5) · `templates`/`assets`/`examples`/`docs` (0.5) · ≥5 payload files (0.5) |
| D · link integrity | 2 | 2 × (1 − broken/total referenced relative paths) |
| E · hygiene | 1 | no TODO/占位 markers (0.5) · at least one non-stub script (0.5) |

## Score distribution

| score | skills |
|---|---|
| 2 | 4 |
| 3 | 4 |
| 4 | 34 |
| 5 | 64 |
| 6 | 96 |
| 7 | 89 |
| 8 | 43 |
| 9 | 12 |
| 10 | 1 |

## Failure modes

| symptom | skills | share |
|---|---|---|
| no YAML frontmatter (harness cannot trigger it) | 52 | 14% |
| ≥1 broken relative reference | 70 | 20% |
| TODO/占位 markers in body | 53 | 15% |
| single-file skill (no payload dirs) | 112 | 32% |
| no non-stub script | 280 | 80% |

### Root causes (why the scores look like this)

1. **52 skills are missing the `---` YAML fence.**  Their `name:` / `description:` lines are plain body text (`# Title` → `name:` → `description:`), so a strict harness loader sees no frontmatter and cannot trigger them.  *All 52 are mechanically fixable*: wrap the existing `name:`/`description:` lines in `---` fences.  Upstream set: `vendor/claude-skills` (`.gemini/skills/*` style, plus the finance / grafana packs).
2. **70 skills reference files that do not exist next to them.**  Typical shapes: `references/logql.md`, `scripts/extract-pptx.py`, `assets/day1024/...`, and cross-skill links like `../finance/cs-financial-analyst.md`.  In the vault the same links are dangling too (checked — 0 of them resolve), so this is an **upstream packaging gap**, not a copy mistake.
3. **112 skills ship as a single `SKILL.md`** with no `references/`, `templates/`, `scripts/` or `assets/` directory — the instruction text points at material that was never shipped alongside it.
4. **280 of 347 have no runnable script.**  For guidance-style skills that is legitimate, but it means the score cannot be earned through tooling either.

### Remediation order

| priority | action | effect | effort |
|---|---|---|---|
| 1 | add `---` fences to the 52 skills that already contain `name:`/`description:` | +52 × 1.5 contract points ≈ lifts ~30 skills out of the bottom half | script, minutes |
| 2 | re-copy payload for skills whose upstream *does* ship `references/` | recovers D and C points for the worst offenders | needs per-skill check against upstream |
| 3 | resolve sibling links (`../finance/...`) at install time, or vendor the sibling files | removes ~15 broken refs | installer change |
| 4 | decide keep-or-drop for the 4 score-2.0/2.5 skills (`grafana-loki`, `grafana-datasources-provisioning`, `deferred-taxes`, `gaap-standards`) | removes dead weight | user decision |

## Bottom 50% — the weakest half (173 of 347)

| # | skill | score | A | B | C | D | E | main defect |
|---|---|---|---|---|---|---|---|---|
| 1 | `grafana-datasources-provisioning` | **2.0** | 0.0 | 2.0 | 0.0 | 0.0 | 0.0 | no frontmatter, 1 broken ref, placeholder, no payload, no script |
| 2 | `grafana-loki` | **2.0** | 0.0 | 2.0 | 0.0 | 0.0 | 0.0 | no frontmatter, 3 broken ref, placeholder, no payload, no script |
| 3 | `deferred-taxes` | **2.5** | 0.0 | 2.0 | 0.0 | 0.0 | 0.5 | no frontmatter, 1 broken ref, no payload, no script |
| 4 | `gaap-standards` | **2.5** | 0.0 | 2.0 | 0.0 | 0.0 | 0.5 | no frontmatter, 1 broken ref, no payload, no script |
| 5 | `html-slides` | **3.0** | 2.0 | 1.0 | 0.0 | 0.0 | 0.0 | 1 broken ref, placeholder, no payload, no script |
| 6 | `cs-growth-strategist` | **3.5** | 2.0 | 1.0 | 0.0 | 0.0 | 0.5 | 2 broken ref, no payload, no script |
| 7 | `mock-devops-platform` | **3.5** | 2.5 | 1.0 | 0.0 | 0.0 | 0.0 | 12 broken ref, placeholder, no payload, no script |
| 8 | `grafana-synthetic-monitoring-checks` | **3.67** | 0.0 | 2.0 | 0.5 | 0.67 | 0.5 | no frontmatter, 2 broken ref, no script |
| 9 | `cs-financial-analyst` | **4.2** | 2.0 | 1.7 | 0.0 | 0.0 | 0.5 | 2 broken ref, no payload, no script |
| 10 | `finance-lead` | **4.2** | 0.0 | 1.7 | 0.0 | 2.0 | 0.5 | no frontmatter, no payload, no script |
| 11 | `grafana-dpm-finder` | **4.3** | 0.0 | 1.3 | 0.5 | 2.0 | 0.5 | no frontmatter, no script |
| 12 | `governance-doc-design` | **4.45** | 2.75 | 1.7 | 0.0 | 0.0 | 0.0 | 1 broken ref, placeholder, no payload, no script |
| 13 | `ai-3d-toolchain` | **4.5** | 3.0 | 1.0 | 0.0 | 0.0 | 0.5 | 2 broken ref, no payload, no script |
| 14 | `comparable-analysis` | **4.5** | 0.0 | 2.0 | 0.0 | 2.0 | 0.5 | no frontmatter, no payload, no script |
| 15 | `consolidation` | **4.5** | 0.0 | 2.0 | 0.0 | 2.0 | 0.5 | no frontmatter, no payload, no script |
| 16 | `dcf-valuation` | **4.5** | 0.0 | 2.0 | 0.0 | 2.0 | 0.5 | no frontmatter, no payload, no script |
| 17 | `deal-structuring` | **4.5** | 0.0 | 2.0 | 0.0 | 2.0 | 0.5 | no frontmatter, no payload, no script |
| 18 | `earnings-models` | **4.5** | 0.0 | 2.0 | 0.0 | 2.0 | 0.5 | no frontmatter, no payload, no script |
| 19 | `game-skill` | **4.5** | 2.5 | 2.0 | 0.0 | 0.0 | 0.0 | 4 broken ref, placeholder, no payload, no script |
| 20 | `goal-persistence` | **4.5** | 3.0 | 1.0 | 0.0 | 0.0 | 0.5 | 1 broken ref, no payload, no script |
| 21 | `grafana-cloud-integrations` | **4.5** | 0.0 | 2.0 | 0.0 | 2.0 | 0.5 | no frontmatter, no payload, no script |
| 22 | `grafana-profilecli-insights` | **4.5** | 0.0 | 2.0 | 0.0 | 2.0 | 0.5 | no frontmatter, no payload, no script |
| 23 | `grafana-prometheus` | **4.5** | 0.0 | 2.0 | 0.0 | 2.0 | 0.5 | no frontmatter, no payload, no script |
| 24 | `grafana-prometheus-cardinality-troubleshooter` | **4.5** | 0.0 | 2.0 | 0.0 | 2.0 | 0.5 | no frontmatter, no payload, no script |
| 25 | `grafana-prometheus-label-strategy` | **4.5** | 0.0 | 2.0 | 0.0 | 2.0 | 0.5 | no frontmatter, no payload, no script |
| 26 | `grafana-send-data` | **4.5** | 0.0 | 2.0 | 0.0 | 2.0 | 0.5 | no frontmatter, no payload, no script |
| 27 | `hgb-standards` | **4.5** | 0.0 | 2.0 | 0.0 | 2.0 | 0.5 | no frontmatter, no payload, no script |
| 28 | `ifrs-standards` | **4.5** | 0.0 | 2.0 | 0.0 | 2.0 | 0.5 | no frontmatter, no payload, no script |
| 29 | `lbo-modeling` | **4.5** | 0.0 | 2.0 | 0.0 | 2.0 | 0.5 | no frontmatter, no payload, no script |
| 30 | `lease-accounting` | **4.5** | 0.0 | 2.0 | 0.0 | 2.0 | 0.5 | no frontmatter, no payload, no script |
| 31 | `pitch-book-creation` | **4.5** | 0.0 | 2.0 | 0.0 | 2.0 | 0.5 | no frontmatter, no payload, no script |
| 32 | `precedent-transactions` | **4.5** | 0.0 | 2.0 | 0.0 | 2.0 | 0.5 | no frontmatter, no payload, no script |
| 33 | `revenue-recognition` | **4.5** | 0.0 | 2.0 | 0.0 | 2.0 | 0.5 | no frontmatter, no payload, no script |
| 34 | `sector-analysis` | **4.5** | 0.0 | 2.0 | 0.0 | 2.0 | 0.5 | no frontmatter, no payload, no script |
| 35 | `writing-plans` | **4.5** | 2.5 | 2.0 | 0.0 | 0.0 | 0.0 | 2 broken ref, placeholder, no payload, no script |
| 36 | `academy-guide` | **4.7** | 2.5 | 1.7 | 0.0 | 0.0 | 0.5 | 1 broken ref, no script |
| 37 | `god-leader-advisor` | **4.7** | 2.5 | 1.7 | 0.0 | 0.0 | 0.5 | 23 broken ref, no payload, no script |
| 38 | `grafana-alloy` | **4.75** | 0.0 | 2.0 | 0.75 | 2.0 | 0.0 | no frontmatter, placeholder, no script |
| 39 | `grafana-pyroscope` | **4.75** | 0.0 | 2.0 | 0.75 | 2.0 | 0.0 | no frontmatter, placeholder, no script |
| 40 | `implement` | **4.75** | 1.75 | 0.0 | 0.5 | 2.0 | 0.5 | no script |
| 41 | `grafana-testing` | **4.85** | 0.0 | 2.0 | 0.75 | 1.6 | 0.5 | no frontmatter, 1 broken ref, no script |
| 42 | `qwen-edit` | **4.95** | 2.5 | 1.7 | 0.25 | 0.0 | 0.5 | 1 broken ref, no script |
| 43 | `cs-product-strategist` | **5.0** | 2.5 | 2.0 | 0.0 | 0.0 | 0.5 | 10 broken ref, no payload, no script |
| 44 | `grafana-adaptive-metrics` | **5.0** | 0.0 | 2.0 | 0.5 | 2.0 | 0.5 | no frontmatter, no script |
| 45 | `grafana-dashboarding` | **5.0** | 0.0 | 2.0 | 0.5 | 2.0 | 0.5 | no frontmatter, no script |
| 46 | `grafana-performance-rca` | **5.0** | 0.0 | 2.0 | 0.5 | 2.0 | 0.5 | no frontmatter, no script |
| 47 | `grafana-promql` | **5.0** | 0.0 | 2.0 | 0.5 | 2.0 | 0.5 | no frontmatter, no script |
| 48 | `hyperframes-video` | **5.0** | 2.0 | 2.0 | 0.5 | 0.0 | 0.5 | 1 broken ref, no script |
| 49 | `intro-scene-until-perfect` | **5.0** | 3.0 | 2.0 | 0.0 | 0.0 | 0.0 | 6 broken ref, placeholder, no payload, no script |
| 50 | `kanban-cron-overseer` | **5.0** | 2.5 | 2.0 | 0.5 | 0.0 | 0.0 | 6 broken ref, placeholder, no script |
| 51 | `ltx2` | **5.0** | 2.5 | 2.0 | 0.0 | 0.0 | 0.5 | 1 broken ref, no payload, no script |
| 52 | `moviepy` | **5.0** | 2.5 | 2.0 | 0.0 | 0.0 | 0.5 | 2 broken ref, no payload, no script |
| 53 | `playwright-recording` | **5.0** | 2.5 | 2.0 | 0.0 | 0.0 | 0.5 | 1 broken ref, no script |
| 54 | `product-strategist` | **5.0** | 2.5 | 2.0 | 0.0 | 0.0 | 0.5 | 4 broken ref, no payload, no script |
| 55 | `synthetic-ui-demo` | **5.0** | 2.5 | 2.0 | 0.0 | 0.0 | 0.5 | 2 broken ref, no payload, no script |
| 56 | `taste-output` | **5.0** | 2.0 | 1.0 | 0.0 | 2.0 | 0.0 | placeholder, no payload, no script |
| 57 | `video_toolkit` | **5.0** | 2.5 | 2.0 | 0.0 | 0.0 | 0.5 | 2 broken ref, no payload, no script |
| 58 | `wayfinder` | **5.0** | 2.0 | 2.0 | 0.5 | 0.0 | 0.5 | 1 broken ref, no script |
| 59 | `code-review` | **5.2** | 2.5 | 1.7 | 0.5 | 0.0 | 0.5 | 1 broken ref, no script |
| 60 | `grafana-admin` | **5.25** | 0.0 | 2.0 | 0.75 | 2.0 | 0.5 | no frontmatter, no script |
| 61 | `grafana-alerting-irm` | **5.25** | 0.0 | 2.0 | 0.75 | 2.0 | 0.5 | no frontmatter, no script |
| 62 | `grafana-assistant-mcp` | **5.25** | 0.0 | 2.0 | 0.75 | 2.0 | 0.5 | no frontmatter, no script |
| 63 | `grafana-beyla` | **5.25** | 0.0 | 2.0 | 0.75 | 2.0 | 0.5 | no frontmatter, no script |
| 64 | `grafana-cost-management` | **5.25** | 0.0 | 2.0 | 0.75 | 2.0 | 0.5 | no frontmatter, no script |
| 65 | `grafana-database-observability` | **5.25** | 0.0 | 2.0 | 0.75 | 2.0 | 0.5 | no frontmatter, no script |
| 66 | `grafana-fleet-management` | **5.25** | 0.0 | 2.0 | 0.75 | 2.0 | 0.5 | no frontmatter, no script |
| 67 | `grafana-frontend-session-rca` | **5.25** | 0.0 | 2.0 | 0.75 | 2.0 | 0.5 | no frontmatter, no script |
| 68 | `grafana-infrastructure` | **5.25** | 0.0 | 2.0 | 0.75 | 2.0 | 0.5 | no frontmatter, no script |
| 69 | `grafana-loki-label-analyzer` | **5.25** | 0.0 | 2.0 | 0.75 | 2.0 | 0.5 | no frontmatter, no script |
| 70 | `grafana-mimir` | **5.25** | 0.0 | 2.0 | 0.75 | 2.0 | 0.5 | no frontmatter, no script |
| 71 | `grafana-ml-ai` | **5.25** | 0.0 | 2.0 | 0.75 | 2.0 | 0.5 | no frontmatter, no script |
| 72 | `grafana-oncall-irm` | **5.25** | 0.0 | 2.0 | 0.75 | 2.0 | 0.5 | no frontmatter, no script |
| 73 | `grafana-opentelemetry` | **5.25** | 0.0 | 2.0 | 0.75 | 2.0 | 0.5 | no frontmatter, no script |
| 74 | `grafana-private-connectivity` | **5.25** | 0.0 | 2.0 | 0.75 | 2.0 | 0.5 | no frontmatter, no script |
| 75 | `grafana-skill-authoring` | **5.25** | 0.0 | 2.0 | 0.75 | 2.0 | 0.5 | no frontmatter, no script |
| 76 | `grafana-tempo` | **5.25** | 0.0 | 2.0 | 0.75 | 2.0 | 0.5 | no frontmatter, no script |
| 77 | `requesting-code-review` | **5.3** | 2.5 | 1.3 | 0.0 | 1.0 | 0.5 | 1 broken ref, no script |
| 78 | `handoff` | **5.35** | 2.0 | 0.35 | 0.5 | 2.0 | 0.5 | no script |
| 79 | `legalrabbit-docx` | **5.35** | 2.5 | 0.35 | 0.0 | 2.0 | 0.5 | no payload, no script |
| 80 | `competitive-matrix` | **5.45** | 2.0 | 0.95 | 0.0 | 2.0 | 0.5 | no payload, no script |
| 81 | `concentrate-forces` | **5.5** | 2.5 | 1.0 | 0.0 | 2.0 | 0.0 | placeholder, no script |
| 82 | `game-archetype-classifier` | **5.5** | 2.0 | 1.0 | 0.0 | 2.0 | 0.5 | no payload, no script |
| 83 | `game-dev-agent-workflow` | **5.5** | 2.0 | 1.0 | 0.0 | 2.0 | 0.5 | no payload, no script |
| 84 | `game-platformer` | **5.5** | 2.0 | 1.0 | 0.0 | 2.0 | 0.5 | no payload, no script |
| 85 | `game-template-engineering` | **5.5** | 2.0 | 1.0 | 0.0 | 2.0 | 0.5 | no payload, no script |
| 86 | `game-top-down-action` | **5.5** | 2.0 | 1.0 | 0.0 | 2.0 | 0.5 | no payload, no script |
| 87 | `game-ui-heavy-narrative` | **5.5** | 2.0 | 1.0 | 0.0 | 2.0 | 0.5 | no payload, no script |
| 88 | `grafana-app-observability` | **5.5** | 0.0 | 2.0 | 1.0 | 2.0 | 0.5 | no frontmatter, no script |
| 89 | `grafana-oss` | **5.5** | 0.0 | 2.0 | 1.0 | 2.0 | 0.5 | no frontmatter, no script |
| 90 | `guide-from-probes` | **5.5** | 3.0 | 2.0 | 0.0 | 0.0 | 0.5 | 6 broken ref, no payload, no script |
| 91 | `planetscale-schema-recommendations-agent-loop` | **5.5** | 2.0 | 1.0 | 0.0 | 2.0 | 0.5 | no payload, no script |
| 92 | `render-quality-loop` | **5.5** | 3.0 | 2.0 | 0.0 | 0.0 | 0.5 | 3 broken ref, no payload, no script |
| 93 | `research` | **5.5** | 2.5 | 0.0 | 0.5 | 2.0 | 0.5 | no script |
| 94 | `resolving-merge-conflicts` | **5.6** | 2.25 | 0.35 | 0.5 | 2.0 | 0.5 | no script |
| 95 | `improve-codebase-architecture` | **5.62** | 2.0 | 1.7 | 0.75 | 0.67 | 0.5 | 2 broken ref, no script |
| 96 | `prompt-pro` | **5.65** | 2.5 | 0.65 | 0.0 | 2.0 | 0.5 | no payload, no script |
| 97 | `brainstorming` | **5.7** | 2.0 | 1.7 | 1.0 | 0.0 | 1.0 | 1 broken ref |
| 98 | `game-build-verification` | **5.7** | 2.0 | 1.7 | 0.0 | 2.0 | 0.0 | placeholder, no payload, no script |
| 99 | `game-template` | **5.7** | 2.0 | 1.7 | 0.0 | 2.0 | 0.0 | placeholder, no payload, no script |
| 100 | `taste-redesign` | **5.7** | 2.0 | 1.7 | 0.0 | 2.0 | 0.0 | placeholder, no payload, no script |
| 101 | `taste-stitch` | **5.7** | 2.0 | 1.7 | 0.0 | 2.0 | 0.0 | placeholder, no script |
| 102 | `prd` | **5.8** | 2.0 | 1.3 | 0.0 | 2.0 | 0.5 | no payload, no script |
| 103 | `skill-distill` | **5.8** | 2.0 | 1.3 | 0.0 | 2.0 | 0.5 | no payload, no script |
| 104 | `aisides-ai-self-review` | **5.85** | 2.5 | 2.0 | 0.75 | 0.6 | 0.0 | 7 broken ref, placeholder, no script |
| 105 | `remotion-render` | **5.9** | 2.0 | 0.65 | 0.75 | 2.0 | 0.5 | no script |
| 106 | `ui-mockups` | **5.95** | 2.5 | 1.7 | 0.75 | 1.0 | 0.0 | 1 broken ref, placeholder, no script |
| 107 | `arming-thought` | **6.0** | 2.5 | 1.0 | 0.0 | 2.0 | 0.5 | no payload, no script |
| 108 | `bezos-advisor` | **6.0** | 2.5 | 1.0 | 0.0 | 2.0 | 0.5 | no payload, no script |
| 109 | `claude-api` | **6.0** | 2.5 | 2.0 | 0.5 | 0.0 | 1.0 | 1 broken ref |
| 110 | `daily-ui-inspiration-capture` | **6.0** | 2.5 | 2.0 | 1.0 | 0.0 | 0.5 | 2 broken ref, no script |
| 111 | `game-debug` | **6.0** | 2.0 | 2.0 | 0.0 | 2.0 | 0.0 | placeholder, no payload, no script |
| 112 | `game-gdd-writing` | **6.0** | 2.5 | 1.0 | 0.0 | 2.0 | 0.5 | no payload, no script |
| 113 | `okr-planner` | **6.0** | 2.5 | 1.0 | 0.0 | 2.0 | 0.5 | no payload, no script |
| 114 | `practice-cognition` | **6.0** | 2.5 | 1.0 | 0.0 | 2.0 | 0.5 | no script |
| 115 | `renzhengfei-advisor` | **6.0** | 2.5 | 1.0 | 0.0 | 2.0 | 0.5 | no payload, no script |
| 116 | `self-improvement` | **6.0** | 2.5 | 1.0 | 0.0 | 2.0 | 0.5 | no payload, no script |
| 117 | `source-anchored-design` | **6.0** | 2.5 | 1.0 | 0.0 | 2.0 | 0.5 | no payload, no script |
| 118 | `taste-director` | **6.0** | 3.0 | 1.0 | 0.0 | 2.0 | 0.0 | placeholder, no payload, no script |
| 119 | `taste-frontend` | **6.0** | 2.0 | 2.0 | 0.0 | 2.0 | 0.0 | placeholder, no payload, no script |
| 120 | `to-spec` | **6.0** | 2.0 | 1.0 | 0.5 | 2.0 | 0.5 | no script |
| 121 | `zhangyiming-advisor` | **6.0** | 2.5 | 1.0 | 0.0 | 2.0 | 0.5 | no payload, no script |
| 122 | `setup-matt-pocock-skills` | **6.03** | 2.0 | 1.7 | 1.0 | 0.83 | 0.5 | 7 broken ref, no script |
| 123 | `domain-modeling` | **6.05** | 2.5 | 1.3 | 0.75 | 1.0 | 0.5 | 2 broken ref, no script |
| 124 | `debugger-persona` | **6.15** | 3.0 | 0.65 | 0.0 | 2.0 | 0.5 | no payload, no script |
| 125 | `mgmt-discipline` | **6.15** | 2.5 | 0.65 | 0.5 | 2.0 | 0.5 | no script |
| 126 | `mgmt-individual` | **6.15** | 2.5 | 0.65 | 0.5 | 2.0 | 0.5 | no script |
| 127 | `mgmt-org` | **6.15** | 2.5 | 0.65 | 0.5 | 2.0 | 0.5 | no script |
| 128 | `remotion-multimedia` | **6.15** | 2.0 | 0.65 | 1.0 | 2.0 | 0.5 | no script |
| 129 | `remotion-saas` | **6.15** | 2.0 | 0.65 | 1.0 | 2.0 | 0.5 | no script |
| 130 | `game-asset-art-direction` | **6.2** | 2.0 | 1.7 | 0.0 | 2.0 | 0.5 | no payload, no script |
| 131 | `game-grid-logic` | **6.2** | 2.0 | 1.7 | 0.0 | 2.0 | 0.5 | no payload, no script |
| 132 | `game-tower-defense` | **6.2** | 2.0 | 1.7 | 0.0 | 2.0 | 0.5 | no payload, no script |
| 133 | `grilling` | **6.2** | 2.5 | 0.7 | 0.5 | 2.0 | 0.5 | no script |
| 134 | `planetscale-autonomous-execution-mode` | **6.2** | 2.0 | 1.7 | 0.0 | 2.0 | 0.5 | no payload, no script |
| 135 | `planetscale-best-practices-matrix` | **6.2** | 2.0 | 1.7 | 0.0 | 2.0 | 0.5 | no payload, no script |
| 136 | `planetscale-change-gates-and-approval-contract` | **6.2** | 2.0 | 1.7 | 0.0 | 2.0 | 0.5 | no payload, no script |
| 137 | `planetscale-codebase-sqlcommenter-instrumentation` | **6.2** | 2.0 | 1.7 | 0.0 | 2.0 | 0.5 | no payload, no script |
| 138 | `planetscale-customer-report-template` | **6.2** | 2.0 | 1.7 | 0.0 | 2.0 | 0.5 | no payload, no script |
| 139 | `planetscale-mcp-agent-operating-model` | **6.2** | 2.0 | 1.7 | 0.0 | 2.0 | 0.5 | no payload, no script |
| 140 | `planetscale-postgres-safety-review` | **6.2** | 2.0 | 1.7 | 0.0 | 2.0 | 0.5 | no payload, no script |
| 141 | `planetscale-query-insights-and-tags` | **6.2** | 2.0 | 1.7 | 0.0 | 2.0 | 0.5 | no payload, no script |
| 142 | `planetscale-readonly-inventory` | **6.2** | 2.0 | 1.7 | 0.0 | 2.0 | 0.5 | no payload, no script |
| 143 | `planetscale-traffic-control-recommendations` | **6.2** | 2.0 | 1.7 | 0.0 | 2.0 | 0.5 | no payload, no script |
| 144 | `planetscale-vitess-safety-review` | **6.2** | 2.0 | 1.7 | 0.0 | 2.0 | 0.5 | no payload, no script |
| 145 | `planetscale-webhook-automation-recommendations` | **6.2** | 2.0 | 1.7 | 0.0 | 2.0 | 0.5 | no payload, no script |
| 146 | `remotion-docs` | **6.2** | 2.0 | 0.95 | 0.75 | 2.0 | 0.5 | no script |
| 147 | `taste-brandkit` | **6.2** | 2.0 | 1.7 | 0.0 | 2.0 | 0.5 | no payload, no script |
| 148 | `taste-imagegen-mobile` | **6.2** | 2.0 | 1.7 | 0.0 | 2.0 | 0.5 | no payload, no script |
| 149 | `taste-imagegen-web` | **6.2** | 2.0 | 1.7 | 0.0 | 2.0 | 0.5 | no payload, no script |
| 150 | `yu-hang-writing-style` | **6.2** | 2.0 | 1.7 | 0.5 | 2.0 | 0.0 | placeholder, no script |
| 151 | `skill-auto-improve-mirror` | **6.22** | 2.75 | 1.3 | 0.5 | 0.67 | 1.0 | 2 broken ref |
| 152 | `contradiction-analysis` | **6.25** | 2.5 | 1.0 | 0.25 | 2.0 | 0.5 | no script |
| 153 | `criticism-self-criticism` | **6.25** | 2.5 | 1.0 | 0.25 | 2.0 | 0.5 | no script |
| 154 | `cron-pipeline-state-machine` | **6.25** | 2.0 | 2.0 | 0.75 | 1.0 | 0.5 | 1 broken ref, no script |
| 155 | `investigation-first` | **6.25** | 2.5 | 1.0 | 0.25 | 2.0 | 0.5 | no script |
| 156 | `mass-line` | **6.25** | 2.5 | 1.0 | 0.25 | 2.0 | 0.5 | no script |
| 157 | `protracted-strategy` | **6.25** | 2.5 | 1.0 | 0.25 | 2.0 | 0.5 | no script |
| 158 | `remotion-studio` | **6.25** | 2.0 | 1.0 | 0.75 | 2.0 | 0.5 | no script |
| 159 | `social-push` | **6.25** | 1.75 | 1.0 | 1.0 | 2.0 | 0.5 | no script |
| 160 | `meeting-summary` | **6.3** | 2.5 | 1.3 | 0.0 | 2.0 | 0.5 | no script |
| 161 | `one-on-one-prep` | **6.3** | 2.5 | 1.3 | 0.0 | 2.0 | 0.5 | no script |
| 162 | `overall-planning` | **6.3** | 2.5 | 1.3 | 0.0 | 2.0 | 0.5 | no script |
| 163 | `performance-review` | **6.3** | 2.5 | 1.3 | 0.0 | 2.0 | 0.5 | no script |
| 164 | `planetscale-pscale-cli-automation` | **6.3** | 2.5 | 1.3 | 0.0 | 2.0 | 0.5 | no payload, no script |
| 165 | `project-update` | **6.3** | 2.5 | 1.3 | 0.0 | 2.0 | 0.5 | no script |
| 166 | `spark-prairie-fire` | **6.3** | 2.5 | 1.3 | 0.0 | 2.0 | 0.5 | no script |
| 167 | `stitched-full-page-capture` | **6.3** | 2.5 | 1.3 | 1.5 | 0.0 | 1.0 | 1 broken ref |
| 168 | `technical-research-analysis-doc` | **6.3** | 3.0 | 1.3 | 1.0 | 1.0 | 0.0 | 1 broken ref, placeholder, no script |
| 169 | `upward-email` | **6.3** | 2.5 | 1.3 | 0.0 | 2.0 | 0.5 | no script |
| 170 | `verification-before-completion` | **6.3** | 2.5 | 1.3 | 0.0 | 2.0 | 0.5 | no payload, no script |
| 171 | `weekly-report` | **6.3** | 2.5 | 1.3 | 0.0 | 2.0 | 0.5 | no script |
| 172 | `3d-high-resolution-textures` | **6.45** | 2.0 | 1.7 | 0.75 | 2.0 | 0.0 | placeholder, no script |
| 173 | `3d-virtual-tour` | **6.45** | 2.0 | 1.7 | 0.75 | 2.0 | 0.0 | placeholder, no script |

## Top 20 — calibration reference

| # | skill | score | vault path |
|---|---|---|---|
| 1 | `book-chapter-to-vault` | **10.0** | `FDE\book-chapter-to-vault` |
| 2 | `anatomy` | **9.7** | `design\anatomy` |
| 3 | `video-production` | **9.5** | `design\video-production` |
| 4 | `onetake` | **9.5** | `video\onetake` |
| 5 | `manim-video` | **9.5** | `video\manim-video` |
| 6 | `huashu-design` | **9.41** | `design\huashu-design` |
| 7 | `kinetic-reel` | **9.25** | `video\kinetic-reel` |
| 8 | `single-file-html-game` | **9.2** | `game-dev\single-file-html-game` |
| 9 | `html-to-pptx` | **9.1** | `design\html-to-pptx` |
| 10 | `ue-renderdoc-auto-capture` | **9.0** | `game-dev\ue-renderdoc-auto-capture` |
| 11 | `opendeck` | **9.0** | `design\opendeck` |
| 12 | `kimi3-game-gen` | **9.0** | `game-dev\kimi3-game-gen` |
| 13 | `analysis-to-vault` | **9.0** | `FDE\analysis-to-vault` |
| 14 | `html-ppt` | **8.85** | `design\html-ppt` |
| 15 | `playwright-testing` | **8.75** | `game-dev\playwright-testing` |
| 16 | `visual-explainer` | **8.7** | `design\visual-explainer` |
| 17 | `guizang-product-video-skill` | **8.7** | `video\guizang-product-video-skill` |
| 18 | `anidoodle` | **8.7** | `video\anidoodle` |
| 19 | `painted-animation` | **8.64** | `video\painted-animation` |
| 20 | `brand-docx` | **8.6** | `design\brand-docx` |

## Full table (all 347 skills)

| skill | score | A | B | C | D | E | broken refs | vault path |
|---|---|---|---|---|---|---|---|---|
| `grafana-datasources-provisioning` | 2.0 | 0.0 | 2.0 | 0.0 | 0.0 | 0.0 | 1 | `devops\grafana\grafana-datasources\grafana-datasources-provisioning` |
| `grafana-loki` | 2.0 | 0.0 | 2.0 | 0.0 | 0.0 | 0.0 | 3 | `devops\grafana\grafana-lgtm\grafana-loki` |
| `deferred-taxes` | 2.5 | 0.0 | 2.0 | 0.0 | 0.0 | 0.5 | 1 | `management\finance\accounting\deferred-taxes` |
| `gaap-standards` | 2.5 | 0.0 | 2.0 | 0.0 | 0.0 | 0.5 | 1 | `management\finance\accounting\gaap-standards` |
| `html-slides` | 3.0 | 2.0 | 1.0 | 0.0 | 0.0 | 0.0 | 1 | `design\html-slides` |
| `cs-growth-strategist` | 3.5 | 2.0 | 1.0 | 0.0 | 0.0 | 0.5 | 2 | `management\cs-growth-strategist` |
| `mock-devops-platform` | 3.5 | 2.5 | 1.0 | 0.0 | 0.0 | 0.0 | 12 | `devops\mock-devops-platform` |
| `grafana-synthetic-monitoring-checks` | 3.67 | 0.0 | 2.0 | 0.5 | 0.67 | 0.5 | 2 | `devops\grafana\grafana-cloud\grafana-synthetic-monitoring-checks` |
| `cs-financial-analyst` | 4.2 | 2.0 | 1.7 | 0.0 | 0.0 | 0.5 | 2 | `management\cs-financial-analyst` |
| `finance-lead` | 4.2 | 0.0 | 1.7 | 0.0 | 2.0 | 0.5 | 0 | `management\finance-lead` |
| `grafana-dpm-finder` | 4.3 | 0.0 | 1.3 | 0.5 | 2.0 | 0.5 | 0 | `devops\grafana\grafana-cloud\grafana-dpm-finder` |
| `governance-doc-design` | 4.45 | 2.75 | 1.7 | 0.0 | 0.0 | 0.0 | 1 | `software-development\governance-doc-design` |
| `ai-3d-toolchain` | 4.5 | 3.0 | 1.0 | 0.0 | 0.0 | 0.5 | 2 | `game-dev\ai-3d-toolchain` |
| `comparable-analysis` | 4.5 | 0.0 | 2.0 | 0.0 | 2.0 | 0.5 | 0 | `management\finance\investment-banking\comparable-analysis` |
| `consolidation` | 4.5 | 0.0 | 2.0 | 0.0 | 2.0 | 0.5 | 0 | `management\finance\accounting\consolidation` |
| `dcf-valuation` | 4.5 | 0.0 | 2.0 | 0.0 | 2.0 | 0.5 | 0 | `management\finance\investment-banking\dcf-valuation` |
| `deal-structuring` | 4.5 | 0.0 | 2.0 | 0.0 | 2.0 | 0.5 | 0 | `management\finance\investment-banking\deal-structuring` |
| `earnings-models` | 4.5 | 0.0 | 2.0 | 0.0 | 2.0 | 0.5 | 0 | `management\finance\equity-research\earnings-models` |
| `game-skill` | 4.5 | 2.5 | 2.0 | 0.0 | 0.0 | 0.0 | 4 | `—` |
| `goal-persistence` | 4.5 | 3.0 | 1.0 | 0.0 | 0.0 | 0.5 | 1 | `agents\goal-persistence` |
| `grafana-cloud-integrations` | 4.5 | 0.0 | 2.0 | 0.0 | 2.0 | 0.5 | 0 | `devops\grafana\grafana-cloud\grafana-cloud-integrations` |
| `grafana-profilecli-insights` | 4.5 | 0.0 | 2.0 | 0.0 | 2.0 | 0.5 | 0 | `devops\grafana\grafana-lgtm\grafana-profilecli-insights` |
| `grafana-prometheus` | 4.5 | 0.0 | 2.0 | 0.0 | 2.0 | 0.5 | 0 | `devops\grafana\grafana-lgtm\grafana-prometheus` |
| `grafana-prometheus-cardinality-troubleshooter` | 4.5 | 0.0 | 2.0 | 0.0 | 2.0 | 0.5 | 0 | `devops\grafana\grafana-cloud\grafana-prometheus-cardinality-troubleshooter` |
| `grafana-prometheus-label-strategy` | 4.5 | 0.0 | 2.0 | 0.0 | 2.0 | 0.5 | 0 | `devops\grafana\grafana-cloud\grafana-prometheus-label-strategy` |
| `grafana-send-data` | 4.5 | 0.0 | 2.0 | 0.0 | 2.0 | 0.5 | 0 | `devops\grafana\grafana-cloud\grafana-send-data` |
| `hgb-standards` | 4.5 | 0.0 | 2.0 | 0.0 | 2.0 | 0.5 | 0 | `management\finance\accounting\hgb-standards` |
| `ifrs-standards` | 4.5 | 0.0 | 2.0 | 0.0 | 2.0 | 0.5 | 0 | `management\finance\accounting\ifrs-standards` |
| `lbo-modeling` | 4.5 | 0.0 | 2.0 | 0.0 | 2.0 | 0.5 | 0 | `management\finance\investment-banking\lbo-modeling` |
| `lease-accounting` | 4.5 | 0.0 | 2.0 | 0.0 | 2.0 | 0.5 | 0 | `management\finance\accounting\lease-accounting` |
| `pitch-book-creation` | 4.5 | 0.0 | 2.0 | 0.0 | 2.0 | 0.5 | 0 | `management\finance\investment-banking\pitch-book-creation` |
| `precedent-transactions` | 4.5 | 0.0 | 2.0 | 0.0 | 2.0 | 0.5 | 0 | `management\finance\investment-banking\precedent-transactions` |
| `revenue-recognition` | 4.5 | 0.0 | 2.0 | 0.0 | 2.0 | 0.5 | 0 | `management\finance\accounting\revenue-recognition` |
| `sector-analysis` | 4.5 | 0.0 | 2.0 | 0.0 | 2.0 | 0.5 | 0 | `management\finance\equity-research\sector-analysis` |
| `writing-plans` | 4.5 | 2.5 | 2.0 | 0.0 | 0.0 | 0.0 | 2 | `software-development\writing-plans` |
| `academy-guide` | 4.7 | 2.5 | 1.7 | 0.0 | 0.0 | 0.5 | 1 | `—` |
| `god-leader-advisor` | 4.7 | 2.5 | 1.7 | 0.0 | 0.0 | 0.5 | 23 | `management\god-leader-advisor` |
| `grafana-alloy` | 4.75 | 0.0 | 2.0 | 0.75 | 2.0 | 0.0 | 0 | `devops\grafana\grafana-core\grafana-alloy` |
| `grafana-pyroscope` | 4.75 | 0.0 | 2.0 | 0.75 | 2.0 | 0.0 | 0 | `devops\grafana\grafana-lgtm\grafana-pyroscope` |
| `implement` | 4.75 | 1.75 | 0.0 | 0.5 | 2.0 | 0.5 | 0 | `MattSkills\skills\engineering\implement` |
| `grafana-testing` | 4.85 | 0.0 | 2.0 | 0.75 | 1.6 | 0.5 | 1 | `devops\grafana\grafana-cloud\grafana-testing` |
| `qwen-edit` | 4.95 | 2.5 | 1.7 | 0.25 | 0.0 | 0.5 | 1 | `video\qwen-edit` |
| `cs-product-strategist` | 5.0 | 2.5 | 2.0 | 0.0 | 0.0 | 0.5 | 10 | `management\cs-product-strategist` |
| `grafana-adaptive-metrics` | 5.0 | 0.0 | 2.0 | 0.5 | 2.0 | 0.5 | 0 | `devops\grafana\grafana-cloud\grafana-adaptive-metrics` |
| `grafana-dashboarding` | 5.0 | 0.0 | 2.0 | 0.5 | 2.0 | 0.5 | 0 | `devops\grafana\grafana-core\grafana-dashboarding` |
| `grafana-performance-rca` | 5.0 | 0.0 | 2.0 | 0.5 | 2.0 | 0.5 | 0 | `devops\grafana\grafana-lgtm\grafana-performance-rca` |
| `grafana-promql` | 5.0 | 0.0 | 2.0 | 0.5 | 2.0 | 0.5 | 0 | `devops\grafana\grafana-core\grafana-promql` |
| `hyperframes-video` | 5.0 | 2.0 | 2.0 | 0.5 | 0.0 | 0.5 | 1 | `content\hyperframes-video` |
| `intro-scene-until-perfect` | 5.0 | 3.0 | 2.0 | 0.0 | 0.0 | 0.0 | 6 | `game-dev\intro-scene-until-perfect` |
| `kanban-cron-overseer` | 5.0 | 2.5 | 2.0 | 0.5 | 0.0 | 0.0 | 6 | `—` |
| `ltx2` | 5.0 | 2.5 | 2.0 | 0.0 | 0.0 | 0.5 | 1 | `video\ltx2` |
| `moviepy` | 5.0 | 2.5 | 2.0 | 0.0 | 0.0 | 0.5 | 2 | `video\moviepy` |
| `playwright-recording` | 5.0 | 2.5 | 2.0 | 0.0 | 0.0 | 0.5 | 1 | `video\playwright-recording` |
| `product-strategist` | 5.0 | 2.5 | 2.0 | 0.0 | 0.0 | 0.5 | 4 | `management\product-strategist` |
| `synthetic-ui-demo` | 5.0 | 2.5 | 2.0 | 0.0 | 0.0 | 0.5 | 2 | `video\synthetic-ui-demo` |
| `taste-output` | 5.0 | 2.0 | 1.0 | 0.0 | 2.0 | 0.0 | 0 | `design\taste-output` |
| `video_toolkit` | 5.0 | 2.5 | 2.0 | 0.0 | 0.0 | 0.5 | 2 | `video\video_toolkit` |
| `wayfinder` | 5.0 | 2.0 | 2.0 | 0.5 | 0.0 | 0.5 | 1 | `MattSkills\skills\engineering\wayfinder` |
| `code-review` | 5.2 | 2.5 | 1.7 | 0.5 | 0.0 | 0.5 | 1 | `MattSkills\skills\engineering\code-review` |
| `grafana-admin` | 5.25 | 0.0 | 2.0 | 0.75 | 2.0 | 0.5 | 0 | `devops\grafana\grafana-cloud\grafana-admin` |
| `grafana-alerting-irm` | 5.25 | 0.0 | 2.0 | 0.75 | 2.0 | 0.5 | 0 | `devops\grafana\grafana-core\grafana-alerting-irm` |
| `grafana-assistant-mcp` | 5.25 | 0.0 | 2.0 | 0.75 | 2.0 | 0.5 | 0 | `devops\grafana\grafana-cloud\grafana-assistant-mcp` |
| `grafana-beyla` | 5.25 | 0.0 | 2.0 | 0.75 | 2.0 | 0.5 | 0 | `devops\grafana\grafana-core\grafana-beyla` |
| `grafana-cost-management` | 5.25 | 0.0 | 2.0 | 0.75 | 2.0 | 0.5 | 0 | `devops\grafana\grafana-cloud\grafana-cost-management` |
| `grafana-database-observability` | 5.25 | 0.0 | 2.0 | 0.75 | 2.0 | 0.5 | 0 | `devops\grafana\grafana-cloud\grafana-database-observability` |
| `grafana-fleet-management` | 5.25 | 0.0 | 2.0 | 0.75 | 2.0 | 0.5 | 0 | `devops\grafana\grafana-cloud\grafana-fleet-management` |
| `grafana-frontend-session-rca` | 5.25 | 0.0 | 2.0 | 0.75 | 2.0 | 0.5 | 0 | `devops\grafana\grafana-cloud\grafana-frontend-session-rca` |
| `grafana-infrastructure` | 5.25 | 0.0 | 2.0 | 0.75 | 2.0 | 0.5 | 0 | `devops\grafana\grafana-cloud\grafana-infrastructure` |
| `grafana-loki-label-analyzer` | 5.25 | 0.0 | 2.0 | 0.75 | 2.0 | 0.5 | 0 | `devops\grafana\grafana-cloud\grafana-loki-label-analyzer` |
| `grafana-mimir` | 5.25 | 0.0 | 2.0 | 0.75 | 2.0 | 0.5 | 0 | `devops\grafana\grafana-lgtm\grafana-mimir` |
| `grafana-ml-ai` | 5.25 | 0.0 | 2.0 | 0.75 | 2.0 | 0.5 | 0 | `devops\grafana\grafana-cloud\grafana-ml-ai` |
| `grafana-oncall-irm` | 5.25 | 0.0 | 2.0 | 0.75 | 2.0 | 0.5 | 0 | `devops\grafana\grafana-cloud\grafana-oncall-irm` |
| `grafana-opentelemetry` | 5.25 | 0.0 | 2.0 | 0.75 | 2.0 | 0.5 | 0 | `devops\grafana\grafana-core\grafana-opentelemetry` |
| `grafana-private-connectivity` | 5.25 | 0.0 | 2.0 | 0.75 | 2.0 | 0.5 | 0 | `devops\grafana\grafana-cloud\grafana-private-connectivity` |
| `grafana-skill-authoring` | 5.25 | 0.0 | 2.0 | 0.75 | 2.0 | 0.5 | 0 | `devops\grafana\grafana-core\grafana-skill-authoring` |
| `grafana-tempo` | 5.25 | 0.0 | 2.0 | 0.75 | 2.0 | 0.5 | 0 | `devops\grafana\grafana-lgtm\grafana-tempo` |
| `requesting-code-review` | 5.3 | 2.5 | 1.3 | 0.0 | 1.0 | 0.5 | 1 | `software-development\requesting-code-review` |
| `handoff` | 5.35 | 2.0 | 0.35 | 0.5 | 2.0 | 0.5 | 0 | `MattSkills\skills\productivity\handoff` |
| `legalrabbit-docx` | 5.35 | 2.5 | 0.35 | 0.0 | 2.0 | 0.5 | 0 | `content\legalrabbit-docx` |
| `competitive-matrix` | 5.45 | 2.0 | 0.95 | 0.0 | 2.0 | 0.5 | 0 | `management\competitive-matrix` |
| `concentrate-forces` | 5.5 | 2.5 | 1.0 | 0.0 | 2.0 | 0.0 | 0 | `management\qiushi-methodology\concentrate-forces` |
| `game-archetype-classifier` | 5.5 | 2.0 | 1.0 | 0.0 | 2.0 | 0.5 | 0 | `game-dev\game-archetype-classifier` |
| `game-dev-agent-workflow` | 5.5 | 2.0 | 1.0 | 0.0 | 2.0 | 0.5 | 0 | `game-dev\game-dev-agent-workflow` |
| `game-platformer` | 5.5 | 2.0 | 1.0 | 0.0 | 2.0 | 0.5 | 0 | `game-dev\game-platformer` |
| `game-template-engineering` | 5.5 | 2.0 | 1.0 | 0.0 | 2.0 | 0.5 | 0 | `game-dev\game-template-engineering` |
| `game-top-down-action` | 5.5 | 2.0 | 1.0 | 0.0 | 2.0 | 0.5 | 0 | `game-dev\game-top-down-action` |
| `game-ui-heavy-narrative` | 5.5 | 2.0 | 1.0 | 0.0 | 2.0 | 0.5 | 0 | `game-dev\game-ui-heavy-narrative` |
| `grafana-app-observability` | 5.5 | 0.0 | 2.0 | 1.0 | 2.0 | 0.5 | 0 | `devops\grafana\grafana-cloud\grafana-app-observability` |
| `grafana-oss` | 5.5 | 0.0 | 2.0 | 1.0 | 2.0 | 0.5 | 0 | `devops\grafana\grafana-core\grafana-oss` |
| `guide-from-probes` | 5.5 | 3.0 | 2.0 | 0.0 | 0.0 | 0.5 | 6 | `game-dev\guide-from-probes` |
| `planetscale-schema-recommendations-agent-loop` | 5.5 | 2.0 | 1.0 | 0.0 | 2.0 | 0.5 | 0 | `devops\planetscale\planetscale-schema-recommendations-agent-loop` |
| `render-quality-loop` | 5.5 | 3.0 | 2.0 | 0.0 | 0.0 | 0.5 | 3 | `game-dev\render-quality-loop` |
| `research` | 5.5 | 2.5 | 0.0 | 0.5 | 2.0 | 0.5 | 0 | `MattSkills\skills\engineering\research` |
| `resolving-merge-conflicts` | 5.6 | 2.25 | 0.35 | 0.5 | 2.0 | 0.5 | 0 | `MattSkills\skills\engineering\resolving-merge-conflicts` |
| `improve-codebase-architecture` | 5.62 | 2.0 | 1.7 | 0.75 | 0.67 | 0.5 | 2 | `MattSkills\skills\engineering\improve-codebase-architecture` |
| `prompt-pro` | 5.65 | 2.5 | 0.65 | 0.0 | 2.0 | 0.5 | 0 | `software-development\prompt-pro` |
| `brainstorming` | 5.7 | 2.0 | 1.7 | 1.0 | 0.0 | 1.0 | 1 | `software-development\brainstorming` |
| `game-build-verification` | 5.7 | 2.0 | 1.7 | 0.0 | 2.0 | 0.0 | 0 | `game-dev\game-build-verification` |
| `game-template` | 5.7 | 2.0 | 1.7 | 0.0 | 2.0 | 0.0 | 0 | `game-dev\game-template` |
| `taste-redesign` | 5.7 | 2.0 | 1.7 | 0.0 | 2.0 | 0.0 | 0 | `design\taste-redesign` |
| `taste-stitch` | 5.7 | 2.0 | 1.7 | 0.0 | 2.0 | 0.0 | 0 | `design\taste-stitch` |
| `prd` | 5.8 | 2.0 | 1.3 | 0.0 | 2.0 | 0.5 | 0 | `management\prd` |
| `skill-distill` | 5.8 | 2.0 | 1.3 | 0.0 | 2.0 | 0.5 | 0 | `software-development\skill-distill` |
| `aisides-ai-self-review` | 5.85 | 2.5 | 2.0 | 0.75 | 0.6 | 0.0 | 7 | `software-development\aisides-ai-self-review` |
| `remotion-render` | 5.9 | 2.0 | 0.65 | 0.75 | 2.0 | 0.5 | 0 | `video\remotion-render` |
| `ui-mockups` | 5.95 | 2.5 | 1.7 | 0.75 | 1.0 | 0.0 | 1 | `design\ui-mockups` |
| `arming-thought` | 6.0 | 2.5 | 1.0 | 0.0 | 2.0 | 0.5 | 0 | `management\qiushi-methodology\arming-thought` |
| `bezos-advisor` | 6.0 | 2.5 | 1.0 | 0.0 | 2.0 | 0.5 | 0 | `management\bezos-advisor` |
| `claude-api` | 6.0 | 2.5 | 2.0 | 0.5 | 0.0 | 1.0 | 1 | `—` |
| `daily-ui-inspiration-capture` | 6.0 | 2.5 | 2.0 | 1.0 | 0.0 | 0.5 | 2 | `video\mengto\daily-ui-inspiration-capture` |
| `game-debug` | 6.0 | 2.0 | 2.0 | 0.0 | 2.0 | 0.0 | 0 | `game-dev\game-debug` |
| `game-gdd-writing` | 6.0 | 2.5 | 1.0 | 0.0 | 2.0 | 0.5 | 0 | `game-dev\game-gdd-writing` |
| `okr-planner` | 6.0 | 2.5 | 1.0 | 0.0 | 2.0 | 0.5 | 0 | `content\okr-planner` |
| `practice-cognition` | 6.0 | 2.5 | 1.0 | 0.0 | 2.0 | 0.5 | 0 | `management\qiushi-methodology\practice-cognition` |
| `renzhengfei-advisor` | 6.0 | 2.5 | 1.0 | 0.0 | 2.0 | 0.5 | 0 | `management\renzhengfei-advisor` |
| `self-improvement` | 6.0 | 2.5 | 1.0 | 0.0 | 2.0 | 0.5 | 0 | `software-development\self-improvement` |
| `source-anchored-design` | 6.0 | 2.5 | 1.0 | 0.0 | 2.0 | 0.5 | 0 | `software-development\source-anchored-design` |
| `taste-director` | 6.0 | 3.0 | 1.0 | 0.0 | 2.0 | 0.0 | 0 | `design\taste-director` |
| `taste-frontend` | 6.0 | 2.0 | 2.0 | 0.0 | 2.0 | 0.0 | 0 | `design\taste-frontend` |
| `to-spec` | 6.0 | 2.0 | 1.0 | 0.5 | 2.0 | 0.5 | 0 | `MattSkills\skills\engineering\to-spec` |
| `zhangyiming-advisor` | 6.0 | 2.5 | 1.0 | 0.0 | 2.0 | 0.5 | 0 | `management\zhangyiming-advisor` |
| `setup-matt-pocock-skills` | 6.03 | 2.0 | 1.7 | 1.0 | 0.83 | 0.5 | 7 | `MattSkills\skills\engineering\setup-matt-pocock-skills` |
| `domain-modeling` | 6.05 | 2.5 | 1.3 | 0.75 | 1.0 | 0.5 | 2 | `MattSkills\skills\engineering\domain-modeling` |
| `debugger-persona` | 6.15 | 3.0 | 0.65 | 0.0 | 2.0 | 0.5 | 0 | `software-development\debugger-persona` |
| `mgmt-discipline` | 6.15 | 2.5 | 0.65 | 0.5 | 2.0 | 0.5 | 0 | `management\mgmt-discipline` |
| `mgmt-individual` | 6.15 | 2.5 | 0.65 | 0.5 | 2.0 | 0.5 | 0 | `management\mgmt-individual` |
| `mgmt-org` | 6.15 | 2.5 | 0.65 | 0.5 | 2.0 | 0.5 | 0 | `management\mgmt-org` |
| `remotion-multimedia` | 6.15 | 2.0 | 0.65 | 1.0 | 2.0 | 0.5 | 0 | `video\remotion-multimedia` |
| `remotion-saas` | 6.15 | 2.0 | 0.65 | 1.0 | 2.0 | 0.5 | 0 | `video\remotion-saas` |
| `game-asset-art-direction` | 6.2 | 2.0 | 1.7 | 0.0 | 2.0 | 0.5 | 0 | `game-dev\game-asset-art-direction` |
| `game-grid-logic` | 6.2 | 2.0 | 1.7 | 0.0 | 2.0 | 0.5 | 0 | `game-dev\game-grid-logic` |
| `game-tower-defense` | 6.2 | 2.0 | 1.7 | 0.0 | 2.0 | 0.5 | 0 | `game-dev\game-tower-defense` |
| `grilling` | 6.2 | 2.5 | 0.7 | 0.5 | 2.0 | 0.5 | 0 | `MattSkills\skills\productivity\grilling` |
| `planetscale-autonomous-execution-mode` | 6.2 | 2.0 | 1.7 | 0.0 | 2.0 | 0.5 | 0 | `devops\planetscale\planetscale-autonomous-execution-mode` |
| `planetscale-best-practices-matrix` | 6.2 | 2.0 | 1.7 | 0.0 | 2.0 | 0.5 | 0 | `devops\planetscale\planetscale-best-practices-matrix` |
| `planetscale-change-gates-and-approval-contract` | 6.2 | 2.0 | 1.7 | 0.0 | 2.0 | 0.5 | 0 | `devops\planetscale\planetscale-change-gates-and-approval-contract` |
| `planetscale-codebase-sqlcommenter-instrumentation` | 6.2 | 2.0 | 1.7 | 0.0 | 2.0 | 0.5 | 0 | `devops\planetscale\planetscale-codebase-sqlcommenter-instrumentation` |
| `planetscale-customer-report-template` | 6.2 | 2.0 | 1.7 | 0.0 | 2.0 | 0.5 | 0 | `devops\planetscale\planetscale-customer-report-template` |
| `planetscale-mcp-agent-operating-model` | 6.2 | 2.0 | 1.7 | 0.0 | 2.0 | 0.5 | 0 | `devops\planetscale\planetscale-mcp-agent-operating-model` |
| `planetscale-postgres-safety-review` | 6.2 | 2.0 | 1.7 | 0.0 | 2.0 | 0.5 | 0 | `devops\planetscale\planetscale-postgres-safety-review` |
| `planetscale-query-insights-and-tags` | 6.2 | 2.0 | 1.7 | 0.0 | 2.0 | 0.5 | 0 | `devops\planetscale\planetscale-query-insights-and-tags` |
| `planetscale-readonly-inventory` | 6.2 | 2.0 | 1.7 | 0.0 | 2.0 | 0.5 | 0 | `devops\planetscale\planetscale-readonly-inventory` |
| `planetscale-traffic-control-recommendations` | 6.2 | 2.0 | 1.7 | 0.0 | 2.0 | 0.5 | 0 | `devops\planetscale\planetscale-traffic-control-recommendations` |
| `planetscale-vitess-safety-review` | 6.2 | 2.0 | 1.7 | 0.0 | 2.0 | 0.5 | 0 | `devops\planetscale\planetscale-vitess-safety-review` |
| `planetscale-webhook-automation-recommendations` | 6.2 | 2.0 | 1.7 | 0.0 | 2.0 | 0.5 | 0 | `devops\planetscale\planetscale-webhook-automation-recommendations` |
| `remotion-docs` | 6.2 | 2.0 | 0.95 | 0.75 | 2.0 | 0.5 | 0 | `video\remotion-docs` |
| `taste-brandkit` | 6.2 | 2.0 | 1.7 | 0.0 | 2.0 | 0.5 | 0 | `design\taste-brandkit` |
| `taste-imagegen-mobile` | 6.2 | 2.0 | 1.7 | 0.0 | 2.0 | 0.5 | 0 | `design\taste-imagegen-mobile` |
| `taste-imagegen-web` | 6.2 | 2.0 | 1.7 | 0.0 | 2.0 | 0.5 | 0 | `design\taste-imagegen-web` |
| `yu-hang-writing-style` | 6.2 | 2.0 | 1.7 | 0.5 | 2.0 | 0.0 | 0 | `content\yu-hang-writing-style` |
| `skill-auto-improve-mirror` | 6.22 | 2.75 | 1.3 | 0.5 | 0.67 | 1.0 | 2 | `software-development\skill-auto-improve-mirror` |
| `contradiction-analysis` | 6.25 | 2.5 | 1.0 | 0.25 | 2.0 | 0.5 | 0 | `management\qiushi-methodology\contradiction-analysis` |
| `criticism-self-criticism` | 6.25 | 2.5 | 1.0 | 0.25 | 2.0 | 0.5 | 0 | `management\qiushi-methodology\criticism-self-criticism` |
| `cron-pipeline-state-machine` | 6.25 | 2.0 | 2.0 | 0.75 | 1.0 | 0.5 | 1 | `—` |
| `investigation-first` | 6.25 | 2.5 | 1.0 | 0.25 | 2.0 | 0.5 | 0 | `management\qiushi-methodology\investigation-first` |
| `mass-line` | 6.25 | 2.5 | 1.0 | 0.25 | 2.0 | 0.5 | 0 | `management\qiushi-methodology\mass-line` |
| `protracted-strategy` | 6.25 | 2.5 | 1.0 | 0.25 | 2.0 | 0.5 | 0 | `management\qiushi-methodology\protracted-strategy` |
| `remotion-studio` | 6.25 | 2.0 | 1.0 | 0.75 | 2.0 | 0.5 | 0 | `video\remotion-studio` |
| `social-push` | 6.25 | 1.75 | 1.0 | 1.0 | 2.0 | 0.5 | 0 | `content\social-push` |
| `meeting-summary` | 6.3 | 2.5 | 1.3 | 0.0 | 2.0 | 0.5 | 0 | `management\meeting-summary` |
| `one-on-one-prep` | 6.3 | 2.5 | 1.3 | 0.0 | 2.0 | 0.5 | 0 | `management\one-on-one-prep` |
| `overall-planning` | 6.3 | 2.5 | 1.3 | 0.0 | 2.0 | 0.5 | 0 | `management\qiushi-methodology\overall-planning` |
| `performance-review` | 6.3 | 2.5 | 1.3 | 0.0 | 2.0 | 0.5 | 0 | `management\performance-review` |
| `planetscale-pscale-cli-automation` | 6.3 | 2.5 | 1.3 | 0.0 | 2.0 | 0.5 | 0 | `devops\planetscale\planetscale-pscale-cli-automation` |
| `project-update` | 6.3 | 2.5 | 1.3 | 0.0 | 2.0 | 0.5 | 0 | `management\project-update` |
| `spark-prairie-fire` | 6.3 | 2.5 | 1.3 | 0.0 | 2.0 | 0.5 | 0 | `management\qiushi-methodology\spark-prairie-fire` |
| `stitched-full-page-capture` | 6.3 | 2.5 | 1.3 | 1.5 | 0.0 | 1.0 | 1 | `video\mengto\stitched-full-page-capture` |
| `technical-research-analysis-doc` | 6.3 | 3.0 | 1.3 | 1.0 | 1.0 | 0.0 | 1 | `software-development\technical-research-analysis-doc` |
| `upward-email` | 6.3 | 2.5 | 1.3 | 0.0 | 2.0 | 0.5 | 0 | `management\upward-email` |
| `verification-before-completion` | 6.3 | 2.5 | 1.3 | 0.0 | 2.0 | 0.5 | 0 | `software-development\verification-before-completion` |
| `weekly-report` | 6.3 | 2.5 | 1.3 | 0.0 | 2.0 | 0.5 | 0 | `management\weekly-report` |
| `3d-high-resolution-textures` | 6.45 | 2.0 | 1.7 | 0.75 | 2.0 | 0.0 | 0 | `video\mengto\3d-high-resolution-textures` |
| `3d-virtual-tour` | 6.45 | 2.0 | 1.7 | 0.75 | 2.0 | 0.0 | 0 | `video\mengto\3d-virtual-tour` |
| `llm-friendly-dsl-verification` | 6.45 | 2.25 | 1.7 | 0.0 | 2.0 | 0.5 | 0 | `software-development\llm-friendly-dsl-verification` |
| `gdd-markdown-template` | 6.5 | 3.0 | 1.7 | 1.0 | 0.8 | 0.0 | 3 | `game-dev\gdd-markdown-template` |
| `remotion-upgrade` | 6.5 | 2.25 | 1.0 | 0.75 | 2.0 | 0.5 | 0 | `video\remotion-upgrade` |
| `tripo-3d-generation` | 6.5 | 2.0 | 2.0 | 0.0 | 2.0 | 0.5 | 0 | `—` |
| `truth-seeking-research` | 6.5 | 3.0 | 1.0 | 0.0 | 2.0 | 0.5 | 0 | `software-development\truth-seeking-research` |
| `market-intel` | 6.53 | 2.5 | 1.7 | 0.5 | 1.33 | 0.5 | 4 | `content\market-intel` |
| `remotion-create` | 6.55 | 2.0 | 1.3 | 0.75 | 2.0 | 0.5 | 0 | `video\remotion-create` |
| `notes-on-writing` | 6.65 | 3.0 | 0.65 | 0.5 | 2.0 | 0.5 | 0 | `content\notes-on-writing` |
| `opus-video-prompts` | 6.65 | 3.0 | 0.65 | 0.5 | 2.0 | 0.5 | 0 | `video\opus-video-prompts` |
| `discernment-nudge` | 6.7 | 2.5 | 1.7 | 0.0 | 2.0 | 0.5 | 0 | `—` |
| `journey` | 6.7 | 3.0 | 1.7 | 0.0 | 2.0 | 0.0 | 0 | `software-development\journey` |
| `lemo-opuscar` | 6.7 | 2.5 | 0.7 | 0.5 | 2.0 | 1.0 | 0 | `video\lemo-opuscar` |
| `monte-carlo-monitoring-advisor` | 6.7 | 2.5 | 1.7 | 1.0 | 1.0 | 0.5 | 2 | `devops\monte-carlo\monte-carlo-monitoring-advisor` |
| `plugin-capability-brief` | 6.7 | 2.5 | 1.7 | 0.0 | 2.0 | 0.5 | 0 | `software-development\plugin-capability-brief` |
| `remotion-captions` | 6.7 | 2.25 | 0.95 | 1.0 | 2.0 | 0.5 | 0 | `video\remotion-captions` |
| `to-tickets` | 6.7 | 2.0 | 1.7 | 0.5 | 2.0 | 0.5 | 0 | `MattSkills\skills\engineering\to-tickets` |
| `prototype` | 6.75 | 2.5 | 1.0 | 0.75 | 2.0 | 0.5 | 0 | `MattSkills\skills\engineering\prototype` |
| `frontend-slides` | 6.83 | 2.5 | 2.0 | 0.5 | 1.33 | 0.5 | 3 | `design\frontend-slides` |
| `remotion-maps` | 6.9 | 2.25 | 0.65 | 1.0 | 2.0 | 1.0 | 0 | `video\remotion-maps` |
| `3d-cloth-material` | 6.95 | 2.0 | 1.7 | 0.75 | 2.0 | 0.5 | 0 | `video\mengto\3d-cloth-material` |
| `3d-falling-leaves` | 6.95 | 2.0 | 1.7 | 0.75 | 2.0 | 0.5 | 0 | `video\mengto\3d-falling-leaves` |
| `3d-paper-material` | 6.95 | 2.0 | 1.7 | 0.75 | 2.0 | 0.5 | 0 | `video\mengto\3d-paper-material` |
| `3d-retina-resolution` | 6.95 | 2.0 | 1.7 | 0.75 | 2.0 | 0.5 | 0 | `video\mengto\3d-retina-resolution` |
| `3d-sky-background` | 6.95 | 2.0 | 1.7 | 0.75 | 2.0 | 0.5 | 0 | `video\mengto\3d-sky-background` |
| `3d-sky-rays` | 6.95 | 2.0 | 1.7 | 0.75 | 2.0 | 0.5 | 0 | `video\mengto\3d-sky-rays` |
| `3d-wood-material` | 6.95 | 2.0 | 1.7 | 0.75 | 2.0 | 0.5 | 0 | `video\mengto\3d-wood-material` |
| `ask-matt` | 6.95 | 2.0 | 1.7 | 0.75 | 2.0 | 0.5 | 0 | `MattSkills\skills\engineering\ask-matt` |
| `tdd` | 6.95 | 2.5 | 1.7 | 0.75 | 2.0 | 0.0 | 0 | `MattSkills\skills\engineering\tdd` |
| `unsplash-asset-images` | 6.95 | 2.5 | 1.7 | 0.25 | 2.0 | 0.5 | 0 | `video\mengto\unsplash-asset-images` |
| `acestep` | 7.0 | 2.5 | 2.0 | 0.0 | 2.0 | 0.5 | 0 | `video\acestep` |
| `ai-3d-character-pipeline` | 7.0 | 3.0 | 1.0 | 0.5 | 2.0 | 0.5 | 0 | `game-dev\ai-3d-character-pipeline` |
| `audit-verify-explain-grade-5` | 7.0 | 2.5 | 1.0 | 1.0 | 2.0 | 0.5 | 0 | `video\mengto\audit-verify-explain-grade-5` |
| `content-craft` | 7.0 | 3.0 | 2.0 | 0.0 | 2.0 | 0.0 | 0 | `content\content-craft` |
| `distilly` | 7.0 | 2.5 | 1.0 | 1.0 | 2.0 | 0.5 | 0 | `software-development\distilly` |
| `dt-obs-logs` | 7.0 | 2.5 | 2.0 | 0.0 | 2.0 | 0.5 | 0 | `devops\dynatrace\dt-obs-logs` |
| `elevenlabs` | 7.0 | 2.5 | 2.0 | 0.0 | 2.0 | 0.5 | 0 | `video\elevenlabs` |
| `ffmpeg` | 7.0 | 2.5 | 2.0 | 0.0 | 2.0 | 0.5 | 0 | `video\ffmpeg` |
| `genoffice` | 7.0 | 3.0 | 2.0 | 0.0 | 2.0 | 0.0 | 0 | `content\genoffice` |
| `hyperframes-registry` | 7.0 | 2.0 | 1.0 | 1.5 | 2.0 | 0.5 | 0 | `content\hyperframes-registry` |
| `manage-up-core` | 7.0 | 2.5 | 2.0 | 0.0 | 2.0 | 0.5 | 0 | `management\manage-up-core` |
| `proposal` | 7.0 | 2.5 | 2.0 | 0.0 | 2.0 | 0.5 | 0 | `management\proposal` |
| `quarterly-review` | 7.0 | 2.5 | 2.0 | 0.0 | 2.0 | 0.5 | 0 | `management\quarterly-review` |
| `receiving-code-review` | 7.0 | 2.5 | 2.0 | 0.0 | 2.0 | 0.5 | 0 | `software-development\receiving-code-review` |
| `runpod` | 7.0 | 2.5 | 2.0 | 0.0 | 2.0 | 0.5 | 0 | `video\runpod` |
| `skill-inspector` | 7.0 | 2.5 | 2.0 | 0.0 | 2.0 | 0.5 | 0 | `software-development\skill-inspector` |
| `skillopt-sleep` | 7.0 | 2.5 | 2.0 | 0.0 | 2.0 | 0.5 | 0 | `software-development\skillopt-sleep` |
| `software-dev-loop` | 7.0 | 3.0 | 2.0 | 0.0 | 2.0 | 0.0 | 0 | `software-development\software-dev-loop` |
| `storyboard` | 7.0 | 2.5 | 2.0 | 1.0 | 0.5 | 1.0 | 6 | `design\storyboard` |
| `style-cn-platform-tutorial` | 7.0 | 3.0 | 1.0 | 1.0 | 2.0 | 0.0 | 0 | `content\style-cn-platform-tutorial` |
| `using-git-worktrees` | 7.0 | 2.5 | 2.0 | 0.0 | 2.0 | 0.5 | 0 | `software-development\using-git-worktrees` |
| `workflows` | 7.0 | 2.5 | 2.0 | 0.0 | 2.0 | 0.5 | 0 | `management\qiushi-methodology\workflows` |
| `writing-skills` | 7.0 | 2.5 | 2.0 | 1.0 | 1.0 | 0.5 | 5 | `software-development\writing-skills` |
| `web-artifacts-builder` | 7.05 | 2.0 | 1.3 | 0.75 | 2.0 | 1.0 | 0 | `—` |
| `style-report` | 7.15 | 3.0 | 0.65 | 1.0 | 2.0 | 0.5 | 0 | `management\style-report` |
| `3d-orbit-inspect-demo` | 7.2 | 2.0 | 1.7 | 1.0 | 2.0 | 0.5 | 0 | `video\mengto\3d-orbit-inspect-demo` |
| `aura-asset-images` | 7.2 | 2.5 | 1.7 | 0.5 | 2.0 | 0.5 | 0 | `video\mengto\aura-asset-images` |
| `canvas-design` | 7.2 | 2.5 | 1.7 | 0.5 | 2.0 | 0.5 | 0 | `—` |
| `hyperframes-cli` | 7.2 | 2.0 | 1.7 | 1.0 | 2.0 | 0.5 | 0 | `content\hyperframes-cli` |
| `monte-carlo-incident-response` | 7.2 | 3.0 | 1.7 | 0.0 | 2.0 | 0.5 | 0 | `devops\monte-carlo\monte-carlo-incident-response` |
| `monte-carlo-proactive-monitoring` | 7.2 | 3.0 | 1.7 | 0.0 | 2.0 | 0.5 | 0 | `devops\monte-carlo\monte-carlo-proactive-monitoring` |
| `monte-carlo-troubleshoot-agent-traces` | 7.2 | 2.0 | 1.7 | 1.0 | 2.0 | 0.5 | 0 | `devops\monte-carlo\monte-carlo-troubleshoot-agent-traces` |
| `planetscale-safe-orchestrator` | 7.2 | 2.5 | 1.7 | 0.5 | 2.0 | 0.5 | 0 | `devops\planetscale\planetscale-safe-orchestrator` |
| `rigorous-proof` | 7.2 | 3.0 | 1.7 | 0.0 | 2.0 | 0.5 | 0 | `math\rigorous-proof` |
| `shuorenhua` | 7.2 | 2.5 | 1.7 | 1.0 | 2.0 | 0.0 | 0 | `content\shuorenhua` |
| `three-clay-scenes` | 7.2 | 2.5 | 1.7 | 0.5 | 2.0 | 0.5 | 0 | `game-dev\three-clay-scenes` |
| `3d-four-seasons` | 7.25 | 2.0 | 2.0 | 0.75 | 2.0 | 0.5 | 0 | `video\mengto\3d-four-seasons` |
| `ai-3d-scene-pipeline` | 7.25 | 3.0 | 1.0 | 0.75 | 2.0 | 0.5 | 0 | `game-dev\ai-3d-scene-pipeline` |
| `ai-video-production` | 7.25 | 3.0 | 1.0 | 0.75 | 2.0 | 0.5 | 0 | `video\ai-video-production` |
| `brand-pptx` | 7.25 | 2.5 | 2.0 | 0.75 | 1.5 | 0.5 | 1 | `design\brand-pptx` |
| `ideogram4` | 7.25 | 2.5 | 2.0 | 0.25 | 2.0 | 0.5 | 0 | `video\ideogram4` |
| `triage` | 7.25 | 2.0 | 2.0 | 0.75 | 2.0 | 0.5 | 0 | `MattSkills\skills\engineering\triage` |
| `wizard` | 7.25 | 2.5 | 1.0 | 0.75 | 2.0 | 1.0 | 0 | `MattSkills\skills\engineering\wizard` |
| `dt-app-dashboards` | 7.3 | 2.0 | 1.3 | 1.5 | 2.0 | 0.5 | 0 | `devops\dynatrace\dt-app-dashboards` |
| `video-shotcraft` | 7.42 | 2.5 | 1.7 | 1.0 | 1.22 | 1.0 | 7 | `video\video-shotcraft` |
| `3d-high-poly-models` | 7.45 | 2.5 | 1.7 | 0.75 | 2.0 | 0.5 | 0 | `video\mengto\3d-high-poly-models` |
| `3d-metal-material` | 7.45 | 2.5 | 1.7 | 0.75 | 2.0 | 0.5 | 0 | `video\mengto\3d-metal-material` |
| `automated-triage` | 7.45 | 2.5 | 1.7 | 0.75 | 2.0 | 0.5 | 0 | `devops\monte-carlo\automated-triage` |
| `cat-game-architecture` | 7.45 | 2.5 | 1.7 | 0.75 | 2.0 | 0.5 | 0 | `game-dev\cat-game-architecture` |
| `iterate-until-verified` | 7.45 | 2.5 | 1.7 | 0.75 | 2.0 | 0.5 | 0 | `video\mengto\iterate-until-verified` |
| `monte-carlo-performance-diagnosis` | 7.45 | 2.5 | 1.7 | 0.75 | 2.0 | 0.5 | 0 | `devops\monte-carlo\monte-carlo-performance-diagnosis` |
| `monte-carlo-storage-cost-analysis` | 7.45 | 2.5 | 1.7 | 0.75 | 2.0 | 0.5 | 0 | `devops\monte-carlo\monte-carlo-storage-cost-analysis` |
| `procedural-3d-scenes` | 7.45 | 2.5 | 1.7 | 0.75 | 2.0 | 0.5 | 0 | `game-dev\procedural-3d-scenes` |
| `slideshow` | 7.45 | 2.5 | 1.7 | 0.75 | 2.0 | 0.5 | 0 | `design\slideshow` |
| `three-procedural-scenes` | 7.45 | 2.5 | 1.7 | 0.75 | 2.0 | 0.5 | 0 | `game-dev\three-procedural-scenes` |
| `dt-platform-costs` | 7.5 | 2.0 | 2.0 | 1.0 | 2.0 | 0.5 | 0 | `devops\dynatrace\dt-platform-costs` |
| `dt-setup-oneagent` | 7.5 | 2.5 | 2.0 | 1.0 | 2.0 | 0.0 | 0 | `devops\dynatrace\dt-setup-oneagent` |
| `elevenlabs-tts` | 7.5 | 2.5 | 1.0 | 1.0 | 2.0 | 1.0 | 0 | `video\mengto\elevenlabs-tts` |
| `game-dev-loop` | 7.5 | 3.0 | 2.0 | 0.0 | 2.0 | 0.5 | 0 | `game-dev\game-dev-loop` |
| `investment-masters` | 7.5 | 2.5 | 2.0 | 0.5 | 2.0 | 0.5 | 0 | `vendor\investment-masters` |
| `management-loop` | 7.5 | 3.0 | 2.0 | 0.0 | 2.0 | 0.5 | 0 | `management\management-loop` |
| `remotion-interactivity` | 7.5 | 2.25 | 2.0 | 0.75 | 2.0 | 0.5 | 0 | `video\remotion-interactivity` |
| `slack-gif-creator` | 7.5 | 2.5 | 2.0 | 0.5 | 2.0 | 0.5 | 0 | `—` |
| `style-cn-tech-deep-dive` | 7.5 | 3.0 | 1.0 | 1.0 | 2.0 | 0.5 | 0 | `content\style-cn-tech-deep-dive` |
| `tech-design-to-zhihu` | 7.5 | 3.0 | 2.0 | 0.5 | 2.0 | 0.0 | 0 | `content\tech-design-to-zhihu` |
| `ue4-shader-debug` | 7.5 | 3.0 | 2.0 | 0.0 | 2.0 | 0.5 | 0 | `game-dev\ue4-shader-debug` |
| `video-use` | 7.5 | 2.0 | 2.0 | 0.5 | 2.0 | 1.0 | 0 | `video\video-use` |
| `competitor-profiling` | 7.58 | 3.0 | 2.0 | 0.75 | 1.33 | 0.5 | 1 | `management\marketing\competitor-profiling` |
| `customer-research` | 7.58 | 3.0 | 2.0 | 0.75 | 1.33 | 0.5 | 1 | `management\marketing\customer-research` |
| `karpathy-explain-better` | 7.6 | 2.5 | 1.0 | 1.5 | 1.6 | 1.0 | 1 | `writing\karpathy-explain-better` |
| `three-pbr-workflow` | 7.63 | 3.0 | 1.3 | 1.5 | 1.33 | 0.5 | 1 | `game-dev\three-pbr-workflow` |
| `3d-underwater-god-rays` | 7.7 | 2.0 | 1.7 | 1.0 | 2.0 | 1.0 | 0 | `video\mengto\3d-underwater-god-rays` |
| `dt-sec-insights` | 7.7 | 2.5 | 1.7 | 1.0 | 2.0 | 0.5 | 0 | `devops\dynatrace\dt-sec-insights` |
| `html-to-interaction-prompts` | 7.7 | 2.5 | 1.7 | 1.0 | 2.0 | 0.5 | 0 | `video\mengto\html-to-interaction-prompts` |
| `make-interfaces-feel-better` | 7.7 | 2.5 | 1.7 | 1.0 | 2.0 | 0.5 | 0 | `video\make-interfaces-feel-better` |
| `media-use` | 7.7 | 2.0 | 1.7 | 1.5 | 2.0 | 0.5 | 0 | `—` |
| `monte-carlo-analyze-root-cause` | 7.7 | 2.5 | 1.7 | 1.0 | 2.0 | 0.5 | 0 | `devops\monte-carlo\monte-carlo-analyze-root-cause` |
| `video-to-superprompt` | 7.7 | 2.5 | 1.7 | 1.5 | 2.0 | 0.0 | 0 | `video\mengto\video-to-superprompt` |
| `web-technique-to-skill` | 7.7 | 2.5 | 1.7 | 1.0 | 2.0 | 0.5 | 0 | `video\mengto\web-technique-to-skill` |
| `brand-xlsx` | 7.75 | 2.5 | 2.0 | 0.75 | 1.5 | 1.0 | 1 | `design\brand-xlsx` |
| `codebase-design` | 7.75 | 2.5 | 2.0 | 0.75 | 2.0 | 0.5 | 0 | `MattSkills\skills\engineering\codebase-design` |
| `dt-alerting` | 7.75 | 2.5 | 2.0 | 0.75 | 2.0 | 0.5 | 0 | `devops\dynatrace\dt-alerting` |
| `dt-obs-analytics` | 7.75 | 2.5 | 2.0 | 0.75 | 2.0 | 0.5 | 0 | `devops\dynatrace\dt-obs-analytics` |
| `dt-obs-problems` | 7.75 | 2.5 | 2.0 | 0.75 | 2.0 | 0.5 | 0 | `devops\dynatrace\dt-obs-problems` |
| `long-blog-to-viral-social-posts` | 7.75 | 2.5 | 2.0 | 1.25 | 2.0 | 0.0 | 0 | `content\long-blog-to-viral-social-posts` |
| `monte-carlo-remediation` | 7.75 | 2.5 | 2.0 | 0.75 | 2.0 | 0.5 | 0 | `devops\monte-carlo\monte-carlo-remediation` |
| `phaser-gamedev` | 7.75 | 2.5 | 2.0 | 0.75 | 2.0 | 0.5 | 0 | `game-dev\phaser-gamedev` |
| `lieflat-charts` | 7.93 | 2.0 | 2.0 | 1.5 | 1.43 | 1.0 | 4 | `content\lieflat-charts` |
| `marketing-council` | 7.96 | 3.0 | 1.7 | 1.0 | 1.76 | 0.5 | 2 | `management\marketing\marketing-council` |
| `blog-to-linkedin-post` | 8.0 | 3.0 | 2.0 | 0.5 | 2.0 | 0.5 | 0 | `content\blog-to-linkedin-post` |
| `dt-dql-essentials` | 8.0 | 2.5 | 2.0 | 1.0 | 2.0 | 0.5 | 0 | `devops\dynatrace\dt-dql-essentials` |
| `dt-obs-services` | 8.0 | 2.5 | 2.0 | 1.0 | 2.0 | 0.5 | 0 | `devops\dynatrace\dt-obs-services` |
| `dt-obs-tracing` | 8.0 | 2.5 | 2.0 | 1.0 | 2.0 | 0.5 | 0 | `devops\dynatrace\dt-obs-tracing` |
| `gracker-writing` | 8.0 | 2.5 | 2.0 | 1.5 | 2.0 | 0.0 | 0 | `content\gracker-writing` |
| `kanban-orchestrator` | 8.0 | 2.5 | 2.0 | 1.5 | 1.5 | 0.5 | 2 | `—` |
| `pptx` | 8.0 | 2.5 | 2.0 | 1.0 | 2.0 | 0.5 | 0 | `—` |
| `systematic-debugging` | 8.0 | 2.5 | 2.0 | 0.5 | 2.0 | 1.0 | 0 | `software-development\systematic-debugging` |
| `web-prototype` | 8.0 | 2.0 | 2.0 | 1.5 | 2.0 | 0.5 | 0 | `design\web-prototype` |
| `apk-ndk-version-check` | 8.05 | 3.0 | 1.3 | 0.75 | 2.0 | 1.0 | 0 | `software-development\apk-ndk-version-check` |
| `remotion-best-practices` | 8.08 | 2.25 | 2.0 | 1.0 | 1.83 | 1.0 | 1 | `video\remotion-best-practices` |
| `3d-ultra-realistic-water` | 8.2 | 2.0 | 1.7 | 1.5 | 2.0 | 1.0 | 0 | `video\mengto\3d-ultra-realistic-water` |
| `3d-wood-lighting-scorecard` | 8.2 | 2.0 | 1.7 | 1.5 | 2.0 | 1.0 | 0 | `video\mengto\3d-wood-lighting-scorecard` |
| `excel-hygiene` | 8.2 | 2.0 | 1.7 | 1.5 | 2.0 | 1.0 | 0 | `content\excel-hygiene` |
| `mcp-builder` | 8.2 | 2.5 | 1.7 | 1.0 | 2.0 | 1.0 | 0 | `—` |
| `technical-design-document` | 8.2 | 3.0 | 1.7 | 1.5 | 2.0 | 0.0 | 0 | `game-dev\technical-design-document` |
| `xlsx` | 8.2 | 2.5 | 1.7 | 1.0 | 2.0 | 1.0 | 0 | `—` |
| `aigc-video-creation` | 8.25 | 3.0 | 2.0 | 0.75 | 2.0 | 0.5 | 0 | `content\aigc-video-creation` |
| `algorithmic-art` | 8.25 | 2.5 | 2.0 | 0.75 | 2.0 | 1.0 | 0 | `—` |
| `blog-to-twitter-post` | 8.25 | 3.0 | 2.0 | 0.75 | 2.0 | 0.5 | 0 | `content\blog-to-twitter-post` |
| `remotion-markup` | 8.25 | 2.25 | 2.0 | 1.0 | 2.0 | 1.0 | 0 | `video\remotion-markup` |
| `webapp-testing` | 8.3 | 2.5 | 1.3 | 1.5 | 2.0 | 1.0 | 0 | `game-dev\webapp-testing` |
| `diagnosing-bugs` | 8.45 | 2.5 | 1.7 | 1.25 | 2.0 | 1.0 | 0 | `MattSkills\skills\engineering\diagnosing-bugs` |
| `agent-browser` | 8.5 | 2.5 | 2.0 | 1.5 | 2.0 | 0.5 | 0 | `content\agent-browser` |
| `article-prompts-to-skills` | 8.5 | 2.5 | 2.0 | 1.5 | 2.0 | 0.5 | 0 | `video\mengto\article-prompts-to-skills` |
| `browser-video-recording` | 8.5 | 2.5 | 2.0 | 1.0 | 2.0 | 1.0 | 0 | `video\mengto\browser-video-recording` |
| `docx` | 8.5 | 2.5 | 2.0 | 1.0 | 2.0 | 1.0 | 0 | `—` |
| `hands-on-deck` | 8.5 | 2.5 | 2.0 | 1.0 | 2.0 | 1.0 | 0 | `design\hands-on-deck` |
| `html-artifacts` | 8.5 | 2.5 | 2.0 | 1.0 | 2.0 | 1.0 | 0 | `design\html-artifacts` |
| `optimize-web-animations` | 8.5 | 2.5 | 2.0 | 1.5 | 2.0 | 0.5 | 0 | `video\mengto\optimize-web-animations` |
| `pdf` | 8.5 | 2.5 | 2.0 | 1.0 | 2.0 | 1.0 | 0 | `—` |
| `presentation-skill` | 8.5 | 2.0 | 2.0 | 2.0 | 2.0 | 0.5 | 0 | `design\presentation-skill` |
| `visual-learner` | 8.5 | 2.5 | 1.0 | 2.0 | 2.0 | 1.0 | 0 | `design\visual-learner` |
| `xiaoma-studio` | 8.5 | 2.0 | 2.0 | 1.5 | 2.0 | 1.0 | 0 | `design\xiaoma-studio` |
| `hyperframes` | 8.52 | 2.0 | 1.7 | 2.0 | 1.82 | 1.0 | 2 | `content\hyperframes` |
| `remotion-to-hyperframes` | 8.57 | 2.0 | 1.7 | 2.0 | 1.88 | 1.0 | 1 | `content\remotion-to-hyperframes` |
| `brand-docx` | 8.6 | 2.5 | 2.0 | 1.5 | 1.6 | 1.0 | 1 | `design\brand-docx` |
| `painted-animation` | 8.64 | 2.5 | 2.0 | 2.0 | 1.14 | 1.0 | 3 | `video\painted-animation` |
| `anidoodle` | 8.7 | 2.5 | 1.7 | 1.5 | 2.0 | 1.0 | 0 | `video\anidoodle` |
| `guizang-product-video-skill` | 8.7 | 2.0 | 1.7 | 2.0 | 2.0 | 1.0 | 0 | `video\guizang-product-video-skill` |
| `visual-explainer` | 8.7 | 2.5 | 1.7 | 1.5 | 2.0 | 1.0 | 0 | `design\visual-explainer` |
| `playwright-testing` | 8.75 | 2.5 | 2.0 | 1.25 | 2.0 | 1.0 | 0 | `game-dev\playwright-testing` |
| `html-ppt` | 8.85 | 2.5 | 2.0 | 2.0 | 1.85 | 0.5 | 2 | `design\html-ppt` |
| `analysis-to-vault` | 9.0 | 3.0 | 2.0 | 1.5 | 2.0 | 0.5 | 0 | `FDE\analysis-to-vault` |
| `kimi3-game-gen` | 9.0 | 2.0 | 2.0 | 2.0 | 2.0 | 1.0 | 0 | `game-dev\kimi3-game-gen` |
| `opendeck` | 9.0 | 3.0 | 2.0 | 1.0 | 2.0 | 1.0 | 0 | `design\opendeck` |
| `ue-renderdoc-auto-capture` | 9.0 | 2.5 | 2.0 | 1.5 | 2.0 | 1.0 | 0 | `game-dev\ue-renderdoc-auto-capture` |
| `html-to-pptx` | 9.1 | 2.5 | 2.0 | 2.0 | 1.6 | 1.0 | 1 | `design\html-to-pptx` |
| `single-file-html-game` | 9.2 | 2.5 | 1.7 | 2.0 | 2.0 | 1.0 | 0 | `game-dev\single-file-html-game` |
| `kinetic-reel` | 9.25 | 2.5 | 2.0 | 2.0 | 1.75 | 1.0 | 1 | `video\kinetic-reel` |
| `huashu-design` | 9.41 | 3.0 | 2.0 | 2.0 | 1.91 | 0.5 | 1 | `design\huashu-design` |
| `manim-video` | 9.5 | 3.0 | 2.0 | 1.5 | 2.0 | 1.0 | 0 | `video\manim-video` |
| `onetake` | 9.5 | 2.5 | 2.0 | 2.0 | 2.0 | 1.0 | 0 | `video\onetake` |
| `video-production` | 9.5 | 2.5 | 2.0 | 2.0 | 2.0 | 1.0 | 0 | `design\video-production` |
| `anatomy` | 9.7 | 3.0 | 1.7 | 2.0 | 2.0 | 1.0 | 0 | `design\anatomy` |
| `book-chapter-to-vault` | 10.0 | 3.0 | 2.0 | 2.0 | 2.0 | 1.0 | 0 | `FDE\book-chapter-to-vault` |
