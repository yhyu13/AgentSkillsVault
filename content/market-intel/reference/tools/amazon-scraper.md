# Tool: omkarcloud/amazon-scraper

- **Domain(s):** ecommerce-arbitrage (also: browser-automation)
- **Barrier route:** ④ browser / self-host · **Source tier:** L4 · **Ready MCP:** no (Python library / CLI; wrap it or call from your own script)
- **Cost:** free (self-host OSS, MIT; you pay only for your own runtime + proxies at scale)
- **Repo / Provider:** github.com/omkarcloud/amazon-scraper, `omkarcloud/amazon-scraper (0.2k★, gh-api 2026-06)`; active (220★, pushed 2026-04-30, not archived, **MIT**, gh-api 2026-06-09)
- **Top pick for its domain:** no (free live-data workhorse for Amazon; Keepa ① still owns history/BSR curves)

## What it does / when to pick it
Free Amazon scraper covering **24 Amazon sites** (.com/.co.uk/.de/.co.jp/…): search, product detail, and reviews, with a **built-in anti-detect browser** so you don't assemble your own stealth stack. **Decision rule:** pick it when you need current Amazon listing data (titles, prices, ratings, reviews) across regions at low/zero cost and don't need history, it's the Amazon-specialist of the free route. Choose **Keepa** ① instead for price/BSR/Buy-Box *history*; choose **Bright Data** ② when you want a provider to absorb the anti-bot barrier at scale instead of running the browser yourself; choose **Discount-Bandit** ④ when you want *ongoing* multi-store tracking rather than ad-hoc pulls.

## Install
Clone the selected `omkarcloud/amazon-scraper` repository into a source directory and
inspect that version's README before installing its dependencies in the chosen Python
environment. Do not substitute the similarly named PyPI package; it is a different
project, as the [botasaurus notes](botasaurus.md) explain. Exact dependencies, Python
requirements and entrypoint names remain unverified here until checked against the
selected version.

Before launching, use the full Market checkout's `tools/private_inventory.py` to verify
an existing PRIVATE versioned runtime. Check the selected scraper's supported paths
for result files, browser downloads, profiles, cookies and caches. Launch only through
an adapter that directs those writes to that absolute private runtime. If the entrypoint
can only write beside public source, keep the tool in setup until the writers can be
redirected. Installation alone does not establish an authenticated, usable operation.

## Auth / keys
No API key for the scraper itself → **no secret-hygiene key concern**. At scale you'll supply your own **proxy pool** (Amazon anti-bot is strong; software is free, proxies aren't, shard). No Amazon account needed for public search/detail/review reads.

## Usage, call examples
Library/CLI, not MCP: call its search function with a query + Amazon domain to get a result list, then its product function on an ASIN/URL for detail + reviews. Minimal flow: search `"patio-heater outdoor heater"` on `amazon.com` → take top ASINs → fetch detail+reviews per ASIN → hand the structured rows to the agent for compare/sentiment. Exact function names: read them off the live README (UNVERIFIED here, keep C1/C5, don't assume the signature).

## General experience & gotchas (踩坑)
- **No history**, it returns the *current* snapshot only. For price/BSR/sales-rank *over time*, Keepa ① is irreplaceable; this tool can't backfill (shard).
- **Sales numbers are estimates**, any BSR→sales inference is approximate; cross-check, differences between tools can be multiples (shard).
- **Amazon anti-bot is strong**: the built-in anti-detect browser helps for modest volume, but high-rate or many-region scraping needs **proxies** or you'll get throttled/CAPTCHA'd. Budget the proxy pool as the real cost.
- Live-run framing (ecommerce shard / cross-domain note): for hardened e-commerce at scale, **Bright Data is the hard-data hero**, if this scraper starts returning HTTP 500 / CAPTCHA / empty pages, don't keep retrying the free browser; escalate to Bright Data's provider-side unlock.
- 24-site coverage is a real strength for **cross-region arbitrage** (compare .de vs .com vs .co.jp), but each locale has its own layout quirks; spot-check fields per domain rather than trusting one parser everywhere.
- MIT-licensed (gh-api 2026-06), clean to reuse/redistribute.

## Failure signals & fallback
Failure looks like: HTTP 500 / CAPTCHA / empty or stub product pages, missing fields, or rate-limit blocks. **Fallbacks (named):** hardened Amazon at scale → **Bright Data** (② Web Unlocker, the barrier-breaker); a one-off live read → **playwright MCP** (④); price *history* → **Keepa** (①); ongoing multi-store tracking → **Discount-Bandit** (④); real-time ASIN + Buy Box without self-hosting → **Rainforest API** (②).

## Last verified: 2026-06
