# Tool: erithwik/mcp-hn (Hacker News)

- **Domain(s):** reddit-community (also: trends-discovery)
- **Barrier route:** ① official (free, no key) · **Source tier:** L2 · **Ready MCP:** yes, `uvx mcp-hn` (stdio), connects with zero auth; rides the public HN Algolia API
- **Cost:** free, no key, no account, no quota beyond Algolia politeness [https://hn.algolia.com/api, fetched 2026-06]
- **Repo / Provider:** github.com/erithwik/mcp-hn, `erithwik/mcp-hn (73★, gh-api 2026-06)`; not archived, MIT, pushed 2025-07 (~11mo, stable, HN API rarely changes)
- **Top pick for its domain:** yes, the **free default for Hacker News**

## What it does / when to pick it
Exposes Hacker News stories (top/new/ask/show), full-text search, and comment trees over the HN Algolia API, no key, no rate-limit friction. **Decision rule:** this is the shard's free zero-auth default for HN; pick it any time the question touches developer/founder/startup discourse, Show HN launches, or "what does HN think of X". It's the **HN half** of the reddit-community pair, use **reddit-mcp-buddy** for the Reddit half. Its cross-domain value (trends-discovery) is real: Ask HN / Show HN are strong early-product-signal sources.

## Install
`uvx mcp-hn` (stdio) or `npx -y @smithery/cli install mcp-hn --client claude`. No key → `claude mcp add` is safe here (no secret to leak). Exact L1 command: `reference/volatile/pricing-install.md → reddit-community`. On Windows, stdio `uvx` is flaky (path/shell), if it won't connect, test `uvx mcp-hn` in a plain shell first; see Windows + stdio notes in `reference/install-guide.md`. A newly added MCP needs a session restart / `/mcp` reconnect.

## Auth / keys
None. No API key, no account, the secret-hygiene script does **not** apply. The only constraint is Algolia politeness (don't hammer it in a tight loop).

## Usage, call examples
Via MCP, tools cover: get stories by type (`top`/`new`/`ask`/`show`), search by keyword, fetch a story's comment tree, and user lookup. Minimal: ask for "top Ask HN stories about <topic>" then drill into a story's comments for the pain-point text. Direct REST equivalent (no MCP): `http://hn.algolia.com/api/v1/search?query=<kw>&tags=story`. List the exact tool names with your client after connecting, don't assume signatures from memory.

## General experience & gotchas (踩坑)
- **HN skews hard to dev/technical/founder audiences.** Excellent for SaaS/dev-tool/infra/AI sentiment and launch reactions; near-useless for consumer-physical-product demand (patio heaters, beauty, apparel), route those to Reddit/forums or 抖音/小红书 per the shard.
- **Comment depth is the gold, not the headline.** The signal lives in the comment tree (objections, "I switched to X because…"); always expand comments, don't stop at story titles.
- **Search is Algolia keyword match, not semantic**, synonyms/competitor names won't auto-expand. Run 2 to 3 query variants before concluding a topic is quiet.
- **Story `points`/`num_comments` are popularity, not demand**, a viral drama thread inflates both without indicating buying intent.
- Free and no-key, so per CONSTITUTION C2 reach for it before any paid trends/sentiment source.

## Failure signals & fallback
Failure looks like: stdio connect fails on Windows (uvx path), or an empty search on a topic you know is discussed (keyword too narrow, broaden it). **Fallbacks:** for the same query as plain REST, hit the Algolia endpoint directly (no MCP); for broader cross-platform community signal switch to **reddit-mcp-buddy** (Reddit) or **stack-overflow-mcp** (SE); for product-launch trend discovery cross to **Product Hunt MCP** (trends-discovery).

## Last verified: 2026-06
