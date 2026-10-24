# Tool: DataForSEO (MCP)

- **Domain(s):** web-scraping (also: seo-keywords)
- **Barrier route:** ② resale API · **Source tier:** L2 · **Ready MCP:** yes, official TypeScript MCP
- **Cost:** ~$0.0006/query (≈1/10 of SerpApi); $1 trial + free Sandbox, $50 min top-up; confirm at https://dataforseo.com/pricing [fetched 2026-06]
- **Repo / Provider:** github.com/dataforseo/mcp-server-typescript, `dataforseo/mcp-server-typescript (0.2k★, gh-api 2026-06)`; active (pushed 2026-06-08, not archived, Apache-2.0, verified gh-api 2026-06-09)
- **Top pick for its domain:** no (specialist: cheap BULK SERP/keywords, not the default search)

## What it does / when to pick it
Cheap, large-scale access to SERP results, keyword data, backlinks, and Google Trends via a paid API. **Decision rule:** pick DataForSEO when you need *bulk/repeated* SERP at low unit cost, monitoring hundreds of queries, rank tracking, keyword-volume pulls, where Tavily/Exa credits would be expensive. For a few ad-hoc agent searches, Tavily/Exa are simpler (and have free tiers). For one-off scraping of a hard page, this is the wrong tool, use Bright Data. Strong cross-serve into **seo-keywords** (keyword volume, backlinks, SERP features).

## Install
Official TS MCP `github.com/dataforseo/mcp-server-typescript` (stdio `npx`; flaky on Windows, see L0, prefer testing in a plain shell first). Exact command + the $50-min note: `reference/volatile/pricing-install.md → web-scraping`. Apache-2.0 (permissive). L0 mechanics (transport, secret, Windows): `reference/install-guide.md`. Restart / `/mcp` reconnect after adding.

## Auth / keys
DataForSEO account → API login + password (Basic auth, not a bearer token). **Onboarding gotcha:** the "login" is your account email, but the "password" is the **API password** shown in the dashboard, NOT your account login password, pasting the account password fails silently with HTTP 401 and no helpful message. A **free Sandbox** returns mock data for wiring/testing without spending; a **$1 trial** runs real queries; production needs a **$50 minimum** top-up. **Secret hygiene (one line):** keep the login/password out of the transcript, set them as env vars the user fills, edit `~/.claude.json` from clipboard rather than `claude mcp add`. See `reference/install-guide.md`.

## Usage, call examples
MCP exposes tools mirroring DataForSEO API groups: SERP (Google/Bing organic + features), Keywords Data (search volume, CPC), Backlinks, Labs, and Trends. Minimal: a SERP-organic tool taking `keyword` + `location` + `language`, returning ranked results as JSON. **Validate end-to-end against the free Sandbox first** (it returns canned data) before pointing at the live, billed endpoint.

## General experience & gotchas (踩坑)
- **~$0.0006/query, roughly 1/10 of SerpApi** (shard); this is its whole reason to exist. The economics only pay off at *bulk*; for a handful of searches the free Tavily/Exa tiers beat paying anything.
- **$50 minimum top-up** is the real adoption barrier, note it to the user up front; the $1 trial + Sandbox let you prove the integration before committing the $50.
- **Sandbox returns mock data**, not live SERP, easy to mistake canned responses for real results during testing. Switch endpoints (and budget) deliberately when you go live.
- Many tasks are async (post task → poll for results), not instant, a naive single-shot call may return a task ID, not data. Follow the post/get pattern.
- Basic-auth login/password (not a revocable bearer), rotating means changing the account credential; treat it as a real secret.

## Failure signals & fallback
Failure looks like: getting Sandbox/mock data when you wanted live, a task ID instead of results (forgot to poll), or 402/insufficient-balance once the trial is spent. **Fallbacks:** ad-hoc agent search → **Tavily/Exa** (②, free tiers); free self-host bulk SERP → **SearXNG** (④) or `ddgs`; multi-engine SERP with Trends JSON → **SerpApi** (pricier); hard single-page scrape → **Bright Data** (②).

## Last verified: 2026-06
