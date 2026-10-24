# Tool: ScrapeGraphAI/Scrapegraph-ai

- **Domain(s):** browser-automation (also: web-scraping)
- **Barrier route:** ④ · **Source tier:** L2 · **Ready MCP:** no (Python lib; the agent calls it directly, or wrap it yourself)
- **Cost:** free (open source, MIT). You pay only your own LLM tokens (an LLM builds & runs the extraction graph) + proxies at scale. Optional hosted ScrapeGraphAI API/SDK is separately priced, confirm at https://scrapegraphai.com (price unverified 2026-06).
- **Repo / Provider:** github.com/ScrapeGraphAI/Scrapegraph-ai, `ScrapeGraphAI/Scrapegraph-ai (27.0k★, gh-api 2026-06)`, MIT, pushed 2026-06
- **Top pick for its domain:** no

## What it does / when to pick it
You **describe what to extract in plain words** ("get every product name + price + rating") and it builds an internal scraping *graph* (fetch → parse → LLM-extract) that returns structured JSON. **Pick it over crawl4ai** when the page layout is irregular or unknown and you'd rather write a prompt than CSS selectors; pick it over browser-use when you only need read/extract, not multi-step clicking. Default to playwright MCP / crawl4ai first, reach for ScrapeGraphAI when selector-writing is the bottleneck.

## Install
`pip install scrapegraphai` then `playwright install` (it uses Playwright to render). Python ≥3.10. Not an MCP, call from a short Python harness. L1 line: `reference/volatile/pricing-install.md#browser-automation`. On Windows prefer WSL or a clean venv to dodge native Playwright path quirks (see `install-guide.md` Windows notes).

## Model integration status
This source is cataloged as requiring setup. The upstream direct-provider example
does not satisfy this workspace's shared model interface. No supported `llmcall`
adapter for this library is supplied or verified here, so do not instantiate a
provider client or pin a planner model from this page.

All model or external-agent work must use installed `llmcall`, inheriting its
current routing, model, timeout and fallback policy. Verify an actual supported
adapter and its tool-I/O contract before using this library. Until then, use a
current-session verified deterministic browser/extractor route. Keep resulting
content, cookies, profiles and traces in PRIVATE versioned DATA.

## General experience & gotchas (踩坑)
- **Token cost is the real cost, not a license.** Every run pumps page content through an LLM; large/long pages get expensive. Trim the source, scope the prompt, and inherit llmcall's configured model policy.
- **Non-deterministic output shape.** The same prompt can return slightly different keys/structure run-to-run, pin a JSON schema/output type and validate, don't trust the shape blindly.
- **Same fingerprint ceiling as plain Playwright.** It does NOT add anti-bot; hardened Cloudflare/DataDome still blocks it (signal: challenge HTML in the result, 403, empty extraction). Escalate to patchright/nodriver/camoufox, or hand the barrier to Bright Data ②.
- **Read/extract only**, it won't log in, paginate a portal, or click through flows; use browser-use/stagehand/skyvern for that.
- For e-commerce price work prefer the e-commerce shard's picks (Keepa ①, Bright Data ②), Amazon returns 500/blocks to generic renderers.

## Failure signals & fallback
Failed = empty/garbled JSON, challenge-page text in the result, 403, or token budget blown with no clean output. Fallbacks: **crawl4ai** (free selector/Markdown extraction, built-in anti-bot), **playwright MCP** for a deterministic scripted path, **browser-use** if interaction is needed, or **Bright Data ②** when the anti-bot wall is the blocker.

## Last verified: 2026-06
