# Tool: DefiLlama API

- **Domain(s):** crypto-defi (also: none)
- **Barrier route:** ① · **Source tier:** L1 · **Ready MCP:** no, official surface is a free no-key REST API; only 3rd-party community MCPs wrap it (unmaintained, skip, call REST directly).
- **Cost:** free, no key (open API `api.llama.fi`); optional Pro at $300/mo for 38 extra endpoints + higher limits [https://api-docs.defillama.com, fetched 2026-06]
- **Repo / Provider:** https://defillama.com/docs/api (REST; open base `https://api.llama.fi`)
- **Top pick for its domain:** no

## What it does / when to pick it
DefiLlama is the DeFi ground-truth dataset the crypto-defi matrix lacked: protocol **TVL**, **yields/APY**, **stablecoin** supply/peg, **DEX & perp volume**, and **fees/revenue**, all free and keyless. Pick it whenever the question is *protocol- or sector-level analytics* ("which lending protocols are bleeding TVL", "best stablecoin APY", "Arbitrum DEX volume trend"). It is NOT a per-token price feed (use **CoinGecko MCP**), NOT raw on-chain state (use **Etherscan / Blockscout MCP**), and NOT DEX OHLCV candles (use **GeckoTerminal**). Reach for it when you need normalized, cross-protocol economics rather than a single address or coin quote.

## Install
No install, it is plain REST, no key, no MCP server. Call from a shell or any HTTP client:
```
curl https://api.llama.fi/protocols
```
Endpoints are split across hosts by category: `api.llama.fi` (TVL/fees/volume), `yields.llama.fi` (yields), `stablecoins.llama.fi` (stablecoins), `coins.llama.fi` (price-by-contract). Pro endpoints live under `https://pro-api.llama.fi/{API_KEY}/...`. No Windows-specific quirks (no local process). See L1 line in `reference/volatile/pricing-install.md` → crypto-defi; L0 mechanics in `reference/install-guide.md`.

## Auth / keys
None for the open API, do not send an Authorization header. A key is only needed for the $300/mo Pro tier (richer history, emissions, active-users, locked breakdowns); the key goes **in the URL path** (`pro-api.llama.fi/{KEY}/...`), so if you ever use Pro, treat that URL as a secret, never paste it into the transcript or commit it; have the user hold it.

## Usage, call examples
Direct REST (no MCP tool names). Minimal example, current TVL of one protocol:
```
curl https://api.llama.fi/tvl/aave        # -> single number, current USD TVL
```
Other workhorses:
- `GET api.llama.fi/protocols`, all protocols + TVL + 1d/7d change (large, ~5k entries)
- `GET api.llama.fi/protocol/{slug}`, full TVL history + chain breakdown for one protocol
- `GET yields.llama.fi/pools`, every yield pool (apy, tvlUsd, project, chain)
- `GET stablecoins.llama.fi/stablecoins?includePrices=true`, supply + peg per stablecoin
- `GET api.llama.fi/overview/fees/{chain}` and `/overview/dexs/{chain}`, fees & DEX volume
- `GET coins.llama.fi/prices/current/{chain}:{address}`, price by token contract

## General experience & gotchas (踩坑)
- **No documented hard rate limit on the open API, but it is courtesy-throttled**, keep it to a few req/s; bursty loops get soft-blocked (HTTP 429 / connection resets). For repeated pulls, cache locally rather than re-hammering.
- **Host split is a real trap:** yields/stablecoins/coins are *separate subdomains*, not paths on `api.llama.fi`. Hitting `api.llama.fi/pools` returns 404, use `yields.llama.fi/pools`.
- **Protocol identifier is the DefiLlama slug**, not the CoinGecko id or ticker (e.g. `aave-v3`, `lido`). Look it up from `/protocols` first; guessing the slug 404s.
- **TVL ≠ market cap and is double-count-prone**, bridged/staked assets can be counted across chains; `chainTvls` + the `tvl`/`borrowed`/`staking` sub-keys matter for lending and LST protocols. Read the protocol's `methodology` field before quoting a headline number.
- **Numbers are point-in-time and revise**, DefiLlama backfills/re-labels adapters, so a historical series can shift between pulls. Stamp the fetch date.
- **`coins.llama.fi` prices are convenience, not authoritative** for thin tokens, cross-check against CoinGecko/GeckoTerminal for anything illiquid.

## Failure signals & fallback
- 404 on a path → wrong host (use the category subdomain) or wrong slug (re-resolve from `/protocols`).
- 429 / dropped connection → you are being throttled; back off and cache. Persistent block → route the request through **Tavily/Firecrawl** fetch or a proxy, or pull the same TVL/price via **CoinGecko MCP**.
- For data DefiLlama doesn't have (live per-coin quotes, on-chain balances/tx, DEX candles) fall back to the named siblings: **CoinGecko MCP** (prices), **Etherscan / Blockscout MCP** (on-chain), **GeckoTerminal** (DEX OHLCV). If you need smart-money labels rather than protocol aggregates, that's **Nansen**, not DefiLlama.

## Last verified: 2026-06
