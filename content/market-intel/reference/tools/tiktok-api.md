# Tool: davidteather/TikTok-Api

- **Domain(s):** social-publishing (also: trends-discovery, browser-automation)
- **Barrier route:** ④ · **Source tier:** L4 · **Ready MCP:** no (Python lib; wrap it yourself)
- **Cost:** free (OSS), proxies at scale
- **Repo / Provider:** github.com/davidteather/TikTok-Api, `davidteather/TikTok-Api (6.4k★, gh-api 2026-06)` (MIT; actively maintained, last push 2026-05)
- **Top pick for its domain:** no

## What it does / when to pick it
Unofficial **read/scrape** TikTok lib that uses **Playwright to generate signed requests**, fetch
video/user/hashtag/sound/trending data, search, comments. Pick it for **viral-selling signals**:
which products/sounds/hashtags are exploding on TikTok (strong trends-discovery cross-use). It does
**not post**, for TikTok publishing there's no safe free route here. For broad Chinese short-video
coverage use NanmiCoder/MediaCrawler ④ (抖音 + 6 more platforms).

## Install
`pip install TikTokApi` then `python -m playwright install` (it needs a Playwright browser to sign
requests). No ready MCP, wrap in a script. Windows: Playwright works but install the browser binary
first. Volatile line: `reference/volatile/pricing-install.md` → browser-automation.

## Auth / keys
No API key. It needs a **`ms_token`** cookie value (grabbed from a logged-in/visiting browser) passed
to the client for most endpoints. No password. If you supply a ms_token, treat it as a secret, user
provides it, don't echo it (see `reference/install-guide.md`).

## Usage, call examples
```python
from TikTokApi import TikTokApi
async with TikTokApi() as api:
    await api.create_sessions(ms_tokens=[MS_TOKEN], num_sessions=1, headless=True)
    async for v in api.hashtag(name="tiktokmademebuyit").videos(count=30):
        print(v.as_dict["stats"])   # play/like/share counts
```

## General experience & gotchas (踩坑)
- **Playwright-signed = heavier and more fragile** than a plain HTTP scraper: it launches a browser,
  so it's slower and breaks when TikTok changes signing. Keep the lib updated (actively maintained).
- **ms_token expires**, a stale token yields empty results or errors; refresh it from a live browser.
- TikTok heavily rate-limits/geo-blocks datacenter IPs → use residential proxies for any volume;
  empty responses are usually a block, not "no data".
- Read-only / ToS-violating: throwaway context, no posting. Great for *demand signals*, not for
  publishing.

## Failure signals & fallback
Empty result sets, `EmptyResponseException`, or captcha/verify pages = blocked or token expired →
refresh ms_token, rotate proxy, slow down. Fallbacks: **playwright MCP** ④ (drive TikTok web
directly), **brightdata** ② (absorbs TikTok's anti-bot wall for data at scale), or
**MediaCrawler** ④ for multi-platform 中文 coverage.

## Last verified: 2026-06
