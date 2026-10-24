# Tool: Agent-Reach (free multi-platform read/search router)

- **Domain(s):** x-twitter (also cross-domain: reddit-community, web-scraping, frontier-research, reads GitHub/YouTube/Bilibili/小红书)
- **Barrier route:** ④/③ · **Source tier:** L2 · **Ready MCP:** **yes**, ships an MCP server *and* a `SKILL.md`, plus a CLI. Cookie-local, self-healing "首选 + 备选" adapters per platform.
- **Cost:** free, open-source, **zero API fees** (optional ~$1/mo proxy for scale) [github.com/Panniantong/Agent-Reach, gh-api fetched 2026-07-01]
- **Repo / Provider:** `Panniantong/Agent-Reach (78.5k★, gh-api 2026-09-06)`, not archived, pushed 2026-09-01, ~3.8k forks; Trendshift-ranked, CN-origin (surfaced via the CN discovery pass, an EN-only sweep would have missed it).
- **Top pick for its domain:** no, **READ-ONLY**, so it does *not* replace twikit's write/DM path. It is a strong free ④ read layer that collapses per-platform scraper wiring into one router.

## What it does / when to pick it
"Give your agent eyes to see the internet": one CLI/MCP that **reads and searches** Twitter/X, Reddit, YouTube, GitHub, Bilibili, and 小红书 with no per-platform API keys, using your local cookies and a self-healing multi-backend adapter (if the primary read path for a platform breaks, it falls back to another). **Decision rule:** when you need *read* access across several platforms and would otherwise hand-wire twscrape + a Reddit MCP + a YouTube scraper separately, Agent-Reach gives you one route ④ tool at $0. For X specifically it complements **twikit** (which you still need for posting/DM/write) and **twitterapi.io** (② resale, if you'd rather a vendor absorb account/proxy upkeep).

## Install
Node-based CLI + MCP. Install per the repo README (npm/`npx`), then add the MCP server to your client. Reading logged-in platforms (X, 小红书) needs your session cookies loaded locally; the tool keeps them local (never uploaded). Optional residential proxy (~$1/mo) for volume. Requires the target-platform cookies you want to read behind a login wall. Volatile install line: `pricing-install.md` → x-twitter.

## Auth / keys
No API keys. Auth = **your own platform session cookies**, stored locally. Same ban-risk posture as any route ③/④ cookie-based reader: use a burner/secondary account for aggressive reads, keep the cookie store out of git/transcript.

## Usage, call examples
CLI (illustrative): `agent-reach search twitter "AI agents" --limit 20` / `agent-reach read reddit r/webscraping`. MCP: the model calls the server's per-platform read/search tools; results return as structured JSON.

## General experience & gotchas (踩坑)
> Not yet exercised in a live market-intel run, notes from repo docs + gh-api verification 2026-07-01; harden with a `live-runs.jsonl` entry after first use (R4).
- **Read-only:** no post/comment/DM, pair with twikit (X write), Postiz/Buffer (multi-platform publish) if you need to *act*, not just observe.
- **Cookie-dependent for walled platforms:** X and 小红书 reads need valid session cookies; expect the usual login-wall friction + ban risk if over-used on a main account.
- **Self-healing ≠ unbreakable:** the multi-backend fallback buys resilience when one read path dies, but a platform-wide anti-bot change can still take a platform offline until an adapter update.
- **CN-origin, GitHub-native:** heavy real adoption (78.5k★, 3.8k forks) but little English HN/Reddit discussion, evaluate on the repo's own activity, not Western community chatter.

## Failure signals & fallback
Failure looks like empty reads, login-wall redirects, or an adapter erroring on one platform. **Fallback:** (1) refresh the platform cookies; (2) for X, drop to **twscrape**/**twikit** (③) or **twitterapi.io** (②); (3) for Reddit, **reddit-mcp-buddy** (①); (4) for hard anti-bot pages, **Bright Data**/**Scrapling**. Treat Agent-Reach as the convenient first read pass, with the per-domain incumbents as the reliable fallback.

## Last verified: 2026-09 (repository existence, stars and activity checked through gh api; usage/gotcha notes carried forward unchanged from the prior check)
