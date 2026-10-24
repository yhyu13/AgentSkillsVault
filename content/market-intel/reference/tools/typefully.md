# Tool: Typefully API v2

- **Domain(s):** social-publishing (also: none)
- **Barrier route:** ① official API · **Source tier:** L1 · **Ready MCP:** no (REST API v2, call it from a script, no ready MCP)
- **Cost:** Free $0 (1 scheduled post) / Starter $8 / Creator $19 / Team $39, **API needs a paid plan** [https://typefully.com/pricing, price unverified 2026-06, confirm at the URL]
- **Repo / Provider:** https://typefully.com (non-GitHub SaaS; text/thread-first publishing REST API)
- **Top pick for its domain:** no

## What it does / when to pick it
Text/thread-first scheduling and publishing across **X, LinkedIn, Bluesky, Mastodon, Threads**, optimized for writing threads and drafts, not media-heavy or broad multi-platform broadcast. **Decision rule:** pick Typefully when the job is **thread/long-form text composition** on those text-first networks and the user already has (or wants) a Typefully subscription. For general multi-platform posting prefer **Buffer** (free, more platforms); for cheap agent-native posting prefer **Blotato**; for self-host prefer **Postiz**. There is **no ready MCP**, you drive the REST API from a script, so it's lower-leverage for an agent than the MCP-backed siblings.

## Install
No MCP, use **REST API v2** directly. Generate an API key in Typefully settings (paid plan required), then call the HTTPS endpoints from a small script. Exact, time-stamped note: `reference/volatile/pricing-install.md → social-publishing` ("Typefully: Free $0 (1 scheduled post) ... API needs a paid plan"). No transport/restart concern (not an MCP). L0 mechanics: `reference/install-guide.md`.

## Auth / keys
API key from Typefully → Settings (the **API requires a paid plan**, the $0 Free tier gives 1 scheduled post but not API access). v2 sends the key as `Authorization: Bearer <API_KEY>` (the older v1 docs used an `X-API-KEY` header, confirm the header for your version at https://typefully.com/docs/api). Secret-hygiene (one line): never echo/screenshot the key; have the user supply it via env var and edit config from clipboard, not into the transcript; full procedure in `reference/install-guide.md`.

## Usage, call examples (v2 base `https://api.typefully.com/v2/`, released Dec 2025; verify the exact path/fields at https://typefully.com/docs/api)
```
POST https://api.typefully.com/v2/social-sets/<social_set_id>/drafts
  Authorization: Bearer <API_KEY>
  {"content":"line 1\n\n\n\nline 2 (4 newlines = next tweet in thread)",
   "threadify":true, "schedule-date":"2026-06-10T09:00:00Z"}
```
Threads are expressed inside one `content` string (split markers); set `schedule-date` (or `"next-free-slot"`) to queue. ⚠ The older `/v1/drafts/` path + `X-API-KEY` header are superseded by the v2 `social-sets` route above, the exact v2 field names for `threadify`/scheduling are **unverified, confirm at https://typefully.com/docs/api**.

## General experience & gotchas (踩坑)
- **API is paywalled**, the Free tier (1 scheduled post) does **not** include API access; a script will 401 until the account is on a paid plan. Verify the plan before promising automation.
- **Thread splitting is delimiter-based**, Typefully splits a draft into tweets on a 4-newline marker (or `threadify`); get the delimiter wrong and the whole thread posts as one giant tweet (silently "succeeds").
- Text/thread-first by design: **weak for image/video-heavy** posts and narrower platform set than Buffer/Blotato, don't pick it for media broadcast.
- X link-posts still cost $0.20 each at the platform level (shard cost trap).
- No ready MCP means more glue code and no `claude mcp list` health check, failures surface only as HTTP errors from your script.

## Failure signals & fallback
Failure looks like: HTTP 401/403 (free plan, no API access), or a thread collapsing into a single tweet (wrong split delimiter). **Fallbacks:** **Buffer** (route ①, free tier, more platforms + a real MCP), **Blotato** (Claude Code native MCP), or post the thread directly per platform (X → twikit ④, Bluesky → atproto ①, Mastodon → Mastodon.py ①).

## Last verified: 2026-06
