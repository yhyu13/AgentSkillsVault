# Tool: Google Ads Keyword Planner

- **Domain(s):** seo-keywords (also: none)
- **Barrier route:** ① official API · **Source tier:** L1 · **Ready MCP:** no native MCP, accessed via the **DataForSEO wrapper** (which exposes Google Ads keyword data) or the Google Ads API directly
- **Cost:** free (Google Ads API + Keyword Planner are free) [https://ads.google.com, fetched 2026-06]
- **Repo / Provider:** https://ads.google.com (official provider; Google Ads API, no public repo, no first-party MCP)
- **Top pick for its domain:** no (free authoritative volume/CPC, but setup friction is high)

## What it does / when to pick it
Google's own **real search-volume and CPC** data for keywords, the authoritative source third-party tools model *against*. **Decision rule:** pick this when you want **first-party volume/CPC straight from Google for free** and can stomach the setup (Google Ads account + developer token approval). In practice the shard's guidance is **"easier via the DataForSEO wrapper"**, DataForSEO surfaces Google Ads keyword data without you managing a dev-token approval, for a tiny per-query fee. Use the raw Google Ads API only if you already have an approved token or need it inside an existing Ads integration. For your-site traffic use free **GSC**; for keyword *ideas* expansion use free **Google Suggest** (④).

## Install
**No native MCP.** Two routes: (1) **via DataForSEO**, install the DataForSEO MCP and call its Keywords-Data/Google-Ads tools (`reference/volatile/pricing-install.md → web-scraping`); (2) **raw Google Ads API**, requires a Google Ads account + **developer token** + OAuth client, then call the `generateKeywordIdeas` / `generateKeywordHistoricalMetrics` endpoints from your own code. Exact pointers: `reference/volatile/pricing-install.md → seo-keywords`. L0 mechanics (secret hygiene, Windows): `reference/install-guide.md`.

## Auth / keys
Raw API path needs: a **Google Ads account**, a **developer token** (apply in the Ads account → API Center; **basic-access approval can take days and is the main friction**), plus an OAuth2 client/refresh token. Keyword Planner volumes show as **ranges** unless the account has active ad spend (then exact). The DataForSEO route hides all of this behind DataForSEO's own login/password. **Secret hygiene (one line):** dev token + OAuth refresh token are real secrets, keep them in env/config the user fills, never in the transcript; see `reference/install-guide.md`.

## Usage, call examples
Via DataForSEO: call its Google-Ads keyword tool with `keywords` + `location` + `language` → returns `search_volume`, `cpc`, `competition`. Raw API: `KeywordPlanIdeaService.GenerateKeywordIdeas` with a seed keyword/URL and geo/language constants → keyword ideas with avg monthly searches and competition. Minimal goal either way: seed term → volume + CPC + competition.

## General experience & gotchas (踩坑)
- **"Free but easier via DataForSEO wrapper"** (shard), the data is free, the *raw* setup (dev-token approval, OAuth dance) is the real cost; for most agent tasks the small DataForSEO fee buys you out of that friction.
- **Volume is bucketed into ranges** ("1K to 10K") for accounts without sufficient ad spend, not exact monthly numbers. Don't present ranges as precise.
- **Dev-token approval latency**, basic access can take days; you cannot pull data the moment you decide to. Plan ahead or use the DataForSEO route to skip it.
- **Quotas/rate limits** apply to the Ads API; basic access is capped. Bulk keyword pulls may need standard-access approval.
- Geo/language are passed as **Google geo-target constants**, not free-text country names, wrong constant → wrong or empty data.

## Failure signals & fallback
Failure looks like: dev-token "pending approval" / `DEVELOPER_TOKEN_NOT_APPROVED`, OAuth/auth errors, range-only volumes, or quota errors on bulk pulls. **Fallbacks:** skip all setup → pull the same Google Ads keyword data **via DataForSEO** (②, ~$0.0006/query); keyword-idea expansion with zero setup → **Google Suggest** (④, free no-key); your-site real query data → **GSC** (①); broad paid volume + difficulty → **SE Ranking** / **Semrush** (①).

## Last verified: 2026-06
