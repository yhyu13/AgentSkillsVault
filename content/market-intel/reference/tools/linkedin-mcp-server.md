# Tool: stickerdaniel/linkedin-mcp-server

- **Domain(s):** social-publishing (also: leadgen-crm)
- **Barrier route:** ④ · **Source tier:** L4 · **Ready MCP:** yes (ready-to-run MCP server)
- **Cost:** free (OSS), cost is the account you'll burn + proxies
- **Repo / Provider:** github.com/stickerdaniel/linkedin-mcp-server, `stickerdaniel/linkedin-mcp-server (3.0k★, gh-api 2026-07-31)` (Apache-2.0; actively maintained, last push 2026-06)
- **Top pick for its domain:** no

## What it does / when to pick it
A **ready MCP** that drives LinkedIn through your logged-in session (cookie), read profiles,
companies, jobs, search people, scrape connections. Pick it only when you specifically need LinkedIn
data inside an agent AND accept that **LinkedIn has the HIGHEST ban risk of any platform in this
matrix.** For B2B leads, prefer the far-lower-risk **gosom/google-maps-scraper** ④ first; for
multi-platform posting use Buffer ①. LinkedIn's official write-API is gated behind a legal-entity
approval wall, so the compliant path is usually unavailable.

## Install
Ready MCP, add per the repo (Docker or local). Supply a LinkedIn session cookie (`li_at`). Prefer
HTTP transport on Windows. Volatile line: `reference/volatile/pricing-install.md` → social-publishing.
MCP takes effect only after session restart / `/mcp` reconnect.

## Auth / keys
Auth = your **LinkedIn `li_at` session cookie** (no official key). Use a **small throwaway account
you can afford to lose**, never your real LinkedIn. The cookie is a secret: user supplies it, never
echo or `browser_snapshot` it; see `reference/install-guide.md` (Secret-handling hygiene).

## Usage, call examples
MCP tools (per repo): `get_person_profile`, `get_company_profile`, `get_job`, `search_jobs`,
`get_recommended_jobs`, etc. Minimal: `get_person_profile(linkedin_url=...)`.

## General experience & gotchas (踩坑)
- **⚠ HIGHEST ban risk in the whole skill** (shard, repeated). LinkedIn aggressively detects
  automation and will checkpoint/restrict the account fast, small batches, slow pacing, throwaway
  account only.
- Even reads trip detection: profile-view bursts from a fresh/datacenter session get challenged.
- LinkedIn rotates its internal endpoints/anti-bot often → expect intermittent breakage even on a
  maintained repo.
- It's a **scraper, not a poster**, for publishing to LinkedIn there is no safe free route here;
  Buffer ① (if your account is approved) or manual posting is the realistic path.

## Failure signals & fallback
Empty/garbled results, CAPTCHA/checkpoint redirects, or sudden 999/403 = flagged → stop immediately
(continuing risks a permanent ban). Fallbacks: **gosom/google-maps-scraper** ④ for B2B contact data
at a fraction of the risk; **Apollo.io** ① / **Hunter.io** ① for compliant contact enrichment;
**joeyism/linkedin_scraper** ④ is a sibling (same high risk, no MCP).

## Last verified: 2026-06
