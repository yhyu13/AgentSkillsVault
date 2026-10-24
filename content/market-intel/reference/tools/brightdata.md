# Tool: Bright Data (Web Unlocker + datasets + MCP)

- **Domain(s):** web-scraping (also: x-twitter, ecommerce-arbitrage, leadgen-crm)
- **Barrier route:** ② resale API · **Source tier:** L2 · **Ready MCP:** yes, hosted HTTP `https://mcp.brightdata.com/mcp?token=...` (verified 2026-06, Windows-friendly); stdio alt `npx @brightdata/mcp`
- **Cost:** free 5,000 req/mo (Rapid, no card); paid beyond that, confirm tiers at https://brightdata.com/pricing [fetched 2026-06] (per-req price unverified here)
- **Repo / Provider:** github.com/brightdata/brightdata-mcp, `brightdata/brightdata-mcp (2.4k★, gh-api 2026-06)`; active (pushed 2026-06-04, not archived, MIT, verified gh-api 2026-06-09)
- **Top pick for its domain:** yes (the BARRIER-BREAKER pick, strongest hard-target tool)

## What it does / when to pick it
Provider-side anti-bot unlocking: **Web Unlocker** beats Cloudflare / DataDome / CAPTCHA and unlocks Amazon / Taobao / Reddit; plus `scrape_as_markdown`, `scrape_batch`, `search_engine` (+ batch), prebuilt datasets, and an assistant tool. Bright Data absorbs the proxy/account/CAPTCHA barrier so you don't run a browser farm. **Decision rule:** pick Bright Data the moment a target actively blocks the cheaper layers, when Firecrawl/WebFetch return HTTP 500/CAPTCHA, when a price sits behind a login wall, or when you need this at scale (the scalable version of "playwright read it once"). It is the **hard-data hero for e-commerce/social** (live-run note). Cross-domain: also the go-to for hardened X/Twitter, e-commerce, and Crunchbase/lead pulls.

## Install
Hosted HTTP MCP, **prefer this on Windows** (no local process). Add `mcpServers.brightdata = {"type":"http","url":"https://mcp.brightdata.com/mcp?token=<API_TOKEN>"}` to `~/.claude.json`. Exact, time-stamped command + the token path: `reference/volatile/pricing-install.md → web-scraping`. Stdio alt: `npx @brightdata/mcp` with env `API_TOKEN`. L0 mechanics: `reference/install-guide.md`. Restart / `/mcp` reconnect after adding.

## Auth / keys
Token from Bright Data dashboard → Settings → "Users and API keys" → API keys. Free 5,000 req/mo Rapid, **no card**. The dashboard may render the token in plaintext. Have the user enter it into the active host's supported private configuration or use an approved no-echo transfer. Do not snapshot the key page or return a DOM credential value. Diagnose only the selected server, returning its name and status/authentication fields with no URLs, headers, environment values or raw configuration. Discover its callable tools in the current host and verify the selected operation there; a separate CLI listing cannot prove that operation is available. Full rules: `reference/install-guide.md`.

## Usage, call examples
MCP tools (verified 2026-06): `scrape_as_markdown(url)`, `scrape_batch(urls)`, `search_engine(query, engine)`, `search_engine_batch(...)`, `ask_brightdata_assistant(...)`. Minimal: `scrape_as_markdown` on the Cloudflare-protected URL that 500'd against Firecrawl, Web Unlocker handles the challenge server-side and returns clean markdown.

## General experience & gotchas (踩坑)
- **Live-run hero (shard, 2026-06): the hard-data tool for e-commerce/social.** When Firecrawl/WebFetch hit HTTP 500 on Amazon, or Reddit returns empty to web search, Bright Data is the scalable unlock, don't burn fan-out rounds on the cheaper layers first if you already know the target is hardened.
- **Residual gaps (live-run note):** even Bright Data has hard edges, e.g. the **Reddit comment tree** and **Taobao overseas-sales cap** were noted as still-hard. Don't assume it returns *everything*; verify the specific field you need is present.
- 5,000 req/mo free is generous but finite, `scrape_batch`/`search_engine_batch` on a wide URL list can spend it quickly; batch deliberately.
- It is a route-② resale API: compliant from your side (provider absorbs the gray-area), but you're trusting their unlock, occasional targets still return partial/JS-stub content; re-request or fall back to a real browser.
- Token-bearing URLs can appear in server listings. Do not return raw `mcp list`/`get` output or rely on a token-specific regex; return only selected-server fields that contain no credential values.

## Failure signals & fallback
Failure looks like: a still-blocked/partial page despite Web Unlocker, a missing field (e.g. comment tree), or 401/quota at call time. **Fallbacks:** a single interactive/login-walled page you can do by hand → **playwright MCP** after current-session verification (④, "read it once"); normal non-hardened pages (cheaper) → **Firecrawl** (②); finding URLs → **Tavily/Exa**; zero-cost self-host for protected crawls → **crawl4ai** (③).

## Last verified: 2026-06
