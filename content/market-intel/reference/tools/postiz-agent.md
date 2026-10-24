# Tool: gitroomhq/postiz-agent

- **Domain(s):** social-publishing (also: none)
- **Barrier route:** ③ self-host · **Source tier:** L2 · **Ready MCP:** CLI/skill, install via `npx skills add` (official Postiz agent front-end, not a standalone MCP server)
- **Cost:** free (OSS), front-end over a self-hosted Postiz instance; no SaaS fee of its own
- **Repo / Provider:** github.com/gitroomhq/postiz-agent, `gitroomhq/postiz-agent (388★, gh-api 2026-08-01)`; active (pushed 2026-07-20, not archived, license NOASSERTION, custom/non-standard, read LICENSE before redistributing)
- **Top pick for its domain:** no (Postiz itself is the top pick; this is its agent convenience layer)

## What it does / when to pick it
Official Postiz **agent CLI / skill** that connects to Claude / OpenClaw / other agents to schedule social posts across **28+ platforms** through your self-hosted Postiz backend. It packages the agent-vs-API plumbing so the agent talks "schedule this post" instead of hand-rolling the public-API calls. **Decision rule:** pick `postiz-agent` only when you have already chosen **Postiz** (route ③, self-host) and want the *smoother Claude-facing entry point* over raw Postiz's built-in MCP/REST. If you are not self-hosting Postiz, this tool does not apply, use **Buffer** (① free tier, zero-ops) or **Blotato** (Claude Code native MCP) instead. For a multi-stage source→curate→schedule content pipeline, `langchain-ai/social-media-agent` sits a tier above this.

## Install
This is a front-end **for an existing Postiz instance**, stand up Postiz first (Docker; **v2.12+ requires Temporal**), then add the agent: `npx skills add` (official Postiz agent). Exact, time-stamped line: `reference/volatile/pricing-install.md → social-publishing` ("gitroomhq/postiz-agent (388★): `npx skills add` (official Postiz agent, self-host)"). The agent points at your Postiz **self-host URL + API key** (Postiz → Settings → Public API). On Windows, prefer driving the underlying Postiz via its **HTTP** MCP URL over stdio. A newly added MCP/skill only takes effect **after a session restart / `/mcp` reconnect**. L0 mechanics: `reference/install-guide.md`. Underlying server doc: `reference/tools/postiz.md`.

## Auth / keys
No new platform credentials, the per-platform OAuth tokens stay **inside your Postiz instance**; the agent only carries the **Postiz self-host URL + API key**. Secret-hygiene (one line): treat that URL/key as a secret, have the user copy it, pipe from clipboard, and edit `~/.claude.json` directly rather than `claude mcp add` (which echoes the value); full procedure in `reference/install-guide.md`.

## Usage, call examples
The agent exposes Postiz scheduling as agent-callable actions (discover channels → create/schedule a post per channel). Under the hood it hits the same Postiz public API:
```
POST https://<your-postiz-host>/public/v1/posts
  Authorization: <postiz_api_key>
  {"type":"now","posts":[{"integration":{"id":"<channel_id>"},"value":[{"content":"hello"}]}]}
```
Minimal flow: list integrations (channel IDs) → call the schedule action with content + channel (+ optional time).

## General experience & gotchas (踩坑)
- **It is a thin convenience layer, not a data source**, it adds zero new platform reach beyond what your Postiz install already supports (28+); if Postiz can't reach a platform, neither can the agent.
- **Inherits every Postiz deploy gotcha**: v2.12+ needs **Temporal** running or scheduling silently never fires; "free" is software-free, not ops-free (OAuth refresh, proxies, server upkeep, route ③).
- **License = NOASSERTION** (gh-api 2026-06), GitHub couldn't map it to a standard SPDX id; read the repo LICENSE before redistributing or offering it as a hosted service (Postiz core is AGPL-3.0).
- Modest adoption (388★) and tightly coupled to Postiz versioning, pin versions; an `npx skills add` that drifts ahead of your Postiz backend can break the action surface.
- X link-posts still cost **$0.20 each** at the platform level (shard cost trap), the agent front-end does not remove platform write costs.

## Failure signals & fallback
Failure looks like: scheduled posts never firing (Postiz Temporal not running), the agent action erroring on a bad/expired self-host URL or API key, or a per-channel error in the publish response. **Fallbacks:** raw **Postiz** built-in MCP/REST (drop the front-end, same backend); **Buffer** (① free tier, zero-ops) or **Blotato** (Claude Code native MCP) if you'd rather not self-host; for a single free platform skip aggregation entirely (Bluesky → atproto, Mastodon → Mastodon.py).

## Last verified: 2026-06
