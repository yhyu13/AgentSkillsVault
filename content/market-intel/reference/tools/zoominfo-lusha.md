# Tool: ZoomInfo / Lusha

- **Domain(s):** leadgen-crm (also: none)
- **Barrier route:** ① · **Source tier:** L2 · **Ready MCP:** yes (key)
- **Cost:** Lusha free 40 credits/mo; Lusha Starter $49.90/mo (400 cr, $37.45/mo yearly), Pro $69.90/mo (600 cr), Premium $399.90/mo (3,400 cr) [https://www.lusha.com/pricing, fetched 2026-06]. **ZoomInfo enterprise ~$15k+/yr** (price unverified 2026-06, sales-quoted only, confirm at https://www.zoominfo.com/pricing)
- **Repo / Provider:** https://www.lusha.com  ·  https://www.zoominfo.com
- **Top pick for its domain:** no

## What it does / when to pick it
Two enterprise/mid-tier contact databases bundled as one entry. **ZoomInfo** = the heavyweight B2B DB
(deepest firmographics + intent data, enterprise contract). **Lusha** = the mid-tier, accessible
alternative with a real free tier and a browser extension. **Decision rule:** reach here only when
Apollo's coverage misses and budget allows, **Lusha** for a cheap top-up / occasional reveal (40
free/mo), **ZoomInfo** only if the org already pays for it (the $15k+/yr floor makes it a no for ad-hoc
research). For most market-intel runs, Apollo + Hunter beats paying ZoomInfo.

## Install
Lusha exposes an MCP via API key (paid plan generally required for API). Add as a key-bearing source,
**user** supplies the key, or edit `~/.claude.json` from clipboard; never `claude mcp add` with the key
inline. Prefer HTTP transport on Windows. Exact current command:
`reference/volatile/pricing-install.md#leadgen-crm`; L0 mechanics: `reference/install-guide.md`.
Takes effect after `/mcp` reconnect.

## Auth / keys
Lusha: key from dashboard (40 reveals/mo free; phone = 10 credits, email = 1 credit, so phones drain
10× faster). ZoomInfo: API access is contract-gated. **Secret hygiene:** never `browser_snapshot` the
key page; clipboard-copy → no-echo edit into `~/.claude.json`, verify by length only
(`reference/install-guide.md`).

## Usage, call examples
Lusha MCP: reveal a contact's email/phone by person+company, or enrich a row. Minimal: reveal email for
`name=Jane Doe, company=Acme` (costs 1 credit), only spend the 10-credit phone reveal when a call is
actually planned.

## General experience & gotchas (踩坑)
- **Phone = 10 credits, email = 1** on Lusha, the 40 free/mo evaporates after 4 phone reveals. Treat
  phone reveals as scarce.
- ZoomInfo's $15k+/yr floor and annual lock-in make it wrong for ad-hoc / one-off research, it's an
  org-level commitment, not a research-time tool. Don't recommend spinning it up for a single project.
- Lusha coverage skews US/EU corporate; thin on SMB and non-Western markets, cross-check against
  Apollo/Google-Maps for local-business leads.
- Both are PII sources, GDPR/CCPA delete-request handling required (shard compliance red line).
- **Lusha signup URL is `auth.lusha.com/signup`**, NOT `lusha.com/signup` or `lusha.com/sign-up` (both 404). The signup form has a placeholder "Enter your work email" and a captcha; **rejects consumer email domains** (gmail.com, etc.). Skip Lusha unless you have a work-domain email. (ZoomInfo signup is sales-rep-driven, no self-serve.)

## Failure signals & fallback
401 / "Needs authentication" in `claude mcp list`, or reveal returns no contact (out of coverage or
credits). Fall back to **Apollo.io** (default find+enrich, free tier) or **People Data Labs**
($0.01/record, cheapest at volume) when ZoomInfo's price or Lusha's free cap is the blocker. For
local-business leads, the free ④ **gosom/google-maps-scraper** route.

## Last verified: 2026-06
