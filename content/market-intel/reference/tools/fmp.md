# Tool: Financial Modeling Prep (FMP)

- **Domain(s):** finance-markets (also: none)
- **Barrier route:** ① official API · **Source tier:** L1 · **Ready MCP:** no, REST API (key); wrap it yourself or call REST directly
- **Cost:** free tier 250 req/day (US stocks); paid plans above that [https://site.financialmodelingprep.com/pricing-plans, web-search-corroborated 2026-06; live page 403s to WebFetch]
- **Repo / Provider:** https://site.financialmodelingprep.com (official provider)
- **Top pick for its domain:** no (the pre-parsed-financials/valuation convenience layer)

## What it does / when to pick it
FMP serves company financials and valuation: income statement / balance sheet / cash flow (already parsed), ratios, DCF/valuation, key metrics, and market data. **Decision rule:** pick FMP when you want **pre-parsed financial statements and valuation ratios** without doing the XBRL extraction yourself, it's the convenience layer over what SEC EDGAR holds raw. Use EDGAR when you need the authoritative source-of-truth number or a non-standard line; use FMP when you want ratios/DCF/standardized statements fast. For live quotes prefer Finnhub/Twelve Data/Polygon.

## Install
**No ready MCP**, FMP is a plain REST API. ⚠ **API path migrated 2025-08-31**: legacy `/api/v3/...` returns `"Legacy Endpoint"` error for new accounts; use the current `/stable/...` namespace instead (e.g. `https://financialmodelingprep.com/stable/quote?symbol=AAPL&apikey=KEY`). Either call REST directly or wrap it in a small custom MCP. Exact context: `reference/volatile/pricing-install.md → finance-markets` (shard line: "Financial Modeling Prep free 250/day"). L0 mechanics: `reference/install-guide.md`.

## Auth / keys
Free API key from site.financialmodelingprep.com (signup → dashboard; free 250 req/day, no card). **Secret hygiene (key-bearing):** USER supplies the key; never echo it into the transcript; never `browser_snapshot` the dashboard key page; keep the key out of any committed file. One line + full rules: `reference/install-guide.md`. (Key goes in the `apikey` query param for REST.)

## Usage, call examples
REST endpoints cover `income-statement`, `balance-sheet-statement`, `cash-flow-statement`, `ratios`, `key-metrics`, `discounted-cash-flow`, and `quote`. Minimal (current /stable namespace): `GET https://financialmodelingprep.com/stable/quote?symbol=AAPL&apikey=KEY` → quote JSON; `GET https://financialmodelingprep.com/stable/income-statement?symbol=AAPL&period=annual&apikey=KEY` → annual income statement. The argument convention also changed: legacy used path params (`/api/v3/quote/AAPL`), `/stable` uses query params (`?symbol=AAPL`).

## General experience & gotchas (踩坑)
- **Free = 250/day (shard, confirmed 2026-06).** Lowest free budget of the quote-tier siblings (Finnhub 60/min, Twelve Data 800/day), fine for a handful of company pulls, not for wide scans. Cache aggressively.
- **No MCP wrapper in the inventory, you call REST.** Don't wait on an MCP; hit the endpoint directly or wrap a thin one.
- **Free tier is US-stocks-only and history-limited:** 46+ global exchanges, 30+ yr history, and several endpoints (earnings calendar, stock peers, some premium datasets) are paid-only and return empty/`403`/`Legacy Endpoint` on the free key, an access gate, not "no data."
- **Live page 403s to automated fetch:** the pricing/docs pages block WebFetch (numbers here are web-search-corroborated 2026-06). Re-verify tier prices in a real browser before quoting/spending.
- **It's a parsed-financials convenience layer, not the source of record**, when a number must be authoritative or a line is non-standard, go to the SEC filing via **SEC EDGAR**.
- **Google OAuth signup walks a 5-question wizard before the key is shown** (confirmed 2026-06-16), purpose / dataset / criteria / role / how-heard. Default-good answers: `Market Research → Financial Statements → Data Accuracy → Investor/Analyst → Search Engine`. Submit lands at `/developer/docs/dashboard` where the key is rendered as plaintext (no masking), same DOM-leak warning as Twelve Data. Format is 32-char alphanumeric.
- **Legacy `/api/v3/*` endpoints fully sunset 2025-08-31** for new accounts, calling them returns `{"Error Message":"Legacy Endpoint : Due to Legacy endpoints being no longer supported - This endpoint is only available for legacy users who have valid subscriptions prior August 31, 2025."}`. New accounts MUST use `https://financialmodelingprep.com/stable/...` with query params (`?symbol=AAPL&apikey=KEY`), NOT path params (`/AAPL`).

## Failure signals & fallback
Failure looks like: empty/`403`/legacy-endpoint message on a premium or non-US endpoint (free gate), HTTP 429 (250/day exceeded), or a 401 on a bad key. **Fallbacks:** authoritative/raw fundamentals → **SEC EDGAR MCP**; live quotes → **Finnhub** (60/min) / **Twelve Data** (800/day); deep history/realtime → **Polygon.io**; macro context → **FRED**.

## Last verified: 2026-06
