# Tool: Shopify Storefront MCP

- **Domain(s):** ecommerce-arbitrage (also: content-cms)
- **Barrier route:** ① official · **Source tier:** L1 · **Ready MCP:** yes, hosted per-shop HTTP `https://{shop}.myshopify.com/api/mcp` (no install, no token; just point your client at the shop's URL)
- **Cost:** free (official Shopify endpoint; no API fee, no key) [pricing not separately published, it's a built-in storefront surface; capabilities confirmed at https://shopify.dev/docs/apps/build/storefront-mcp, fetched 2026-06]
- **Repo / Provider:** https://shopify.dev (official Shopify; no GitHub repo, it's a hosted endpoint baked into every Shopify storefront)
- **Top pick for its domain:** no (Keepa ① owns Amazon history; this is the free **per-shop catalog** complement for non-Amazon / DTC-store compare)

## What it does / when to pick it
Every Shopify store exposes a free, official MCP endpoint giving natural-language **catalog search**, product details, cart management and order tracking for *that one shop*. **Decision rule:** pick it when your target is a specific Shopify-hosted brand store (DTC / Shopify merchant) and you want clean, ToS-compliant product + price data without scraping, it's the official sibling to the free eBay API in the shard's "cross-platform compare → free official eBay/Shopify Storefront MCP" rule. It does **not** cover Amazon, give cross-store search, or provide price *history*, for those see Keepa ① / Discount-Bandit ④.

## Install
No install package. It's a hosted HTTP MCP per shop. Add to `~/.claude.json` (or `claude mcp add --transport http`) pointing at the specific store: `https://{shop}.myshopify.com/api/mcp` (replace `{shop}`). One entry per shop you want to query. Prefer HTTP transport (Windows-friendly). Exact line: `reference/volatile/pricing-install.md → ecommerce-arbitrage`. L0 mechanics: `reference/install-guide.md`. Restart / `/mcp` reconnect after adding.

## Auth / keys
None for public storefront browsing, it's the storefront surface, open to buyers/agents. No key, no secret-hygiene concern (this is not a key-bearing tool). (Authenticated cart/checkout/customer actions may require a customer session, but read-side catalog/product queries are open.)

## Usage, call examples
Point your MCP client at one shop's `https://{shop}.myshopify.com/api/mcp` and call its tools (Shopify's docs confirm product discovery / natural-language search, cart management + checkout, store-info/policy Q&A, and order tracking, verify the exact tool names from your connected server's tool list, as the surface evolves). Minimal flow: connect to `https://examplebrand.myshopify.com/api/mcp` → search a product term → read returned product/price/variant fields. Exact tool-name strings: read them off the live `/mcp` tool list rather than assuming (UNVERIFIED here, Shopify iterates the tool set). Note: as of 2026-06 the structured *catalog* tools (`search_catalog`/`lookup_catalog`/`get_product`) appear to be served from a separate **`https://{shop}.myshopify.com/api/ucp/mcp`** (UCP) endpoint while the base `/api/mcp` exposes cart/policy/FAQ tools, unverified, confirm both endpoints' live tool lists at https://shopify.dev/docs/apps/build/storefront-mcp.

## General experience & gotchas (踩坑)
- **One endpoint = one shop.** There is no global Shopify search; you must already know the store's `myshopify.com` domain. For discovering *which* Shopify stores sell a product, you still need a search/scrape layer (Tavily/Exa → then connect the shop's MCP).
- **No price history**, like all the route-④ OSS trackers, it's live-only. For multi-month price curves you need Keepa ① (Amazon) or self-built Discount-Bandit ④ (multi-store, accrues from deploy day).
- Plenty of brands use a **custom domain**, not `*.myshopify.com`; the MCP still lives at the underlying `{shop}.myshopify.com/api/mcp`, find the real myshopify subdomain (page source / DNS) before connecting.
- It returns the merchant's *own* catalog only, no Buy Box, no third-party-seller competition, no marketplace cross-listing. It's a clean single-source-of-truth for that brand, not an arbitrage spread tool by itself.
- Compliant ① route: no ban risk, no proxies, unlike the scraper siblings. Reach for it *first* when the target is a Shopify store.

## Failure signals & fallback
Failure looks like: the shop is not on Shopify (endpoint 404), uses a non-`myshopify.com` storefront you can't resolve, or the field you need (history, seller competition) isn't exposed. **Fallbacks:** non-Shopify or unknown-host store → **playwright MCP** (④, render + read the live page) or **Bright Data** (② if the store is hardened); price history / tracking over time → **Discount-Bandit** (④ self-host) or **Keepa** (① for Amazon); Amazon specifically → **Keepa** / **amazon-scraper**.

## Last verified: 2026-06
