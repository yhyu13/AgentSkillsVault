# Tool: mobile-store-scraper-mcp

- **Domain(s):** trends-discovery (also: none)
- **Barrier route:** ③ self-host scrape · **Source tier:** L4 · **Ready MCP:** yes, self-host stdio (`node src/server.js`)
- **Cost:** free (no key, no quota), you pay only in maintenance when the HTML parser breaks
- **Repo / Provider:** github.com/MiguelAlvRed/mobile-store-scraper-mcp, `MiguelAlvRed/mobile-store-scraper-mcp` (0.0k★, gh-api 2026-06; last push 2025-12, ~6mo, NOASSERTION license), ⚠ thin adoption / single-author, treat as throwaway-grade
- **Top pick for its domain:** no

## What it does / when to pick it
One MCP wrapping BOTH App Store (iOS) and Google Play (Android): 20 tools for app details, search, rankings (top free/paid/grossing), reviews, ratings, similar apps, developer apps, privacy/permissions, version history, autocomplete. **Pick it over the raw npm libs** (`facundoolano/google-play-scraper` + `app-store-scraper`) only when you want a single MCP surface covering both stores in one connect; pick the npm libs directly when you want the more battle-tested (2.9k★) scrapers and can call them from code. It is a free ③ alternative to paid Sensor Tower, but gives you *public store metadata only*, NOT download/revenue estimates.

## Install
Self-host stdio (no published npm package, clone + `npm install`):
```
git clone https://github.com/MiguelAlvRed/mobile-store-scraper-mcp && cd mobile-store-scraper-mcp && npm install
claude mcp add -s user mobile-store-scraper -- node /absolute/path/to/mobile-store-scraper-mcp/src/server.js
```
Needs Node ≥ 18. **Windows note:** stdio MCPs are flaky here, use an absolute path to `src/server.js`, test in a plain shell first; no HTTP transport exists for this one. See `reference/install-guide.md` (Windows + stdio). Exact L1 line: `reference/volatile/pricing-install.md` → trends-discovery ("mobile-store-scraper-mcp (self-host)").

## Auth / keys
None, no API key, no account. It scrapes public store HTML/JSON endpoints directly. (No secret-hygiene concern.)

## Usage, call examples
MCP tool names are bare (App Store) and `gp_`-prefixed (Google Play). Minimal example:
```
search { "term": "fitness", "country": "us", "num": 50 }
app { "appId": "com.duolingo.DuolingoMobile", "country": "us" }
gp_app { "appId": "com.duolingo" }
gp_permissions { "appId": "com.whatsapp" }
list { "chart": "topgrossingapplications", "country": "us", "limit": 200 }
```

## General experience & gotchas (踩坑)
- **HTML-scrape, not an API → fragile.** Google Play tools parse page HTML; a store layout change silently breaks parsers. On failure it returns `null`/`[]` + a descriptive error rather than throwing, so check for empty results, don't assume success.
- **Rate-limited if you hammer it.** No proxy rotation built in; excessive requests get throttled by the stores. Space out calls; for scale you must add your own proxies (the route-③ hidden cost).
- **iOS field gaps:** ratings histogram is NOT available (only average + count); privacy labels are US-only; "similar apps" parsing is partial.
- **0★ / single-author / ~6mo since last push**, no community hardening. Treat as disposable: pin your clone's commit, and be ready to fall back the moment a parser dies.
- **Metadata only.** It will never give you install/revenue numbers, that is Sensor Tower / data.ai territory (route ②, paid).

## Failure signals & fallback
Failure = empty arrays/`null` across calls, or "parsing" errors in the response = the store HTML changed. **Fall back to** the raw npm libs `facundoolano/google-play-scraper` (2.9k★) + `app-store-scraper` (free, no key, more maintained) called from code; or for download/revenue estimates that no free tool provides, **Sensor Tower MCP** (`sensor-tower-mcp.md`, paid ②). For trend/launch discovery generally, prefer GDELT + Product Hunt MCP (the domain default picks).

## Last verified: 2026-06
