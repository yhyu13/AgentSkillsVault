# Tool: facundoolano/app-store-scraper

- **Domain(s):** trends-discovery (also: browser-automation)
- **Barrier route:** ③ self-host scrape (no accounts/proxies needed at small scale) · **Source tier:** L4 · **Ready MCP:** no, it's an npm library; for a ready MCP wrapping both stores use **mobile-store-scraper-mcp**
- **Cost:** free, no key, no quota (npm lib; proxies only matter at scale) [npm: app-store-scraper, fetched 2026-06]
- **Repo / Provider:** github.com/facundoolano/app-store-scraper, `facundoolano/app-store-scraper (1.4k★, gh-api 2026-06)`; MIT, not archived, last push 2025-07-27 (~10 months, stable, the iTunes endpoints it uses change rarely)
- **Top pick for its domain:** no (free iOS-side workhorse; pair with its Android sibling)

## What it does / when to pick it
Node library that scrapes the Apple App Store (via iTunes lookup + store endpoints): app details, ratings, reviews, price, developer apps, similar apps, search, suggestions, and top-chart lists. **Decision rule:** pick this for iOS-app intel, competitor review mining, rating/rank tracking, category leaders. It's the iOS counterpart to **google-play-scraper** (same author); use both for cross-platform app research, or **mobile-store-scraper-mcp** if you want a single ready MCP. For *download/revenue estimates* (not public fields) you need a paid panel like **Sensor Tower**.

## Install
`npm i app-store-scraper` (Node ≥18). It's a **library, not an MCP**, call it from a small script, or via a self-hosted MCP wrapper (mobile-store-scraper-mcp). No key → no secret hygiene. See the volatile L1 line `reference/volatile/pricing-install.md → trends-discovery` (`npm i google-play-scraper app-store-scraper`, free). On Windows, plain `npm i` + a node script is fine. L0 mechanics: `reference/install-guide.md`.

## Auth / keys
None. No API key, no account, no quota. Hidden cost only at scale: heavy review pulls may need rotating proxies (Apple throttles aggressive review pagination by IP). No secret to leak → secret-hygiene script does not apply.

## Usage, call examples
```js
async function main() {
  const store = require('app-store-scraper');
  await store.app({ id: 553834731 });                             // by trackId; or { appId: 'com.midasplayer.apps.candycrushsaga' }
  await store.reviews({ id: 553834731, sort: store.sort.RECENT, page: 1, country: 'us' });
  await store.search({ term: 'meditation', num: 50, country: 'us' });
  await store.list({ collection: store.collection.TOP_FREE_IOS, category: store.category.HEALTH_AND_FITNESS });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```
(Check the installed version's README, exports/signatures are stable but verify before a batch.)

## General experience & gotchas (踩坑)
- **Review pagination is hard-capped by Apple (~10 pages / ~500 reviews max).** You cannot pull deep history in one shot, snapshot over time for longitudinal mining; expect the deep tail to be unreachable.
- **Two id schemes**: numeric `id` (trackId) vs bundle `appId`, mixing them up returns empty/404-like results. Resolve `appId`→`id` first if you only have the bundle id.
- **`country` changes everything**, ratings, reviews, charts, and even availability are per-storefront. Always set `country`; the default is not your market.
- **Throttling under volume**, single-app calls are reliable; bulk review pagination from one IP gets rate-limited (timeouts/empty pages, not a clean error). Add delays/proxies for scale.
- **Unofficial scraper of Apple endpoints**, more stable than the Play scraper (iTunes lookup API changes rarely, hence the ~10-month-quiet repo is fine), but still verify a live call before trusting a batch.
- **Public fields only**, no download/revenue numbers; for those use a paid estimator (Sensor Tower).
- Free + route ③ → per CONSTITUTION C2 prefer it over paid iOS-intel when public fields suffice.

## Failure signals & fallback
Failure looks like: empty result from an `appId`/`id` mismatch, capped/truncated review pages, or timeouts under rate-limiting. **Fallbacks:** resolve the correct id scheme and add proxies/delays for scale; for a both-stores ready MCP use **mobile-store-scraper-mcp**; for Android use the sibling **google-play-scraper**; for download/revenue *estimates* escalate to **Sensor Tower MCP**.

## Last verified: 2026-06
