# Tool: Semrush One MCP

- **Domain(s):** seo-keywords (also: none)
- **Barrier route:** ① official API · **Source tier:** L1 · **Ready MCP:** yes, official Semrush One MCP (needs Pro+ subscription)
- **Cost:** consumes your paid Semrush plan, entry **Pro ~$140/mo** (annual ~$117), **Business ~$299/mo** (shard); price unverified by fetch 2026-06 (pricing page JS-gated), confirm at https://www.semrush.com/pricing/
- **Repo / Provider:** https://www.semrush.com (official provider; hosted MCP, no public repo)
- **Top pick for its domain:** no (broad coverage, but mid-to-high cost vs SE Ranking / DataForSEO)

## What it does / when to pick it
Full-stack SEO/competitor toolkit over MCP, keyword volume & difficulty, organic/paid competitor research, domain overview, position tracking, and site audit. **Decision rule:** pick Semrush when you want **one mature, broad platform** covering keywords + competitors + audit and the client already pays for it. If you're choosing fresh on value, **SE Ranking** (shard: "best pro-tier value", 160+ tools + ready Claude Skills, 14-day 100k-credit trial) usually wins; for **backlink depth** go **Ahrefs**; for **cheap bulk SERP/keywords** go **DataForSEO**; for **your own site** go free **GSC**.

## Install
Hosted MCP tied to your Semrush account/API. Exact add command + the price tiers: `reference/volatile/pricing-install.md → seo-keywords`. Prefer the HTTP form on Windows (L0). L0 transport/secret/Windows mechanics: `reference/install-guide.md`. Restart / `/mcp` reconnect after adding.

## Auth / keys
Requires an active **Semrush Pro plan or higher** plus API access (API/units are gated to paid tiers, **no free tier**). Get the key from your Semrush account settings. **Secret hygiene (one line):** don't `browser_snapshot` the key page or paste the key into the transcript; copy → write into `~/.claude.json` from clipboard, not `claude mcp add` (echoes the header). See `reference/install-guide.md`.

## Usage, call examples
MCP exposes Semrush data tools: keyword overview (volume, KD, CPC, intent), competitor/organic research for a domain, domain-vs-domain gap, and position tracking. Minimal: a keyword-overview tool taking `phrase` + `database` (country) → returns volume, difficulty, CPC, competitive density. **Pull only the metric you need per call** to conserve API units.

## General experience & gotchas (踩坑)
- **History = 5× units** (shard), historical/trend pulls burn ~5× the API allowance of a current-snapshot call. Default to current data; request history deliberately.
- **The MCP doesn't bill separately, it eats your plan's API units** (shard's "real cost = plan tier, not the MCP"). A plan that's out of units = tools fail mid-research, not at connect time.
- **Pro vs Business tiers gate features/limits**, some endpoints and higher row limits require Business (~$299); a Pro key may 403 on a Business-only tool. Confirm the tier covers what you're calling.
- Country **`database` parameter matters**, volume/CPC are per-country; omitting/defaulting it silently returns US data.
- Verify the **current** Pro/Business prices at the official page before quoting, the shard's ~$140/~$299 figures rot and could not be re-fetched 2026-06 (JS-gated page).

## Failure signals & fallback
Failure looks like: 401/403 (key/plan tier), units-exhausted errors mid-session, or unexpectedly US-only data (missing `database`). **Fallbacks:** better value broad coverage → **SE Ranking** (①, trial credits, Claude Skills); backlinks → **Ahrefs** (①); cheap bulk SERP/keywords → **DataForSEO** (②); free your-site traffic → **GSC** (①); free self-host SERP → **SearXNG** (④).

## Last verified: 2026-06
