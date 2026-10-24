# Apify, mechanical install / auth / usage

> **auto.md**, mechanical, refreshable. Pair file to [`apify.md`](apify.md) (judgment).
> Per `companion-config-spec.md §11`, this file holds the parts that upstream MCP-
> registry metadata can eventually supply automatically (install command, env vars,
> token endpoints, basic usage shape). When the official registry exposes these,
> `auto.md` becomes generated; `core.md` remains hand-authored matrix value.

## Cost / pricing snapshot

- Free $5/mo platform credit (no card)
- Paid plans bundle monthly store/Actor credit, exact Starter/Scale tier prices unverified here, confirm at https://apify.com/pricing
- Base billing is **compute-unit (CU)** based
- Many actors layer **pay-per-result** charges (~$0.1 to 0.25/1k for tweet actors per pricing-install.md)
- Snapshot date: 2026-06, re-verify against the live pricing page before quoting a number

## Install

Hosted HTTP MCP at `https://mcp.apify.com`, Windows-friendly.

**Critical**: pin the **specific actor(s)** you need rather than exposing the whole catalog, or the MCP floods the tool list (shard rule).

Exact command + actor-pinning note: `reference/volatile/pricing-install.md → web-scraping` (and `#x-twitter` for tweet actors).

L0 mechanics (prefer HTTP transport on Windows, secret hygiene): `reference/install-guide.md`.

Restart / `/mcp` reconnect after adding.

## Auth / keys

- Token: Apify API token from the console
- Plan: free tier $5/mo platform credit, no card required
- **Secret hygiene**: for keyed HTTP MCPs, edit `~/.claude.json` from clipboard rather than `claude mcp add` (which echoes the token), and never `browser_snapshot` the token page. Full rules: `reference/install-guide.md` "Secret-handling hygiene".

## Usage, call shape

MCP exposes three primary capabilities:

1. **Store search**, find an actor by keyword
2. **Actor schema**, inspect input parameters for a specific actor
3. **Actor run**, execute the actor with input JSON, then fetch dataset results

Minimal flow: find the actor (e.g. an Amazon-product or tweet-scraper actor) → inspect its input schema → run it with the input JSON → fetch dataset results.

**Recommended pattern**: pin a known actor ID and call it directly over open-ended store search (faster, fewer tools, predictable cost).

An actor run is **async** (start run → poll status → read dataset), not an instant return; budget for the poll latency.

## Last verified: 2026-06
