# Tool: Ghost MCP (MFYDev/ghost-mcp)

- **Domain(s):** content-cms (also: none)
- **Barrier route:** ① · **Source tier:** L1 · **Ready MCP:** yes (~45 tools)
- **Cost:** free (self-hosted/Ghost(Pro) site; MCP server is FOSS), no per-call fee
- **Repo / Provider:** github.com/MFYDev/ghost-mcp, `MFYDev/ghost-mcp (199★, gh-api 2026-06)` (MIT, pushed 2026-04, active)
- **Top pick for its domain:** no (Ghost-specific; WordPress/Sanity are the general picks)

## What it does / when to pick it
Ghost CMS MCP with ~45 tools covering posts/pages plus Ghost-native commerce: **members, newsletters, tiers**. **Decision rule:** pick this only when the target site runs Ghost. Its differentiator over WordPress MCP is membership/newsletter/tier management, choose it when the research/publish task touches paid subscriptions or email, not just blog posts.

## Install
See `reference/volatile/pricing-install.md` → content-cms. Needs `GHOST_URL` + `GHOST_ADMIN_API_KEY`. Runs as a stdio MCP; on Windows test in a plain shell first (prefer HTTP if the build offers it). Restart / `/mcp` reconnect after adding.

## Auth / keys
Create a **Custom Integration** in Ghost Admin (Settings → Integrations) to get the **Admin API key** (the `id:secret` form) and the API URL. The Admin key signs short-lived JWTs, it must reach the server but never the transcript. Secret-hygiene: copy via clipboard, edit `~/.claude.json` directly, never `browser_snapshot` the integration page. See `reference/install-guide.md`.

## Usage, call examples
Tools cover post/page CRUD + publish, members list/create, newsletters, tiers. Minimal flow: create a post (title + mobiledoc/HTML), set status `published`. For commerce work: list members or create a tier. Verify returned IDs.

## General experience & gotchas (踩坑)
- **D-404:** the community `@ryukimin/ghost-mcp` is dead (404), it was a personal repo, not the Ghost org. MFYDev/ghost-mcp is the live replacement the matrix points to.
- Not an official Ghost-org project (199★ community repo, MIT), pin a known-good version; a breaking Ghost Admin API change can ripple before the repo catches up.
- Ghost Admin API uses **JWT auth with a ±5-minute clock window**, if the host clock drifts, every call 401s. Symptom: intermittent auth failures that "fix themselves" after an NTP sync.
- Post bodies historically used **mobiledoc**; newer Ghost prefers **lexical**. Passing the wrong format can produce an empty-looking post body. Prefer HTML source and let Ghost convert.
- **SEO命门:** cross-posting Ghost content elsewhere → set canonical to the Ghost original.

## Failure signals & fallback
Persistent 401 (clock skew or revoked key) or missing membership tools (older Ghost) → use a supported value-free diagnostic for the selected server that returns only allowlisted name, connection status and authentication state; report those states as unverified if unavailable. Verify the selected operation in the active host session before claiming readiness. Fallback: **Pipepost** also publishes to Ghost as part of multi-platform syndication; for a fully owned target, **static blog** (Hugo/Astro + claude-blog).

## Last verified: 2026-06
