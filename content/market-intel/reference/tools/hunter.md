# Tool: Hunter.io (official MCP)

- **Domain(s):** leadgen-crm (also: none)
- **Barrier route:** ① · **Source tier:** L2 · **Ready MCP:** yes, official HTTP MCP `https://mcp.hunter.io/mcp` (X-API-KEY)
- **Cost:** free 50 credits/mo; Starter $49/mo ($34/mo yearly, 2k credits), Growth $149/mo (10k), Scale $299/mo (25k) [https://hunter.io/pricing, fetched 2026-06]
- **Repo / Provider:** https://hunter.io
- **Top pick for its domain:** yes (for precise email work)

## What it does / when to pick it
Hunter is the **email** specialist: Domain Search (all emails on a domain + pattern), Email Finder
(name+domain → the address), Email Verifier (deliverability), plus light enrichment. **Decision rule:**
pick Hunter when the job is *precise email work on a known domain/person*, it's more accurate and
cheaper per-email than Apollo for that narrow task. Use Apollo for broad ICP prospecting, Hunter to
find/verify the actual address. In the min combo it's the **verify** step: Apollo → **Hunter** →
Smartlead → CRM.

## Install
Official hosted HTTP MCP (Windows-friendly, no local process):
`https://mcp.hunter.io/mcp` with header `X-API-KEY: <key>`. Add as a key-bearing source, have the
**user** supply the key, or edit `~/.claude.json` directly from clipboard; do NOT `claude mcp add` with
the key inline (echoes it). Exact current command: `reference/volatile/pricing-install.md#leadgen-crm`;
L0 transport/secret mechanics: `reference/install-guide.md`. Takes effect after `/mcp` reconnect.

## Auth / keys
Free API key from the Hunter dashboard (50 credits/mo is enough to evaluate; 1 credit = 1 email found,
0.5 credit = 1 email verified, bulk = 1 credit per 10). **Secret hygiene:** never `browser_snapshot` the
key page; clipboard-copy → no-echo edit into `~/.claude.json`, verify by length only
(`reference/install-guide.md`).

## Usage, call examples
MCP tools mirror the REST API: domain-search, email-finder, email-verifier, account. Minimal: Email
Finder `first=Jane last=Doe domain=acme.com` → returns the address + a confidence score → run the same
address through Email Verifier before sending.

## General experience & gotchas (踩坑)
- **Credits are unified but verify is cheap (0.5) vs find (1)**, verify aggressively, it barely dents
  the budget; bulk domain search (1 credit/10) is the efficient path for large lists.
- Confidence score is a *probability*, not a guarantee, a high score still bounces sometimes; pair with
  a dedicated verifier (ZeroBounce) for cold-send-critical lists.
- Catch-all domains return "accept-all" not "valid", Hunter can't fully resolve these; don't treat
  accept-all as deliverable.
- The 50/mo free tier exhausts fast on any real run; the jump to $49 Starter is the first real spend.
- PII workflows need GDPR/CCPA delete-request handling (shard compliance red line).
- **Google OAuth signup requires first+last name pre-filled in the form** (confirmed 2026-06-16), clicking "Sign up with Google" on `hunter.io/users/sign_up` BEFORE typing both name fields fails with "Google signup failed: Your first and last names are required." React state pre-validates the form before triggering OAuth.
- **API keys page at `/api-keys`** (not at user profile). Key is dot-masked with `Reveal` + Copy buttons; click the Copy button next to the example URL line (`POST https://api.hunter.io/v2/discover?api_key=...`), not the masked display. Free tier confirmed 25 searches + 50 verifies/mo as of 2026-06.
- Registration also asks for a phone number at signup (verification optional but recommended), Hunter binds phone to account at this stage, not later.

## Failure signals & fallback
401 / "Needs authentication" in `claude mcp list` = bad key; empty results on a real domain = pattern
not found or out of credits. Fall back to **ZeroBounce** (the only other mature verify MCP) for
verification, or **Apollo.io** to source the contact when Hunter's domain pattern comes up empty.

## Last verified: 2026-06
