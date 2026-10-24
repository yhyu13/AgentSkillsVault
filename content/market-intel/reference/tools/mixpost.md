# Tool: Mixpost (OSS)

- **Domain(s):** social-publishing (also: none)
- **Barrier route:** ③ self-host · **Source tier:** L2 · **Ready MCP:** no (REST API + n8n integration; no built-in MCP, drive the REST API)
- **Cost:** Lite **free** (OSS) / Pro **$269 one-time** (buy-once, no subscription)
- **Repo / Provider:** github.com/inovector/mixpost, `inovector/mixpost (3.3k★, gh-api 2026-06)`; active (pushed 2026-03-16, not archived, MIT)
- **Top pick for its domain:** no

## What it does / when to pick it
Self-hosted social scheduler (Laravel) for **11 platforms**, driven via **REST + n8n** (no MCP). The differentiator is licensing: **Lite is free OSS and Pro is a one-time $269**, with no recurring SaaS fee. **Decision rule:** pick Mixpost when you want **OSS self-host with a permissive MIT license and a buy-once Pro** (vs Postiz's AGPL-3.0), and you're fine wiring it through REST/n8n rather than an MCP. For an agent-native built-in MCP + 30+ platforms prefer **Postiz**; for zero-ops free prefer **Buffer**.

## Install
Self-host (Docker / Laravel). There is **no built-in MCP**, integrate via the **REST API** (or n8n nodes). Exact, time-stamped line: `reference/volatile/pricing-install.md → social-publishing` (Mixpost entry: "Lite free / Pro $269 one-time"). Since it's not an MCP, no `claude mcp add` / restart concern, the agent calls the REST endpoints from a script. L0 mechanics: `reference/install-guide.md`.

## Auth / keys
Generate an **API access token** inside your self-hosted Mixpost admin; platform OAuth tokens live **in your Mixpost instance**, not in the agent. Secret-hygiene (one line): treat the host URL + API token as secrets, supply via env/clipboard, never echo into the transcript; full procedure in `reference/install-guide.md`.

## Usage, call examples
```
POST https://<your-mixpost-host>/api/<workspace_uuid>/posts
  Authorization: Bearer <api_token>
  {"accounts":[<account_id>], "versions":[{"account_id":0,
    "content":[{"body":"hello"}]}], "schedule_now":true}
```
n8n alternative: use the Mixpost node to create/schedule a post in a workflow.

## General experience & gotchas (踩坑)
- **No MCP**, unlike Postiz/Buffer/Blotato there's no `claude mcp list` health check; failures surface only as HTTP errors from your script, so add explicit response-checking.
- **Pro is buy-once $269, not a subscription**, the genuine cost edge over SaaS aggregators if you'll run it long-term; Lite (free) covers basic posting. Confirm which features are Lite-only before relying on them.
- **MIT license** (vs Postiz AGPL-3.0), the reason to pick Mixpost when you might redistribute/modify a hosted service without source-disclosure obligations.
- Fewer platforms (**11**) than Postiz (30+), check the target platforms are supported before committing.
- Self-host = you carry OAuth refresh, server, proxies (route ③ hidden ops cost).
- X link-posts still cost $0.20 each at the platform level (shard cost trap), self-hosting doesn't remove platform write costs.

## Failure signals & fallback
Failure looks like: HTTP 401/403 from the REST API (bad/missing token), posts silently not scheduling (worker/queue not running), or an unsupported-platform error. **Fallbacks:** **Postiz** (OSS, built-in MCP, 30+ platforms) when you want agent-native + more reach; **Buffer** (route ①, free tier, zero-ops) when you don't want to host; single free platform → atproto (Bluesky) / Mastodon.py directly.

## Last verified: 2026-06
