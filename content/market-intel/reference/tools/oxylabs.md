# Tool: Oxylabs (ecom scrape + MCP)

- **Domain(s):** ecommerce-arbitrage (also: web-scraping)
- **Barrier route:** ② resale · **Source tier:** L2 · **Ready MCP:** yes, official Oxylabs MCP
- **Cost:** Web Scraper API from **$49/mo** (Micro), $99 Starter, $249 Advanced; **$0.50/1K results** Amazon (no-JS) → $1.35/1K with JS render; **free trial 2,000 results, no card** [https://oxylabs.io/products/scraper-api/ecommerce, fetched 2026-06]
- **Repo / Provider:** https://oxylabs.io (Oxylabs; no first-party GitHub repo for the API, MCP is provider-shipped)
- **Top pick for its domain:** no

## What it does / when to pick it
Resale **anti-bot e-commerce scrape**: hands you parsed JSON for Amazon/eBay/Walmart/Google Shopping etc., with Oxylabs absorbing the proxy + CAPTCHA + ToS barrier. Pick it when the free ④ route keeps getting blocked at scale and you'd rather pay a provider to carry the ban risk than run your own proxy pool. Within ecommerce-arbitrage it's a **sibling/peer of Bright Data** (the shard pairs them), Bright Data is the cross-domain barrier-breaker hero with a free 5k/mo tier, so try Bright Data first; choose Oxylabs when you specifically want its structured ecom parsers or already have an Oxylabs contract.

## Install
Official **Oxylabs MCP** (provider-shipped), prefer the HTTP/hosted transport on Windows where available, else stdio per `reference/install-guide.md`. Or hit the Scraper API REST directly. The exact command is volatile; if it's not yet in `pricing-install.md` → `ecommerce-arbitrage`, treat like other ② MCPs: add via direct `~/.claude.json` edit (secret-bearing), restart session before use.

## Auth / keys
Create Oxylabs account → **Scraper API user (sub-user) username + password** (Basic auth), or an API token for the MCP. Start on the **2,000-result free trial (no card)** to validate. Key-bearing → hygiene one-liner: never `browser_snapshot` the credentials page; copy → clipboard → direct `~/.claude.json` edit, verify by length only. See `reference/install-guide.md` (Secret-handling hygiene).

## Usage, call examples
REST: `POST https://realtime.oxylabs.io/v1/queries` (Basic auth user:pass) with `{"source":"amazon_product","query":"B0...","geo_location":"United States","parse":true}` → parsed product JSON. Via MCP: call the universal-scraper / ecom-source tool with the target URL or ASIN. `source` values cover amazon_search/amazon_product/google_shopping/universal.

## General experience & gotchas (踩坑)
- **JS rendering doubles+ the cost** ($0.50→$1.35 per 1K Amazon results), only set `render:html`/JS when the page actually needs it; most Amazon product data parses without it.
- It's ② resale: **Oxylabs absorbs the ToS/ban risk**, which is the whole reason to pay, but you still inherit *their* block rate on hardened targets; a deal that looks off should be cross-checked live.
- **Bright Data is the cheaper first reach** (free 5k/mo Rapid, no card; cross-domain hero per the web-scraping shard). Per C2, don't default to Oxylabs if Bright Data's free tier covers the volume.
- Results are billed **per successful result**, but retries/failed parses can still nibble quota at scale, monitor the dashboard.
- `geo_location` is required for locale-correct pricing; omitting it skews currency/marketplace silently.
- Sales/rank fields (when parsed) are estimates, same ecom multiple-discrepancy caveat; cross-check with Keepa for anything load-bearing.

## Failure signals & fallback
Failure: HTTP 401 (sub-user creds), 403/`faulted` status in the response (target blocked even via Oxylabs), or empty `results`. **Fallback:** Bright Data ② (free 5k/mo, stronger barrier-breaker) → then free ④ omkarcloud/amazon-scraper or playwright; for Amazon *history* none of these substitute Keepa ①. Flag the gap.

## Last verified: 2026-06
