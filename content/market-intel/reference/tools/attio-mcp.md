# Tool: Attio official MCP

- **Domain(s):** leadgen-crm (also: none)
- **Barrier route:** ① official API · **Source tier:** L1 · **Ready MCP:** yes, official Attio MCP (OAuth)
- **Cost:** free *with your existing Attio workspace* (no extra MCP fee); Attio has a free plan + paid tiers, confirm at https://attio.com/pricing [fetched 2026-06]
- **Repo / Provider:** https://attio.com (official, OAuth, no GitHub repo)
- **Top pick for its domain:** no (CRM-sync only; pick the MCP of whichever CRM you actually run)

## What it does / when to pick it
Official MCP to read and write your Attio CRM (the modern, data-model-flexible CRM): query/create/
update records and lists, log activity, sync enriched prospects in. **Decision rule:** same as its
CRM siblings, this is the *destination*, not a lead source. Pick it only because Attio is the CRM you
run. For *finding/enriching* leads use Apollo ① → Hunter/ZeroBounce ① → Smartlead ①, then land them
here. Attio's flexible schema makes it pleasant for custom objects, but it's still the last hop.

## Install
Official OAuth connector / hosted MCP, connect in Claude → Customize → Connectors → Attio (or the
official MCP URL). OAuth, no key to paste. Prefer the hosted/HTTP path on Windows. Volatile line:
`reference/volatile/pricing-install.md` → leadgen-crm. L0 mechanics: `reference/install-guide.md`.
MCP takes effect only after session restart / `/mcp` reconnect.

## Auth / keys
OAuth against your Attio workspace (authorize in-browser), no long-lived secret in `~/.claude.json`,
so key-leak risk is lower than key-bearing tools. The authorizing member's permissions gate access.

## Usage, call examples
MCP tools map to Attio's object model: list/query records, create or update a record (e.g. a Person
or Company), append to a list, log a note/activity. Minimal: search Companies by domain to dedupe,
then create the record with enriched fields if it doesn't exist.

## General experience & gotchas (踩坑)
- **CRM write target, not a prospecting source**, don't use it to *find* leads (shard: Apollo →
  verify → Smartlead → CRM; Attio is the CRM slot).
- ⚠ Mirror the Apollo lesson: **disable Claude model training before connecting**, the CRM holds the
  most sensitive PII in the pipeline.
- GDPR/CCPA delete-request handling is required for any personal-data workflow (shard red line).
- Attio's flexible/custom object model means field/attribute slugs vary per workspace, discover the
  schema first; blind writes to a wrong attribute slug silently no-op or error.
- It's the youngest of the three CRM MCPs here, tool coverage may lag HubSpot/Salesforce on niche
  objects; verify the specific write you need is supported before scripting a bulk sync.
- **B2B-only signup gate** (confirmed 2026-06-16), `app.attio.com/welcome` accepts the Google OAuth click, but the callback redirects to `auth/sign-in?email_is_public=1` and refuses to provision the workspace because `gmail.com` is a consumer domain. **Skip Attio unless you have a work-domain Google account.** If your team is on a custom domain, the same OAuth flow completes normally.

## Failure signals & fallback
Failure looks like: OAuth `! Needs authentication`, permission errors, or writes to an unknown
attribute slug returning errors/no-ops. **Fallbacks:** if Attio isn't your CRM, **HubSpot MCP** ① or
**Salesforce MCP** ① (siblings); upstream lead data → **Apollo.io** ① + **Hunter/ZeroBounce** ①.

## Last verified: 2026-06
