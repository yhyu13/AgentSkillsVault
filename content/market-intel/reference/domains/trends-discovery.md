# Domain: trends-discovery

**Triage signals:** trends, Google Trends, Product Hunt, app store intel, startup/product
opportunity, news sentiment, alt-data signals, 趋势/选题/产品机会/舆情.

| source | route | capability | detect | note |
|---|---|---|---|---|
| **GDELT MCP** | ① free | global news tone/events/entities, 100+ langs, 15-min | connected, no auth | zero cost sentiment首选 |
| **Product Hunt MCP** (jaipandya/**producthunt-mcp-server** 46★) | ① free | posts/topics/votes, new-launch tracking | connected + PH token | most mature impl; ⚠ old `product-hunt-mcp` path is **D-404** + repo stale 2025-04 |
| **Trends MCP** (trendsmcp.ai) | ② | **25+** platforms normalized + growth rate | connected + token | free 100/mo; best "acceleration signal" |
| SerpApi Google Trends | ② | reliable JSON, cross-region | connected + key | free 250/mo |
| Exploding Topics | ② | curated emerging topics + forecast | API (Business tier) | early-signal, no MCP |
| google-play-scraper / app-store-scraper (npm) | ③ free | app details/reviews/rankings | lib installed | free, no key |
| mobile-store-scraper-mcp | ③ free | both stores details/reviews/similar | self-host | free MCP |
| **appreply-co/mcp-appstore** (62★) | ③ free | dual-store (Google Play + App Store) ASO-focused MCP in one server | self-host | **NEW 2026-07**: single MCP for both stores vs the split npm-lib pair above, actively maintained |
| Sensor Tower MCP | ② | download/revenue estimates | connected + ST token | needs pricey ST sub |
| Finnhub MCP | ① | news + Reddit/Twitter sentiment + congress trades | connected + free key | scarce alt-data, free 60/min |
| idea-reality-MCP (mnemox-ai 718★) | ① free | scan GitHub/HN/npm/PyPI/PH → reality_signal 0-100 | self-host | "is this idea saturated" (761★ at last gh-api check, 2026-07-22) |
| **jmanek/google-news-trends-mcp** (81★) | ③ L2 wrapper | Google News RSS + Google Trends trending keywords (5 tools) | self-host | free no-key; News RSS and unofficial Trends endpoints require separate current-operation checks; no official-API assurance |

**Default pick:** Trends → Trends MCP (or SerpApi for clean JSON, pytrends if free-but-shaky).
Products → Product Hunt MCP + idea-reality-MCP. News/sentiment → GDELT MCP (free) + Finnhub.
Selling → Trends MCP (TikTok leads Amazon 2 to 4 weeks = opportunity window).

**④ Browser/OSS route:** Trends → flack0x/trendspyg or sdil87/trendspy (pytrends archived). App
stores → facundoolano/google-play-scraper (2.9k★) + app-store-scraper (free, no key). TikTok/抖音
viral selling signals → davidteather/TikTok-Api (Playwright). Generic discovery scrape → crawl4ai /
playwright MCP. See `browser-automation.md`.

**Notes:** pytrends = relative values, no absolute volume, 429-prone (archived). Composio Jungle
Scout MCP being deprecated. data.ai has no dedicated MCP.

**Install guidance:** `reference/volatile/pricing-install.md` → trends-discovery.
