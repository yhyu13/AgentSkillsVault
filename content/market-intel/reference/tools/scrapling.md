# Tool: Scrapling (adaptive stealth scraper + built-in MCP)

- **Domain(s):** web-scraping (also: browser-automation)
- **Barrier route:** ③/④ · **Source tier:** L2 · **Ready MCP:** **yes**, ships an official built-in MCP server (registered `io.github.D4Vinci/Scrapling`), plus an n8n integration. The MCP extracts targeted content *before* it reaches the LLM, so it doubles as a token-saver, not just a fetcher.
- **Cost:** free, open-source (no key, no quota) [github.com/D4Vinci/Scrapling, gh-api fetched 2026-09-06]
- **Repo / Provider:** `D4Vinci/Scrapling (78.8k★, gh-api 2026-09-06)`, not archived, pushed 2026-09-04, ~7.9k forks (healthy star/fork ratio, no inflation smell). Active release cadence (v0.4.x line through mid-2026).
- **Top pick for its domain:** no (Bright Data ② stays the top barrier-breaker; Scrapling is the strongest **free** ③/④ self-host scrape option, directly contesting Firecrawl's self-host role at $0)

## What it does / when to pick it
An adaptive web-scraping framework: its "adaptive" selectors can relocate elements after a site's markup changes (re-find by similarity instead of breaking on a moved CSS path), and its stealth fetcher is built on **camoufox** (anti-fingerprint Firefox), so it clears many Cloudflare/DataDome checks without a paid unlocker. **Decision rule:** when you want a *free, self-hosted* scrape+extract layer and would otherwise reach for Firecrawl self-host, pick Scrapling, it adds anti-bot fetching + adaptive parsing + a native MCP in one library. Escalate to **Bright Data** (②, free 5k/mo) only when the block is IP-reputation based (Scrapling fixes fingerprint, not your IP) or you need managed scale without running your own browser.

## Install
Python ≥3.10: `pip install scrapling` then `scrapling install` (fetches the camoufox/browser deps). MCP mode: run the packaged server (`scrapling mcp` per its README) and add it as a stdio MCP, or use the registered `io.github.D4Vinci/Scrapling` entry from an MCP registry client. Windows note: the camoufox/browser download is large on first `scrapling install`; same proxy caveat as Playwright/patchright. Volatile install line: `pricing-install.md` → web-scraping.

## Auth / keys
None for the library itself, no account, no API key. The only "credential" is any logged-in session/cookies you feed a target site (same posture as Playwright/patchright); keep any cookie file out of the transcript and out of git.

## Usage, call examples
```python
from scrapling.fetchers import StealthyFetcher
page = StealthyFetcher.fetch("https://target-behind-cloudflare.example", headless=True)
# adaptive selection: survives minor markup changes
titles = page.css("h2.product-title::text")
print(titles)
```
MCP: point an MCP client at the packaged Scrapling server; it returns pre-extracted content for a URL+selector/instruction, cutting the tokens the model has to read.

## General experience & gotchas (踩坑)
> Not yet exercised in a live market-intel run, the notes below are from the repo docs + feature set, gh-api verified 2026-07-01, and should be hardened with a `live-runs.jsonl` entry after first real use (R4).
- **Fingerprint, not IP:** the StealthyFetcher cleans the browser fingerprint (camoufox base) but the request still leaves *your* IP, datacenter-IP / rate / geo blocks survive. Pair with a residential proxy for IP-reputation targets (same ④ split as patchright vs Bright Data).
- **Adaptive selectors are a convenience, not magic:** they relocate elements by similarity after small markup drift; a full redesign still breaks them. Don't treat "adaptive" as a reason to skip selector maintenance on high-value scrapes.
- **MCP is an extraction layer:** its value over a raw fetch is that it returns *targeted* content, saving tokens, but you still choose the selector/instruction. Garbage instruction → garbage extraction.
- **Browser weight:** first `scrapling install` pulls a camoufox/Firefox build (~hundreds of MB), like Playwright/patchright.

## Failure signals & fallback
Failure looks like persistent CAPTCHA/JS-challenge loops, `403`/`429`, or a Cloudflare "checking your browser" page that never resolves. **If Scrapling still gets blocked: (1)** add a residential proxy and retry (most remaining ④ blocks are IP-based); **(2)** escalate to **Bright Data Web Unlocker** (②, free 5k/mo, no card) which absorbs both fingerprint *and* IP; **(3)** for managed self-host with docker MCP, **crawl4ai** (③) is the sibling option. For plain JS-render scrapes that aren't barrier-blocked, **Firecrawl** (②) or the connected **playwright MCP** (④) is simpler.

## Last verified: 2026-09 (repo facts re-pulled from gh api and the tool promoted to a web-scraping shard row this sweep; usage/gotcha notes carried forward from 2026-07)
