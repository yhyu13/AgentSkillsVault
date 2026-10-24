# Domain: x-twitter

**Triage signals:** tweets, X/Twitter search, user/influencer analysis, viral tracking, 推特/X 舆情.

Choose X when the question depends on timely public posts or named-account discourse.
For consumer demand, compare its coverage with relevant communities and vertical forums;
low query yield is a coverage observation, not evidence that demand does not exist.

**Hard truth:** X killed anonymous scraping (login wall since 2024). Official free API is unusable;
snscrape and public Nitter instances are effectively dead. Choice = who absorbs the
account+proxy+login-wall cost.

The detect column lists setup/discovery checks, not this host's state. Count a source as
available only after active-host operation, authentication and content checks succeed.
A stored key, connected listing or import is insufficient.

| source | route | capability | detect | risk |
|---|---|---|---|---|
| **twitterapi.io** (+ its MCP) | ② resale | search, users, followers, replies, trends | `claude mcp list` → connected? else env key | gray-area, dep on provider |
| Apify tweet actors | ② resale | bulk historical, trends | apify MCP connected | pay-per-result |
| Bright Data X API/datasets | ② resale | enterprise, 22M+ historical | bright-data MCP | ~10x pricier, best SLA |
| **vladkens/twscrape** (2.7k★) | ③ scrape | search/users/followers, account rotation | python lib installed | needs X cookies+proxy, ban risk; **still actively maintained** (pushed 2026-08-28, v0.19.1 updated X GraphQL op IDs), pin the `vladkens/` repo |
| **d60/twikit** (4.7k★) + adhikasp/mcp-twikit (235★) | ③/④ self-host | read+write, search, DM, no API key | connected MCP or python lib | free; cookie/login, ban risk. ⚠ **worse than last sweep recorded**: twikit's 2026-03-10 push was README-only, its last *code* commit was 2025-04-22 (>12mo) and PyPI is frozen at 2.3.3 (2025-02-07); adhikasp/mcp-twikit is 17.8mo silent, i.e. an unmaintained wrapper around an unmaintained lib. Both still install and neither is archived, so no C4 death code is executed, but **twscrape is now the maintained free ③ route and the Default pick moves accordingly** |
| playwright MCP + browser-use | ④ browser | act-like-human: logged-in search, scrape rendered view | playwright connected | free, real session, best for fields API hides |
| Infatoshi/x-mcp, DataWhisker | ① official | full read+write incl. media | official API integration and private developer credentials | see the dated platform-pricing notes in [social-publishing.md](social-publishing.md); verify current endpoint terms |
| **FxEmbed** (4.8k★) fka FxTwitter | ② free / ③ self-host | resolve ONE post/thread as JSON (text+media+metrics), no key | plain GET, no `claude mcp` entry | read-one only (no search); public-instance uptime + ToS gray, self-host on CF Workers to own it |

**Default pick:** Free + good data → **vladkens/twscrape** (the maintained ③ lib, see the staleness note
on the twikit row) or **playwright MCP** to act like a logged-in human (often richer than the stripped API). twitterapi.io
② only if you want the provider to absorb account/proxy upkeep. Official ① only when you must
post/write at scale. See `browser-automation.md` for the general browser route.

**Install guidance:** see `reference/volatile/pricing-install.md` → x-twitter. Remember a freshly
added MCP needs session reconnect before use.

**Avoid (dead):** (all verified 2026-06)
- **X official FREE API**, never offered usable read/search (write-only ~1,500 posts/mo); X moved to
  default pay-per-use **2026-02** and **closed the free tier to new signups**. The free read capability
  the matrix wants is effectively dead, use twscrape ③ / playwright ④ or twitterapi.io ② instead.
- **snscrape** (`JustAnotherArchivist/snscrape`), **dead for X specifically**: dev paused ~2023, the
  X HTML/JSON endpoints it used are gone (repo still exists, non-X modules may work). Successor =
  **twscrape** (not twikit, see its row). Flag L5 if a plan relies on it for X.
- **Public Nitter instances**, public ecosystem **collapsed late-2024** after X's mandatory-auth +
  rate-limits; nitter.net decommissioned. Self-hosting still works but now needs real X session
  tokens. Treat public-instance scraping as unavailable; use Twiiit only to find a flaky live one.
  ⚠ **2026-08 legal overhang:** X Corp C&D'd Nitter+XCancel (`zedeus/nitter` #1442, 08-25), all public
  instances down 08-27. Repo alive (pushed 2026-09-07) → **not D-404**, but self-host now risks the operator.
- elizaOS/agent-twitter-client, **D-404**, no longer an assertion: `gh api repos/elizaOS/agent-twitter-client`
  returned HTTP 404 Not Found on 2026-09-06 (原仓库下架，只剩 fork). Flag L5/unavailable if relied on.
