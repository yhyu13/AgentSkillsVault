# Tool: CoinGecko MCP

- **Domain(s):** crypto-defi (also: none)
- **Barrier route:** ① official · **Source tier:** L1 · **Ready MCP:** yes, official hosted endpoint, public no key
- **Cost:** free, Demo tier keyless, **100 calls/min · 10k calls/mo cap** [https://www.coingecko.com/en/api/pricing, fetched 2026-06]. Cheapest paid: Basic $35/mo ($29 annual) → 300/min, 100k credits/mo.
- **Repo / Provider:** https://www.coingecko.com (official hosted MCP at `mcp.api.coingecko.com`)
- **Top pick for its domain:** yes

## What it does / when to pick it
Read-only price + market data for 15k+ coins, plus **GeckoTerminal on-chain DEX** data (OHLCV history down to 1s, pool liquidity). **Decision rule:** this is the **default read-only price source** for crypto-defi, reach for it first for any price/market-cap/volume question, and for DEX pool history (it beats DexScreener, which has no history). Pair it with `ccxt` for cross-exchange spreads and `funding-rates-mcp` for perp funding signal. For quotes + TA + derivatives narratives use CoinMarketCap; for on-chain wallet/tx use Etherscan/Blockscout.

## Install
HTTP/remote MCP, **public no key**, `npx mcp-remote https://mcp.api.coingecko.com/mcp`. Exact, time-stamped command: `reference/volatile/pricing-install.md → crypto-defi` ("CoinGecko: ... public, no key"). Prefer HTTP transport on Windows. L0 mechanics: `reference/install-guide.md`. A newly added MCP only works after session restart / `/mcp` reconnect.

## Auth / keys
None for the Demo tier, it is keyless. Only add a key if you upgrade to a paid plan for higher throughput (then secret-hygiene applies; see `reference/install-guide.md`). For most research the free no-key endpoint is sufficient (CONSTITUTION C2, free first).

## Usage, call examples
MCP exposes tools for coin price/markets, coin lists, OHLC, and GeckoTerminal on-chain pools/networks. Minimal: resolve a coin id, pull its current price + 24h volume, then (on-chain) fetch a GeckoTerminal pool's OHLCV history for the same asset on a target DEX/network.

## General experience & gotchas (踩坑)
- **Free Demo cap is 10k calls/mo and 100/min**, fine for research, but a tight loop over many coins/pools burns it fast; batch and cache. (Shard previously logged 15/min, the public-endpoint limit is now higher, but the **monthly cap is the real ceiling**.)
- **GeckoTerminal is the on-chain DEX edge:** OHLCV history to 1s + liquidity beats DexScreener for backtesting/spread work, use it, don't reach for a paid DEX feed.
- Coin ids are CoinGecko-specific slugs, not tickers, resolve via the coins-list tool first; ticker collisions (many "BTC"-named tokens) silently return the wrong asset otherwise.
- Read-only by design, no trading/execution. For actual cross-exchange logic use `ccxt`; for arbitrage execution use Hummingbot (needs a VPS).
- **Reality check (shard):** public arbitrage scripts basically don't profit, real edge is latency/order-flow/gas, not the price feed.

## Failure signals & fallback
Failure looks like: HTTP 429 (100/min or 10k/mo exceeded), empty result from a bad coin id, or a stale/missing on-chain pool. **Fallbacks:** quotes/TA/derivatives narratives → **CoinMarketCap MCP**; on-chain address/tx/ABI → **Etherscan MCP** (+ **Blockscout MCP** free for chains Etherscan dropped); protocol TVL/yields/fees → **DefiLlama** REST; cross-exchange spread → **ccxt**.

## Last verified: 2026-06
