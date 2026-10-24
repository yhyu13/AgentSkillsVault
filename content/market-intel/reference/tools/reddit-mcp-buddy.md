# Tool: karanb192/reddit-mcp-buddy

- **Domain(s):** reddit-community (also: none)
- **Barrier route:** ① official (free Reddit API) · **Source tier:** L2 · **Ready MCP:** yes, `npx -y reddit-mcp-buddy` (stdio); prefer the app-id/login tier after current-session verification. The anonymous path has a recorded 403 outage; see below.
- **Cost:** free, rides Reddit's official API; tiered rate limits, no charge [https://www.npmjs.com/package/reddit-mcp-buddy, fetched 2026-06]
- **Repo / Provider:** github.com/karanb192/reddit-mcp-buddy, `karanb192/reddit-mcp-buddy (0.7k★, gh-api 2026-06)`; not archived, MIT, pushed 2026-05 (actively maintained)
- **Top pick for its domain:** conditional, app-id/login route for direct Reddit reads; use **reddit-research-mcp** for the no-credential route while the recorded anonymous-tier outage remains unresolved

## What it does / when to pick it
LLM-optimized read access to Reddit: browse a subreddit's posts, search content, pull post details (with comments), and analyze a user's history. **Decision rule:** use its app-id/login tier for subreddit pain-point mining and product-feedback research after verifying the selected operation. The [domain record](../domains/reddit-community.md) reports anonymous JSON requests returning 403 on **2026-07-22** (upstream issue #58 / fix PR #60). This is historical evidence, not a fresh availability check. Until recovery is demonstrated in the current session, route no-credential research to **reddit-research-mcp**, which also supports semantic subreddit discovery beyond Reddit's 250-result cap. Both replace stale GridfireAI/reddit-mcp; **subscope** covers keyless buyer-intent scoring over RSS.

## Install
`npx -y reddit-mcp-buddy` (stdio). Configure the app-id/login tier with supported private host settings, reconnect, then verify a read operation and its returned content. Successful MCP startup does not prove the anonymous Reddit requests work. For setup without Reddit credentials, follow **reddit-research-mcp** and complete its hosted OAuth flow. Exact L1 guidance: `reference/volatile/pricing-install.md → reddit-community`. On Windows, if stdio fails, test startup in a plain shell and follow the Windows mechanics in `reference/install-guide.md`. A newly added MCP needs a session restart / `/mcp` reconnect.

## Auth / keys
The anonymous tier is designed to need no credentials, but the recorded outage prevents treating it as ready. For app-id/login access, follow Reddit's current app approval and authentication requirements. Historical limits were 60/min for app-id and 100/min for login; confirm current access and quotas. Keep `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` and any login credentials in the selected host's supported PRIVATE settings using the no-echo procedure in `reference/install-guide.md`.

## Usage, call examples
Via MCP, tools cover: browse a subreddit's hot/new/top posts, search posts by keyword, fetch a post's details + comments, and analyze a user. Minimal: "browse top posts in r/<niche> this month" → open the highest-comment threads → read the post details for recurring complaints. List the exact tool names with your client after connecting, don't assume signatures from memory.

## General experience & gotchas (踩坑)
- **Anonymous 403 and quota exhaustion are different failures.** Adding delays cannot establish recovery from the recorded anonymous endpoint outage. Verify app-id/login access or use the no-credential hosted route; pace requests and keep caches in PRIVATE DATA.
- **Subreddit search is keyword, not semantic**, and Reddit's own search is weak, run query variants and browse top/hot directly rather than trusting one search. To find the *right* subreddits at all, hand off to **reddit-research-mcp** (semantic discovery).
- **Reddit API is tightening** (shard "Watch": GummySearch shuts down 2026-11). Official-API access stays the safe route, prefer it over scrapers, but expect quota/policy drift; re-verify before relying at scale.
- **Post details include comments**, but for deep nested comment-tree walking / multi-sub aggregation with full pagination control, drop to **praw** (same free API, full control).
- Free official API, so per CONSTITUTION C2 use it before any paid Reddit-monitoring SaaS (Syften/Apify).

## Failure signals & fallback
Failure looks like: anonymous HTTP 403 (use verified app-id/login access or **reddit-research-mcp**), rate-limit errors (respect the returned allowance), empty search on a live topic (browse top/hot or broaden the query), or stdio startup failure on Windows (inspect the npx path). **Fallbacks:** no-credential research and semantic subreddit discovery → **reddit-research-mcp**, after hosted OAuth and operation verification; keyless buyer-intent scoring → **subscope** (④ self-host); comment trees / custom read logic → **praw**, with verified API access; HN community signal → **mcp-hn**.

## Last verified: 2026-06
