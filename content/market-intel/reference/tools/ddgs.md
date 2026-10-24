# Tool: deedy5/ddgs

- **Domain(s):** seo-keywords (also: web-scraping)
- **Barrier route:** ④ (free lib, no key) · **Source tier:** L4 · **Ready MCP:** no, Python library; call from code or wrap in a thin MCP
- **Cost:** free [github.com/deedy5/ddgs, gh-api 2026-06]
- **Repo / Provider:** github.com/deedy5/ddgs, deedy5/ddgs (2.7k★, gh-api 2026-06; MIT, last push 2026-05-23, active)
- **Top pick for its domain:** no

## What it does / when to pick it
`ddgs` is a lightweight, **no-key** Python web-search library that fans out across multiple free backends (DuckDuckGo and other meta-search engines) for text, news, and image results. It's the successor to the old `duckduckgo-search` package. Pick it for **quick, zero-setup SERP/keyword-context pulls in code** when you don't want to stand up SearXNG's Docker stack and don't need volume/difficulty metrics. Decision rule: SearXNG (④) is the heavier, more controllable private-SERP default; `ddgs` is the grab-and-go option for small ad-hoc searches inside a script. For real search volume/CPC/backlinks, neither works, go to GSC ① / DataForSEO ② / SE Ranking ①.

## Install
```
pip install -U ddgs
```
Pure library, no MCP transport, no server. Import and call directly, or wrap in a tiny MCP if you want it as a tool. See `reference/install-guide.md` (Python ≥3.10 / uv prereqs). Confirm the package name in `reference/volatile/pricing-install.md` → seo-keywords (it migrated from `duckduckgo-search` → `ddgs`).

## Auth / keys
None, no account, no API key, no secret-hygiene concern.

## Usage, call examples
```python
from ddgs import DDGS
results = DDGS().text("patio-heater outdoor heater", region="us-en", max_results=20)
# each: {'title':..., 'href':..., 'body':...}
news = DDGS().news("ev charging market", max_results=10)
```

## General experience & gotchas (踩坑)
- **Rate-limit / `RatelimitException` is the dominant failure.** Hammering it from one IP triggers HTTP 202/429 throttling fast, back off, lower `max_results`, add delays, and rotate proxies (`proxy=` arg) at any real volume. The free backends are shared and fragile.
- **Backend churn breaks it periodically.** Because it scrapes free engines, upstream HTML/endpoint changes occasionally break a backend until a new release; **pin to a recent version and `pip install -U` when results suddenly go empty.** This is why the shard rates it L4 (not for prod) vs the heavier SearXNG.
- **No search volume, CPC, difficulty, or backlinks**, listings only. Don't infer demand from result counts.
- Region/locale matters (`region="us-en"`); wrong region silently returns a different SERP.
- Lighter and flakier than SearXNG: fewer knobs, no self-hosted control plane, more exposed to upstream throttling.

## Failure signals & fallback
Empty result list, `RatelimitException`, or a 202/429 = throttled or a broken backend. First `pip install -U ddgs`; then add proxies/delays. If it stays unreliable, fall back to self-hosted **SearXNG** (④, your own proxies, more stable) or a production SERP API such as **DataForSEO** or **SerpApi**, after checking current access, quota and the returned live listings. DataForSEO Sandbox supplies mock responses for request/response wiring tests; it cannot replace missing live SERP observations. If no production source works, preserve that evidence gap. For your own site's metrics, **GSC MCP** (①).

## Last verified: 2026-06
