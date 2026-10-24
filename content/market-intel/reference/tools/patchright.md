# Tool: patchright (Undetected-Playwright patch)

**Runtime storage status: setup only.** No shipped adapter admits this tool's
complete file output. Do not launch collection, login or persistence until every
child-file write meets the [external-tool storage requirements](../../../../DATA.md#external-tool-storage).
`resolve_directory` alone does not authorize writes; examples below are setup guidance.

- **Domain(s):** web-scraping (also: browser-automation)
- **Barrier route:** ④ · **Source tier:** L2 · **Ready MCP:** no, it's a Playwright-API drop-in library (Python `patchright` / Node `patchright`), drive it from your own script or wire it under a playwright-style runner. No prebuilt MCP server.
- **Cost:** free, Apache-2.0 (no key, no quota) [github.com/Kaliiiiiiiiii-Vinyzu/patchright, fetched 2026-06]
- **Repo / Provider:** `Kaliiiiiiiiii-Vinyzu/patchright (4.4k★, gh-api 2026-09-06)` (umbrella/TS repo; the language packages are `patchright-python` 1.5k★ and `patchright-nodejs` 776★, both gh-api 2026-09-06). Apache-2.0, not archived, pushed 2026-09-04.
- **Top pick for its domain:** no (Bright Data ② is the top barrier-breaker; patchright is the free ④ fallback)

## What it does / when to pick it
A patched, undetected build of Playwright that fixes the runtime leaks (CDP `Runtime.enable`, console hooks, fingerprint tells) bot-detection vendors use to flag automation. As a near drop-in, it passes Cloudflare, DataDome, Akamai, Kasada, and F5/Shape on targets that vanilla Playwright trips. **Decision rule:** when you already use Playwright/browser-automation and a target throws CAPTCHAs or 403/challenge pages, swap to patchright before paying for a barrier-breaker, it's the free ④ route. Reach for **Bright Data** (②, free 5k/mo Rapid) instead when the block is IP-reputation based (datacenter-IP bans, geo-walls) rather than browser-fingerprint based, patchright cleans the fingerprint but still uses *your* IP, so it does not solve IP blocks on its own.

## Install
Python: `pip install patchright` then `patchright install chromium` (downloads its patched Chromium). Node: `npm i patchright` then `npx patchright install chromium`. Prereqs: Python ≥3.10 (or Node ≥18) per `install-guide.md` "Prerequisites". This is a **library, not an MCP**, there is no `claude mcp add` step and no HTTP/stdio transport to choose; you call it from a script (or behind crawl4ai/an agent runner). Windows note: the bundled Chromium download is large; if `patchright install` stalls behind a proxy, set the standard Playwright env (`PLAYWRIGHT_DOWNLOAD_HOST`), patchright reuses Playwright's download machinery. For IP-reputation targets, pair it with a residential proxy pool (the hidden cost of route ④; see `install-guide.md` Prerequisites). Volatile install line: `pricing-install.md` → web-scraping.

## Auth / keys
None. No account, no API key, no quota, it's a local OSS browser patch. The only "credential" is whatever logged-in session/cookies you feed the browser context for the target site (same as Playwright). No secret-hygiene step needed for the tool itself; if you load a target's session cookies, keep that cookie file out of the transcript and inside the designated PRIVATE credential store and its approved backup policy.

## Usage and PRIVATE browser state
Before any real run, resolve the full consumer checkout and use
`tools/private_inventory.py`'s `resolve_destination(path=...)` for individual
config/output files and `resolve_directory(path=...)` for existing runtime or
browser-profile directories. Pass the final absolute path. Each check resolves the
containing Git worktree, including a repository rooted at the directory itself,
and refuses destinations outside it or inside this checkout. Stop when it fails.
Keep runtime files versioned in that PRIVATE companion. An ignored directory in
this public checkout is not a valid destination. A later real run must repeat the
check; this recipe is not a live destination attestation.

Use `patchright.sync_api.sync_playwright` with the documented
`launch_persistent_context(user_data_dir=...)` parameter. Supply the verified
absolute PRIVATE profile directory, and launch the caller from that PRIVATE
runtime directory. Place downloads, screenshots and traces there too; verify
the installed version's supported output settings before enabling them.
Use the upstream persistent-context settings without extra stealth flags.
No relative `./udir` profile is permitted in the public source checkout.

## General experience & gotchas (踩坑)
- **Fingerprint-only, not IP:** patches the browser so the *automation* is invisible, but the request still leaves *your* IP. Datacenter-IP / rate / geo blocks survive, that's the documented split vs Bright Data in the shard ("patches the browser fingerprint but needs a proxy for IP-reputation blocks; complements Bright Data").
- **Headless still leaks more than headful:** for the hardest targets (Kasada/DataDome) run headful + persistent context + real `channel="chrome"`. Pure `headless=True` raises detection odds.
- **Don't over-configure:** adding stealth args, extra flags, or other anti-detect wrappers on top can *re-add* the very signals patchright removed. Use its recommended config as-is.
- **Tracks upstream Playwright:** it's a patch over Playwright releases, so a brand-new Playwright version may briefly lag. Pin a working version for a long-running scraper.
- **Same Chromium download weight** as Playwright (~hundreds of MB) on first `install`.

## Failure signals & fallback
Failure looks like: persistent CAPTCHA/JS-challenge interstitials, `403`/`429`, Cloudflare "checking your browser" loops, or a `cf_clearance`/challenge page in the DOM that never resolves. **If patchright still gets blocked: (1)** add a residential proxy and retry (most ④ blocks are now IP-based); **(2)** escalate to **Bright Data Web Unlocker** (② route, free 5k/mo Rapid, no card) which absorbs both fingerprint *and* IP-reputation; **(3)** for managed self-host, **crawl4ai** (③, docker MCP) wraps similar auto-anti-bot. For ordinary JS-render scrapes that aren't actually barrier-blocked, **Firecrawl** (②) or **playwright MCP** after current-session verification (④) is simpler than scripting patchright.

## Last verified: 2026-09 (repository existence, stars and activity checked through gh api; usage/gotcha notes carried forward unchanged from the prior check)
