# Domain: reddit-community

**Triage signals:** Reddit, Hacker News, Discord, Quora, Stack Exchange, forums, pain-point mining,
社区/论坛调研, 用户需求挖掘.

| source | route | capability | detect | risk |
|---|---|---|---|---|
| **erithwik/mcp-hn** (HN) | ① free | top/new/ask/show, search, comments | mcp list / `uvx mcp-hn` | none, Algolia API, no key |
| **karanb192/reddit-mcp-buddy** (702★) | ① free | browse/search/post-details/user-analysis; app-id/login access, anonymous access only after demonstrated recovery | `npx -y reddit-mcp-buddy` + current-session authorization and read probe | historical record: 756★ and anonymous JSON HTTP 403 on 2026-07-22; issue #58 / fix PR #60 remained unresolved at that check. Use verified app-id/login access or reddit-research-mcp; no new outage test is asserted here |
| GridfireAI/reddit-mcp | ① official | submissions, search, subreddit (read-only) | connected + Reddit client id/secret | **D-SUPERSEDED** by reddit-mcp-buddy (stale 2025-03, 18★), kept as minimal fallback |
| **king-of-the-grackles/reddit-research-mcp** (224★) | ① free | semantic subreddit discovery (ChromaDB, 20k+ subs) beyond Reddit's 250-result cap; citation-backed, no Reddit credentials to manage | hosted OAuth + current-session read probe | historical success on 2026-07-22 (224★ checked 2026-08-01); preferred no-credential route while buddy's recorded anonymous outage remains unresolved, with fresh operation verification required |
| dancolta/subscope (29★) | ④ | keyless public-RSS buyer-intent scoring, local SQLite (post-GummySearch) | self-host | thin adoption (29★), niche |
| Apify (Quora/forums/Reddit monitor) | ② resale | Quora, forums, brand monitor + sentiment | apify MCP | pay-per-use; SSE deprecated, use HTTP |
| midodimori stack-overflow-mcp | ① free | SE search/answers | connected + SE key (raises 300→10k/day) | none |
| **ArthurHeitmann/arctic_shift** (1.5k★) | ③ archive | Pushshift successor: bulk historical Reddit dumps + JSON API + hosted web UI (arctic-shift.photon-reddit.com); monthly dump refresh | self-host or use hosted UI | active 2026-06, MIT-style, **solo maintainer** (bus-factor risk worth flagging) |
| **SaseQ/discord-mcp** (475★) | ① bot-token | Bot-token Discord MCP (JDA-based, Docker) for own/admin servers, ToS-compliant | bot token + `docker run :8085/mcp` | MIT, active 2026-04 |
| elyxlz/discord-mcp | ④ browser | read/scrape via your user session | self-host | ⚠ violates Discord ToS, ban risk, prefer SaseQ/discord-mcp for own servers |

**Default pick:** HN → erithwik/mcp-hn (HN); Reddit → king-of-the-grackles/reddit-research-mcp or karanb192/reddit-mcp-buddy.

**Required access checks for the Reddit defaults:** Use reddit-research-mcp only
after hosted OAuth and a successful current-session read. Use reddit-mcp-buddy only with
verified app-id/login access. Both replace stale GridfireAI/reddit-mcp. Restore buddy's
anonymous route only after current-session recovery is demonstrated; an upstream merge
alone does not establish usable Reddit access.

**④ Browser/OSS route:** Reddit official API (PRAW, praw-dev/praw 4.1k★) is still free enough, no
real need to browser-scrape. For 中文社区 (微博/抖音/B站/知乎/贴吧) use **NanmiCoder/MediaCrawler**
(57.1k★, Playwright, login session). For YouTube/media use **yt-dlp** (167k★). See `browser-automation.md`.

**Historical / archival route:** for >30-day-old Reddit data or bulk dump access, the new top pick is
**arctic_shift** (route ③, free, monthly refresh), live API picks (reddit-mcp-buddy, GridfireAI)
cover current data only.

**Watch:** Reddit API tightening, prefer official-API routes over unauthorized scrapers.
Discord/Quora scraping = ToS gray zone.

**Avoid (dead/dying):** **GummySearch**, phased shutdown after it could not reach a compliant Reddit
Data API license (verified gh/official 2026-06): commercial close **2025-11-30** (stopped new
signups/renewals), legacy subscribers wind down through 2026, **full shutdown + data deletion
2026-12-01**. As of 2026-06 it serves only legacy paid subscribers, do not start anything on it. Its
free, keyless successor is **`dancolta/subscope`** (route ④, in this shard; active 2026-06, MIT,
self-bills as an open-source GummySearch/Syften/F5Bot alternative), RSS-only, so a monitoring tool,
not a historical backfill.

**Install guidance:** `reference/volatile/pricing-install.md` → reddit-community.
