# Tool: ahonn/mcp-server-gsc (Google Search Console)

- **Domain(s):** seo-keywords (also: none)
- **Barrier route:** ① official API · **Source tier:** L1 · **Ready MCP:** yes, `npx -y mcp-server-gsc` (stdio)
- **Cost:** free (GSC API is free) [https://github.com/ahonn/mcp-server-gsc, fetched 2026-06]
- **Repo / Provider:** github.com/ahonn/mcp-server-gsc, `ahonn/mcp-server-gsc (223★, gh-api 2026-06)`; active (pushed 2026-02, not archived, no SPDX license declared, verified gh-api 2026-06)
- **Top pick for its domain:** yes

## What it does / when to pick it
Reads **your own verified site's** real Search Console data, actual clicks, impressions, CTR, and average position by query / page / country / device, straight from Google's free API. **Decision rule:** this is the FIRST pick in seo-keywords whenever you (or the client) own/control the site, because it is ground-truth your-traffic data that no third-party estimator (Ahrefs/Semrush volume models) can match, and it's free. It only sees sites you have GSC access to, for *competitor* or *unowned* keyword/SERP intel it tells you nothing; switch to DataForSEO / SE Ranking / SearXNG for that.

## Install
Stdio MCP: `npx -y mcp-server-gsc`. Exact command + the OAuth/service-account note live in `reference/volatile/pricing-install.md → seo-keywords`. Stdio is flaky on Windows (path/shell), see L0; test in a plain shell first, and pass the service-account JSON path as an absolute path. L0 mechanics (transport, secret hygiene, Windows UTF-8 `~/.claude.json`): `reference/install-guide.md`. Restart / `/mcp` reconnect after adding.

## Auth / keys
Google OAuth **or** a **service-account JSON key file** (the service-account route is simpler for a server/agent, no interactive browser consent). Create the service account in Google Cloud Console, enable the Search Console API, then add the service-account email as a *user* on the target property in GSC (Settings → Users and permissions). **Secret hygiene (one line):** the JSON key is a real credential, point the MCP at its file path via env/config, never paste its contents into the transcript; edit `~/.claude.json` from clipboard rather than `claude mcp add`. See `reference/install-guide.md`.

## Usage, call examples
MCP exposes GSC Search Analytics query tools: pass `siteUrl` (e.g. `https://example.com/` or `sc-domain:example.com`), a date range, and `dimensions` (`query`, `page`, `country`, `device`). Minimal: query top queries for the last 28 days ordered by clicks → returns rows of `{query, clicks, impressions, ctr, position}`. Also lists your verified sites and (depending on version) submits/inspects sitemaps.

## General experience & gotchas (踩坑)
- **`siteUrl` format is finicky**, a URL-prefix property needs the exact protocol + trailing slash (`https://example.com/`); a Domain property needs the `sc-domain:example.com` form. Wrong form → empty result, not an error.
- **GSC data lags ~2 to 3 days** and the freshest day is partial, don't read yesterday as final.
- **Data is sampled/row-capped** for very high-traffic dimensions; "(other)" buckets the long tail. For exhaustive query lists, page through with date sub-ranges.
- **Only your verified properties**, the single most common confusion is expecting competitor data; it cannot do that by design.
- Service-account email must be **explicitly added** to the property or every call returns 403/empty.
- 16-month max history (Google's retention), not "all time."

## Failure signals & fallback
Failure looks like: empty rows (wrong `siteUrl` form or missing permission), 403 (service account not added to the property), or `! Needs authentication` in `claude mcp list` (bad/expired key path). **Fallbacks:** you don't own the site / need competitor or external keyword + SERP data → **DataForSEO** (② cheap bulk) or **SE Ranking** (① Claude-friendly); free self-host SERP → **SearXNG** (④); keyword *ideas* expansion → **Google Suggest** (④, free).

## Last verified: 2026-06
