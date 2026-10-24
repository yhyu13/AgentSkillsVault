# Tool: arctic-shift

- **Domain(s):** reddit-community
- **Barrier route:** ③ self-host scrape · **Source tier:** free (no key) · **Ready MCP:** no (raw repo + hosted web UI + JSON API)
- **Top pick for its domain:** yes, for *historical* Reddit (the live-API picks cover current data only)

## What it does / when to pick it
Pushshift successor: bulk historical Reddit dumps plus a JSON API plus a hosted web UI (arctic-shift.photon-reddit.com), refreshed roughly monthly. **Decision rule:** pick when you need historical Reddit data beyond what the live Reddit API exposes, anything more than ~30 days back, deleted/removed content, or bulk dump access for a subreddit/user. For *current* threads and live monitoring, use a live-API route (e.g. reddit-mcp-buddy) instead; arctic-shift's freshness lags by weeks, not minutes.

## Install
Install: <TODO: confirm install method>, see https://github.com/ArthurHeitmann/arctic_shift.
Three usage modes, in order of effort:
1. **Hosted web UI**, https://arctic-shift.photon-reddit.com (zero install, fastest for ad-hoc lookups).
2. **JSON API**, call the hosted endpoints from a script (see repo README for current paths).
3. **Self-host / bulk dumps**, clone the repo and follow its scripts to ingest the monthly dumps locally for large-scale queries.

## Auth / keys
**Free, no key.** Hosted UI and JSON API are open; the bulk dumps are published downloads. No Reddit OAuth needed (that's what makes it useful, bypasses the live-API rate limits and historical gaps).

## Usage, call examples
- **Web UI:** open https://arctic-shift.photon-reddit.com, filter by subreddit / author / date range / keyword.
- **JSON API:** `curl 'https://arctic-shift.photon-reddit.com/api/posts/search?subreddit=<name>&limit=100'` (confirm exact path against the repo README, schema evolves with monthly commits).
- **Bulk dumps:** clone repo, run the dump-ingestion scripts against the monthly archives for offline querying.

## General experience and gotchas (踩坑)
- **Freshness lags weeks, not minutes.** Schema/dump commits land monthly (Feb to Jun 2026 cadence verified), this is a historical archive, not a live feed. Pair with a live-API tool when you need both halves.
- **Solo maintainer (Arthur Heitmann).** 1131 stars, active commits, but no team behind it, treat as best-effort. Mirror anything mission-critical.
- **Hosted endpoints are a courtesy.** The web UI and JSON API run on the maintainer's infra; for sustained or heavy automated pulls, self-host the dumps rather than hammering the public endpoint.
- **No MCP wrapper exists.** Call the JSON API directly from a subagent, or shell out to the repo's scripts, don't waste time hunting for an MCP package.
- **Schema can shift between monthly dumps.** Field names and dump layouts have evolved; re-check the README before parsing a new month's data, especially for downstream pipelines.

## Last verified: 2026-06
