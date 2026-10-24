# Tool: Finnhub (cfdude/mcp-finnhub)

- **Domain(s):** finance-markets (also: trends-discovery)
- **Barrier route:** ① official API · **Source tier:** L1 · **Ready MCP:** yes, `cfdude/mcp-finnhub` (stdio; free Finnhub key)
- **Cost:** free tier ~60 req/min (generous); paid tiers above that [confirm at https://finnhub.io/pricing]
- **Repo / Provider:** github.com/cfdude/mcp-finnhub, `cfdude/mcp-finnhub (9★, gh-api 2026-06)`; active (pushed 2026-03-17, not archived, MIT), small/young wrapper over the official Finnhub API
- **Top pick for its domain:** no (but the third leg of the free-start default trio: SEC EDGAR + FRED + **Finnhub free tier**)

## What it does / when to pick it
Finnhub serves fundamentals + alternative data: company financials, quotes, and notably **alt-data**, news, and news/Reddit/Twitter sentiment, plus congressional-trade signals. **Decision rule:** pick Finnhub's free tier as the *quote + alt-data* leg of the free start, especially when you want sentiment or congress-trade signals layered on top of the filings (EDGAR) and macro (FRED). Its **60 req/min** is the best free rate limit in the domain. Move to Polygon if you need deep history / WebSocket realtime / high volume; use Twelve Data if you need multi-asset realtime at 800/day.

## Install
stdio MCP `cfdude/mcp-finnhub` with a `FINNHUB_API_KEY` env. Exact, time-stamped command: `reference/volatile/pricing-install.md → finance-markets` (shard line: "Finnhub free 60/min"). The same key also powers the trends-discovery `Finnhub MCP` entry. L0 mechanics (stdio flaky on Windows): `reference/install-guide.md`. Restart / `/mcp` reconnect after adding.

## Auth / keys
Free API key from finnhub.io (signup → dashboard). Free tier is real and usable (60/min). **Secret hygiene (key-bearing):** USER supplies `FINNHUB_API_KEY` via the env form; never echo it; prefer a direct `~/.claude.json` edit over `claude mcp add` (which echoes args), and never `browser_snapshot` the key page. One line + full rules: `reference/install-guide.md`.

## Usage, call examples
Endpoints/tools cover quote, company profile, basic financials, news + sentiment, and (where available) congressional trades. Minimal: pull a company quote and its recent news sentiment, then cross-check the headline fundamentals against the EDGAR 10-K for the authoritative numbers.

## General experience & gotchas (踩坑)
- **Verify the cache boundary before first run.** Select an existing absolute `FINNHUB_STORAGE_DIR` inside an initialized PRIVATE versioned companion. Check that destination through the full Market checkout's `tools/private_inventory.py` resolver and revalidate immediately before launch. Confirm the installed wrapper supports that setting and routes every cache, log and result there. Writability alone is insufficient: PUBLIC, unknown and unmanaged destinations must be refused. If the private directory or supported path adapter is missing, keep the tool in setup; do not create an arbitrary directory merely to make the process start.
- **Best free rate limit in the domain (shard): 60/min.** Use it as the default quote source on the free start before reaching for anything paid (CONSTITUTION C2).
- **Wrapper is small/young (9★, last push 2026-03).** It's a thin MCP over the official API, if a specific endpoint is missing or stale in the wrapper, call the Finnhub REST API directly with the same key rather than waiting on the wrapper.
- **Free-tier coverage is gated:** many premium endpoints (deeper history, some fundamentals/alt-data) are paid-only and return empty/`403` on the free key, don't mistake an access gate for "no data."
- **Sentiment/alt-data is a signal, not ground truth.** News/Reddit/Twitter sentiment and congress-trade feeds are directional color; corroborate with primary sources before drawing conclusions. (Shard cross-note: X is generally low-signal for consumer-demand research, treat social sentiment as soft.)
- Quotes on the free tier may be delayed; check the field/timestamp before assuming realtime.

## Failure signals & fallback
Failure looks like: empty/`403` on a premium endpoint (free-tier gate), HTTP 429 (60/min exceeded), or a missing tool in the thin wrapper. **Fallbacks:** wrapper gap → Finnhub REST directly; deep history / realtime / volume → **Polygon.io**; multi-asset realtime at 800/day → **Twelve Data**; authoritative fundamentals → **SEC EDGAR**; valuation ratios → **FMP**.

## Last verified: 2026-06
