# Tool: Stack Exchange API (raw REST)

- **Domain(s):** reddit-community (also: frontier-research for dev-trend signals)
- **Barrier route:** ① official · **Source tier:** L1 · **Ready MCP:** no, plain REST API
- **Cost:** free; with App-registered key the rate limit jumps **300 → 10,000 req/day per IP**
- **Repo / Provider:** https://api.stackexchange.com/docs (official Stack Exchange v2.3 API)
- **Top pick for its domain:** no (mcp-hn covers HN better for tech-news pulse; Stack
  Exchange is for developer-community question-volume + tag-trend signals)

## What it does / when to pick it

Stack Exchange API exposes all 175+ network sites' questions, answers, tags, users, votes,
revisions. **Decision rule:** pick this when the research question is *"what are developers
asking / arguing about in topic X right now"*, tag-volume trend (`?tagged=rust&fromdate=...`),
top answered/unanswered, accepted-answer churn. Cross-serves into **frontier-research**
when you want practitioner adoption signal on a tech stack that hasn't shown up in arxiv
yet. Stick with **mcp-hn** for HN front-page pulse and **reddit-mcp-buddy** for broader
developer chatter.

## Install

This card covers the **direct REST route**. For an optional community MCP wrapper, see
[stack-overflow-mcp](stack-overflow-mcp.md); its low adoption warrants caution, and its
selected operation must be verified in the current host/session before use. Catalog
presence does not establish availability. For direct REST, register an App at https://stackapps.com to get an
**API key** (NOT OAuth). Without the key your IP gets 300 req/day; with it the limit
jumps to 10k req/day. No SDK needed; `curl` + `jq` or `requests` works.

```bash
# Register app: https://stackapps.com → Apps → Register an Application
# Domain field accepts a placeholder URL (your project github page is fine).
# Name field becomes visible to other Stack Apps users.
# After register: the page shows your API Key (~28 chars, prefix "rl_").
```

L0 mechanics: `reference/install-guide.md`. L1 commands: `reference/volatile/pricing-install.md → reddit-community`. No `claude mcp add` needed.

## Auth / keys

Single API key passed as `?key=` query param on every endpoint:

```bash
curl "https://api.stackexchange.com/2.3/info?site=stackoverflow&key=$STACKEXCHANGE_API_KEY"
# → JSON with quota_remaining + total stats
```

**Secret hygiene** (key-bearing): the key is shown **once** in the registration dialog;
copy via the page's Copy button (Stack Apps masks all but last 4 chars in the listing
afterward). Store in `secrets/stackexchange.env` (companion config). No rotation
cooldown, regenerate any time.

## Usage, call examples

```bash
# Trending questions in a tag
curl "https://api.stackexchange.com/2.3/questions?tagged=rust&order=desc&sort=hot&site=stackoverflow&key=$KEY"

# Tag metadata + question count
curl "https://api.stackexchange.com/2.3/tags/rust/info?site=stackoverflow&key=$KEY"

# Current popular tags by cumulative question count (no weekly window)
curl "https://api.stackexchange.com/2.3/tags?order=desc&sort=popular&pagesize=30&site=stackoverflow&key=$KEY"
```

Pagination via `page=` + `pagesize=` (max 100). Filters via the `filter=` param, use
`!*x*` for sparse "give me everything" set; the API's filter system is its biggest
gotcha (see below).

The popular-tags request supplies no weekly window or trend comparison. Weekly trend
claims require dated question counts, a stated window and pagination coverage, plus a
comparison window for growth or velocity.

## General experience & gotchas (踩坑)

- **Key raises rate limit 33×** (300 → 10k/day/IP), verified 2026-06-16. Worth registering even for one-off
  research; takes < 5 min.
- **Filter system is opaque**, to control which fields a response includes you build a
  filter via `/filter/create` first, then pass it as `&filter=<filter-id>`. The default
  filter strips half the useful fields. Easier: use `!*x*` (the default unsafe filter)
  for exploratory queries, or use the official filter playground.
- **Quota is reset daily, not rolling**, once you blow through 10k, no requests until
  midnight UTC. The `quota_remaining` field on every response is your single source of
  truth, log it and back off well before zero.
- **`backoff` field on responses**, if you spike the request rate, the API sets a
  `backoff` field (in seconds) and you MUST wait that long or the next request 503s.
  Respect it.
- **Throttling per IP, not per key**, if you're sharing an IP (corp NAT, mobile network),
  someone else burning quota on the same IP can starve you. The key just raises the
  ceiling.
- **"site" param is mandatory** for most endpoints, `stackoverflow`, `serverfault`,
  `superuser`, `unix`, `apple`, `gaming`, etc. Use `/sites` to enumerate (170+ exist).

## Failure signals & fallback

- HTTP 502/503 → temporary, retry after `backoff` field's value.
- `quota_remaining: 0` → wait until next UTC midnight or rotate to a fresh key (per the
  IP-not-key throttling note, this only helps if you also move IPs).
- Missing fields on response → wrong `filter` value; switch to `!*x*` or build a new filter.

**Fallbacks:**
- HackerNews instead of Stack Overflow → **mcp-hn** (shard reddit-community top free pick).
- Reddit dev-subreddit signal → **reddit-mcp-buddy** with verified app-id/login access or demonstrated anonymous recovery; without Reddit credentials, use **reddit-research-mcp** after hosted OAuth and operation verification.
- arxiv preprint pulse → frontier-research arxiv MCP.

## Last verified: 2026-06
