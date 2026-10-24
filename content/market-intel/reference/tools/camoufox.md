# Tool: daijro/camoufox

- **Domain(s):** browser-automation (also: none)
- **Barrier route:** ④ · **Source tier:** L2 · **Ready MCP:** no (Python lib over a custom Firefox build; the agent calls it directly)
- **Cost:** free (open source, MPL-2.0). The patched Firefox binary downloads on first run; proxies at scale are the hidden cost.
- **Repo / Provider:** github.com/daijro/camoufox, `daijro/camoufox (11.7k★, gh-api 2026-09-06)`, MPL-2.0, pushed 2026-09-06
- **Top pick for its domain:** no (strongest-fingerprint escalation pick)

## What it does / when to pick it
A **custom anti-fingerprint Firefox build** that spoofs at the C++/browser level (navigator, screen, fonts, WebGL, locale, timezone), the **strongest fingerprint spoofing** in the domain. Driven via a Playwright-compatible Python API. **Pick it when nodriver/patchright still get fingerprint-blocked** and the wall is detection-by-fingerprint rather than IP. Sibling: jo-inc/camofox-browser adds a REST API + plugin over the same base. Try the cheaper Chrome-based escalations (nodriver/patchright) first; camoufox is the heavy hammer.

## Install
`pip install camoufox[geoip]` then `camoufox fetch` (downloads the patched Firefox). Python ≥3.10. Not an MCP, call from a short Python harness using its Playwright-style API. L1 line: `reference/volatile/pricing-install.md#browser-automation`. On Windows prefer a clean venv; the `fetch` step pulls a large binary (see `install-guide.md` Windows notes).

## Auth / keys
No service key. Target-site auth = cookies/logged-in storage state you supply. No LLM key needed. Not key-bearing. (It can inject a coordinated geolocation+locale+timezone+proxy bundle so your fingerprint and IP geography agree, set these together, not piecemeal.)

## Usage, call examples
```python
from camoufox.sync_api import Camoufox
with Camoufox(headless=True, geoip=True,
              proxy={"server": "http://user:pass@host:port"}) as browser:
    page = browser.new_page()
    page.goto("https://site/heavily-guarded")
    print(page.content())
```
Use `geoip=True` so spoofed locale/timezone match the proxy's country, mismatches are themselves a detection signal.

## General experience & gotchas (踩坑)
- **Last-resort fingerprint hammer, not a first hop.** It's heavier and slower than Chrome-based tools; only escalate here after playwright → nodriver/patchright still hit fingerprint blocks.
- **Fingerprint ≠ IP.** Best-in-class spoofing won't save a flagged datacenter IP, pair with a residential/rotating proxy. The `geoip` bundle matters: a US fingerprint over a German IP gets flagged.
- **Firefox, not Chrome.** Some targets/selectors behave differently than Chromium; if a site is Chrome-tuned this can be a downside. Scripts aren't drop-in identical to Playwright-Chromium.
- **The binary download is large** and version-pinned to the patched build, expect occasional `camoufox fetch` re-runs after upgrades.
- Most platform scraping violates ToS, throwaway accounts + proxies for scrape-heavy work.

## Failure signals & fallback
Failed = still blocked/CAPTCHA after the fingerprint upgrade, geo-mismatch flags, or Firefox-specific page breakage. Fallbacks: **nodriver/patchright** if you actually need Chrome behavior, **jo-inc/camofox-browser** for a REST-API wrapper over the same base, and when free evasion fully fails hand the barrier to **Bright Data ②** (provider absorbs Cloudflare/DataDome/CAPTCHA at managed cost).

## Last verified: 2026-09 (repository existence, stars and activity checked through gh api; usage/gotcha notes carried forward unchanged from the prior check)
