# Tool: Blotato (+ MCP)

- **Domain(s):** social-publishing (also: none)
- **Barrier route:** ② resale/managed API · **Source tier:** L2 · **Ready MCP:** yes, native Claude Code MCP
- **Cost:** Starter $29/mo = **20 social accounts** (API needs a paid plan) [https://blotato.com/pricing, price unverified 2026-06, confirm at the URL]
- **Repo / Provider:** https://blotato.com (non-GitHub SaaS; managed posting API + native Claude Code MCP)
- **Top pick for its domain:** yes, conditionally; not the domain default

## What it does / when to pick it
Managed multi-platform posting (~9 platforms) with a **native Claude Code MCP**, designed to be driven by an agent. **Decision rule:** Consider Blotato when a native Claude Code posting MCP fits the task and a paid plan ($29/mo) is acceptable, after verifying current host access, the required operation, platform coverage and current cost. It is not the shard default and is not automatically adopted. Choose **Buffer** instead when you want route ①/official + a genuine **free** tier; choose **Postiz** when you must self-host (OSS, no fee, no token storage). Note the real unit is **20 social accounts** at Starter, *not* "9 platforms" (correct the one-liner from tool-master).

## Install
Native Claude Code MCP, add per Blotato's docs with your API key (HTTP, **prefer on Windows**). Exact, time-stamped line: `reference/volatile/pricing-install.md → social-publishing` ("Blotato: Starter $29/mo = 20 social accounts, `backend.blotato.com/v2` + MCP (API key header; API needs a paid plan)"). A newly added MCP only works **after a session restart / `/mcp` reconnect**. L0 mechanics: `reference/install-guide.md`.

## Auth / keys
**API key passed as a header**; the API is gated behind a **paid plan** (free signup alone won't authorize API/MCP calls). Secret-hygiene (one line): never `browser_snapshot` the key page, user copies → clipboard → direct `~/.claude.json` header edit, not `claude mcp add` (which echoes the key); full procedure in `reference/install-guide.md`.

## Usage, call examples
```
POST https://backend.blotato.com/v2/posts
  blotato-api-key: <API_KEY>
  {"post":{"content":"hello","platform":"twitter","accountId":"<id>"}}
```
Via MCP: list connected accounts → call the post/schedule tool with content + target account ID. The native MCP surfaces these as Claude Code tools directly.

## General experience & gotchas (踩坑)
- **Quota is "20 social accounts", not "9 platforms"** (shard correction), when sizing a job, count the user's connected *accounts*, not platform types.
- **API/MCP needs a paid plan**, a free account that "connected" in the UI will still 401/403 on API calls; verify the plan, not just the connection (this is a common silent failure).
- Endpoint base is `backend.blotato.com/v2`, older `/v1` references float around; use v2.
- X link-posts still cost $0.20 each at the platform level (shard cost trap), Blotato does not absorb that.
- Native MCP means tools appear directly in Claude Code (no `mcp-remote` shim), which is its main edge over Buffer/Ayrshare for agent-driven runs, but it still won't connect without the paid-plan key.

## Failure signals & fallback
Failure looks like: 401/403 on the API despite a "connected" dashboard (= free plan, no API access), `! Needs authentication` in `claude mcp list`, or posting to the wrong account ID. **Fallbacks:** **Buffer** (route ①, free tier) when you don't want to pay; **Postiz** (OSS self-host) to drop the SaaS fee; for a single free platform skip the aggregator (Bluesky → atproto, Mastodon → Mastodon.py).

## Last verified: 2026-06
