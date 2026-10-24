# Tool: SerpApi (MCP)

- **Domain(s):** seo-keywords (also: trends-discovery)
- **Barrier route:** ② resale API · **Source tier:** L2 · **Ready MCP:** yes (key)
- **Cost:** **free 250 searches/mo**; Starter **$25/mo (1,000)**, Developer $75 (5k), Production $150 (15k), Big Data $275 (30k) [https://serpapi.com/pricing, fetched + confirmed 2026-06]
- **Repo / Provider:** https://serpapi.com (official provider; hosted API/MCP, no public repo)
- **Top pick for its domain:** no (clean structured SERP/Trends JSON, but pricey at scale)

## What it does / when to pick it
Returns structured JSON from many search engines, Google/Bing organic + features, plus **Google Trends**, with the anti-bot/parsing handled for you. **Decision rule:** pick SerpApi for **clean, low-volume, multi-engine SERP or Google Trends JSON** where reliability-per-call matters more than unit cost, e.g. a few ranked-result or Trends pulls in an agent flow. At any **volume** it gets expensive fast (the shard's recurring warning); for bulk SERP use **DataForSEO** (~1/10 the unit cost), and for **zero-cost** SERP self-host **SearXNG** (④). Its **trends-discovery** cross-use (Google Trends JSON) is its other strong card.

## Install
Hosted API with an MCP wrapper (key-based). Exact add command + the free-250 note: `reference/volatile/pricing-install.md → seo-keywords`. Prefer the HTTP form on Windows (L0). L0 transport/secret/Windows mechanics: `reference/install-guide.md`. Restart / `/mcp` reconnect after adding.

## Auth / keys
Sign up at serpapi.com → private API key. **Free tier = 250 searches/mo** (confirmed at pricing page 2026-06; up from the old ~100). Paid plans add throughput-per-hour caps on top of monthly search counts. **Secret hygiene (one line):** keep the key out of the transcript, write it into `~/.claude.json` from clipboard rather than `claude mcp add`, and don't `browser_snapshot` the key page. See `reference/install-guide.md`.

## Usage, call examples
MCP/REST takes an `engine` (e.g. `google`, `google_trends`, `bing`) plus query params (`q`, `location`, `hl`, `gl`) and returns parsed JSON, `organic_results`, `related_searches`, `answer_box`, or Trends `interest_over_time`. Minimal: `engine=google_trends&q=<term>` → time-series interest JSON. One search = one credit against your monthly quota.

## General experience & gotchas (踩坑)
- **Pricey at scale** (shard, repeated), 250 free/mo is fine for ad-hoc, but a rank-tracking or large-keyword job blows through the free tier and Starter ($25/1k) quickly. **DataForSEO is ~10× cheaper per query** for bulk.
- **Per-hour throughput cap**, not just monthly count, a burst of parallel calls can 429 even with monthly quota remaining; pace requests.
- **One credit per search**, and each `engine`/page is a separate search, paginating SERP or scanning many keywords multiplies cost silently.
- **Google Trends via SerpApi** is the stable paid path now that **pytrends is archived (429s)**, for free Trends, OSS `trendspy`/`trendspyg` exist (④) but are flakier.
- Results are **point-in-time** SERP, rankings drift; for ongoing rank monitoring self-host **serpbear** (④) instead of re-billing SerpApi.
- **Google OAuth signup is clean BUT key release requires email + phone verify** (confirmed 2026-06-16), `serpapi.com/users/sign_up` accepts Google OAuth without captcha. Account lands on `/users/welcome` with "Free Plan" selected, then `Check your inbox to verify your email`. **API key does NOT issue until both email confirmation link AND phone number are verified.** Free plan is non-commercial only, Starter $25/1k for any paid/commercial use.
- API key page at `/manage-api-key`. Format is 64-char hex.

## Failure signals & fallback
Failure looks like: 401 (bad key), 429 (hourly throughput or monthly quota hit), or empty parsed sections when a SERP feature isn't present. **Fallbacks:** bulk/cheap SERP → **DataForSEO** (②, ~$0.0006/query); free SERP at zero cost → self-host **SearXNG** (④) or `ddgs`; ongoing rank tracking → **serpbear** (④); your-site real data → **GSC** (①); free Trends → `trendspy`/`trendspyg` (④, less reliable than SerpApi's Trends JSON).

## Last verified: 2026-06
