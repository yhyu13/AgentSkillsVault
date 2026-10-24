# Tool: GDELT MCP

- **Domain(s):** trends-discovery (also: none, adjacent to finance-markets/news sentiment)
- **Barrier route:** ① official (free, no auth) · **Source tier:** L1 · **Ready MCP:** yes, connects with no auth (hosted bundle, e.g. mcpbundles.com/skills/gdelt); GDELT also has a plain public REST API (DOC 2.0) if you skip the MCP
- **Cost:** free, GDELT is 100% free and open, no key, no quota [https://www.gdeltproject.org, fetched 2026-06]
- **Repo / Provider:** https://www.gdeltproject.org (GDELT Project; MCP wrappers are third-party bundles, not a single canonical repo)
- **Top pick for its domain:** yes, the zero-cost news-tone/sentiment default

## What it does / when to pick it
GDELT monitors global news in 100+ languages and refreshes every 15 minutes, exposing event records (~300 categories, ~60 attributes), the Global Knowledge Graph (people/orgs/locations/themes/emotions), and a tone/sentiment signal. **Decision rule:** pick GDELT first for any news-sentiment, geopolitical-event, or "how is X being covered globally" question, it is free, no-auth, and multilingual, so it's the default before reaching for any paid alt-data. For *product/startup* discovery use Product Hunt MCP; for *trend acceleration* use Trends MCP; pair GDELT with Finnhub when you also want Reddit/Twitter sentiment + congress trades.

## Install
Connect a hosted GDELT MCP bundle (no-key, so `claude mcp add` is safe here, no secret to leak), OR call the public DOC 2.0 REST API directly (no MCP needed). Exact command lives in the volatile L1 line `reference/volatile/pricing-install.md → trends-discovery` (GDELT MCP: mcpbundles.com/skills/gdelt, free no auth). On Windows prefer the HTTP-transport hosted bundle over a stdio wrapper. A newly added MCP only works after session restart / `/mcp` reconnect. L0 mechanics: `reference/install-guide.md`.

## Auth / keys
None. No API key, no account, no quota, so the secret-hygiene script does **not** apply. The only constraint is politeness/rate on the public endpoints.

## Usage, call examples
Via MCP: tools for querying the DOC 2.0 article search (by keyword/tone/timespan/language) and the GKG (entities/themes/tone). Direct REST equivalent (no MCP):
`https://api.gdeltproject.org/api/v2/doc/doc?query=<keywords>&mode=ArtList&format=json&timespan=7d`
(swap `mode=ToneChart` for sentiment distribution). List the exact MCP tool names with your client after connecting, do not assume signatures from memory.

## General experience & gotchas (踩坑)
- **Tone is a coverage-volume + sentiment proxy, not ground truth.** GDELT measures *how news talks about* a topic, not consumer demand. A tone spike can be one viral wire story syndicated 500×; always sanity-check against article count.
- **Raw bulk is enormous**, one year of GKG ≈ 2.5TB. Never download raw files in an agent loop; use the DOC 2.0 API (`ArtList`/`ToneChart`/`TimelineVol`) or BigQuery for anything at scale.
- **English-skewed despite 100+ langs**, non-English coverage is thinner and translation-derived, so tone on niche non-English topics is noisier.
- **15-min latency, not real-time**, fine for trend/sentiment, not for sub-minute event trading.
- **Silent empties**: an over-narrow `query` or too-short `timespan` returns an empty result with HTTP 200, which reads like "no signal" rather than "bad query." Widen the timespan and loosen the query before concluding a topic is dead.
- It is **L1 free**, per CONSTITUTION C2 reach for it before any paid news/sentiment source.

## Failure signals & fallback
Failure looks like: empty `ArtList` on a topic you know is live (query too narrow), or tone that's dominated by one syndicated story. **Fallbacks:** for finance/alt-data sentiment with Reddit/Twitter dimensions use **Finnhub MCP** (free 60/min); for raw web-news scraping when GDELT's index lags use **Tavily/Exa** (web-scraping shard) or **Bright Data**; for product-launch signal switch to **Product Hunt MCP**.

## Last verified: 2026-06
