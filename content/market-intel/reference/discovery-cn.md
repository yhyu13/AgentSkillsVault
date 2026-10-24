# Discovery sources, Chinese-language surfaces (CN)

Companion to `refresh-protocol.md` Discovery phase §D1. The existing D1 A/B/C/D tables scan
English-speaking surfaces (GitHub Trending, HN, Reddit, smithery/glama/pulsemcp, X). A whole
parallel ecosystem ships in Chinese, DeepSeek tool-use community, 即梦 / 可灵 / MiniMax APIs,
抖音电商 接口, 小红书 工具圈, Qwen ecosystem, and rarely surfaces in English-language radars
until weeks or months later. This file documents the CN surfaces to poll alongside the standard
D1 tables.

Discovery angles ①,④ from D2 apply unchanged. Polling cadence follows the per-domain cadence
in `refresh-protocol.md` §Cadence (weekly hot-domains pulse / monthly full sweep).

## CN sources

### 1. 即刻 (jike.app), builder pulse, strongest "shipping THIS week" signal

- **URL**: https://web.okjike.com (web) · iOS/Android app
- **Polling**: no official RSS or public API; web app is auth-walled. Manual-digest only,
  during a sweep, browse the **AI / 工具圈 / DeepSeek 顶级** topic feeds and the "热门" tab,
  skim 1 to 2 weeks back. A logged-in playwright session can scrape topic feeds if signal warrants
  automation; until then treat as manual.
- **Signal type**: Founder/builder first-person ship notes ("刚做了个 X / 接了 DeepSeek
  function-call 的 Y"). Highest density of "tool exists but not yet on GitHub/PH" leads.
- **Cadence**: weekly during hot-domain pulses; full topic sweep monthly.
- **Candidate criterion**: a CN builder claims a shipped, reachable tool/API/MCP (URL, repo,
  WeChat mini-app, or hosted endpoint) that maps to one of the 13 domains. Pure "我在做" with
  no artifact → reject as vaporware (D4).

### 2. 36Kr AI vertical, funding + product launch announcements

- **URL**: https://36kr.com/information/AI/ (AI 频道) · https://36kr.com/information/web_zhichang
  for adjacent SaaS coverage
- **Polling**: site offers per-channel RSS at `https://36kr.com/feed-channel/<id>` (verify the AI
  channel feed URL at scan time, IDs occasionally rotate). Otherwise scrape the channel index.
- **Signal type**: funding rounds, product launches, founder interviews. Catches domestic AI
  tooling before it hits English-language radar (typical lead time 2 to 8 weeks).
- **Cadence**: monthly.
- **Candidate criterion**: a named, launched product (not a "stealth raise") with a reachable
  product surface and ≥1 independent reference (HN/Reddit/竞品报道).

### 3. 量子位 QbitAI, curated AI news + tool roundups

- **URL**: https://www.qbitai.com
- **Polling**: RSS at https://www.qbitai.com/feed (verify on scan). High signal-to-noise, they
  filter aggressively.
- **Signal type**: model releases, tool roundups, benchmark comparisons. Their "盘点" / "实测"
  posts are the closest CN equivalent to a HN tool comparison thread.
- **Cadence**: monthly; bump to weekly if a hot domain has open Chinese-vendor coverage gaps.
- **Candidate criterion**: a "实测" or "盘点" post that names ≥2 tools and gives a verdict,
  use as a multi-tool entry point, not single-tool gospel.

### 4. Geekpark (极客公园), news + interviews + 极客早知道 digest

- **URL**: https://www.geekpark.net
- **Polling**: RSS at https://www.geekpark.net/rss (verify on scan). The "极客早知道" daily
  digest is the most efficient single feed for a quick monthly catch-up.
- **Signal type**: founder interviews, weekly tool/product roundups, China-vs-global angle
  pieces. Lower density than 量子位 but stronger on company-strategy context.
- **Cadence**: monthly (digest only); deep-read interviews opportunistically when a flagged hot
  domain lines up.
- **Candidate criterion**: a founder interview that names the company's actual product/API/MCP
  surface (not just vision talk) → log; pure thought-leadership pieces → skip.

### 5. 十字路口播客, long-form CN AI-builder conversations

- **URL**: Apple Podcasts ("十字路口Crossing") · 小宇宙 app (most-used CN listening surface)
- **Polling**: per-episode show notes on 小宇宙 are public-web readable; full transcripts
  occasionally posted by the hosts. Audio scan via a transcription pass (Whisper / Gemini) when
  a flagged episode warrants, too expensive to run every sweep.
- **Signal type**: 1 to 2 hour conversations with active CN AI builders. Founders frequently
  surface "we're shipping X next month" before product launch, lead time 4 to 12 weeks.
- **Cadence**: monthly headline scan (titles + show notes only); transcribe opportunistically
  when a flagged hot-domain founder appears.
- **Candidate criterion**: a guest claims a shipped or imminently-launching product with a
  reachable artifact → log as WATCH (per D5); pure "我们在想..." → reject.

### 6. 小红书 工具笔记 / DeepSeek 群, too noisy for systematic polling

- **URL**: https://www.xiaohongshu.com (search) · various WeChat / Discord / Telegram DeepSeek
  community groups
- **Polling**: **manual quarterly browse during Horizon scan only**, not in monthly sweeps.
  Density of marketing/affiliate posts makes systematic polling negative-ROI.
- **Suggested CN search terms / hashtags during quarterly browse**:
  - `#DeepSeek工具` / `#DeepSeek API`
  - `#AI工具` / `#国产AI工具`
  - `#MCP` / `#智能体工作流` / `#Coze工作流`
- **Signal type**: occasional surfacing of a niche tool with real CN-user adoption; mostly
  noise, but occasionally the only place a 抖音电商 / 小红书 抓取 tool first appears.
- **Cadence**: quarterly (Horizon scan only).
- **Candidate criterion**: ≥3 distinct posters mentioning the same tool with a reachable
  artifact (repo / website / hosted endpoint) → log as WATCH. Single post → discard.

## Where to log CN candidates

Resolve the destination with the existing DATA resolver and write through
`tools/private_inventory.py` so the final PRIVATE repository is verified.
All CN candidates funnel into `discovery-state.md` in the PRIVATE companion DATA directory under a **NEW subsection**
`## CN candidates (即刻 / 36Kr / 量子位 / 极客公园 / 十字路口 / 小红书)`, kept separate from
the main Watchlist table so a future curator can sanity-check the CN→EN merge without diffing
against existing rows.

**Translation note**: every CN candidate row MUST log both:
- the original CN name (Chinese characters preserved, not pinyin-romanized)
- the closest English equivalent and/or GitHub link (`null` if the tool is fully CN-only with
  no English-language surface)

This keeps the CN pool mergeable with the main candidate pool: a `dedup` pass before
verdict-assignment will catch the case where 即刻 surfaces a tool that GitHub Trending found
the same week under its English name.

## Bridge, when CN-only matters (domains where EN sources alone are insufficient)

Most domains in the matrix can be served from English-speaking sources. The CN sweep exists
because a small set of domains have no EN-language equivalent or have a strict CN-first lead:

1. **抖音 / 抖音电商 intel**, 抖店 open API, 巨量算数 trend data, 飞瓜 / 蝉妈妈 third-party
   dashboards. No serious English-language tool covers 抖音 commerce; vendors and integration
   docs are CN-only.
2. **Bilibili scraping / analytics**, bilibili-api forks, 第三方 数据 dashboards (新榜 / 火烧云
   data). EN sources have stale Bilibili wrappers; the live ones are on Gitee or only mentioned
   on 即刻 / 小红书.
3. **DeepSeek-specific tooling**, function-call wrappers, prompt libraries, MCP servers
   optimized for DeepSeek-V3.x quirks. The DeepSeek tool-use community is CN-dominated; EN
   sources catch only the top 1 to 2 repos.
4. **小红书 抓取 / 投放**, 蒲公英 open data, 千瓜 / 新红 third-party. Hard ToS surface; almost
   all real tooling circulates in WeChat groups / 即刻 before (if ever) appearing on GitHub.
5. **国产模型 API matrix** (Qwen / GLM / 文心 / 通义 / MiniMax / Kimi / Doubao), pricing,
   rate limits, function-calling quirks. Official pricing pages and CN-language SDK docs are
   the only authoritative source; English mirror docs lag and sometimes silently misstate
   limits.

If a user query touches one of the five above, an EN-only Discovery sweep WILL miss the right
tool. Always run a CN pass on these.
