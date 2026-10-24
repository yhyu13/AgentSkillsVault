# Tool: Exploding Topics

- **Domain(s):** trends-discovery (also: none)
- **Barrier route:** ② resale (curated SaaS) · **Source tier:** L2 · **Ready MCP:** **no**, no MCP; web dashboard + API (API on higher tier only)
- **Cost:** paid SaaS, Pro tiers Entrepreneur $39/mo, Investor $99/mo, Business $249/mo; 7-day free trial [https://explodingtopics.com/pricing, fetched 2026-06]. **API access tier price unverified 2026-06, the /api page 404'd; confirm the required tier (shard says "Business tier") at https://explodingtopics.com/pricing before quoting an API number**
- **Repo / Provider:** https://explodingtopics.com (commercial SaaS, no public repo)
- **Top pick for its domain:** no, curated early-signal supplement, not the default

## What it does / when to pick it
Human-curated list of emerging topics with a growth-trajectory chart and a forecast, hand-picked before they're obvious. **Decision rule:** reach for Exploding Topics only when you specifically want *curated, editorialized* early signals (their value is the human curation + forecast), and the budget exists. For programmatic cross-platform trend/growth data prefer **Trends MCP** (has an MCP, free 100/mo); for free news tone use **GDELT**. Because there is **no MCP** and the API sits behind a paid tier, this is a manual/supplementary source, not an agent-loop default.

## Install
**No MCP exists.** Two access paths: (1) the web dashboard (browser, drive with playwright MCP if you must read it programmatically); (2) the REST API, which requires the higher subscription tier. There is nothing to `claude mcp add`. See the volatile L1 line `reference/volatile/pricing-install.md → trends-discovery` ("Exploding Topics … Business tier, no MCP"). L0 mechanics: `reference/install-guide.md`.

## Auth / keys
A paid subscription (7-day trial available). API access is gated to a higher tier, get the API key from the account dashboard once subscribed. If you do hold an API key, the standard secret reminder applies (never `browser_snapshot` the key page; copy via clipboard, write keys to config with a no-echo script, verify by length only, `reference/install-guide.md`).

## Usage, call examples
Primary use is reading the curated trend pages (topic + growth chart + forecast + related meta) in the browser. Programmatic use requires the paid REST API on the qualifying tier, confirm the exact endpoint/auth in their API docs once subscribed (the public /api page was 404 at 2026-06, so do not hardcode an endpoint from memory).

## General experience & gotchas (踩坑)
- **No MCP + paid-tier API = high friction.** For an agent run this is the least convenient trends source; only justify it when the *curation/forecast* is the specific deliverable. Per CONSTITUTION C2, prefer the free/cheaper siblings (GDELT free, Trends MCP free 100/mo) first.
- **Curated ≠ comprehensive**, it's a hand-picked highlight reel, so a topic absent from Exploding Topics is **not** evidence the trend doesn't exist. Don't treat absence as a negative signal.
- **Forecast is the product's opinion, not data**, treat the projected curve as editorial, and validate any "exploding" claim against raw data (Trends MCP growth rate, Google Trends via SerpApi, app-store installs).
- **API tier/price is the live unknown (2026-06):** their /api page 404'd during verification, so the exact tier that unlocks the API and its price must be re-confirmed at the pricing page before you commit budget.
- Trial is only 7 days, fine for a one-off pull, not for ongoing monitoring without a paid plan.

## Failure signals & fallback
Failure looks like: no API on your tier (must upgrade), or the topic you need simply isn't in their curated set. **Fallbacks:** **Trends MCP** (trendsmcp.ai, free 100/mo, has growth rate + MCP) is the direct programmatic replacement; **GDELT** for free news-tone trend; **SerpApi / trendspy** for raw Google Trends.

## Last verified: 2026-06
