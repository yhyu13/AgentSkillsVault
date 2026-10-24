# Tool: OpenTweet (hosted)

- **Domain(s):** social-publishing (also: x-twitter)
- **Barrier route:** ② · **Source tier:** L2 · **Ready MCP:** yes, hosted MCP server for Claude / AI agents (plus REST API + CLI)
- **Cost:** Pro **$11.99/mo** (Advanced $29/mo, Agency $49/mo; ~17% off annual = pay 10 months get 12; 7-day trial) [https://opentweet.io/pricing, fetched 2026-06]
- **Repo / Provider:** https://opentweet.io (hosted SaaS, no public repo)
- **Top pick for its domain:** no

## What it does / when to pick it
Hosted X-only posting/scheduling SaaS that **links your X account with one click, no developer
portal, no per-post X API fee** (the provider absorbs the ② barrier). Pick it when you want hands-off
X scheduling (calendar, threads up to 25, evergreen queue) without standing up an X dev app or
eating link-post fees. For multi-platform reach prefer **Buffer** ① (free tier, 11 platforms); for
free self-host X writes use the ④ route (twikit).

## Install
No install, it's hosted. Add its MCP URL from the OpenTweet dashboard to `~/.claude.json` (HTTP
transport, Windows-friendly). Or use its REST API / CLI from your own code. Exact line lives in
`reference/volatile/pricing-install.md` → social-publishing (OpenTweet $11.99/mo). MCP takes effect
only after session restart / `/mcp` reconnect.

## Auth / keys
Sign up at opentweet.io → connect X via OAuth one-click (no X dev creds needed) → copy the API
key / MCP token from the dashboard. Secret hygiene: do NOT `browser_snapshot` the key page; have the
user copy it and pipe via clipboard, verify by length only, see `reference/install-guide.md`.

## Usage, call examples
Via MCP: schedule/post-tweet tools exposed by the hosted server. Via REST: POST a tweet/thread from
any codebase. CLI: post from terminal or CI/CD. Minimal: schedule a single tweet to your linked
account.

## General experience & gotchas (踩坑)
- **X-only**, not a multi-platform tool; if the request spans LinkedIn/IG/Bluesky, this is the wrong
  pick (use Buffer/Blotato/Postiz).
- Value prop = it eats the X write-API cost and the dev-portal wall for a flat $11.99/mo. Above
  modest volume that flat fee beats paying X's **$0.20/link-post** directly.
- Hosted SaaS = your X account is connected through a third party; lower control than running your own
  dev app or the free OSS route.
- Price tiers verified live at opentweet.io/pricing 2026-06 (Pro $11.99 / Advanced $29 / Agency $49 per mo);
  re-confirm before quoting, SaaS prices rot, and an earlier doc revision had the Advanced/Agency figures wrong.

## Failure signals & fallback
Posting silently stops or returns auth errors = X re-auth needed or plan limit hit. Fallback:
**Buffer** ① (free, multi-platform) for scheduled posts, or **EnesCinr/twitter-mcp** ① if you have
your own X dev creds, or free **twikit** ④ for no-cost X writes (throwaway account, ban risk).

## Last verified: 2026-06
