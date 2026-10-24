# Tool: Twelve Data

- **Domain(s):** finance-markets (also: none)
- **Barrier route:** ① official API · **Source tier:** L1 · **Ready MCP:** yes (official Twelve Data MCP; free key)
- **Cost:** free tier 800 req/day (8 req/min); paid Grow $79 / Pro $229 / Ultra $999 per month [https://twelvedata.com/pricing, fetched 2026-06]
- **Repo / Provider:** https://twelvedata.com (official provider)
- **Top pick for its domain:** no (the multi-asset realtime alternative to Finnhub on the free start)

## What it does / when to pick it
Multi-asset market data: realtime + historical quotes across stocks, ETFs, forex, and crypto, plus technical indicators, via REST/WebSocket and an official MCP. **Decision rule:** pick Twelve Data over Finnhub when you want **broad multi-asset realtime** (forex/crypto alongside US equities) on a free key, its free tier includes realtime US equities/ETFs and realtime forex/crypto. Finnhub wins on rate (60/min vs 8/min) and alt-data; Twelve Data wins on asset breadth and built-in indicators. For deep history / heavy volume, step up to Polygon.

## Install
Official Twelve Data MCP (key-bearing). Exact, time-stamped command: `reference/volatile/pricing-install.md → finance-markets` (shard line: "Twelve Data free 800/day"). L0 mechanics (prefer HTTP transport on Windows): `reference/install-guide.md`. Restart / `/mcp` reconnect after adding.

## Auth / keys
Free API key from twelvedata.com (Basic plan, no card). **Secret hygiene (key-bearing):** USER supplies the key via the env/`-e` form; never echo it; edit `~/.claude.json` directly rather than `claude mcp add` (which echoes args), and never `browser_snapshot` the key page. One line + full rules: `reference/install-guide.md`.

## Usage, call examples
Endpoints/tools cover time series (OHLC bars at various intervals), realtime quote/price, and a large library of technical indicators (RSI, MACD, etc.). Minimal: fetch a daily time series for a symbol, or pull a single realtime price; add an indicator endpoint when you need TA computed server-side.

## General experience & gotchas (踩坑)
- **800/day is the free budget (shard), it goes fast.** 8 req/min and 800/day; a multi-symbol or indicator-heavy loop exhausts it quickly. Batch symbols where the endpoint allows and cache.
- **Realtime coverage is plan-gated by market (verified pricing 2026-06):** free Basic = realtime US equities/ETFs + realtime forex/crypto, but EU/AU and global EOD realtime are paid (Grow/Pro/Ultra). Don't assume *every* market is realtime on the free key, check the symbol's exchange.
- **"Free realtime" caveat (shard):** for any non-included market the free tier is delayed/EOD; verify the timestamp before treating a quote as live.
- **Paid pricing confirmed 2026-06** (Grow $79 / Pro $229 / Ultra $999), still re-verify before committing spend, prices rot.
- Multi-asset breadth is the draw; for SEC fundamentals use EDGAR, for macro use FRED.
- **Google OAuth signup is instant, key is plaintext-visible in DOM** (confirmed 2026-06-16), `twelvedata.com/register` → Google OAuth → straight to `/account/api-keys` where the key is rendered as plaintext text in the page (no masking, no copy-only button). **Reading via `browser_evaluate` pipes the value into the agent transcript.** Have the user click the page's own Copy button instead, and pipe through `Get-Clipboard`. Format is 32-char hex.

## Failure signals & fallback
Failure looks like: HTTP 429 / "API limit reached" (800/day or 8/min hit), delayed data on a non-included market (plan gate), or a 401 on a bad key. **Fallbacks:** higher free rate + alt-data → **Finnhub** (60/min); deep history / WebSocket / volume → **Polygon.io**; fundamentals/filings → **SEC EDGAR**; macro → **FRED**.

## Last verified: 2026-06
