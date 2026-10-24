# Tool: towfiqi/serpbear

**Runtime storage status: setup only.** No shipped adapter admits this tool's
complete file output. Do not launch collection, login or persistence until every
child-file write meets the [external-tool storage requirements](../../../../DATA.md#external-tool-storage).
`resolve_directory` alone does not authorize writes; examples below are setup guidance.

- **Domain(s):** seo-keywords (also: none)
- **Barrier route:** ④ self-host · **Source tier:** L4 · **Ready MCP:** no, self-hosted web app + REST API; drive via its API or UI
- **Cost:** free (self-host; optional paid scraper add-on) [github.com/towfiqi/serpbear, gh-api 2026-06]
- **Repo / Provider:** github.com/towfiqi/serpbear, towfiqi/serpbear (2.0k★, gh-api 2026-06; MIT, last push 2026-05-14, active)
- **Top pick for its domain:** yes, the free-route default *pairing* for rank tracking alongside SearXNG (★ in index)

## What it does / when to pick it
SerpBear is a self-hosted **keyword rank tracker**: add domains + keywords, and it records daily SERP position over time with email/Slack/webhook alerts and a small REST API. It **replaces paid rank-monitoring** (the rank-tracking slice of Semrush/SE Ranking/Ahrefs) at zero subscription cost. Pick it when the deliverable is "track where my/competitor keywords rank over days/weeks", not one-off SERP pulls. For ad-hoc SERP scraping use SearXNG; for search *volume*/difficulty/backlinks use DataForSEO/SE Ranking/Ahrefs (SerpBear tracks position only). It pairs naturally with SearXNG, which can act as its scraping backend.

## Install
Before any real run, resolve the full consumer checkout and use
`tools/private_inventory.py`'s `resolve_destination(path=...)` for individual
config/output files and `resolve_directory(path=...)` for existing runtime or
browser-profile directories. Pass the final absolute path. Each check resolves the
containing Git worktree, including a repository rooted at the directory itself,
and refuses destinations outside it or inside this checkout. Stop when it fails.
Keep runtime files versioned in that PRIVATE companion. An ignored directory in
this public checkout is not a valid destination. A later real run must repeat the
check; this recipe is not a live destination attestation.

Use the upstream Docker image from the PRIVATE runtime directory. Bind an
absolute PRIVATE host data directory to `/app/data`; do not derive the
mount from the caller's current working directory. Store credentials in the
approved PRIVATE configuration and supply them without echoing values. Confirm
the upstream image's current environment and persistence contract before launch.
Then open the local UI, configure a scraper and inspect operation results.

## Auth / keys
App login is `USER`/`PASSWORD`; the REST API uses the self-generated `APIKEY` header (you set it at deploy time). The **SERP scraping backend** is separate: SerpBear needs a source to read Google positions, either a paid scraper (ScrapingRobot/SerpApi/SpaceSerp key) or **point it at your self-hosted SearXNG** to stay fully free. Treat the app credentials, self-generated API key and backend keys as secrets. Use the selected companion credential mode: Mode A permits PRIVATE versioning; Mode B keeps credential values outside Git. Never copy them into the public source, screenshots or transcripts. See [secret-handling guidance](../install-guide.md) and the [credential-mode contract](../../../../CONFIG.md).

## Usage
Read tracked keywords with the documented `/api/keywords` endpoint using a
no-echo authenticated client. Save the response only to the PRIVATE
report path. It contains keyword positions, dated history, URLs and timestamps.
Adding keywords through POST is a separate state-changing operation.

## General experience & gotchas (踩坑)
- **No scraper = no data.** SerpBear itself does NOT scrape; out of the box positions stay blank until you wire a scraping source. The free path is to set SearXNG/your scraper as the backend, otherwise you're back to a paid SERP key, defeating the free-route purpose.
- **Google throttling hits the backend, not SerpBear.** If positions stop refreshing, the failure is in the scraper/proxy layer (CAPTCHA, IP block), not the app. Add proxies at volume.
- **Daily cadence only**, it's a tracker, not a real-time SERP API. Don't use it for one-shot lookups (use SearXNG/playwright for those).
- Self-generated `SECRET`/`APIKEY` must be set or auth/sessions misbehave; keep them stable across restarts or you lock yourself out.
- Mobile vs desktop and country/locale must be set per keyword; mismatched locale silently tracks the wrong SERP.

## Failure signals & fallback
Blank/stale positions, or alerts never firing = scraper backend down or unconfigured (check the scraper key/SearXNG endpoint). If rank history is the goal and self-host is too much upkeep, fall back to a paid rank tracker (**SE Ranking** 14-day trial, or **Semrush** Pro). For one-off SERP pulls instead of tracking, use **SearXNG** (④) or **playwright MCP**.

## Last verified: 2026-06
