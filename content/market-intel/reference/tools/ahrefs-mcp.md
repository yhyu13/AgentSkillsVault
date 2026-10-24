# Tool: Ahrefs official MCP

- **Domain(s):** seo-keywords (also: none)
- **Barrier route:** ① official API · **Source tier:** L1 · **Ready MCP:** yes, official hosted HTTP `https://api.ahrefs.com/mcp/mcp`
- **Cost:** consumes your paid Ahrefs subscription (needs **Lite+ plan**); price unverified by fetch 2026-06 (pricing page JS-gated/blocked), confirm at https://ahrefs.com/pricing
- **Repo / Provider:** https://ahrefs.com (official provider; the MCP is hosted, no public repo)
- **Top pick for its domain:** no (specialist: best-in-class backlinks, but the most expensive option)

## What it does / when to pick it
Exposes Ahrefs' dataset (≈95 tools) over MCP, backlink profiles, referring domains, organic keywords, Site Explorer, keyword difficulty, content gap. **Decision rule:** reach for Ahrefs **only when backlink depth/quality is the deliverable**, Ahrefs' link index is the strongest in the category and the reason to pay. For keyword volume + competitor + audit at lower cost, **Semrush** or **SE Ranking** are better value; for cheap bulk SERP/keywords, **DataForSEO**; for your own site's real traffic, free **GSC**. Do not pick Ahrefs as a general default, it's the premium backlink specialist.

## Install
Hosted HTTP MCP, **Windows-friendly** (no local Node/uv process). Endpoint `https://api.ahrefs.com/mcp/mcp` with your API key as a header. Exact `claude mcp add --transport http` form: `reference/volatile/pricing-install.md → seo-keywords`. L0 transport/secret/Windows mechanics: `reference/install-guide.md`. Restart / `/mcp` reconnect after adding.

## Auth / keys
Requires an active **Ahrefs subscription (Lite or higher)** and an API key/token from your Ahrefs account (API access is gated to paid plans, there is **no free tier**). **Secret hygiene (one line):** never `browser_snapshot` the key page (renders plaintext); have the user copy the key and write it into `~/.claude.json` headers from clipboard, not via `claude mcp add` (which echoes the header). See `reference/install-guide.md`.

## Usage, call examples
HTTP MCP surfaces tools mirroring Ahrefs API endpoints: Site Explorer (backlinks, referring domains, organic keywords for a target), Keywords Explorer (volume, KD, SERP overview), and content/rank tools. Minimal: a backlinks tool taking a `target` domain → returns referring domains with DR, anchor text, first-seen. **Shard note: the MCP is "interactive-only"**, built for an agent in a live session, not for unattended batch pulls; budget API units accordingly.

## General experience & gotchas (踩坑)
- **MCP interactive-only** (shard), expect per-call unit consumption against your plan; it is not a cheap bulk-export pipe. Watch your row/unit allowance.
- **"Most pro SEO MCPs don't charge for the MCP, they consume your underlying subscription quota"** (shard): the real cost is the Ahrefs plan tier, not the connector. A lapsed/insufficient plan = the MCP connects but tools 402/deny.
- **95 tools = tool-flood risk** in the agent's tool list; if it crowds context, prefer pulling only the backlink tools you need (or fall to a narrower source).
- Beware **"free Ahrefs" scraper MCPs**, the shard explicitly flags these as shaky (CAPTCHA-solver-dependent, avoid for prod). Only the official MCP is reliable.
- Strong on backlinks; for raw keyword *volume* Semrush/Google-Ads-Planner data is often the cheaper read.

## Failure signals & fallback
Failure looks like: tools returning 401/403 (bad key) or 402 / "insufficient units" (plan too low or quota spent), or `! Needs authentication` in `claude mcp list`. **Fallbacks:** keyword + competitor + audit at lower cost → **Semrush** or **SE Ranking** (①); cheap bulk SERP/backlinks → **DataForSEO** (②, ~$0.0006/query); free your-site data → **GSC** (①); free self-host SERP → **SearXNG** (④). No official MCP exists for Moz/Majestic (shard), don't substitute a scraper for backlinks in prod.

## Last verified: 2026-06
