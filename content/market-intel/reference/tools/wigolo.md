# Tool: wigolo (local-first search + fetch + crawl + extract over one MCP)

- **Domain(s):** web-scraping (also: browser-automation)
- **Barrier route:** ③/④ · **Source tier:** L2 · **Ready MCP:** **yes**, the project *is* an MCP server (also REST + SDK); listed in the official MCP registry as `io.github.KnockOutEZ/wigolo`
- **Cost:** open-source core tools; upstream describes local reranker and embedding models. Model execution and private persistence require the verified setup described below.
- **Repo / Provider:** github.com/KnockOutEZ/wigolo, `KnockOutEZ/wigolo (5.1k★, gh-api 2026-09-06)`, not archived, pushed 2026-09-06, created 2026-04-12, 411 forks / 21 watchers / 60 open issues. **AGPL-3.0** (the gh API reports `NOASSERTION` because the LICENSE file opens with a project header, but the body reads "GNU Affero General Public License version 3", verified in the LICENSE blob 2026-09-06)
- **Top pick for its domain:** no. Bright Data ② remains the barrier-breaker and Tavily/Exa ② remain the search picks for hard/managed work; wigolo is the shard's first **free, keyless search** row

## What it does / when to pick it
One MCP surface for the whole read-the-web loop: **search, fetch, crawl, extract, cache, find-similar, research** and autonomous gather loops. Search fans one call out across **18 engine adapters in parallel**, fuses the rankings, then reranks on-device, with a SearXNG fallback behind it. Fetching escalates HTTP → headless only when a page needs it.

**Decision rule:** reach for wigolo when you want a search layer that costs nothing per query and needs no key, especially for high-volume or exploratory querying where Tavily's free tier (1,000 credits/mo) runs out mid-task. Keep **Tavily/Exa ②** where you want a managed SLA or their specific ranking, and go to **Bright Data ②** the moment the target is a real anti-bot wall (see below, wigolo labels those rather than solving them).

## Install
First inspect the installed version's supported runtime, model, browser-profile and
cache path settings. Redirect real query history, cached pages, profiles, traces and
outputs into PRIVATE versioned DATA before initialization or collection.
A loose home directory is not an approved persistence destination. No supported path
adapter is supplied or verified by this card; if the required paths cannot be
redirected, stop at setup. Do not treat an unattended initializer as harmless.

All model or external-agent work must use installed `llmcall` with its current routing,
model, timeout and fallback policy. This includes model-dependent reranking, embedding
or research modes. Verify an actual installed-version adapter and its tool-I/O contract
before using those modes; otherwise keep them at setup. A deterministic operation is
usable only after confirming that its installed configuration performs no model work
and respects the private persistence contract.

⚠ **The npm channel lags the repo.** npm `wigolo` is pinned at **0.2.1, published 2026-07-19** (registry checked 2026-09-06) while the repo was pushed 2026-09-06, roughly seven weeks of drift. If you need a recent fix, install from source rather than npm.

## Auth / keys
Upstream describes keyless core search, but search requests still contact external
sources and optional engines or proxies may require credentials. Keep those credentials
in approved PRIVATE configuration. Keyless operation does not make query history public.

## Usage, call examples
After the required private storage and model checks pass, discover callable tools in
the active host and verify one selected read-only operation and its returned fields.
Installation alone does not establish exposure or content validity. Inspect the
installed version's `docs/tools.md` for response contracts and preserve source failures,
challenge responses and partial coverage in the research report.

## General experience & gotchas (踩坑)
> Not yet exercised in a live market-intel run. The notes below come from the repo's own README/LICENSE and the npm registry, all fetched 2026-09-06; harden them with a `live-runs.jsonl` entry after first real use (R4).
- **It labels barriers, it does not break them.** When a bot-protected page can't be read you get a `blocked_by_challenge` failure rather than a challenge shell returned as content (README §116). That honesty is a feature, but it means **Cloudflare/DataDome targets still belong to Bright Data ②**. The shard's 2026-06 real-run lesson (Amazon returns HTTP 500 to firecrawl/WebFetch) is exactly the class wigolo will label.
- **IP reputation is still yours.** The README warns self-hosters plainly: challenge-protected sites score IP reputation, so a datacenter IP won't clear a wall a home connection would. Same ④ split as patchright/Scrapling, these tools fix the client, not your address. The opt-in proxy answer is in the repo's self-hosting guide.
- **Public beta, one maintainer.** Contribution is ~98% single-author and there are 60 open issues against 5.1k★. Treat it as promising infrastructure you can read, not as something with an SLA.
- **The crawl/fetch half overlaps crawl4ai ③.** The genuinely non-duplicative part is the free search layer; don't add both to a pipeline just to have them.

## Failure signals & fallback
Failure looks like `blocked_by_challenge` on the target, engines reported as failed in the response, or results the scorer flags as junk. **Escalation ladder:** (1) add a residential proxy per the self-hosting guide if the wall is IP-reputation based; (2) for a page that is barrier-blocked rather than merely JS-heavy, hand it to **Bright Data Web Unlocker** (②, free 5k/mo, no card), which absorbs fingerprint *and* IP; (3) for stealth self-host scraping specifically, **Scrapling** (③④) actually solves Turnstile/Interstitial where wigolo labels it; (4) if you need a managed search SLA or a specific ranking, fall back to **Tavily/Exa ②**.

## Last verified: 2026-09
