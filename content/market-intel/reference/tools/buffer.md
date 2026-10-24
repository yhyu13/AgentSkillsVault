# Tool: Buffer API (+ MCP)

- **Domain(s):** social-publishing (also: none)
- **Barrier route:** ① official API · **Source tier:** L1 · **Ready MCP:** yes, official hosted MCP, on every plan incl. Free (launched 2026-05-27)
- **Cost:** free tier works (API + MCP available on Free plan); paid tiers add channels/analytics [https://buffer.com/pricing, price unverified 2026-06, confirm at the URL]
- **Repo / Provider:** https://buffer.com (non-GitHub SaaS; public API + hosted MCP)
- **Top pick for its domain:** yes

## What it does / when to pick it
Schedule and publish posts across ~11 platforms (X, LinkedIn, Instagram, Facebook, Threads, Mastodon, Bluesky, TikTok, Pinterest, etc.) from one API/MCP. **Decision rule:** this is the **default pick for multi-platform social publishing**, the only route ①/official aggregator whose public API *and* hosted MCP work on the **Free** plan (no paywall to get started). Pick Buffer over Blotato when you want compliant/official + free; pick Blotato when you specifically want Claude Code native MCP at $29/mo with 20 accounts; pick Postiz when you must self-host (OSS, no token storage). Always front-load free platforms (Bluesky/Mastodon/Threads) directly regardless.

## Install
Hosted MCP (HTTP transport, **prefer on Windows**). Get an API key from the Buffer dashboard, then add the official hosted MCP. Exact, time-stamped command lives in `reference/volatile/pricing-install.md → social-publishing` ("Buffer: API key from dashboard (free tier works) + official MCP"). A newly added MCP only works **after a session restart / `/mcp` reconnect**. L0 transport/secret mechanics: `reference/install-guide.md`.

## Auth / keys
API key (access token) from the Buffer dashboard; the Free plan grants API + MCP access. Have the user enter the token into the active host's supported private configuration, or use an approved no-echo browser/OS transfer that returns only success or value-free diagnostics. Do not snapshot the key page, return a DOM credential value, or print a token-bearing command. Keep credentials in the designated PRIVATE versioned store; full procedure: `reference/install-guide.md`.

## Usage, call examples
MCP exposes connected-channel + schedule/post tools (list channels → create/queue post per channel). Prefer the MCP for posting; the exact REST shape is **unverified, confirm at https://developers.buffer.com/** before scripting it. ⚠ The legacy `api.bufferapp.com/1/updates/create.json` (`profile_ids[]` + `now=true`) endpoint is **deprecated**, Buffer's current public API is GraphQL-based with a REST migration in progress, so do not hardcode the old v1 path.
Via MCP: discover the channel IDs first, then call the publish/schedule tool with text + channel + optional `scheduled_at`.

## General experience & gotchas (踩坑)
- **The free-tier-includes-API+MCP is the whole point** (shard: "best value; public API + hosted MCP officially launched 2026-05-27, on every plan incl. Free"), verify it is still free-tier on the pricing page before promising a $0 setup.
- X is the **only platform with a write cost** behind the aggregator: post $0.01 but **link-posts $0.20 each**, budget before bulk link posting (shard cost trap). Buffer does not absorb that X cost.
- LinkedIn channels still require the LinkedIn-side approval (legal-entity / vetting), Buffer can't bypass the platform's own write wall.
- Each platform has its own length/media rules; Buffer surfaces per-channel errors rather than failing the whole batch, read per-channel results, don't assume "no exception = all posted".
- Channel/profile IDs are **not** the same as platform handles, resolve IDs from the API first.
- **Signup is Cloudflare-Turnstile-gated** (confirmed 2026-06-16), headless attempts hang in "Signing Up..." waiting for a Turnstile token that never arrives. The agent must hand the signup URL to the user; after signup, the user transfers the access token from Account → API & SDK directly into private configuration. The agent then discovers the selected operation in the active host and verifies a read call without exposing the token.

## Failure signals & fallback
Failure looks like: a value-free selected-server diagnostic reporting `Needs authentication`, a per-channel error in the publish response, or a silently dropped X link-post over budget. **Fallbacks:** Blotato (Claude Code native MCP, $29/mo) or self-hosted **Postiz** (OSS, 30+ platforms); for a single free platform skip the aggregator entirely (Bluesky → atproto, Mastodon → Mastodon.py, X → twikit ④).

## Last verified: 2026-06
