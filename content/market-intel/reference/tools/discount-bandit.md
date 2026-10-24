# Tool: Cybrarist/Discount-Bandit

- **Domain(s):** ecommerce-arbitrage (also: browser-automation)
- **Barrier route:** ④ browser / self-host · **Source tier:** L4 · **Ready MCP:** no (self-hosted Laravel web app; query its DB/UI, not an MCP)
- **Cost:** free (self-host OSS; you pay only for your own server + any proxies at scale)
- **Repo / Provider:** github.com/Cybrarist/Discount-Bandit, `Cybrarist/Discount-Bandit (0.7k★, gh-api 2026-06)`; active (697★, pushed 2026-06-01, not archived; **no LICENSE declared**, gh-api 2026-06-09, treat licensing as unspecified before redistributing)
- **Top pick for its domain:** no (Keepa ① is the default for history; Discount-Bandit is the **free "self-built Keepa"** when you can wait for history to accrue)

## What it does / when to pick it
Self-hosted multi-store price tracker: watch products across **Amazon / AliExpress / eBay** (and more), record price over time, and alert on drops / target prices. **Decision rule (straight from the shard):** pick it when you want price-*history* tracking but won't pay for Keepa, it is the "self-built Keepa: it records history **from your deploy day**." Choose Keepa ① instead the moment you need *years* of backfilled history or BSR/sales-rank curves; choose Discount-Bandit when forward-looking tracking on a known watchlist is enough and free matters (CONSTITUTION C2).

## Install
`git clone https://github.com/Cybrarist/Discount-Bandit` then follow its repo README, it's a **Laravel (PHP) app**, so you need PHP + Composer + a database (MySQL) + a scheduler/cron for the recurring price checks (Docker path may be offered; check the current README as setup steps rot). This is a standing web service, not an `npx`/`uvx` one-shot. Prereqs & route-④ self-host mechanics: `reference/install-guide.md`. Exact L1 line: `reference/volatile/pricing-install.md → ecommerce-arbitrage`. Verify the install steps against the live README before running, repo evolves.

## Auth / keys
No third-party API key for the core tracker (it scrapes the stores directly), so **no secret-hygiene key concern**. You will configure store/region URLs, a notification channel (email/Telegram/etc.) and a login for the app's own dashboard. At scale, Amazon's anti-bot means you'll need a **proxy pool**, software is free, proxies are the hidden cost (shard).

## Usage, call examples
Not an MCP, you drive it as a web app: add product URLs to the watchlist → it polls on schedule → reads/alerts on price. For agent use, query its **database** (the recorded price-history table) or its UI directly via **playwright MCP**. Minimal flow: deploy → add 20 ASIN/eBay/AliExpress URLs → let the cron accumulate daily points → pull the history rows for your spread/drop analysis.

## General experience & gotchas (踩坑)
- **CANNOT backfill history (the key limit vs Keepa):** it only accrues price/BSR-equivalent data from the day you start recording. If you need "what was this priced 8 months ago" today, Discount-Bandit can't give it, Keepa ① is irreplaceable for that (shard).
- It's a **standing service**: needs a host that's always up + a working scheduler. If the cron stops, your history silently has gaps, monitor that the poller is actually running.
- **Amazon anti-bot is strong** → unproxied polling of many ASINs will get throttled/blocked; budget a proxy pool for anything beyond a small watchlist (shard).
- **No declared license** (gh-api 2026-06), fine for personal self-host, but clarify terms before any commercial redistribution.
- Sales/volume numbers from any such tool are **estimates**, cross-check; differences across tools can be multiples (shard).
- PHP/Laravel/MySQL stack is heavier than the typical `pip`/`npx` scraper, more setup surface; on Windows prefer the Docker path or a Linux VM.

## Failure signals & fallback
Failure looks like: poller stopped (flat/no new history points), a store layout change breaking its parser, or anti-bot blocks (empty/garbage prices). **Fallbacks:** need history you never recorded → **Keepa** (① pay for backfilled curves); a one-off live price/stock read on any store → **playwright MCP** (④); hardened Amazon at scale → **Bright Data** (② Web Unlocker) or **amazon-scraper** (④, built-in anti-detect browser); structured multi-Amazon-site pulls → **omkarcloud/amazon-scraper**.

## Last verified: 2026-06
