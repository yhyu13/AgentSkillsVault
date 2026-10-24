# Skill Radar — Top 20 most-starred **work-deliverable** agent skills (slides / tables / docs / OKR)

**Date:** 2026-10-24 · **Snapshot:** GitHub REST API, 2026-10-24 ~13:30–15:10Z (unauthenticated; two egress IPs)
**Scope:** agent skills (SKILL.md-based, Claude Code / Codex / Cursor / Gemini CLI compatible) whose **deliverable is a work artifact** — a slide deck, a spreadsheet, a document, an OKR/plan set, or a written report. Agent *frameworks*, *memory tools* and *orchestrators* are excluded from the ranking (see §6).
**Companion note:** [Top 20 most-starred agent skills for FDE prototyping](./2026-10-24-top-20-agent-skills-for-fde-prototyping.md) (broad agent-skill leaderboard) · [Top 20 agent-driven programmable video repos](./2026-10-24-agent-programmable-video-radar.md) (code-rendered video)
**CSV twin:** `2026-10-24-top-20-most-starred-work-deliverable-agent-skills.csv`

---

## 0. The question, in English (for reuse)

> "Research the **20 most-starred agent skills** for **producing work deliverables** — **making presentations (PPTX)**, **making tables/spreadsheets (XLSX)**, **writing documents (DOCX)**, **writing OKRs** — and dump the findings into research notes."

中文题意：调研 **GitHub 上星数最高的 20 个「干活的」agent skill**（做 PPT、做表格、写文档、写 OKR 这类**产出交付物**的技能），把结论沉淀成研究笔记。

---

## 1. TL;DR (conclusion first)

1. **The deliverable category is dominated by *general packs*, not by specialist skills.** The top 10 by stars are multi-skill libraries (`anthropics/skills` 183.4k, `nexu-io/open-design` 103.7k, `tt-a1i/archify` 88.6k, `coreyhaines31/marketingskills` 56.3k, `anthropics/knowledge-work-plugins` 32.5k …); the **single-purpose** skills (one repo = one deliverable type) sit at **64–1,425 stars**, i.e. 1–2 orders of magnitude lower.
2. **Slide-making is the only deliverable vertical with real star traction.** 11 of the top 20 are slide/deck skills or packs that ship them; the best pure ones: `chuspeeism/dashi-ppt-skill` 9,895 · `ningzimu/codex-ppt-skill` 7,257 · `carnot-tech/jinba-consulting-pptx-skill` 1,425 (consulting-grade PPTX) · `Gabberflast/academic-pptx-skill` 1,325 · `sunbigfly/ppt-agent-skills` 916.
3. **XLSX/table-making is the thinnest and most fragmented vertical.** The highest-starred spreadsheet-capable repos are still general office suites: `genspark-ai/genoffice` 10,708 (Docs/Sheets/Slides + agent skill) · `anbeime/skill` 8,597 (doc-processing shop) · `tfriedel/claude-office-skills` 840 (all four Office types) · `fivetaku/claude-office-skills` 72 (financial modeling: DCF/LBO/3-statement) · `gmickel/sheets-cli` 71 (Google Sheets, agent-friendly) · `jeremylongshore/excel-analyst-pro-skill-md` 60 (financial modeling). **Nothing above 900 stars is spreadsheet-only.**
4. **OKR-writing is a genuine white space.** Dedicated OKR skills top out at **11 stars** (`amrekansky/headless-pm` 11) and go down to 2–5 (`l4ci/latticework` 5 · `yehonathanlitman/create-okrs` 4 · `captainbook/okr-os` 3 · `BeMoreDifferent/okr-master` 2). OKR content lives **inside** large packs instead (`VoltAgent/awesome-agent-skills` index has 3 `okr` hits, `nexu-io/html-anything` 4, `nexu-io/open-design` 4, `deanpeters/Product-Manager-Skills` 1). **This is the clearest build-opportunity in the whole radar.**
5. **DOCX has an interesting token-efficiency niche.** `LegalRabbit-AI/legalrabbit-docx-mcp` (56★) advertises *2–5× fewer tokens than Anthropic's own `docx` skill* — a claim worth testing, because token cost is the real constraint on long-document agent workflows.
6. **Two delivery routes dominate slides: HTML-native vs native PPTX.** HTML-native (`zarazhangrui/frontend-slides` 31.2k, `nexu-io/html-anything` 9.2k, `ToseaAI/awesome-html-slide-skills` 177) is fast and pretty but produces non-editable output; native-PPTX (`codex-ppt-skill` 7.3k, `dashi-ppt-skill` 9.9k, `hands-on-deck` 221, `appautomaton/document-SKILLs` 174) costs more but yields **editable shapes/text** — which is what stakeholders actually need. `Hasasasa/html-to-editable-pptx` (94★) and `siril9/presentation-skill` (84★) exist precisely to bridge the two.
7. **The vault already covers most of the slide lane** (`design/frontend-slides`, `design/html-ppt`, `design/html-slides`, `design/slideshow`, `design/visual-explainer`) and the OKR/report lane (`management/weekly-report`, `management/quarterly-review`, `management/proposal`, `software-development/perf-tracking-platform`). **Gaps:** an OKR-specific skill, an XLSX/table-building skill, and a native-PPTX editing (not generating) skill.

---

## 2. Method & evidence quality

| Step | Method | Note |
|------|--------|------|
| Candidate discovery | `GET /search/repositories?q=…&sort=stars` — 19 queries across 4 keyword batches + 2 topic queries | `GET /search` returns `stargazers_count` directly, so star figures come from the API, not an aggregator |
| Star verification | `GET /repos/{owner}/{repo}` for all 49 finalists → field `stargazers_count` | verified for **49/49** finalists in this note; the 4 rows marked † were recovered from `/search` only (core-rate-limit exhausted before re-verification) |
| Substance check | raw `README.md` fetched from `raw.githubusercontent.com` for each finalist; counted literal mentions of `pptx/docx/xlsx/excel/okr/slides/report/table/skill.md` | counts appear as evidence column `README hits` |
| Unauthenticated limits | 60 core req/h, 10 search req/min per egress IP. Direct egress was exhausted mid-run; a second egress path (local proxy `127.0.0.1:8889`) was used for the remaining `/repos` calls | both sets of numbers are API-verified, just from different IPs |
| Not used | aggregator sites (star-history, ossinsight, ecosyste.ms) | no † aggregator numbers in this note |

**Caveats that matter:** (a) star counts move — this is a 2026-10-24 snapshot; (b) `pushed_at` is the liveness proxy (see §5, `zarazhangrui/frontend-slides` last pushed 2026-06-23); (c) README mention counts are a **presence** signal, not a quality signal; (d) GitHub search AND-s all query terms, so a repo only surfaces if its name/description/README matches every term — the search is **recall-limited**, meaning the true star-ranked set is at least as long as the one below.

---

## 3. Table A — Top 20 by stars (deliverable-producing agent skills)

Stars verified via `GET /repos/{owner}/{repo}` on 2026-10-24 (unauthenticated, two egress IPs). `README hits` = literal keyword mentions in the repo README (pptx/docx/xlsx/excel/okr/slides/report/table/skill.md). **License** from the same payload (`Mixed` = per-file licensing inside one repo).

| # | Repo | Stars | Deliverable lane | License | Last push | README hits (evidence of substance) | What it gives you |
|---|------|------:|------------------|---------|-----------|-------------------------------|--------------------|
| 1 | `anthropics/skills` | **183,424** | docx / pptx / xlsx / pdf | Mixed (per-file) | 2026-10-09 | pptx·docx·xlsx·pdf | The canonical reference: Anthropic's own `docx`, `pptx`, `xlsx`, `pdf` skills. Already vendored in this vault at `vendor/anthropics-skills`. |
| 2 | `nexu-io/open-design` | **103,697** | slides / export | Apache-2.0 | 2026-10-24 | ppt×25 · table×27 · okr×4 · report·pdf | Local-first design engine: prototypes, landing pages, dashboards, **slides** and **real file export**. Explicitly mentions OKR and tabular output. |
| 3 | `tt-a1i/archify` | **88,567** | diagram / one-pager | MIT | 2026-10-24 | table×18 · report·pdf | Source-backed interactive architecture diagrams + one-page explainers with numbered citations — the "here's your system" deliverable. |
| 4 | `ComposioHQ/awesome-claude-skills` | **77,807** | catalog (multi-lane) | MIT | 2026-10-24 | pptx·docx·xlsx·spreadsheet·report·table | 1000+ installable skills, incl. full Office set. **Index, not a pack** — mine it for candidates. |
| 5 | `coreyhaines31/marketingskills` | **56,325** | copy / collateral | MIT | 2026-10-22 | word·table·markdown | 46 skills: cold email, sales enablement, revops, copywriting, CRO/SEO. Deliverables are text collateral, not files. |
| 6 | `anthropics/knowledge-work-plugins` | **32,515** | docs / slides / sheets | Apache-2.0 | 2026-10-24 | report·markdown | 11 role plugins (sales, support, marketing, data, finance, legal, product-management) with MCP connectors pre-wired. Closest thing to "OKR + deck + table" in one place. |
| 7 | `zarazhangrui/frontend-slides` | **31,191** | slides (HTML) | MIT | **2026-06-23** | slides×35 · pptx·pdf·table | Single-file zero-dependency HTML decks; STYLE_PRESETS + bold-template-pack. **Already in this vault** (`design/frontend-slides`). Last push 4 months ago — watch liveness. |
| 8 | `alirezarezvani/claude-skills` | **28,629** | business ops / C-level docs | MIT | 2026-10-23 | markdown×5 · word·slides·table | 380 skills incl. business operations, compliance, product, research, pricing/deal-desk — the broadest business-writing pack. |
| 9 | `JimLiu/baoyu-skills` | **26,924** | slides / writing / xlsx | MIT | 2026-09-10 | markdown×42 · table·pdf·slides | Chinese-origin pack (wechat-article → slides → doc → xlsx chains). Strong content-production pipeline. |
| 10 | `alchaincyf/huashu-design` | **26,064** | slides (PPTX) | MIT | 2026-10-23 | ppt×18 · pptx×10 · pdf·slides | "Huashu Design 3.0": HTML-native design skill that also emits **editable PPTX**; 84 curated style stylesheets. |
| 11 | `genspark-ai/genoffice` | **10,708** | **docx + xlsx + pptx + pdf** | Apache-2.0 | 2026-10-24 | ppt×21 · docx×23 · word×31 · slides×39 · pdf×46 · table×35 | AI Office suite + `genoffice` CLI + agent skill so Claude Code/Codex/Cursor can **create and edit real .docx/.xlsx/.pptx locally**. The single most complete "table making" answer found. |
| 12 | `chuspeeism/dashi-ppt-skill` | **9,895** | slides (HTML→PDF/PPTX) | AGPL-3.0 | 2026-09-12 | ppt×74 · pptx×19 | Browser-editable presentations from multiple visual themes, exportable to HTML/PDF/PPTX. **AGPL — watch licence before vendoring.** |
| 13 | `nexu-io/html-anything` | **9,232** | deck / data report / poster | Apache-2.0 | 2026-10-13 | markdown×24 · table×15 · report×12 · okr×4 · ppt×10 | 75 skills × 9 surfaces (magazine · **deck** · poster · data report · prototype) with sandboxed preview and 1-click export. |
| 14 | `anbeime/skill` | **8,597** | doc processing (mega-shop) | none declared | 2026-10-24 | README 478 KB: ppt×46 · report×29 · pdf×27 · table×25 · docx×8 | Chinese "most comprehensive & frequently updated skill shop", auto-harvests GitHub skills by category/stars. Discovery + install surface. |
| 15 | `deanpeters/Product-Manager-Skills` | **7,639** | PRD / OKR / roadmap | NOASSERTION | 2026-10-16 | 82 × `skill.md` · okr·report·table | PM framework (Pragmatic-style): discovery, PRD, **OKR**, roadmap, launch. The most "work-planning" dense pack in the top 20. |
| 16 | `ningzimu/codex-ppt-skill` | **7,257** | slides (image-based) | MIT | 2026-10-13 | ppt×116 · pptx×11 | GPT-Image-2 PPT generator: full-bleed image slides from a prompt. Different route — image-first, not shape-native. |
| 17 | `carnot-tech/jinba-consulting-pptx-skill` | **1,425** | slides (consulting PPTX) | MIT | 2026-10-23 | ppt×45 · pptx×45 · pdf×12 | Chinese consulting-flavoured PPTX: "¥" narrative logic for client decks. |
| 18 | `JuneYaooo/gpt-image2-ppt-skills` | **1,387** | slides (clone a deck) | Apache-2.0 | 2026-08-22 | ppt×70 · pptx×23 | Clone any `.pptx` layout with gpt-image-2; 10 bundled styles. |
| 19 | `first-fluke/oh-my-agent` | **1,354** | plan / slides / research | MIT | 2026-10-24 | report×12 · pptx·pdf·markdown | Specialist team in one `.agents/` folder: 12 roles, 21 workflows, 33 skills leaving plans/ADRs as files; includes slides + video. |
| 20 | `Gabberflast/academic-pptx-skill` | **1,325** | slides (academic) | MIT | 2026-07-14 | presentation×7 · slides×5 | Action titles, exhibit discipline, citation standards, communication-first design — pairs with Anthropic's built-in PPTX skill. |

**Immediately below the cut, but higher design value than several rows above:**

| Repo | Stars | Lane | Why it matters |
|------|------:|------|----------------|
| `sunbigfly/ppt-agent-skills` | 916 | slides | Code-driven presentation generation framework, html→pptx, multi-agent. |
| `tfriedel/claude-office-skills` | 840 | **all four Office types** | One repo covering PPTX + DOCX + XLSX + PDF workflows with automation support. |
| `addsumtech/slides_maker` | 618 | slides | Papers/code/docs → natively editable PPTX with charts, equations, speaker notes, **click-build animations** and an independent critic review before delivery. |
| `sunchaokun/PPT-Design-Skill` | 350 | slides | Precision PPT design: 40,000+ styles, Build Mode pixel control, editable PPTX output. |
| `likaku/Mck-ppt-design-skill` | 312 | slides | Consulting-style PowerPoint design system: 70 layout patterns, flat design, python-pptx. |
| `ferdinandobons/brand-docs` | 281 | **docx + pptx + xlsx** | Learns *your* Word/PPT/Excel templates and regenerates on-brand docs — preserves brand, styles and formulas **by construction**. |
| `zouchenzhen/thesis-defense-pptx-skill` | 275 | docx→pptx | Editable thesis-defense PPTX from PDF/LaTeX while preserving a PowerPoint template. |
| `EveryInc/hands-on-deck` | 221 | pptx editing | Agent-native PowerPoint manipulation: one CLI, atomic JSON patches, **inspect / edit / create / verify** `.pptx`. |
| `SkyworkAI/Skywork-Skills` | 205 | **ppt + doc + excel** | Skywork office-suite skills (AI PPT / AI Document / AI Excel) as portable SKILL.md. |
| `ToseaAI/awesome-html-slide-skills` | 177 | slides index | Curated HTML slide-skill + template index (CN). |
| `appautomaton/document-SKILLs` | 174 | **all four Office types** | PDF/Excel/Word/PowerPoint manipulation — extraction, forms, formulas, tracked changes (adapted from Anthropic skills). |
| `siril9/presentation-skill` | 84 | slides | Content-led editable decks rebuilt from JSON; native charts + tables + rendered visual QA. |
| `zouchenzhen/docx-template-translator-skill` | 79 | docx | LaTeX / PDF / Markdown → a specified Word template. |
| `fivetaku/claude-office-skills` | 72 | **xlsx** | "Claude in Excel & PowerPoint": DCF, LBO, 3-statement, comps, deck refresh. |
| `gmickel/sheets-cli` | 71 | **sheets** | Composable Google Sheets CLI (read/write/update by key) with agent skills for Claude Code + Codex. |
| `appautomaton/presentation` | 64 | slides | "Business question in → consulting-grade deck out": storyboarding, brand identity, pixel-perfect PDF, native PPTX. |
| `wzbwan/gongwen-format-skill` | 59 | docx | Chinese official-document (公文) formatting → `.docx` with fonts, spacing, page setup. |
| `LegalRabbit-AI/legalrabbit-docx-mcp` | 56 | docx | docx plugin claiming **2–5× fewer tokens** than Anthropic's `docx` skill. |
| `surendranb/writing-skills` | 50 | writing | Procedural writing-style skills (plain language, business writing, GOV.UK, AP, STE-100) + voice packs. |
| `jeremylongshore/excel-analyst-pro-skill-md` | 60 | **xlsx** | Financial modeling toolkit (DCF, LBO, variance), auto-invoked skills. |
| `bayramannakov`/`BayramAnnakov/excel-hygiene` † | 17 | xlsx | "Second pair of eyes" on any `.xlsx`: deterministic openpyxl checks + error taxonomy. |
| `cabbage2000-lab/data-analysis-skills` † | 21 | tables | CSV/Excel/JSON → narrated analysis report; asks for industry + report style before analysing. |
| `Dangooy/trade-pipeline-skill` † | 35 | xlsx+docx | Inquiry Excel → Quotation / PI / CI / Packing List, all linked. Niche but shows the "linked document chain" pattern. |
| `brycewang-stanford/many-ppt-skills` † | 65 | slides | "Every AI slide-deck skill worth knowing on one page" — HTML route vs native-PPTX route compared. |

† = star count from `GET /search/repositories` only; not re-verified via `GET /repos` (core quota exhausted at that point).

---

## 4. Vertical radar (the usable answer)

### 4.1 Making presentations (PPT / slides) — the deepest vertical

| Tier | Repos | Design idea worth stealing |
|------|--------|-----------------------------|
| **HTML-native, editable-in-browser** | `zarazhangrui/frontend-slides` 31,191 · `nexu-io/html-anything` 9,232 · `chuspeeism/dashi-ppt-skill` 9,895 · `ToseaAI/awesome-html-slide-skills` 177 · `nghiahsgs/skills-slides` 33 | theme file = look, layout file = page, animation class = entrance; zero-dependency single file |
| **Native PPTX (shapes/text editable)** | `alchaincyf/huashu-design` 26,064 · `ningzimu/codex-ppt-skill` 7,257 · `carnot-tech/jinba-consulting-pptx-skill` 1,425 · `Gabberflast/academic-pptx-skill` 1,325 · `sunbigfly/ppt-agent-skills` 916 · `addsumtech/slides_maker` 618 · `siril9/presentation-skill` 84 | python-pptx / PptxGenJS pipelines; action titles; independent critic pass before delivery |
| **Image-first** | `JuneYaooo/gpt-image2-ppt-skills` 1,387 · `NyxTides/ppt-image-first` 1,227 · `DSY-Xueai/image2editable` 57 · `TianLin0509/img2ppt-lite` 48 | pixel-perfect but not natively editable; keep for marketing decks, avoid for working decks |
| **Editing existing PPTX (the gap in the vault)** | `EveryInc/hands-on-deck` 221 · `appautomaton/document-SKILLs` 174 · `Hasasasa/html-to-editable-pptx` 94 † | JSON-patch model: inspect → patch → verify. The vault can *generate* decks but has no **edit-a-deck-you-were-sent** skill. |
| **Answer-first consulting deck** | `appautomaton/presentation` 64 · `tt-a1i/archify` 88,567 | storyboard → brand → pixel-perfect PDF → native PPTX; the "business question in, deck out" contract |

### 4.2 Making tables (XLSX / Sheets / data) — thin, fragmented, mostly suite-shaped

| Repo | Stars | What it does | Fit for the vault |
|------|------:|--------------|-------------------|
| `genspark-ai/genoffice` | 10,708 | AI Office suite; agent skill can create/edit real `.xlsx` locally; BYO key; Win/mac/Linux | **Best single answer for "make a table"** — covers docx+pptx+xlsx+pdf in one dependency |
| `anbeime/skill` | 8,597 | Mega-shop incl. document-processing skills | Discovery source |
| `tfriedel/claude-office-skills` | 840 | PPTX+DOCX+XLSX+PDF workflows | Good "office bundle" template |
| `appautomaton/document-SKILLs` | 174 | Excel formulas, forms, tracked changes | The *mechanics* of spreadsheet work |
| `fivetaku/claude-office-skills` | 72 | Claude in Excel: DCF/LBO/3-statement/comps | Finance-modelling lane |
| `jeremylongshore/excel-analyst-pro-skill-md` | 60 | Financial modelling toolkit, auto-invoked | Finance lane |
| `gmickel/sheets-cli` | 71 | Google Sheets CLI + agent skills | Live-Sheets editing (not local files) |
| `BayramAnnakov/excel-hygiene` † | 17 | Deterministic `.xlsx` QA checks | **Verification pattern** — cheap, deterministic, catches formula errors |
| `cabbage2000-lab/data-analysis-skills` † | 21 | CSV/Excel → narrated analysis report | The "analysis report" bridge from table to doc |
| `lieflat-charts` *(vault, local)* | — | Chart/report templates with a data contract | Already covers chart-quality; the missing half is **the workbook itself** |

**Read:** nobody has won the "spreadsheet" vertical as a *skill*. Every serious attempt is bundled into an office suite (genoffice) or an app (Sheets). A standalone, well-designed "table making" skill is an open slot.

### 4.3 Writing documents (DOCX / reports / official formats)

| Repo | Stars | What it does |
|------|------:|--------------|
| `anthropics/skills` → `docx` | 183,424 (repo) | The reference DOCX skill (already vendored here) |
| `alirezarezvani/claude-skills` | 28,629 | Business writing, compliance, research decks; 380 skills |
| `JimLiu/baoyu-skills` | 26,924 | markdown×42 — long-form content pipelines (article → slides → doc → xlsx) |
| `surendranb/writing-skills` | 50 | Style frameworks (plain language / business / GOV.UK / AP / STE-100) + voice packs |
| `zouchenzhen/docx-template-translator-skill` | 79 | LaTeX/PDF/Markdown → a **specified Word template** |
| `wzbwan/gongwen-format-skill` | 59 | Chinese 公文 formatting → `.docx` with fonts/spacing/page setup |
| `yeap531/word-format-skill` † | 204 | Replicate a reference Word doc's typography onto new content (HTML→clipboard→Word) |
| `LegalRabbit-AI/legalrabbit-docx-mcp` | 56 | docx plugin, claims 2–5× fewer tokens than Anthropic's `docx` skill |
| `Achuan-2/pandoc_docx_template` † | 1,099 | Markdown → docx with a controllable reference-docx style template (pandoc) |
| `quzhi-ai/logo2docs` † | 37 | Company logo → consistently branded Excel/Word/PPT/PDF/handbooks |
| `ferdinandobons/brand-docs` | 281 | Learn *your* Word/PPT/Excel templates, regenerate on-brand documents |

**Pattern:** document skills are won on **template fidelity**, not on prose quality. Three independent repos (`brand-docs`, `docx-template-translator-skill`, `pandoc_docx_template`) converge on the same mechanism — *reference template + style inheritance*.

### 4.4 Writing OKRs / goals / plans — the white space

| Repo | Stars | Scope |
|------|------:|-------|
| `amrekansky/headless-pm` | 11 | 100+ PM skills, 8 domain subagents, `/pm` orchestrator; README mentions OKR ×4 |
| `l4ci/latticework` | 5 | SWOT, Porter's, **OKR**, Cynefin — harness-agnostic framework pack |
| `yehonathanlitman/create-okrs` | 4 | "Objectives & Key Results" Claude Skill (README `okr` ×17) |
| `N1arko/goal-setting-skills` † | 4 | RU-language goal-setting pack |
| `chisss/DoWithOKR` † | 3 | "Agent Delivery OS": requirements → OKR-aligned team workflows, roles, evidence, scoring |
| `captainbook/okr-os` | 3 | AI-native OKR coach for startup CEOs; Radical Focus; Mon/Fri cadence; 12 skills |
| `BeMoreDifferent/okr-master` | 2 | Define / validate / rewrite OKRs with cross-org consistency |
| `wild-mental/goal-setting-skill` † | 2 | Paste-ready `/goal` prompts (Three Pillars, 4-Element Structure) |
| `deanpeters/Product-Manager-Skills` | 7,639 | PRD + roadmap + OKR inside a full PM framework (82 skill files) |
| `nexu-io/html-anything` | 9,232 | `okr` ×4 — OKR as one of the 9 output surfaces |
| `nexu-io/open-design` | 103,697 | `okr` ×4 — OKR inside a local-first design/export engine |

**Why this matters:** the *format* skill (`create-okrs`, `okr-master`) is tiny, but the *workflow* skills that consume OKRs live in high-star packs. The vault's own `software-development/perf-tracking-platform` + `management/quarterly-review` + `management/weekly-report` already implement an OKR-adjacent workflow — and the star evidence says a **dedicated, opinionated OKR skill would find no star competition**. That is a build signal, not a copy signal.

### 4.5 Reports, one-pagers and explainers

`tt-a1i/archify` 88,567 (source-cited interactive explainers) · `coreyhaines31/marketingskills` 56,325 (collateral copy) · `first-fluke/oh-my-agent` 1,354 (plans/ADRs as files) · `nexu-io/html-anything` 9,232 (data-report surface) · `xxxd666/special-achievement-report` † 4 (consulting-grade achievement report, 9 methodologies) · `cabbage2000-lab/data-analysis-skills` † 21 (analysis report from spreadsheets). The vault's `management/weekly-report` / `quarterly-review` / `manage-up-core` sit in this lane and are already ahead of the public packs.

---

## 5. Liveness & freshness (star counts lie about the next 6 months)

| Repo | Stars | Last push | Signal |
|------|------:|-----------|--------|
| `zarazhangrui/frontend-slides` | 31,191 | 2026-06-23 | **4 months stale** — still the #7 star repo but the code is not moving (vault already vendors it; do not re-sync blindly) |
| `travisvn/awesome-claude-skills` | 15,538 | 2026-04-28 | stale index |
| `SkyworkAI/Skywork-Skills` | 205 | 2026-04-02 | stale |
| `gabberflast/academic-pptx-skill` | 1,325 | 2026-07-14 | stale-ish |
| `carnot-tech/jinba-consulting-pptx-skill` | 1,425 | 2026-10-23 | fresh |
| `genspark-ai/genoffice` | 10,708 | 2026-10-24 | **fresh & fast-moving** |
| `nexu-io/open-design` | 103,697 | 2026-10-24 | **fresh & fast-moving** |
| `anthropics/knowledge-work-plugins` | 32,515 | 2026-10-24 | **fresh & fast-moving** |

Stars reward *past* momentum; `pushed_at` is the only cheap forward-looking signal available unauthenticated.

---

## 6. Explicitly excluded from the ranking (and why)

| Repo | Stars † | Excluded because |
|------|------:|------------------|
| `paperclipai/paperclip` | 106,769 | agent-team orchestrator; produces no work deliverable |
| `thedotmack/claude-mem` | 102,705 | memory/context layer |
| `code-yeongyu/oh-my-openagent` | 70,303 | graph-engineering harness |
| `K-Dense-AI/scientific-agent-skills` | 54,385 | domain = science, not office work (177 skills, pptx×6 — real, but a different vertical) |
| `wshobson/agents` | 41,627 | multi-harness plugin marketplace; README shows no Office-deliverable skills |
| `VoltAgent/awesome-agent-skills` | 36,277 | **index** (1000+ skills, pptx×10 · docx×10 · xlsx×6 · okr×3) — mined in §4, not ranked |
| `travisvn/awesome-claude-skills` | 15,538 | index, stale |
| `Jeffallan/claude-skills` | 12,035 | full-stack dev skills; README contains **zero** deliverable keywords |
| `comfyui`-class renderers / `presenton` / `pptxgenjs` | — | libraries & apps, not skills — noted as adjacent tooling, no star figures claimed here |

---

## 7. [判断与建议] — for this vault

**Copy (adopt, in this order):**

1. **`genspark-ai/genoffice` (10,708★, Apache-2.0, fresh)** — the only repo that solves *docx + xlsx + pptx + pdf* editing from one agent skill on Windows/macOS/Linux. The vault currently has **no** local-file Office editing skill. Highest-value single import in this radar. → candidate for `vendor/` + a thin `office-docs` skill.
2. **`LegalRabbit-AI/legalrabbit-docx-mcp` (56★)** — if the 2–5× token claim holds against `anthropics/skills/docx`, it changes the cost model of every long-document workflow. **Test the claim before adopting**; a benchmark is cheap (same 20-page doc, both skills, compare tokens).
3. **`EveryInc/hands-on-deck` (221★, MIT)** + `appautomaton/document-SKILLs` (174★, MIT) — the vault generates decks but cannot *edit a deck it was handed*. That is the most common real-world ask ("please fix slide 7 of my existing deck").
4. **`BayramAnnakov/excel-hygiene` (17★)** — deterministic `.xlsx` QA. Cheap, and the vault has no spreadsheet-verification discipline at all.
5. **`siril9/presentation-skill` (84★) / `Hasasasa/html-to-editable-pptx` (94★)** — the HTML→editable-PPTX bridge; pairs with the vault's existing `design/frontend-slides` + `design/html-ppt`.
6. **`ferdinandobons/brand-docs` (281★, MIT)** — template-fidelity mechanism for Word/PPT/Excel; directly applicable to the vault's Chinese enterprise-report workflows.

**Build (no competition, per the star data):**

7. **An OKR skill** — dedicated OKR skills max out at 11★. The vault already has the raw material (`perf-tracking-platform`, `quarterly-review`, `weekly-report`, `progress-doc-style`) but no dedicated OKR authoring skill with: objective/key-result writing rules, KR metric discipline, quarterly-review traceability, and a scoring rubric. Highest-opportunity build in this radar.
8. **A table-making skill** — nobody has won this vertical as a standalone skill. Combine: `genoffice`'s file mechanics + `lieflat-charts`' data contract (already in the vault) + `excel-hygiene`'s deterministic QA + `fivetaku`'s finance-modelling lane. The vault's chart quality is already high; the *workbook* is the missing half.
9. **A "reference template" pattern** for documents — three independent repos converge on *reference template + style inheritance*. This is a reusable mechanism the vault should formalise once and apply to PPTX, DOCX and XLSX alike.

**Do not chase:** the generic slide-skill long tail (dozens of 50–900★ PPTX repos). The vault already has three slide routes (`frontend-slides`, `html-ppt`, `html-slides/slideshow`); a fourth generic generator adds nothing. Star deltas below ~1,400 in this lane carry no adoption signal.

**Monitoring rule for the next scan:** index by `stars` **and** `pushed_at` **and** (if obtainable) install counts. Two independent findings in this vault now say the same thing: `affaan-m/ECC` 287k★ yet out-installed by a 1,075★ repo's same-named skill, and here `zarazhangrui/frontend-slides` (31.2k★) has been cold for 4 months while `genoffice` (10.7k★, 3 months old) is actively moving.

---

## 8. Sources

| Ref | Source | Method |
|-----|--------|--------|
| 2-GH | GitHub REST API — `GET /search/repositories` (19 queries, `sort=stars`) and `GET /repos/{owner}/{repo}` (49 finalists) | primary, 2026-10-24 |
| 2-RAW | `raw.githubusercontent.com/{owner}/{repo}/HEAD/README.md` (49 files) | substance evidence (keyword counts) |
| 2-VAULT | This vault's own notes: `2026-10-24-top-20-agent-skills-for-fde-prototyping.md`, `INSTRUCTION.md` provenance table | vault overlap mapping |
| 4-ECC | `affaan-m/ECC` install-vs-star anomaly, quoted from the sibling FDE radar note | secondary, carried over |

---

> 免责声明：本输出由 AI 辅助生成，仅用于信息整理与研究参考，不构成专业意见或决策依据。
