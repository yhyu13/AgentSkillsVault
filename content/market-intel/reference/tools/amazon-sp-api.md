# Tool: Amazon SP-API (private app)

- **Domain(s):** ecommerce-arbitrage (also: none)
- **Barrier route:** ① official · **Source tier:** L1 · **Ready MCP:** no (REST + an Amazon SDK; wrap it yourself)
- **Cost:** free for **private self-use** (your own seller account; no Marketplace dev fee). API calls themselves are free, rate-limited [https://developer-docs.amazon.com/sp-api]
- **Repo / Provider:** https://developer-docs.amazon.com/sp-api (official Amazon docs; no GitHub repo, official SDKs at github.com/amzn)
- **Top pick for its domain:** no (it's the *profit-calc* leg, not the discovery leg)

## What it does / when to pick it
The seller's-eye API: **your own** cost, fees (referral/FBA/storage), inbound, inventory, settlements → real **net-profit** per ASIN. Pick it only when *you* sell on Amazon and need true margin math; it answers "what do I actually net" that no scraper or Keepa can (those see public price, not your fee schedule). Pair with Keepa (history/demand) + SP-API (your economics) for the canonical arbitrage workflow. Not for prospecting competitors' data.

## Install
No MCP ships. Register a **private (self-authorized) app** in Seller Central → Develop Apps; this avoids the public Marketplace developer fee. Then call REST via an official SDK (Python/JS at github.com/amzn) wrapped behind your own thin tool, or use the LWA refresh-token flow directly. HTTP/REST only, no stdio process. No volatile install line in `pricing-install.md`; this is a code-integration, not a one-line `claude mcp add`.

## Auth / keys
LWA (Login with Amazon) OAuth: register the private app → get **LWA client id/secret + a refresh token** scoped to your seller account (newer flow no longer needs the AWS IAM/STS role-assumption dance for most sellers, confirm in current docs). Key-bearing → hygiene one-liner: keep client-secret/refresh-token out of the transcript; store in env / direct `~/.claude.json` edit, never echo. See `reference/install-guide.md` (Secret-handling hygiene).

## Usage, call examples
REST against `https://sellingpartnerapi-na.amazon.com` (or eu/fe host). Use `POST /products/fees/v0/items/{Asin}/feesEstimate` with the request body defined by Amazon's [getMyFeesEstimateForASIN operation](https://developer-docs.amazon.com/sp-api/reference/getmyfeesestimateforasin), including its `FeesEstimateRequest` object, to obtain a referral + FBA fee estimate. Use `GET /fba/inventory/v1/summaries` for your stock, and the Reports API for settlement/finance pulls. Each call needs the LWA access token (minted from the refresh token) in the `x-amz-access-token` header.

## General experience & gotchas (踩坑)
- **Private vs public is the whole trick:** a *private* app for your own account dodges the public developer registration/fee. Don't register public unless you're building for other sellers.
- **Rate limits are per-operation token buckets** (low burst, slow refill), bulk/Reports API exists precisely because per-item endpoints throttle fast; loop callers get 429.
- Regional hosts + marketplace IDs are mandatory and a common silent bug (NA host won't serve an EU marketplace).
- It only sees **your** account, it is *not* a competitor-intelligence or market-discovery source. Reaching for it to "scout other sellers" is the wrong tool (that's Keepa/Rainforest/scrape).
- Fee estimates are *estimates*; reconcile against actual settlement reports before trusting margins.

## Failure signals & fallback
Failure: HTTP 403 (token scope/region mismatch), 429 (throttled, back off, use Reports API), or `InvalidInput` on marketplace id. **Fallback:** for fee/price *estimates without a seller account*, use Keepa (Buy Box/price) + a manual FBA-fee calculator, or Rainforest for public Buy Box, but you lose true net-profit. Flag the gap.

## Last verified: 2026-06
