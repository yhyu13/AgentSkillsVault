# Tool: Polygon.io (now Massive)

- **Domain(s):** finance-markets (also: none)
- **Barrier route:** ① official API · **Source tier:** L1 · **Ready MCP:** yes (official Polygon MCP; key required)
- **Top pick for its domain:** no (the **Pro upgrade** pick once the free trio isn't enough)

> **core.md**, judgment + 踩坑 + failure signals. Mechanical install / auth / usage /
> volatile pricing lives in [`polygon.auto.md`](polygon.auto.md). See
> `companion-config-spec.md §11` for the core/auto split convention.

## What it does / when to pick it
Full market-data API: realtime + ~20 years of history across stocks/options/indices/forex/crypto/futures, via REST, WebSocket streaming, and flat files. **Decision rule:** pick Polygon when the free trio (SEC EDGAR + FRED + Finnhub) can't deliver, specifically when you need *deep tick/aggregate history*, *WebSocket realtime*, or *reliable high-volume pulls*. It's the shard's designated **Pro** step-up. For a few quotes a day, Finnhub (60/min) or Twelve Data (800/day) free tiers are cheaper; pay for Polygon when scale, history depth, or true realtime is the requirement.

## General experience & gotchas (踩坑)
- **REBRAND, not a death:** polygon.io now 301-redirects to **massive.com**. This is a pure rename, the API base, endpoints, and existing keys did not change, and it remains the live Pro top pick (NOT demoted/superseded). Don't be alarmed by the redirect, verify pricing on the live site, which is JS-rendered (WebFetch returns an empty shell, so confirm tiers in-browser).
- **"Free realtime" is a trap:** the free Basic tier is **15-minute delayed** at 5 req/min, fine for research, not for anything time-sensitive. True realtime is the top tier.
- **Tier pricing rots**, re-verify on massive.com before committing spend. Snapshot dates in `polygon.auto.md`.
- **Rate-limit shape matters:** free is 5 req/min (easy to trip in a loop); paid tiers remove the per-minute cap. Batch and back off on the free tier.
- It's a quote/market-data source, **not fundamentals**, for filings use SEC EDGAR, for macro use FRED.
- **PyPI MCP wrappers are unstable** (confirmed 2026-06), community packages `polygon-mcp` / `polygon-mcp-server` have flaky installs and break across uvx versions. Recommendation: **load the API key through supported configuration at a verified absolute path in an initialized PRIVATE versioned companion and call REST through the approved client**. Follow the private-destination checks in [the install snapshot](polygon.auto.md); keep setup pending if the client cannot use that configuration. Never fall back to a credential file relative to public source.

## Failure signals & fallback
Failure looks like: HTTP 429 (free 5/min exceeded), delayed data when you expected realtime (wrong tier), or auth errors after the rebrand (key should still work, re-check the dashboard).

**Fallbacks:**
- Low-volume free quotes → **Finnhub** (60/min) or **Twelve Data** (800/day)
- Fundamentals / filings → **SEC EDGAR**
- Free no-key price route → `Alex2Yang97/yahoo-finance-mcp` (④, yfinance, not for prod, IP-ban prone)

## Last verified: 2026-06
