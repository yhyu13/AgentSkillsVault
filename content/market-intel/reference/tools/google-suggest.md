# Tool: Google Suggest / Autocomplete

- **Domain(s):** seo-keywords (also: none)
- **Barrier route:** ④ (free, no key) · **Source tier:** L4 · **Ready MCP:** no, raw HTTP endpoint; `curl`/`requests` or wrap in a thin MCP
- **Cost:** free, no key (undocumented public endpoint) [https://suggestqueries.google.com/complete/search, fetched 2026-06]
- **Repo / Provider:** https://suggestqueries.google.com/complete/search, Google's internal autocomplete endpoint (no GitHub repo, no official docs, no SLA)
- **Top pick for its domain:** no

## What it does / when to pick it
Hits Google's search-box autocomplete endpoint to return the live "people also search" suggestions for a seed query, a **free long-tail keyword-idea expander**. Pick it for the cheapest possible "give me 10 real queries people type around X" pass: alphabet-soup expansion (append a to z / question words to the seed and re-query) yields a usable long-tail list at zero cost and zero setup. Decision rule vs siblings: it gives **ideas/long-tail strings only, NO search volume, CPC, or difficulty**. The moment you need real volume/CPC, go to Google Ads Keyword Planner ① (free) or DataForSEO ②; for your own site's actual queries use GSC MCP ①. It complements SearXNG ④ (which gives SERP results, not query suggestions).

## Install
No install, it is a plain HTTP GET. Use `curl`, Python `requests`, or wrap it in a tiny MCP if you want it as a callable tool. No MCP package, no Docker, no account. See `reference/install-guide.md` for route-④ framing; the exact endpoint + params live in `reference/volatile/pricing-install.md` → seo-keywords.

```
GET https://suggestqueries.google.com/complete/search?client=firefox&q=<seed>
```
`client=firefox` returns clean JSON `[query, [suggestions...]]`; other clients (`chrome`, `toolbar`) return XML or padded JSONP. Add `&hl=en&gl=us` to pin language/country.

## Auth / keys
None, no account, no API key, no token. No secret-hygiene concern (nothing to leak).

## Usage, call examples
```bash
curl "https://suggestqueries.google.com/complete/search?client=firefox&q=patio-heater+led+light+bar&hl=en&gl=us"
# -> ["patio-heater outdoor heater", ["patio heater outdoor wiring", "...curved", "...amazon", ...]]
```
```python
import requests
seed = "ev charger"
r = requests.get("https://suggestqueries.google.com/complete/search",
                 params={"client": "firefox", "q": seed, "hl": "en", "gl": "us"})
suggestions = r.json()[1]
# alphabet-soup: loop seed + " a".." z" and seed + " how/why/best/vs" to widen long-tail
```

## General experience & gotchas (踩坑)
- **Undocumented + unstable, Google can throttle or change it anytime.** This is the headline shard warning: it is not a supported API, has no SLA, and a quiet format/param change can break it without notice. Treat it as best-effort, never as a prod dependency.
- **Throttle-prone from one IP.** Rapid alphabet-soup loops (26+ queries per seed) trip soft rate limits fast → empty arrays or HTTP 403/429. Add delays, cap concurrency, and rotate proxies/IPs for any batch work.
- **`client` param dictates the format.** `client=firefox` = JSON (use this); forget it and you get XML/JSONP and a parse failure. This is the #1 first-call mistake.
- **Localization is load-bearing.** Suggestions differ by `hl` (language) and `gl` (country); omit them and you get IP-geo defaults, silently skewing the keyword list for the wrong market.
- **Ideas only, zero metrics.** No volume, no CPC, no difficulty, no SERP. Do not infer demand from suggestion order; it is roughly popularity-ranked but not a number.

## Failure signals & fallback
Empty `[seed, []]`, HTTP 403/429, or XML where you expected JSON = throttled or the endpoint/format changed. Back off + add proxies + confirm `client=firefox`. If it stays unreliable or you need actual volume/CPC, fall back to **Google Ads Keyword Planner** ① (free, real volume + CPC, needs a dev token) or **DataForSEO** ② with authenticated production access to the relevant keyword endpoint. Its Sandbox can check request/response wiring with mock data, but it provides no live keyword or demand evidence; report the gap until production metrics are available. For SERP results rather than query suggestions, use **SearXNG** ④ or **playwright MCP**.

## Last verified: 2026-06
