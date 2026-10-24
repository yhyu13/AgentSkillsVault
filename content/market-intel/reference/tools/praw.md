# Tool: praw-dev/praw (Reddit API wrapper)

- **Domain(s):** reddit-community (also: none)
- **Barrier route:** ① official (free Reddit API) · **Source tier:** L1 · **Ready MCP:** no, it's a Python library, not an MCP; call it from a script (or via a PRAW-based MCP wrapper such as the superseded reddit-mcp)
- **Cost:** free, official Reddit OAuth API, no charge (rate-limited) [https://praw.readthedocs.io, fetched 2026-06]
- **Repo / Provider:** github.com/praw-dev/praw, `praw-dev/praw (4.1k★, gh-api 2026-06)`; not archived, BSD-2-Clause, **actively maintained** (pushed 2026-06-09)
- **Top pick for its domain:** no, the **escalation** when the read-only reddit-mcp isn't enough

## What it does / when to pick it
The mature Python client for the official Reddit API supports submissions, search, subreddits, nested comment trees, pagination and multi-sub aggregation. Consider **reddit-mcp-buddy** for quick read-only queries after current-session verification; use **praw** when the selected MCP operation cannot provide the needed comment depth or pagination. API access, quotas and authorization still need verification. An installed library alone does not prove the required read operation works.

## Install
`pip install praw`. No MCP to add, write a short Python script. The L1 line: `reference/volatile/pricing-install.md → reddit-community` (notes PRAW as the still-free official-API route under `④ Browser/OSS`). Windows: pure-Python, so no stdio/path flakiness, runs fine in any Python ≥3.10 env. (If you'd rather have it in the MCP list, use `reddit-mcp-buddy` first; the superseded `reddit-mcp` also wraps PRAW, see `reddit-mcp-buddy.md` / `reddit-mcp.md`.)

## Auth / keys
Follow Reddit's current application and authorization process. Load credentials and the real contact User-Agent through approved PRIVATE configuration without printing them. Keep collected comments, caches and exports in PRIVATE versioned DATA. Public code and generated tests use only synthetic values; see `reference/install-guide.md`.

## Usage, call examples
Use `reddit.subreddit(...).top()/hot()/new()` or `.search(...)` for a bounded submission
set. For comments, choose an explicit expansion budget for `submission.comments.replace_more`.
Retain the returned unexpanded `MoreComments` placeholders as coverage gaps, then use
`.list()` to flatten the comments that were actually loaded. `replace_more(limit=0)`
performs no additional expansion and removes unloaded placeholders; its result is partial.
Record fetched counts, remaining gaps and the expansion limit with the private output.

## General experience & gotchas (踩坑)
- **Comment depth is an explicit coverage choice.** PRAW can fetch more replies than a limited MCP operation, but `.list()` only flattens loaded comments. Never describe `replace_more(limit=0)` output as a complete comment tree.
- **Reddit API rate limits (~60 req/min)** still apply, PRAW handles backoff internally but a wide multi-sub + comment-tree crawl is slow; cache and pace. `replace_more` calls are the expensive part (each costs a request).
- **Reddit API is tightening** (shard "Watch": API restrictions ongoing, GummySearch shuts 2026-11). Official OAuth access remains compliant and free for read, stay on it rather than scraping, but watch for quota/policy drift.
- **Read-only is enough for research; avoid write/vote actions** (post/comment/vote) which carry account-action risk and add nothing to intel work.
- Actively maintained (pushed 2026-06) and 4.1k★, the dependable, non-dead choice, unlike many one-off Reddit scrapers.

## Failure signals & fallback
Failure looks like: 401/403 (bad client creds or missing user_agent), 429 (rate-limited, slow down), or a `replace_more` crawl timing out on a huge thread (cap `limit`). **Fallbacks:** for quick read-only queries without writing a script, use **reddit-mcp-buddy** (or the superseded GridfireAI/reddit-mcp); for cross-platform keyword monitoring use **Apify** Reddit actors (② paid) or free F5Bot; for HN discourse use **mcp-hn**.

## Last verified: 2026-06
