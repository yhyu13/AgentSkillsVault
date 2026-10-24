# Domain: consumer-price-compare

**Triage signals:** "I'm about to buy product X, find me the cheapest", "compare prices for X",
"is this a good deal", "should I wait for a sale", "what's the historical low", `比价`,
`查历史价`, `全网最低价`, `X 在哪里买便宜`, `凑单`.

> **This domain is delegated to a sister skill, `shopping-aggregator`.** market-intel itself
> does not implement consumer price compare. When triage hits this domain, **defer the entire
> work to that skill** instead of fanning out from market-intel.

## When this domain applies (consumer side)

The user is about to make a **personal purchase** and wants:
- multi-retailer landed-cost comparison (Amazon / eBay / Walmart / Target / Best Buy / Taobao /
  JD / Pinduoduo)
- price history ("is now a good time to buy?"), Keepa, Camelcamelcamel, 慢慢买
- coupon / cashback stacking, Capital One Shopping, Karma, Coupert, 购物党
- deal-discovery signals, Slickdeals, Flipp, ShopSavvy, 什么值得买
- self-host trackers, pricebuddy, PriceGhost, PriceDive

## When the OTHER ecommerce shard applies (seller side)

If the user is sourcing for **resale, arbitrage, FBA, or wholesale**, use
[`ecommerce-arbitrage.md`](ecommerce-arbitrage.md) instead, the data source (Keepa + Amazon
SP-API + Helium 10 sales estimates) and the verifier mindset (margin, BSR trend, supplier risk)
are different.

| Question | Domain |
|---|---|
| "Where can I buy this Bose QC45 cheapest right now?" | consumer-price-compare → defer to shopping-aggregator |
| "Should I import this widget from AliExpress and FBA it on Amazon?" | ecommerce-arbitrage (this matrix) |
| "Is this category trending? What's the market sizing?" | trends-discovery / general market-intel |

## How to delegate

When triage hits this domain, return early from the market-intel workflow with:

> "This question is consumer shopping price comparison. Delegating to the
> [`shopping-aggregator`](https://github.com/DaizeDong/shopping-aggregator) skill. Install:
> `/plugin install github:DaizeDong/shopping-aggregator`."

If `shopping-aggregator` is already installed, the system auto-routes via its own trigger
phrases. Don't try to recreate the work in market-intel, that violates P5 (delegate, don't
reinvent) and would compete with the sister skill's specialization.

## Why this domain exists in market-intel

A 2026-06-15 user research run surfaced that market-intel was being asked consumer-shopping
questions without a clean delegation path. The result was incomplete: market-intel's
ecommerce-arbitrage shard was framed as **seller-side**, missing browser-extension coverage,
missing CN consumer tools (慢慢买/购物党/什么值得买), missing the Honey 2026 trust event, missing
the BigGo MCP / Apify price-intelligence MCP plumbing for consumer agents. Rather than expand
this matrix to cover both sides, the consumer side was extracted to `shopping-aggregator` as a
sister skill. This shard exists as the **routing pointer**, it has no per-tool docs and no
volatile pricing, by design.

## Cross-reference back

`shopping-aggregator/skills/shopping-aggregator/reference/sources-index.md` has the reverse
pointer, when its triage hits a seller-side or broad-research question, it defers to
market-intel. The boundary is mutual.

## Last verified: 2026-06
