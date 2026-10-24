# Tool: Apollo.io (native connector)

- **Domain(s):** leadgen-crm (also: none)
- **Barrier route:** ① · **Source tier:** L2 · **Ready MCP:** yes, Claude native connector (OAuth), no key in transcript
- **Cost:** free Starter plan (forever) + trial credits (50 credits / 5 mobile credits); paid plans add credits, price unverified 2026-06, confirm at https://www.apollo.io/pricing
- **Repo / Provider:** https://www.apollo.io
- **Top pick for its domain:** yes (default find+enrich pick)

## What it does / when to pick it
Apollo is a B2B contact database + prospecting engine: find people by ICP (title/industry/headcount/tech),
enrich a name/company into email + phone + role, and run sequences. **Decision rule:** this is the
DEFAULT for "find + enrich contacts / ICP prospecting", pick it over Hunter (Hunter is for precise
*email* work on a known domain), over Clay (Clay only wins for teams already on Clay's waterfall), and
over ZoomInfo (enterprise budget) / PDL (raw API-at-volume). Min combo: **Apollo → Hunter/ZeroBounce
verify → Smartlead outreach → your CRM MCP.**

## Install
Connect via Claude → Customize → Connectors → "Apollo.io" (OAuth flow, no API key pasted). This is a
native connector, not `claude mcp add`. ⚠ **Turn OFF Claude model training in Apollo's settings BEFORE
connecting**, your prospect data is PII. Takes effect after `/mcp` reconnect / session restart.
Exact step lives in `reference/volatile/pricing-install.md#leadgen-crm`; L0 mechanics in `reference/install-guide.md`.

## Auth / keys
OAuth, no long-lived secret enters the transcript, so the usual key-hygiene script is not needed here.
The one hard gate is the model-training toggle (above). Free tier is enough to evaluate; mobile/phone
credits are the scarce resource, not email credits.

## Usage, call examples
After connecting, call the Apollo connector tools from the model (people search by filters, enrich a
contact, pull a company). Minimal flow: search `title="Head of Growth" AND employees=11-50 AND
country="US"` → enrich the top N to get verified emails → hand the emails to Hunter/ZeroBounce to
re-verify before sending.

## General experience & gotchas (踩坑)
- **Model-training toggle is the #1 trap**, default-on means your uploaded/enriched contacts can train
  models. Flip it off first; the shard flags this as a hard ⚠.
- Mobile/phone credits drain far faster than email credits and are the real cost ceiling, budget them.
- Apollo email accuracy is good but not gospel; **always re-verify before a send** (it does not absorb
  bounce risk for you). Apollo's own "verified" label still bounces enough to hurt deliverability.
- PII workflows need GDPR/CCPA delete-request handling (shard compliance red line).
- **Google OAuth signup is bot-friendly; onboarding wizard is hard-blocked** (confirmed 2026-06-16), `app.apollo.io/sign-up` accepts Google OAuth headlessly (scopes `userinfo.email + userinfo.profile`; the callback URL contains `gmail_oauth_callback` which is **misleading, it is NOT Gmail-read access**). But the post-signup `/onboard` wizard renders the Full Name input with `readonly disabled`, and a watcher reapplies those attributes within milliseconds if JS removes them. `playwright.fill` fails, JS event dispatch fails, attribute removal fails, designed specifically to defeat headless. **API key cannot issue until onboarding completes** so the user must finish it in their own browser. Once onboarded, the model-training toggle MUST be flipped off at Settings → Privacy & Security BEFORE generating the API key.

## Failure signals & fallback
Out of credits / OAuth shows "Needs authentication" in `claude mcp list` (or the connector greys out) →
re-auth. If you only need email-on-a-known-domain, fall back to **Hunter.io** (more precise, cheaper
for pure email). For local-business B2B leads instead of corporate contacts, fall back to the free ④
route **gosom/google-maps-scraper** (name/phone/site/email, far lower legal risk than LinkedIn).

## Last verified: 2026-06
