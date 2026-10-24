# Tool: EnesCinr/twitter-mcp (X single)

- **Domain(s):** social-publishing (also: x-twitter)
- **Barrier route:** ① · **Source tier:** L2 · **Ready MCP:** yes, `npx -y @enescinar/twitter-mcp`
- **Cost:** free wrapper; you pay X's own write-API cost (post $0.01, **link-posts $0.20 each**) [https://developer.x.com, fetched 2026-06]
- **Repo / Provider:** github.com/EnesCinr/twitter-mcp, `EnesCinr/twitter-mcp (0.4k★, gh-api 2026-06)` (MIT; ⚠ last push 2025-07, ~11mo stale, works but not actively maintained)
- **Top pick for its domain:** no

## What it does / when to pick it
Thin single-account MCP that posts and searches X via the **official X API** using your own dev
credentials (4 keys). Pick it ONLY when you already have an X dev app and want a one-account
post/search bridge inside Claude. For multi-platform scheduling use Buffer ①; for free,
no-dev-account X writes use the ④ route (twikit MCP); for X reads at scale use twitterapi.io ②.

## Install
`npx -y @enescinar/twitter-mcp` (stdio). Prefer HTTP transports on Windows, this is stdio-only, so
test in a plain shell first (Windows stdio `npx` is flaky). Volatile exact line:
`reference/volatile/pricing-install.md` → social-publishing. MCP only works after session restart.

## Auth / keys
Needs an **X developer app** (apply at developer.x.com) → 4 secrets: `API_KEY`, `API_SECRET`,
`ACCESS_TOKEN`, `ACCESS_TOKEN_SECRET`. New devs currently cannot subscribe to Basic/Pro write tiers
easily, so this can stall on X's side. Secret hygiene: have the USER set the `-e KEY=$VAR` env vars
themselves; never echo keys, see `reference/install-guide.md` (Secret-handling hygiene).

## Usage, call examples
MCP tools: `post_tweet` (text), `search_tweets` (query). Minimal: `post_tweet(text="hello")`.
Search returns recent matching tweets for the authed app's access tier.

## General experience & gotchas (踩坑)
- **X is the only paid write-API in this domain** and link-posts cost **$0.20 each**, budget before
  bulk posting links (shard cost-trap). Plain text posts are $0.01.
- The whole barrier here is X's side, not the wrapper: getting/keeping a usable dev tier is the pain.
- Repo is ~11mo stale (last push 2025-07), if a tool call errors on a newer X API change, it may not
  be patched; don't build a pipeline on it.
- Single-account only, no scheduling, no queue, no multi-platform fan-out.

## Failure signals & fallback
Auth 401/403 = dev creds wrong or write tier not provisioned; 429 = rate/quota. Fallback: free X
writes via **d60/twikit + adhikasp/mcp-twikit** (④, cookies, ban risk) or multi-platform **Buffer**
(① free tier). For X *reads* only, use **twitterapi.io** (② native MCP).

## Last verified: 2026-06
