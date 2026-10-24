# Tool: WordPress MCP (WordPress/mcp-adapter, official)

- **Domain(s):** content-cms (also: none)
- **Barrier route:** ① · **Source tier:** L1 · **Ready MCP:** yes (official WP MCP via Abilities API)
- **Cost:** free (self-hosted WordPress; MCP plugin is FOSS), no per-call fee
- **Repo / Provider:** github.com/WordPress/mcp-adapter, `WordPress/mcp-adapter (1.7k★, gh-api 2026-06)` (GPL-2.0, pushed 2026-06, active)
- **Top pick for its domain:** yes (the CMS-backend default alongside Sanity)

## What it does / when to pick it
Official WordPress MCP exposing the Abilities API: post CRUD + publish, media, categories/taxonomy. **Decision rule:** pick this when the backend is an existing WordPress site you control (most of the long-tail web) and you want compliant write access without scraping. If you own the publishing target outright and want zero platform/runtime, prefer **static blog** (Hugo/Astro + claude-blog skill). For headless/structured-content projects use **Sanity hosted MCP** instead.

## Install
See `reference/volatile/pricing-install.md` → content-cms for the current line. Install the official MCP plugin on the WP site; it speaks MCP over the site's REST surface. Auth = WordPress **Application Password** (Users → Profile → Application Passwords). On Windows prefer HTTP transport. Restart / `/mcp` reconnect after adding.

## Auth / keys
Generate an Application Password in wp-admin (not your login password); scope it to a dedicated bot user with only the roles it needs. Secret-hygiene: do not paste the app-password into the transcript or `browser_snapshot` the page that shows it, copy via clipboard, edit `~/.claude.json` directly. See `reference/install-guide.md` (Secret-handling hygiene).

## Usage, call examples
MCP tools cover create/update/publish posts, upload media, manage categories. Minimal flow: create a draft post (title + HTML/markdown body) → set category → set status `publish`. Confirm the returned post ID + permalink before declaring success.

## General experience & gotchas (踩坑)
- **D-SUPERSEDED:** the old `gaupoit/wordpress-mcp` (0★) and archived `Automattic/wordpress-mcp` are stale, use WordPress/mcp-adapter (official, the one re-homed under the WordPress org). The matrix lists this explicitly.
- Abilities API exposure depends on the site's plugin version; older WP installs may not surface every tool, check what's actually connected, don't assume full CRUD.
- App Password auth fails silently if the site is behind a security plugin/host that strips the `Authorization` header (common on managed WP). Symptom: 401 on every write despite a valid password.
- Block-editor (Gutenberg) posts want block markup; plain HTML works but may render as a single Classic block.
- **SEO命门 (cross-post):** if you syndicate the same post elsewhere, set the canonical URL to your WP original or eat a dedup penalty.

## Failure signals & fallback
401/403 on writes (header stripped or app-password revoked) → use a supported value-free diagnostic for the selected server that returns only allowlisted name, connection status and authentication state; report those states as unverified if unavailable. A connected label is only a diagnostic; verify the selected operation in the active host session. If the host blocks the REST/MCP surface entirely, fall back to **Pipepost** (multi-platform, also pushes to WP) or, for a controllable target, **static blog** (Hugo/Astro + claude-blog).

## Last verified: 2026-06
