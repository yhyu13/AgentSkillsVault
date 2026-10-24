# Tool: CoinMarketCap MCP

- **Domain(s):** crypto-defi (also: none)
- **Barrier route:** ① official · **Source tier:** L1 · **Ready MCP:** yes, official, needs free key
- **Cost:** free, Basic tier **50 calls/min · 15k call credits/mo** [https://coinmarketcap.com/api/pricing/, fetched 2026-06]. Cheapest paid: Hobbyist $29/mo ($348/yr). Also offers x402 pay-per-call.
- **Repo / Provider:** https://coinmarketcap.com (official CMC MCP / Pro API)
- **Top pick for its domain:** no

## What it does / when to pick it
Quotes, technical-analysis indicators, derivatives data, and **market narratives/categories** over the CoinMarketCap Pro dataset. **Decision rule:** pick CMC when you specifically need its narrative/category framing, derivatives quotes, or TA indicators, i.e. when CoinGecko's plain price/market data isn't enough. For routine read-only price/volume and on-chain DEX history, **CoinGecko MCP is the default** (keyless, higher free throughput). Treat CMC as the complementary "quotes + narratives" leg, not the first stop.

## Install
Official MCP, **needs a free Basic key** (bearer/header). Exact, time-stamped command + key form: `reference/volatile/pricing-install.md → crypto-defi` and the shard line ("free Basic now 50/min + 15k credits/mo; x402 pay-per-call"). Prefer HTTP transport on Windows. L0 mechanics: `reference/install-guide.md`. Restart / `/mcp` reconnect after adding.

## Auth / keys
Free Basic key from the CoinMarketCap Pro dashboard (pro.coinmarketcap.com → API key). **Secret hygiene (key-bearing):** USER supplies the key; never echo it; edit `~/.claude.json` directly from clipboard rather than `claude mcp add` (which echoes the header/URL with the key), and never `browser_snapshot` the key page. One line + full rules: `reference/install-guide.md`.

## Usage, call examples
Tools cover latest quotes, listings, market metrics/categories, and (plan-gated) derivatives + TA. Minimal: pull the latest quote for a symbol, then list its category/narrative tags to frame which sector it sits in.

## General experience & gotchas (踩坑)
- **Credit-metered, not just rate-limited:** the **15k credits/mo** Basic cap is the real ceiling, many endpoints cost multiple credits per call, so a few wide listings calls can drain the month. Budget credits, don't just watch the 50/min.
- **Free Basic tier was bumped to 50/min (from 30/min)**, note any older skill text saying 30/min is stale.
- **Many endpoints are plan-gated:** historical, some derivatives, and advanced TA are paid-tier-only and return a `1006`/subscription error on Basic, that's an access gate, not "no data."
- **x402 pay-per-call** exists as an alternative to a subscription for occasional heavy calls, worth knowing before you upgrade a whole tier.
- Symbol collisions: prefer CMC's numeric `id` over ticker `symbol` to avoid pulling the wrong token.
- **Consumer site vs developer portal are SEPARATE account systems** (confirmed 2026-06), `coinmarketcap.com` (the consumer dashboard, watchlists, etc.) and `pro.coinmarketcap.com` (the API developer portal where the key issues) require independent signups. The consumer site accepts `gmail.com` freely; the pro portal applies anti-abuse on signup ("The email is restricted for this action") and on password reset, sometimes you can recover by registering on the consumer site first then visiting the pro portal under the same browser session. Don't assume one credential works on both.

## Failure signals & fallback
Failure looks like: `1006`/subscription-required on a gated endpoint, HTTP 429 (50/min), or a monthly-credit-exhausted error. **Fallbacks:** routine price/volume + on-chain DEX history → **CoinGecko MCP** (keyless, default); on-chain address/tx/ABI → **Etherscan MCP** / **Blockscout MCP**; protocol TVL/yields/fees → **DefiLlama** REST; smart-money labels → **Nansen**.

## Last verified: 2026-06
