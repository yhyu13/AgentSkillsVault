# Tool: facundoolano/google-play-scraper

- **Domain(s):** trends-discovery (also: browser-automation)
- **Barrier route:** ③ self-host scrape (no accounts/proxies needed at small scale) · **Source tier:** L4 · **Ready MCP:** no, it's an npm library; for a ready MCP wrapping both stores use **mobile-store-scraper-mcp**
- **Cost:** free, no key, no quota (npm lib; you only pay if you add proxies at scale) [npm: google-play-scraper, fetched 2026-06]
- **Repo / Provider:** github.com/facundoolano/google-play-scraper, `facundoolano/google-play-scraper (2.9k★, gh-api 2026-06)`; MIT, not archived, active (pushed 2026-05-31)
- **Top pick for its domain:** no (free workhorse for the app-store sub-slice, but not the domain default)

## What it does / when to pick it
Node library that scrapes the Google Play Store: app details, full descriptions, ratings/histogram, reviews (paged), price, install counts, developer apps, similar apps, search, and category/collection top charts. **Decision rule:** pick this when the task is Android-app intel, pull a competitor's reviews for pain-point mining, track ratings/installs over time, or rank a category. Pair with **app-store-scraper** (same author, sibling repo) for the iOS side; or use **mobile-store-scraper-mcp** if you want one ready MCP covering both stores. For paid *download/revenue estimates* you need **Sensor Tower** (pricey ST sub), this scraper gives public-facing fields only.

## Install
`npm i google-play-scraper` (Node ≥18). It's a **library, not an MCP**, call it from a small script, or via a self-hosted MCP wrapper (mobile-store-scraper-mcp). No key, so no secret hygiene needed. See the volatile L1 line `reference/volatile/pricing-install.md → trends-discovery` (`npm i google-play-scraper app-store-scraper`, free). On Windows, plain `npm i` + a node script is fine (no stdio-MCP path quirks). L0 mechanics: `reference/install-guide.md`.

## Auth / keys
None. No API key, no account, no quota. The hidden cost only appears at scale: heavy scraping needs rotating proxies (Google may rate-limit/block an IP). No secret to leak → secret-hygiene script does not apply.

## Usage, call examples
```js
async function main() {
  const gplay = require('google-play-scraper');
  await gplay.app({ appId: 'com.whatsapp' });                     // full details
  await gplay.reviews({ appId: 'com.whatsapp', sort: gplay.sort.NEWEST, num: 200 });
  await gplay.search({ term: 'meditation', num: 50, country: 'us' });
  await gplay.list({ collection: gplay.collection.TOP_FREE, category: gplay.category.HEALTH_AND_FITNESS });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```
(Newer versions ship ESM/named exports, check the installed version's README; the API surface is otherwise stable.)

## General experience & gotchas (踩坑)
- **It's an unofficial scraper of public HTML/JSON, Google can change markup or throttle anytime.** A working call can start returning empty/partial fields after a Play Store layout change; pin a version and verify a live call before trusting a batch.
- **Reviews are paginated and capped**, you can't pull unlimited history; use `paginate`/`nextPaginationToken` and expect Google to cut off deep history. For longitudinal review mining, snapshot over time rather than expecting full backfill.
- **`country`/`lang` matter a lot**, install counts, ratings, and review sets differ per locale. Always set `country` explicitly; the default may not be your target market.
- **Rate-limit / IP block at volume**, small runs from one IP are fine; bulk runs (hundreds of apps, thousands of reviews) need proxy rotation or you'll get blocked (manifests as timeouts / empty responses, not a clean error).
- **Install counts are bucketed** ("1,000,000+"), never exact, fine for order-of-magnitude, useless for precise MAU. For real download/revenue estimates you need a paid panel (Sensor Tower).
- Free + route ③ → per CONSTITUTION C2 prefer it over paid app-intel when public fields suffice.

## Failure signals & fallback
Failure looks like: empty/partial app objects after a Play markup change, timeouts/empty responses under rate-limiting, or truncated review history. **Fallbacks:** wrap with rotating proxies for scale; for a both-stores ready MCP use **mobile-store-scraper-mcp**; for iOS use the sibling **app-store-scraper**; for download/revenue *estimates* (not public fields) escalate to **Sensor Tower MCP**.

## Last verified: 2026-06
