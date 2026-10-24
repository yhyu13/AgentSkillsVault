# Tool: Apify (3000+ actors + MCP)

- **Domain(s):** web-scraping (also: x-twitter, reddit-community, ecommerce-arbitrage)
- **Barrier route:** ② resale API · **Source tier:** L2 · **Ready MCP:** yes, hosted HTTP `https://mcp.apify.com`
- **Top pick for its domain:** no (marketplace, not a single tool, pin specific actors)

> **core.md**, judgment + 踩坑 + failure signals. The mechanical install/auth/usage facts
> live in [`apify.auto.md`](apify.auto.md), where they can be regenerated from upstream
> metadata when `registry.modelcontextprotocol.io` matures. See `companion-config-spec.md
> §11` for the core/auto split convention.

## What it does / when to pick it
A marketplace of 3,000+ prebuilt "actors" (hosted scrapers) for social, e-commerce, maps, and more, plus an MCP that can discover and run them. **Decision rule:** pick Apify when a *maintained prebuilt actor* already exists for your exact target (e.g. a specific Instagram/TikTok/Maps/Amazon scraper) and you'd rather rent it than build a route-④ scraper. For generic JS scraping use **Firecrawl**; for hard anti-bot use **Bright Data**; for search use **Tavily/Exa**. Apify wins on *coverage of niche platforms* with a ready actor. Cross-serves x-twitter (tweet actors ~$0.1 to 0.25/1k), reddit-community, and e-commerce.

## General experience & gotchas (踩坑)
- **Pin specific actors to avoid tool flood** (shard), the unpinned MCP can register dozens of tools and bury your real toolset; always scope to the actor(s) you need.
- **Cost is dual:** platform **compute units** (per-CU rate unverified, confirm at https://apify.com/pricing) PLUS many actors charge **pay-per-result** (~$0.1 to 0.25/1k for tweet actors). The $5/mo free credit is small, a single broad run can exhaust it; check the actor's pricing model (per-result vs per-CU) before a big run.
- **Actor quality varies**, actors are third-party; some are unmaintained or break when the target site changes. Check the actor's last-updated date and run-success rate before depending on it.
- An actor run is **async** (start run → poll status → read dataset), not an instant return; budget for the poll.
- It's a route-② resale wrapper over what's often route-④ scraping; for X/Twitter the native **twitterapi.io** MCP or self-host **twikit** may be cheaper/cleaner than a tweet actor, compare before defaulting to Apify.

## Failure signals & fallback
Failure looks like: tool-list flood (forgot to pin), an actor returning empty/stale data (site changed, actor unmaintained), a run stuck in "running", or burning the $5 credit on one job. **Fallbacks:** generic JS scrape → **Firecrawl** (②); hard anti-bot/Amazon/Reddit → **Bright Data** (②); X/Twitter → **twitterapi.io** (native MCP) or **twikit** (③④); build-your-own self-host → `apify/crawlee` (the OSS framework Apify is built on) or **playwright MCP** (④).

## Last verified: 2026-06
