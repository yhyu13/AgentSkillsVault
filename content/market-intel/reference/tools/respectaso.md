# Tool: respectlytics/respectaso

- **Domain(s):** seo-keywords (also: none)
- **Barrier route:** ④ (free OSS, self-host) · **Source tier:** L4 · **Ready MCP:** no, Python/CLI tool; run locally or wrap in a thin MCP
- **Cost:** free (open source; uses the free iTunes Search API) [github.com/respectlytics/respectaso, gh-api 2026-06]
- **Repo / Provider:** github.com/respectlytics/respectaso, respectlytics/respectaso (514★, GitHub stars checked 2026-10-03); repository metadata observed 2026-06: AGPL-3.0, last push 2026-06-07, active
- **Top pick for its domain:** no

## What it does / when to pick it
respectaso is a free, open-source **ASO (App Store Optimization) keyword-research** tool: it queries Apple's free iTunes Search API across up to 30 countries to estimate keyword traffic/difficulty, rank-check apps, and surface keyword ideas for **iOS App Store** listings. Pick it only when the deliverable is specifically **iOS app keyword research**, it occupies a niche the web-SEO siblings don't touch (GSC/DataForSEO/Ahrefs are about Google web search, not the App Store). Decision rule: it is **iOS / App Store ONLY, no Google Play, no web SERP.** For Android ASO you need a different source (Play scrapers / Sensor Tower); for web keywords use GSC ① / DataForSEO ② / SearXNG ④.

## Install
Self-host from the repo (no MCP package, no hosted service):
```
git clone https://github.com/respectlytics/respectaso
cd respectaso && pip install -r requirements.txt
```
Run its CLI/scripts locally; wrap in a thin MCP if you want it callable as a tool. See `reference/install-guide.md` for route-④ self-host + Python ≥3.10/uv prereqs and Windows notes; confirm the current install steps in `reference/volatile/pricing-install.md` → seo-keywords. ⚠ **AGPL-3.0**, if you host it as a network service, the copyleft obligations attach; keep it internal/self-use to avoid distribution requirements.

## Auth / keys
None, it rides the **free, no-key iTunes Search API**, so there's no account, token, or paid tier. No secret-hygiene concern (nothing to leak). The "cost" is purely your own compute + the iTunes API's informal rate limits.

## Usage, call examples
Per the repo, run its keyword-research command against a seed term + country set, e.g.:
```
python -m respectaso keywords --term "habit tracker" --countries us,gb,de
```
Returns per-keyword traffic/difficulty estimates and app rankings derived from iTunes Search results across the requested storefronts. (Exact subcommand/flags rot, check the repo README before relying on a specific invocation.)

## General experience & gotchas (踩坑)
- **iOS / App Store ONLY.** The single most important constraint (and the shard's ⚠): there is **no Google Play / Android coverage**. Using it for Android ASO silently gives you nothing useful.
- **Estimates, not Apple ground truth.** Traffic/difficulty are *modeled* from the public iTunes Search API (which exposes ranking/metadata, not real search volume). Treat numbers as directional signals, not Apple Search Ads-grade data.
- **iTunes Search API throttling.** Apple's endpoint has informal rate limits (~20 calls/min territory); wide multi-country sweeps can get throttled, pace requests and don't fan out all 30 countries at once.
- **AGPL-3.0 license trap.** Heavier copyleft than the MIT-licensed SEO siblings (serpbear/ddgs/SearXNG). Self-use is fine; offering it as a service triggers source-disclosure obligations.
- **Thin adoption / small project.** ~377★, niche maintainership, verify it still runs against the current iTunes API before building a workflow on it (added 2026-06; not battle-tested at scale).

## Failure signals & fallback
Empty/zero results, HTTP 403/429 from the iTunes endpoint, or stale data = throttled or an upstream iTunes Search API change. Pace requests / narrow the country set / re-pull from the repo. If iOS ASO needs paid-grade accuracy, fall back to **Sensor Tower** ② (paid, App Store + Play download/keyword estimates) or App Store scrapers (`app-store-scraper` ③ for raw listing/review data). For **Android** ASO there is no sibling here, use `google-play-scraper` ③ for raw Play data. For web (non-app) keywords, this tool is the wrong domain slice, use **GSC** ① / **DataForSEO** ② / **SearXNG** ④.

## Last verified: 2026-06
