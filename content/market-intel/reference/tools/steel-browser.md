# Tool: steel-dev/steel-browser

- **Domain(s):** browser-automation (also: none)
- **Barrier route:** ④ · **Source tier:** L2 · **Ready MCP:** self-host (run the Steel server; drive via Puppeteer/Playwright/CDP or its API, wrap as MCP yourself)
- **Cost:** free (open source, Apache-2.0) self-host. Steel.dev also sells a managed cloud-browser tier, confirm pricing at https://steel.dev (price unverified 2026-06). Proxies at scale are the hidden cost.
- **Repo / Provider:** github.com/steel-dev/steel-browser, `steel-dev/steel-browser (7.1k★, gh-api 2026-06)`, Apache-2.0, pushed 2026-06
- **Top pick for its domain:** no

## What it does / when to pick it
**Open-source browser *infrastructure* for AI agents**, a self-hostable headless-browser server with session management, proxy support, anti-detection, CAPTCHA handling, and a REST/SDK API. The free self-host alternative to hosted "browser-as-a-service" (Browserbase / Steel cloud). **Pick it when you need many concurrent, managed browser sessions** behind a stable API (multi-agent fleets, repeated runs) rather than one local browser. For a single act-like-human task playwright MCP after current-session verification is enough, Steel earns its keep at fleet scale / session reuse.

## Install
Self-host via the selected version's Docker configuration. Before starting the container or creating a browser session, use the full Market checkout's `tools/private_inventory.py` to verify an existing PRIVATE versioned runtime. Confirm supported absolute configuration and bind destinations for browser profiles, cookies, session state, credentials, downloads, logs and other outputs, including the backup/export mechanism for persistent sessions. Revalidate before launch and session creation. Keep setup pending if any writer or session persistence mechanism cannot be redirected and verified; no private runtime adapter has been exercised here.

Needs the Docker prereq (`install-guide.md`). After the private runtime checks pass, drive it from Puppeteer/Playwright (connect over CDP) or its REST API; wrap as an MCP yourself if you want tool-call access. L1 line: `reference/volatile/pricing-install.md#browser-automation`. Docker/HTTP route is the Windows-friendly path.

## Auth / keys
Self-host = no service key (you own the server). Target-site auth = sessions/cookies you create through Steel's session API; keep them in the PRIVATE runtime and its versioned backup. If you opt into the **managed cloud** tier instead, that needs a Steel API key, key-bearing: use the host's supported private secret configuration and backup, keep it out of the transcript (see `install-guide.md` secret hygiene). Proxy credentials are configured per session through the same private configuration boundary.

## Usage, call examples
Use the following call shape only after the private runtime, session storage and selected version's API have been verified:

```python
# self-hosted Steel server (default port 3000) exposes a CDP/WS endpoint + REST sessions API.
# POST /v1/sessions + port 3000 verified against the repo README; exact body params
# (proxy/captcha) and the returned WS-URL field name are unverified — confirm at https://docs.steel.dev
import requests
s = requests.post("http://localhost:3000/v1/sessions",
                  json={"proxyUrl": "..."}).json()   # see repo for full param list
# then connect Playwright/Puppeteer to the session's CDP/WS endpoint and drive normally
```
Create a session → connect your existing Playwright/Puppeteer script to its WS endpoint → reuse the session across calls. Confirm cookie/state persistence and recovery from the PRIVATE stores before relying on session resumption; creating a session alone does not prove persistence.

## General experience & gotchas (踩坑)
- **It's infra, not an agent.** Steel runs/manages the browser; you still bring the driving logic (Playwright/Puppeteer or an agent like browser-use). It replaces "spawn a browser," not "decide what to click."
- **Earns its keep at scale.** For a one-off local task, playwright MCP is simpler and available only after current-session operation verification, reach for Steel when you need concurrent sessions, session persistence/reuse, or a stable API for a multi-agent fleet.
- **Self-host means you operate it.** You carry the proxy pool, resource sizing, and uptime; the software is free but ops time isn't. The managed cloud tier trades money for that.
- **Anti-detection/CAPTCHA features help but don't make it invincible**, hard DataDome/Cloudflare can still block; for the toughest fingerprint walls compose with camoufox/nodriver or hand off to Bright Data ②.
- Most platform scraping violates ToS, throwaway accounts + proxies for scrape-heavy work.

## Failure signals & fallback
Failed = sessions 403/CAPTCHA-loop, server resource exhaustion under concurrency, or you're over-engineering a single-task job. Fallbacks, subject to current-session setup and operation verification: **playwright MCP** (single local task), **camoufox/nodriver/patchright** (fingerprint walls), **browser-use** (goal-driven driving logic on top), or **Bright Data ②** when you'd rather a provider absorb the whole barrier than self-host.

## Last verified: 2026-06
