# Tool: Sensor Tower MCP

- **Domain(s):** trends-discovery (also: none)
- **Barrier route:** ② resale/official API · **Source tier:** L2 · **Ready MCP:** yes, needs a Sensor Tower (ST) token
- **Cost:** paid, price unverified 2026-06, pricing is **gated (contact-sales, no public free tier)**; confirm at https://sensortower.com/pricing ("We customize pricing plans for each customer, get in touch"). Historically an enterprise-grade subscription; budget accordingly.
- **Repo / Provider:** https://sensortower.com (official provider; non-GitHub)
- **Top pick for its domain:** no

## What it does / when to pick it
Sensor Tower is the market-leading source for **mobile app download & revenue ESTIMATES** (plus advertising/usage intelligence) across App Store and Google Play. **Pick it only when the question genuinely needs estimated installs/revenue or competitive download trends**, e.g. "how much is competitor X's app earning", "is this category's downloads growing". For everything you can get from public store metadata (rankings, reviews, ratings, descriptions), do NOT pay, use the free ③ route first. This is the paid escape hatch for the one thing the free tools cannot estimate.

## Install
Confirm the hosted endpoint in the provider dashboard. Configure the Authorization
header through the selected host's supported secret settings using a user-side or
approved no-echo transfer. Never pass the token in an MCP-add command, URL or tool
result. Reconnect the host if required, then verify the selected operation.
See `reference/install-guide.md` for the transfer procedure.

## Auth / keys
Token comes from your paid Sensor Tower account/dashboard. **Secret hygiene (key-bearing):** never `browser_snapshot` the page that shows the token; have the user copy it and edit `~/.claude.json` headers from clipboard rather than `claude mcp add` (which echoes the key into the transcript). One line + see `reference/install-guide.md` (Secret-handling hygiene).

## Usage, call examples
After connecting, ST exposes tools for app metadata, category rankings, and download/revenue estimates. Typical flow: resolve the app id → query estimated downloads/revenue over a date range for a country. (Exact tool names/params come from the connected ST MCP, list them after connecting; treat estimate fields as modeled, not ground truth.)

## General experience & gotchas (踩坑)
- **It is an ESTIMATE engine, not ground truth.** Downloads/revenue are modeled; cross-check magnitude against store rankings before quoting a hard number.
- **Cost is the gate.** No public free tier, every use burns a pricey subscription. The shard explicitly tags it "needs pricey ST sub"; reach for it ONLY when free routes can't answer (CONSTITUTION C2: prefer free ④/③).
- **For raw store metadata it is overkill**, rankings/reviews/ratings are free via `mobile-store-scraper-mcp` or the npm scrapers. Paying ST for those is a cost trap.
- **Pricing rot:** because pricing is sales-gated, never assert a dollar figure from memory, point the user at the pricing page.

## Failure signals & fallback
Failure = `! Needs authentication` / `✗ Failed` in `claude mcp list` (bad/expired token), or 401/403 at call time. **Fall back to** the free metadata route: `mobile-store-scraper-mcp.md` (both stores, no key) or `facundoolano/google-play-scraper` + `app-store-scraper` for rankings/reviews/ratings, accepting you lose the download/revenue ESTIMATES, which no free tool reproduces. For trend/launch discovery generally, the domain defaults are GDELT MCP + Product Hunt MCP + Trends MCP.

## Last verified: 2026-06
