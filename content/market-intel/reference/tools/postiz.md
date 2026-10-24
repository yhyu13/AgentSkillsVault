# Tool: Postiz (OSS, built-in MCP)

- **Domain(s):** social-publishing (also: none)
- **Barrier route:** ③ self-host · **Source tier:** L2 · **Ready MCP:** yes, built-in (self-host → Settings → Public API → copy MCP URL)
- **Cost:** free (OSS, self-host), no per-post fee, no SaaS subscription
- **Repo / Provider:** github.com/gitroomhq/postiz-app, `gitroomhq/postiz-app (31.6k★, gh-api 2026-06)`; active (pushed 2026-06-05, not archived, AGPL-3.0)
- **Top pick for its domain:** yes

## What it does / when to pick it
Open-source, **agentic-first** social scheduler for **30+ platforms** with a **built-in MCP** and (notably) **no token storage** in the agent path, you self-host it and post via the public API/MCP URL. **Decision rule:** pick Postiz when you want to **own the stack / pay no SaaS fee** and are willing to run a server (route ③). It is the shard's "OSS self-host" default. Choose **Buffer** instead for zero-ops + free tier; choose **Blotato** for cheap Claude-Code-native MCP without hosting. AGPL-3.0, fine for internal use; matters if you redistribute a modified hosted service.

## Install
Self-host (Docker is the usual path), then **Settings → Public API → copy the MCP URL** and add it as an HTTP MCP (**prefer HTTP on Windows**). ⚠ **v2.12+ requires Temporal** as an added dependency, budget for it in the deploy. Exact, time-stamped line: `reference/volatile/pricing-install.md → social-publishing` ("Postiz (OSS, free): self-host → Settings → Public API → copy MCP URL. v2.12+ needs Temporal"). A newly added MCP only works **after a session restart / `/mcp` reconnect**. L0 mechanics: `reference/install-guide.md`. Related: `gitroomhq/postiz-agent` (`npx skills add`) is the official agent front-end that lowers agent-vs-API friction over raw Postiz.

## Auth / keys
The per-platform OAuth tokens live **inside your self-hosted Postiz instance**, not in the agent, the agent only holds the **self-host MCP/API URL** (+ any API key Postiz issues). Secret-hygiene (one line): treat the self-host URL/key like a secret, clipboard → direct `~/.claude.json` edit, not `claude mcp add`; full procedure in `reference/install-guide.md`.

## Usage, call examples
Built-in MCP exposes list-channels + create/schedule-post tools. REST shape:
```
POST https://<your-postiz-host>/public/v1/posts
  Authorization: <postiz_api_key>
  {"type":"now","posts":[{"integration":{"id":"<channel_id>"},"value":[{"content":"hello"}]}]}
```
Via MCP: discover integration (channel) IDs, then call the publish/schedule tool with content + channel.

## General experience & gotchas (踩坑)
- **v2.12+ needs Temporal**, the single biggest deploy gotcha; older docs that skip it will leave scheduling broken. Confirm the Temporal service is up before claiming scheduling works.
- **Self-host = you carry the upkeep** (OAuth refresh, proxies, server), the "free" is software-free, not effort-free; the hidden cost is ops/proxies (install-guide route ③ note).
- "No token storage" refers to the **agent** not holding platform tokens, they sit in your Postiz instance instead; that's a security plus, not "no tokens anywhere".
- X link-posts still cost $0.20 each at the platform level (shard cost trap), self-hosting doesn't remove platform write costs.
- **AGPL-3.0**: using it internally is fine; offering a *modified* Postiz as a network service triggers source-disclosure obligations.
- 31.6k★ and active (pushed 2026-06-05), the healthiest OSS option in this domain; the agent front-end `postiz-agent` is the smoother path for Claude.

## Failure signals & fallback
Failure looks like: scheduled posts never firing (Temporal not running), `! Needs authentication`/`✗ Failed` in `claude mcp list` (self-host URL down or wrong), or a per-channel error in the publish response. **Fallbacks:** **Buffer** (route ①, free tier, zero-ops) or **Blotato** (Claude Code native MCP) when you don't want to host; **Mixpost** (OSS, MIT, buy-once) if AGPL is a problem; single free platform → atproto/Mastodon.py directly.

## Last verified: 2026-06
