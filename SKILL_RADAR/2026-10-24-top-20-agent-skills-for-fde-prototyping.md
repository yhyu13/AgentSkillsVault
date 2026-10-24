# Skill Radar — Top 20 most-starred agent skills for FDE prototyping

**Date:** 2026-10-24 · **Snapshot:** GitHub REST API, 2026-10-24 ~13:20–13:45Z
**Scope:** agent skills, skill packs, MCP servers and agent toolkits an FDE (Forward Deployed Engineer) uses to prototype an AI product — spanning sales, marketing, database/data, monitoring/observability, information gathering, support, DevOps and orchestration.
**Method:** two independent verification passes (this session + a background research agent), both against `api.github.com`. `SKILL.md` counts confirmed via `/git/trees/HEAD?recursive=1`.

---

## 0. The question, in English (for reuse)

> "Research the **20 most-starred agent skills** that a **Forward Deployed Engineer** would use to **prototype an AI product**, across **multiple vertical domains** — sales, marketing, database, monitoring, information gathering, etc. — and dump the findings into research notes."

Two readings exist and this note answers both:
1. **Literal** — the 20 highest-starred repos in the agent-skill ecosystem (§2).
2. **Useful** — the best repo *per vertical* for FDE prototyping, because a pure star ranking buries the small, precisely-scoped skill packs that actually ship vertical expertise (§3).

---

## 1. TL;DR (conclusion first)

- **Stars are a distribution signal, not a fit signal.** The top of the leaderboard is dominated by *general* assets: MCP server catalogs, agent frameworks, prompt/engineering packs. Only **4 of the top 20** are vertically specific to a business domain.
- **The #1 skills repo is `obra/superpowers` (304,476 stars, 15 `SKILL.md` files)** — an agentic skills framework and software-development methodology. It is *not* visible to a `topic:` sweep; it is only found by searching skill-framework repos directly. **Lesson: topic-based discovery alone under-counts the top of the leaderboard.**
- **Vertical depth lives in the 1k–30k star band.** Every genuinely vertical skill pack sits there: `marketingskills` (56.3k), `anthropics/knowledge-work-plugins` (32.5k), `claude-seo` (20.0k), `linkedin-skills` (5.1k), `open-seo-mcp-skills` (7.0k), `sf-skills` (1.1k).
- **Monitoring/observability is the thinnest vertical in agent-skill form.** The highest-starred *skill* pack is `grafana/skills` at **290 stars**; `Dynatrace/dynatrace-for-ai` 167; `monte-carlo-data/mc-agent-toolkit` 93; the classic SRE-agent tier is *sub-150 stars* (`agamm/awesome-ai-sre` 124, `pro-deploy/aegil` 104, `alparn/sre-agent` 4). The monitoring stars live in *platform* repos (`netdata` 81.1k, `langfuse` 36.3k, `signoz` 32.4k, `mlflow` 28.5k), not in skills. **This is the clearest white-space in the vault.**
- **Support is genuinely thin.** The top support projects sit under 750 stars (`cossistantcom/cossistant` 736, `tgoai/tgo` 640, `huabeitech/agent-desk` 286). Treat support as low-maturity: expect to hand-build.
- **Database skills are vendor-scoped.** `planetscale/skills` 135 stars, `datavelopers/datavelopers-skills` 28 skills, `vaquarkhan/data-engineering-agent-skills` 59 stars, `duckdb-skills` ~499. `anthropics/knowledge-work-plugins/data` covers Snowflake/Databricks/BigQuery SQL. The high-star database assets are *tools*, not skills: `vanna-ai/vanna` 23.8k, `googleapis/mcp-toolbox` 16.7k.
- **Stars ≠ adoption.** The single most useful finding for a skills vault: `affaan-m/ECC` has ~287.7k stars and 311 `SKILL.md` files, yet its most-installed skill (`security-review`, 18,189 installs) is out-installed by a **same-named skill from a 1,075-star repo** (20,611 installs). Stars follow the kit; installs follow the file. Track installs, not stars. [Source: 2-DEV]
- **Best FDE "one-repo-per-vertical" starting point:** `anthropics/knowledge-work-plugins` (Apache-2.0, 11 role plugins, ~252 skills) — the only high-star repo that ships sales, customer-support, marketing, data, finance, legal, enterprise-search and product-management skills *with* MCP connectors pre-wired (HubSpot, Snowflake, BigQuery, Intercom, Ahrefs, Klaviyo, Slack, Jira).
- **Licensing is a trap in this ecosystem.** Nine of the top-20 rows report `NOASSERTION`: n8n, Dify, Langfuse, OpenBB, `modelcontextprotocol/servers` and Tgo are **source-available with added conditions, not OSI-compliant**; `anthropics/skills`, `ComposioHQ/awesome-claude-skills` and `travisvn/awesome-claude-skills` have **no root LICENSE file at all**. Verify before adopting.

---

## 2. Table A — Top 20 by GitHub stars (literal answer)

Stars verified via `GET https://api.github.com/repos/{owner}/{repo}` (field `stargazers_count`) or `GET /search/repositories` (`items[].stargazers_count`) on 2026-10-24. License from the same payload. **Vertical** = primary FDE domain.

| # | Repo | Stars | Vertical | License | What an FDE uses it for |
|---|------|------:|----------|---------|--------------------------|
| 1 | `morluto/rea` | 376,072 | Info gathering / teardown | MIT | "Reverse Engineer Anything" MCP — inspect competitor binaries, Electron/JS apps, websites, HAR captures, APKs, SQLite files. The cleanest way to spec a feature from a product you can't read the source of. |
| 2 | `obra/superpowers` | 304,476 | Cross-vertical (skills framework) | MIT | 15 shipped `SKILL.md` files (brainstorming, dispatching-parallel-agents, …) — an agentic skills *framework* and development methodology, not a domain pack. The reference for how a skills system is structured. |
| 3 | `n8n-io/n8n` | 208,477 | Orchestration / integration | NOASSERTION (fair-code / Sustainable Use) | Workflow runtime with 400+ integrations; the "glue" behind most FDE prototypes that must touch a customer's real systems. |
| 4 | `firecrawl/firecrawl` | 194,836 | Info gathering / web data | AGPL-3.0 | Firecrawl MCP is the default web-extraction backend for research, lead-gen and RAG prototypes (see `firecrawl/firecrawl-workflows` skills). |
| 5 | `anthropics/skills` | 183,421 | Cross-vertical (official) | **no root LICENSE** (mixed: Apache-2.0 + source-available doc skills) | Anthropic's reference skill library — docx/pdf/pptx/xlsx, plus MCP-server generation and enterprise-workflow examples. The canonical `SKILL.md` reference. |
| 6 | `DietrichGebert/ponytail` | 175,229 | Cross-vertical (engineering) | — | "Laziest senior dev" behaviour skill; a prompt-discipline pattern, not a domain skill. |
| 7 | `langgenius/dify` | 159,415 | Platform / orchestration | NOASSERTION (Dify Open Source License) | LLM app platform: agents, RAG pipeline, workflows — the fastest path from "demo" to "customer-deployable". |
| 8 | `open-webui/open-webui` | 156,628 | Platform / delivery surface | — | Self-hosted chat/agent front-end; often the demo surface an FDE ships to a customer. |
| 9 | `langchain-ai/langchain` | 148,357 | Platform / orchestration | MIT | Agent framework + LangGraph; still the default reference stack. |
| 10 | `browser-use/browser-use` | 119,021 | Info gathering / browser | MIT | Browser automation for agents — the standard way to prototype against a customer's UI that has no API. |
| 11 | `addyosmani/agent-skills` | 110,107 | Cross-vertical (engineering) | MIT | Production-grade engineering skills; useful baseline for delivery quality bars (CI/CD, perf, testing). |
| 12 | `paperclipai/paperclip` | 106,765 | Orchestration / multi-agent ops | — | Open-source app for orchestrating a team of AI agents (goal assignment, cost tracking). |
| 13 | `nexu-io/open-design` | 103,687 | Deliverable generation | MIT | Local-first design engine: prototypes, landing pages, dashboards, slides, image/video, real file export. |
| 14 | `thedotmack/claude-mem` | 102,703 | Context / memory | — | Persistent cross-session memory for coding agents — a repeated FDE complaint ("the agent forgets the customer's schema"). |
| 15 | `Leonxlnx/taste-skill` | 101,834 | Deliverable quality | — | Frontend/design quality skill; matters when the prototype is judged on look. |
| 16 | `punkpeye/awesome-mcp-servers` | 96,811 | MCP catalog | MIT | The discovery index for MCP servers — use it to answer "which connector exists for the customer's tool?" |
| 17 | `modelcontextprotocol/servers` | 91,538 | MCP (official) | NOASSERTION (MIT→Apache-2.0 transition) | Anthropic's reference MCP servers (filesystem, git, fetch, sqlite, memory, slack, brave-search, puppeteer, playwright). |
| 18 | `tt-a1i/archify` | 88,550 | Deliverable / architecture comms | MIT | Source-backed interactive architecture diagrams + one-page explainers with numbered citations — the classic FDE deliverable ("here's how your system will look"). |
| 19 | `unclecode/crawl4ai` | 86,153 | Info gathering | — | LLM-native crawler; the local/open alternative to Firecrawl for prototypes that must not call a cloud API. |
| 20 | `netdata/netdata` | 81,115 | Monitoring | — | Full-stack observability with AI agents; MCP surface for querying a customer's live stack. |
| 21 | `dair-ai/Prompt-Engineering-Guide` | 79,486 | Cross-vertical (reference) | — | Reference material, not an installable skill. Use as background reading, not as a deployable asset. |

> Row 21 is shown because the literal "20" cut falls between rows 20 and 21 of the merged ranking; keeping it visible avoids a hidden cut. The two independent passes disagreed on composition (the second pass surfaced `obra/superpowers`, `openbq-org/OpenBB`, `vanna-ai/vanna`, `googleapis/mcp-toolbox`, `raga-ai-hub/RagaAI-Catalyst`, `awslabs/mcp`, `melgarafael/DeskcommCRM`, `ethanplusai/harvey`, `hashicorp/terraform-mcp-server`, `cossistantcom/cossistant`, `tgoai/tgo` — all API-verified, all in §5).

**Immediately below the cut (verified, FDE-relevant):** `ComposioHQ/awesome-claude-skills` 77,803 (864 `SKILL.md` — the largest actual skill corpus found) · `openbq-org/OpenBB` 74,612 (finance) · `career-ops-hq/career-ops` 76,929 · `virattt/ai-hedge-fund` 64,209 · `microsoft/autogen` 61,546 · `crewAIInc/crewAI` 60,054 · `block/goose` 55,627 · `FlowiseAI/Flowise` 55,522 · `hesreallyhim/awesome-claude-code` 56,401 · `coreyhaines31/marketingskills` **56,319** · `run-llama/llama_index` 52,642 · `K-Dense-AI/scientific-agent-skills` 54,379 · `sickn33/agentic-awesome-skills` 48,431 · `langchain-ai/langgraph` 43,820 · `agno-agi/agno` 42,874 · `github/awesome-copilot` 40,370 · `khoj-ai/khoj` 37,804 · `langfuse/langfuse` 36,303 · `VoltAgent/awesome-agent-skills` 36,276 · `github/github-mcp-server` 33,918 · `topoteretes/cognee` 32,715 · `googleworkspace/cli` 31,835 · `SigNoz/signoz` 32,431 · `anthropics/knowledge-work-plugins` **32,512** · `ComposioHQ/composio` 30,719 · `openai/openai-agents-python` 30,254 · `assafelovic/gpt-researcher` **30,275** · `alirezarezvani/claude-skills` 28,629 · `virattt/dexter` 27,710 · `comet-ml/opik` 22,873 · `AI4Finance-Foundation/FinGPT` 21,455 · `mlflow/mlflow` 28,514 · `AgriciDaniel/claude-seo` 20,014 · `Alibaba-NLP/DeepResearch` 20,076 · `NVIDIA/SkillSpector` 21,185 · `dzhng/deep-research` 19,822 · `arc53/DocsGPT` 18,333 · `Canner/WrenAI` 17,960 · `vanna-ai/vanna` 23,813 · `googleapis/mcp-toolbox` 16,717.

---

## 3. Table B — Vertical radar (the usable answer for FDE)

Each vertical: the highest-value skill repos, ordered by stars within the vertical. "Stars" verified 2026-10-24 unless marked † (secondary source — aggregator page, not re-fetched from the API this session).

### 3.1 Sales / GTM / RevOps

| Repo | Stars | Evidence of substance | FDE use |
|------|------:|------------------------|---------|
| `coreyhaines31/marketingskills` | 56,319 | 46 skills (52 `SKILL.md` counted) incl. `cold-email` (126.8k installs), `sales-enablement` (118k), `revops` (112.7k), `prospecting` (64.4k) | The de-facto marketing+Sales skill pack. Human-tone copy, collateral, lead lifecycle design. |
| `anthropics/knowledge-work-plugins` → `sales` | 32,512 (repo) | 36 skills, MCP connectors: HubSpot, Close, Clay, ZoomInfo, Fireflies, Slack, Notion, Jira. Skills: `account-research`, `call-prep`, `daily-briefing`, `draft-outreach`, `competitive-intelligence`, `create-an-asset`. Commands: `/call-summary`, `/forecast`, `/pipeline-review`. | The only high-star pack where prospecting → outreach → pipeline → forecast is one connected workflow. |
| `alirezarezvani/claude-skills` | 28,629 | **465 `SKILL.md`**, 30+ agents, 70+ commands, 20 domains; Business & Growth pod (customer success, sales engineer, revenue ops) + 8 commercial skills (pricing strategist, deal desk, RFP responder) | Broadest C-level + commercial coverage in one MIT repo. |
| `sergebulaev/linkedin-skills` | 5,130 | LinkedIn content/automation skills | Outbound content prototype for a customer's LinkedIn-based GTM motion. |
| `melgarafael/DeskcommCRM` | 4,831 | Open AI sales OS | CRM-of-record prototype when the customer has no CRM. |
| `zubair-trabzada/ai-sales-team-claude` | 1,464 | **14 `SKILL.md`**, 5 parallel agents; BANT + MEDDIC qualification, buying-committee mapping, PDF pipeline reports | A complete, self-contained sales-agent reference implementation — good template to fork for a customer demo. |
| `filip-michalsky/SalesGPT` | 2,791 | Sales GPT agent kit | **Stale: last push 2024-09-17.** Read as pattern, not as a dependency. |
| `gtmagents/gtm-agents` † | 428 | **245 `SKILL.md`**, Apache-2.0 — sales + marketing + customer success | Lowest-starred, densest GTM skill corpus found. Read it before building a GTM tier. |
| `w95/awesome-claude-corporate-skills` † | 272 | **166 `SKILL.md`**, MIT, role-organized (finance / HR / legal / sales) | Role-based structure worth copying. |
| `sales-skills/sales` † | 53 | ~20 platform skills (Apollo, Lemlist, Clay, Outreach, Salesloft, 11x, AiSDR…) | Pattern worth stealing: one router + one skill per vendor platform. Low stars, high design value. |
| `gtm-skills/gtm` † | 178 | Role playbooks for SDR/AE/Manager/RevOps/CSM, MEDDPICC/SPIN/Challenger/Sandler, industry packs | Methodology breadth per role. |
| `sachacoldiq/ColdIQ-s-GTM-Skills` † | 304 | 137 sales triggers, 34 email templates, 11 GTM plays, Clay enrichment | Signal/trigger-based outbound design. |
| `forcedotcom/sf-skills` | 1,111 | SOQL authoring/optimisation (100-point scoring), validation rules, Apex, org switching, Data Cloud | The CRM-with-real-data case: a customer who says "our pipeline lives in Salesforce". |
| `ethanplusai/harvey` † | 2,409 | Autonomous AI sales agent (MIT) | Outbound autonomy reference. |

### 3.2 Marketing / Growth / SEO / Content

| Repo | Stars | Evidence | FDE use |
|------|------:|----------|---------|
| `coreyhaines31/marketingskills` | 56,319 | Marketing pod inside the same pack | See 3.1. |
| `anthropics/knowledge-work-plugins` → `marketing` | 32,512 (repo) | Connectors: Canva, Figma, HubSpot, Amplitude, Notion, Ahrefs, SimilarWeb, Klaviyo. Skills: content drafting, campaign planning, brand-voice enforcement, competitor briefs, performance reporting. | Marketing-with-data: performance reporting needs a warehouse, and the plugin ships the connectors. |
| `alirezarezvani/claude-skills` | 28,629 | 50 marketing skills in 8 pods: Content, SEO + **AEO** (answer-engine optimisation, citation tracking across 5 LLMs), local SEO/GBP/Map-Pack, CRO, channels, growth, intelligence; 7 top-level landing/LinkedIn skills | AEO/GEO is the 2026-specific gap no other pack covers. |
| `AgriciDaniel/claude-seo` | 20,014 | Standalone SEO skill; also `claude-ads` for LinkedIn Ads measurement/ABM | The deepest single-domain SEO asset in the ecosystem. |
| `kostja94/marketing-skills` † | 1,060 | **172 `SKILL.md`**, MIT | Dense marketing corpus at low star count — high read-value. |
| `nowork-studio/notfair-plugin` † | 4,055 | **48 `SKILL.md`**, MIT, SEO/GEO focus | SEO/GEO plugin pattern. |
| `Ryze-AI-Adgent/open-seo-mcp-skills` | 6,964 | Free SEO MCP + GEO skills: keyword research, rank tracking, audits, backlinks, AI answer tracking | An SEO *MCP server* — gives the agent live SERP data, not just prompts. |
| `irinabuht12-oss/marketing-skills` | 5,559 | Marketing skill set | Secondary pack. |
| `ScrapeCreators/social-media-research-skills` | 4,655 | Social listening / research | Listening-based lead and sentiment prototype. |
| `every-app/open-seo` † | 24,700 | Link prospecting from SERPs/backlinks + outreach drafting | Combined SEO + outbound motion. |
| `gosom/google-maps-scraper` | 6,805 | Google Maps data extraction | Local-business lead lists (common SMB FDE ask). |

### 3.3 Database / Data engineering / Analytics

| Repo | Stars | Evidence | FDE use |
|------|------:|----------|---------|
| `vanna-ai/vanna` | 23,813 | "Chat with your SQL database" (MIT) | The classic text-to-SQL prototype. **Stale-ish: last push 2026-02-02.** |
| `anthropics/knowledge-work-plugins` → `data` | 32,512 (repo) | SQL authoring, statistical analysis, dashboards, validation; connectors Snowflake, Databricks, BigQuery, Definite, Hex, Amplitude | The most-installed path to "write SQL against the customer's warehouse" — the single most common FDE prototype. |
| `alirezarezvani/claude-skills` | 28,629 | `database-designer`, RAG architect, `sql-optimization`, `data` domain skills | DB design + RAG in one repo. |
| `googleapis/mcp-toolbox` | 16,717 | MCP Toolbox for Databases, Apache-2.0 — MCP server for SQL over many DB engines | The production-grade answer to "the customer's DB has no API". **Renamed from `googleapis/genai-toolbox`.** |
| `Canner/WrenAI` | 17,960 | Multi-license, semantic layer over warehouse data | Alternative semantic layer. |
| `wshobson/agents` | 41,627 | Includes `terraform-module-library`, `deployment-pipeline-design`, `python-observability`; broad platform-agent set | Infra-shaped FDE work. |
| `github/awesome-copilot` | 40,370 | Azure DevOps CLI, Bicep preflight, Terraform plan diff analysis | Deployment + DB migration safety for customer environments. |
| `duckdb-skills` † | 499 | Attach DBs, run SQL, explore files, keep session state | Local-first analytics for demos with customer CSVs. |
| `dbt-agent-skills` † | 587 | dbt workflows, project structure, model execution, tests | Analytics-engineering customer. |
| `planetscale/skills` | 135 | 14 skills: safe schema changes via dev branches + PR + deploy requests with revert windows, Vitess/Postgres safety review, query insights, traffic control, scheduled agent loops | **Best-in-class design pattern** (assess → report → execute with approval → automate), low stars. |
| `datavelopers/datavelopers-skills` † | 28 skills | Full data lifecycle: event tracking, ingestion, modeling, SQL/NoSQL/graph modeling, pipeline builder, streaming, data quality, synthetic data, analytics, visualization, experimentation, geospatial, data apps, SQL optimization, ML modeling/deployment, LLM/RAG, OpenTelemetry, data security, **data-incidents**, data-finops, migration | The most complete *methodology* pack for a data-heavy customer. |
| `vaquarkhan/data-engineering-agent-skills` | 59 | 73 workflow skills, 14 platform presets (AWS/Azure/GCP/Databricks/Snowflake/Alibaba…), spec-first `/spec /plan /build /validate /review /backfill /ship` | Repeatable delivery pipeline for data customers. |
| `modelcontextprotocol/servers` (sqlite/postgres servers) | 91,538 | Reference `sqlite` + `postgres` MCP servers | Minimal local-data connectors. |

### 3.4 Monitoring / Observability / Incident response

| Repo | Stars | Evidence | FDE use |
|------|------:|----------|---------|
| `netdata/netdata` | 81,115 | "Full-stack observability" with AI agents; MCP | Live-stack introspection for a customer demo. |
| `langfuse/langfuse` | 36,303 | Agent evals + observability (trace, evaluate, improve) | The AI-specific observability layer FDEs must show to convince a customer their agent is safe. |
| `SigNoz/signoz` | 32,431 | OTel-native observability + SigNoz MCP + AI teammate | MCP-accessible OTel platform. |
| `mlflow/mlflow` | 28,514 | Debug, evaluate, monitor production AI apps, cost control | Model/agent ops. |
| `comet-ml/opik` | 22,873 | Apache-2.0, LLM observability/eval | Opik vs Langfuse vs Phoenix head-to-head. |
| `Arize-ai/phoenix` | 11,981 | NOASSERTION, tracing + eval for LLM apps | Third LLM-observability option. |
| `Helicone/helicone` | 6,235 | Apache-2.0 LLM gateway/observability | Proxy-level visibility. |
| `raga-ai-hub/RagaAI-Catalyst` | 16,178 | Apache-2.0, agent eval + observability | Agent-quality gate. **Stale-ish: last push 2026-02-11.** |
| `ccfos/nightingale` | 13,384 | Self-hosted alerting for metrics/logs/databases + built-in AI agent + MCP | Alerting with an agent in the loop. |
| `Tracer-Cloud/opensre` | 12,437 | "Build your own AI SRE agents" toolkit | SRE-agent patterns. |
| `HolmesGPT/holmesgpt` † | 3,677 | CNCF Sandbox SRE agent | Incident triage prototype. |
| `grafana/skills` | 290 | 44 official skills: PromQL, Loki, Tempo, Mimir, Pyroscope, k6, on-call/IRM | **The single best monitoring skill pack by official-vendor authority**, despite tiny star count. |
| `Dynatrace/dynatrace-for-ai` | 167 | DQL language, RED metrics, RUM, traces, k8s/AWS/Azure/GCP, problems/RCA, alerting lifecycle, predictive analytics, GenAI observability (token/cost/tool-call analytics), + prompts (`dt-incident-response`, `dt-health-check`) | The most complete vendor observability skill set — including GenAI-specific signals. |
| `monte-carlo-data/mc-agent-toolkit` | 93 | Bundled plugin: asset health, incident response workflow (triage→RCA→remediation), automated triage, monitoring advisor, **monitors-as-code YAML**, tune monitor, prevent (dbt/SQL pre-edit blast radius), storage cost analysis, performance diagnosis | **Data-observability** specifically — the monitoring vertical for data customers. |
| `zavora-ai/skill-observability-monitoring` † | — | 28 observability tools orchestrated into SRE workflows across Datadog / Grafana Cloud / New Relic, cross-MCP Slack/ITSM/CICD/env | Cross-vendor SRE workflow. |
| `agamm/awesome-ai-sre` † | 124 | CC0-1.0 curated AI-SRE list | — |
| `sinzin91/awesome-sre-skills` † | 17 | Curated list of SRE/observability/IR skills incl. official Datadog, Coralogix, OpenSearch, Grafana, Checkly, PagerDuty, Axiom, kstack | Best single map of the monitoring vertical. |
| `pro-deploy/aegil` † | 104 | Autonomous SRE agent | Lowest star count, real agent. |
| `wshobson/agents` → `python-observability` / `terraform-module-library` | 41,627 | Prometheus/Grafana RED+USE, SLO implementation, distributed tracing; CI/CD gates | Observability-as-code at deployment time. |

### 3.5 Information gathering / Research / Knowledge

| Repo | Stars | Evidence | FDE use |
|------|------:|----------|---------|
| `firecrawl/firecrawl` + `firecrawl/firecrawl-workflows` | 194,836 (206 †) | Scrape/search/crawl MCP; workflow skills: `firecrawl-lead-gen` (31.4k installs), `firecrawl-lead-research`, `firecrawl-company-directories` (YC/Crunchbase/Product Hunt/G2 → JSON/CSV/CRM) | The reference implementation of "research → structured lead data → CRM". |
| `punkpeye/awesome-mcp-servers` | 96,811 | The MCP catalog | Find the connector for the customer's tool. |
| `unclecode/crawl4ai` | 86,153 | Open LLM crawler | No-cloud-API data gathering. |
| `morluto/rea` | 376,072 | Binary/app/HAR/SQLite inspection | Competitive teardown + "how does their feature work". |
| `assafelovic/gpt-researcher` | 30,275 | Planner/execution/publisher architecture, source scoring, 20+ sources, MCP client mode, installable as a Claude skill | Deep-research reference agent; citation discipline. |
| `alirezarezvani/claude-skills` | 28,629 | Academic research stack (litreview, grants, dossier, patent, syllabus, deep-research) + **Research Operations** (clinical-research, research-finance, market-research, product-research, interview-mapper) | The strongest research-ops methodology pack. |
| `Alibaba-NLP/DeepResearch` | 20,076 | Apache-2.0 deep-research agent | Second reference implementation. |
| `dzhng/deep-research` | 19,822 | MIT deep-research agent | Third reference implementation. |
| `Orchestra-Research/AI-Research-SKILLs` | 13,897 | Research skills set | Secondary option. |
| `muratcankoylan/Agent-Skills-for-Context-Engineering` | 18,198 | Context-engineering skill set | Retrieval/context discipline for RAG prototypes. |
| `jordan-gibbs/hyperresearch` | 4,000 | 16-step tier-adaptive pipeline, cite-checker, independence audit, 250+ sources, persistent vault (SQLite+markdown), MCP server with 13 tools, resume-after-crash, OpenAlex/Crossref/CORE/DOAB/ClinicalTrials/SEC EDGAR/FRED | The most *engineering-mature* research agent (resume, vault, verification gates). |
| `wanshuiyin/Auto-claude-code-research-in-sleep` † | 17,977 | ARIS: autonomous ML research loops, Markdown-only skills | Overnight research prototyping. |
| `arc53/DocsGPT` | 18,333 | MIT, document Q&A | Customer-docs assistant prototype. |
| `khoj-ai/khoj` | 37,804 | AGPL-3.0, self-hosted AI second brain over your notes/docs | Enterprise-search prototype. |

### 3.6 Support / Customer success

| Repo | Stars | Evidence | FDE use |
|------|------:|----------|---------|
| `anthropics/knowledge-work-plugins` → `customer-support` | 32,512 (repo) | Ticket triage, response drafting, escalation packaging, customer-context research, resolved-issue → KB article; connectors Intercom, HubSpot, Guru, Jira, Slack, Notion | The strongest support vertical in the ecosystem, because it closes the loop into the KB. |
| `career-ops-hq/career-ops` | 76,929 | Not support — but the reference **human-in-the-loop agent product**: "drafts only, never sends/submits", local-first, explicit HITL guarantee in code, ATS PDF generation, portal scanning with Playwright liveness verification, rejection-pattern analytics, TUI dashboard | **The best FDE reference implementation for "agent proposes, human disposes"** — exactly the governance posture enterprise customers demand. |
| `cossistantcom/cossistant` | 736 | AGPL-3.0, customer support platform | Support is thin — expect to hand-build. |
| `tgoai/tgo` | 640 | NOASSERTION (modified Apache-2.0), AI agent customer-service platform | Same. **Stale-ish: last push 2026-04-28.** |
| `huabeitech/agent-desk` | 286 | Apache-2.0 | Same. |
| `openai/openai-support-agent-demo` | 205 | Official demo | Reference implementation. |
| `citizenjosh/customer-success-skills` | 14 | CS skills | Low star, correct domain. |
| `alirezarezvani/claude-skills` | 28,629 | `customer success`, knowledge-ops, internal-comms | Secondary coverage. |

### 3.7 DevOps / Cloud / Infrastructure

| Repo | Stars | Evidence | FDE use |
|------|------:|----------|---------|
| `n8n-io/n8n` | 208,477 | 400+ integrations, self-hostable | Customer-system integration glue. |
| `addyosmani/agent-skills` | 110,107 | `ci-cd-and-automation` (12.6k installs), production-grade engineering skills | Delivery quality baseline. |
| `github/awesome-copilot` | 40,370 | `azure-deploy`/`azure-prepare`/`azure-storage` (≈465k installs), Azure DevOps CLI, Bicep preflight, Terraform plan diff analyzer | Cloud delivery reference. |
| `wshobson/agents` | 41,627 | `terraform-module-library` (12.7k installs), `deployment-pipeline-design` (10.7k installs), `python-observability` (8.6k installs) | Infra + observability in one agent set. |
| `awslabs/mcp` | 9,823 | Apache-2.0, AWS MCP server collection | AWS customer connectivity. |
| `hashicorp/terraform-mcp-server` | 1,553 | MPL-2.0, official Terraform MCP | IaC as a tool the agent can call. |
| `cloudflare/mcp-server-cloudflare` | 4,411 | Apache-2.0 | — |
| `containers/kubernetes-mcp-server` | 2,180 | Apache-2.0 | The real K8s MCP server (`kubernetes-sigs/mcp-server-kubernetes` is a 404). |
| `docker/mcp-gateway` | 1,613 | MIT | — |
| `stripe/agent-toolkit` | 1,965 | MIT, **50 `SKILL.md`** | Payments skills for a customer selling through the agent. |
| `modelcontextprotocol/registry` | 7,404 | NOASSERTION, official MCP registry | Discover/validate an MCP server. |
| `hashicorp/agent-skills` | 907 | Official Terraform HCL style guide skill | Terraform hygiene. |
| `BagelHole/DevOps-Security-Agent-Skills` | 1,173 | **163 `SKILL.md`**, MIT — K8s/Terraform/compliance | Dense DevOps skill corpus. |
| `microsoft/mcp` | 3,799 | MIT | — |
| `microsoft/agent-framework` | 14,302 | MIT | — |
| `itsmostafa/aws-agent-skills` | 1,169 | 18 core AWS services | AWS customer. |
| `supabase/agent-skills` | 2,919 | Supabase-specific | — |
| `google/agents-cli` † | 5,200 | ADK skills incl. deploy (`google-agents-cli-deploy`, 56.7k installs), eval, scaffold | — |

### 3.8 Finance (added in second pass)

| Repo | Stars | Evidence | FDE use |
|------|------:|----------|---------|
| `openbq-org/OpenBB` | 74,612 | NOASSERTION (LICENSE states Apache-2.0) — open data platform for analysts, quants and AI agents | Data/finance terminal. **Renamed from `OpenBB-finance/OpenBB`.** |
| `anthropics/knowledge-work-plugins` → `finance` | 32,512 (repo) | Journal entries, reconciliation, financial statements, variance analysis, close management, audit support; connectors Snowflake, Databricks, BigQuery | The finance workflow pack. |
| `virattt/ai-hedge-fund` | 64,209 | MIT, trading-agent simulation | Trading, not FDE prototyping. |
| `virattt/dexter` | 27,710 | MIT, financial research agent | — |
| `AI4Finance-Foundation/FinGPT` | 21,455 | MIT, finance LLM | — |
| `agiprolabs/claude-trading-skills` † | 437 | **68 `SKILL.md`**, MIT, trading/DeFi | Low star, real domain depth. |
| `alirezarezvani/claude-skills` → `finance` | 28,629 | Financial analyst (DCF, budgeting), SaaS metrics coach, stock-analysis with 26 sector playbooks, month-end-close with reconciliation proof | Best finance *methodology* pack. |

### 3.9 Cross-vertical orchestration / frameworks

| Repo | Stars | Note |
|------|------:|------|
| `n8n-io/n8n` | 208,477 | Integration runtime |
| `langgenius/dify` | 159,415 | LLM app platform |
| `langflow-ai/langflow` | 155,973 | MIT, visual agent builder |
| `langchain-ai/langchain` | 148,357 | Framework |
| `paperclipai/paperclip` | 106,765 | Multi-agent ops dashboard + cost tracking |
| `thedotmack/claude-mem` | 102,703 | Cross-session memory |
| `browserbase/stagehand` | 25,798 | MIT, browser automation |
| `activepieces/activepieces` | 25,196 | NOASSERTION, open Zapier alternative |
| `mastra-ai/mastra` | 29,048 | NOASSERTION, TS agent framework |
| `topoteretes/cognee` | 32,715 | Memory/knowledge graph layer for agents |
| `crewAIInc/crewAI` | 60,054 | Role-based multi-agent — maps well to FDE "team" demos |
| `microsoft/autogen` | 61,546 | API reports **CC-BY-4.0** — unusual for code; verify in-repo before use |

---

## 4. Table C — Skill packs & registries (where the SKILL.md files live)

`SKILL.md` counts below are from `GET /git/trees/HEAD?recursive=1` in the second pass. Install counts are the better signal but come from aggregator pages — **secondary, directional only**.

| Repo | Stars | `SKILL.md` count | License | Notable per-skill install evidence |
|------|------:|------------------:|---------|-----------------------------------|
| `obra/superpowers` | 304,476 | **15** | MIT | Real shipped skills (brainstorming, dispatching-parallel-agents) |
| `anthropics/skills` | 183,421 | **20** | **none detected** | Reference implementation; docx/pdf/pptx/xlsx are source-available, not Apache-2.0 |
| `punkpeye/awesome-mcp-servers` | 96,811 | 0 (MCP list) | MIT | Largest MCP server index |
| `ComposioHQ/awesome-claude-skills` | 77,803 | **864** | **none detected** | Largest actual `SKILL.md` corpus found; `lead-research-assistant` 5.5k installs |
| `hesreallyhim/awesome-claude-code` | 56,401 | 0 (index) | NOASSERTION | Curated index incl. plugins |
| `affaan-m/ECC` | 287,705 | 311 (`skills/`) / 1,062 repo-wide | MIT | `security-review` 18,189 · `golang-patterns` 15,530 · `backend-patterns` 15,123 · `frontend-patterns` 14,935 · `coding-standards` 14,797 · `tdd-workflow` 12,313 · `lead-intelligence` 4.4k. **One install method per harness** — installing twice duplicates skills/hooks/config. |
| `K-Dense-AI/scientific-agent-skills` | 54,379 | **177** | MIT | Domain/science skills pack |
| `alirezarezvani/claude-skills` | 28,629 | **465** | MIT | Business + marketing + finance + research skills |
| `VoltAgent/awesome-claude-code-subagents` | 25,990 | 0 (subagents) | MIT | 100+ subagents |
| `VoltAgent/awesome-agent-skills` | 36,276 | catalog | MIT | Discovery index |
| `gtmagents/gtm-agents` | 428 | **245** | Apache-2.0 | Sales + marketing + CS |
| `kostja94/marketing-skills` | 1,060 | **172** | MIT | Marketing corpus |
| `w95/awesome-claude-corporate-skills` | 272 | **166** | MIT | Role-organized: finance / HR / legal / sales |
| `BagelHole/DevOps-Security-Agent-Skills` | 1,173 | **163** | MIT | K8s / Terraform / compliance |
| `agiprolabs/claude-trading-skills` | 437 | **68** | MIT | Trading / DeFi |
| `nowork-studio/notfair-plugin` | 4,055 | **48** | MIT | SEO / GEO |
| `stripe/agent-toolkit` | 1,965 | **50** | MIT | Payments skills |
| `zubair-trabzada/ai-sales-team-claude` | 1,464 | **14** | MIT | BANT / MEDDIC |
| `coreyhaines31/marketingskills` | 56,319 | 46 (counted 52) | MIT | `cold-email` 126.8k · `sales-enablement` 118k · `revops` 112.7k · `prospecting` 64.4k |

**Install commands** (skills.sh CLI, consistent across all of the above):
```bash
npx skills add <owner>/<repo>                 # whole pack
npx skills add <owner>/<repo> --skill <name>  # one skill
npx skills use <owner>/<repo>@<skill> --agent codex   # try without installing
```

---

## 5. Second pass — the independent agent's top 20, and how the two passes differ

The background agent ran its own sweep with the same primary-source method. It produced a *different* top-20 because it filtered for repos that actually ship skills or MCP surfaces (excluding pure apps and frameworks), and because it searched skill-framework repos directly rather than relying on topics. Its list, all API-verified:

| # | Repo | Stars | Vertical | License | `SKILL.md` |
|---|------|------:|----------|---------|-------------:|
| 1 | `obra/superpowers` | 304,476 | Skills framework | MIT | 15 |
| 2 | `n8n-io/n8n` | 208,477 | Orchestration | NOASSERTION (fair-code) | — |
| 3 | `anthropics/skills` | 183,423 | Skills library | none detected | 20 |
| 4 | `langgenius/dify` | 159,414 | Orchestration | NOASSERTION (Dify OSL) | — |
| 5 | `browser-use/browser-use` | 119,021 | Info gathering / web | MIT | — |
| 6 | `modelcontextprotocol/servers` | 91,540 | MCP | NOASSERTION (MIT→Apache-2.0) | — |
| 7 | `openbq-org/OpenBB` | 74,612 | Finance | NOASSERTION (states Apache-2.0) | — |
| 8 | `coreyhaines31/marketingskills` | 56,321 | Marketing | MIT | 52 |
| 9 | `langfuse/langfuse` | 36,306 | Monitoring / observability | NOASSERTION (MIT core + commercial `ee/`) | — |
| 10 | `assafelovic/gpt-researcher` | 30,275 | Info gathering / research | Apache-2.0 | — |
| 11 | `vanna-ai/vanna` | 23,813 | Database / analytics | MIT | — |
| 12 | `AgriciDaniel/claude-seo` | 20,020 | Marketing / SEO / GEO | MIT | — |
| 13 | `googleapis/mcp-toolbox` | 16,717 | Database / analytics | Apache-2.0 | — |
| 14 | `raga-ai-hub/RagaAI-Catalyst` | 16,178 | Monitoring / agent eval | Apache-2.0 | — |
| 15 | `awslabs/mcp` | 9,823 | DevOps / cloud | Apache-2.0 | — |
| 16 | `melgarafael/DeskcommCRM` | 4,831 | Sales / CRM | MIT | — |
| 17 | `ethanplusai/harvey` | 2,409 | Sales / outbound | MIT | — |
| 18 | `hashicorp/terraform-mcp-server` | 1,553 | DevOps / IaC | MPL-2.0 | — |
| 19 | `cossistantcom/cossistant` | 736 | Support | AGPL-3.0 | — |
| 20 | `tgoai/tgo` | 640 | Support | NOASSERTION (modified Apache-2.0) | — |

**Delta between the passes:**
- **Pass 2 caught `obra/superpowers` (304,476) — the single biggest miss in Pass 1.** Pass 1's topic sweep (`topic:agent-skills`, `topic:claude-skills`) did not surface it. Lesson recorded in §1.
- Pass 2's list is *stricter* about what counts as a "skill" (excludes `morluto/rea`, `firecrawl`, `langchain-ai/langchain`, `open-webui`, `paperclip`), but it also *includes* non-skill platforms (`dify`, `n8n`, `OpenBB`, `langfuse`). Pass 1's list is looser but richer on deliverables and skill packs.
- Pass 2 uniquely surfaced the **data/database** vertical (`vanna`, `mcp-toolbox`, `WrenAI`) and the **support** vertical (`cossistant`, `tgo`, `agent-desk`) — both are near-absent from Pass 1's sweep.
- Star drift within the ~30-minute session: `anthropics/skills` 183,419→183,423; `AgriciDaniel/claude-seo` 20,015→20,020; `coreyhaines31/marketingskills` 56,319→56,321; `langgenius/dify` 159,415→159,414 (**down 1** — stars can be unstarred). Treat all counts as a snapshot, not a scoreboard.

---

## 6. Gaps, caveats and honest caveats

1. **Star counts are a moving target.** Everything here was fetched 2026-10-24 ~13:20–13:45Z. Several repos gained 1,000–2,500 stars in the 24h before the snapshot (e.g. `ponytail` +1,343, `cloudflare/security-audit-skill` +2,573). Stars can also go *down*.
2. **Verification method differs by row.** Rows marked ✔ were confirmed by `GET /repos/{owner}/{repo}` in this session. Rows marked † were confirmed via `GET /search/repositories` (still the GitHub API, same `stargazers_count` field) or read from an aggregator page and **not** re-fetched. §5's table is from the independent second pass and is `/repos/`-verified.
3. **GitHub API rate limit (60 req/h unauthenticated) was exhausted** during collection; a first pass of ~25 repo lookups was blocked with HTTP 403 before the search-API fallback was used. Four repos (`n8n-io/n8n`, `browser-use/browser-use`, `microsoft/azure-skills`, `googleworkspace/cli`) were verified via search API only.
4. **Install counts are secondary** and were taken from skills.sh / skillselion / claudeskills.info / mcpmarket listings, not from a first-party API. Directional only; the skillselion post itself warns its numbers are "a ranking, not a scoreboard".
5. **"Skills" is a loose category.** A repo can be a single `SKILL.md`, a 864-file kit, an MCP server collection, an app, or a framework. §2 mixes them because the ecosystem does; where it matters, the "FDE use" column states which kind it is.
6. **Licensing gotchas — check before adoption.** Nine rows report `NOASSERTION`: n8n, Dify, Langfuse, OpenBB, `modelcontextprotocol/servers`, Tgo (all source-available with added conditions, **not OSI-compliant**); `anthropics/skills`, `ComposioHQ/awesome-claude-skills`, `travisvn/awesome-claude-skills` have **no root LICENSE file at all**. `microsoft/autogen` reports CC-BY-4.0 from the API, which is unusual for code — verify in-repo.
7. **Renames to track.** `OpenBB-finance/OpenBB` → `openbq-org/OpenBB`; `googleapis/genai-toolbox` → `googleapis/mcp-toolbox`. `Graphify-Labs/graphify` (134,174 stars) currently resolves to a README whose own install instructions point at `safishamsi/graphify`. Verify the canonical URL before installing.
8. **404s worth recording (so nobody re-checks):** `sentry-io/sentry-mcp`, `sentry-io/mcp` (Sentry ships MCP as the npm `@sentry/mcp-server`, no comparable first-party GitHub repo), `kubernetes-sigs/mcp-server-kubernetes` (the real one is `containers/kubernetes-mcp-server`). **No Salesforce/HubSpot CRM MCP server has meaningful traction** — the only match (`zavora-ai/mcp-crm`) has 3 stars.
9. **Staleness flags** (`pushed_at` from the same API payload): `filip-michalsky/SalesGPT` 2024-09-17 (effectively dead) · `vanna-ai/vanna` 2026-02-02 · `raga-ai-hub/RagaAI-Catalyst` 2026-02-11 · `tgoai/tgo` 2026-04-28 · `anthropics/skills` 2026-10-09.
10. **Thin verticals are a finding, not a gap in the search.** Support (top projects <750 stars), classic SRE/incident-response (all sub-150 stars), and finance (skews to trading, not FDE prototyping) are genuinely under-served. Monitoring resolves to *LLM/agent* observability (Langfuse, RagaAI, Opik, Phoenix) rather than classic SRE.
11. **Some highly-starred repos are not FDE-relevant** (e.g. `dair-ai/Prompt-Engineering-Guide`, `cathrynlavery/diagram-design`, `blader/humanizer`, `reactive-resume/reactive-resume`) and are excluded from §3.

---

## 7. [判断与建议] Judgment & recommendations (not verified fact)

- **Do not build the vault's FDE tier from a star ranking.** Build it as **one reference pack per vertical** (sales, marketing, data, monitoring, research) and treat the mega-packs as *sources to mine*, not as dependencies. The 311-file `ECC` kit is unusable as a unit; `knowledge-work-plugins` is usable because it is split into role-scoped plugins with connectors already wired. `alirezarezvani/claude-skills` (465 `SKILL.md`) and `gtmagents/gtm-agents` (245) are the best *mining* sources — dense, low-star, MIT/Apache-2.0.
- **The highest-leverage FDE adoption blocker is not skill quality — it is customer-system connectivity.** Skills that need a live CRM/warehouse/Slack (sales, data, support) only work once the MCP connector exists. `punkpeye/awesome-mcp-servers`, `modelcontextprotocol/servers`, `googleapis/mcp-toolbox`, `awslabs/mcp` and `containers/kubernetes-mcp-server` are therefore upstream dependencies of the vertical skills, not optional extras. Note that no serious CRM MCP exists (3 stars) — that is a genuine gap, and Salesforce skill support is the *skills* path (`forcedotcom/sf-skills`, 1,111 stars) rather than an MCP path.
- **Monitoring is the best available white-space.** There is no well-starred, vendor-neutral observability skill pack. `zavora-ai/skill-observability-monitoring` (Datadog + Grafana + New Relic, 28 tools) plus `monte-carlo-data/mc-agent-toolkit` (monitors-as-code) plus `grafana/skills` (PromQL depth) is the closest thing to a composite — and that composite does not exist yet in one place. Building it would be a genuine differentiator for the vault.
- **"Star count" is a poor curation signal inside a mono-repo.** Recommend the vault index entries carry `stars` + `installs` + `pushed_at` + `license` — a 1,000-star repo with a 14-month-old `pushed_at` (SalesGPT) is dead weight regardless of rank, and nine of the top rows are not OSI-licensed.
- **Fix the discovery method, not just the list.** This session's own miss (`obra/superpowers`, #1 by stars, invisible to topic search) is the argument for running the radar with at least two independent query strategies — topic sweeps *and* direct skill-repo lookups — and diffing them. The `refresh-stars.ps1` script in this directory handles the topic sweep; add a fixed list of known skill-framework repos to cover the other half.
- **Re-run this radar quarterly, not more often.** Star deltas in this ecosystem move in the thousands per day; the *shape* of the vertical landscape moves in months. A monthly automated diff of this table is cheap (one search API call per topic) and would keep the vault honest.

---

## 8. Sources

| ID | Source | Level | Used for |
|----|--------|-------|----------|
| S1 | GitHub REST API — `https://api.github.com/repos/{owner}/{repo}` (`stargazers_count`, `license.spdx_id`, `pushed_at`, `description`) | 1 | Star counts, licenses, last-push dates for ✔ rows |
| S2 | GitHub REST API — `https://api.github.com/search/repositories?q=…&sort=stars` (`items[].stargazers_count`) | 1 | Topic sweeps: `topic:agent-skills`, `topic:claude-skills`, `topic:ai-agents`, `topic:mcp`, `skill in:name agent`, `topic:observability`, `topic:sre` |
| S3 | GitHub REST API — `https://api.github.com/repos/{owner}/{repo}/git/trees/HEAD?recursive=1` (`SKILL.md` paths) | 1 | `SKILL.md` counts for §5 and Table C |
| S4 | Repo READMEs via `raw.githubusercontent.com` (`morluto/rea`, `career-ops-hq/career-ops`, `tt-a1i/archify`, `Graphify-Labs/graphify`) | 1 | Functional description of top-4 repos (claims taken from the project's own text) |
| S5 | `anthropics/knowledge-work-plugins` README + `sales/` plugin README | 1 | Plugin roster, connector lists, skill/command inventories |
| S6 | `anthropics/skills` README | 1 | Skill-library scope and licensing caveats (Apache-2.0 vs source-available docx/pdf/pptx/xlsx) |
| S7 | `monte-carlo-data/mc-agent-toolkit` README | 1 | Data-observability skill inventory |
| S8 | `planetscale/skills` README | 1 | 14-skill assess→report→execute→automate design |
| S9 | `sinzin91/awesome-sre-skills`, `agamm/awesome-ai-sre` READMEs | 2 | SRE/observability skill landscape map |
| S10 | `skills.sh` / skillselion / claudeskills.info / mcpmarket listings | 3 (reference only) | Install counts per skill; skill inventory counts. **Secondary — directional only.** |
| S11 | DEV.to "Everything Claude Code has 285,000 GitHub stars…" (2026-10-21) | 3 (reference only) | ECC 311 SKILL.md / 1,062 repo-wide file count; install-vs-stars disparity; install commands; one-install-method-per-harness rule |
| S12 | github.locker / linkly.ai / appsgit.com leaderboards | 3 (reference only) | Cross-checking star counts; delta figures |
| S13 | `coreyhaines31/marketingskills`, `alirezarezvani/claude-skills`, `sergebulaev/linkedin-skills`, `zubair-trabzada/ai-sales-team-claude`, `forcedotcom/sf-skills`, `grafana/skills`, `Dynatrace/dynatrace-for-ai` READMEs | 1 | Skill inventories per vertical |
| S14 | Second independent verification pass (background research agent), same GitHub API methods, 2026-10-24 | 1 | §5 table, `SKILL.md` counts, renames, 404 records, staleness flags, licensing assertions |

---

> 免责声明：本输出由 AI 辅助生成，仅用于信息整理与研究参考，不构成专业意见或决策依据。
