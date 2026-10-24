# Tool: gtm-agents

- **Domain(s):** ready-skills (sales-driven GTM)
- **Barrier route:** 1 official-API style (Claude Code plugin marketplace) - **Source tier:** free OSS - **Ready MCP:** no (it's a Claude Code skill/agent bundle, not an MCP server)
- **Top pick for its domain:** yes, for sales-pipeline + cold-outbound GTM workflows on Claude Code

## What it does / when to pick it
GTM agent collection for Claude Code, packaged as a marketplace of **67 plugins / 92 agents / 52 skills** covering sales pipeline mgmt, lead-gen, cold-email personalization, and outbound-sequence audit. Apache-2.0, 279 stars / 47 forks, created 2025-11-18, last commit 2026-04-03 (cold-email-personalization skill).

**Decision rule:** pick when the workflow is **sales-driven GTM** - prospecting -> outreach -> pipeline mgmt - and you want ready-made Claude Code agents instead of writing the orchestration yourself. Pair it with a **data source** for prospect enrichment: Apollo (best directory + enrichment, freemium) or Hunter (email finder, free 25/mo). gtm-agents is the *brains*; Apollo/Hunter is the *contact data*.

Skip it when the job is broad market research (use deep-research), competitor pricing/SEO (use the dedicated tools), or pure CRM ops (use HubSpot/Salesforce MCPs directly).

## Install
Install: <TODO: confirm install method> - see https://github.com/gtmagents/gtm-agents

Typical Claude Code marketplace flow is `/plugin marketplace add gtmagents/gtm-agents` then `/plugin install <plugin-name>`, but verify against the repo README before running - plugin/skill/agent names need to be picked from the 67/52/92 catalog.

## Auth / keys
**Free, no key for the skills themselves** (they're prompt + tool bundles that run inside Claude Code). Any keys needed are for the **downstream data sources** the agents call - Apollo / Hunter / Gmail / your CRM - configured per-tool, not at the gtm-agents level.

## Usage - call examples
```
/plugin marketplace add gtmagents/gtm-agents
/plugin install cold-email-personalization
# then in chat: "personalize this cold email for <prospect URL>"
```
Skills auto-trigger on intent ("draft cold sequence", "audit my outreach cadence", "score these leads"); plugins surface as slash commands.

## General experience and gotchas (踩坑)
- **It's a skill/plugin bundle, not an MCP** - don't try to wire it up as an MCP server. It plugs into Claude Code's plugin marketplace; nothing runs as a standalone service.
- **Brains without data is useless** - the agents don't ship prospect lists or email addresses. You MUST pair with Apollo/Hunter/Clay/etc. for the contact layer, or the cold-email skills have nothing to personalize against.
- **Catalog churn risk** - 67 plugins / 92 agents / 52 skills is a lot of surface area for a 279-star repo last touched 2026-04-03. Expect quality variance across the catalog; treat the cold-email-personalization skill (most recently maintained) as the proven entry point, audit the rest before trusting in prod.
- **Apache-2.0 = safe to fork / vendor-in** - if a specific skill is load-bearing for your pipeline, copy it into your own skill library so a future repo abandonment doesn't strand you.
- **No deliverability layer** - these are *content* and *workflow* agents, not SMTP/warmup. Send-side infra (Instantly, Smartlead, custom SES) is still on you, and cold-email-personalization quality means nothing if your domain isn't warmed.

## Last verified: 2026-06
