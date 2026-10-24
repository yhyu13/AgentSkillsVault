# Tool: instantly-mcp

- **Domain(s):** leadgen-crm
- **Barrier route:** 1 official API · **Source tier:** paid (Instantly Growth plan) · **Ready MCP:** yes (official hosted)
- **Top pick for its domain:** no (only when the user is already on Instantly.ai)

## What it does / when to pick it
Official Instantly.ai hosted MCP for the cold-outreach platform, sequence audits, deliverability checks, lead management, and campaign analytics. **38 tools across 6 categories:** accounts, campaigns, leads, emails, analytics, background_jobs. Hosted at `mcp.instantly.ai/mcp` (no self-host required). **Decision rule:** pick this when the outreach is already running on Instantly.ai (existing paid customers who want to read/write their own sending infra from an agent). **Not a fit for prospecting de novo**, for sourcing fresh contacts use Apollo (people search + enrichment) or Hunter (domain → email pattern). This tool acts on data you already have inside Instantly; it does not generate leads.

## Install
Hosted MCP, point your client at the remote endpoint:

```
mcp.instantly.ai/mcp
```

No local package install required for the official hosted server. Community reference client (for self-hosting / hacking): `bcharleson/instantly-mcp` (MIT, built on FastMCP), see https://help.instantly.ai/en/articles/12980002-instantly-mcp-model-context-protocol for the current connection method and client-specific config snippets.

## Auth / keys
Requires an active **Instantly.ai Growth plan** (paid) and your Instantly API key. Generate the key inside the Instantly dashboard, then supply it to the MCP client per the help-center instructions. Not usable on free trial accounts.

## Usage, call examples
- "List my active campaigns and their reply rates this week." → `campaigns` + `analytics`
- "Pause campaign X and report bounce rate on the connected sending accounts." → `campaigns` + `accounts`
- "Show leads added in the last 24h that haven't been emailed yet." → `leads` + `background_jobs`

## General experience and gotchas (踩坑)
- **Customer-only tool.** Zero value unless the user already pays for Instantly Growth+. If they're shopping for an outreach platform, this is not the entry point, point them at the product, not the MCP.
- **Not a prospecting source.** It reads/writes *your* Instantly workspace; it does not discover new contacts. Pair with Apollo / Hunter for sourcing, then push into Instantly.
- **38 tools is a lot of surface area** across 6 categories, narrow the agent's allowed toolset per task (e.g., analytics-only for reporting) to avoid accidental writes to live campaigns.
- **Hosted endpoint = vendor lock.** You're trusting `mcp.instantly.ai/mcp` for both transport and auth handling. For paranoid setups, the community `bcharleson/instantly-mcp` reference client lets you self-host the same surface.
- **Help-center docs drift.** Last help-center refresh was 2026-03-12; tool counts and category names can shift between releases. Re-check the article before wiring brittle agent workflows.

## Last verified: 2026-06
