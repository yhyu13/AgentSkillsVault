# Tool: twscrape

**Runtime storage status: setup only.** No shipped adapter admits this tool's
complete file output. Do not launch collection, login or persistence until every
child-file write meets the [external-tool storage requirements](../../../../DATA.md#external-tool-storage).
`resolve_directory` alone does not authorize writes; examples below are setup guidance.

- **Domain(s):** x-twitter (also: none)
- **Barrier route:** ③ self-host scrape · **Source tier:** L4 · **Ready MCP:** no (Python library, wrap it yourself or call from a script)
- **Cost:** free (OSS, self-host), you supply X account cookies + proxies; proxies are the hidden cost at scale
- **Repo / Provider:** github.com/vladkens/twscrape, `vladkens/twscrape (2.5k★, gh-api 2026-06)`; very active (pushed 2026-06-08, not archived, MIT)
- **Top pick for its domain:** yes (the maintained free **read** route alongside playwright; **multi-account rotation** is an additional strength)

## What it does / when to pick it
Free Python lib for X search / user / followers / tweets via the GraphQL + Search API, with **built-in multi-account pool + automatic rotation** so you can spread load across many logged-in accounts. **Decision rule:** use twscrape as the maintained free read default after a fresh operation check; choose **playwright** when rendered-page fields are needed. Account rotation is useful for volume reads (add N accounts, it round-robins and parks rate-limited ones), but is not a prerequisite for selecting this route. It is read-focused (search/users/followers/tweets), not a posting tool; twikit remains a conditional library/write fallback after verification. Same shard caveat: **X is low-signal for consumer-demand research**, use for tech/crypto/founder discourse, breaking news, named-account tracking.

## Install
`pip install twscrape`. No MCP, call it from a Python script or wrap it. Volatile L1 line: `reference/volatile/pricing-install.md → x-twitter` ("twscrape (self-host, free): `pip install twscrape`, needs X account cookies + proxy"). Pure Python lib, so no transport/Windows MCP flakiness, but it needs your X account cookies + (at scale) a proxy pool. L0 prerequisites (Python ≥3.10, throwaway accounts + proxies): `reference/install-guide.md`.

## Auth / keys
Authentication uses an account pool containing login details and session cookies. Keep the account import file and pool database in the designated PRIVATE versioned companion under its approved backup policy, with credential values excluded from transcripts. See `reference/install-guide.md` for account and proxy mechanics.

## Usage, call examples
Before constructing `API()` or invoking any twscrape command, use `tools/private_inventory.py`'s `resolve_directory(path=runtime_directory)` on the final absolute, existing PRIVATE runtime directory. It resolves the containing Git worktree, including a nested repository at that directory, and refuses directories outside it or inside this checkout. Stop if the check fails. The completed adapter must start the caller or CLI with its working directory set to the verified directory so implicit database, cookie, log and export paths remain there. Revalidate on each run.

Verify the absolute account import file with `resolve_destination(path=account_file)` before passing it to the CLI. Keep the default pool database and all returned observations versioned in the same PRIVATE companion. Use the installed version's documented CLI import/login/search commands or `API()` methods only through that completed adapter after its file-admission checks. Never run these default-path commands from the public consumer checkout.

## General experience & gotchas (踩坑)
- **You must supply real X accounts + proxies**, the software is free, the accounts/proxies are the actual cost and the actual risk. Login-walled scraping at volume needs several accounts and residential proxies, or the whole pool gets flagged together.
- **Ban/lock risk per account.** twscrape parks rate-limited accounts, but X can lock or suspend them; budget for churn and keep adding fresh throwaways. Never use a real/main account.
- **Rides X's internal GraphQL/Search endpoints** → breaks when X changes them. The repo is **very active (pushed 2026-06-08)**, which is exactly why it's still viable, pin to a recent version and update when search silently returns empty.
- **Read-only-ish**, it's a scraper, not a poster; consider twikit for write/DM only after a fresh check of that operation, or use an authorized official write route.
- **Violates X ToS**, research/throwaway use at your own risk.
- **Source coverage:** Prior consumer/non-tech demand queries found little useful evidence in X "Top"/search. Rotating more accounts does not establish that the relevant audience is present; include 抖音/小红书/B站 or Reddit/forums when selecting consumer-demand sources.
- Don't confuse with the **dead** snscrape (停更), twscrape is its living successor; flag snscrape L5 if a plan relies on it.

## Failure signals & fallback
Failure looks like: `login_accounts` fails or accounts go to a locked/parked state, search returns empty on queries that should hit (all accounts rate-limited/flagged, or X endpoint changed), or pool exhausted. **Fallbacks:** for read+write or simpler single-account use, **twikit (+ adhikasp/mcp-twikit)** only after a fresh operation check; for richest fields / hardest cases, **playwright MCP** after current-session verification with your own session; to pay past the barrier, **twitterapi.io ②** (provider absorbs account/proxy upkeep) → **Bright Data X datasets** for scale/SLA.

## Last verified: 2026-06
