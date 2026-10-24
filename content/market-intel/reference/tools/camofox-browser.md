# Tool: jo-inc/camofox-browser

- **Domain(s):** browser-automation (also: none)
- **Barrier route:** ④ · **Source tier:** L2 · **Ready MCP:** no (REST API + plugin; drive over HTTP, no MCP wrapper)
- **Cost:** free (MIT, self-host), an optional key only gates cookie-import, not core use [github.com/jo-inc/camofox-browser, fetched 2026-06]
- **Repo / Provider:** github.com/jo-inc/camofox-browser, `jo-inc/camofox-browser (9.1k★, gh-api 2026-06)`; license MIT, active (pushed 2026-06)
- **Top pick for its domain:** no (an anti-fingerprint escalation, reached for only when plain playwright is blocked)

## What it does / when to pick it
An anti-fingerprint browser that adds **C++-level fingerprint spoofing on top of the Camoufox (anti-fingerprint Firefox) base**, and wraps it behind a **REST API + plugin** so an agent can drive it over HTTP rather than embedding the library. **Decision rule:** this is an *escalation* tool, not a default, reach for it only when plain **playwright MCP** (or agent-browser/browser-use) gets fingerprint-blocked (Cloudflare/DataDome/JS-challenge walls). Among the anti-detection siblings: pick **camofox-browser** when you want a *ready HTTP server* with stronger-than-base spoofing and a plugin; pick the raw **daijro/camoufox** (12288★, GitHub stars checked 2026-10-03) when you want the Python library to embed; pick **nodriver** (4.3k★) for undetected-Chrome rather than Firefox; pick **patchright** when you specifically want an undetected-Playwright drop-in. For everything that *isn't* fingerprint-blocked, stay on playwright MCP, anti-fingerprint browsers are slower and heavier.

## Install
Self-host OSS (MIT). Runs as a local REST service you call over HTTP.
```
git clone https://github.com/jo-inc/camofox-browser
# follow repo README to install deps and launch the REST server
# (Camoufox/Firefox base is fetched on first run)
# then POST to its local REST endpoint to open pages / extract
```
Windows note: it exposes an **HTTP REST API** locally, which is the Windows-friendly shape (no stdio `npx`/`uvx` flakiness). Confirm the Camoufox Firefox base downloads cleanly on first launch. Not an MCP, so the `claude mcp add` mechanics in `reference/install-guide.md` don't apply; free OSS so no volatile pricing row, the L1 line is `pricing-install.md` → browser-automation → Anti-detection.

## Auth / keys
**No key for core use**, the browser, spoofing, and REST API are free and open. The only thing gated by a key is **cookie-import** (loading an existing logged-in session into the spoofed browser). Secret-hygiene: that cookie-import key and any imported session cookie are live credentials, have the user supply them via env/config, never echo them into the transcript, and never commit them.

## Usage, call examples
You call it over its **REST API** (endpoints per the repo README), not via MCP tool names. Conceptual minimal flow, open a fingerprint-walled URL through the spoofed browser and get rendered content:
```
# conceptual; confirm exact paths in the repo README
curl -X POST http://localhost:<port>/navigate \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example-protected.com"}'
curl http://localhost:<port>/content        # rendered DOM / extracted text
```
Because it speaks HTTP, the agent can call it like any local REST service; the plugin is an alternative front-end.

## General experience & gotchas (踩坑)
- **Escalation tool, not a default (shard lesson):** "if fingerprint-blocked escalate to camoufox/nodriver." Don't open with it, it's heavier and slower than playwright; use it only after a bot wall.
- **Free MIT, key only gates cookie-import:** don't assume you need a paid plan; the spoofing itself is free. The key requirement is narrow (cookie import).
- **Firefox base, not Chromium:** built on Camoufox/Firefox, sites that branch on Chrome-specific behavior may render differently than your playwright (Chromium) baseline; some Chrome-only selectors/flows won't carry over.
- **Spoofing ≠ invincibility:** a persistent challenge can reflect ineffective fingerprint masking, session/authentication conditions, rate limits or IP reputation. Consider a proxy trial only when diagnostic evidence points to IP reputation; proxies add cost and do not establish successful access.
- **Thinner adoption / younger repo:** smaller community than camoufox/nodriver; pin a commit and re-check the README, as REST endpoints may change.

## Failure signals & fallback
Failed when: the REST server won't start (check whether the Camoufox base downloaded), or the target *still* serves a CAPTCHA/challenge despite spoofing. A persistent challenge leaves the cause unresolved; inspect fingerprint, session/authentication, rate-limit and IP-reputation evidence before choosing a fallback. **Fallback ladder within anti-detection:** (1) try raw **daijro/camoufox** (the library base) or **ultrafunkamsterdam/nodriver** (undetected Chrome); (2) **Kaliiiiiiiiii-Vinyzu/patchright** (undetected-Playwright, passes Cloudflare/DataDome/Akamai/Kasada); (3) if you'd rather a provider absorb the anti-bot barrier entirely, hand it to **Bright Data** Web Unlocker (route ②, web-scraping domain). After any fallback, verify usable target content, not just a loaded challenge page. If fingerprinting was never the issue, drop back to **playwright MCP**.

## Last verified: 2026-06
