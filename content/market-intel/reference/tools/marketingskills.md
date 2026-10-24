# Tool: coreyhaines31/marketingskills

- **Domain(s):** ready-skills (also: none, this is a skill bundle, not an MCP)
- **Barrier route:**, (no data barrier; it's prompt/skill scaffolding) · **Source tier:** L1 · **Ready MCP:** no, installs as Claude *skills* via `npx skills add`
- **Cost:** free (MIT) [github.com/coreyhaines31/marketingskills, gh-api 2026-06]
- **Repo / Provider:** github.com/coreyhaines31/marketingskills, `coreyhaines31/marketingskills (46.9k★, gh-api 2026-06)`; active (pushed 2026-06-05, not archived, MIT)
- **Top pick for its domain:** yes (the default for marketing / competitor / content)

## What it does / when to pick it
~40 install-and-go marketing skills: customer-research, competitor-profiling, programmatic-seo, directory-submissions, copywriting, ads, email. **Decision rule:** this is the *default first reach* for any marketing / competitor / content ask where the user wants something ready-made rather than hand-wired MCPs (shard "Default pick"). Pick it for the marketing *workflow shell*; pick `claude-seo` instead when the job is purely SEO depth, and `ishwarjha/claude-marketing-research-skill` for a packaged 6-stage research pipeline.

## Install
`npx skills add coreyhaines31/marketingskills` (skill install, **not** an MCP, no `claude mcp add`, no transport, no key). Exact command lives in shard `reference/domains/ready-skills.md` and `reference/volatile/pricing-install.md → ready-skills`. Skills take effect on session restart, same as MCPs. L0 mechanics: `reference/install-guide.md`.

## Auth / keys
None for the skills themselves, they are prompt/workflow scaffolding. **The real ceiling is the data MCPs you wire behind them** (shard "Judgment": the skill is a shell; the work moved to MCP wiring + auth). A competitor-profiling skill is only as good as the SERP/web MCP (Tavily, Bright Data) you connect. No secret-hygiene note needed here (the bundle holds no keys).

## Usage, call examples
After install the skills appear as invokable slash-style skills (e.g. customer-research, competitor-profiling, programmatic-seo). Minimal flow: install → restart → invoke the skill on your topic → it drives a structured workflow, calling whatever search/scrape MCPs you have connected. Treat output as a *draft scaffold* to be grounded against real data, not finished facts.

## General experience & gotchas (踩坑)
- **The skill is a shell, its ceiling = which data MCPs you connect** (shard). Installed alone, it produces structured-but-ungrounded marketing copy; the value comes from pairing it with web/SEO/social MCPs.
- **`npx skills add` not `npx skills install`**, and it pulls a large bundle (~40 skills); skill-list clutter is the cost. Prune skills you won't use.
- ecosystem reality (shard): marketing/SEO/content skills are *abundant and install-直用*; **business-ops depth + arbitrage are scarce**, don't expect this bundle to do P&L/fee-calc/arbitrage logic; that still needs MCP assembly (or `ericosiu/ai-marketing-skills` for the business-ops gap).
- Free MIT, 32.6k★, actively maintained (pushed 2026-06), safe to recommend without a staleness caveat.

## Failure signals & fallback
Failure looks like: ungrounded/generic output (no data MCP connected), or a missing capability (business-ops/arbitrage). **Fallbacks:** SEO-specific depth → `claude-seo`; packaged market-research pipeline → `ishwarjha/claude-marketing-research-skill`; business-ops gap → `ericosiu/ai-marketing-skills`; can't find a skill → discovery via `ComposioHQ/awesome-claude-skills` catalog.

## Last verified: 2026-06
