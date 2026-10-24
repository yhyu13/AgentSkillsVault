# Tool: Trends MCP (trendsmcp.ai)

- **Domain(s):** trends-discovery (also: none)
- **Barrier route:** ② resale (provider absorbs the multi-platform scraping/upkeep) · **Source tier:** L2 · **Ready MCP:** hosted MCP offered; selected-host setup and operation remain unverified here
- **Cost:** free 100 req/mo (no card); paid Starter $19/mo (1k req), Pro $49/mo (5k req), Business $199/mo (25k req); annual −20% [https://trendsmcp.ai, fetched 2026-06]
- **Repo / Provider:** https://trendsmcp.ai (commercial hosted service, no public repo)
- **Top pick for its domain:** yes, the best "acceleration / growth-rate" signal across platforms

## What it does / when to pick it
Normalizes trend data across 25+ sources (Google Search/Images/News/Shopping, Amazon, Wikipedia, TikTok, Reddit, YouTube, npm/Steam/GitHub, mobile-app installs, site visits) and, crucially, returns a **growth rate**, not just a level. **Decision rule:** pick Trends MCP when the question is "is this *accelerating*?" or you need one normalized cross-platform view (esp. selling research: TikTok leads Amazon 2 to 4 weeks = the opportunity window). For clean single-source Google Trends JSON, **SerpApi** is the cross-region workhorse; for a fully free route use **trendspy/trendspyg** OSS (route ④, pytrends is archived). Use GDELT for news tone, Product Hunt for launches.

## Install
Select the setup supported by the current provider and the chosen host. Dated instructions describe hosted HTTP with bearer authentication; the June observation below used a claude.ai-managed connector. **Both setup choices remain unverified for the current host/session here.** Confirm the endpoint and authentication method, reconnect as required and discover the tools. Keep the selected route in `setup` until the intended read operation succeeds and its required content is verified. Use the host's supported PRIVATE settings and the no-echo procedure in `reference/install-guide.md` for any secret-bearing configuration. The volatile reference is `reference/volatile/pricing-install.md → trends-discovery`; dated configuration or a saved Connected label does not establish current readiness.

## Auth / keys
Confirm the current authorization or key-delivery procedure in the provider's account flow; do not assume the key is displayed in a dashboard or delivered by email. Capture any required secret through the selected host's supported no-echo settings, without exposing it in snapshots or transcripts. REST/MCP credential reuse and quota equivalence also need current confirmation. Full secret-handling procedure: `reference/install-guide.md`.

## Usage, call examples
After current-host connection and operation verification, tools let you query a keyword/topic across the source set and return level + growth rate + (where available) sentiment/volume. If using REST, verify its authentication and selected operation separately. Minimal flow: query a candidate term → read the growth-rate field across TikTok vs Amazon to spot a lead/lag opportunity window. List exact tool names with your client after connecting, do not assume signatures from memory.

## General experience & gotchas (踩坑)
- **The growth-rate field is the whole point**, don't just read the absolute level. A high level with flat/negative growth is a *mature/declining* topic, not an opportunity.
- **Free tier is only 100 req/mo**, each cross-platform query can burn a request; budget it. Both free and paid plans **hard-pause at the cap and return HTTP 429** (no surprise overage, but also no silent degradation, a 429 means you're capped, not that the topic is dead).
- **Resale (②) means you're trusting the provider's normalization**, the cross-platform "normalized" number hides each source's own quirks (e.g. Google Trends is relative 0 to 100, not absolute volume). Treat it as a comparative signal, not an absolute install/sales count.
- **Selling-research play (shard):** TikTok virality typically leads Amazon demand by 2 to 4 weeks, a term accelerating on TikTok but flat on Amazon is the classic arbitrage window. Confirm with app-store/Amazon data before acting.
- For absolute search *volume* (not relative trend) you still need Google Ads Keyword Planner / DataForSEO, Trends MCP gives direction, not magnitude.
- **Historical signup observation (2026-06-16):** email-magic-link signup delivered an API key and MCP configuration snippet by email. That observation does not establish the current delivery procedure or dashboard behavior.
- **Historical Claude-managed connection (2026-06):** the claude.ai connector used `https://www.trendsmcp.ai/mcp` and appeared as `claude.ai TrendsMCP` in `claude mcp list`. This describes that host's observed management mode, not an exclusive setup requirement. It does not rule out supported user-managed configuration or companion inventory for other host/transport choices; keep alternatives in `setup` until current-host operation/content verification succeeds.

## Failure signals & fallback
Failure looks like: HTTP 429 (monthly cap hit), or a normalized number with no growth field on an unsupported source. **Fallbacks:** for clean Google Trends JSON cross-region use **SerpApi** (free 250/mo); for a fully free route use OSS **flack0x/trendspyg** or **sdil87/trendspy** (route ④, see browser-automation shard); pytrends is archived/429-prone, avoid.

## Last verified: 2026-06
