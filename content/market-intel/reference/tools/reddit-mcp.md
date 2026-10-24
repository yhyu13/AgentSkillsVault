# Tool: GridfireAI/reddit-mcp  `D-SUPERSEDED`

> ⚠ **D-SUPERSEDED (2026-06).** Demoted from Reddit default, superseded by
> **karanb192/reddit-mcp-buddy**, conditional on verified app-id/login access or demonstrated
> anonymous recovery. For research without Reddit credentials, use [reddit-research-mcp](reddit-research-mcp.md)
> after hosted OAuth and current-session operation verification. Kept here only as a minimal
> read-only fallback; do **not** present this as the live top pick.

- **Domain(s):** reddit-community (also: none)
- **Barrier route:** ① official (free Reddit API) · **Source tier:** L2 · **Ready MCP:** yes, `uvx reddit-mcp` (stdio); needs a free Reddit app client id/secret
- **Cost:** free, uses Reddit's official OAuth API at no charge (rate-limited) [https://www.reddit.com/prefs/apps, fetched 2026-06]
- **Repo / Provider:** github.com/GridfireAI/reddit-mcp, `GridfireAI/reddit-mcp (18★, gh-api 2026-06)`; not archived, MIT, pushed 2025-03 (~15mo stale but functional; thin wrapper over PRAW so it tracks the stable Reddit API)
- **Top pick for its domain:** no, **D-SUPERSEDED** by reddit-mcp-buddy; minimal read-only fallback only

## What it does / when to pick it
Read-only access to Reddit via the official API: fetch submissions, search, and browse a subreddit's posts. **Decision rule:** this is **no longer the Reddit default**. For subreddit pain-point mining and product-feedback research, use **reddit-mcp-buddy** only with verified app-id/login access or demonstrated anonymous recovery; its anonymous tier has a recorded 403 outage (2026-07-22), not a current recovery proof. For research without Reddit credentials, use **reddit-research-mcp** after hosted OAuth and current-session operation/content verification. Reach for GridfireAI/reddit-mcp **only** as a minimal read-only fallback if buddy is unavailable, after verifying its own access and selected read operation. It's the older **Reddit half** of the reddit-community pair (mcp-hn is the HN half). Choose **praw** instead when you need custom read flows the MCP doesn't expose (comment-tree walking, multi-sub aggregation, pagination control). Prefer any official-API route over an unauthorized Reddit scraper, the shard says PRAW/official is still free enough that browser-scraping Reddit is unnecessary.

## Install
`uvx reddit-mcp` (stdio). Create a free app at reddit.com/prefs/apps (type "script") to get `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET`. Exact L1 command: `reference/volatile/pricing-install.md → reddit-community`. On Windows, stdio `uvx` is flaky, test in a plain shell first; see `reference/install-guide.md` for Windows + stdio mechanics. A newly added MCP needs a session restart / `/mcp` reconnect.

## Auth / keys
Get a free client id/secret from reddit.com/prefs/apps (create a "script" app). These are **secrets**, supply via `-e REDDIT_CLIENT_ID=$VAR -e REDDIT_CLIENT_SECRET=$VAR` that the **user** runs, never paste the values into the transcript; for the secret-bearing case edit `~/.claude.json` from clipboard rather than `claude mcp add` (which echoes them). One-line reminder; full secret hygiene in `reference/install-guide.md`.

## Usage, call examples
Via MCP: tools for fetching a subreddit's hot/new/top submissions, searching posts by keyword, and pulling a submission's details. Minimal: "get top posts in r/<niche> this month matching <keyword>", then read the post bodies for recurring complaints. List exact tool names with your client after connecting, don't assume signatures from memory.

## General experience & gotchas (踩坑)
- **Read-only, no comment-tree depth.** The shard's residual gap on the patio-heaters run was exactly this: the Reddit **comment tree** (where the buying objections live) is hard to get from this MCP. If you need full nested comments, drop to **praw** and walk `submission.comments`.
- **Reddit API rate limits bite** (~60 req/min on the free OAuth tier). A burst of subreddit+search calls in a loop returns 429s mid-run; pace requests and cache results.
- **Reddit API is tightening** (shard "Watch": GummySearch shuts down 2026-11). Official-API access remains the safe route, prefer it over scrapers, but expect quota/policy drift; re-verify before relying on it at scale.
- **Subreddit search is keyword, not semantic**, and Reddit's own search is weak, run query variants and also browse top/hot directly rather than trusting one search.
- Free official API, so per CONSTITUTION C2 use it before any paid Reddit-monitoring SaaS (Syften/Apify).

## Failure signals & fallback
Failure looks like: 429 rate-limit errors under load, empty search on a live topic (Reddit search weakness, browse top/hot instead), or a need for nested comments the MCP can't return. **Fallbacks:** for comment trees and custom read logic drop to **praw** (same free API, full control); for cross-platform keyword monitoring use **Apify** Reddit/brand-monitor actors (② paid) or free F5Bot; for HN-flavored community signal use **mcp-hn**.

## Last verified: 2026-06
