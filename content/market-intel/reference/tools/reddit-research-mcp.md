# Tool: king-of-the-grackles/reddit-research-mcp

- **Domain(s):** reddit-community (also: none)
- **Barrier route:** ① official (free Reddit API, hosted) · **Source tier:** L2 · **Ready MCP:** yes, hosted OAuth MCP, **no creds to manage** (the host holds Reddit auth)
- **Cost:** free, hosted, no key; rides Reddit's official API via the provider [https://github.com/king-of-the-grackles/reddit-research-mcp, fetched 2026-06]
- **Repo / Provider:** github.com/king-of-the-grackles/reddit-research-mcp, `king-of-the-grackles/reddit-research-mcp (0.2k★ / 224 stars, gh-api 2026-08-01)`; not archived, MIT, pushed 2026-07-24 (active). MCP endpoint is `https://reddit-research-mcp.fastmcp.app/mcp` (FastMCP-hosted); `app.dialog.tools` is a separate web UI built on the same server, **not** the MCP endpoint, confirm the current URL at `reference/volatile/pricing-install.md → reddit-community`
- **Top pick for its domain:** yes, the no-credential research route while reddit-mcp-buddy's recorded anonymous-tier outage remains unresolved; hosted OAuth and current-session operation verification are still required

## What it does / when to pick it
**Semantic subreddit discovery** plus citation-backed Reddit research: it indexes 20,000+ subreddits in a ChromaDB vector store, so you can find communities by meaning, then pull threads with citations for competitive/customer/market research. **Decision rule:** use it to discover relevant subreddits, go beyond Reddit's 250-result search cap, or research without managing Reddit app credentials. The [domain record](../domains/reddit-community.md) reports buddy's anonymous JSON 403 outage on 2026-07-22; no new live availability check is implied here. After hosted OAuth and a successful current-session read, use this route directly for cited research. For more direct browse/search/details control, hand off to buddy only with verified app-id/login access or demonstrated anonymous recovery.

## Install
Hosted OAuth MCP, add the provider's MCP URL; you authorize via OAuth in the browser, no client id/secret to paste. Exact L1 command + current endpoint: `reference/volatile/pricing-install.md → reddit-community`. Prefer this HTTP/hosted transport on Windows (no local Node/uv process, far fewer flakes than stdio siblings). See `reference/install-guide.md` for HTTP-transport mechanics and the three-state `claude mcp list` health check (a Connected label is only a diagnostic; verify the operation in the active host session). A newly added MCP needs a session restart / `/mcp` reconnect.

## Auth / keys
**No API key to manage**, auth is hosted OAuth (you click through an authorization screen; the provider holds the Reddit credential). Because there is no key for you to store, the secret-hygiene clipboard script does **not** apply here. The trade-off: you are routing your research through a third-party host, fine for public Reddit data, but don't assume it's private.

## Usage, call examples
Via MCP, tools cover: semantic search for relevant subreddits across the 20k+ index, then fetch/search posts within them and return results **with citations** (source links you can verify). Minimal: "find subreddits where people discuss <niche pain point>" → take the ranked subreddit list → "pull recent threads in those subs about <pain point>" and read the cited posts. List the exact tool names with your client after connecting, don't assume signatures from memory.

## General experience & gotchas (踩坑)
- **This is a discovery tool, not a firehose.** Its value is breaking past Reddit's 250-result cap and surfacing non-obvious subreddits, not high-volume scraping. Use it to scope, then use buddy/praw only with verified API access.
- **Hosted dependency = a second point of failure.** If the FastMCP host (`reddit-research-mcp.fastmcp.app`) is down or rate-limits, your Reddit research stalls even though Reddit itself is up. Consider **reddit-mcp-buddy** (self-connected, official API) as a fallback only after current-session transport, authorization and selected-operation verification.
- **The vector index can drift / lag**, a brand-new or tiny subreddit may not be in the 20k index yet; for those, search the sub directly with buddy after verifying its app-id/login operation.
- **Citations are the differentiator**, prefer this over un-cited scrapers when you need to *quote Reddit as evidence* in a report; the source links let you verify claims (CONSTITUTION C1).
- **Reddit API is tightening** (shard "Watch": GummySearch shuts down 2026-11), the hosted route insulates you from creds churn but not from Reddit policy changes; re-verify before relying at scale.

## Failure signals & fallback
Failure looks like: the hosted endpoint not connecting / `! Needs authentication` in `claude mcp list` (re-run OAuth), an empty subreddit-discovery result on a real topic (index gap, search the sub directly), or host rate-limiting under load. **Fallbacks:** direct browse/search/post-details → **reddit-mcp-buddy** with verified app-id/login access; keyless buyer-intent scoring over public RSS → **subscope** (④ self-host); comment-tree depth and custom read flows → **praw** with verified API access; HN community signal → **mcp-hn**.

## Last verified: 2026-06
