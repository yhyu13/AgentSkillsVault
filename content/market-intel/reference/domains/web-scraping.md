# Domain: web-scraping

**Triage signals:** general SERP, crawl a site, scrape JS-heavy page, break paywall/anti-bot,
extract structured data, 网页抓取/搜索基础设施.

**Layered stack, not one tool.** Built-in WebFetch runs no JS and uses your IP (easily blocked);
built-in WebSearch returns title+url only. Layer specialists on top.

| source | route | capability | detect | note |
|---|---|---|---|---|
| **Tavily** / **Exa** | ② | search layer (semantic, date/domain filter) | MCP or optional `exa-search` skill | Verify current plan terms. HTTP 401 requires an authentication check; 429 may indicate quota or rate limiting. Never rotate credentials automatically. |
| **Parallel Search MCP** | ② | public web search + focused page excerpts | `https://search.parallel.ai/mcp`, keyless; probe search/fetch | Free light-use route; preserve session_id, validate original dates, no stability claim from one call |
| **Firecrawl** | ② | JS-render scrape, crawl, JSON extract | skill `firecrawl` present | hosted stealth strong; self-host weak vs WAF |
| **Bright Data** | ② | Web Unlocker, beats Cloudflare/DataDome/CAPTCHA; unlocks Amazon/Taobao/Reddit | hosted HTTP MCP (verified 2026-06) | strongest barrier-breaker; **free 5k/mo Rapid, no card** |
| DataForSEO | ② | cheap large-scale SERP | connected | ~$0.0006/query, 1/10 of SerpApi |
| Apify | ② | 3000+ prebuilt actors (social/ecom/maps) | apify MCP | pin specific actors to avoid tool flood |
| Crawl4AI | ③ free | OSS self-host LLM crawler, auto anti-bot | docker MCP | zero cost if you self-host |
| **Scrapling** (78.8k★) | ③ free (④ stealth tier) | adaptive-selector scrape framework: TLS-impersonating HTTP tier + StealthyFetcher that **solves** Cloudflare Turnstile/Interstitial headlessly; spider w/ proxy rotation; ships its own MCP | `pip install scrapling` / MCP (github.com/D4Vinci/Scrapling) | BSD-3, 7.9k forks, pushed 2026-09-04. First free row that is a whole acquisition stack rather than a component. Still defers **enterprise-grade WAFs to a paid partner** and has **no SERP layer** → Bright Data② stays the hard-target pick |
| **wigolo** (5.1k★) | ③/④ free | local-first **search** + fetch + crawl + extract in one MCP, no API key: 18-engine SERP fusion + SearXNG fallback, HTTP→headless auto-escalation | verify private runtime and model adapter first; see `tools/wigolo.md` | adds a self-hosted search alternative alongside hosted free tiers. ⚠ public beta, npm pinned behind the repo, ~98% single-maintainer; **does not bypass Cloudflare/DataDome**, returns a labelled `blocked_by_challenge` and wants your own proxy for IP-reputation walls |
| **Patchright** (4.4k★) | ④ free | undetected-Playwright patch: passes Cloudflare/DataDome/Akamai/Kasada/F5 | `pip install patchright` / npm | free Apache-2.0; patches the browser fingerprint but needs a proxy for IP-reputation blocks (complements Bright Data) |
| **Bright Data DaaS** | brokerage | curated datasets, Amazon, LinkedIn, Twitter/X, Crunchbase, Walmart, eBay; pay-per-record, no scrape | hosted MCP + REST | **v1.3 brokerage tier**, the "I don't want to scrape, I want the data" abstraction; collapses 4-5 source juggling into one bill |
| **datarade marketplace** | brokerage | aggregator over 1000+ data providers, single contract | REST API | **v1.3 brokerage tier**, for niche or geo-specific datasets the big providers don't cover; pricing on request per dataset |

**Default architecture:** WebFetch (static/PDF fallback) + Tavily/Exa (search) + Firecrawl (JS
scrape) + Bright Data (hard targets) + DataForSEO (bulk SERP monitoring).

**Note:** firecrawl skill claims to take over all web ops, when both available, route web through
firecrawl but keep specialists for SERP/barrier work. Volatile pricing changes fast (Brave dropped
free tier, Exa raised prices), verify before quoting.

For live commerce prices, verify the variant, seller, timestamp and login requirements.
A connected browser alone is not evidence. On a challenge or missing fields, preserve
the gap and use a separately verified browser or specialist source.

**Brokerage options:** compare scope, provenance, freshness, permitted use and cost.
Catalog inclusion does not establish dataset entitlement or delivery quality.
When the calculus is "I will burn engineer-weeks fighting CAPTCHAs and proxy bans, OR pay $X for a
clean dataset," and ④ feels like more work than payoff, reach for brokerage. Bright Data DaaS is the
broad-stroke pick; datarade marketplace for niche/geo-specific data.

**Install guidance:** `reference/volatile/pricing-install.md` → web-scraping.
