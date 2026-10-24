# Tool: apify/crawlee

**Runtime storage status: setup only.** No shipped adapter admits this tool's
complete file output. Do not launch collection, login or persistence until every
child-file write meets the [external-tool storage requirements](../../../../DATA.md#external-tool-storage).
`resolve_directory` alone does not authorize writes; examples below are setup guidance.

- **Domain(s):** browser-automation (also: none)
- **Barrier route:** ④ · **Source tier:** L2 · **Ready MCP:** no (Node/Python framework; the base you build a bespoke scraper on)
- **Cost:** free (open source, Apache-2.0). Self-host = zero API cost; proxies are the hidden cost at scale. (Running it on Apify's cloud platform is separate billing.)
- **Repo / Provider:** github.com/apify/crawlee, `apify/crawlee (23.7k★, gh-api 2026-06)`, Apache-2.0, pushed 2026-06
- **Top pick for its domain:** no

## What it does / when to pick it
A scraping **framework** (not an AI agent): unifies Playwright / Puppeteer / Cheerio behind one crawler API with request queue, auto-retry, **proxy rotation**, session pooling, and structured dataset output. **Pick it when you're building a bespoke, repeatable, large-scale scraper** and want production plumbing (concurrency, retries, proxy rotation) rather than an ad-hoc agent. Pick playwright MCP / browser-use for one-off or interactive tasks; pick crawl4ai if you mainly want clean Markdown out with built-in anti-bot and less code.

## Install
`npm i crawlee` (Node ≥18; install the browser engine you use, e.g. `npx playwright install`). A Python `crawlee` port also exists (`pip install crawlee`). Not an MCP, you write a Node/TS (or Python) scraper script. L1 line: `reference/volatile/pricing-install.md#browser-automation`. On Windows, prefer the Cheerio (HTTP) crawler where possible to avoid native browser-engine path quirks (see `install-guide.md`).

## Private runtime and outputs
Before any collection or login below, use `tools/private_inventory.py` from the full consumer checkout. Select an existing absolute runtime directory with `runtime = resolve_directory("runtime/crawlee")`. This resolves the final directory's containing Git worktree, including a nested repository at that directory, and refuses directories outside it or inside this checkout. Stop if the check fails. Revalidate `resolve_directory(path=runtime.path)` immediately before launching the caller with that directory as its working directory.

Follow the [external-tool output checklist](../../../../DATA.md#external-tool-storage)
for installed-version output settings, implicit storage, stdout and credentials.
Keep this tool in setup status if any output cannot be located and admitted.

## Auth / keys
No service key. Target-site auth = sessions/cookies you manage (Crawlee has built-in session pool + cookie handling). Proxy credentials (if you use a paid proxy pool) go in its proxy config, those *are* secrets; set via env, keep them out of the transcript (see `install-guide.md` secret hygiene). No LLM key (it's not AI-driven).

## Usage, call examples
```js
import { PlaywrightCrawler } from 'crawlee';
const crawler = new PlaywrightCrawler({
  proxyConfiguration,                 // rotation built in
  async requestHandler({ page, pushData, enqueueLinks }) {
    await pushData({ title: await page.title() });
    await enqueueLinks();             // follow + queue links
  },
});
await crawler.run(['https://example.com']);
```
Choose `CheerioCrawler` (fast, no browser) for static HTML, `PlaywrightCrawler`/`PuppeteerCrawler` for JS-rendered pages.

## General experience & gotchas (踩坑)
- **It's plumbing, not intelligence.** No LLM goal-following, you write selectors/handlers. For "tell it what to extract in words," use browser-use / stagehand / crawl4ai instead; reach for Crawlee when you need robust *infrastructure* (queue, retries, scale).
- **Use `CheerioCrawler` first** for static pages, it's far cheaper/faster than spinning a real browser; only escalate to PlaywrightCrawler when the content is JS-rendered.
- **Anti-bot is on you.** Crawlee gives proxy rotation + fingerprint helpers but no magic bypass, hardened Cloudflare/DataDome still blocks it. Wire in patchright/camoufox engines, or hand the barrier to Bright Data ②. Proxies are the real cost at scale (software is free).
- **Heavier to author** than crawl4ai for a "just give me clean Markdown" job, more code for the same output. Justify it only when you need the production controls.
- The Apify cloud platform is a separate paid product; the OSS framework self-hosts free, don't conflate the two.

## Failure signals & fallback
Failed = repeated 403/CAPTCHA across the request queue, empty datasets, or you're writing more agent-logic than framework code. Fallbacks: **crawl4ai** (less code, built-in anti-bot, Markdown out), **browser-use/stagehand** (when you actually need AI interaction), **patchright/camoufox** (fingerprint), **Bright Data ②** (provider absorbs the barrier).

## Last verified: 2026-06
