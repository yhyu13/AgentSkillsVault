# Tool: directus/mcp

- **Domain(s):** content-cms (also: none)
- **Barrier route:** ① · **Source tier:** L1 · **Ready MCP:** yes, official (`directus/mcp`; exact npm package name / "ships-with-Directus" packaging unverified, confirm at https://github.com/directus/mcp)
- **Cost:** free, MCP repo is MIT (gh-api verified 2026-06). Directus core licensing (BSL/OSS) and any Cloud pricing tier are unverified, confirm at https://directus.io/pricing
- **Repo / Provider:** github.com/directus/mcp (`directus/mcp` (79★, gh-api 2026-06), MIT, not archived, pushed 2026-02; backs the SQL-backed Directus core `directus/directus` 36.0k★)
- **Top pick for its domain:** no (WordPress MCP / Sanity hosted MCP are the defaults; directus is the SQL-backed-stack pick)

## What it does / when to pick it
Official MCP for **Directus**, the headless CMS/data platform that sits **on top of your own SQL database** (Postgres/MySQL/SQLite/etc.) and exposes every table as a collection. The MCP exposes those collections + items (read/create/update/delete) and flows to an agent. **Decision rule:** pick this only when the project is already backed by **Directus over a relational DB**, i.e. you want the CMS to *be* your existing SQL schema, not a content-first store. For a true content-first headless experience prefer **Sanity hosted MCP**; for a plain blog use **WordPress MCP** or static (Hugo/Astro). Choosing directus is a data-architecture decision (SQL is the source of truth), not a convenience win.

## Install
See `reference/volatile/pricing-install.md` → content-cms (`directus/mcp`, 79★, official). The MCP talks to a **running Directus instance** (self-host or Directus Cloud), so the endpoint is your own server URL, HTTP transport, Windows-friendly (no local Node process if you point at the hosted instance). Per repo, it can run as a Directus extension/marketplace install inside the instance, or as a standalone stdio server pointed at your Directus URL + token. Restart / `/mcp` reconnect after adding; cross-link `reference/install-guide.md` for the add/verify mechanics.

## Auth / keys
Auth with a **Directus static access token** (Directus admin → User → Token) or a logged-in session, scope the token's role to the collections it should touch. The static token is a long-lived secret: secret-hygiene, copy via clipboard, edit `~/.claude.json` directly, **never echo it via `claude mcp add`** (which prints the command incl. the token to the transcript). See `reference/install-guide.md` secret-handling.

## Usage, call examples
Tools map to Directus items/collections: list collections, read items (with filter/sort), create/update/delete an item, and read schema. Minimal flow: list collections → read the target collection's items with a filter → create or patch an item → confirm the returned primary key. Because collections == your SQL tables, the tool surface mirrors your DB schema exactly.

## General experience & gotchas (踩坑)
- **Permissions are role-based, enforced server-side**, a token whose role lacks a collection returns empty/403, not a clean "tool missing". Always confirm the role grants the collections you target before assuming the MCP is broken.
- **It is your SQL DB**, destructive item ops (delete/update) hit real rows. Test against a non-prod collection first; there is no Keepa-style undo.
- **Star reality:** the MCP repo itself is small (79★, pushed 2026-02, relatively new/quiet); the weight is the Directus core platform (36k★). Don't read the MCP's low star count as "immature platform".
- **Versioning:** Directus moves fast; an older self-hosted instance may not expose the same item/flow tools the latest MCP expects, match MCP version to your Directus version.
- **SEO命门:** headless, if a rendered site syndicates Directus content, set the canonical URL on the front-end, not in the CMS row.

## Failure signals & fallback
Empty results / 403 (token role not granted the collection), connection timeout (Directus instance unreachable / wrong URL), or schema-mismatch errors (MCP vs Directus version skew). Use a supported value-free diagnostic for the selected server that returns only allowlisted name, connection status and authentication state; report those states as unverified if unavailable. Verify the selected operation in the active host session before claiming readiness. Fallback within domain: **Strapi 5 native MCP** (the other self-host headless option, token-scoped per content type), or **Sanity hosted MCP** / **Contentful MCP** if you'd rather not run your own instance.

## Last verified: 2026-06
