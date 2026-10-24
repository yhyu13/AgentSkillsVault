# Tool: dancolta/subscope

**Runtime storage status: setup only.** No shipped adapter admits this tool's
complete file output. Do not launch collection, login or persistence until every
child-file write meets the [external-tool storage requirements](../../../../DATA.md#external-tool-storage).
`resolve_directory` alone does not authorize writes; examples below are setup guidance.

- **Domain(s):** reddit-community (also: none)
- **Barrier route:** ④ self-host (keyless public RSS) · **Source tier:** L4 · **Ready MCP:** no, ships as a **Claude Code plugin** (self-host), not a hosted MCP; runs locally
- **Cost:** free, no API key, no Reddit account; reads public RSS feeds, stores to local SQLite [https://github.com/dancolta/subscope, fetched 2026-06]
- **Repo / Provider:** github.com/dancolta/subscope, `dancolta/subscope (29★, gh-api 2026-10-12, thin adoption)`; not archived, MIT, pushed 2026-07-22 (active but very early)
- **Top pick for its domain:** no, a niche, post-GummySearch buyer-intent tool, thin adoption (29★)

## What it does / when to pick it
A free Claude Code plugin that surfaces **buyer-intent Reddit threads** with **no API key and no Reddit account**: it reads public RSS feeds, scores each post against 8 buying-signal patterns, and returns a ranked buyer-signal + authority-play list right in chat, persisting to local SQLite. **Decision rule:** pick it specifically for **lead-gen / buyer-intent monitoring**, "which Reddit threads right now show someone ready to buy / asking for a tool like ours", i.e. as an open-source **GummySearch / Syften / F5Bot alternative** (relevant because GummySearch shuts down 2026-11, per the shard "Watch"). It is **not** a general Reddit reader: for broad browse/search/post-details use **reddit-mcp-buddy**, and for *finding which subreddits* to monitor use **reddit-research-mcp**. Choose subscope only when the job is recurring buyer-signal scoring, and you want zero creds and local storage.

## Install
Self-host Claude Code plugin (Python), distributed through its plugin marketplace. **Keep this route in `setup`: the selected version's writer paths and supported redirection have not been verified here.** Before onboarding, scans or any other runtime launch, inspect every effective destination for SQLite databases and sidecars, watchlist/onboarding configuration, caches and logs.

Use the full Market checkout's existing `tools/private_inventory.py` resolver (`resolve_directory()` for existing directories and `resolve_destination()` for files) to check each destination belongs to the existing, versioned PRIVATE companion worktree. Configure every writer with a supported absolute path to that runtime and revalidate the effective destinations immediately before launch. If any writer lacks supported redirection or PRIVATE/versioned proof, remain in `setup`; do not run onboarding or scans. This card establishes no working adapter or verified output destination.

The dated README flow lists `/plugin marketplace add dancolta/subscope`, `/plugin install subscope@subscope`, then `/subscope-onboard` and `/subscope-run`. Exact commands remain unverified; check the selected version at github.com/dancolta/subscope and `reference/volatile/pricing-install.md → reddit-community`. Run its onboarding or scan commands only after the full writer boundary above is verified. See `reference/install-guide.md` for host/plugin setup and operation verification.

## Auth / keys
**None.** No API key, no Reddit login, it only reads **public RSS feeds**, so the secret-hygiene clipboard script does **not** apply. Feed choices, watchlist/onboarding settings, buyer-signal observations and deduplication history are still private runtime DATA. RSS gives you only what Reddit exposes publicly (recent posts per feed), not authenticated-API breadth.

## Usage, call examples
After all writer destinations and supported redirection are verified, configure the feed watchlist in that PRIVATE runtime, run the selected scoring operation, and review the **ranked buyer-signal list** (posts scored by the 8 buying-intent patterns) plus suggested "authority-play" responses. SQLite results and deduplication history must remain in the PRIVATE versioned companion. Revalidate the effective destinations before each launch, and verify the returned content after the operation. List exact plugin commands from the selected version's README; do not infer readiness from installation or public RSS access.

## General experience & gotchas (踩坑)
- **Very thin adoption (29★, pushed 2026-07).** It's early and lightly used, treat it as experimental: pin the commit you tested, and re-verify behavior before depending on it for a client deliverable.
- **RSS-only = limited window and no deep history.** Public RSS returns a shallow slice of recent posts per feed, not the full-API backfill GummySearch had, it's a *monitoring* tool (catch new buyer signals), not a historical-research tool.
- **The 8 buying-signal patterns are heuristics, not ground truth**, they'll surface false positives ("looking for recommendations" that never converts). Read the actual thread before treating a high score as a lead (CONSTITUTION C1, verify, don't trust the score).
- **No Reddit account = no rate-limit creds**, but RSS endpoints can still throttle if you poll many feeds aggressively, space out polling.
- Free and keyless, so per CONSTITUTION C2 it can be considered before paid social-listening SaaS once its PRIVATE writer boundary and selected operation are verified; accept the shallow-RSS ceiling.

## Failure signals & fallback
Failure looks like: empty or stale buyer-signal lists (RSS feed too narrow or throttled, broaden the feed set / slow the poll), the plugin not loading on Windows (Python self-host path issue, test in a plain shell), or noisy false-positive "leads" (heuristic scoring, read threads to confirm). **Fallbacks:** for broad Reddit browse/search/post-details → **reddit-mcp-buddy** (official API); for semantic discovery of which subreddits to monitor → **reddit-research-mcp**; for paid cross-platform keyword monitoring → Syften (MCP) or free F5Bot; for comment-tree depth → **praw**.

## Last verified: 2026-06
