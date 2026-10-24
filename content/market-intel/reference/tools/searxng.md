# Tool: searxng/searxng

- **Domain(s):** seo-keywords (also: web-scraping, browser-automation)
- **Barrier route:** ④ self-host · **Source tier:** L4 · **Ready MCP:** no, self-host meta-search; call its JSON API, or drive via playwright/an HTTP wrapper
- **Cost:** free (self-host; proxy pool is the only cost at high volume) [github.com/searxng/searxng, gh-api 2026-06]
- **Repo / Provider:** github.com/searxng/searxng, searxng/searxng (31.7k★, gh-api 2026-06; AGPL-3.0, last push 2026-06-08, active)
- **Top pick for its domain:** yes (free-route default)

## What it does / when to pick it
SearXNG is a self-hosted privacy meta-search engine that aggregates dozens of upstream engines (Google, Bing, DuckDuckGo, Brave, Startpage…) and returns a clean JSON SERP via `&format=json`. Effectively a **private SerpApi at zero cost**. Pick it when you need raw SERP results / competitor-rank scraping / keyword-context discovery and don't want to pay per query. It's the free-route DEFAULT for this domain together with serpbear (rank tracking). Use the paid ① route (GSC for your own site) or ②/① keyword APIs (DataForSEO, SE Ranking) only when you need real search *volume*/CPC or backlink data, which SearXNG cannot provide.

## Install
Self-host via Docker (no MCP package). First resolve and verify a PRIVATE companion runtime directory through the configured DATA resolver. Bind that absolute private directory to `/etc/searxng`, and keep logs and search outputs in PRIVATE versioned DATA. Do not use a caller-relative checkout directory or start the service until the destination and upstream persistence settings are confirmed. Follow the installed version's Docker instructions and bind its local listener only where needed.
Then enable JSON output: in `settings.yml` add `json` under `search.formats:` (it's off by default), and restart. Query: `http://localhost:8080/search?q=<kw>&format=json`. No MCP transport, call the URL from playwright MCP / Bash / an HTTP-wrapper MCP. See `reference/install-guide.md` for the route-④ self-host prerequisites (Docker) and Windows notes. Exact command may drift, confirm in `reference/volatile/pricing-install.md` → seo-keywords.

## Auth / keys
No account or API key is required for basic self-hosted search. Queries, logs, results and any configured proxy credentials can still be private; keep them in the PRIVATE runtime and credential stores.

## Usage, call examples
Minimal JSON SERP call:
```
curl "http://localhost:8080/search?q=patio-heater+led+light+bar&format=json&engines=google,bing"
```
Returns `results[]` with `title`, `url`, `content` (snippet), `engine`, plus `suggestions[]` and `infoboxes[]`. Filter engines per query to cut latency and ban exposure.

## General experience & gotchas (踩坑)
- **`format=json` is disabled by default**, a fresh install returns HTML only; you must add `json` to `search.formats` or every call 403s. This is the #1 first-run failure.
- **Upstream rate-limits / CAPTCHAs propagate up.** Google/Bing throttle a busy single IP fast: you'll see empty `results[]` or an engine silently dropped (check the `engines` field per result). At volume you MUST put a proxy pool behind it, the software is free, proxies are the hidden cost (route ④ rule).
- **No search volume, no CPC, no keyword difficulty, no backlinks.** It returns SERP listings only. Don't try to fake volume from result counts. For real metrics fall back to DataForSEO/SE Ranking/GSC.
- Results are listings, not normalized keyword data, you parse ranks/competitors yourself.
- Public SearXNG instances exist but rate-limit aggressively and often disable JSON; self-host for reliable automation.

## Failure signals & fallback
Empty `results[]`, 403/429, or a named engine missing from results = upstream throttle or JSON disabled. Fix JSON format first; then add proxies. If SearXNG can't break through for a target site, fall back to **playwright MCP** (drive the SERP directly) or a production SERP API such as **DataForSEO** or **SerpApi**, with current access/quota and usable live results verified. DataForSEO Sandbox is a mock service for wiring tests, not a live SERP fallback. Keep the research coverage gap explicit until a production source returns the needed observations. For your own site's real traffic, use **GSC MCP** (①) with the required account access.

## Last verified: 2026-06
