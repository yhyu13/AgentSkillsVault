# Tool: HubSpot official MCP

- **Domain(s):** leadgen-crm (also: none)
- **Barrier route:** ① · **Source tier:** L1 · **Ready MCP:** yes, official HubSpot MCP (OAuth)
- **Cost:** free CRM tier (free forever); paid Sales/Marketing Hub Starter tiers add seats/limits, price unverified 2026-06, confirm at https://www.hubspot.com/pricing/crm
- **Repo / Provider:** https://www.hubspot.com
- **Top pick for its domain:** no (pick whichever CRM you actually run)

## What it does / when to pick it
HubSpot's official MCP gives the model **CRM read/write**: query/create/update contacts, companies,
deals; log activity (calls/emails/notes); search records. **Decision rule:** this is the *sink* of the
leadgen pipeline, not a data source, use it (vs Salesforce/Attio MCP) **iff HubSpot is the CRM the team
already runs**. Don't choose a CRM by the tool; mirror the user's stack. In the min combo it's the
final step: Apollo → Hunter/ZeroBounce → Smartlead → **CRM MCP (HubSpot here)**.

## Install
Official MCP via OAuth, connect HubSpot as a connector (no API key pasted). This is the route-① CRM
pattern (same shape for Salesforce/Attio). Exact current step:
`reference/volatile/pricing-install.md#leadgen-crm`; L0 OAuth/transport mechanics:
`reference/install-guide.md`. Takes effect after `/mcp` reconnect / session restart.

## Auth / keys
OAuth, no long-lived secret enters the transcript, so the key-hygiene script isn't needed here. Grant
only the scopes you need (contacts/companies/deals); avoid broad write scopes if the run is read-only.
The free CRM tier is enough for read/write to evaluate.

## Usage, call examples
MCP tools cover CRM objects + engagements. Minimal write flow: after enriching+verifying a lead, create
the contact (`email`, `firstname`, `company`), associate it to a company record, and log a note with the
source. Minimal read: search contacts by `lifecyclestage=lead` created this week.

## General experience & gotchas (踩坑)
- **It's a destination, not a research source**, don't reach for HubSpot to *find* contacts (that's
  Apollo/Hunter); use it to *land* the cleaned, verified record. Writing unverified Apollo emails
  straight into the CRM pollutes it and tanks deliverability later.
- **Write scopes are dangerous on a live CRM**, a bad batch create/update is hard to undo. Dedupe
  against existing contacts (by email) before creating, and prefer upsert over blind create.
- HubSpot API rate limits + daily caps apply per portal tier; large syncs need batching/backoff.
- Free tier is generous for objects but gates automation/sequences, outreach still belongs in Smartlead.
- **Signup has NO Google OAuth despite what some matrices claim** (confirmed 2026-06-16), `app.hubspot.com/signup-hubspot/crm` only offers Microsoft / Apple / email. Use Microsoft if you have one, else email with captcha.
- **API tokens live under Settings → Integrations → Private Apps** (not at user profile level). Each Private App has per-scope access control, name the app, pick `crm.objects.contacts.read` + `crm.objects.companies.read` at minimum for research use; add `.write` scopes only if you need to land records. Token is shown once; copy immediately.

## Failure signals & fallback
"Needs authentication" in `claude mcp list` (OAuth expired) → re-auth. 429 = rate-limited, batch and
retry with backoff. If the team's CRM is **not** HubSpot, fall back to the matching official MCP,
**Salesforce** or **Attio** (same route ①, same read/write/log-activity capability).

## Last verified: 2026-06
