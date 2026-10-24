# Volatile: pricing & install commands

> ⚠️ ALL prices and exact commands below are time-stamped and rot fast. **Verify against the
> official site before quoting or installing.** `last_verified: 2026-05` unless noted.
> A newly added MCP only takes effect after session restart / `/mcp` reconnect.
>
> Security: never fill in or echo the user's API key. Have the USER run the `-e KEY=$VAR` form
> themselves. Keys may be plaintext in `~/.claude.json`; keep them out of screenshots,
> transcripts and public repositories. Follow the selected companion credential mode:
> PRIVATE Git in Mode A, credentials outside Git in Mode B. See [CONFIG](../../../../CONFIG.md).
> Prefer `-s user` scope for reusable sources. Prefer HTTP-transport sources on Windows.

## x-twitter `last_verified: 2026-09`
- twitterapi.io: pay-per-use $0.15/1k tweets, $0.18/1k profiles, $0.1 free credit (no card),
  .edu 50% rebate (email hello@twitterapi.io). Key from dashboard (Google login, no X dev account).
  Official native MCP (HTTP, verified 2026-06): configure the hosted endpoint through supported host secret settings with a no-echo transfer (see `reference/install-guide.md`).
  ⚠ Secret-config hygiene (lesson learned): `claude mcp add` ECHOES the header (key leaks into the
  transcript), for secret-bearing MCPs, edit `~/.claude.json` headers directly from clipboard
  instead, and never `browser_snapshot` a dashboard page that reveals the key (use the copy button
  → clipboard pipe; verify by length only). twitterapi.io rotates only once / 24h.
- Apify tweet actors: pay-per-result ~$0.1 to 0.25/1k. Apify MCP: `https://mcp.apify.com` (HTTP).
- twscrape (self-host, free): `pip install twscrape`, needs X account cookies + proxy. **This is now
  the free ③ default** (2.7k★, pushed 2026-08-28, v0.19.1 refreshed X's GraphQL operation IDs).
- twikit / adhikasp/mcp-twikit: still installable but **both unmaintained**. Twikit's last code
  commit was 2025-04-22 and PyPI is frozen at 2.3.3 (2025-02-07); the MCP wrapper is 17.8mo silent
  (gh-api 2026-09-06). Neither is archived, so neither is tombstoned; re-test before relying on them.

## reddit-community `last_verified: 2026-06`
- HN: `uvx mcp-hn` (free, no key) or `npx -y @smithery/cli install mcp-hn --client claude`.
- Reddit without managed Reddit credentials: **king-of-the-grackles/reddit-research-mcp** (224★), hosted OAuth MCP for research and semantic subreddit discovery; complete OAuth and verify the selected operation.
- Direct Reddit reads: karanb192/reddit-mcp-buddy (702★), `npx -y reddit-mcp-buddy` with verified app-id/login access (historical limits 60/min and 100/min). The domain records an anonymous JSON 403 outage on 2026-07-22; do not select its anonymous tier until current-session recovery is demonstrated. This note does not assert a new live outage test. Both routes replace stale GridfireAI/reddit-mcp.
- Reddit (D-SUPERSEDED fallback): GridfireAI/reddit-mcp, `uvx reddit-mcp`; create app at
  reddit.com/prefs/apps for REDDIT_CLIENT_ID/SECRET (free). Superseded by reddit-mcp-buddy; minimal fallback only.
- Stack Exchange: midodimori-stack-overflow-mcp (free; SE key raises 300→10k/day).
- dancolta/subscope (29★): self-host, keyless public-RSS buyer-intent.

## web-scraping `last_verified: 2026-09`
- Firecrawl: `npx -y firecrawl-mcp` (key from firecrawl.dev; free 1,000 credits/mo, cheapest paid
  Hobby $16/mo yearly). Repo github.com/firecrawl/firecrawl (176k★).
- Tavily: hosted HTTP MCP at `https://mcp.tavily.com/mcp`; configure authentication through
  the selected host's supported private settings and approved no-echo transfer. Follow the
  [installation guide](../install-guide.md) for value-free verification (historical free tier:
  1000 credits/mo; verify current terms and endpoint authentication before setup).
- Parallel: keyless hosted MCP at https://search.parallel.ai/mcp; free light use, higher limits require authentication. See `reference/tools/parallel.md` (checked 2026-09-23).
- Exa: remote MCP, free 1000/mo with key or 150/day no-key (historical plan notes; confirm current terms). Discover `exa-search` in the active host and verify the selected operation before relying on it.
- Bright Data (verified 2026-06, **hosted HTTP, Windows-friendly**): add to `~/.claude.json`
  `mcpServers.brightdata = {"type":"http","url":"https://mcp.brightdata.com/mcp?token=<API_TOKEN>"}`
  (token = Bright Data dashboard → Settings → "Users and API keys" → API keys; **free 5000 req/mo
  Rapid, no card**). ⚠ token is shown PLAINTEXT in that table, have the user copy it, do NOT
  browser_snapshot the page; write the URL via direct .claude.json edit (NOT `claude mcp add`, which
  echoes the URL+token). Verify only through a supported diagnostic for the selected server,
  returning allowlisted name, connection status and authentication state, as specified in the
  [installation guide](../install-guide.md). Raw listings and token-specific masking are not
  safe diagnostics. If the installed host has no such diagnostic, keep connection/authentication
  unverified until a supported check is available; configuration alone is not readiness.
  Stdio alt: `npx @brightdata/mcp` with env `API_TOKEN`.
- DataForSEO: official TS MCP github.com/dataforseo/mcp-server-typescript; $1 trial + free Sandbox, $50 min.
- patchright: `pip install patchright` or `npm i patchright`, Kaliiiiiiiiii-Vinyzu/patchright (4.4k★,
  undetected-Playwright, Apache-2.0, free).
- Scrapling (free, BSD-3): `pip install scrapling` then `scrapling install` (pulls the camoufox build).
  Ships its own MCP. github.com/D4Vinci/Scrapling (78.8k★, gh-api 2026-09-06).
- wigolo (free, AGPL-3.0, **no API key**): `npx wigolo init --agents=claude-code`, then `wigolo doctor`.
  Docker `towhid69420/wigolo`. github.com/KnockOutEZ/wigolo (5.1k★, gh-api 2026-09-06). ⚠ the npm
  channel is pinned at 0.2.1 (published 2026-07-19, registry checked 2026-09-06) while the repo is
  current; install from source if you need a recent fix.

## ecommerce-arbitrage `last_verified: 2026-06`
- Keepa: KEEPA_API_KEY from keepa.com (€49/mo @ 20 tokens/min start). MCP: cosjef/Keepa_MCP or
  BWB03/keepa-adapter (.mcpb one-click).
- eBay: developer.ebay.com AppID (free). Shopify Storefront MCP: `https://{shop}.myshopify.com/api/mcp` (free).
- PriceAPI: priceapi.com, Go €99/mo (5k credits) + free 1,000-credit no-card trial (€499 = Starter tier).
- Rainforest API: now hosted at trajectdata.com, Hobbyist $23/mo (Amazon product/offers/reviews).

## finance-markets `last_verified: 2026-06`
- SEC EDGAR: stefanoamorelli/sec-edgar-mcp (free, no key, set User-Agent).
- FRED: stefanoamorelli/fred-mcp-server (free key at fred.stlouisfed.org).
- Polygon.io → rebranded **Massive** (massive.com, 301 redirect; APIs/keys unchanged): free 5 req/min,
  paid $29/$79/$199. Finnhub free 60/min. Twelve Data free 800/day.
- Alpaca: alpacahq/alpaca-mcp-server (paper trading free, use FIRST).
- Alex2Yang97/yahoo-finance-mcp (306★): `uvx`/clone self-host, free no-key (⚠ yfinance scrapes
  Yahoo, not for prod).

<a id="crypto-defi"></a>

## crypto-defi `last_verified: 2026-09`
- CoinGecko: `npx mcp-remote https://mcp.api.coingecko.com/mcp` (public, no key).
- Etherscan: `https://mcp.etherscan.io/mcp` (free key as bearer). NOTE 2026-06: free-tier chain
  coverage cut ~10% (verified-contract/ABI endpoints stay free all chains); "Lite" plan = 25% of
  prior lowest tier (info.etherscan.com/whats-changing-in-the-free-api-tier-coverage-and-why).
  ⚠ July-2026 change drops max records returned 10k→1k (info.etherscan.com).
- Blockscout MCP (free, 3000+ chains, no key for dev; read-only on-chain): repo blockscout/mcp-server
  (45★, official), install/endpoint per docs.blockscout.com/devs/mcp-server. Pro key (free) for prod throughput.
- Hummingbot core: the MCP client is retired after an upstream archive was confirmed on
  2026-10-06. Follow the [core setup prerequisites](../tools/hummingbot.md). Before
  launch, verify absolute PRIVATE versioned bind locations and every supported persistent
  writer. A Docker named volume alone does not establish versioning or backup. Keep setup
  pending until the selected version's runtime adapter and private paths are verified.
- ccxt: `pip install ccxt` (lib) **and now a first-party MCP**: `claude mcp add ccxt -- npx -y ccxt-mcp`
  (public market data needs no key; trading/funds tiers are opt-in in the config file). npm `ccxt-mcp`
  since 2026-08-25, v0.1.3 2026-09-07; young, so pin the version. funding-rates-mcp: Kukapay repo (D-STALE).
- CoinMarketCap: free Basic now 50 req/min + 15k credits/mo (key at pro.coinmarketcap.com).
- Nansen: ~$49/mo annual / $69 monthly (collapsed from up to ~$999/mo).
- DefiLlama: free no-key REST `https://api.llama.fi` + `https://yields.llama.fi`
  (TVL/yields/stablecoins/fees); 3rd-party MCPs only, frame as REST.
- Barker: free no-key REST + agent-friendly index at `https://docs.barker.money/llms.txt`
  (read this first for endpoint catalog). Stablecoin yields across 515 DeFi + 20 CEX, no MCP yet.
  Vault deposits via per-partner `BarkerEngine` ERC-4626 contract on Base/Arbitrum/ETH/BNB
  (out of scope for research; relevant only if recommending it as user's execution venue).

## seo-keywords `last_verified: 2026-06`
- GSC: ahonn/mcp-server-gsc, `npx -y mcp-server-gsc` (free; Google OAuth/service-account JSON).
- DataForSEO: see web-scraping. SE Ranking: configure the hosted endpoint through supported host secret settings with a no-echo transfer (see `reference/install-guide.md`) (14d trial 100k credits).
- Ahrefs official remote MCP `https://api.ahrefs.com/mcp/mcp` (needs Lite+ sub).
- Semrush: Pro ~$140/mo (annual ~$117); $299 = Business tier.
- SerpApi: key, free 250/mo; Starter $25/1k.
- Google Suggest: `https://suggestqueries.google.com/complete/search?client=firefox&q=...`
  (free no-key, undocumented).
- respectlytics/respectaso (514★; GitHub stars checked 2026-10-03): self-host, free (iTunes Search API, iOS only).

## social-publishing `last_verified: 2026-09`
- Buffer: API key from dashboard + official MCP. Free tier verified at https://buffer.com/pricing
  (fetched 2026-09-06): 3 channels · 1 API key · **3,000 API requests/mo** · 10 queued posts per
  channel. Paid is **per channel**: Essentials $5/mo/channel, Team $10/mo/channel, so 8 channels is
  $40/mo, not $5.
- Publora: verified at https://publora.com/pricing (fetched 2026-09-06). Starter **free forever**
  (3 accounts, API + MCP, all platforms **except X**) / Pro **$29.95/mo** (unlimited accounts, incl.
  X) / Agency custom. Pro vs Ayrshare $149/mo = a 79.9% cut.
- dreammis/social-auto-upload (free, MIT, 14.8k★ gh-api 2026-09-06): Python + Playwright, `sau` CLI
  with `--headless`, one interactive login per platform to bank a session. 11 platforms; 定时发布 on
  only 6, CLI on 10 (no TikTok CLI). ⚠ bring your own accounts + residential IPs.
- Blotato: Starter $29/mo = 20 social accounts, `backend.blotato.com/v2` + MCP (API key header;
  API needs a paid plan).
- Typefully: Free $0 (1 scheduled post) / Starter $8 / Creator $19 / Team $39 (API needs a paid plan).
- Postiz (OSS, free): self-host → Settings → Public API → copy MCP URL. v2.12+ needs Temporal.
- X single: `npx -y @enescinar/twitter-mcp` (needs X dev creds, API cost自负). OpenTweet $11.99/mo (hosted).
- gitroomhq/postiz-agent (388★): `npx skills add` (official Postiz agent, self-host).
- langchain-ai/social-media-agent (2.6k★): clone + keys (content pipeline).

## content-cms `last_verified: 2026-06`
- WordPress: WordPress/mcp-adapter (1663★, official WP MCP via Abilities API; Application Password).
  Replaces stale gaupoit/wordpress-mcp + archived Automattic/wordpress-mcp.
- Ghost: MFYDev/ghost-mcp (199★), GHOST_URL + GHOST_ADMIN_API_KEY. Replaces dead @ryukimin/ghost-mcp (404).
- Sanity: `sanity` CLI auto-configures, or remote `https://mcp.sanity.io` (OAuth).
- Notion: `https://mcp.notion.com/mcp` (OAuth). Pipepost: multi-platform OSS MCP.
- Directus: directus/mcp (79★, official Directus MCP).
- Webflow: webflow/mcp-server (132★, official Webflow MCP, OAuth).

## leadgen-crm `last_verified: 2026-06`
- Apollo.io: Claude → Customize → Connectors → "Apollo.io" (OAuth). ⚠ disable model training first.
- Hunter: `https://mcp.hunter.io/mcp` (X-API-KEY). ZeroBounce: official MCP (key).
- HubSpot/Salesforce/Attio: official connectors/MCP (OAuth). Smartlead: npm `smartlead-mcp-server`
  (latest 1.2.1, 2025-04) ⚠ repo archived 2025-07, verify before use (prior "smartlead-mcp-by-leadmagic"
  hint was unreliable).
- Bright Data Crunchbase: free 5k/mo via Rapid route (source of record); brightdata.com web-MCP
  product page is 404, use the dashboard API-keys route, not the dead product URL.

## trends-discovery `last_verified: 2026-06`
- GDELT MCP: mcpbundles.com/skills/gdelt (free, no auth). Product Hunt: jaipandya/producthunt-mcp-server
  (46★, PH token), old `product-hunt-mcp` path is dead (404, repo stale 2025-04).
- Trends MCP: trendsmcp.ai (25+ sources, bearer token); paid $19/1k, $49/5k, $199/25k.
  SerpApi: key, free 250/mo; Starter $25/1k.
- Exploding Topics: Entrepreneur $39 / Investor $99 / Business $249 (⚠ trial-only, NO permanent free
  tier; forecasting gated Investor+).
- App stores: `npm i google-play-scraper app-store-scraper` (free) or mobile-store-scraper-mcp (self-host).
- Finnhub MCP: cfdude/mcp-finnhub (free 60/min key).
- jmanek/google-news-trends-mcp (81★): self-host, free no-key (Google News RSS + Trends).

## frontier-research `last_verified: 2026-06`
Most sources are free / no-key (arXiv, HF read, OpenReview).
- arXiv: REST `http://export.arxiv.org/api/query` (free, no key). MCP: `uvx arxiv-mcp-server`
  (blazickjp/arxiv-mcp-server). Be polite (~1 req / 3s).
- Hugging Face: Daily Papers `https://huggingface.co/api/daily_papers` + Hub API (free, no key for
  read). Official HF MCP `https://huggingface.co/mcp` (HF token only for write/private/gated).
- Semantic Scholar: Graph API `https://api.semanticscholar.org/graph/v1` (free; request a free key
  at semanticscholar.org/product/api to lift rate limits). MCP: search "semantic-scholar mcp".
- Papers with Code: ⚠ DEAD, REST `https://paperswithcode.com/api/v1/` sunset by Meta (302-redirects
  to huggingface.co/papers/trending). SOTA-leaderboard is now a gap.
- OpenReview: API2 `https://api2.openreview.net` (free; openreview-py client `pip install openreview-py`).
- GitHub: official github MCP (PAT) or REST for trending/releases/star velocity.
- AI lab blogs / roundups: RSS where available + playwright MCP (no API), OpenAI, Anthropic,
  DeepMind, Meta AI, Mistral, Qwen, DeepSeek; AINews (smol.ai), The Batch, Import AI.
- alphaXiv (browser) · arxiv-sanity-lite (`karpathy/arxiv-sanity-lite`, self-host free) ·
  Connected Papers / ResearchRabbit (browser, no official API → playwright MCP).
- openags/paper-search-mcp (2.6k★): `uvx`/clone (arXiv+PubMed+bioRxiv multi-venue).
- Future-House/paper-qa (8.7k★): `pip install paper-qa` (grounded full-text PDF research).
- Deep synthesis → discover `research-lit` in the active host and read its instructions before delegating. If absent, report the setup gap and use a verified alternative or prepare installation; see `reference/tools/research-lit-skill.md`.

## browser-automation `last_verified: 2026-09` (stars verified via GitHub API 2026-09-06)
General frameworks (all free, self-host):
- browser-use: `pip install browser-use`, github.com/browser-use/browser-use (112.7k★)
- stagehand: `npm i @browserbasehq/stagehand`, github.com/browserbase/stagehand (24.2k★)
- skyvern: github.com/Skyvern-AI/skyvern (22.9k★, self-host + API)
- crawl4ai: `pip install crawl4ai` or docker, github.com/unclecode/crawl4ai (81.8k★)
- crawlee: `npm i crawlee`, github.com/apify/crawlee (25.7k★)
- scrapegraph-ai: `pip install scrapegraphai`, github.com/ScrapeGraphAI/Scrapegraph-ai (30.6k★)
- agent-browser: native CLI, ships `.claude-plugin`, github.com/vercel-labs/agent-browser (42.1k★,
  token-efficient browser agent)
Anti-detection: nodriver (`pip install nodriver`, 4.7k★, ⚠ last push 2026-05-13, no tagged releases) ·
camoufox (`pip install camoufox`, 11.7k★) ·
steel-browser (github.com/steel-dev/steel-browser, 7.6k★, self-host) ·
camofox-browser (github.com/jo-inc/camofox-browser, 9.2k★, free MIT, fingerprint spoofing on Camoufox).
playwright MCP verify the operation in the active host session.

Platform-specific OSS repos (free; most violate platform ToS, throwaway accounts for write/scrape):
- X: d60/twikit (`pip install twikit`, 4.5k★) + MCP adhikasp/mcp-twikit
- Instagram: subzeroid/instagrapi (`pip install instagrapi`, 6.3k★) · instaloader (`pip install instaloader`, 12.5k★, read-only)
- LinkedIn: stickerdaniel/linkedin-mcp-server (3.0k★, ready MCP, ⚠ high ban risk) · joeyism/linkedin_scraper (4.2k★)
- TikTok: davidteather/TikTok-Api (`pip install TikTokApi`, 6.4k★)
- 小红书: xpzouying/xiaohongshu-mcp (14k★, Go, ready MCP, can post) · NanmiCoder/MediaCrawler (66.7k★, 7 中文平台)
- YouTube/media: yt-dlp (`pip install yt-dlp`, 167k★)
- 微博: dataabc/weibo-crawler (4.5k★)
- Bluesky: `pip install atproto` (MarshalX/atproto, official) · Mastodon: `pip install Mastodon.py` (official)
- Ecom: Cybrarist/Discount-Bandit (697★, self-host tracker) · omkarcloud/amazon-scraper (220★)
- SERP/SEO: searxng/searxng (31k★, self-host meta-search) · towfiqi/serpbear (2k★, rank tracker) · deedy5/ddgs (2.7k★)
- B2B leads: gosom/google-maps-scraper (5.8k★, low-risk) · omkarcloud/google-maps-scraper (3.6k★, gh-api 2026-10-10)
- Trends: flack0x/trendspyg · sdil87/trendspy. App stores: facundoolano/google-play-scraper (2.9k★) + app-store-scraper
- Dead/avoid: tomquirk/linkedin-api (404), pytrends (archived), snscrape (停更), elizaOS/agent-twitter-client (下架)

## ready-skills `last_verified: 2026-06`
- ericosiu/ai-marketing-skills (3.5k★): `git clone` + pip + cp (NOT npx), marketing skill pack.
- indranilbanerjee/digital-marketing-pro (674★): GitHub clone (AEO/GEO skills).

## Discovery registries (find more)
smithery.ai (one-click) · glama.ai (largest) · mcp.so · pulsemcp.com (curated + traffic) ·
registry.modelcontextprotocol.io (official) · mcp.apify.com (3000+ actors).
