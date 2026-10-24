# Tool: Unusual Whales MCP

- **Domain(s):** finance-markets (also: none)
- **Barrier route:** ① · **Source tier:** L1 · **Ready MCP:** yes, official, but gated behind a paid API token
- **Cost:** paid API add-on, **price unverified 2026-06, confirm at https://unusualwhales.com/pricing?product=api** (JS-rendered, not machine-readable, WebFetch returns no tier numbers). No free API tier; a web subscription does NOT include API, the token is a separate purchase.
- **Repo / Provider:** https://unusualwhales.com (API docs https://api.unusualwhales.com/docs), closed-source SaaS, not a GitHub repo
- **Top pick for its domain:** no

## What it does / when to pick it
Differentiated alt-data the free finance stack cannot give you: **options flow, dark-pool prints, Greek exposure (GEX) by strike/expiry, and congressional trades** (100+ endpoints, also insider/earnings/news). Pick it ONLY when the research question is specifically about unusual options activity, dealer positioning, or politician trades, i.e. an arb/edge signal. For plain quotes, fundamentals, filings, or macro, the free siblings (SEC EDGAR, FRED, Finnhub) win on cost (C2). Do not reach for it as a general price feed.

## Install
Official MCP, token-gated. Use the HTTP transport (Windows-friendly). Get the API token first (see Auth), then add via direct `~/.claude.json` edit (secret-bearing, do NOT `claude mcp add`, which echoes the key). Confirm the current endpoint + exact `add` line in `reference/volatile/pricing-install.md` → finance-markets before installing; restart / `/mcp` reconnect after adding. L0 transport + verify mechanics: `reference/install-guide.md`.

## Auth / keys
API token is purchased separately from the web subscription at unusualwhales.com/pricing?product=api. Secret hygiene (one line): never `browser_snapshot` the token page (renders the key in plaintext DOM), have the user copy it and pipe via clipboard, verify by length only; see `reference/install-guide.md` "Secret-handling hygiene".

## Usage, call examples
MCP exposes the 100+ REST endpoints as tools, grouped: options flow (flow alerts, ticker flow, Greeks/vol), dark pool (recent + per-ticker off-exchange trades), congress (politician trades, late filings), GEX (spot exposure by strike/expiry). Minimal example: "pull today's flow alerts for NVDA" → call the options-flow-by-ticker tool with `ticker=NVDA`; "congressional trades this week" → call the congress-trades tool. (Read-only data; no trade execution.)

## General experience & gotchas (踩坑)
- **The web sub and the API are separately priced**, a user with a UW dashboard login still needs to buy the API add-on; don't assume their browser session grants token access.
- **Pricing is JS-rendered**, WebFetch returns no tier numbers; you must point the user at the pricing page rather than assert a figure. Any specific dollar amount is unverified, confirm at https://unusualwhales.com/pricing?product=api before quoting it.
- **Signal ≠ thesis.** Flow/dark-pool prints are noisy; a single large block is not directional proof. Treat as a *lead* to corroborate against filings/fundamentals, never as standalone evidence in a report.
- This is the **expensive, last-resort** finance source, exhaust the free ① tier (EDGAR + FRED + Finnhub free) before recommending the spend.

## Failure signals & fallback
Failure signals: `✗ Failed` / `! Needs authentication` in `claude mcp list` (token wrong/expired or never purchased); 401/403 from the API. Fallback: **Finnhub** (`cfdude/mcp-finnhub`, free 60/min) covers congress trades + news/social sentiment for free, use it for the congress slice; there is no free equivalent for true options-flow/dark-pool, so if UW is unavailable, flag the gap in the report (no silent degradation).

## Last verified: 2026-06
