# Tool: d60/twikit (+ adhikasp/mcp-twikit)

- **Domain(s):** x-twitter (also: social-publishing, browser-automation)
- **Barrier route:** ③④ self-host scrape / act-like-human · **Source tier:** L4 · **Ready MCP:** an adhikasp/mcp-twikit wrapper exists; installation and the selected operation need fresh verification because both wrapper and library have stale code (see the newer [domain maintenance note](../domains/x-twitter.md))
- **Cost:** free (OSS, self-host), you supply X account cookies; proxies are the only hidden cost at scale
- **Repo / Provider:** github.com/d60/twikit, `d60/twikit (4.5k★, gh-api 2026-06)`; not archived, MIT. That snapshot's 2026-03-10 push was README-only; the newer [domain note](../domains/x-twitter.md) records the code-maintenance gap. MCP wrapper: github.com/adhikasp/mcp-twikit (`235★, gh-api 2026-06`, MIT, pushed 2025-03)
- **Top pick for its domain:** no; **twscrape ③ / playwright ④** are the free read defaults. Retain twikit as a conditional library/write fallback after a fresh operation check.

## What it does / when to pick it
Free Python lib that drives X via a logged-in account's cookies, **no API key, no X dev account.** Read (search, user, followers, tweets, replies) **and write** (post, reply, DM). **Decision rule:** prefer **twscrape ③** for the maintained free read route or **playwright ④** for rendered-page fields. Consider twikit for a specific library operation, single-account fallback or write capability only after that operation passes a fresh check; its stale code prevents assuming readiness from installation. Choose **twitterapi.io ②** when you'd rather a provider absorb the account/proxy/ban upkeep. Remember the shard rule: **X is low-signal for consumer-demand research**, use this for tech/crypto/founder discourse and named-account tracking.

## Install
Library: `pip install twikit`. Ready MCP (wraps the lib): adhikasp/mcp-twikit, clone + run per its README (stdio; supply X login creds via env/config). Volatile L1 line: `reference/volatile/pricing-install.md → x-twitter` (and the `browser-automation` section lists `pip install twikit, 4.5k★ + MCP adhikasp/mcp-twikit`). On Windows, stdio MCPs are flaky (path/shell), prefer running the lib directly in a Python script, or test the stdio MCP in a plain shell first; see `reference/install-guide.md` for Windows + stdio notes. A freshly added MCP needs a session restart / `/mcp` reconnect.

## Auth / keys
No API key; authentication uses account login details or saved cookies. Treat both as credentials: keep their values out of transcripts and store them only in the designated PRIVATE versioned companion under its approved backup policy. See `reference/install-guide.md` for login mechanics.

## Usage, call examples
Before login or cookie persistence, use `tools/private_inventory.py` from the full consumer checkout. Resolve the cookie file with `destination = resolve_destination("profiles/twikit/cookies.json")`. This resolves its containing companion Git worktree and refuses paths outside it or inside this checkout; stop if the check fails. Create its parent directory only after this check. Immediately before saving, revalidate with `cookie_file = resolve_destination(path=destination.path).path`, then call `client.save_cookies(str(cookie_file))`. Revalidate the same absolute path before `client.load_cookies(str(cookie_file))`. Never save credentials relative to the consumer working directory.

Construct `Client('en-US')` and supply login values from that private credential store. Call the library's search/user methods after authentication. Inspect the current library or MCP method signatures before use. Returned observations, logs and exports must also use PRIVATE file destinations.

## General experience & gotchas (踩坑)
- **Ban risk is real and write >> read.** Posting/DM/follow at any volume from an automated session is the fastest path to suspension. Use a throwaway account; rotate cookies/proxies if you scale; keep write volume human-paced.
- **Cookie sessions expire / get challenged.** A stale session surfaces as a login error or an empty result mid-run, not a clean failure. Re-login and re-save cookies. Expect occasional X challenges (suspicious-login, verification) that pause the account.
- **Both library and wrapper have stale code.** The newer [domain maintenance note](../domains/x-twitter.md) supersedes the earlier activity claim based on a README-only push. Since X changes its internal endpoints, verify the selected library or MCP operation with usable results before relying on it; installing or upgrading a package does not establish compatibility.
- It rides X's **internal/undocumented** endpoints (act-like-human), so it breaks when X changes them and **violates X ToS**, research/throwaway use at your own risk.
- **Shard truth:** X "Top" search was nearly empty for consumer/non-tech demand (patio-heater real-run), don't burn a throwaway account chasing consumer-demand signal here; route that to 抖音/小红书/B站 or Reddit/forums.
- Don't confuse with the **dead** elizaOS/agent-twitter-client (原仓库下架，只剩 fork), flag that one L5 if a plan relies on it.

## Failure signals & fallback
Failure looks like: login raises (bad creds / challenge), search returns empty on a query that should hit (session invalid or X endpoint changed), account suspended, or the stale MCP wrapper errors after an X-side change. **Fallbacks:** drop to **playwright MCP** after current-session verification with your own logged-in X session (most robust act-like-human route, richer fields); or pay your way past the barrier with **twitterapi.io ②** (provider absorbs account/proxy upkeep) → **Bright Data X datasets** for scale/SLA.

## Last verified: 2026-06
