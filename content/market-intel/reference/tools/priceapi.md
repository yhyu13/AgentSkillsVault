# Tool: PriceAPI

- **Domain(s):** ecommerce-arbitrage (also: none)
- **Barrier route:** ② resale · **Source tier:** L2 · **Ready MCP:** no (REST; wrap it yourself)
- **Cost:** from **€99/mo** (Go, 5,000 credits; 1 credit = 1 product from 1 source); free trial **1,000 credits, no card, no time limit**; overage €0.02→€0.003 [https://www.priceapi.com/en/price/plans/, fetched 2026-06]
- **Repo / Provider:** https://www.priceapi.com (Stamm Inc / PriceAPI; no GitHub repo)
- **Top pick for its domain:** no

## What it does / when to pick it
One API across **Amazon + Google Shopping + eBay** (and more) for **multi-source price compare** in a single integration, the convenience play for cross-platform arbitrage. Pick it when you want one wrapper instead of stitching three official APIs (Keepa + eBay + a Google Shopping source) and are happy to pay for the time saved. Per CONSTITUTION C2, prefer the **free official legs first** (eBay API free + Shopify Storefront MCP free) and reach for PriceAPI when the multi-source breadth or Google Shopping coverage justifies the cost.

## Install
No MCP. REST: get the API token → call the job-based endpoint → wrap behind a thin tool. HTTP/REST only, async job model (submit job → poll for results), so the wrapper must handle polling. Not a `claude mcp add` source.

## Auth / keys
Token from the PriceAPI dashboard after the free trial / a plan. Start with the **1,000-credit free trial (no card)** to validate before paying. Key-bearing → hygiene one-liner: keep the token out of the transcript/git; env or direct `~/.claude.json`. See `reference/install-guide.md` (Secret-handling hygiene).

## Usage, call examples
Job-based: `POST https://api.priceapi.com/v2/jobs` with `token`, `source=amazon` (or `google_shopping`/`ebay`), `country`, `topic=product_and_offers`, `key=gtin|asin|term`, `values[]=...` → returns a `job_id`; then poll `GET /v2/jobs/{job_id}/download` for the result. Each product×source = 1 credit.

## General experience & gotchas (踩坑)
- **Price corrected vs the shard:** the domain shard says "€499/mo start", the live pricing page (2026-06) shows **€99/mo Go (5k credits)** as entry, with a 1,000-credit free trial. Use €99 + free trial; the €499 figure is stale (older Professional tier). Re-confirm at the pricing URL before quoting.
- **Async/job model bites first-timers:** you submit, then poll, a naive synchronous wrapper returns an empty/`new` job and looks broken. Budget for the poll loop and the (sometimes minutes-long) completion.
- **Credit = product × source.** Comparing one product across 3 sources = 3 credits; 5k/mo is consumed fast on a real catalog. Free official eBay leg first.
- Country is mandatory and shapes which marketplace/currency you get.
- Like all ② resale tools it inherits provider freshness; Amazon Buy Box can lag, Keepa is firmer for Amazon specifically.

## Failure signals & fallback
Failure: HTTP 401 (token), job stuck `new`/`working` forever (poll-loop bug or source backlog), or `status:"cancelled"` with an error reason. **Fallback:** stitch the free official legs, eBay Browse API ① + Shopify Storefront MCP ① + Keepa ① for the Amazon side, accepting more integration work. Flag the gap if you drop a source.

## Last verified: 2026-06
