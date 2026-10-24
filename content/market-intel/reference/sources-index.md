# Commercial source index (thin)

One line per domain. At triage, match the topic to 1 to N domains, then read ONLY the matched
shard(s) in `domains/`. Do not read shards you didn't match.

| domain | triage signals | top pick (barrier route) | shard |
|---|---|---|---|
| x-twitter | tweets, X sentiment, influencer, viral, 推特舆情 | twscrape ③ free · playwright ④ (twitterapi.io ② resale if paid) | `domains/x-twitter.md` |
| reddit-community | Reddit/HN/Discord/forum pain points, 社区调研 | HN MCP ① free · reddit-mcp-buddy ① | `domains/reddit-community.md` |
| web-scraping | general SERP, crawl, JS site, break paywall, 抓取 | Tavily/Exa + Firecrawl + Bright Data | `domains/web-scraping.md` |
| ecommerce-arbitrage | Amazon/eBay price, BSR, retail arbitrage, 选品比价 | Keepa ① official | `domains/ecommerce-arbitrage.md` |
| finance-markets | stocks, options, fundamentals, SEC, macro, 股票 | SEC EDGAR + FRED ① free | `domains/finance-markets.md` |
| crypto-defi | crypto price, on-chain, DEX, funding rate, MEV, 套利 | CoinGecko ① + ccxt | `domains/crypto-defi.md` |
| seo-keywords | keyword volume, backlinks, competitor SEO, SERP rank | GSC ① free + DataForSEO ② | `domains/seo-keywords.md` |
| social-publishing | auto-post/schedule X/LinkedIn/multi-platform, 发帖 | Buffer ① free-tier · Postiz OSS | `domains/social-publishing.md` |
| content-cms | blog publish to WordPress/Ghost/Notion/Sanity, 发博客 | Sanity/WordPress MCP ① | `domains/content-cms.md` |
| leadgen-crm | B2B leads, email find, company intel, CRM, 获客 | Apollo.io ① + Hunter ① | `domains/leadgen-crm.md` |
| trends-discovery | Google Trends, Product Hunt, app store, 趋势/选题 | GDELT + Product Hunt MCP ① free | `domains/trends-discovery.md` |
| frontier-research | AI/ML papers, arXiv, SOTA, new models, conference, citations, 论文/前沿研究 | arXiv API + HF Daily Papers ① free | `domains/frontier-research.md` |
| ready-skills | "is there a ready skill for marketing/SEO/research" | coreyhaines31/marketingskills | `domains/ready-skills.md` |
| **browser-automation** | API too costly/walled, want real-browser "act like human", free | playwright MCP + browser-use/crawl4ai | `domains/browser-automation.md` |
| **consumer-price-compare** | "I'm buying X, find me the cheapest", coupon stack, 历史价, 比价, 凑单 | DaizeDong/shopping-aggregator (sister skill, delegates here) | `domains/consumer-price-compare.md` |

For X, twikit remains a conditional fallback only after a fresh operation check; its
staleness and fallback limits are documented in [the X shard](domains/x-twitter.md).

### Meta-domains, NOT for triage (read by refresh-protocol Discovery only)

These are infrastructure shards, not research targets. Triage logic MUST NOT route a user's
research query here, they describe **where new tools come from**, not what data a topic needs.
Listed for refresh-protocol Discovery D1 to consume.

| meta-domain | purpose | shard |
|---|---|---|
| [mcp-ecosystem](domains/mcp-ecosystem.md) | where MCPs come from (registries, GitHub topic velocity, IDE markets, MCP Discord), read by every Discovery sweep | `domains/mcp-ecosystem.md` |

### Reserved placeholders (v0.18.1), domains the audit predicts will materialize in 2026-2027

These rows are intentional vacancies. Refresh's Horizon scan checks each at every quarterly
sweep, when the field crosses a maturity threshold (≥3 viable tools across ≥2 tiers), the
placeholder is populated into a real shard. Reasoning + triggers in `ROADMAP.md` "Future
domain placeholders".

| domain | triage signals | status |
|---|---|---|
| `agent-marketplace` | "what skills/agents are on Anthropic Hub / OpenAI GPT Store / Smithery" | reserved, populate when ≥3 tracked marketplaces have API surface |
| `ai-data-licensing` | "legally rent data instead of scraping", datarade / Bright Data DaaS / Scale Data Engine | reserved, populate on 3rd D-PRICE event (also triggers `transport: brokerage`) |
| `voice-and-podcast-intel` | podcast/video transcript intel, podcast as research source | reserved, populate when Podscan-class tools >5 |
| `synthetic-and-evals` | synthetic dataset catalogs / Vals.ai / lmarena as research basis | reserved, populate when evals-as-research becomes routine |
| `regulatory-watch` | SEC 8-K / EU AI Act / state anti-scrape trackers, legal-tech MCPs | reserved, populate when EU AI Act detail rules land |
| `on-chain-intel-private` | TEE / zk privacy on-chain data (Chainlink Functions / Nillion / EigenLayer) | reserved, populate when privacy-data MCPs >3 |

Barrier-route legend (see each shard for detail):
① supported official API, often paid/limited; account scopes, platform rules and rate limits still apply
② resale API, provider handles upstream access; caller obligations and provider/platform limits still apply
③ self-host scrape (reverse-engineered API), free, you supply accounts+proxies, ban risk
④ **browser automation / act-like-human**, real logged-in browser (playwright MCP + OSS repos);
   FIRST-CLASS, not last resort. Often **richer data** (rendered/logged-in view, fields APIs hide)
   at zero API cost. Cost = proxies at scale; most platform scraping violates ToS (ban risk).
   When a topic's official/resale source is paid or quota-capped, check route ④ before paying.
⑤ **agent-native browser** (reserved, see ROADMAP trigger), Computer Use / Operator / Skyvern
   class. Currently flagged via `route_agent_native: true` in the registry; promoted to a default
   route when cost falls below ④ + residential-proxy aggregate. Not the default in 2026-06.

Death-code legend (`⚠ Avoid (dead, D-xxx)` tombstones): D-404 / D-TOS / D-PRICE / D-STALE
/ D-SUPERSEDED. **Canonical semantics + per-code action**: `refresh-protocol.md` §C4
(skill side) and `runbooks/sync-with-skill.md` §C (config side). Don't paraphrase here,
2026-06-17 cleanup confirmed it had drifted across 4 files.
