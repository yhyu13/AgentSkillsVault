# Domain: ecommerce-arbitrage

**Triage signals:** Amazon/eBay/Walmart price, price history, BSR/sales rank, retail/online
arbitrage, cross-platform price compare, 选品/比价/套利.

| source | route | capability | detect | risk |
|---|---|---|---|---|
| **Keepa** (+ Keepa MCP cosjef/BWB03) | ① official | **price history curve + BSR/sales history + Buy Box/stock**, irreplaceable | connected + KEEPA_API_KEY | low; €49/mo+ scales with tokens |
| Amazon SP-API (private app) | ① official | your own cost/fees → profit calc | OAuth | private self-use = no dev fee. **Not the same product as PA-API** (Associates/affiliate API), which Amazon is deprecating 2026-05-15 in favor of Creators API (10 sales/30d gate), that change does not affect this SP-API row |
| Rainforest API (now trajectdata.com) | ② resale | real-time ASIN, Buy Box detection | connected | history weaker than Keepa; Hobbyist $23/mo |
| eBay Browse/Finding API | ① official | item price, discounts, lowest-price compare | AppID | free, official |
| PriceAPI | ② resale | Amazon + Google Shopping + eBay multi-source compare | connected | now **Go €99/mo** (5k credits) + free 1k trial (was €499; €499 is now Starter tier) |
| Oxylabs / Bright Data | ② resale | anti-bot ecom scrape, datasets | mcp connected | absorbs ToS risk |

**Default pick:** Amazon arbitrage → Keepa (the unique foundation) + SP-API private for profit.
Cross-platform compare → PriceAPI, plus free official eBay/Shopify Storefront MCP.

## ④ Browser/OSS route (free, self-host)
| repo | route | note |
|---|---|---|
| **jez500/pricebuddy** (1369★) | ④ self-host | Stars checked 2026-10-03. Docker Compose Laravel app, multi-store price tracker (Amazon/eBay/AliExpress), most active OSS pick in this table (NEW top pick 2026-07, doc+registry already existed, this row closes the gap) |
| **Cybrarist/Discount-Bandit** (697★) | ④ self-host | multi-store price tracker (Amazon/AliExpress/eBay), **self-built Keepa**: it records history from your deploy day (717★ at last gh-api check, 2026-07-22) |
| omkarcloud/amazon-scraper (220★) | ④ | 24 Amazon sites, search/detail/reviews, built-in anti-detect browser (226★ at last gh-api check, 2026-07-22) |
| playwright MCP | ④ | bespoke price/stock checks on any store, real rendered page |

**Key limit vs Keepa:** browser route **cannot backfill historical price/BSR**, it only accrues
from when you start recording. For deep price history Keepa ① is still irreplaceable. Use the OSS
route for live prices + self-built tracking; pay for Keepa only when you need years of history.

**No usable API (human-only, can't automate):** Helium 10, CamelCamelCamel. Sales numbers from
any tool are *estimates*, cross-check, differences can be multiples. Amazon anti-bot is strong →
proxies needed at scale (software free, proxies aren't).

**Install guidance:** `reference/volatile/pricing-install.md` → ecommerce-arbitrage.
