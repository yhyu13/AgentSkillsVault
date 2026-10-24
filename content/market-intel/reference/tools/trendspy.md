# Tool: Google Trends OSS (trendspy / trendspyg)

- **Domain(s):** seo-keywords (also: trends-discovery)
- **Barrier route:** ④ (free lib, no key) · **Source tier:** L4 · **Ready MCP:** no, Python library; call from code or wrap in a thin MCP
- **Cost:** free [github.com/sdil87/trendspy, gh-api 2026-06]
- **Repo / Provider:** github.com/sdil87/trendspy, sdil87/trendspy (114★, gh-api 2026-06; MIT). ⚠ canonical `trendspy` PyPI repo last pushed **2024-12 (>18mo, stale)**. Actively maintained sibling: github.com/flack0x/trendspyg (48★, MIT, last push 2026-06-08).
- **Top pick for its domain:** no

## What it does / when to pick it
These are the OSS libraries that provide **Google Trends access after `pytrends` was archived** (and started throwing 429s). They pull interest-over-time, related/rising queries, and trending searches by region. Pick them when you need the *relative-demand trajectory* of a keyword/topic (is search interest rising or fading), something SERP tools (SearXNG/ddgs) and even keyword-volume APIs don't show as a time series. Decision rule: for one-off relative-trend curves on a free budget, use a trendspy lib; for absolute volume/CPC use DataForSEO/Google Ads Keyword Planner ①; for your own site's real traffic use GSC ①. **DataForSEO also exposes Google Trends JSON** as a paid, more reliable alternative when these libs get throttled.

## Install
```
pip install trendspy        # sdil87/trendspy
# or the actively-maintained fork:
pip install trendspyg       # flack0x/trendspyg
```
Pure library, no MCP transport. Import and call, or wrap in a thin MCP. See `reference/install-guide.md` (Python prereqs). Confirm the package/repo in `reference/volatile/pricing-install.md` → seo-keywords, the OSS Trends landscape is volatile (pytrends is dead; pick the fork with a recent push).

## Auth / keys
None, no account, no API key. (No secret-hygiene concern.)

## Usage, call examples
```python
from trendspy import Trends
tr = Trends()
df = tr.interest_over_time(["patio heaters"], timeframe="today 12-m", geo="US")
rising = tr.related_queries("patio heaters", geo="US")   # rising/top queries
```
(API surface differs slightly between `trendspy` and `trendspyg`, check the installed lib's README.)

## General experience & gotchas (踩坑)
- **Google Trends is unofficial and aggressively rate-limited.** The whole reason these exist is that `pytrends` got 429-blocked and archived, **the same 429 risk applies here.** Throttle hard, cache, add delays/proxies, and treat any single endpoint as fragile.
- **Pick the maintained fork.** The canonical `trendspy` PyPI repo (sdil87) has not been pushed since **2024-12** (stale, may break when Google changes its internal endpoint); `flack0x/trendspyg` is actively maintained (push 2026-06). When one breaks with empty/HTTP errors, switch fork or `pip install -U`.
- **Trends data is RELATIVE (0 to 100 index), not absolute volume.** It tells you direction/momentum, not how many searches. Don't quote it as search volume, pair with Keyword Planner/DataForSEO for absolute numbers.
- Geo/timeframe strongly change the result; an unset `geo` defaults to worldwide and can mask a local trend.
- Shard explicitly flags `pytrends` as **archived/avoid for prod**, these libs inherit the same shakiness; flag the reliability caveat in any report.

## Failure signals & fallback
Empty DataFrame, HTTP 429, or a parse error = Google throttled the unofficial endpoint or the lib went stale against an endpoint change. Switch fork / `pip install -U` first, then add proxies/back-off. If still unreliable, fall back to **DataForSEO** Google Trends JSON (② paid but stable) or **SerpApi** Google Trends (free 250/mo). For trending-topic discovery beyond keywords, cross to the trends-discovery domain (GDELT ①).

## Last verified: 2026-06
