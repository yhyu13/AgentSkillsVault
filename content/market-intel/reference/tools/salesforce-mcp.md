# Tool: Salesforce official MCP

- **Domain(s):** leadgen-crm (also: none)
- **Barrier route:** ① official API · **Source tier:** L1 · **Ready MCP:** yes, official Salesforce MCP / connector (OAuth)
- **Cost:** free *with your existing Salesforce org* (no extra MCP fee); needs a paid Salesforce license/edition you already run, confirm at https://www.salesforce.com [fetched 2026-06; product page returned 403 to fetch, confirm in-app]
- **Repo / Provider:** https://www.salesforce.com (official, OAuth, no GitHub repo)
- **Top pick for its domain:** no (CRM-sync only; pick the MCP of whichever CRM you actually run)

## What it does / when to pick it
Official MCP/connector to read and write your Salesforce CRM: query/create/update records (Leads,
Contacts, Accounts, Opportunities), log activities, push enriched prospects in. **Decision rule:**
this is the *sink*, not a lead *source*, pick it only because Salesforce is the CRM you already run.
If your CRM is HubSpot or Attio, use that one's MCP instead. It does not find or enrich leads
(that's Apollo ① → Hunter/ZeroBounce → Smartlead); it's where you land them after enrichment.

## Install
Official OAuth connector, connect in Claude → Customize → Connectors → Salesforce (or the official
hosted MCP URL). OAuth, so no key to paste. Prefer the hosted/HTTP path on Windows. Volatile line:
`reference/volatile/pricing-install.md` → leadgen-crm. L0 mechanics: `reference/install-guide.md`.
MCP takes effect only after session restart / `/mcp` reconnect.

## Auth / keys
OAuth against your Salesforce org (user authorizes in-browser), no long-lived key in
`~/.claude.json`, so the usual key-leak risk is lower. The connected user's profile/permissions gate
what the MCP can read/write; scope a least-privilege integration user rather than an admin if you can.

## Usage, call examples
MCP tools follow Salesforce objects: query records (SOQL-style), create/update a Lead or Contact,
log a Task/activity. Minimal: query Contacts by email to dedupe before inserting a freshly enriched
prospect, then create the record only if absent.

## General experience & gotchas (踩坑)
- It is a **CRM write target, not a prospecting source**, don't reach for it to *find* leads; that's
  the shard's Apollo → Hunter/ZeroBounce → Smartlead → CRM combo (CRM = last hop).
- ⚠ Mirror the Apollo lesson: **disable Claude model training before connecting** any CRM that holds
  real customer PII, your CRM is the most sensitive store in the pipeline.
- Any personal-data flow needs GDPR/CCPA delete-request handling (shard compliance red line).
- Org permissions/validation rules silently reject writes (required fields, picklist values), a
  create can "fail" as a validation error, not a transport error; check the returned status.
- Sandbox vs production: confirm which org you're authorized against before bulk writes.

## Failure signals & fallback
Failure looks like: OAuth `! Needs authentication` in `claude mcp list`, permission/`INSUFFICIENT_ACCESS`
errors, or validation-rule rejections on create/update. **Fallbacks:** if Salesforce isn't your CRM,
use **HubSpot MCP** ① or **Attio MCP** ① (siblings, same role); for the upstream lead data feeding it,
**Apollo.io** ① (find+enrich) and **Hunter/ZeroBounce** ① (verify).

## Last verified: 2026-06
