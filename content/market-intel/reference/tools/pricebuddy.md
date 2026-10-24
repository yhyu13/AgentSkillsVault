# Tool: pricebuddy (self-host multi-store price tracker)

- **Domain(s):** ecommerce-arbitrage (also: consumer-price-compare)
- **Barrier route:** ④ self-host · **Source tier:** L2 · **Ready MCP:** no, self-hosted web app (Laravel/PHP + Docker), driven via its own UI/API, not an MCP.
- **Cost:** free, open-source (self-host; you supply the server) [github.com/jez500/pricebuddy, gh-api fetched 2026-07-01]
- **Repo / Provider:** `jez500/pricebuddy (1367★, GitHub stars checked 2026-10-03)`; activity/adoption observations from 2026-07-01: not archived, pushed 2026-06-30, ~55 forks, 8 contributors, active releases (v1.0.51, 2026-06-20). Healthy activity/adoption profile.
- **Top pick for its domain:** ④ self-host route top pick (replaces Cybrarist/Discount-Bandit as of the 2026-07 sweep, beats it on stars, contributor count, and release cadence). The domain's *overall* top pick is still **Keepa ①** for price history; pricebuddy is the free self-built-tracker option.

## What it does / when to pick it
A self-hosted price tracker: add product URLs across multiple stores (Amazon/eBay/AliExpress and generic sites), it scrapes prices on a schedule, charts history **from your deploy day forward**, and alerts on drops. **Decision rule:** when you want a free, self-owned "poor man's Keepa" and can run a container, pick pricebuddy, it's the most active OSS tracker in this niche (2026-07). Its hard limit vs Keepa is identical to the whole ④ route: **it cannot backfill historical price/BSR**, history only accrues from when you start recording. For years of past price/BSR curves, Keepa ① remains irreplaceable.

## Install
Docker Compose is the upstream deployment route. Inspect the selected `jez500/pricebuddy` source and prepare dependencies without starting collection. Before launch, use the full Market checkout's `tools/private_inventory.py` to verify an existing PRIVATE versioned runtime. Identify supported absolute configuration and bind destinations for the app configuration, database, browser/session state, caches, logs and exports; ensure backups cover any database state that needs a consistent snapshot. Revalidate those destinations before starting Compose through that adapter. If a required writer cannot be redirected and verified, keep setup pending. This card has not exercised the upstream runtime or its private path configuration.

Needs a host to run on (VPS/home server) and, at scale, proxies for the store scrapes (same ④ hidden cost as any self-host scraper). Volatile install line: `pricing-install.md` → ecommerce-arbitrage.

## Auth / keys
No third-party API key for the core tracker. You create a local admin login on first run. Any store that needs a logged-in session (or throws anti-bot) needs the usual proxy/cookie handling; load those secrets through supported private configuration at verified absolute destinations in the PRIVATE versioned runtime. Keep values out of public source and command output; an ignored `.env` or `secrets/` directory inside the source clone is not a private storage boundary.

## Usage, call examples
After the private runtime and its writes are verified, use the web UI: add a product by URL, set the stores/frequency, view the price-history chart, configure drop alerts (email/notification). It exposes a JSON API for its own data; there is no prebuilt MCP, so agent use = drive the API or read its DB.

## General experience & gotchas (踩坑)
> Landed 2026-07 from a `live-runs.jsonl` price_mismatch signal (2026-06-15: pricebuddy 962★ then, outranked the shard's OSS picks); gh-api re-verified 978★ 2026-07-01. Not yet run in a live market-intel sweep, harden after first use (R4).
- **No historical backfill:** like all ④ trackers, it records from deploy day; it is not a substitute for Keepa's multi-year history. Pick it for *forward* tracking, not *retro* analysis.
- **You run the scrapers:** prices are only as fresh/complete as your instance's scrape schedule + how well the target store tolerates it. Hard anti-bot stores (Amazon at scale) may need proxies; a bare home-IP deploy will get rate-limited.
- **Self-host ops cost:** it's a real web app (DB, cron, container), budget the maintenance, unlike a hosted MCP.

## Failure signals & fallback
Failure looks like stale/blank price points (store blocked the scrape), or the scheduler not firing. **Fallback:** (1) add a proxy for the blocked store; (2) for live one-off prices, **playwright MCP** (④) or **Bright Data** (②); (3) for multi-year history that no ④ tool can backfill, **Keepa** (①). Secondary OSS tracker if pricebuddy doesn't fit your stack: **Cybrarist/Discount-Bandit** (708★, still active), now the #2 ④ pick.

## Last verified: 2026-07
