# Agent Startup Radar — Skill Builders, AI Employees, All-Night Workers, Distilled Masters

**Date:** 2026-10-24 · **Snapshot:** GitHub REST search API, 2026-10-24 ~13:30–14:20Z (unauthenticated)
**Scope:** agent-related tech-innovation startups/open-source projects in four product archetypes — **skill building**, **agent employee / digital worker**, **all-night (always-on) worker**, **distilled masters / company brain** — plus the commercial startup layer behind the same four archetypes.
**Method:** `scripts/gh_sweep.py` (topic + phrase sweeps, `stargazers_count` from the GitHub search API) → `data/sweep-2026-10-24.txt`, `data/sweep-phrases-2026-10-24.txt`. **Dual pass:** the top-10 rows were re-fetched per repo in a second, independent run → `data/verify-2026-10-24.txt` (max drift observed: 5 stars). Every star number in this note comes from that session's API payloads unless marked †.

---

## 0. The question, in English (for reuse)

> "Research the **20 most-starred agent-related tech-innovation startups** building **skills**, **agent employees**, **all-night (24/7) workers** and **distilled startup masters** (expert/playbook distillation), and dump the findings into research notes."

Interpretation used here: *star count is the ranking currency* → GitHub OSS projects; *startup* → each repo's sponsoring org/company plus the closed-source startup layer mapped in §5.

---

## 1. TL;DR (conclusion first)

1. **Two of the four archetypes are real OSS markets; two are marketing words.** "Skill building" and "always-on worker" have huge, verified star counts. "Agent employee / digital worker" and "distilled masters" are, in OSS, **sub-1k-star projects with excellent designs** — the value is in the design pattern, not the popularity. [Sources: 1-GHAPI, 1-README]
2. **The single biggest star object in the whole space is an always-on personal agent:** `openclaw/openclaw` at **392,918** — a MIT-licensed assistant that lives on your own hardware, runs in 20+ chat channels, and is stewarded by a 501(c)(3) foundation with OpenAI as a donor. Second: `obra/superpowers` (**304,476**) for skill-based methodology. [1-GHAPI, 1-README]
3. **"Skill building" is the deepest bench.** Anthropic's reference library (183,423), the open Agent Skills spec (26,552), a *skill optimizer* that trains `SKILL.md` files by text-space gradient (Microsoft SkillOpt, 18,657), a *distiller of humans into skills* (titanwings/distilly, 25,973), a *docs→skill* pipeline (Skill_Seekers, 15,212). Skills are being treated as **trainable, versioned artifacts**, not prompt blobs. [1-README]
4. **The single most on-theme repo for "distilled startup masters" is `titanwings/distilly`** (25,973 ★): feed it a colleague's Feishu/Slack/email/doc corpus, get back a two-part Skill — **Work Skill** (systems, standards, workflows) + **Persona** (5-layer: hard rules → identity → expression → decisions → interpersonal), with tags for corporate culture ("ByteDance-style", "Startup-mode") and job level, plus correction/rollback/versioning. It calls the result "cyber-immortality" and ships a technical report. [1-README]
5. **The "AI employee" org chart already exists as OSS:** `paperclipai/paperclip` (106,770 ★) is explicitly framed as *"if OpenClaw is an employee, Paperclip is the company"* — heartbeat execution queue, cron/webhook routines, budgets, approval gates, org chart, shared Skill Studio, BYO agents. `lobehub/lobehub` (83,463 ★) is the consumer-side version ("agents are the unit of work", 10,000+ skills, scheduled runs, white-box personal memory). [1-README]
6. **The best "all-night worker" designs are boring and reliable:** independent reviewer + NO-GO→GO gates (ARIS, 17,994 ★), cron + catch-up policies + approval-only pings (stakpak/agent, 1,829 ★), 5-field cron scheduled tasks + long-term memory + RAG with citable snapshots (ByteDance DeerFlow, 84,367 ★), unsupervised research loops that run while you sleep (auto-deep-researcher-24x7, 1,136 ★). [1-README]
7. **Star concentration is extreme and follow-the-kit:** the top 9 repos hold ~1.5M stars; #20 is at 1,829. A star ranking alone hides the design gems that matter for a skills vault. [1-GHAPI]

---

## 2. Table A — Top 20 by GitHub stars (the literal answer)

Stars = `stargazers_count` from `GET /search/repositories` (topic/phrase sweeps) on 2026-10-24 ~13:30–14:20Z. `pushed_at` = last push date from the same payload. **Archetype** is my classification, not a GitHub topic.

| # | Repo | Stars | Archetype | License | Last push | What it is |
|---|------|------:|---|---|---|---|
| 1 | `openclaw/openclaw` | 392,918 | All-night worker | MIT | 2026-10-24 | Self-hosted assistant on *your* devices, in 20+ channels (Discord/iMessage/Slack/Teams/Telegram/WhatsApp…); local state+memory+credentials; swappable model/harness plugins; skills + plugin SDK + ClawHub; OpenClaw Foundation (501(c)(3)), OpenAI is a donor. |
| 2 | `obra/superpowers` | 304,476 | Skill building | MIT | 2026-10-23 | "An agentic skills framework & software development methodology that works" — skills as the unit of engineering method, not prompts. |
| 3 | `NousResearch/hermes-agent` | 256,690 | All-night worker + skill building | MIT | 2026-10-24 | The only agent with a **built-in learning loop**: creates skills from experience, improves them during use, self-searches past conversations, models the user across sessions; **cron scheduler** for unattended runs; 6 terminal backends (local/Docker/SSH/Modal/Daytona/Vercel); agentkills.io-compatible. |
| 4 | `anthropics/skills` | 183,423 | Skill building | Mixed (repo reports NONE) | 2026-10-09 | Canonical reference Agent Skills library (docx/pdf/pptx/xlsx + MCP generation + enterprise workflows). |
| 5 | `addyosmani/agent-skills` | 110,108 | Skill building | MIT | 2026-10-13 | Production-grade engineering skills (CI/CD, perf, testing) — a delivery-quality baseline. |
| 6 | `paperclipai/paperclip` | 106,770 | Agent employee | MIT | 2026-10-24 | "The app people use to manage agents at work." Heartbeat wakeup queue, scheduled routines (cron/webhook/API) that create tracked issues, org chart + budgets + approval gates, org-wide Skill Studio with evals + version history + restore, BYO agents (Claude Code/Codex/Cursor/OpenClaw…). |
| 7 | `thedotmack/claude-mem` | 102,704 | Distilled masters (memory) | Apache-2.0 | 2026-10-24 | Persistent cross-session context for every agent — "captures everything your agent…" — the substrate for company-brain patterns. |
| 8 | `bytedance/deer-flow` | 84,367 | All-night worker | MIT | 2026-10-24 | Long-horizon SuperAgent harness: **scheduled tasks** (`once`/`cron`/`interval`, 5-field cron + timezone + preview endpoint), packageable/exportable `.skill` packs, sub-agent modes, sandboxes, DeerMem long-term memory, RAGFlow `knowledge_search` with citable snapshots, MCP + IM channels. |
| 9 | `lobehub/lobehub` | 83,463 | Agent employee | LobeHub Community License (badge says Apache-2.0) | 2026-10-24 | Next.js workspace where "agents are the unit of work": Agent Builder, 10,000+ skills + MCP-compatible plugins, Agent Groups, Schedule, white-box editable personal memory with continual learning, IM gateway, self-host. |
| 10 | `volcengine/OpenViking` | 40,732 | Distilled masters (context DB) | AGPL-3.0 | 2026-10-24 | Self-evolving context database unifying agent memory + knowledge RAG + skills. |
| 11 | `zeroclaw-labs/zeroclaw` | 33,038 | All-night worker | MIT **or** Apache-2.0 | 2026-10-24 | Rust single-binary autonomous assistant: 30+ channels, ~20 providers with fallback chains, default `supervised` autonomy (medium-risk needs approval, high-risk blocked), Landlock/Bubblewrap/Seatbelt/Docker sandboxes, cryptographic tool receipts, **SOP engine** triggered by MQTT/webhook/cron with approval gates + resumable runs, systemd/launchctl/Windows-Service install. |
| 12 | `topoteretes/cognee` | 32,715 | Distilled masters (memory) | Apache-2.0 | 2026-10-23 | Open-source AI memory platform — persistent memory for agents. |
| 13 | `agentskills/agentskills` | 26,552 | Skill building (spec) | Apache-2.0 (code), CC-BY-4.0 (docs) | 2026-08-09 | The **open Agent Skills format**: a folder with `SKILL.md` (metadata + instructions) + optional scripts/references/assets; 3-stage progressive disclosure (discovery → activation → execution); originally Anthropic, now an open standard (agentskills.io/specification). |
| 14 | `titanwings/distilly` | 25,973 | Distilled masters | MIT | 2026-10-13 | *Formerly colleague-skill / dot-skill.* Distills a **person** into an executable Skill from Feishu/DingTalk/Slack/WeChat/email/PDF corpora + a subjective description. Part A = Work Skill (systems, standards, workflows, experience); Part B = Persona (5 layers). Culture/level tags (ByteDance-style, Alibaba P6, Startup-mode…), correction layer, version archive + rollback. Ships a technical report + community gallery. |
| 15 | `microsoft/SkillOpt` | 18,657 | Skill building | MIT | 2026-10-23 | Treats the **skill document as the trainable state** of a frozen agent: epochs/batchsize/lr/validation gates, edits accepted only if they strictly improve a held-out score, textual learning-rate budget, rejected-edit buffer, `best_skill.md` (300–2,000 tokens). v0.2 adds `skillopt-sleep` **nightly offline self-evolution** (harvest→mine→replay→consolidate) + Claude Code/Codex/Copilot/Devin shells; PyPI `skillopt`. |
| 16 | `wanshuiyin/Auto-claude-code-research-in-sleep` (ARIS) | 17,994 | All-night worker | MIT | 2026-10-22 | Autonomous overnight research: executor drives, an **independent reviewer model** (Codex MCP) returns NO-GO→GO verdicts with design/impl gates; auto research loop (review→fix→re-evaluate, resumes from `REVIEW_STATE.json`); 83 bundled skills; `/meta-optimize` self-evolution (analyze logs → propose `SKILL.md` patches); Rust standalone CLI. |
| 17 | `yusufkaraaslan/Skill_Seekers` | 15,212 | Skill building | MIT | 2026-09-30 | Converts 18 source types (doc sites, repos, PDFs, videos, wikis, OpenAPI, Confluence, Notion, Slack exports…) into skills across 22 export targets; 68 workflow presets, optional SQLite FTS5 index inside the skill, MCP server with 40 tools, doc-change detection + scheduled re-scrapes, 3,900+ tests. |
| 18 | `lsdefine/GenericAgent` | 14,343 | All-night worker + skill building | MIT | 2026-10-22 | ~3K-line self-evolving agent: layered memory L0 Meta Rules → L1 Insight Index → L2 Global Facts → L3 Skills/SOPs → L4 Session Archive; each solved task **crystallizes into a reusable Skill**; persistent real Chrome via TMWebdriver (keeps login sessions); cron integration; Goal mode (time-budget loop) + Goal Hive (master/workers over BBS); IM frontends. |
| 19 | `MervinPraison/PraisonAI` | 9,288 | Agent employee ("24/7 AI workforce") | MIT | 2026-10-24 | Five-layer stack (Prompt/Context/Harness/Loop/Graph), AgentFlow with route/parallel/repeat/loop, `ExecutionConfig(max_iter, max_budget)` + doom-loop detection, managed agents on docker/e2b/modal/daytona/flyio, CLI `schedule start/list/stop` + Cron dashboard, MCP (stdio/HTTP/WS/SSE), 100+ providers. |
| 20 | `stakpak/agent` | 1,829 | All-night worker | Apache-2.0 | 2026-07-06 | DevOps agent that "lives on your machines 24/7": `autopilot up` daemon, cron schedules + concurrency/catch-up policies, channels (slack/telegram/discord) with `--target`, profiles separate model/tools/auto-approve from notification routing, Warden guardrails + secret substitution, Rulebooks (markdown + YAML), MCP with mTLS. |

**Immediately below the cut (same archetypes, verified same session):** `OrchestratorInc/agent-orchestrator` 13,558 (Apache-2.0, desktop orchestrator: one task + one agent + own branch/worktree, persistent planning/delegation orchestrator, live Kanban derived from session/PR/CI facts, ~30+ harnesses) · `NVIDIA/SkillSpector` 21,186 (Apache-2.0, skill security scanner — prompt injection / exfiltration / supply-chain) · `VoltAgent/awesome-openclaw-skills` 53,302 (5,400+ skills catalog) · `supermemoryai/supermemory` 31,373 · `beclab/Olares` 5,319 (AGPL-3.0, "Personal Cloud OS for Always-On Agents") · `builderz-labs/mission-control` 6,390 (self-hosted control plane: dispatch, review runs, track spend) · `jnMetaCode/agency-orchestrator` 2,402 ("one-person company of AI experts") · `a5c-ai/babysitter` 1,868 ("enforces obedience on agentic workforces") · `Intuition-Lab/personal-model` 1,328 (builds an evidence-linked `HUMAN.md`) · `Xiangyue-Zhang/auto-deep-researcher-24x7` 1,136 (runs DL experiments 24/7 while you sleep) · `AlphaGBM/investment-masters` 635 (MIT; 15 fund managers' methodologies distilled into skills) · `microsoft/Sico` 282 · `finewood2008/centaurloop` 66 · `OpenInsightHQ/openinsight` 65 · `PlumoAI/plumoai` 78 · `nemock/company-brain` 5.

---

## 3. Archetype radar (the usable answer)

### 3.1 Skill building — "the skill IS the product"

| Repo | Stars | Substance (README-verified) | What the vault should steal |
|---|---:|---|---|
| `agentskills/agentskills` | 26,552 | 3-stage progressive disclosure (name+description → full `SKILL.md` → bundled code/references) | Adopt as the vault's canonical folder+frontmatter contract; it is the spec other tools already implement. |
| `microsoft/SkillOpt` | 18,657 | Skills as trainable state of a frozen agent; strict validation-gated edits; nightly `skillopt-sleep` self-evolution | **The vault's missing capability**: score a skill against real runs and rewrite it. Currently no vault tool does this. |
| `yusufkaraaslan/Skill_Seekers` | 15,212 | 18 sources → 22 targets, FTS5 index inside the skill, scheduled re-scrape on doc change | "Docs → skill" ingestion pipeline with freshness. |
| `titanwings/distilly` | 25,973 | Human corpus → Work Skill + Persona; correction layer; version archive + rollback | The template for a *distilled master* pack (§3.4). |
| `NVIDIA/SkillSpector` | 21,186 | Security scanner for agent skills (injection / exfiltration / supply-chain) | Gate every adopted skill; install before ingesting third-party packs. |
| `yusufkaraaslan/Skill_Seekers` / `virgiliojr94/book-to-skill` (35,939) | | Books/PDFs → skills | Turn the vault's own `KNOWLEDGE.md`/books into skills. |
| `obra/superpowers` | 304,476 | Skills-as-methodology + SDLC | Highest-leverage single dependency for the vault's engineering method. |

### 3.2 Agent employee / digital worker — "the org chart is the product"

| Repo / company | Stars | Substance | Note |
|---|---:|---|---|
| `paperclipai/paperclip` | 106,770 | Heartbeat queue + cron/webhook routines → tracked issues; budgets + approval gates; Skill Studio (evals, version history, restore); BYO agents | Best OSS "company of agents" control plane; closest OSS analogue to an AI-employee SaaS. |
| `lobehub/lobehub` | 83,463 | Agent Builder, 10,000+ skills, Agent Groups, Schedule, white-box memory, IM gateway, self-host | Consumer/team surface; watch its Community License before adopting. |
| `MervinPraison/PraisonAI` | 9,288 | "Hire a 24/7 AI workforce"; budget-bounded loops; cron CLI | Budget bounds + doom-loop detection are worth copying into any agent-runner. |
| `microsoft/Sico` | 282 | "Digital Worker" platform: Cortex/Action/Memory anatomy; Execution/Evolution/Evaluation loops; **Reflector→Curator** distilling trajectories into a per-(project,agent) Playbook injected into the next run; RBAC, HMAC sandbox traffic, sandboxes | **The best-designed OSS digital-worker in the sample** — and it has 282 stars. Underrated. |
| `PlumoAI/plumoai` | 78 | Pre-trained autonomous "AI Employees" (outreach/sales/research/ops/PM), n8n-style workflow nodes, MCP connectors; Community License forbids resale | Shows the shape of a turnkey employee platform; licence is a trap for a vault. |
| `OpenInsightHQ/openinsight` / `finewood2008/centaurloop` | 65 / 66 | "Enterprise Agent OS — AI employees that learn your business"; "smallest work unit for building AI employees" (human-in-loop, feedback+memory → skill evolution) | Good primitive definitions; zero stars. |
| Commercial | n/a | 11x (Series B, digital workers for GTM, Tracxn†), Artisan (Ava the AI BDR, $46.1M raised†), Lindy, Sintra, Beam, Salesforce Agentforce | The category's stars are **money, not GitHub**: commercial "AI employee" brands are essentially all sub-$100M-scale startups. |

### 3.3 All-night worker — "it runs while you sleep"

| Repo | Stars | What makes it a night worker | Notes |
|---|---:|---|---|
| `openclaw/openclaw` | 392,918 | Always-on local gateway, 20+ channels, plugins/skills, on your own hardware | The category's center of gravity; foundation-governed, MIT. |
| `NousResearch/hermes-agent` | 256,690 | Built-in cron scheduler with delivery to any platform ("daily reports, nightly backups, weekly audits — unattended"); self-improving skills; $5-VPS deployment | Best single reference for "agent that keeps working". |
| `bytedance/deer-flow` | 84,367 | `once`/`cron`/`interval` scheduled tasks with timezone + cron preview endpoint; long-term memory; sandbox modes; citable RAG snapshots | Production-grade scheduling semantics — copy the cron model. |
| `zeroclaw-labs/zeroclaw` | 33,038 | SOP engine triggered by MQTT/webhook/cron with approval gates and **resumable runs**; supervised autonomy default; cryptographic tool receipts | Approval gates + receipts = the safety model a night worker needs. |
| `lsdefine/GenericAgent` | 14,343 | Goal mode (time-budget loop), cron, self-crystallizing skills, persistent logged-in Chrome | The only sample that keeps a *real* browser session — necessary for true 24/7 work. |
| `wanshuiyin/...-research-in-sleep` (ARIS) | 17,994 | Unattended overnight research with independent reviewer + NO-GO→GO gates, resumable state file, `/meta-optimize` self-patching of skills | **The safest night-worker pattern in the sample: never let the same model both do and approve.** |
| `stakpak/agent` | 1,829 | Autopilot daemon, cron + catch-up policy, pings only for approval, Warden guardrails, Rulebooks | Correct "ask only when needed" ergonomics. |
| `Xiangyue-Zhang/auto-deep-researcher-24x7` | 1,136 | Runs experiments 24/7 unattended | Niche but proves unattended long-horizon science. |
| `beclab/Olares` | 5,319 | "Personal Cloud OS for Always-On Agents" | Always-on infrastructure angle. |
| `rexleimo/aios` (61) / `root643/routerclaw` (52) | | Local-first control plane with resumable overnight runs; always-on agent on a 32 MB router | Extreme edge cases worth reading once. |

### 3.4 Distilled masters / company brain — "the expertise survives the person"

| Repo | Stars | Substance | Note |
|---|---:|---|---|
| `titanwings/distilly` | 25,973 | Person → Skill (Work + Persona), culture/level tags, corrections, versioning, rollback | **Flagship of this archetype.** Directly implements "distilled startup masters". |
| `thedotmack/claude-mem` | 102,704 | Persistent cross-session context for every agent | Volume distributor for the archetype. |
| `volcengine/OpenViking` | 40,732 | Self-evolving context DB (memory + RAG + skills) | Infra layer. |
| `topoteretes/cognee` | 32,715 | AI memory platform | Infra layer. |
| `lsdefine/GenericAgent` | 14,343 | Task → Skill crystallization + 5-layer memory | Automatic distillation, no human corpus needed. |
| `AlphaGBM/investment-masters` | 635 | 15 fund managers' methodologies → structured profiles + `SKILL.md` + catalog; explicit evidence boundaries (separates supplied evidence from unverified claims); 13F links by CIK as manual reference | The purest "masters" pack; its **evidence-boundary discipline** is the part to copy. |
| `Intuition-Lab/personal-model` | 1,328 | Builds an evidence-linked `HUMAN.md` (Point→Line→Face→Volume→Root geometry), provenance via `read_receipt`/`resolve_evidence`, permission-based capture | Distilling a *person* instead of a persona of a master. |
| `nemock/company-brain` | 5 | Typed markdown knowledge graph in your own git repo; `derived_from` provenance edges; anti-decisions/non-goals as first-class concepts; generates 21 planning docs (MRD/PRD/battle card/investor update); idempotent renders → meaningful git diffs; per-metric confidence half-life decay | **Design-rich, star-poor.** The provenance + confidence-decay model is vault-grade. |
| `microsoft/Sico` (Reflector→Curator) | 282 | Distills execution trajectories into a per-(project,agent) Playbook for the next run | Distillation as a *runtime loop*, not a one-off authoring step. |
| Research | — | arXiv 2609.02749 "Repo-To-Skill: Distilling GitHub Repositories Into AI4AI Skills" (DisCo): 5,000+ verified skills from 1,000 ML repos; skill-equipped research agent scores **+134.3% on MLE-bench**, +34.4% PaperBench, +14.0% PassNet under fixed backbone/harness | Independent evidence that distillation-as-skill is a measured win, not a slogan. [2-ARXIV] |

---

## 4. Cross-cutting patterns (what the four archetypes share)

| Pattern | Evidence | Reuse in the vault |
|---|---|---|
| **Skills are versioned, scored artifacts** | `agentskills/agentskills` (format), `microsoft/SkillOpt` (trainable `SKILL.md`, validation gates, nightly self-evolution), `NVIDIA/SkillSpector` (security gate) | Vault needs: format spec + optimizer + security scanner. Only the format is standard today. |
| **The "company" layer is a queue + budget + approval** | `paperclipai/paperclip` (heartbeat, budgets, approval gates, Skill Studio), `MervinPraison/PraisonAI` (`max_iter`, `max_budget`, doom-loop detection) | Vault agent-runner should borrow these three knobs explicitly. |
| **Night workers need separation of duties** | ARIS (independent reviewer, NO-GO→GO), `zeroclaw` (supervised autonomy tiers + receipts), `stakpak/agent` (Warden guardrails, approval-only pings) | Never let the same model both execute and approve a long-running job. |
| **Everything is converging on Markdown + git as the substrate** | `nemock/company-brain` (markdown graph in git), `titanwings/distilly` (skill = markdown + versioned), `theredotmack/claude-mem`, `OthmanAdi/planning-with-files` (27,618★, file-based planning for long-running tasks) | The vault's markdown-in-git choice is now the mainstream, not a niche. |
| **Distillation is converging on two forms** | From a *person's corpus* (distilly, personal-model, investment-masters) vs from *execution traces* (Sico Reflector→Curator, GenericAgent crystallization, `microsoft/SkillOpt` mining) | Pick one as the vault's native path: trace-based is automatable; person-based is higher fidelity but needs consent + privacy handling. |

---

## 5. Commercial startup layer (no stars — money and product surface instead)

All rows here are **level-3 secondary sources** (press/aggregator), not first-party filings. Treat as directional; conflicting figures are flagged.

| Company | Archetype | Signal (2026) |
|---|---|---|
| Cognition (Devin) | All-night worker / agent employee | Series E >$2B at **$48B valuation** (2026-09-08); run-rate revenue ~$900M vs $492M in May 2026 [3-PRESS, 3-DIR] |
| Sierra AI | Agent employee (customer-facing) | **Conflicting figures**: a $4.5B valuation line vs a "$15.8B valuation (May 4)" + ">40% of Fortune 50" claim in another tracker — do not cite a single number without re-checking [3-DIR, 3-TRACK] |
| Glean | Distilled masters / company brain (enterprise search + agents) | ~$7.2B valuation (Jun 2025) tracker estimate; $260M last round per one VC table [3-DIR, 3-TRACK] |
| 11x AI | Agent employee (GTM/sales digital workers) | Series B; "digital workers … operate around the clock", multilingual [3-TRACXN] |
| Artisan AI | Agent employee (Ava, AI BDR) | $46.1M raised, Series A, est. ~$5M ARR [3-TOOL] |
| Lindy AI | Agent employee (generalist for solo operators) | Pricing Plus $29.99 / Pro $99.99 / Max $199.99 per user/mo (Sept 2026) [3-TRACK] |
| Decagon | Agent employee (support) | Reported $150M+ ARR (Feb 2026); ~$650M valuation in one table [3-TRACK] |
| Writer / Harvey / Hebbia | Agent employee (workflow / legal / research) | $1.9B / $1.5B / $700M valuations in one aggregator table [3-DIR] |

**Read:** the commercial layer prices *role* (BDR, support, legal), while the OSS layer prices *capability* (skills, memory, orchestration). The vault's value is the capability layer: it is where an FDE can assemble an employee without a procurement cycle.

---

## 6. Gaps, caveats

1. **Star counts are a snapshot of a fast-moving ecosystem.** All numbers fetched 2026-10-24 ~13:30–14:20Z unauthenticated. `openclaw` alone was ~392.9K and `superpowers` ~304.5K at that moment; several of these repos move thousands of stars per day. Treat as a ranking, not a scoreboard.
2. **Unauthenticated limits.** The core REST quota (60 req/h) was exhausted in this session, so every number came from `GET /search/repositories` (`items[].stargazers_count`) rather than `GET /repos/{owner}/{repo}`. Same field, same source. A **second independent pass** re-fetched the top-10 repos individually (`data/verify-2026-10-24.txt`): drift was 0–5 stars, e.g. `openclaw` 392,918 → 392,922, `superpowers` 304,476 → 304,478, seconds apart. That confirms the sweep numbers are not stale-by-a-lot artifacts of a cached search index. `microsoft/Sico`, `PlumoAI/plumoai`, `AlphaGBM/investment-masters`, `nemock/company-brain` were verified in dedicated single-repo search calls.
   - **Operational lesson:** the unauthenticated *search* API allows 10 req/min, and a 40-repo verification pass with 8s spacing still hit HTTP 403 rate-limit exhaustion. A reliable verification pass needs ≥15s spacing (or a `GITHUB_TOKEN`), and writes its output only at the end — a run that dies on 403 leaves an empty file and no partial evidence.
3. **"Archetype" is my classification, not a GitHub topic.** The sweeps found `topic:digital-worker` = only 8 repos and `topic:ai-employee` = 102 — the topic taxonomy itself is near-empty; the phrase queries (`"ai employee" in:name,description` = 3,219 matches) returned mostly non-agent repos, so I filtered by hand.
4. **The "digital worker" / "AI employee" OSS tier is tiny.** Sub-1k stars for the most on-theme projects (Sico 282, PlumoAI 78, openinsight 65, centaurloop 66). This is a *finding*, not a search failure: the money in this category is in closed startups (§5), while OSS shipped the *capabilities* those startups sell.
5. **`microsoft/SkillSpector` does not exist** — the skill-security scanner is `NVIDIA/SkillSpector`. A prior note in this folder already had it right; I initially mis-typed the owner and corrected it.
6. **Readmes are self-reported.** Every mechanism in §2–§4 is taken from the project's own README; performance claims inside them (e.g. "+134.3% on MLE-bench") are only independent where I cite the paper [2-ARXIV].
7. **Licenses matter and are uneven.** `PlumoAI` uses a Community License forbidding resale/competing SaaS; `lobehub` ships a "LobeHub Community License" while its badge says Apache-2.0 (README conflict — check before adopting); `anthropics/skills` reports no SPDX id at the repo level (mixed per-skill licensing).
8. **Not covered:** Chinese-market repos were only sampled through English-language topics; private/closed repos cannot be ranked by stars at all; the "all-night worker" phrase search surface (`"24/7"`, `"overnight"`) is small (375 and 1 total matches respectively), so this archetype is under-sampled relative to its importance.

---

## 7. [判断与建议] Judgment & recommendations (not verified fact)

- **Adopt four upstream dependencies and nothing else:** `agentskills/agentskills` (format), `microsoft/SkillOpt` (skill optimization), `NVIDIA/SkillSpector` (security), and `obra/superpowers` (methodology). All four are MIT/Apache-2.0, all four are individually useful, and together they close the vault's biggest gaps: format → scoring → safety → method.
- **Build the vault's differentiation in the "distilled masters" lane, not the "another skill pack" lane.** The market already has 5,400+ curated skills (`VoltAgent/awesome-openclaw-skills`, 53,302★). What it lacks is a *faithful* distillation pipeline with provenance: `titanwings/distilly`'s Work+Persona split, `AlphaGBM/investment-masters`' evidence boundaries, and `nemock/company-brain`'s `derived_from` edges and confidence half-life decay, applied to *founders and operators* the vault already has transcripts for.
- **Treat "AI employee" as an orchestration problem, not a persona problem.** The star evidence says the value is in `paperclip`'s queue/budget/approval mechanics and `Sico`'s three-loop evolution model — not in writing a convincing-sounding "sales rep" prompt.
- **If the vault wants a night worker, copy ARIS's separation of duties before anything else.** An independent reviewer with NO-GO→GO gates (plus `zeroclaw`'s approval tiers and `stakpak`'s ping-only-when-needed) is what makes unattended runs safe enough to trust. A single-model loop that both acts and approves is the failure mode to design against.
- **Do not build on `microsoft/Sico`'s repo surface, but do read it.** 282 stars with a published architecture (Cortex/Action/Memory, Execution/Evolution/Evaluation, Reflector→Curator) is the best OSS design document in the "digital worker" category; it is an architecture source, not a dependency.
- **Re-run quarterly, and track `pushed_at` as a liveness filter.** Three of the top-20 samples had last pushes older than the snapshot window's recency (e.g. `stakpak/agent` 2026-07-06, `agentskills/agentskills` 2026-08-09); a high star count with a stale push date is dead weight. The vault's index should carry `stars` + `pushed_at` + `installs` (per the existing SKILL_RADAR convention) and never stars alone.

---

## 8. Sources

| ID | Source | Level | Used for |
|----|--------|-------|----------|
| 1-GHAPI | GitHub REST search API — `https://api.github.com/search/repositories?q=…&sort=stars` (`items[].stargazers_count`, `license.spdx_id`, `pushed_at`, `topics`, `description`), 2026-10-24 13:30–14:20Z | 1 | Every star count, license, last-push date in §2–§4. Sweeps: `topic:agent-skills`, `topic:claude-skills`, `topic:digital-worker`, `topic:ai-employee`, `topic:agent-orchestration`, `topic:autonomous-agent`, `topic:skill-distillation`, `topic:agent-memory`, `topic:ai-agent-framework`, `topic:ai-workflow`, plus 10 phrase queries (raw data in `data/sweep-2026-10-24.txt`, `data/sweep-phrases-2026-10-24.txt`) |
| 1-README | Project READMEs via `raw.githubusercontent.com` — `openclaw/openclaw`, `NousResearch/hermes-agent`, `paperclipai/paperclip` (master), `lobehub/lobehub`, `microsoft/Sico`, `titanwings/distilly`, `microsoft/SkillOpt`, `yusufkaraaslan/Skill_Seekers`, `lsdefine/GenericAgent`, `wanshuiyin/Auto-claude-code-research-in-sleep`, `stakpak/agent`, `bytedance/deer-flow`, `agentskills/agentskills`, `zeroclaw-labs/zeroclaw` (master), `nemock/company-brain`, `AlphaGBM/investment-masters`, `Intuition-Lab/personal-model`, `MervinPraison/PraisonAI`, `OrchestratorInc/agent-orchestrator`, `PlumoAI/plumoai` | 1 | Mechanism descriptions in §2–§4 (project's own claims, cited as such) |
| 1-GHAPI-V | GitHub REST search API, second independent per-repo pass — `data/verify-2026-10-24.txt` (top-10 repos, 16s spacing) | 1 | Cross-check of the sweep numbers (max drift 5 stars) |
| 2-ARXIV | arXiv 2609.02749 "Repo-To-Skill: Distilling GitHub Repositories Into AI4AI Skills" (DisCo / AREX-Skill), 2026-09-02 | 2 | Quantified evidence that skill distillation raises agent benchmark scores under a fixed backbone |
| 3-PRESS | Cryptonomist, "Cognition Series E Funding Hits $2B at $48B Valuation", 2026-09-08 | 3 (reference only) | Cognition valuation/funding figures |
| 3-DIR | valueaddvc.com "AI Agent Startups: $100B+ Market, 2026" (PitchBook/Crunchbase-derived table) | 3 (reference only) | Comparative startup valuations (Glean, Sierra, Cognition, Writer, Harvey, Hebbia, Decagon, Lindy) |
| 3-TRACK | tooldirectory.ai, layer3labs.io, aimarketmap.ai, tracxn.com platform pages | 3 (reference only) | Pricing/ARR/funding colour for Lindy, Sierra, Glean, 11x, Artisan, Decagon. Conflicting numbers flagged in §5 |
| 3-TOOL | tooljunction.io Artisan AI company page (Series A, $46.1M raised) | 3 (reference only) | Artisan funding/ARR |
| 4-OBS | Observed corpus of this session: `github.com/topics/digital-worker` (8 repos), `github.com/topics/ai-employee` (102), sifted-network/sifted-awesome-ai-agents header (2026-10-06), dataaihub.co trending | 3 (reference only) | Cross-checks that category sizes and star magnitudes are plausible |

---

> 免责声明：本输出由 AI 辅助生成，仅用于信息整理与研究参考，不构成专业意见或决策依据。
