# Tool: mcp-searxng (private search MCP over SearXNG)

- **Domain(s):** web-scraping (also: seo-keywords)
- **Barrier route:** ③ self-host · **Source tier:** L2 · **Ready MCP:** **yes**, it *is* the MCP server (stdio/HTTP), wrapping a SearXNG instance for any MCP client (Claude, Cursor, etc.).
- **Cost:** free, open-source (no key, no quota) [github.com/ihor-sokoliuk/mcp-searxng, gh-api fetched 2026-07-01]
- **Repo / Provider:** `ihor-sokoliuk/mcp-searxng (1204★, gh-api 2026-09-06)`, not archived, pushed 2026-09-06, actively maintained. Backbone: `searxng/searxng` (36.6k★, pushed 2026-09-05, gh-api 2026-09-06).
- **Top pick for its domain:** no, but it is the **free self-host search layer that fills the role Tavily just vacated** (Tavily MCP returned 401 on every call in the 2026-06-25 live run). When you don't want a paid semantic-search vendor, this is the default free replacement.

## What it does / when to pick it
Exposes a SearXNG meta-search instance as an MCP `search` (and URL-read) tool: private, keyless web search aggregating dozens of engines, returning JSON to the model. **Decision rule:** when the paid search tier (Tavily/Exa) is down, rate-limited, or you simply don't want per-query cost, run SearXNG + mcp-searxng as your search layer, it covers the "give the agent web search" need at $0. Keep **Exa** for genuinely neural/"recent" semantic ranking and **Bright Data** for hard-target *scraping* (this is search, not an unlocker).

## Install
First follow the [SearXNG backend setup](searxng.md): verify an initialized PRIVATE versioned runtime, confirm supported persistence settings, bind an absolute private configuration directory to `/etc/searxng`, and keep logs and results in PRIVATE versioned DATA. Revalidate before service start and enable JSON output in that private configuration. Then inspect the selected MCP version's launch and storage settings; add it only when its configuration, logs and outputs also use supported verified private destinations. Point `SEARXNG_URL` at the actual backend. Keep setup pending if either component has an unverified writer. Requires a reachable SearXNG URL (self-hosted or a trusted public instance). Volatile install line: `pricing-install.md` → web-scraping.

## Auth / keys
None. No API key. The only config is `SEARXNG_URL` (your instance). If you point it at a *public* SearXNG instance instead of self-hosting, you inherit that instance's uptime + rate limits, self-host for reliability.

## Usage, call examples
Once connected, the model calls the MCP's `searxng_web_search` tool with a query (and optional engine/category/time-range filters); it returns ranked results as JSON. A companion URL-read tool fetches a page's readable content.

## General experience & gotchas (踩坑)
> Not yet exercised in a live market-intel run, notes from repo docs + gh-api verification 2026-07-01; harden with a `live-runs.jsonl` entry after first use (R4).
- **You must run SearXNG:** the MCP is a thin, well-maintained wrapper, its data quality is entirely your SearXNG instance's engine set + health. A misconfigured instance (JSON format disabled, engines rate-limited) makes the MCP look broken when the backend is the issue.
- **Public instances throttle:** many public SearXNG instances block automated/bot query patterns; at any volume, self-host.
- **Search, not scrape:** returns SERP-style results, not a barrier-broken full page render. For CAPTCHA/anti-bot page bodies, route to Bright Data/patchright/Scrapling, not this.

## Failure signals & fallback
Failure looks like empty result arrays, `429` from the SearXNG backend, or MCP connect errors (wrong `SEARXNG_URL`). **Fallback:** (1) check the SearXNG instance directly in a browser + confirm JSON format is enabled; (2) for paid-grade semantic search use **Exa**; (3) for bulk cheap SERP, **DataForSEO** (②, ~$0.0006/query). Tavily remains the ② incumbent *if/when its key is rotated*, the 2026-06 outage was a 401 key issue, not a dead service.

## Last verified: 2026-09 (repository existence, stars and activity checked through gh api; usage/gotcha notes carried forward unchanged from the prior check)
