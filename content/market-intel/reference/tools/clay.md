# Tool: Clay (+ MCP)

- **Domain(s):** leadgen-crm (also: none)
- **Barrier route:** ② · **Source tier:** L2 · **Ready MCP:** yes (API key)
- **Cost:** paid (waterfall consumes provider credits per enrichment); price unverified 2026-06, confirm at https://www.clay.com/pricing
- **Repo / Provider:** https://www.clay.com
- **Top pick for its domain:** no

## What it does / when to pick it
Clay is a **waterfall enrichment** engine: it chains 150+ data providers so that if provider A has no
email it falls through to B, C, … until a hit, then dedupes. **Decision rule:** pick Clay ONLY if the
team is already on Clay (its value is the orchestrated multi-provider waterfall + table workflow, not a
single lookup). For a from-scratch find+enrich, Apollo is the default; for pure email, Hunter; for
cheapest raw volume, People Data Labs. Clay is a route-② resale layer, you pay Clay to absorb the
many-provider plumbing.

## Install
Clay exposes an MCP via API key. Add as a key-bearing source: have the **user** run the
`-e CLAY_API_KEY=...` / header form themselves, or edit `~/.claude.json` directly from clipboard, do
NOT use `claude mcp add` with the key inline (it echoes the secret). Prefer HTTP transport on Windows.
Exact current command: `reference/volatile/pricing-install.md#leadgen-crm`; L0 mechanics + transport
choice: `reference/install-guide.md`. Takes effect after `/mcp` reconnect.

## Auth / keys
API key from the Clay dashboard. **Secret hygiene:** never `browser_snapshot` the key page; copy the key
via the dashboard's copy button → clipboard, write it into `~/.claude.json` with a no-echo edit, verify
by length only (see `reference/install-guide.md` "Secret-handling hygiene").

## Usage, call examples
Drive a Clay table programmatically: feed a list of companies/people, trigger the enrichment waterfall,
read back enriched rows (email, title, LinkedIn, firmographics). Minimal: push 50 domains → run the
"find work email" waterfall → pull the resolved emails + which provider supplied each.

## General experience & gotchas (踩坑)
- **Cost trap:** every step in the waterfall can bill a provider credit even on a miss-then-hit chain,
  a single "enriched row" may have cost 2 to 3 provider lookups. Watch credit burn on large tables.
- Clay's strength (150+ providers) is wasted if you only need one source, you're paying for
  orchestration you don't use. The shard is explicit: "best for existing Clay teams."
- Waterfall results vary run-to-run as upstream providers change coverage; treat the email as a
  candidate, **re-verify before sending** (Hunter/ZeroBounce).
- PII workflows need GDPR/CCPA delete-request handling (shard compliance red line).

## Failure signals & fallback
Key invalid / "Needs authentication" in `claude mcp list`, or a table run returns all-empty enrichments
(upstream provider quota exhausted). Fall back to **Apollo.io** (single-source find+enrich, cheaper to
start) or **People Data Labs** ($0.01/record, cheapest at volume) if you just need raw matches without
the waterfall.

## Last verified: 2026-06
