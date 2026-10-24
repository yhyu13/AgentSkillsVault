# Tool: jaipandya/producthunt-mcp-server (Product Hunt MCP)

> ⚠ The old repo `jaipandya/product-hunt-mcp` (formerly on github.com) is **DEAD (404, gh-api 2026-06)**.
> The correct, active repo is `github.com/jaipandya/producthunt-mcp-server`. The pip package name is
> still `product-hunt-mcp`. Use the corrected repo path below.

- **Domain(s):** trends-discovery (also: none)
- **Barrier route:** ① official (Product Hunt v2 GraphQL API) · **Source tier:** L2 · **Ready MCP:** yes, `pip install product-hunt-mcp`
- **Cost:** free, Product Hunt's v2 API is free; you supply a PH developer token [https://www.producthunt.com/v2/oauth/applications, fetched 2026-06]
- **Repo / Provider:** github.com/jaipandya/producthunt-mcp-server, `jaipandya/producthunt-mcp-server (46★, gh-api 2026-06)` (not archived; **last push 2025-04-19, ~14 months stale**; **no LICENSE declared**)
- **Top pick for its domain:** yes, the most mature Product Hunt MCP implementation

## What it does / when to pick it
Wraps the Product Hunt v2 GraphQL API as MCP tools: fetch posts (daily/weekly launches), topics, collections, votes, comments, makers, and user data. **Decision rule:** pick this when the question is "what's launching / trending on Product Hunt" or "track this product's launch traction." For *is this idea already saturated* across GitHub/HN/npm/PyPI/PH prefer **idea-reality-MCP**; for *news* sentiment use **GDELT MCP**; for cross-platform *acceleration* use **Trends MCP**. PH skews early-stage SaaS / dev-tools / AI, great for that niche, weak for physical consumer goods.

## Install
`pip install product-hunt-mcp` then register the stdio server with your PH token (see the volatile L1 line `reference/volatile/pricing-install.md → trends-discovery`). It is a **secret-bearing** server (PH token), do **not** use `claude mcp add` (it echoes the token into the transcript); edit `~/.claude.json` `mcpServers` directly from clipboard. Python ≥3.10. On Windows, stdio `pip`/`uvx` MCPs are flaky (path/shell), use absolute paths and test in a plain shell first. Restart / `/mcp` reconnect before use. L0 mechanics + secret hygiene: `reference/install-guide.md`.

## Auth / keys
Create a developer application at producthunt.com → API → OAuth applications. **Onboarding gotcha:** the env var wants the **Developer Token** (shown directly on the application page), NOT the "API Key" or "API Secret" pair listed above it. The OAuth credentials are for full OAuth flows; for stdio MCP use you only need the simple Developer Token. The token is also **locked to one PH account**, switching accounts means a new token. One-line secret reminder: never `browser_snapshot` the token page (it renders the key in plaintext DOM); copy via the page button → clipboard → write to `~/.claude.json` with a no-echo script, verify by length only. Full procedure: `reference/install-guide.md`.

## Usage, call examples
After connecting, MCP tools expose: get today's/this-week's posts, get a post by id/slug (with votes + comments), search topics, get a topic's posts, get collections, and get user/maker data. Minimal flow: `get_posts` (featured, day) → for a hit, `get_post_details` to pull vote count + comment sentiment. List the exact tool names with your client after connecting, do not assume signatures from memory.

## General experience & gotchas (踩坑)
- **Old repo path is 404; pip name diverges from repo name.** The slug's historical `jaipandya/product-hunt-mcp` URL is dead, link `producthunt-mcp-server`, but `pip install product-hunt-mcp` (the package name kept the old hyphenation).
- **Repo is ~14 months stale (last push 2025-04-19).** It still works because the PH v2 API is stable, but if PH changes its GraphQL schema this wrapper can silently break (empty/error responses). Verify a live call returns data before trusting it in a run; if it's dead, drop to the raw GraphQL API.
- **PH API is rate-limited** (token-bucket / complexity-cost per GraphQL query), large back-fills hit the cap; the MCP surfaces this as an error or partial page. Paginate and back off, don't hammer.
- **Vote counts ≠ real demand.** PH launches game upvotes (hunter networks, launch-day pushes). Treat the upvote number as a launch-day attention proxy, not market validation, cross-check with idea-reality-MCP or actual search-trend data.
- **Topic/category coverage is dev/SaaS/AI-heavy.** For physical consumer products PH is thin; use app-store-scraper / google-play-scraper or Trends MCP instead.
- **No LICENSE on the repo**, fine for self-use; clear licensing before redistributing.

## Failure signals & fallback
Failure looks like: connection OK but every query returns empty/`null` (token invalid, or PH schema drift breaking the stale wrapper), or rate-limit errors on back-fill. **Fallbacks:** call the **Product Hunt v2 GraphQL API directly** (`https://api.producthunt.com/v2/api/graphql`) with your token; for the broader "is this idea saturated" question use **idea-reality-MCP**; for trend acceleration use **Trends MCP**.

## Last verified: 2026-06
