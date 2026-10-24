# Tool: ericosiu/ai-marketing-skills

**Runtime storage status: setup only.** No shipped adapter admits this tool's
complete file output. Do not launch collection, login or persistence until every
child-file write meets the [external-tool storage requirements](../../../../DATA.md#external-tool-storage).
`resolve_directory` alone does not authorize writes; examples below are setup guidance.

- **Domain(s):** ready-skills (also: none, skill bundle, not an MCP)
- **Barrier route:**, (no data barrier; it's prompt/skill scaffolding) · **Source tier:** L2 · **Ready MCP:** no, installs as Claude *skills* via `git clone` + per-skill dependencies (**NOT** `npx skills add`); runtime integration still requires verification
- **Cost:** free (MIT) [github.com/ericosiu/ai-marketing-skills, gh-api 2026-06]
- **Repo / Provider:** github.com/ericosiu/ai-marketing-skills, `ericosiu/ai-marketing-skills (3.5k★, gh-api 2026-06)`; active (pushed 2026-06-07, not archived, MIT)
- **Top pick for its domain:** no (specialist that fills the business-ops gap, not the default marketing reach)

## What it does / when to pick it
22+ install-and-go skills weighted toward **business-ops**: finance-ops, sales-pipeline, revenue-intelligence, outbound-engine, lead-dossier (plus growth-engine, content-ops, seo-ops, conversion-ops, autoresearch, deck-generator). **Decision rule:** the shard flags marketing/SEO/content skills as *abundant* but **business-ops depth + arbitrage as scarce**, pick this bundle specifically to fill that scarce business-ops gap (revenue intel, sales-pipeline, finance-ops, structured outbound). For the general marketing/competitor/content workflow shell, go to the shard default `coreyhaines31/marketingskills`; for SEO depth, `claude-seo`. Do **not** reach here first for plain copy/ads/email, it's the heavier ops-oriented sibling.

## Install
**Not** an `npx skills add` bundle (unlike `coreyhaines31/marketingskills`), it is a Python repo you clone and wire per-skill:
```bash
git clone https://github.com/ericosiu/ai-marketing-skills.git
cd ai-marketing-skills/<skill-name>      # e.g. revenue-intelligence
pip install -r requirements.txt
```
Read the selected category's README, requirements and `.env.example` to identify its inputs. Before supplying real keys or CRM data, resolve an existing PRIVATE versioned runtime with `tools/private_inventory.py` from the full Market checkout, for example `resolve_directory("runtime/ai-marketing-skills")`. Verify the installed version's supported configuration and output options, and use an adapter that points every config, cache, session and output to that absolute private runtime. If the category only supports files beside its public source and no safe adapter exists, keep it in setup status. The public clone must remain uninitialized. Per-domain references: `reference/domains/ready-skills.md` and `reference/volatile/pricing-install.md → ready-skills`; host mechanics: `reference/install-guide.md`.

## Auth / keys
Business-ops categories such as revenue-intelligence, outbound and lead-dossier need data-source, CRM or enrichment credentials. Have the user enter these through the supported private configuration path, without returning values to the transcript. Real inputs and generated ops reports belong in the PRIVATE versioned companion and its approved backup. `.gitignore` does not make a public clone a safe runtime directory. The available data sources determine which business questions the skill can answer.

## Usage, call examples
After dependency installation and private adapter setup, reconnect the selected host if needed. Verify a read operation with the intended CRM or finance source before invoking the chosen category. Store source observations and generated reports through the PRIVATE runtime. Treat the output as a draft until its figures are checked against those source observations; installation alone does not establish usable data access.

## General experience & gotchas (踩坑)
- **Install trap: this is NOT `npx skills add`**, the install path is `git clone` plus per-skill dependencies. Trying the npx path silently does nothing; you must clone and pip-install per skill.
- **Per-skill setup, not one install**, each category declares its own dependencies and configuration inputs; there's no single "install everything" command. Set up only the skill you need.
- **Private configuration is required.** A supported env-file option or adapter must load credentials outside the public clone. Recheck that all runtime writers use the same PRIVATE versioned destination before launch.
- **Python repo, not packaged skills**, heavier than the pip-free `coreyhaines31` bundle; the payoff is the scarce business-ops coverage, so only reach here when that's the actual need.
- The license and repository facts above are dated 2026-06. Recheck activity and installation requirements when adopting a category.

## Failure signals & fallback
Failure looks like: `npx skills add` doing nothing (wrong install path, use git clone); a skill erroring on a missing private configuration key; or ungrounded ops output (no CRM/finance source wired). **Fallbacks:** general marketing/competitor/content shell → `coreyhaines31/marketingskills`; SEO depth → `claude-seo`; packaged 6-stage market-research pipeline → `ishwarjha/claude-marketing-research-skill`; first-party CRM data behind it → `hubspot-mcp` / `salesforce-mcp` / `apollo`; can't find a skill → discovery via `ComposioHQ/awesome-claude-skills` catalog.

## Last verified: 2026-06
