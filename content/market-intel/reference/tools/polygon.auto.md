# Polygon (Massive), mechanical install / auth / usage / pricing snapshot

> **auto.md**, mechanical, refreshable. Pair file to [`polygon.md`](polygon.md) (judgment).
> Per `companion-config-spec.md §11`, this file holds the parts that upstream MCP-
> registry metadata can eventually supply automatically. When the official registry
> exposes these for Polygon's MCP, this file becomes generated; `polygon.md` remains
> hand-authored matrix value.

## Cost / tier snapshot

- **Free Basic**: 5 req/min, 15-minute delayed quotes, no card required
- **Paid tiers**: ~$29 / $79 / $199 per month (unlimited calls; realtime at the top tier)
- Snapshot date: 2026-06, corroborated via web search; the live pricing page is JS-rendered and unfetchable, so confirm in-browser at https://massive.com/pricing before quoting

## Install

The official Polygon (Massive) MCP is hosted and key-bearing. Two paths in 2026-06:

1. **Direct REST** (recommended given the PyPI MCP-wrapper instability, see core.md gotchas):
   resolve the credential file to a supported absolute path in an initialized PRIVATE versioned companion, validate that destination with the full Market checkout's `tools/private_inventory.py`, then call REST through the approved client without echoing the key. Revalidate before any credential or result write; no public-source-relative fallback is allowed. Keep setup pending if the selected client cannot use the verified private configuration.
2. **Official MCP** (when stable): follow `reference/volatile/pricing-install.md → finance-markets`
   for the exact, time-stamped install command.

L0 mechanics (prefer HTTP transport on Windows, secret hygiene): `reference/install-guide.md`.

Restart / `/mcp` reconnect after adding any MCP form.

## Auth / keys

- Token: API key from the Polygon (Massive) dashboard, same key works post-rebrand
- Plan: free Basic tier needs no card
- **Secret hygiene (key-bearing)**: have the USER supply the key via env / `-e` form themselves; never echo it into the transcript; for a header/URL-bearing MCP, edit `~/.claude.json` directly rather than `claude mcp add` (which echoes args); never `browser_snapshot` the dashboard key page. Full rules: `reference/install-guide.md` "Secret-handling hygiene".

## Usage, call shape

REST endpoints cover:
- **Aggregates** (OHLC bars by ticker × date range)
- **Trades / quotes** (tick-level)
- **Reference data** (tickers, splits, dividends)
- **WebSocket** streaming feed (realtime on the paid realtime tier only)

Minimal patterns:
- Daily bars: fetch aggregate OHLC bars for a ticker over a date range
- Realtime: open a WebSocket subscription for live trades on a symbol (paid realtime tier only)

Free-tier batch hint: 5 req/min means a tight loop trips 429 immediately. Insert ≥12s sleep between calls or pre-batch ticker lists into single endpoints where supported.

## Last verified: 2026-06
