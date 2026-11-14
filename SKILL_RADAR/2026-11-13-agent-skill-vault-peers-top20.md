# Skill Radar — Top 20 **agent-skill vaults** (curated multi-skill libraries, not single skills)

**Date:** 2026-11-13 · **Snapshot:** GitHub REST API (authenticated `gh`, account `yhyu13`), search + recursive git tree, 2026-11-13 17:00–18:10 UTC
**Scope:** repos whose *product is a curated multi-skill library* — the same thing this vault is. Single-purpose skills, awesome-lists (links only, no `SKILL.md` payload), agent frameworks and apps that merely ship a few skills are excluded from the ranking (§7).
**Companion artefacts:** `2026-11-13-agent-skill-vault-peers.csv` (52 measured rows) · `data/sweep-vault-peers.txt` · `data/peers-scored.tsv` · `data/substance-vault-peers.tsv`

---

## 0. The question, in English (for reuse)

> "Find the 20 most vault-shaped agent-skill libraries on GitHub — repos that are themselves a curated, categorised, installable skill library like ours. Work out what is worth distilling from them, and vendor the remarkable ones."

中文题意：找出 GitHub 上**和我们同形态**的 20 个 agent skill 库（不是单个 skill、不是 awesome 列表、不是 agent 框架），看看能蒸馏什么，值得的就挂成 submodule。

---

## 1. TL;DR

1. **Scale is a lie; uniqueness is the truth.** The ecosystem's headline numbers are inflated by per-harness mirrors: `sickn33/agentic-awesome-skills` ships 9,454 `SKILL.md` files of which only **3,246 are unique content** (66% duplicates); `wondelai/skills` 196 → **65** (67%); `jeremylongshore/tons-of-skills-marketplace` 5,764 → **3,299** (43%); `deanpeters/Product-Manager-Skills` 215 → **148** (31%). Deduplicating by git blob SHA is mandatory before ranking anything in this space (§3.2).
2. **Our vault sits in the top decile on every structural axis and in the top 1% on curation.** 276 skills / 11 categories, median `SKILL.md` **6,713 B**, 96% ≥ 2 KB, 2% < 1 KB, 39% shipping `references/`, 13% shipping `scripts/`. Against the 52 measured peers, only a handful exceed that substance density (`scenario-labs/skills` 16.9 KB median, `wondelai/skills` 17.1 KB, `K-Dense-AI/scientific-agent-skills` 13.5 KB).
3. **Almost nobody does what we do.** Six of the top 20 have a real install/sync toolchain; **two** have quality gates; **zero** have a retirement ledger, a provenance record, or a research-radar layer. The parts we consider housekeeping are the differentiators.
4. **The one thing we are actually missing is a skill lockfile.** `skills-lock.json` (`{source, sourceType, skillPath, computedHash}`) appears independently in `scenario-labs/skills`, `thedaviddias/Front-End-Checklist` and `pbakaus/impeccable`. Our `install-manifest.txt` carries `name|path` only — the upstream pointer lives in prose in `INSTRUCTION.md` and the hash is recomputed at verify time instead of recorded.
5. **The second gap is verification depth.** `alirezarezvani/claude-skills/scripts/check_harness_installs.py` installs into a **throwaway HOME** per harness and then *asks the harness itself* which skills it discovered (`codex debug prompt-input`, `gemini skills list`, `hermes skills list`, Vibe's `SkillManager`). Our `verify-install.ps1` proves the *files* are byte-identical; it never proves the *harness lists the skill*. Their script also documents a hard constraint we may already be hitting: **"the full library overflows Codex's skill budget"** — they install per-category into a fresh `CODEX_HOME`.
6. **The third gap is evidence binding.** `aaron-he-zhu/aaron-marketing-skills` ships `evals/<skill>/cases.md`, a YAML eval-case format where the strict parser **rejects `status: real` without `evidence_ref` + `evidence_sha256`**. That is a machine-enforced version of the `†` "unverified" marker this radar uses by hand. It also ships `evals/routing-retrieval/`, mapping an intent to the ≤3 skills that *should* fire — the eval we approximated with Jaccard distance in `docs/skill-capacity-audit/`.
7. **Marketplace packaging is the default distribution path we lack.** Nearly every peer carries `.claude-plugin/marketplace.json` so users can `/plugin marketplace add <repo>`. Our install story is PowerShell scripts + junctions.
8. **Two different vault philosophies are on display.** *Copy-per-harness* (ECC: 10 dotdirs of real copies, per-harness `install.sh`/`uninstall.sh`, ownership tracked by **stable ID inside the host's settings file** for idempotent update) versus *one canonical tree + generated views* (us: 1 real copy, 13 junctions, verified byte-for-byte). The copy model buys harness-native packaging at 43–67% content duplication; ours buys zero drift at the cost of no marketplace entry point.
9. **Three libraries are remarkable enough to vendor** and four more are worth a submodule for their payload; the rest are reference-reading only, mostly because a submodule that needs 500 MB–3 GB on every recursive clone is a bad trade (§9).

---

## 2. What counts as "a vault like ours" — the five-part test

A repo enters the ranking only if **all five** hold:

| # | Criterion | Measured by |
|---|-----------|-------------|
| V1 | **Library, not a product.** The skill collection *is* the repo's deliverable | manual read of top-level tree + README (auto-proxy: skills spread over ≥2 top-level dirs, no `apps/`+`packages/` product skeleton that the skills merely decorate) |
| V2 | **Curated structure.** Skills live under categories, not in one flat list | distinct first path segments holding `SKILL.md` ≥ 2, tree depth ≥ 3 |
| V3 | **Scale parity.** Same order of magnitude as 276 unique skills | unique `SKILL.md` count in 40–5,000 |
| V4 | **Distributable.** A documented path into a harness store | install/sync/manifest scripts, CI, per-harness dotdirs |
| V5 | **Live and licensed.** Not archived, pushed in 2026, and copyable | `pushed_at`, `license` |

Anything failing V1 is **not a peer** even if it is enormous — that includes every app, framework and registry in the sweep. They are still useful as *architecture references*, which is why §7 lists them with what they prove rather than dropping them silently.

---

## 3. Method

### 3.1 Two discovery strategies, then diff (per `SKILL_RADAR/README.md`)

| Strategy | Queries | Yield |
|---|---|---|
| Topic sweeps | `topic:agent-skills` (42,860 repos), `claude-skills` (15,842), `claude-code-skills` (2,752), `agent-skill`, `skills-library`, `skill-library`, `awesome-skills`, `claude-plugins`, `agentic-skills` | top 100 by stars each |
| Keyword sweeps on vault contents | `"SKILL.md" in:readme`, `"skill library"`, `"skills marketplace"`, `"curated skills"`, `"skill registry"`, `"portable skills"`, `"anthropic skills"`, `"codex skills"`, `"gemini skills"`, `"skills installer"` | top 100 by stars each |

23 queries → **1,840 unique repos** (`data/sweep-vault-peers.txt`). A second pass profiled every remaining repo ≥ 5,000 ★ from the same sweep (146 more), so the "no `skill` in the name" case is covered.

### 3.2 Three measurements per repo, one API call each

| Tool | What it measures |
|---|---|
| `scripts/tree_profile.py` | recursive tree at `HEAD`: `SKILL.md` count, category count, tree depth, tooling scripts, CI, tests, docs, curation docs, license, manifest hits |
| `scripts/skill_substance.py` | **unique** `SKILL.md` (dedupe by git blob SHA) + median / p10 / p90 size + share of stubs + how many skills ship `references/` or `scripts/` |
| `scripts/merge_score.py` | joins the two with stars / `pushed_at` / license and computes the peer score |

387 API calls total, ~5 min. Raw outputs are committed under `data/`.

**Two measurement errors found and fixed mid-scan — both would have produced a wrong ranking:**

- **Mirror duplication.** `wondelai/skills` looked like a 196-skill library until the README said "65 agent skills" and the tree showed `.agents/`, `.claude/`, `.cursor/`, `.pi/`, `.windsurf/` copies of the same 65. Deduping by blob SHA reproduces the README number exactly, which validates the method. Every count in this note is the deduped one.
- **`SKILL.md` presence ≠ skill.** `VoltAgent/awesome-agent-skills` (37,149 ★) and `VoltAgent/awesome-openclaw-skills` (53,745 ★) contain **zero** `SKILL.md`; they are link lists. They were in the candidate set purely on name/description match. An awesome-list cannot be a vault.

### 3.3 Peer score (0–10), and why it is only a *filter*

Five dimensions, each from a measured fact: scale (1.5), curated structure (1.5), tooling+CI+tests (2.5), curation artefacts + license (1.4), multi-harness projection (0.7), payload depth (0.6), substance (0.6), liveness (0.4).

The score orders *repos*, not *ideas*. It cannot tell a 24-skill repo whose architecture is more advanced than ours (`pbakaus/impeccable`: 10 harness projections, 23 categories, lockfile, manifest validator, provider-block tests) from a 4,166-skill catalog generated by a script (`Awesome-Journal-Skills`: 0 `references/`, 0 `scripts/`). Read §5 per repo, not §4's ordering.

---

## 4. The ranking — top 20 vault peers

Ranked by peer score among V1 passers; `n` is **unique** `SKILL.md`; `harn` is how many harness dotdirs (`.claude/.codex/.cursor/.gemini/.kimi/.agents/.claude-plugin/…`) the repo projects into; `MiB` is repo size, which decides vendorability.

| # | repo | score | ★ | n | cats | harn | median SKILL.md | refs | MiB | license |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `affaan-m/ECC` | 8.3 | 302,348 | 929 | 6 | 10 | 7,869 B | 23 | 61 | MIT |
| 2 | `jeremylongshore/tons-of-skills-marketplace` | 8.4 | 2,918 | 3,299 | 6 | 5 | 4,761 B | 4,509 | 507 | MIT |
| 3 | `scenario-labs/skills` | 8.2 | 3,751 | 179 | 2 | 5 | 16,929 B | 112 | 47 | MIT |
| 4 | `alirezarezvani/claude-skills` | 7.5 | 29,751 | 460 | 20 | 7 | 7,222 B | 305 | 24 | MIT |
| 5 | `dotnet/skills` | 8.1 | 6,129 | 116 | 4 | 3 | 12,699 B | 38 | 553 | MIT |
| 6 | `Klotzkette/claude-fuer-deutsches-recht` | 7.1 | 1,835 | 18,848 | 233 | 1 | 4,090 B | 637 | 3,019 | Apache-2.0 |
| 7 | `sickn33/agentic-awesome-skills` | 6.6 | 49,657 | 3,246 | 2 | 2 | 7,692 B | 2,224 | 452 | MIT |
| 8 | `aaron-he-zhu/aaron-marketing-skills` | 7.4 | 3,142 | 120 | 8 | 1 | 12,868 B | 57 | 12 | Apache-2.0 |
| 9 | `NVIDIA/skills` | 7.4 | 3,967 | 451 | 2 | 3 | 11,881 B | 271 | 32 | Apache-2.0 |
| 10 | `daymade/claude-code-skills` | 7.4 | 1,530 | 121 | 7 | 1 | 10,483 B | 101 | 37 | MIT |
| 11 | `brycewang-stanford/Awesome-Journal-Skills` | 6.3 | 1,414 | 4,166 | 300 | 1 | 5,985 B | 0 | 111 | MIT |
| 12 | `anthropics/claude-for-legal` | 6.1 | 9,995 | 151 | 13 | 1 | 11,256 B | 9 | 2 | Apache-2.0 |
| 13 | `thedaviddias/Front-End-Checklist` | 6.8 | 74,724 | 392 | 3 | 3 | 2,035 B | 391 | 8 | MIT |
| 14 | `github/awesome-copilot` | 6.7 | 41,122 | 481 | 2 | 0 | 6,936 B | 162 | 136 | MIT |
| 15 | `pbakaus/impeccable` | 6.4 | 109,413 | 24 | 23 | 10 | 11,774 B | 0 | 885 | Apache-2.0 |
| 16 | `K-Dense-AI/scientific-agent-skills` | 6.1 | 57,047 | 177 | 1 | 0 | 13,532 B | 176 | 461 | MIT |
| 17 | `mukul975/Anthropic-Cybersecurity-Skills` | 5.2 | 36,068 | 818 | 1 | 1 | 10,025 B | 818 | 12 | Apache-2.0 |
| 18 | `phuryn/pm-skills` | 6.2 | 27,964 | 72 | 9 | 2 | 3,739 B | 0 | 23 | MIT |
| 19 | `gamedev-skills/awesome-gamedev-agent-skills` | 6.1 | 8,725 | 80 | 1 | 1 | 9,383 B | 73 | 9 | Apache-2.0 |
| 20 | `Orchestra-Research/AI-Research-SKILLs` | 6.2 | 14,520 | 98 | 22 | 1 | 11,474 B | 91 | 21 | MIT |

**Honourable mentions** (pass V1–V5 but lose on a specific axis): `wondelai/skills` (65 unique, 17.1 KB median, 196 reference files — the densest payload measured; lost points only on 1 category), `brycewang-stanford/Auto-Empirical-Research-Skills` (1,235, NOASSERTION license), `anbeime/skill` (133, NOASSERTION), `tech-leads-club/agent-skills` (94, "secure, validated registry", nx monorepo, NOASSERTION), `Jeffallan/claude-skills` (67, all with references), `Yuan1z0825/nature-skills` (24, Apache-2.0), `JimLiu/baoyu-skills` (22, 12.7 KB median), `mvschwarz/openrig` (57, 4 harnesses).

**Calibration row — us:** 276 skills · 11 categories · median 6,713 B · 96% ≥ 2 KB · 2% < 1 KB · 109 with `references/` (39%) · 35 with `scripts/` (13%) · 1 canonical tree + 13 junction views · ~2.3 MB of `SKILL.md`.

---

## 5. The one thing each peer does better than us

Only repos with a real lesson are listed. "Better" means *a mechanism we do not have*, not "bigger".

| repo | The mechanism | Where it lives |
|---|---|---|
| `alirezarezvani/claude-skills` | **Harness-listing verification.** Install into a throwaway `HOME`, then ask the harness which skills it discovered; diff against intent. Reports `SKIP` for absent CLIs, exit 1 on any miss. | `scripts/check_harness_installs.py`; `scripts/codex-install.sh`; `.github/workflows/sync-codex-skills.yml`, `hero-sync.yml`, `smart-sync.yml` |
| `aaron-he-zhu/aaron-marketing-skills` | **Evidence binding.** Every skill has `evals/<skill>/cases.md` in a typed YAML case format; `status: real` is rejected by the parser unless `evidence_ref` + `evidence_sha256` are present. Plus a routing-retrieval suite that asserts intent → ≤3 skills. | `evals/README.md`, `evals/structure-manifest.json`, `evals/deterministic-suites.json`, `evals/routing-retrieval/`, `scripts/check-routing-retrieval.py` |
| `scenario-labs/skills` | **Skill lockfile.** `skills-lock.json` v1 with `source` / `sourceType` / `skillPath` / `computedHash` per skill, so provenance is data instead of prose. | `skills-lock.json`; tests under `tests/` |
| `affaan-m/ECC` | **Ownership tracking in host config.** Installer registers ECC-owned entries in `~/.claude/settings.json` under stable IDs → idempotent updates and safe uninstall. Ships `doctor.js`, `catalog.js`, `coordination-inventory.js`, `eval-harness.js`. | `install.sh`, `scripts/doctor.js`, `.codebuddy/install.sh`, `.github/ISSUE_TEMPLATE/install-problem.yml` |
| `jeremylongshore/tons-of-skills-marketplace` | **Doc filing standard.** `NNN-CC-ABCD-short-desc.ext`, one global chronological sequence, `000-*` reserved for canonical cross-repo standards, and the rule that *the skill copy is canonical, the repo file is a mirror*. | `000-docs/000-DR-STND-document-filing-system.md`, `ci/emit-evidence` |
| `pbakaus/impeccable` | **Manifest validator + provider blocks.** `scripts/lib/validate-plugin-manifest.js` gates the marketplace entry; `tests/lib/provider-blocks.test.js` and `tests/root-commands-sync.test.js` assert the 10 harness projections stay in sync. | `scripts/lib/`, `tests/`, `skills-lock.json` |
| `sickn33/agentic-awesome-skills` | **Digested catalog.** `catalog-manifest.v1.json` carries `sha256` + size per asset, a `catalogDigest`, an ontology version and `skillCount` — the catalog is verifiable, not just published. | `data/aas-v1/`, `tools/lib/aas-v1/ontology.v1.json`, `.github/workflows/catalog-distribution.yml` |
| `brycewang-stanford/Awesome-Journal-Skills` | **Catalog generation.** `tools/gen_catalog.py` + `catalog.json` + `.maintenance/` — a 4,166-skill library kept consistent by generation rather than review. | `tools/gen_catalog.py`, `catalog.json`, `.maintenance/` |
| `Klotzkette/claude-fuer-deutsches-recht` | **Acceptance facts as data.** `quality/<skill>/release-manifest.json` records `{originals, preserved, total_pdf_pages, xlsx}` per fixture with sha256 of the fixture zips — an acceptance test whose thresholds are reviewable in the diff. | `quality/*/…-manifest.json`, `anthropic-lessons/` |
| `midudev/autoskills` | **One-command stack install.** `packages/autoskills/installer.ts` — "One command. Your entire AI skill stack. Installed." | `packages/autoskills/` |
| `luongnv89/claude-howto` *(not a vault, kept as a reference)* | **Translation pipeline.** `fa/ ja/ ko/ uk/ vi/ zh` doc trees + `scripts/sync_translations.py` + `resources/MANIFEST.txt`. | repo root |

---

## 6. Distillation — 10 patterns worth taking, ranked by value to us

Each row: **what**, **evidence anchor**, **what we have today**, **where it would land**. None of these is a skill change; they are vault-mechanism changes, so they go to `SKILL_CANDIDATES.md` first (per `AGENTS.md` editing discipline).

| # | Pattern | Evidence | Our gap | Candidate landing |
|---|---|---|---|---|
| D1 | **Ask the harness what it actually loaded** — install into a temp `HOME`, run the harness's own listing command, diff against intent, fail the run on a miss | `alirezarezvani/claude-skills/scripts/check_harness_installs.py` | `verify-install.ps1` proves byte-identity of files only; a skill can be installed and still be invisible (budget overflow, name conflict, `disable-model-invocation`) | `scripts/verify-install.ps1` sibling: `scripts/verify-harness-sees.ps1` |
| D2 | **Skill lockfile** `{source, sourceType, skillPath, computedHash}` next to the manifest | `scenario-labs/skills/skills-lock.json`, `thedaviddias/Front-End-Checklist/skills-lock.json`, `pbakaus/impeccable/skills-lock.json` | `install-manifest.txt` = `name\|path`; upstream lives in prose in `INSTRUCTION.md` | extend `build-manifest.ps1` to emit `skills-lock.json`; make `INSTRUCTION.md` rows checkable against it |
| D3 | **Evidence binding for claims** — a claim marked `real` must carry a reference + sha256, or the parser rejects it | `aaron-he-zhu/…/evals/README.md` ("The strict parser rejects a real label without that evidence binding") | our radar marks unverified rows with a hand-typed `†`; nothing enforces it | `SKILL_RADAR` front-matter field `evidence: {ref, sha256}` + a linter in `SKILL_RADAR/scripts/` |
| D4 | **Routing eval, not routing heuristics** — assert "this intent must fire ≤3 of these skills" and check it | `aaron-he-zhu/…/evals/routing-retrieval/` ("focused ≤3 modules beat exhaustive dumps"), `scripts/check-routing-retrieval.py` | we measure sibling overlap with Jaccard ≥ 0.30 on descriptions (`docs/skill-capacity-audit/`) — a proxy, not a behavioural test | extend `skill_pressure_analysis.py` into an intent→expected-set fixture |
| D5 | **Ownership IDs in host config** | `affaan-m/ECC` README §Install hooks ("ECC-owned entries are tracked by stable ID for idempotent updates and safe uninstall") | we rely on a name whitelist + `cmd /c rmdir`; nothing records which store entries are ours | `scripts/sync-skills.ps1` writes `~/.agents/skills/.vault-owned.json` |
| D6 | **Marketplace manifest** `.claude-plugin/marketplace.json` → `/plugin marketplace add <repo>` | ~15 of the 20 peers ship one (`anthropics/claude-for-legal`, `NVIDIA/skills`, `dotnet/skills`, `daymade/…`, `phuryn/pm-skills`, …) | install == run a PowerShell script on Windows | generate `.claude-plugin/marketplace.json` + `.codex-plugin/plugin.json` from the manifest |
| D7 | **Digested, generated catalog** — `catalog.json` + `catalog-manifest.json` with sha256 per asset and a `skillCount` | `sickn33/…/data/aas-v1/catalog-manifest.v1.json`, `brycewang/…/tools/gen_catalog.py` | `README.md` skill index is hand-maintained and drifts (AGENTS.md admits "the manifest and the file tree are the executable truth — those two docs drift") | `scripts/build-catalog.ps1` → `catalog.json` + digest, checked in CI |
| D8 | **Doc filing standard with typed IDs** `NNN-CC-ABCD-short-desc.ext` | `jeremylongshore/…/000-docs/000-DR-STND-document-filing-system.md` | `docs/` mixes audits, reports and scripts ad hoc; `SKILL_RADAR` has its own dating convention | adopt for `docs/` only (radar keeps `YYYY-MM-DD-*`) |
| D9 | **Acceptance thresholds as data, per skill** | `Klotzkette/…/quality/<skill>/release-manifest.json` | our `score_skills.py` scores the library, never the individual skill's acceptance facts | `SKILL/<cat>/tier<N>/<skill>/.acceptance.json` (optional, checked when present) |
| D10 | **Real-copy-per-harness vs junction** — a decision, not an accident | measured: `sickn33` 66%, `wondelai` 67%, `tons-of-skills` 43%, `deanpeters` 31% duplicate `SKILL.md` | we are 0% duplicate (1 tree + 13 junctions) | keep junctions; **document the trade** in `AGENTS.md` so the next session doesn't "fix" it into copies |

Three of these (D1, D2, D3) are the difference between *"we say it's installed and correct"* and *"we proved it"*. They are the highest-value takeaways of this scan.

---

## 7. Excluded — and what each proves

Not peers (fail V1: the skill library is a feature of a product), but each is an architecture reference:

| repo | ★ | unique skills | Why it is not a peer | What it proves |
|---|---|---|---|---|
| `heygen-com/hyperframes` | 83,805 | 22 | video renderer + registry; skills are its docs surface | catalog-preview + `catalog-publish` workflows (`docs/public/catalog-index.json`, `docs/schema/registry.json`) |
| `nexu-io/open-design` | 107,495 | 474 | design *workspace* app | 562→474 dedupe shows 16% mirror waste even in curated repos |
| `HKUDS/CLI-Anything` | 58,698 | 131 | CLI hub; one skill per wrapped CLI (71 categories) | the "one skill per external tool" generation model; `verify-plugin.sh` |
| `mvschwarz/openrig` | 8,841 | 57 | agent-network runtime | `scripts/smoke-fresh-install.sh` |
| `Devin-AXIS/iPolloWork` | 7,451 | 98 | agent workbench | 10% dup; 23% stub rate is what a workbench's skills look like |
| `davila7/claude-code-templates` | 33,471 | 917 | registry + CLI, not a curated tree | `999`-row registry scale with only 1% dup |
| `garrytan/gbrain` | 32,839 | 199 | agent brain/memory product | 20% stubs — volume without curation |
| `midudev/autoskills` | 6,999 | 207 | installer tool, 1 category | D-extra: one-command install UX |
| `tech-leads-club/agent-skills` | 7,166 | 94 | secure registry (nx monorepo) | a validation pipeline before publish |
| `career-ops-hq/career-ops` | 82,353 | 6 | job-search agent | 53% stubs — worst substance in the set |
| `VoltAgent/awesome-agent-skills`, `VoltAgent/awesome-openclaw-skills`, `ComposioHQ/awesome-claude-skills`, `hesreallyhim/awesome-claude-code`, `agentskills/agentskills` | 37k–79k | **0** | link lists / spec, no `SKILL.md` payload | star count is worthless as a vault signal |
| `FreedomIntelligence/OpenClaw-Medical-Skills` (893), `ComposioHQ/awesome-claude-skills` (864), `openai/skills` (44), `anthropics/skills` (20) | — | — | **no license on file** → not copyable | a public repo without `LICENSE` is not redistributable, whatever its stars |
| `brycewang-stanford/Auto-Empirical-Research-Skills` (1,235), `anbeime/skill` (133), `deanpeters/Product-Manager-Skills` (148), `ClawBio/ClawBio` | — | — | `NOASSERTION` — licence present but non-standard | reading is fine; copying needs a manual read of the file |

---

## 8. Caveats

- **Stars are from `GET /search/repositories` on 2026-11-13.** The 24 repos in the vendor shortlist were re-fetched via `GET /repos/{o}/{r}` to read `size` / `license` / `default_branch`; their `stargazers_count` agreed with the search value in all 24 cases. No aggregator numbers are used anywhere in this note.
- **`n_unique` under-counts true duplicates that differ by a byte** (e.g. a regenerated header). It also cannot see a skill copied under a different filename. Treat it as a floor, not an exact library size.
- **Repo size (`MiB`) is `repos/{o}/{r}.size`** — the size of the default-branch packfile, so it is a clone-cost proxy, not a content measure.
- **The five-part vault test is applied manually.** The auto-proxy for V1 (≥2 top-level dirs holding skills) misclassifies `nexu-io/open-design` (7 dirs, but an app) and would misclassify a future monorepo vault. Re-check V1 by hand on any repo added to the set.
- **GitHub search is recall-limited.** Every query ANDs its terms, so a vault with an unusual vocabulary (`claude-fuer-deutsches-recht` describes itself in German) only surfaced because `topic:agent-skills` caught it. The true population is larger than 20.
- **`median SKILL.md` size is not quality.** A 12 KB templated skill and a 12 KB hand-written one are indistinguishable to this measurement. The `refs` column (skills shipping a `references/` directory) is the better substance proxy — it takes a human decision to split content out.

---

## 9. 判断与建议 — what to vendor, what to read

**Vendor shortlist (7 candidates) — a submodule earns its place only if it is small, licensed, and teaches us something we do not have:**

| repo | MiB | license | why it earns a submodule |
|---|---|---|---|
| `aaron-he-zhu/aaron-marketing-skills` | 12 | Apache-2.0 | D3 evidence binding + D4 routing eval — the two mechanisms we most lack; 120 skills, 8 categories, 57 with references |
| `alirezarezvani/claude-skills` | 24 | MIT | D1 harness-listing verification; 460 skills over 20 business categories; per-harness sync workflows — **already vendored as `vendor/claude-skills`** |
| `affaan-m/ECC` | 61 | MIT | D5 ownership IDs; the only peer with 10-harness projection + doctor/catalog/eval tooling; most-starred vault on GitHub |
| `scenario-labs/skills` | 47 | MIT | D2 lockfile done first and cleanest; densest payload measured (16.9 KB median) |
| `anthropics/claude-for-legal` | 2 | Apache-2.0 | 13 legal sub-domains we have **zero** coverage of; the cheapest submodule on the list |
| `mukul975/Anthropic-Cybersecurity-Skills` | 12 | Apache-2.0 | 818 skills where **every** one ships both `references/` and `scripts/` — the strongest uniformity in the set |
| `wondelai/skills` | 3 | MIT | 65 book-derived frameworks, 100% with references, 17.1 KB median — the highest substance-per-skill measured |

**Do not vendor, read in place:** `jeremylongshore/tons-of-skills-marketplace` (507 MB), `Klotzkette/claude-fuer-deutsches-recht` (3.0 GB — an 18,848-skill German-law corpus; the *pattern* in `quality/` is the value, not the payload), `sickn33/agentic-awesome-skills` (452 MB), `dotnet/skills` (553 MB), `pbakaus/impeccable` (885 MB), `K-Dense-AI/scientific-agent-skills` (461 MB), `davila7/claude-code-templates` (300 MB). A submodule that costs half a gigabyte on every `--recursive` clone is a tax on every future session.

**What was actually added (2026-11-13, `vendor/` only — nothing installed, manifest unchanged):**

| submodule path | upstream @ pin | licence | payload |
|---|---|---|---|
| `vendor/claude-for-legal` | `anthropics/claude-for-legal` @ `4a6c651` | Apache-2.0 | 151 skills, 13 legal sub-domains, 1.7 MB |
| `vendor/wondelai-skills` | `wondelai/skills` @ `c526558` | MIT | 65 unique skills, median 17.1 KB, 100% with `references/` |
| `vendor/aaron-marketing-skills` | `aaron-he-zhu/aaron-marketing-skills` @ `64bd94b` | Apache-2.0 | 120 skills + the `evals/` mechanism (D3/D4) |
| `vendor/anthropic-cybersecurity-skills` | `mukul975/Anthropic-Cybersecurity-Skills` @ `54a7988` | Apache-2.0 | 818 skills, every one with `references/` **and** `scripts/` |
| `vendor/ecc` | `affaan-m/ECC` @ `d2ef268` | MIT | 929 unique skills, 10 harness projections, installer toolchain (D5) |
| `vendor/scenario-labs-skills` | `scenario-labs/skills` @ `94cab3f` | MIT | 179 skills, median 16.9 KB, `skills-lock.json` (D2) |

`alirezarezvani/claude-skills` was **already** vendored as `vendor/claude-skills`, so the D1 script was reachable without a new submodule — verified against `.gitmodules` before adding anything, which is the step that stopped me from duplicating it.

**Verification that vendoring is side-effect free:** re-ran `scripts/build-manifest.ps1` after the six additions — the install list stayed at 320 entries except for `tygg-ai-film-studio`, which dropped because `SKILL/video/tier1/tygg-ai-film-studio` is itself a submodule and is uninitialised in this worktree (`ls` → empty). That is a pre-existing worktree artefact, unrelated to this batch, and it is now logged as candidate #72: an uninitialised `SKILL/` submodule silently disappears from the manifest.

**Security pass before vendoring** (manual, because the `skillspector` CLI is not installed on this host — recorded as such rather than as a clean scan):

- `claude-for-legal`, `wondelai-skills`, `ecc`, `scenario-labs-skills` — no credential-path reads, no remote-code-to-shell installers in executable files.
- `aaron-marketing-skills` — `scripts/publish-skillhub.sh` documents `curl … install.sh | bash` for *their own* publishing CLI (user-initiated, not a skill's runtime behaviour); `skills/` payload is clean.
- `anthropic-cybersecurity-skills` — 8 `scripts/agent.py` files touch `~/.ssh` and `/root/.aws/credentials` **as the subject of the skill** (credential-access, honeytoken and audit skills). Domain-legitimate, but this is the one vendored pack whose scripts must never be run blind on a real host; the provenance row in `INSTRUCTION.md` says so explicitly.
- One `curl -sL get.shipd.io | sh` hit in `wondelai-skills` is inside `technical-documentation/references/audit-checklist.md`, where the surrounding text is deliberately bad documentation used as an anti-pattern example — not an installer.

**Nothing here should be installed into `SKILL/` yet.** Per `AGENTS.md`, findings go to `SKILL_CANDIDATES.md` and skills change only after batch review — 7 new domains would otherwise land as 1,900 unreviewed skills.

---

## Sources

- GitHub REST API — `/search/repositories`, `/repos/{o}/{r}`, `/repos/{o}/{r}/git/trees/HEAD?recursive=1` (authenticated, 2026-11-13)
- Raw file contents via `/repos/{o}/{r}/contents/{path}` for every artefact quoted in §5–§6
- Scripts: `SKILL_RADAR/scripts/gh_scan_vaults.py`, `tree_profile.py`, `skill_substance.py`, `merge_score.py`
- Data: `data/queries-vault-peers.txt`, `data/sweep-vault-peers.txt`, `data/profile-vault-peers{,-pass2}.tsv`, `data/substance-vault-peers.tsv`, `data/peers-scored.tsv`
- Prior radar notes for method continuity: `2026-10-24-top-20-most-starred-work-deliverable-agent-skills.md` (exclusion of frameworks), `2026-10-24-radar-adoption-install-record.md` (submodule discipline)

*Snapshot, not truth: star counts and skill counts move. Re-run `gh_scan_vaults.py` → `tree_profile.py` → `skill_substance.py` → `merge_score.py` and diff against the committed TSVs rather than trusting this file later.*
