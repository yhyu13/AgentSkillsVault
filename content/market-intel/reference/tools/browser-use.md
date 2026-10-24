# Tool: browser-use/browser-use

- **Domain(s):** browser-automation (also: x-twitter)
- **Barrier route:** ④ · **Source tier:** L2 · **Ready MCP:** no (Python lib; the agent calls it directly, or wrap it yourself)
- **Cost:** free (open source). You pay only your own LLM tokens (it calls an LLM to plan each step) + proxies at scale.
- **Repo / Provider:** github.com/browser-use/browser-use, `browser-use/browser-use (97.9k★, gh-api 2026-06)`, MIT, pushed 2026-06
- **Top pick for its domain:** yes

## What it does / when to pick it
An LLM drives the browser toward a **natural-language goal** ("log in, go to orders, extract the last 20 line items as JSON") instead of you scripting every click. Most-starred framework in the domain. **Pick it over playwright MCP** when the task is a multi-step goal where hand-scripting clicks would explode context, especially "log in and extract X." Pick playwright MCP instead for a tight, deterministic 1 to 2 step action; pick crawl4ai for bulk crawling many URLs.

## Install
`pip install browser-use` (Python ≥3.11; installs Playwright browsers on first run, `playwright install chromium` if it doesn't auto-fetch). Not an MCP, call from a short Python harness. See L1 line in `reference/volatile/pricing-install.md#browser-automation`. On Windows prefer running it in WSL or a clean venv; native Windows Playwright path quirks bite (see `install-guide.md` Windows notes).

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
- **Token cost is the real cost, not a license.** Each step is an LLM call reading the DOM; long pages × many steps = expensive fast. Cap `max_steps`, narrow the goal, inherit llmcall's selected planner policy.
- **Non-deterministic.** Same goal can take a different path / occasionally fail; for a fixed repeatable extraction, a hand-written playwright/crawl4ai script is cheaper and more reliable. Use browser-use to *discover* the path, then harden it into a script.
- **Same fingerprint ceiling as plain Playwright.** Hardened anti-bot (Cloudflare/DataDome) still blocks it, signals: CAPTCHA loop, 403, the agent "can't find" elements that exist. Escalate to patchright/nodriver/camoufox or hand the barrier to Bright Data ②.
- **Login walls:** supply cookies up front; don't let the agent attempt fresh logins on the user's primary account (ban/lockout risk), throwaway accounts for scrape-heavy work.
- Versions move fast (97.9k★, near-daily pushes), pin the version; the `Agent`/LLM-import API has shifted across releases.

## Failure signals & fallback
Failed = agent loops, "element not found" on a present element, CAPTCHA/403, or step budget exhausted with no result. Fallbacks: drop to **playwright MCP** for a deterministic scripted path, **crawl4ai** for bulk/anti-bot crawling, **stagehand** if you want scriptable act/extract/observe primitives, or **Bright Data ②** when the barrier is the blocker.

## Last verified: 2026-06
