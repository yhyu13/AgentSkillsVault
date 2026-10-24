# Tool: ccxt (library)

- **Domain(s):** crypto-defi (also: none)
- **Barrier route:**, (it's a library, not a barrier route) · **Source tier:** L1 · **Ready MCP:** this card covers the direct Python/JS/PHP library; a separate `ccxt-mcp` route is recorded in the dated installation notes
- **Cost:** free, open-source (MIT)
- **Repo / Provider:** github.com/ccxt/ccxt, `ccxt/ccxt (42.9k★, gh-api 2026-06)`, MIT, active (pushed 2026-06-08)
- **Top pick for its domain:** yes (the base layer for any cross-exchange spread / arb logic)

## What it does / when to pick it
Unified API over 100+ CEX exchanges (Binance, OKX, Bybit, Coinbase, Kraken, …): one interface for tickers, order books, OHLCV, balances, and order placement. Pick it whenever you need to **compare the same pair across exchanges** (spread monitor) or build the data layer for an arbitrage check, it normalizes each exchange's quirky API into one call shape. It is the default building block the shard names for cross-exchange logic; for read-only single-source price, CoinGecko MCP is lighter.

## Install
`pip install ccxt` (Python) or `npm i ccxt` (JS) installs the direct library described here. Use it from a script. The later [crypto-defi installation notes](../volatile/pricing-install.md#crypto-defi) also list a separate `ccxt-mcp` option; assess that package and its active host operations separately. This card has not verified the MCP's current installation or runtime. The direct library has no MCP transport requirement.

## Auth / keys
None for **public** market data (tickers, order books, OHLCV), fetch spreads with no key. API key + secret are needed only for **private** endpoints (balances, placing orders). If you wire in keys: keep them in env vars the user sets (`-e KEY=$VAR` form), never in the transcript or committed code, see `reference/install-guide.md` → Secret-handling hygiene. Use a small test wallet and never enable withdrawal permission on a trading key.

## Usage, call examples
```python
import ccxt
binance, okx = ccxt.binance(), ccxt.okx()
b = binance.fetch_ticker('BTC/USDT')['last']
o = okx.fetch_ticker('BTC/USDT')['last']
spread = (o - b) / b * 100   # cross-exchange % spread
```
Also: `exchange.fetch_order_book(sym)`, `exchange.fetch_ohlcv(sym, '1h')`. Async variant: `import ccxt.async_support`.

## General experience & gotchas (踩坑)
- **Reality check (shard):** public arbitrage scripts basically don't profit, by the time ccxt sees a spread it's gone after fees/slippage/transfer time. Real edge = latency, order flow, gas/capital mgmt. Use ccxt to *measure* spreads and funding, not as a money printer.
- **Rate limits are per-exchange and aggressive.** Set `exchange.enableRateLimit = True` or you get IP-banned (HTTP 418/429) mid-loop. Don't hammer `fetch_ticker` in a tight loop across 100 exchanges.
- **Symbol formats differ:** spot `BTC/USDT` vs perp `BTC/USDT:USDT`. Mixing them silently returns the wrong market. Call `load_markets()` and check.
- Quoted "last price" ignores the **spread + maker/taker fees + withdrawal/transfer cost**, a naive cross-exchange delta overstates real edge. Use bid/ask from the order book, not `last`.
- Some exchanges geo-block or require a verified account even for some public endpoints; a fetch can throw `ExchangeNotAvailable` from certain IPs.

## Failure signals & fallback
Failure = `ccxt.RateLimitExceeded` / HTTP 429 (slow down, enable rate limiting), `ccxt.AuthenticationError` (bad/missing key on a private call), `ccxt.ExchangeNotAvailable` (geo/region or downtime). Fallback: read-only price via **CoinGecko MCP**; funding-rate divergence via **funding-rates-mcp**; actual execution via **Hummingbot** (which uses ccxt-style connectors under the hood).

## Last verified: 2026-06
