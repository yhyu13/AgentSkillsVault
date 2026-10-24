# Skill Radar — Top 20 most-starred agent skills for MBA / business domains

**Date:** 2026-10-24 · **Snapshot:** GitHub REST API, 2026-10-24 ~13:30–14:10Z
**Scope:** agent skills, skill packs, agent rosters and agent toolkits that carry **MBA-grade business method** — market analysis & market sizing, competitive analysis, PRD / product management, entrepreneurship & startup kit-building, finance / accounting / valuation, sales & GTM, strategy frameworks, HR / legal / operations.
**Method:** 8 rounds of `GET /search/repositories` (sort=stars) over 23 hand-built queries, then `GET /repos/{owner}/{repo}` for star/verification of every candidate, then `GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1` to read the actual file inventory (SKILL.md / agent.md paths) so each claim about *what the skill contains* is file-evidenced, not description-evidenced.
**Companion:** `2026-10-24-top-20-agent-skills-for-fde-prototyping.md` (same-day FDE scan; overlapping repos cross-referenced, not duplicated).

---

## 0. The question, in English (for reuse)

> "Research the **20 most-starred agent-related skills** that an MBA-track user would use — **market analysis, PRD writing, entrepreneurship** and adjacent business disciplines — and dump the findings into research notes."

---

## 1. TL;DR (conclusion first)

1. **The whole MBA-skill band is a rounding error next to the engineering band.** The top business-domain pack (`msitarzewski/agency-agents`, 163,627★) sits below `obra/superpowers` (304,473★), `anthropics/skills` (183,422★) and `affaan-m/ECC` (287,710★). Only **2 of the 20** MBA-relevant packs clear 60k★; **8 of 20 sit below 5,000★**.
2. **Three packs carry the real MBA method, and they are small.** The genuinely MBA-shaped assets — `brainbytes-dev/everything-claude-finance` (6★, but with `dcf-valuation`, `lbo-modeling`, `precedent-transactions`, `pitch-book-creation`, `comparable-analysis`), `M-MMahmood/business-frameworks-agent-skills` (0★, 26 classic frameworks: Porter's Five Forces, BCG matrix, Business Model Canvas, McKinsey 7S, OKRs, Pyramid Principle) and `panaversity/agentfactory-business-plugins` (36★, banking/HR/legal plugins) — hold the deepest domain content at the bottom of the star table. **Stars are inversely correlated with MBA-method depth in this niche.**
3. **"Market analysis / PRD / business plan" is a ~0–42★ niche.** The single most on-target repo for the literal request (`dlkakbs/hermes-startup-architect`, 42★) generates market analysis + competitor map + pitch deck + roadmap + product spec from one startup idea. The highest-star *pure* PRD skill is `springhalu0319/prd-writer-skill` at **4★**; the best PRD content actually lives inside a general pack: `alirezarezvani/claude-skills` → `.gemini/skills/prd/SKILL.md` (28,629★ repo).
4. **Top 3 practical adoption targets for this vault** (stars + file evidence + license):
   - `alirezarezvani/claude-skills` — 28,629★, MIT — has `prd`, `cs-product-strategist`, `cs-financial-analyst`, `competitive-matrix`, `finance-lead`, `growth-strategist`, `startup-cto` **as real `SKILL.md` files**.
   - `coreyhaines31/marketingskills` — 56,320★, MIT — `customer-research`, `competitor-profiling`, `competitors`, `marketing-council`, `lead-magnets`, `attribution` (95 business-tagged files in-tree).
   - `brainbytes-dev/everything-claude-finance` — 6★, MIT — the **finance core** (DCF / LBO / comps / precedent tx / pitch book / GAAP-IFRS accounting standards).
   *(Two domains are effectively unserved upstream and are build candidates, not copy candidates — see §5.)*
5. **Warning carried over from the FDE scan, re-confirmed here:** stars follow the kit, installs follow the file. A 163k★ agent roster is *not* a better MBA asset than a 6★ skill pack with `dcf-valuation/SKILL.md` in it. This note therefore ranks by stars (§3) **and** separately by method density (§4).

---

## 2. How the candidate set was built (reproducible)

| Step | Call | Purpose |
|---|---|---|
| 1 | `GET /search/repositories?q=<query>&sort=stars&per_page=20-25` × 23 queries | recall across market analysis / PRD / startup / finance / sales / strategy / HR-legal / SEO / research vocabulary |
| 2 | `GET /repos/{owner}/{repo}` | authoritative `stargazers_count`, `license.spdx_id`, `pushed_at`, `open_issues_count` |
| 3 | `GET /repos/{owner}/{repo}/git/trees/{default_branch}?recursive=1` | real file inventory; every "contains X skill" claim below is a path in this tree |
| 4 | keyword filter on tree paths | `prd\|market\|business\|startup\|strategy\|financ\|account\|sales\|growth\|product\|lead\|customer\|pricing\|deck\|research\|compet\|swot\|hr\|legal\|operat\|econom\|invest\|plan` |

Search queries that actually returned the MBA band (the rest were drowned by general repos): `"market analysis" agent skill`, `"product requirements document" agent skill`, `"entrepreneurship" OR "startup" agent skills`, `"competitive analysis" AI agent`, `"pitch deck" OR "business plan" agent skill`, `"financial model" OR "valuation" agent skill`, `"financial" OR "xlsx" OR "spreadsheet" finance skill claude agent`, `"agent skills" in:name business`, `everything-claude`, `agentfactory`, `user:brainbytes-dev`, `user:panaversity`.

**Reproduce:**
```powershell
pwsh -File scripts/refresh-stars.ps1 -Topics "agent-skills","claude-skills","mba","business-analysis"
# then per-repo verification:
gh api repos/{owner}/{repo} --jq '{stars:.stargazers_count,license:.license.spdx_id,pushed:.pushed_at}'
```

**Caveats on the method (read before using the ranking):**
- GitHub search relevance is popularity-biased: `q="market analysis" agent skill` returned only **38** repos total, so the MBA niche is genuinely small, not under-searched.
- `get-zeked/perplexity-super-skills` (373★, claims finance/legal/PM/sales/ops coverage) has **no `SKILL.md` or `.md` files in its tree** — content is not in the repo. **Excluded** from the top 20 as unverified-substance, despite 373★.
- Star counts are a 2026-10-24 snapshot and move; `pushed_at` is recorded per row so a stale pack can be spotted.
- Install counts (skills.sh) were **not** fetched in this scan → no install-based ranking here. Only star counts.

---

## 3. Table A — Top 20 by GitHub stars (MBA-domain repos)

Stars = `stargazers_count` from `GET /repos/{owner}/{repo}`, 2026-10-24 ~13:35–14:05Z. "MBA surface" = the business-relevant file inventory actually observed in the tree.

| # | Repo | Stars | License | Pushed | MBA surface (file-verified) | MBA course it maps to |
|---|------|------:|---------|--------|---------------------------|--------------------------|
| 1 | `msitarzewski/agency-agents` | 163,627 | MIT | 2026-10-19 | 329 `.md` agent files by domain: `marketing/` **37** (growth-hacker, reddit-community-builder, pr-communications-manager, cross-border-ecommerce…), `sales/` **10** (account-strategist, deal-strategist, proposal-strategist, pipeline-analyst, outbound-strategist), `product/` **6** (product-manager, product-trend-researcher, feedback-synthesizer, sprint-prioritizer), `finance/` **5** (bookkeeper-controller, financial-analyst, fpa-analyst, investment-researcher, tax-strategist), `strategy/` **13** — incl. a **7-phase lifecycle playbook** `phase-0-discovery` → `phase-1-strategy` → `phase-2-foundation` → `phase-3-build` → `phase-4-hardening` → `phase-5-launch` → `phase-6-operate`, plus `runbooks/scenario-startup-mvp.md` | Organizational Behavior, Strategy, Corporate Finance, Marketing, Sales, Operations |
| 2 | `hugohe3/ppt-master` | 67,241 | MIT | 2026-10-24 | Topic/document → native `.pptx` with native shapes, transitions, data-backed charts, speaker-note narration, template support | Managerial Communication / pitch deck |
| 3 | `mvanhorn/last30days-skill` | 65,256 | MIT | 2026-10-23 | Grounded topic research across Reddit, X, YouTube, HN, Polymarket + web → synthesized summary | Market Intelligence / Business Research Methods |
| 4 | `coreyhaines31/marketingskills` | 56,320 | MIT | 2026-10-22 | 417 `.md`; `customer-research`, `competitor-profiling`, `competitors`, `marketing-council` (advisor personas: Hormozi, Ogilvy, April Dunford, Eugene Schwartz, Byron Sharp…), `lead-magnets`, `attribution`, `co-marketing`, `content-strategy` | Marketing Management, Consumer Behavior |
| 5 | `wshobson/agents` | 41,627 | MIT | 2026-10-24 | Plugin marketplace; `business-analytics` (data-storytelling, kpi-dashboard-design), `customer-sales-automation` (sales-automator), `content-marketing`, `hr-legal-compliance` (hr-pro, legal-advisor, employment-contract-templates, gdpr-data-handling) | Business Analytics, HR, Legal |
| 6 | `anthropics/knowledge-work-plugins` | 32,515 | Apache-2.0 | 2026-10-24 | 1,173 `.md`; role plugins for sales / marketing / finance / legal / product-management / data, each with MCP connectors (HubSpot, Snowflake, BigQuery, Ahrefs, Klaviyo, Intercom, Jira) | Sales & Marketing Ops, Finance, PM |
| 7 | `alirezarezvani/claude-skills` | 28,629 | MIT | 2026-10-23 | 2,869 `.md`; `prd/SKILL.md`, `cs-product-strategist`, `cs-product-analyst`, `cs-product-manager`, `cs-financial-analyst`, `finance-lead`, `financial-health`, `competitive-matrix`, `cs-growth-strategist`, `operator-audit`, `startup-cto`, `sprint-plan` | **The broadest single-repo MBA coverage** |
| 8 | `KKKKhazix/khazix-skills` | 21,620 | MIT | 2026-10-01 | Only 6 skills total: `leader` (goal/leader definition), `hv-analysis`, `neat-freak`, `aihot`, `storage-analyzer`, `khazix-writer`. **Method depth is low** — star count comes from popularity, not MBA content. | Leadership framing only |
| 9 | `AgriciDaniel/claude-seo` | 20,019 | MIT | 2026-10-22 | 26 sub-skills + 19 sub-agents: technical SEO, E-E-A-T, schema, GEO/AEO, agent-readiness (Lighthouse Agentic Browsing, WebMCP, llms.txt), backlinks, local/e-commerce/i18n SEO, Google APIs, PDF/Excel reporting | Digital Marketing, Marketing Analytics |
| 10 | `zubair-trabzada/geo-seo-claude` | 11,218 | MIT | 2026-10-24 | GEO-first SEO skill: citability scoring, AI-crawler analysis, brand authority, schema markup, PDF reports | Digital Marketing |
| 11 | `genspark-ai/genoffice` | 10,708 | Apache-2.0 | 2026-10-24 | AI Office suite + `genoffice` CLI **and agent skill** to create/edit real `.docx`/`.xlsx`/`.pptx` locally | Deliverable layer for every MBA assignment (models, decks, memos) |
| 12 | `AgriciDaniel/claude-ads` | 10,374 | MIT | 2026-10-17 | Paid-media ops across 12 ad platforms (Google, Meta, YouTube, LinkedIn, TikTok, Amazon, Reddit, X…): source-grounded audits, deterministic findings, versioned JSON reports, capability-gated account changes | Marketing Management / advertising |
| 13 | `sergebulaev/linkedin-skills` | 5,130 | MIT | 2026-10-22 | 12 skills: LinkedIn posts, comment craft, feed analysis, publishing cadence | Personal-brand / B2B marketing |
| 14 | `zubair-trabzada/ai-sales-team-claude` | 1,464 | MIT | 2026-03-27 | 14 skills + 5 parallel agents: research, qualify (BANT + MEDDIC), decision-maker finding, outreach sequences, meeting prep, proposals, PDF pipeline reports | Sales Management (and the only complete B2B sales reference impl) |
| 15 | `agiprolabs/claude-trading-skills` | 437 | MIT | 2026-09-03 | 68 skills: `strategy-framework`, `options-pricing`, `market-microstructure`, `prediction-market-strategy` (+ evidence & literature refs, sizing/edge gates), `regime-detection`, `cost-basis-engine` | Finance: derivatives, quant, trading |
| 16 | `ahacker-1/cre-agent-skills` | 121 | Apache-2.0 | 2026-09-02 | 417 `.md`; CRE plugins: underwriting calc, `market-study`, `annual-operating-budget-builder`, term-sheet comparator, lender criteria, legal checklist, loan-doc-reviewer, PSA/title review | Corporate Finance, Real Estate Finance |
| 17 | `zubair-trabzada/ai-finance-claude` | 82 | NOASSERTION | 2026-05-12 | 14 skills + 5 agents: cash flow, net worth, debt, FIRE, retirement, tax, portfolio, budget, PDF financial plan (personal-finance lens, not corporate) | Personal Finance |
| 18 | `dlkakbs/hermes-startup-architect` | 42 | — | 2026-05-19 | **The most literal match to the request.** One skill → 8 assets: `market_analysis`, `competitor_map`, `business_model`, `product_spec`, `product_roadmap`, `investor_pitch`, `pitch_deck` (+ Tailwind landing page) | Entrepreneurship, New Venture Management |
| 19 | `fleixweb/superleads` | 39 | NOASSERTION | 2026-08-25 | 外贸/B2B lead-gen + 出海 market analysis pack: bulk customer development, single-account background checks, product-market fit intake — with explicit "no fabricated customers / cite-and-flag-unverified" policy + an eval suite that tests for fabrication | Business Development, Market Research |
| 20 | `panaversity/agentfactory-business-plugins` | 36 | Apache-2.0 | 2026-03-26 | 542 `.md`; banking (`basel-rwa-market`), `hr-operations` (jd / match / knowledge / offboard / reference, with jurisdiction rules), legal-ops, sales — each with iteration workspaces + negative cases | Banking, HRM, Legal Ops |

**Catalogs / indexes to mine (excluded from the ranking — they are not skill packs):** `Shubhamsaboo/awesome-llm-apps` 142,897★ · `sickn33/agentic-awesome-skills` 48,431★ (2,750+ skills) · `VoltAgent/awesome-agent-skills` 36,276★ · `ComposioHQ/awesome-claude-skills` 77,803★ · `hesreallyhim/awesome-claude-code` 56,402★.

---

## 4. Table B — Vertical radar (the answer a course actually needs)

Same repos, but organized by the MBA discipline, with the low-star specialists surfaced — because in this niche the best asset is rarely the top-starred one.

### 4.1 Market analysis / market sizing / competitive intelligence
| Repo | Stars | Evidence | Note |
|------|------:|----------|------|
| `mvanhorn/last30days-skill` | 65,256 | multi-platform signal collection → grounded summary | Best *signal* layer; not a sizing method |
| `coreyhaines31/marketingskills` | 56,320 | `customer-research` (+interview/survey guides), `competitor-profiling`, `competitors` | Best customer-side primary research |
| `fleixweb/superleads` | 39 | product-market intake, buyer research, source-labelled output + fabrication evals | Best *anti-hallucination* discipline for market work |
| `dlkakbs/hermes-startup-architect` | 42 | `market_analysis` + `competitor_map` assets | Best end-to-end startup market work |
| `DaizeDong/market-intel` | 4 | 15-domain triage, auto-configures MCP sources, adversarial-verify refresh pipeline, citation guardrails | Best *method* — tiny repo, mature design |
| `kings0527/structflow` | 6 | L0–L7 layered market analysis, hard validation gates, structured data channel (CFTC COT, FRED, SEC 13F, EIA, DBnomics) | Best evidence-discipline for quantitative market work |
| `147356/agent-skill-industry-research` | 4 | autonomous industry research → professional `.docx` with market sizing, competitive analysis, investment recommendations | Best *deliverable* for an industry report |
| `dotanminh/fnb-competitive-analysis` | 10 | Porter's Five Forces + SWOT + perceptual map + 3-tier strategy, sector-specialised (VN F&B) | Best framework-baked competitor skill |
| `Saramusk/brand-competitive-strategy-skill` | 17 | competitor scoring, positioning maps, HTML report + Excel workbook | Best reporting output |
| `interskh/product-teardown-skill` | 1 | structured teardown of a competitor from homepage + demo/review video | Cheap, useful |
| `romankurnovskii/awesome-founder-skills` | 0 | index: verify idea → tear down competitors → size market → price → launch → raise | Index of the founder workflow |

### 4.2 PRD / product management
| Repo | Stars | Evidence | Note |
|------|------:|----------|------|
| `alirezarezvani/claude-skills` | 28,629 | `prd/SKILL.md` + `cs-product-strategist` / `cs-product-manager` / `cs-product-analyst` / `cs-ux-researcher` / `sprint-plan` | **Only high-star repo with a real PRD skill file** |
| `anthropics/knowledge-work-plugins` | 32,515 | product-management plugin (Jira connector) | PM workflow with a live system |
| `msitarzewski/agency-agents` | 163,627 | `examples/workflow-startup-mvp.md`; full agent roster | MVP workflow as an example, not a PRD skill |
| `wiveu/prd-skill-agent` | 1 | interview-driven PRD generation | Best *interaction* pattern (asks before writing) |
| `midcurvelabs/prd-vibe` | 1 | idea → single-file HTML PRD | Best *output* pattern |
| `springhalu0319/prd-writer-skill` | 4 | generic PRD generator | Highest-star pure PRD skill, but generic |
| `dlkakbs/hermes-startup-architect` | 42 | `product_spec` + `product_roadmap` assets | Startup-flavored spec, not enterprise PRD |
| `brianmc/AI-Product-Team` | 1 | agentic PM team (agents, not skills) | Reference architecture only |

### 4.3 Entrepreneurship / startup kit
| Repo | Stars | Evidence | Note |
|------|------:|----------|------|
| `dlkakbs/hermes-startup-architect` | 42 | 8-asset forge kit: business model, market analysis, competitor map, product spec, roadmap, investor pitch, pitch deck, landing page | **Best single-repo entrepreneurship answer** |
| `msitarzewski/agency-agents` | 163,627 | `strategy/playbooks/phase-0-discovery` … `phase-6-operate` (7-phase build→launch→operate lifecycle) + `strategy/runbooks/scenario-startup-mvp.md` + `examples/workflow-startup-mvp.md` | **Closest thing upstream to an entrepreneurship operating model** — discovery → strategy → build → launch → operate |
| `alirezarezvani/claude-skills` | 28,629 | `startup-cto` persona, `cs-growth-strategist`, `competitive-matrix` | C-suite advisory layer |
| `panaversity/agentfactory-business-plugins` | 36 | banking / legal-ops / HR / sales plugins for a running business | Post-launch operations rather than ideation |
| `romankurnovskii/awesome-founder-skills` | 0 | founder-workflow index | Use as a checklist source |
| `M-MMahmood/business-frameworks-agent-skills` | 0 | 26 canonical frameworks | Use as the method spine |

### 4.4 Finance / accounting / valuation
| Repo | Stars | Evidence | Note |
|------|------:|----------|------|
| `brainbytes-dev/everything-claude-finance` | 6 | `investment-banking/dcf-valuation`, `lbo-modeling`, `comparable-analysis`, `precedent-transactions`, `pitch-book-creation`, `deal-structuring`; `equity-research/earnings-models` + `sector-analysis`; accounting (GAAP, IFRS, HGB, revenue recognition, lease accounting, consolidation, deferred taxes); econ (econometrics, monetary policy, trade); commands `financial-model`, `investment-memo`, `tax-planning`, `scenario-plan`; agents `investment-banker`, `equity-researcher`, `macro-economist`, `accounting-specialist` | **The most complete MBA-finance skill pack on GitHub — at 6 stars.** Highest priority adopt. |
| `ahacker-1/cre-agent-skills` | 121 | CRE underwriting calc, term sheets, lender criteria, market study, legal checklist, AOB builder | Best *applied* finance (real estate vertical) |
| `agiprolabs/claude-trading-skills` | 437 | 68 skills: options pricing, microstructure, prediction markets, regime detection, cost basis | Best quant/derivatives depth |
| `brainbytes-dev/everything-claude-trading` | 24 | 18 agents / 82 skills / 20 commands trading system | Companion to the finance pack |
| `msitarzewski/agency-agents` | 163,627 | `finance/` × 5 roles (bookkeeper-controller, financial-analyst, fpa-analyst, investment-researcher, tax-strategist) | Role-playing layer over finance |
| `zubair-trabzada/ai-finance-claude` | 82 | 14 personal-finance skills (FIRE, net worth, tax, portfolio) | Personal-finance only |
| `appeeky/stripe-skills` | 5 | revenue analytics, forecasting, customer intelligence, finance/tax, usage-based billing | SaaS metrics layer |

### 4.5 Strategy frameworks / consulting method (the MBA "theory" layer)
| Repo | Stars | Evidence | Note |
|------|------:|----------|------|
| `M-MMahmood/business-frameworks-agent-skills` | 0 | 26 frameworks in 5 syllabus blocks: 3C, PESTEL, Porter's Five Forces + generic strategies, scenario planning, SWOT, VRIO, Ansoff, BCG growth-share, Blue Ocean, GE/McKinsey 9-box, Three Horizons, Business Model Canvas, Lean Canvas, profitability framework, value chain, Balanced Scorecard, Kotter 8, McKinsey 7S, OKRs, Pyramid Principle, SMART goals, 4Ps, customer journey, NPS, STP | **This repo *is* an MBA strategy syllabus.** Lowest star count, highest syllabus fidelity. |
| `alirezarezvani/claude-skills` | 28,629 | `competitive-matrix`, `operator-audit`, C-level personas, `audit/newgen-2026-06/bizops-commercial-finance.md` | Applied strategy at scale |
| `coreyhaines31/marketingskills` | 56,320 | `marketing-council` with named advisor personas | Strategy-through-persona pattern |
| `dotanminh/fnb-competitive-analysis` | 10 | Porter/SWOT baked into a runnable skill | Frameworks + execution |
| `brainbytes-dev/everything-claude-finance` | 6 | `fpa/scenario-planning`, `audit` docs | Scenario planning for finance |

### 4.6 Sales / GTM / HR / Legal / Ops (the "business operations" layer)
| Repo | Stars | Evidence | Note |
|------|------:|----------|------|
| `anthropics/knowledge-work-plugins` | 32,515 | sales plugin with HubSpot/Close/Clay/ZoomInfo/Fireflies connectors; marketing plugin with Ahrefs/SimilarWeb/Klaviyo/Canva; finance + legal plugins | Best *connected* operations layer |
| `msitarzewski/agency-agents` | 163,627 | 37 marketing + 10 sales + 6 product + 5 finance + 13 strategy agent files; 7-phase startup lifecycle playbooks | Breadth champion — and the only upstream *entrepreneurship lifecycle* |
| `wshobson/agents` | 41,627 | `customer-sales-automation`, `business-analytics`, `hr-legal-compliance` plugins | Analytics + compliance |
| `joaoguirunas/team-os` | 5 | 111 agents / 124 skills across 15 squads incl. Finance (8 roles), Legal (7), Sales (8), PM, Brand | Best *org-chart-shaped* ops pack |
| `adatarwa/operator-skills` | 4 | 11 installable skills: sales, finance, hr, legal, marketing, operations, product, customer-success, support | Compact operator pack |
| `zubair-trabzada/ai-sales-team-claude` | 1,464 | 14 sales skills, 5 agents, BANT + MEDDIC, PDF pipeline reports | Best sales *method* implementation |
| `panaversity/agentfactory-business-plugins` | 36 | HR ops with jurisdiction rules + negative test cases | Best HR *rigor* |
| `get-zeked/perplexity-super-skills` | 373 | claims finance/legal/PM/sales/ops coverage — **repo contains no `.md`/SKILL.md; unverified, excluded** | Do not adopt without inspecting the source |

---

## 5. Gaps and white space (unmet by every repo in the scan)

| Gap | Evidence | Build-vs-copy verdict |
|---|---|---|
| **No end-to-end MBA case pipeline**: market sizing → business model → unit economics → financial model → PRD → deck | No repo chains all seven stages. `hermes-startup-architect` covers market/competitor/pitch but has no DCF/LBO; `everything-claude-finance` has DCF/LBO but no market research or PRD | **Build.** This is the vault's highest-value gap. Combine: `hermes-startup-architect` stage 1–2 + `everything-claude-finance` stage 3–4 + `prd` skill stage 5 + `ppt-master` stage 6 |
| **PRD has no high-star owner** | Highest pure PRD skill = 4★; the only 28k★ PRD file is one `.gemini/skills/prd/SKILL.md` buried in a 380-skill repo | **Build a dedicated PRD skill** rather than copying; interview-driven (from `wiveu`, 1★) + single-file HTML output (from `midcurvelabs`, 1★) are the two patterns worth keeping |
| **Market sizing with a defensible number is unsolved** | `structflow` (6★) has data-channel rigor; `market-intel` (4★) has source discipline; nothing has a TAM/SAM/SOM arithmetic contract | **Build.** The vault already has truth-seeking research discipline; the missing piece is a fixed sizing method with source tiers |
| **Strategy frameworks are not executable** | `business-frameworks-agent-skills` (0★) is 26 markdown explanations — a textbook, not a procedure with inputs/outputs/validation | **Copy as reference; rewrite as executable skills.** The vault's `governance-doc-design` + `codebase-design` patterns show how to turn a document into a procedure |
| **Competitive analysis lacks live data** | Every competitor skill relies on the agent's own web access; `Ryze-AI-Adgent/open-seo-mcp-skills` (6,970★, re-verified this session via `GET /repos/`) is the only pack that ships an MCP for live SERP/market signals | **Reuse the MCP pattern** rather than re-inventing live-data plumbing |
| **No founder-to-fundraise lifecycle skill** | `awesome-founder-skills` (0★) is only an index; no repo covers idea validation → pricing → launch → raise end-to-end | **Build**, using `hermes-startup-architect` as the artifact schema |

---

## 6. `[判断与建议]` — what this vault should do

**Judgment (not fact):** the star ranking in §3 answers the literal question; it does **not** answer "which skills should I install". For an MBA/business curriculum the install order should be:

1. `alirezarezvani/claude-skills` → extract `prd`, `cs-financial-analyst`, `cs-product-strategist`, `competitive-matrix`, `finance-lead`, `cs-growth-strategist`. (MIT — safe to vendor.)
2. `brainbytes-dev/everything-claude-finance` → extract the `investment-banking/*`, `accounting/*`, `equity-research/*` skills. (MIT.)
3. `coreyhaines31/marketingskills` → extract `customer-research`, `competitor-profiling`, `marketing-council` (persona pattern only — do not vendor the personas wholesale).
4. `dlkakbs/hermes-startup-architect` → use as the **artifact schema** for a locally-authored `mba-venture-kit` skill (market analysis, competitor map, business model, unit economics, spec, roadmap, pitch, deck). No license file detected → **re-implement from the described artifact list, do not copy.**
5. `M-MMahmood/business-frameworks-agent-skills` → re-express 26 frameworks as the vault's `management/` domain skills (the vault already has `mgmt-discipline`, `mgmt-individual`, `mgmt-org` — this is the missing *strategy frameworks* layer, and those three skills' structure is the model to follow).
6. `DaizeDong/market-intel` + `kings0527/structflow` → harvest the **evidence-discipline patterns** (source tiers, validation gates, adversarial verify) into the vault's existing truth-seeking rules rather than as new skills.

**Anti-pattern to avoid:** vendoring 20 packs wholesale. The FDE scan already showed stars ≠ installs, and this scan shows stars ≠ method density in the MBA niche (6★ DCF/LBO pack vs 163k★ roster with no financial model). Rank by *file-verified method*, count by *stars*, and never adopt a pack whose license is `NOASSERTION` or absent.

**Also worth knowing:** `wshobson/agents` (41,627★) and `msitarzewski/agency-agents` (163,627★) are *rosters* — 795 and 329 markdown agent definitions respectively. They are excellent **persona references** for writing the vault's own C-suite advisor skills (`god-leader-advisor`, `renzhengfei-advisor`, `zhangyiming-advisor` already exist in the vault), but shipping them adds tokens without adding capability.

---

## 7. Sources and confidence

| # | Source | Grade | What it supports |
|---|--------|-------|-----------------|
| 1 | `GET /repos/{owner}/{repo}` (GitHub REST v3), 2026-10-24 13:30–14:10Z, auth token `gho_` (scope: repo) | 1 — primary | Every star count, license, `pushed_at`, open-issue count in §3 |
| 2 | `GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1` | 1 — primary | Every "contains skill X" claim; file counts |
| 3 | `GET /search/repositories?q=…&sort=stars` | 1 — primary | Candidate recall; `total_count` figures in §2 |
| 4 | Repo README/description text as fetched from the API `description` field | 3 — self-reported | Framing claims by authors (e.g. "complete finance system") — treated as claims, checked against trees |
| 5 | `2026-10-24-top-20-agent-skills-for-fde-prototyping.md` (same vault, same day) | 1 — internal primary | Cross-repo star counts (`anthropics/knowledge-work-plugins` 32,515 vs 32,512 in the FDE scan — 3★ drift inside ~2h; treat counts as ±0.01%) |
| 6 | skills.sh install counts | — | **Not fetched in this scan.** No install-based ranking here. |

**Known uncertainty:** all star numbers are a same-day snapshot; a repo can move thousands of stars within hours. `pushed_at` dates show several mid-rank packs last touched in March–May 2026 (`ai-sales-team-claude` 2026-03-27, `hermes-startup-architect` 2026-05-19, `agentfactory-business-plugins` 2026-03-26, `ai-finance-claude` 2026-05-12) — treat these as **stale-priority adopt candidates**, i.e. cheap to vendor, but expect upstream drift.

---

> **免责声明：** 本输出由 AI 辅助生成，仅用于信息整理与研究参考，不构成专业意见或决策依据。
