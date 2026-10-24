# Tool: Firecrawl (skill `firecrawl`)

- **Domain(s):** web-scraping (also: none)
- **Barrier route:** ② resale API · **Source tier:** L2 · **Ready MCP:** yes, `npx -y firecrawl-mcp`; optional Firecrawl skills require current-host discovery
- **Cost:** free **1,000 credits/mo** (firecrawl.dev, refreshed 2026-06, was "500 one-time"), cheapest paid Hobby ~$16/mo; confirm current tiers at https://www.firecrawl.dev/pricing [fetched 2026-06]
- **Repo / Provider:** github.com/firecrawl/firecrawl, `firecrawl/firecrawl (176.4k★, gh-api 2026-06)`; active (pushed 2026-06-09, not archived, AGPL-3.0, verified gh-api 2026-06-09)
- **Top pick for its domain:** yes (the default JS-render SCRAPE/crawl pick)

## What it does / when to pick it
Hosted JS-rendering scraper: `scrape` one page to clean markdown, `crawl` a whole site, `map` its URLs, and `extract` structured JSON via a schema/prompt. **Decision rule:** pick Firecrawl when you need the *rendered content* of a normal (non-hardened) site, docs, blogs, marketing pages, catalogs that load via JS. Its hosted stealth handles many sites the built-in WebFetch can't (WebFetch runs no JS, uses your IP). Step UP to **Bright Data** (②) when the target actively blocks you (Cloudflare/DataDome/CAPTCHA, Amazon/Taobao/Reddit). Use a discovered Firecrawl skill or verified MCP operation; keep Tavily/Exa for SERP and Bright Data for barrier work (shard).

## Install
Check the active host's skill catalog for the relevant Firecrawl skill and read its installed instructions before invoking it. Market-intel does not bundle or install those skills. If absent, configure the raw MCP with `npx -y firecrawl-mcp` (stdio; Windows mechanics in L0), or use a verified crawl4ai/browser alternative and report the setup gap. Exact command + key origin: `reference/volatile/pricing-install.md → web-scraping`. The repo is AGPL-3.0 if you self-host; the shard warns **self-host is weak vs WAF**. Follow `reference/install-guide.md`, reconnect after adding the MCP, and verify the selected scrape operation in the active session.

## Auth / keys
Free key from firecrawl.dev (1,000 credits/mo as of 2026-06; was 500 one-time). **Secret hygiene (one line):** edit `~/.claude.json` from clipboard instead of `claude mcp add` for the key-bearing form, and never `browser_snapshot` the key page, `reference/install-guide.md`.

## Usage, call examples
MCP tools: `firecrawl_scrape(url, formats:["markdown"])`, `firecrawl_crawl(url, limit)`, `firecrawl_map(url)`, `firecrawl_extract(urls, schema|prompt)`, `firecrawl_search(query)`. Minimal: `firecrawl_scrape` a single URL → clean markdown. For structured fields use `extract` with a JSON schema rather than post-parsing markdown.

## General experience & gotchas (踩坑)
- **Real-run lesson (shard, 2026-06): Amazon product pages return HTTP 500 to Firecrawl/WebFetch (anti-bot).** Do NOT spend fan-out rounds trying Firecrawl on Amazon/Taobao/Tmall live prices, go straight to playwright(④)/Bright Data. Taobao/Tmall also hide the real per-SKU price behind a login wall Firecrawl can't pass.
- **Reddit returns empty** to this layer (shard), use a Reddit-API tool, not Firecrawl.
- **Self-host is weak vs WAF** (shard), the OSS version lacks the hosted stealth/proxy pool; for protected sites you must use the hosted API (which spends credits) or escalate to Bright Data.
- The free 1,000 credits/mo can still be burned fast by a single large `crawl`, cap `limit` and prefer `scrape`/`map` over blind full-site crawls.
- `crawl` is async/long-running and can stall on large sites or infinite-scroll; `extract` with a tight schema is cheaper and more reliable than crawling then parsing.
- AGPL-3.0: fine for self-use, but the copyleft matters if you embed it in a distributed product.

## Failure signals & fallback
Failure looks like: HTTP 500 / blocked / CAPTCHA page returned as "content", empty markdown on a JS page, or a crawl that never completes. **Fallback ladder:** anti-bot/CAPTCHA/Amazon/Taobao/Reddit → **Bright Data** Web Unlocker (②, strongest barrier-breaker); a single interactive/login-walled page → **playwright MCP** after current-session verification (④); finding URLs in the first place → **Tavily/Exa** (②); zero-cost self-host crawler → **crawl4ai** (③).

## Last verified: 2026-06
