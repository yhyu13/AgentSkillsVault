# Tool: GeckoTerminal API

- **Domain(s):** crypto-defi (also: none)
- **Barrier route:** ① · **Source tier:** L1 · **Ready MCP:** yes, surfaced via the CoinGecko MCP (`npx mcp-remote https://mcp.api.coingecko.com/mcp`); also callable as plain REST
- **Cost:** free, no key (public tier 10 calls/min). Paid CoinGecko plan lifts to 250 calls/min (~25x). [https://www.geckoterminal.com/dex-api, fetched 2026-06]
- **Repo / Provider:** https://www.geckoterminal.com (REST base `https://api.geckoterminal.com/api/v2`, verified 200 + JSON 2026-06), non-GitHub, no public repo
- **Top pick for its domain:** no (but the default on-chain DEX history source)

## What it does / when to pick it
DEX-pair analytics: OHLCV candle history (down to 1s), pool liquidity, trades, across 100+ networks (eth, solana, base, …). Pick it when you need **historical** DEX price/liquidity for a token or pool, it beats DexScreener, which has no history. For CEX-listed token spot price use CoinGecko; for wallet/tx-level on-chain use Etherscan/Blockscout. GeckoTerminal is the DEX-pair history layer.

## Install
If the selected CoinGecko MCP operation passes current-session verification, it can provide GeckoTerminal data (`npx mcp-remote https://mcp.api.coingecko.com/mcp`, public, no key). For raw REST just call `https://api.geckoterminal.com/api/v2/...` (no auth). Prefer the hosted MCP route on Windows. Exact command in `reference/volatile/pricing-install.md` → crypto-defi.

## Auth / keys
None for the free public tier (no key, no secret-hygiene concern). A paid CoinGecko API key only raises the rate limit (10 → 250 calls/min) and is supplied as a CoinGecko Pro key, not a separate GeckoTerminal credential.

## Usage, call examples
- Networks: `GET /api/v2/networks` → returns `{id:"eth", type:"network", attributes:{name:"Ethereum", ...}}, ...` (verified live 200 + JSON, 2026-06).
- Pool OHLCV: `GET /api/v2/networks/{network}/pools/{pool_address}/ohlcv/{timeframe}` (e.g. `.../ohlcv/hour?aggregate=4`).
- Top pools / token pools: `GET /api/v2/networks/{network}/tokens/{token_address}/pools`.
Via CoinGecko MCP, discover the on-chain/GeckoTerminal operations through the active host's callable-tool surface and inspect the selected operation's schema. Verify its execution, authentication and usable response in that session. Server configuration output is not a tool schema and can contain a paid key; diagnostics may return only the allowlisted selected-server fields in the [installation guide](../install-guide.md). Keep the operation unverified if that discovery or check is unavailable.

## General experience & gotchas (踩坑)
- **10 calls/min on the free tier is the real ceiling**, batch/space requests or you hit 429. A long backfill of 1s candles will rate-limit fast; pull coarse timeframes first, drill in only where needed.
- You query by **pool address**, not just token symbol. A token has many pools; pick the deepest-liquidity pool or you get thin/garbage candles. Resolve token → pools first.
- New / micro-cap pools have sparse or spiky OHLCV (low liquidity = wash-trade noise). Cross-check liquidity before trusting a price move.
- It is DEX-only, no CEX volume. For a token's *global* price, CoinGecko aggregates better.
- No API key means no per-user quota tracking; the limit is per-IP, so shared/CI IPs throttle sooner.

## Failure signals & fallback
Failure = HTTP 429 (rate-limited), 404 (wrong network id or pool address), or empty `data: []`. Fallbacks: **CoinGecko MCP** for aggregated spot price (no history) or **DexScreener** for current pairs; for the *historical* curve there is no free equal, slow down and respect the 10/min limit, or use a paid CoinGecko key for 250/min.

## Last verified: 2026-06
