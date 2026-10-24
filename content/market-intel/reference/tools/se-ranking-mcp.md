# Tool: SE Ranking MCP

- **Domain(s):** seo-keywords (also: none)
- **Barrier route:** ① official API · **Source tier:** L1 · **Ready MCP:** yes, hosted HTTP `https://api.seranking.com/mcp` (+ 7 ready Claude Skills)
- **Cost:** consumes your SE Ranking plan; **14-day trial with 100k credits** (shard); ongoing price unverified by fetch 2026-06 (pricing page returned 404 to fetch), confirm at https://seranking.com/
- **Repo / Provider:** https://seranking.com (official provider; hosted MCP, no public repo)
- **Top pick for its domain:** no per matrix, **but shard's "best pro-tier value"**, the preferred paid pick when a pro toolkit is needed

## What it does / when to pick it
160+ SEO tools over MCP, keyword research (volume/difficulty), rank tracking, competitor research, backlink and audit data, plus **7 ready-made Claude Skills**, which makes it the most agent-friendly of the paid SEO platforms. **Decision rule:** when the task needs a **broad paid SEO toolkit** and you're choosing on value, SE Ranking is the shard's default paid pick ("best pro-tier value"), cheaper coverage than Semrush, more breadth than a single-purpose tool, and a generous trial to validate before paying. Go **Ahrefs** instead only for backlink depth; **DataForSEO** for raw cheap bulk SERP; **GSC** (free) for your own site.

## Install
Hosted HTTP endpoint: `https://api.seranking.com/mcp`. Set its `X-Api-Key` through
the selected host's supported secret settings with a user-side or approved no-echo
transfer. Never put the key in an MCP-add command. Activate the host connection
and verify the selected operation. Provider skills install separately.
See `reference/install-guide.md`; recheck current pricing before signup.

## Auth / keys
SE Ranking account → API key, passed as the **`X-Api-Key` header**. The **14-day trial includes 100k credits**, enough to fully validate before committing to a plan. **Secret hygiene (one line):** the API key is secret-bearing, write the `X-Api-Key` header into `~/.claude.json` from clipboard, NOT via `claude mcp add` (which echoes the header into the transcript); never `browser_snapshot` the key page. See `reference/install-guide.md`.

## Usage, call examples
HTTP MCP exposes tools across keyword research, rank tracking, competitor analysis, backlinks, and audit. Minimal: a keyword-data tool taking `keyword` + region → returns volume, difficulty, CPC, and SERP features. The bundled Claude Skills wrap common workflows (e.g. competitor overview, audit) so the agent can call a skill rather than orchestrate raw tools.

## General experience & gotchas (踩坑)
- **Credit-metered, not per-tool-billed** (shard's "MCP consumes your subscription quota"): the 100k trial credits deplete with use, heavy rank-tracking/history pulls eat them fastest. Validate the integration early in the trial window.
- **14-day clock** is the real constraint, the trial expires by date even with credits left; plan the evaluation, don't let it lapse unused.
- **160+ tools can flood** the agent's tool list; lean on the 7 ready Claude Skills (or pin the few tools you need) to keep context tight.
- **`X-Api-Key` header, not a bearer token**, wrong header name = 401; copy the header spec exactly.
- Region/database parameter governs volume & SERP locale, set it explicitly.
- Ongoing plan price could not be re-fetched 2026-06 (pricing page 404'd to the fetcher), confirm current tiers at the official site before quoting the user.

## Failure signals & fallback
Failure looks like: 401 (wrong/missing `X-Api-Key`), credit-exhausted or trial-expired errors, or `! Needs authentication` in `claude mcp list`. **Fallbacks:** backlink depth → **Ahrefs** (①); broad platform the client already owns → **Semrush** (①); cheap bulk SERP/keywords → **DataForSEO** (②); free your-site data → **GSC** (①); free self-host SERP + rank tracking → **SearXNG** + **serpbear** (④).

## Last verified: 2026-06
