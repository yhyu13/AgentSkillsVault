# Tool docs index (thin)

One line per tool. The domain shard (`domains/<domain>.md`) decides **which** tool to use; this index
points to the **how-to**. To use a tool, find its slug here and read **only** its doc
`reference/tools/<slug>.md` (per-tool install + auth + usage + 踩坑). **Never read the whole `tools/`
directory**, that breaks progressive loading. Install mechanics overview: `reference/install-guide.md`.

★ = current top pick for its domain. Routes: ① official · ② resale · ③ self-host scrape · ④ browser.

## x-twitter
- ★ [twitterapi.io](twitterapi-io.md), ② · resale X search/users/replies/trends, pay-per-use, native MCP
- [twikit (+ mcp-twikit)](twikit.md), ③④ · self-host X read+write+DM; see maintenance caveat in the domain shard
- ★ [twscrape](twscrape.md), ③ · self-host X search with account rotation
- [X official API](x-official-api.md), ① · official read+write including media; verify current endpoint pricing
- [Panniantong/Agent-Reach](agent-reach.md), ④③ · free multi-platform read/search router (X+Reddit+YT+GitHub+Bili+XHS), zero API fees (NEW 2026-07)
- [FxEmbed](fxembed.md), ②③ · free zero-auth single post/thread JSON resolver (text+media+metrics), no key (NEW 2026-07)

## reddit-community
- ★ [mcp-hn](mcp-hn.md), ① · free no-key Hacker News top/new/ask/search/comments
- ★ [reddit-mcp-buddy](reddit-mcp-buddy.md), ① · direct Reddit reads with verified app-id/login access; recorded anonymous 403 outage
- [GridfireAI/reddit-mcp](reddit-mcp.md), ① · official-API Reddit read-only (D-SUPERSEDED → fallback)
- ★ [reddit-research-mcp](reddit-research-mcp.md), ① · no Reddit credentials to manage; hosted OAuth and verified reads, semantic subreddit discovery beyond the 250-cap
- [subscope](subscope.md), ④ · keyless buyer-intent scoring (post-GummySearch)
- [praw](praw.md), ① · mature Python Reddit API client
- [stack-overflow-mcp](stack-overflow-mcp.md), ① · Stack Exchange search/answers
- [stackexchange](stackexchange.md), ① REST · raw REST API, key raises rate limit 300→10k/day/IP
- [discord-mcp](discord-mcp.md), ④ · read Discord via user session (ToS risk)

## web-scraping
- ★ [Tavily](tavily.md), ② · agent-ranked semantic search, free 1000/mo
- ★ [Exa](exa.md), ② · neural search + content extract (skill exa-search)
- [Parallel Search MCP](parallel.md), ② · keyless web search and focused page excerpts
- ★ [Firecrawl](firecrawl.md), ② · JS-render scrape/crawl/extract (skill firecrawl)
- ★ [Bright Data](brightdata.md), ② · strongest barrier-breaker, free 5k/mo no card
- [DataForSEO](dataforseo.md), ② · cheap large-scale SERP/keywords/backlinks
- [Apify](apify.md), ② · 3000+ prebuilt scraper actors
- [Patchright](patchright.md), ④ · undetected-Playwright, passes Cloudflare/DataDome (free)
- [crawl4ai](crawl4ai.md), ③ · zero-cost self-host LLM crawler (primary doc under browser-automation)
- [D4Vinci/Scrapling](scrapling.md), ③④ · free adaptive stealth scraper + built-in MCP, auto-Cloudflare (NEW 2026-07)
- [wigolo](wigolo.md), ③④ · free keyless search+fetch+crawl+extract in one MCP, 18-engine SERP fusion (NEW 2026-09)
- [ihor-sokoliuk/mcp-searxng](mcp-searxng.md), ③ · free self-host search MCP over SearXNG, Tavily replacement (NEW 2026-07)

## ecommerce-arbitrage
- ★ [Keepa (+ MCP)](keepa.md), ① · irreplaceable Amazon price/BSR history curve
- [Amazon SP-API](amazon-sp-api.md), ① · your own cost/fees → profit calc
- [Rainforest API](rainforest-api.md), ② · real-time ASIN + Buy Box
- [eBay Browse/Finding API](ebay-api.md), ① · free official item price/compare
- [PriceAPI](priceapi.md), ② · Amazon+Google Shopping+eBay multi-source compare
- [Oxylabs](oxylabs.md), ② · anti-bot ecom scrape + datasets
- [Shopify Storefront MCP](shopify-storefront-mcp.md), ① · free per-shop catalog MCP
- [Discount-Bandit](discount-bandit.md), ④ · self-host multi-store price tracker
- [omkarcloud/amazon-scraper](amazon-scraper.md), ④ · 24 Amazon sites, anti-detect browser
- [jez500/pricebuddy](pricebuddy.md), ④ · free self-host multi-store price tracker (NEW 2026-07)

## finance-markets
- ★ [SEC EDGAR MCP](sec-edgar-mcp.md), ① · free no-key 13M+ filings, XBRL, insider
- ★ [FRED MCP](fred-mcp.md), ① · free 800k+ macro series
- [Polygon.io](polygon.md), ① · realtime + 20yr history + WebSocket
- [Finnhub](finnhub.md), ① · fundamentals + alt-data sentiment, free 60/min
- [Twelve Data](twelve-data.md), ① · multi-asset realtime, free 800/day
- [Financial Modeling Prep](fmp.md), ① · financials/valuation, free 250/day
- [Unusual Whales MCP](unusual-whales.md), ① · options flow, dark pool, congress trades
- [Alpaca MCP](alpaca-mcp.md), ① · trade execution, paper trading first
- [Tradier MCP](tradier-mcp.md), ① · brokerage execution, guardrails mandatory
- [yahoo-finance-mcp](yahoo-finance-mcp.md), ④ · free no-key price/fundamentals/options (yfinance)

## crypto-defi
- ★ [CoinGecko MCP](coingecko-mcp.md), ① · best read-only price source, public no key
- [CoinMarketCap MCP](coinmarketcap-mcp.md), ① · quotes/TA/derivatives, free 50/min
- ★ [Etherscan MCP](etherscan-mcp.md), ① · on-chain 60+ chains, free key
- [Blockscout MCP](blockscout-mcp.md), ① · free on-chain 3000+ chains, backstops Etherscan
- [Moralis](moralis.md), ① · multi-chain wallet/portfolio normalized
- [Covalent / GoldRush](covalent.md), ① · multi-chain normalized data
- [Nansen](nansen.md), ① · smart-money labels, token god mode
- [GeckoTerminal API](geckoterminal.md), ① · DEX OHLCV history to 1s
- ★ [ccxt](ccxt.md),, · unified 100+ exchange lib, spread monitor
- [Hummingbot core](hummingbot.md), ① · CEX/DEX arbitrage execution; setup pending, MCP client retired
- [funding-rates-mcp](funding-rates-mcp.md), ① · cross-exchange funding divergence
- [DefiLlama API](defillama.md), ① · free no-key TVL/yields/stablecoins/fees REST
- [Barker](barker.md), ① L2 · stablecoin yields across 515 DeFi + 20 CEX, REST + `llms.txt`

## seo-keywords
- ★ [Google Search Console MCP](gsc-mcp.md), ① · free your-site real clicks/position
- ★ [DataForSEO](dataforseo.md), ② · cheap bulk SERP/keywords/backlinks (shard default external pick)
- [Ahrefs MCP](ahrefs-mcp.md), ① · best backlink data, needs Lite+ sub
- [Semrush One MCP](semrush-mcp.md), ① · full keyword/competitor/audit
- [SE Ranking MCP](se-ranking-mcp.md), ① · 160+ tools + 7 Claude Skills, best pro value
- [SerpApi](serpapi.md), ② · multi-engine SERP + Trends JSON
- [Google Ads Keyword Planner](google-ads-keyword-planner.md), ① · free real volume + CPC
- ★ [SearXNG](searxng.md), ④ · self-host meta-search = private SerpApi
- ★ [serpbear](serpbear.md), ④ · self-host keyword rank tracker (free-route default, pairs with SearXNG)
- [ddgs](ddgs.md), ④ · lightweight free web search lib
- [Google Trends OSS (trendspy)](trendspy.md), ④ · Trends after pytrends archived
- [Google Suggest](google-suggest.md), ④ · free no-key keyword-ideas/autocomplete expander
- [respectaso](respectaso.md), ④ · free ASO App-Store keyword research (iOS only)
- [Auriti-Labs/geo-optimizer-skill](geo-optimizer-skill.md), ④① · OSS GEO/AEO answer-engine optimization toolkit + MCP (NEW 2026-07)
- [every-app/open-seo](open-seo.md), ①③ · free OSS Semrush/Ahrefs alt (keyword/SERP/backlink/audit) w/ MCP (NEW 2026-07)

## social-publishing
- ★ [Buffer](buffer.md), ① · 11-platform schedule, free tier + MCP
- [Ayrshare](ayrshare.md), ② · 13+ platforms multi-user SaaS
- ★ [Blotato](blotato.md), ② · 20 social accounts $29/mo, Claude Code native MCP
- [Typefully](typefully.md), ① · text/thread-first multi-platform
- ★ [Postiz (OSS)](postiz.md), ③ · self-host 30+ platforms, agentic-first
- [Mixpost (OSS)](mixpost.md), ③ · self-host 11 platforms, buy-once
- [EnesCinr/twitter-mcp](enescinar-twitter-mcp.md), ① · single-account X post+search
- [OpenTweet](opentweet.md), ② · hosted X posting, no dev portal
- [instagrapi](instagrapi.md), ③ · Instagram post/comment/DM, most active lib
- [instaloader](instaloader.md), ③ · Instagram read-only download
- [linkedin-mcp-server](linkedin-mcp-server.md), ④ · ready LinkedIn MCP, highest ban risk
- [TikTok-Api](tiktok-api.md), ④ · Playwright-signed TikTok scrape+search
- ★ [xiaohongshu-mcp](xiaohongshu-mcp.md), ④ · 小红书 browser MCP, can post
- [atproto (Bluesky)](atproto.md), ① · supported Bluesky API; account rules and rate limits apply
- [Mastodon.py](mastodon-py.md), ① · supported Mastodon API; instance rules and rate limits apply
- [postiz-agent](postiz-agent.md), ③ · official Postiz agent front-end, 28+ platforms
- [social-media-agent](social-media-agent.md), ③ · source/curate/schedule agent (content pipeline)
- [yikart/AiToEarn](aitoearn.md), ①④ · free OSS desktop multi-publish incl. CN majors (Douyin/XHS/Kuaishou), GUI handoff (NEW 2026-07)
- [dreammis/social-auto-upload](social-auto-upload.md), ④ · automated CN+global video publishing, 11 platforms, `sau` CLI + bundled skills (NEW 2026-09)

## content-cms
- ★ [WordPress MCP](wordpress-mcp.md), ① · post CRUD + publish, Application Password
- [Ghost MCP](ghost-mcp.md), ① · ~45 tools incl members/newsletter
- ★ [Sanity hosted MCP](sanity-mcp.md), ① · 40+ tools schema-aware, best headless
- [Contentful MCP](contentful-mcp.md), ① · create/edit/publish multi-locale
- [Strapi 5 MCP](strapi-mcp.md), ① · token-scoped per content type
- [Notion hosted MCP](notion-mcp.md), ① · Notion markdown as CMS
- [Pipepost](pipepost.md), ① · Dev.to+Hashnode+Ghost+WP+Medium syndication
- ★ [Static blog (Hugo/Astro)](static-blog.md),, · MD → git push → Vercel, zero fee
- [directus/mcp](directus-mcp.md), ① · official Directus MCP (SQL-backed headless CMS)
- [webflow/mcp-server](webflow-mcp.md), ① · official Webflow CMS MCP

## leadgen-crm
- ★ [Apollo.io](apollo.md), ① · find+enrich contacts, ICP prospecting (turn off training)
- [Clay](clay.md), ② · waterfall enrichment, 150+ providers
- ★ [Hunter.io](hunter.md), ① · email finder + verifier
- [ZoomInfo / Lusha](zoominfo-lusha.md), ① · enterprise / mid-tier DB
- [People Data Labs](people-data-labs.md), ① · $0.01/record, cheapest at volume
- [HubSpot MCP](hubspot-mcp.md), ① · CRM read/write
- [Salesforce MCP](salesforce-mcp.md), ① · CRM read/write
- [Attio MCP](attio-mcp.md), ① · modern CRM read/write
- [Smartlead MCP](smartlead-mcp.md), ① · 113+ tools, deliverability + warmup
- [ZeroBounce](zerobounce.md), ① · email verification, batch
- [Bright Data (Crunchbase/company intel)](brightdata.md), ② · real-time public company data, free 5k/mo (primary doc under web-scraping)
- [joeyism/linkedin_scraper](linkedin-scraper.md), ④ · Selenium login, highest ban risk
- ★ [gosom/google-maps-scraper](gosom-google-maps-scraper.md), ④ · local B2B leads, low risk
- [omkarcloud/google-maps-scraper](omkarcloud-google-maps-scraper.md), ④ · 50+ fields + enrichment
- [StaffSpy](staffspy.md), ④ · scrape company staff lists (ToS risk)

## trends-discovery
- ★ [GDELT MCP](gdelt-mcp.md), ① · free global news tone/events, zero-cost sentiment
- ★ [Product Hunt MCP](product-hunt-mcp.md), ① · posts/topics/votes, launch tracking
- ★ [Trends MCP](trends-mcp.md), ② · 25+ platforms + growth rate, best acceleration signal
- [Exploding Topics](exploding-topics.md), ② · curated emerging topics + forecast
- [google-play-scraper](google-play-scraper.md), ③ · free Play Store details/reviews
- [app-store-scraper](app-store-scraper.md), ③ · free App Store details/reviews
- [mobile-store-scraper-mcp](mobile-store-scraper-mcp.md), ③ · free both-stores MCP
- [Sensor Tower MCP](sensor-tower-mcp.md), ② · download/revenue estimates
- [idea-reality-MCP](idea-reality-mcp.md), ① · scan GitHub/HN/npm → saturation signal
- [google-news-trends-mcp](google-news-trends-mcp.md), ③ L2 · self-host wrapper for News RSS + unofficial Trends endpoints; verify each operation

## frontier-research
- ★ [arXiv API (+ MCP)](arxiv.md), ① · free no-key paper search + recent by category
- ★ [Hugging Face Daily Papers + Hub](huggingface.md), ① · curated papers + trending models
- ★ [Semantic Scholar (+ MCP)](semantic-scholar.md), ① · citations + influence graph
- [Papers with Code](papers-with-code.md), ① · SOTA leaderboards + paper↔code (D-404, API sunset by Meta, now a gap)
- [OpenReview API](openreview.md), ① · ICLR/NeurIPS submissions + reviewer scores
- [GitHub API / MCP](github-mcp.md), ① · trending/releases/star velocity
- [AI lab blogs](ai-lab-blogs.md), ④ · canonical L1 model-launch source
- [AI news roundups](ai-news-roundups.md), ④ · AINews/The Batch/Import AI
- [alphaXiv](alphaxiv.md), ③④ · community comments + LLM summaries (skill alphaxiv)
- [arxiv-sanity-lite](arxiv-sanity-lite.md), ③ · self-host recommender, free (D-STALE, last push 2023; installation/runtime unverified, setup required)
- [Connected Papers / ResearchRabbit](connected-papers-researchrabbit.md), ④ · citation-graph explore
- [research-lit skill](research-lit-skill.md),, · delegate deep multi-paper synthesis
- [paper-search-mcp](paper-search-mcp.md), ① · multi-venue (arXiv+PubMed+bioRxiv) paper search
- [paper-qa (PaperQA2)](paper-qa.md), ④ · grounded full-text PDF deep-research w/ citations

## browser-automation
- ★ [playwright MCP](playwright-mcp.md), ④ · default act-like-human, available only after current-session operation verification
- ★ [browser-use](browser-use.md), ④ · most popular, LLM drives browser by NL goal
- [stagehand](stagehand.md), ④ · act/extract/observe over Playwright (TS)
- [skyvern](skyvern.md), ④ · LLM + vision, robust to UI changes
- ★ [crawl4ai](crawl4ai.md), ③ · zero-cost self-host LLM crawler, auto anti-bot
- [crawlee](crawlee.md), ④ · Playwright/Puppeteer/Cheerio + proxy framework
- [scrapegraph-ai](scrapegraph-ai.md), ④ · NL-defined graph extraction
- [nodriver](nodriver.md), ④ · undetected Chrome successor
- [camoufox](camoufox.md), ④ · anti-fingerprint Firefox, strongest spoofing
- [steel-browser](steel-browser.md), ④ · OSS browser infra for agents, self-host
- [yt-dlp](yt-dlp.md), ④ · YouTube/media downloader + metadata
- [MediaCrawler](mediacrawler.md), ④ · 小红书/抖音/B站/微博/快手/知乎/贴吧 (7 中文平台)
- [weibo-crawler](weibo-crawler.md), ④ · 微博 user/post crawler
- [agent-browser](agent-browser.md), ④ · token-efficient Rust browser-agent CLI (.claude-plugin)
- [OpenCLI](opencli.md), ④ · 182 per-site adapters → deterministic CLI over your logged-in Chrome (NEW 2026-09)
- [camofox-browser](camofox-browser.md), ④ · fingerprint-spoofing browser on Camoufox (free)
- [botasaurus](botasaurus.md), ④ · anti-detection Python scraping framework (omkarcloud scrapers' base)

## ready-skills
- ★ [skillsmp.com](skillsmp.md),, · indexes SKILL.md across GitHub as a whole, the first stop before writing one (hosted MCP, no key)
- ★ [coreyhaines31/marketingskills](marketingskills.md),, · ~40 install-and-go marketing skills
- [Anthropic Marketing plugin](anthropic-marketing-plugin.md),, · /competitive-brief, /seo-audit
- ★ [AgricIDaniel/claude-seo](claude-seo.md),, · strongest SEO plugin, 25 sub-skills
- ★ [claude-marketing-research-skill](claude-marketing-research-skill.md),, · 6-stage market research (shard default for packaged research pipeline)
- [alirezarezvani/claude-skills](alirezarezvani-claude-skills.md),, · mega bundle 338 skills
- [ComposioHQ/awesome-claude-skills](awesome-claude-skills.md),, · discovery catalog (D-SUPERSEDED by sickn33/antigravity-awesome-skills 2026-06-17)
- ★ [sickn33/antigravity-awesome-skills](antigravity-awesome-skills.md),, · active replacement catalog (40k★, 1d-old)
- [ericosiu/ai-marketing-skills](ai-marketing-skills.md),, · business-ops/sales/revenue skills (fills the gap)
- [digital-marketing-pro](digital-marketing-pro.md),, · AEO/GEO answer-engine optimization
- ★ [Imbad0202/academic-research-skills](academic-research-skills.md),, · full academic-research pipeline (planning → lit review → peer review)
- [gtmagents/gtm-agents](gtm-agents.md),, · 67 plugins / 92 agents / 52 skills for sales-driven GTM
- [Eronred/aso-skills](aso-skills.md),, · 40+ App Store Optimization skills (iOS + Google Play)

## reddit-community
- ★ [ArthurHeitmann/arctic_shift](arctic-shift.md), historical Reddit · monthly dumps + JSON API + hosted UI
- ★ [SaseQ/discord-mcp](saseq-discord-mcp.md), Discord MCP · ToS-compliant bot-token model

## finance-markets (added 2026-06-17)
- ★ [OpenBB-finance/OpenBB MCP](openbb-mcp.md), finance aggregator · ~100 data providers behind one MCP

## leadgen-crm (added 2026-06-17)
- [Instantly.ai MCP](instantly-mcp.md), outreach platform · 38 tools (Growth plan)
- [Outscraper Google Maps](outscraper-google-maps.md), pay-as-you-go · ~15x cheaper than SerpApi Maps

## frontier-research (added 2026-06-17)
- [LMArena (arena.ai)](lmarena.md), live LLM leaderboard · partial fill of D-404 Papers-with-Code

## mcp-ecosystem (added 2026-06-17)
- [GitHub MCP Registry](github-mcp-registry.md), github.com/mcp · official discovery hub
- [ChatGPT Apps Directory](chatgpt-apps-directory.md), chatgpt.com/apps · OpenAI side

Mechanical `.auto.md` siblings belong to their canonical source entries. They do not add tools or activations; see `registry.json` aliases and documentation metadata.
