# Tool: X official API (Infatoshi/x-mcp etc.)

- **Domain(s):** x-twitter (also: social-publishing)
- **Barrier route:** ① official API · **Source tier:** L1 · **Ready MCP:** yes, Infatoshi/x-mcp (small/niche wrapper) or DataWhisker; or REST directly
- **Cost:** As of 2026-02 X defaults new developers to **pay-per-use** (no free tier): ~$0.005/post read, ~$0.01/profile or follower read, ~$0.015/post created, capped ~2M reads/mo [https://docs.x.com/x-api/getting-started/pricing, fetched 2026-06, confirm current rates in the Developer Console, X changes them often]. Legacy **Basic ~$200/mo** and **Pro $5,000/mo** subscription tiers remain only for existing subscribers (not offered to new signups). Enterprise starts ~$42k/mo.
- **Repo / Provider:** github.com/Infatoshi/x-mcp, `Infatoshi/x-mcp (46★, gh-api 2026-06)`; active (pushed 2026-03-24, not archived, **no LICENSE declared**), niche/low-star, vet before relying. Official API: https://developer.x.com
- **Top pick for its domain:** no (only pick when you MUST post/write at scale, or need compliant/media access)

## What it does / when to pick it
The compliant ① route: official X API v2 read + write incl. media, via a wrapper MCP (Infatoshi/x-mcp) or REST. **Decision rule:** the shard's free read defaults are twscrape ③ / playwright ④, subject to a fresh operation check; twikit remains a conditional library/write fallback. Use the official API **only when you must**, posting/writing at scale, media uploads, or a compliance/no-ban requirement that justifies the cost. It is the one route with **no ban risk** (you're authorized), but the price adds up fast under the 2026 pay-per-use model and there is **no free tier for new developers** (the shard flags "official free API" as dead/avoid). For single-account posting specifically, EnesCinr/twitter-mcp or OpenTweet (social-publishing shard) may be lighter than standing up the full dev account.

## Install
Get X API credentials from the X developer portal (paid plan for real use). Before starting a wrapper MCP such as Infatoshi/x-mcp, use the full Market checkout's `tools/private_inventory.py` to verify an initialized PRIVATE versioned runtime. Confirm supported absolute destinations for its env/configuration, credentials, logs, caches and results, then revalidate before launch. Keep setup pending if any real writer cannot use a verified private destination. Exact wrapper persistence settings remain unverified here. Or call REST `https://api.x.com/2/...` through a client using the approved private credential store and verified output destinations. Volatile L1 line: `reference/volatile/pricing-install.md` lists the single-account `npx -y @enescinar/twitter-mcp` ("needs X dev creds, API cost 自负") under `social-publishing`. On Windows, prefer REST or test the stdio wrapper in a plain shell first. L0 mechanics (transport, secret hygiene, restart-to-take-effect): `reference/install-guide.md`. A freshly added MCP needs a session restart / `/mcp` reconnect.

## Auth / keys
Needs an **X developer account** (apply at developer.x.com) and a funded **pay-per-use** balance for usable access (new developers; legacy Basic ~$200/mo+ only for existing subscribers), plus API key/secret + OAuth 1.0a or OAuth 2.0 tokens. Never `browser_snapshot` the developer-portal keys page or echo credentials through `claude mcp add`. Transfer values through an approved no-echo mechanism into the host's supported private secret configuration and versioned PRIVATE backup, or the wrapper's verified absolute private env/configuration path. Keep secrets out of public source and screenshots; PRIVATE credential backups follow the approved backup policy. See `reference/install-guide.md` for the full procedure.

## Usage, call examples
Via Infatoshi/x-mcp: MCP tools for posting/reading tweets and media per its README (list them after connecting). REST examples: `GET /2/tweets/search/recent?query=...` (read; needs entitled tier), `POST /2/tweets` (write), media upload via the v1.1/v2 media endpoints. Watch the per-tier monthly post/read caps. Don't assume tool signatures from memory, the wrapper is a 46★ niche repo; verify its tool list.

## General experience & gotchas (踩坑)
- **No free tier anymore (2026).** X moved new developers to **pay-per-use** (~$0.005/read, ~$0.015/write, ~2M reads/mo cap); the old free tier is gone and the shard lists the official **free** API as dead/avoid. Legacy Basic ($200/mo) / Pro ($5k/mo) subscriptions persist only for existing subscribers. For most market-intel read tasks this is the wrong tool on price alone, reads bill per-resource and add up fast on broad queries.
- **Caps and per-resource billing bite silently**, you hit the monthly read cap (or burn the prepaid balance) and calls start 429ing/402ing; budget the run before kicking it off, and remember reads are deduplicated only within a 24h UTC window.
- **Wrapper repos are small and unmaintained-risk.** Infatoshi/x-mcp is 46★ with **no LICENSE** (2026-06), vet it, don't redistribute, and prefer raw REST if you need guarantees. DataWhisker is an alternative.
- **Only compelling advantage = compliance + no ban + media/write at scale.** If you don't need those, evaluate the free read routes (twscrape ③ / playwright ④) with a fresh operation and content check.
- **Shard truth:** X is low-signal for consumer-demand research, paying per-read (or burning a legacy $200/mo plan) to confirm "X 'Top' search is empty for patio-heater demand" is a waste; route consumer-demand questions to 抖音/小红书/B站 or Reddit/forums.

## Failure signals & fallback
Failure looks like: 401/403 (bad creds or insufficient tier entitlement), 429 (monthly cap hit), or the wrapper MCP showing `✗ Failed`/`! Needs authentication` in `claude mcp list`. **Fallbacks:** for free reads, **twscrape ③** or **playwright MCP** after current-session operation verification; **twikit (+ adhikasp/mcp-twikit)** remains a conditional library/write fallback after a fresh check. For read without owning the account barrier, **twitterapi.io ②**; for single-account posting without the full dev account, EnesCinr/twitter-mcp or OpenTweet (social-publishing).

## Last verified: 2026-06
