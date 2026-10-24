# Tool: Tavily (search MCP)

- **Domain(s):** web-scraping (also: none)
- **Barrier route:** ② resale API · **Source tier:** L2 · **Ready MCP:** yes, hosted HTTP `https://mcp.tavily.com/mcp`
- **Cost:** free 1,000 API credits/mo (no card), then paid PAYG/Project tiers, per-credit price and plan quotas unverified here, confirm at https://www.tavily.com/pricing [fetched 2026-06]
- **Repo / Provider:** https://tavily.com (hosted SaaS, no public source repo)
- **Top pick for its domain:** yes (the default SEARCH-layer pick)

## What it does / when to pick it
Agent-optimized semantic web search that returns ranked results with snippets (and optional raw page content), with date and domain include/exclude filters. **Decision rule:** this is the default search layer when you need to *find* pages (SERP-grade discovery), not scrape them. Pick Tavily over Exa when you want broad agent-ranked relevance (shard: "Tavily AgentRank #1"); pick **Exa** instead when the query is "recent / latest" (Exa's neural index skews fresher) or you want similar-page discovery. Tavily does NOT render JS or break anti-bot, once you have the URL, hand off to Firecrawl (②) or Bright Data (②) to actually scrape it.

## Install
Hosted HTTP MCP, Windows-friendly (no local Node process). Exact command in the volatile L1 line `reference/volatile/pricing-install.md → web-scraping` (it changes when the URL/param format shifts; do not hardcode from memory). The key rides in the URL as `?tavilyApiKey=...`. L0 transport/secret/Windows mechanics: `reference/install-guide.md`. A newly added MCP only works after session restart / `/mcp` reconnect.

## Auth / keys
Obtain a key through the Tavily dashboard and verify current plan terms; the free-tier figures above are historical notes. Keep the value in the selected host's approved private secret configuration and backup. Do not put a secret-bearing URL or header into a command that echoes it.

Verify through a supported value-free diagnostic for the selected server. Its output may contain only allowlisted name, connection status and authentication state, following the [installation guide](../install-guide.md). Do not return raw listings or configuration and try to mask particular token names afterward. If no supported diagnostic is available, report connection/authentication as unverified. A successful configuration check still requires execution of the selected operation and usable content before readiness is claimed.

## Usage, call examples
MCP exposes a Tavily search tool (`tavily-search` / `tavily-extract`). Minimal call: a search tool taking `query`, plus optional `search_depth` (basic|advanced), `max_results`, `include_domains` / `exclude_domains`, and `time_range` / `days` for recency. List the exact tool names with your client after connecting; `advanced` depth costs more credits than `basic`.

## General experience & gotchas (踩坑)
- **Search layer only**, Tavily finds URLs and returns snippets; it does not run JS, beat Cloudflare/DataDome, or read login-walled prices. The shard's real-run lesson applies: for live e-commerce prices it returns nothing useful, route straight to playwright(④)/Bright Data.
- `advanced` search_depth roughly doubles credit cost vs `basic`, default to `basic` and only escalate when results are thin.
- **Reddit returns empty / thin** to general web search (shard, 2026-06), don't rely on Tavily for Reddit comment data; use a Reddit-API tool.
- Volatile pricing: providers in this domain change tiers fast (shard: "Brave dropped free tier, Exa raised prices"), re-verify the 1,000/mo free quota before quoting it to a user.
- Credits burn on result count + depth; a wide fan-out of `advanced` queries can silently exhaust the free 1,000/mo mid-research.

## Failure signals & fallback
Failure looks like: empty/low-relevance results, a recency query returning stale pages, or 401/quota-exhausted at call time. **Fallbacks:** for "recent/latest" or similar-page discovery → **Exa** (sibling search layer); for free no-key search → `deedy5/ddgs` or self-host **SearXNG** (④); to actually *fetch* a found URL → **Firecrawl** (②), then **Bright Data** (②) for hard/anti-bot targets.

## Last verified: 2026-06
