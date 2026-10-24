# Tool: unclecode/crawl4ai

- **Domain(s):** browser-automation (also: web-scraping, trends-discovery)
- **Barrier route:** ③ · **Source tier:** L2 · **Ready MCP:** yes, docker MCP (also usable as a Python lib)
- **Cost:** free (open source, Apache-2.0). Self-host = zero API cost; LLM tokens only if you use the optional LLM-extraction strategy; proxies at scale.
- **Repo / Provider:** github.com/unclecode/crawl4ai, `unclecode/crawl4ai (81.8k★, gh-api 2026-09-06)`, Apache-2.0, pushed 2026-09-01
- **Top pick for its domain:** yes

## What it does / when to pick it
LLM-friendly crawler that renders pages and emits clean **Markdown / structured JSON** ready for an LLM, with **built-in anti-bot** (handles many Cloudflare/Akamai cases) at zero API cost. The zero-cost self-host crawl 首选. **Pick it over playwright MCP** for **bulk** crawling (many URLs, whole-site, or "fetch + clean to Markdown" pipelines) and when plain Playwright gets soft-blocked. Pick browser-use/stagehand instead for goal-driven interaction (login flows, clicking through a portal); crawl4ai is read/extract-oriented, not a click-the-buttons agent.

## Install
`pip install crawl4ai` then `crawl4ai-setup` (installs Playwright browsers), **or** run the Docker image which exposes a **ready MCP**, preferred for a clean, reproducible server (see `install-guide.md` Docker prereq). L1 line: `reference/volatile/pricing-install.md#browser-automation`. Docker/HTTP route is the Windows-friendly path (avoids native Playwright path quirks).

## Auth / keys
Crawl4AI's deterministic CSS/XPath/Markdown extraction needs no model key. Target cookies, headers, browser state, caches and extracted data still belong in the PRIVATE versioned runtime configured through the installed version's supported options. Any model-assisted extraction must use installed `llmcall` with its current routing and defaults. `LLMExtractionStrategy` remains setup-only until a compatible adapter and its extraction input/output contract have been verified; supplying a direct provider key does not satisfy this workflow.

## Usage, call examples
```python
from crawl4ai import AsyncWebCrawler

async def read_markdown(crawler: AsyncWebCrawler):
    result = await crawler.arun(url="https://example.com/")
    return result.markdown
```
The caller supplies an initialized crawler whose browser/cache/output paths use the verified
PRIVATE runtime, then persists the returned Markdown through the private output adapter. Do not
construct a crawler with default persistence paths for real work. If a writer cannot be
redirected through the installed version's supported options, keep the integration in setup.
For structured output, prefer `JsonCssExtractionStrategy` or the installed version's XPath
strategy. For Docker MCP, discover the selected crawl operation in the active host and verify
its actual input/output shape with a read request. Upstream MCP support or a reachable container
is only a setup signal. Keep the model-assisted path in setup until the installed `llmcall`
adapter passes the same operation check.

## General experience & gotchas (踩坑)
- **Best free first hop for "fetch + clean to Markdown" at volume**, its anti-bot clears many soft Cloudflare/Akamai walls that stop plain Playwright, at zero per-request cost (unlike Firecrawl/Bright Data ②).
- **Prefer deterministic CSS/XPath/Markdown extraction.** Irregular structure may justify model assistance after the installed `llmcall` adapter and tool I/O are verified. Preserve routing, model, timeout and fallback defaults; do not create another provider ladder.
- **Not an interaction agent.** It reads/extracts; it won't reliably log in, click through paginated portals, or fill forms. For that use browser-use/stagehand/skyvern.
- **Hard anti-bot still wins.** Aggressive DataDome / per-request CAPTCHA / heavy JS-fingerprinting will still block it, signal: 403, challenge HTML in `.markdown`, empty result. Then add patchright/camoufox, or hand it to Bright Data ② (provider absorbs the barrier). For e-commerce price work specifically, prefer the e-commerce shard's picks (Keepa ①, Bright Data ②) over raw crawling, Amazon returns 500/blocks to generic crawlers.
- Proxies are the hidden cost at scale; the software is free.

## Failure signals & fallback
Failed = 403 / challenge page text in the markdown / empty result, or you actually need to click/log in. Fallbacks: **patchright/nodriver/camoufox** (fingerprint), **browser-use/stagehand** (interaction needed), **Firecrawl ② or Bright Data ②** (let a provider absorb the anti-bot barrier).

## Last verified: 2026-09 (repository existence, stars and activity checked through gh api; earlier usage observations retained, with setup guidance revised separately)
