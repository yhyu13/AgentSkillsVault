# Tool: Rainforest API

- **Domain(s):** ecommerce-arbitrage (also: none)
- **Barrier route:** ② resale · **Source tier:** L2 · **Ready MCP:** no (REST; wrap it yourself)
- **Cost:** from **$23/mo** (Hobbyist, 500 credits) → $83 Starter (10k) → $375 Production (250k); overage $0.06→$0.003/credit; free trial (no fixed free-credit count published) [https://trajectdata.com/pricing/rainforest-api, fetched 2026-06]
- **Repo / Provider:** https://www.rainforestapi.com (redirects to trajectdata.com, Traject Data; no GitHub repo)
- **Top pick for its domain:** no

## What it does / when to pick it
Resale Amazon-data API: **real-time** product/ASIN detail, search, **Buy Box detection**, offers, reviews, the provider absorbs Amazon's anti-bot wall so you get clean JSON. Pick it over Keepa when you need *live* state (current Buy Box winner, current offers/price right now) and don't need history; pick Keepa instead the moment you need a *historical* curve, Rainforest's history is weaker. Pick it over self-host scrape when you'd rather pay than run proxies.

## Install
No MCP. REST integration: get the API key → call the HTTP endpoint, wrap behind a thin tool. HTTP/REST only, no stdio. Not a one-line `claude mcp add`, there's no entry in `pricing-install.md` because it's code-integration; treat like SP-API/PriceAPI (REST behind your own wrapper).

## Auth / keys
Key from the Traject Data / Rainforest dashboard (`trajectdata.com`) after starting a plan/trial. Key-bearing → hygiene one-liner: keep `api_key` out of the transcript and out of git; env or direct `~/.claude.json` edit. See `reference/install-guide.md` (Secret-handling hygiene).

## Usage, call examples
`GET https://api.rainforestapi.com/request?api_key=KEY&type=product&amazon_domain=amazon.com&asin=B0...` → product JSON incl `buybox_winner`, `offers`. Other `type` values: `search`, `offers`, `reviews`, `bestsellers`. One credit ≈ one request.

## General experience & gotchas (踩坑)
- **NOT free**, the cheapest plan is $23/mo for only 500 credits; a real arbitrage sweep (thousands of ASINs) burns credits fast. Per CONSTITUTION C2, try the free ④ route (playwright / omkarcloud amazon-scraper) or Keepa-if-you-already-pay before adding this.
- **History is the known weak spot** (shard): if the question is "price over the last year / BSR trend," do not use Rainforest, use Keepa. Rainforest shines at *right-now* Buy Box/offers.
- It's a ② resale wrapper, you inherit *their* refresh cadence and occasional stale Buy Box; cross-check a couple of ASINs against the live page if a deal looks too good.
- `amazon_domain` is required and locale-specific; wrong domain returns a different marketplace's price silently.
- Sales/rank figures (if surfaced) are estimates, same multiple-discrepancy caveat as all ecom tools.

## Failure signals & fallback
Failure: HTTP 401 (key), 402/quota-exhausted (out of credits), or `request_info.success=false` in the JSON. **Fallback:** Keepa ① (for history + Buy Box, if you'd rather pay there) or the free omkarcloud/amazon-scraper ④ / playwright ④ for live spot data. Flag the gap if you drop to scrape (ToS risk shifts to you).

## Last verified: 2026-06
