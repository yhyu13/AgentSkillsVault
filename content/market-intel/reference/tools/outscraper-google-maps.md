# Tool: outscraper-google-maps

- **Domain(s):** leadgen-crm (also: none)
- **Barrier route:** ② resale · **Source tier:** L2 · **Ready MCP:** no (REST; wrap it yourself)
- **Cost:** **free first 500 records**, then **$3 / 1K records** up to 100K, **$1 / 1K** above 100K, pay-as-you-go, no subscription [https://outscraper.com, fetched 2026-06]
- **Provider:** https://outscraper.com (active 2026 blog posts confirm live service)
- **Top pick for its domain:** yes (clearly cheaper than SerpApi Maps, ~15x cheaper at small volume; SerpApi Maps is ~$25/mo for 1K)

## What it does / when to pick it
Resale Google Maps lead-scraping API, returns business name, address, phone, website, ratings, reviews, categories per query/region. Provider absorbs the anti-bot wall so you get clean JSON; pay-as-you-go with a real free tier (500 records) instead of a monthly minimum. **Decision rule:** pick when scraping Google Maps for local-business leads at scale. For one-off small queries (a few dozen records), SerpApi Maps is simpler to integrate. For 10K+ records, or any recurring lead-gen workload, Outscraper is clearly cheaper per call and avoids the subscription floor.

## Install
No MCP. REST integration: get the API key → call the HTTP endpoint, wrap behind a thin tool. HTTP only, no stdio. Treat like Rainforest/PriceAPI, code-integration, not a `claude mcp add` entry. Install: <TODO: confirm install method>, see https://outscraper.com.

## Auth / keys
API key from the Outscraper dashboard after signup. Free tier (500 records) starts immediately, no card required to begin. Key-bearing → hygiene one-liner: keep `api_key` out of the transcript and out of git; env or direct `~/.claude.json` edit. See `reference/install-guide.md` (Secret-handling hygiene).

## Usage, call examples
`GET https://api.app.outscraper.com/maps/search?query=plumbers+Austin+TX&limit=500&apiKey=KEY` → JSON array of place records (name, address, phone, website, rating, reviews_count, category). One returned record ≈ one billable record after the free 500.

## General experience & gotchas (踩坑)
- **Free 500 is per-account total, not per-query**, burn it on test runs and you're already paying. Sandbox with a tiny `limit=5` first; reserve the 500 for the first real sweep.
- **Pay-as-you-go = no recurring floor, but no SLA either**, fine for batched lead-gen, not for time-sensitive scraping. Cross-check a handful of records against live Google Maps if a sweep looks off.
- **It's still a ② resale wrapper**, you inherit their refresh cadence; phone/website fields can be stale or missing for low-traffic businesses. Treat as lead seed, not source of truth.
- **Volume math beats SerpApi clearly only above ~1K records.** Below that, SerpApi Maps' per-search billing or a small free-tier scrape (gosom/omkarcloud ④) may be simpler. Outscraper wins decisively at 10K+.
- **Async-job model:** large queries return a request ID you poll, not inline JSON, wrap the polling loop in your tool layer or you'll think it hung.

## Failure signals & fallback
Failure: HTTP 401 (key), quota/credit error after the free 500 if billing not set up, or empty `data` arrays for over-narrow queries. **Fallback:** SerpApi Maps (② resale, simpler for tiny one-offs), or self-host ④ via `gosom/google-maps-scraper` / `omkarcloud/google-maps-scraper` if you'd rather run the scrape yourself and eat the ToS risk.

## Last verified: 2026-06
