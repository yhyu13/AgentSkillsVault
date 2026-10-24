# Tool: Alex2Yang97/yahoo-finance-mcp

- **Domain(s):** finance-markets (also: none)
- **Barrier route:** ④ browser/scrape-backed · **Source tier:** L4 · **Ready MCP:** yes (stdio, `uvx --from git+...` or `pip` → `yahoo-finance-mcp`; no key)
- **Cost:** free, no key, no quota, wraps the `yfinance` library, which scrapes Yahoo Finance's public endpoints (no official pricing page; `yfinance` is unaffiliated with Yahoo)
- **Repo / Provider:** github.com/Alex2Yang97/yahoo-finance-mcp, `Alex2Yang97/yahoo-finance-mcp (0.3k★, gh-api 2026-06)` (306★ exactly; active, pushed 2026-03-23, not archived, MIT)
- **Top pick for its domain:** no

## What it does / when to pick it
A thin MCP over `yfinance`: historical OHLCV prices, `get_stock_info` (quote + profile + valuation snapshot), Yahoo Finance news, corporate actions (splits/dividends), financial statements, holder info, option expirations + chains, and analyst recommendations, for global tickers, all with **no API key and no signup**. **Decision rule:** this is the ONLY free, no-key route in finance-markets, so reach for it for a quick, throwaway lookup (a single quote, a chart, an options chain, a non-US ticker) when you don't want to provision a key. The moment the task needs reliability, scale, an audit trail, or anything production/algo, switch to a keyed sibling: US fundamentals/filings → **SEC EDGAR MCP** (free, authoritative); macro → **FRED MCP** (free key); live quotes/history at scale → **Polygon.io / Finnhub / Twelve Data** (tier limits unverified, confirm current plans at the providers' pricing pages). Never pick this where IP bans or silent data drift would matter.

## Install
stdio MCP via `uvx` (recommended) or `pip` then the `yahoo-finance-mcp` entrypoint. Requires **Python ≥ 3.11**. Exact, time-stamped command: `reference/volatile/pricing-install.md → finance-markets` (`uvx --from git+https://github.com/Alex2Yang97/yahoo-finance-mcp yahoo-finance-mcp`; or `uv run server.py` for local dev). L0 mechanics (stdio is flaky on Windows, prefer absolute paths and test in a plain shell first; a Dockerfile is included if you'd rather containerize): `reference/install-guide.md`. Restart / `/mcp` reconnect after adding.

## Auth / keys
No API key, no account, nothing to secret-hygiene, `yfinance` hits Yahoo's public web endpoints anonymously. That is also its weakness: the "auth" is really an unauthenticated scrape, so Yahoo can rate-limit or block your IP at will (see gotchas). Nothing to leak, so the key-hygiene rules in `install-guide.md` don't apply here.

## Usage, call examples
Nine MCP tools: `get_historical_stock_prices`, `get_stock_info`, `get_yahoo_finance_news`, `get_stock_actions`, `get_financial_statement`, `get_holder_info`, `get_option_expiration_dates`, `get_option_chain`, `get_recommendations`. Minimal flow: `get_stock_info("AAPL")` for a current snapshot; for a chart, `get_historical_stock_prices("AAPL", period="1y", interval="1d")`; for options, call `get_option_expiration_dates("AAPL")` first, then feed one date into `get_option_chain`.

## General experience & gotchas (踩坑)
- **⚠ yfinance scrapes Yahoo, not for prod/algo (shard).** It is an unofficial, undocumented-endpoint scrape; Yahoo changes the HTML/JSON without notice, which periodically breaks fields until the upstream lib patches.
- **IP-ban prone (shard).** Burst or scheduled polling earns rate-limit `429`s / empty frames and can soft-ban your IP for minutes-to-hours. Throttle hard, cache results, and never put it on a tight loop, this is the single biggest reason not to use it at scale.
- **No SLA, no support, no guaranteed accuracy.** Late/adjusted/back-filled values can shift silently; cross-check anything load-bearing against a keyed source before quoting it.
- **Global coverage, uneven depth.** Great for a fast non-US-ticker lookup (where free keyed US-only sources fall short), but fundamentals/holder depth is thinner and patchier than EDGAR XBRL.
- **Repo is a thin wrapper, lightly maintained.** Last push 2026-03; if Yahoo breaks an endpoint, the fix depends on the `yfinance` project, not this repo. MIT-licensed.
- **Adjusted vs raw prices.** Historical prices may be split/dividend-adjusted depending on params, confirm the adjustment basis before comparing levels across a corporate action.

## Failure signals & fallback
Failure looks like: rate-limit errors / `429`, empty or `None` dataframes for a valid ticker (Yahoo throttling or an endpoint change), or a field that silently went missing after a Yahoo-side HTML change. **Fallbacks:** US fundamentals/filings/insider → **SEC EDGAR MCP** (free, no key); macro/economic series → **FRED MCP** (free key); reliable quotes/history at scale → **Polygon.io** (paid tiers, pricing unverified, confirm at https://polygon.io/pricing) or **Finnhub** (free tier, limit unverified, confirm at https://finnhub.io/pricing) / **Twelve Data** (free tier, limit unverified, confirm at https://twelvedata.com/pricing); pre-parsed financials/valuation → **Financial Modeling Prep** (free tier, limit unverified, confirm at https://site.financialmodelingprep.com/developer/docs/pricing).

## Last verified: 2026-06
