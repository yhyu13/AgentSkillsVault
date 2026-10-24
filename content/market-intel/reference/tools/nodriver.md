# Tool: ultrafunkamsterdam/nodriver

- **Domain(s):** browser-automation (also: none)
- **Barrier route:** ④ · **Source tier:** L2 · **Ready MCP:** no (Python lib / async API; the agent calls it directly)
- **Cost:** free (open source). ⚠ License **AGPL-3.0**, copyleft; fine for internal research/scraping, but check before bundling into a distributed product. Proxies at scale are the hidden cost.
- **Repo / Provider:** github.com/ultrafunkamsterdam/nodriver, `ultrafunkamsterdam/nodriver (4.3k★, gh-api 2026-06)`, AGPL-3.0, pushed 2026-05
- **Top pick for its domain:** no (escalation pick when plain Playwright is fingerprint-blocked)

## What it does / when to pick it
The **successor to undetected-chromedriver** from the same author, drives a real Chrome directly over CDP with **no Selenium/webdriver**, so it evades many bot-detection fingerprints out of the box. **Pick it when plain playwright MCP / crawl4ai gets blocked** (Cloudflare/DataDome 403, CAPTCHA loop) and you want a free, code-level escalation before paying Bright Data ②. Sibling escalation: camoufox (Firefox, stronger fingerprint spoofing), try nodriver first if you're already Chrome-based.

## Install
`pip install nodriver` (Python ≥3.10; uses your installed Chrome/Chromium). Not an MCP, call from a short async Python harness. L1 line: `reference/volatile/pricing-install.md#browser-automation`. On Windows it launches the local Chrome binary directly (fewer Playwright path quirks than the Playwright-based tools), but still prefer a clean venv (see `install-guide.md` Windows notes).

## Auth / keys
No service key. Target-site auth = a logged-in profile / cookies you supply (it can reuse a real Chrome user-data-dir, which helps it look human). No LLM key needed, it's a low-level driver, not an LLM agent. Not key-bearing.

## Usage, call examples
```python
import nodriver as uc
async def main():
    browser = await uc.start()           # launches undetected Chrome
    page = await browser.get("https://site/guarded")
    el = await page.select("div.price")
    print(el.text_all)
uc.loop().run_until_complete(main())
```
Pass `user_data_dir=` to reuse a logged-in profile; combine with a residential proxy for guarded targets.

## General experience & gotchas (踩坑)
- **Escalation tool, not a first hop.** Default to playwright MCP / crawl4ai; only reach for nodriver when you see hard-block signals (403, CAPTCHA loop, challenge HTML). It's lower-level (no high-level act/extract helpers), you write more glue.
- **Fingerprint evasion ≠ invincibility.** It defeats common detectors but aggressive DataDome / per-request CAPTCHA / behavioral checks still win. The arms race moves, pin a version and expect it to need updates when a target re-hardens.
- **Proxies are the real cost at scale.** Software is free; IP reputation is what gets you blocked. A residential/rotating proxy pool does more than any flag here.
- **AGPL-3.0** is the catch vs. MIT/Apache siblings, fine for research, mind it for redistributed products.
- Most platform scraping violates ToS, throwaway accounts + a logged-in profile for scrape-heavy work, never the user's primary account.

## Failure signals & fallback
Failed = still 403 / CAPTCHA after switching to nodriver, or it can't find present elements. Fallbacks: **camoufox** (Firefox-based, strongest fingerprint spoofing) or **patchright** (undetected-Playwright drop-in), and when free evasion fully fails hand the barrier to **Bright Data ②** (provider absorbs Cloudflare/DataDome/CAPTCHA). For goal-driven interaction layer **browser-use** on top.

## Last verified: 2026-06
