# Tool: Ayrshare (+ MCP)

- **Domain(s):** social-publishing (also: none)
- **Barrier route:** ② resale/managed API · **Source tier:** L2 · **Ready MCP:** yes
- **Cost:** $149/mo+ (Business/multi-user tiers higher) [https://www.ayrshare.com/pricing, price unverified 2026-06, confirm at the URL]
- **Repo / Provider:** https://www.ayrshare.com (non-GitHub SaaS; managed multi-user posting API + MCP)
- **Top pick for its domain:** no

## What it does / when to pick it
Managed multi-platform social API (13+ platforms) built for **multi-user / multi-client** SaaS, each end-user gets a "Profile Key" and connects their own accounts under your master key. **Decision rule:** pick Ayrshare only when you are an **agency/SaaS managing many separate users' accounts** and want one vendor to absorb the OAuth/upkeep per client. For single-user or cost-sensitive jobs it is overkill, at $149/mo+ it is far pricier than **Buffer** (free tier) or **Blotato** ($29/mo); reach for it for the multi-user Profile-Key model, not for raw posting.

## Install
Get an API key from the Ayrshare dashboard, then add the official MCP (HTTP, **prefer on Windows**). Exact, time-stamped command: `reference/volatile/pricing-install.md → social-publishing`. A newly added MCP only works **after a session restart / `/mcp` reconnect**. L0 mechanics: `reference/install-guide.md`.

## Auth / keys
Master **API key** from the dashboard; multi-user posting additionally uses per-user **Profile Keys** (Business plan). Secret-hygiene (one line): never `browser_snapshot` the key page, user copies → clipboard → direct `~/.claude.json` edit, not `claude mcp add` (which echoes the key); full procedure in `reference/install-guide.md`.

## Usage, call examples
```
POST https://api.ayrshare.com/api/post
  Authorization: Bearer <API_KEY>
  Profile-Key: <user_profile_key>      # multi-user only
  {"post":"hello","platforms":["twitter","linkedin","bluesky"]}
```
Via MCP: list connected platforms for the profile, then call the post/schedule tool with `post` text + `platforms[]` (+ optional `scheduleDate`).

## General experience & gotchas (踩坑)
- **X credentials are bundled from 2026-03** (shard: "X creds自带 from 2026-03"), you don't need your own X dev account/keys to post to X through Ayrshare, which is the one genuine convenience over wiring X yourself. Confirm this still holds on the current plan page.
- Priced for businesses: the entry plan is **$149/mo+**; do not default to it when Buffer's free tier or Blotato's $29/mo would do (CONSTITUTION C2, prefer free/cheap when equivalent).
- Multi-user posting needs the **Profile-Key** header; omitting it posts to the *master* account, which is a common silent mis-route, always set Profile-Key for client posts.
- X link-posts still cost $0.20 each at the platform level (shard cost trap), Ayrshare bundling X creds does not remove that per-link cost.
- Per-platform validation (length/media) is returned per platform, inspect the response array, a 200 does not mean every platform accepted it.

## Failure signals & fallback
Failure looks like: `! Needs authentication`, a per-platform error object in the post response, or posts landing on the master profile because Profile-Key was missing. **Fallbacks:** **Buffer** (route ①, free tier) for cheaper multi-platform, **Blotato** (Claude Code native, $29/mo) for native MCP, or self-hosted **Postiz** (OSS) to drop the SaaS fee entirely.

## Last verified: 2026-06
