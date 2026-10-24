# Domain: social-publishing

**Triage signals:** auto-post / schedule tweets, multi-platform content distribution, post to
X/LinkedIn/Threads/etc, 发帖/排期/内容分发.

**Platform write-API barriers (2026):** X is the ONLY paid one, pay-per-use, post $0.01 but
**link-posts $0.20 each**; new devs can't subscribe Basic/Pro. Bluesky/Mastodon/Threads = free.
LinkedIn free but approval wall (legal entity + vetting).

| source | route | capability | detect | cost |
|---|---|---|---|---|
| **Buffer API** (+ MCP) | ① free tier | 11 platforms, free tier works with API + MCP | connected + key | best value **at hobby scale**; public API + hosted MCP on every plan incl. Free. Free tier re-verified at buffer.com/pricing 2026-09-06: 3 channels · 1 API key · **3,000 API req/mo** · 10 queued posts per channel. Paid is priced **per channel** (Essentials $5/mo/channel, Team $10/mo/channel), so 8 channels is $40/mo, not $5 |
| Ayrshare (+ MCP) | ② | 13+ platforms, multi-user SaaS | connected | $149/mo+; X creds自带 from 2026-03; official Claude Code plugin now available (`ayrshare/ayrshare-social-media-api-claude-plugin`) |
| **Publora** (MCP-native) | ① watch | MCP-native social publishing API across X/LinkedIn/TikTok/YouTube/Instagram + others | setup: canonical registry/index/card sync ([R1](../refresh-protocol.md)) + setup/operation verification pending | **Not an adopted replacement or default**. Pricing verified at publora.com/pricing 2026-09-06, replacing the old unsourced "50-80%" estimate: **Starter free forever** (3 accounts, API+MCP, every platform **except X**) · **Pro $29.95/mo** (unlimited accounts, incl. X) · Agency custom. Pro vs Ayrshare $149/mo = a **79.9% cut**. Backing repo `publora/skills` 46★, pushed 2026-08-11, the old "stars grow but no commits" worry is resolved |
| Typefully API v2 | ① | text/thread first (X/LI/BS/Masto/Threads) | key | Free $0 (1 post) / Starter $8 / Creator $19 / Team $39; API needs a paid plan |
| **Postiz** (OSS, built-in MCP) | ③ self-host | 30+ platforms, agentic-first, no token storage | self-host URL | free OSS; v2.12+ needs Temporal |
| **gitroomhq/postiz-agent** (450★) | ③ | official Postiz agent front-end (`npx skills add`) for 28+ platforms | self-host | lowers agent-vs-API friction over Postiz (450★ at last gh-api check, 2026-09-06) |
| **langchain-ai/social-media-agent** (2.6k★) | ③ | source/curate/schedule agent w/ human-in-loop | self-host + key | content-pipeline tier above the post APIs; pairs w/ Buffer/Postiz |
| Mixpost (OSS) | ③ self-host | 11 platforms, REST+n8n, buy-once | self-host | Lite free / Pro $269 one-time |
| X single: EnesCinr/twitter-mcp, OpenTweet | ①/② | post+search / hosted no-dev-portal | connected | X API cost自负 / OpenTweet $11.99/mo |
| **yikart/AiToEarn** (23.8k★) OSS | ①/④ | one-click publish to CN majors (Douyin/XHS/Kuaishou/Shipinhao/Bili) + Western, AI captions | Electron desktop app, not MCP, GUI handoff | free OSS; ⚠ CN platforms strong risk-control, publish manually not automated |

**Default pick:** Multi-platform scheduling → Buffer API (+ MCP).
OSS self-host → Postiz (OSS, built-in MCP).

**Cost trap:** X link-posts $0.20 each, budget before bulk posting links.

## ④ Browser/OSS "act like a human" alternatives (free, per platform)
Often better than paid post APIs, real logged-in session, no per-post fee. All violate platform
ToS → use throwaway accounts; write/post is far more ban-prone than read. Verified 2026-06-01.

| platform | repo | route | note |
|---|---|---|---|
| X | d60/twikit (4.7k★) + adhikasp/mcp-twikit (235★) | ③/④ | read+write+DM, free. ⚠ **the "ready MCP" half is unmaintained**: adhikasp/mcp-twikit last pushed 2025-03-14 (17.8mo, ~12mo behind its own upstream) and twikit's last *code* change was 2025-04-22. Library still installs; re-test against current X before trusting either |
| Instagram | subzeroid/instagrapi (6.3k★) | ③ | post图文/Reels/comment/DM, most active |
| LinkedIn | stickerdaniel/linkedin-mcp-server (3.4k★) | ④ | ready MCP; ⚠ highest ban risk, small acct |
| TikTok | davidteather/TikTok-Api (6.4k★) | ④ | Playwright-signed, scrape+search |
| 小红书 | **xpzouying/xiaohongshu-mcp (15.7k★)** | ④ | browser + ready MCP, **can post notes** |
| 中文多平台 | NanmiCoder/MediaCrawler (64.5k★) | ④ | Playwright, 小红书/抖音/B站/微博/快手/知乎/贴吧. **Read-only, it scrapes, it cannot publish**; for CN publishing see the row below |
| Bluesky | MarshalX/atproto (653★) | ① | supported API; platform rules, moderation and rate limits apply |
| Mastodon | halcy/Mastodon.py (961★) | ① | supported API; instance access rules, moderation and rate limits apply |
| 视频·CN+全球 | **dreammis/social-auto-upload (14.8k★)** | ④ | Playwright uploader, 11 platforms (抖音/视频号/快手/百家号/小红书/B站/微博/虎扑/支付宝/TikTok/YouTube); `sau` CLI with `--headless` + 4 bundled Claude-Code skills, so **automated**, closing the gap AiToEarn's manual GUI handoff leaves. MIT, 2.5k forks, pushed 2026-09-02. ⚠ CN 风控 is the harshest surface in the matrix, bring your own accounts + residential IPs; the price is a ban, not dollars |

**Default (free route):** post via OSS repo for the platform (X→twikit MCP, 小红书→xiaohongshu-mcp,
IG→instagrapi), only after current operation checks. Prefer the supported Bluesky/Mastodon APIs
where they fit, while checking account/instance rules, scopes, moderation and rate limits. Read-only
verification does not authorize publication; obtain explicit authorization for posting.

**Install guidance:** `reference/volatile/pricing-install.md` → social-publishing.
