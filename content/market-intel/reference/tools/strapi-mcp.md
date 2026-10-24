# Tool: Strapi 5 native MCP

- **Domain(s):** content-cms (also: none)
- **Barrier route:** ① · **Source tier:** L1 · **Ready MCP:** yes, **baked into Strapi 5** (self-host)
- **Cost:** free (open-source MIT, self-hosted Community edition) [https://strapi.io/pricing-self-hosted, fetched 2026-06]
- **Repo / Provider:** https://strapi.io (Strapi is OSS, MIT; MCP ships inside Strapi 5, no separate MCP repo)
- **Top pick for its domain:** no (self-host headless; Sanity/WordPress are the defaults)

## What it does / when to pick it
Strapi 5 ships a **native MCP baked into the admin**, **token-scoped per content type**. **Decision rule:** pick when you already self-host a Strapi 5 instance and want compliant, scoped write access without standing up an extra MCP server. It's the self-host headless choice (vs. hosted Sanity/Contentful); choose it for data-sovereignty / on-prem requirements, not for a hosted-convenience win.

## Install
See `reference/volatile/pricing-install.md` → content-cms. The MCP is **baked-in** to Strapi 5, enable it in your self-hosted instance and point the client at it; no separate `npx`/`uvx` package. Auth via an **admin/API token**. Since it's self-host, the endpoint is your own server URL (HTTP). Restart / `/mcp` reconnect after adding.

## Auth / keys
Create an **API token** in Strapi Admin (Settings → API Tokens), scoped to the content types it should touch. Token is a long-lived secret, secret-hygiene: copy via clipboard, edit `~/.claude.json` directly, never echo via `claude mcp add`. See `reference/install-guide.md`.

## Usage, call examples
Tools are scoped per content type: list/create/update/publish entries for the types the token allows. Minimal flow: list a collection type → create an entry → publish (draft-and-publish if enabled). Verify the returned document ID.

## General experience & gotchas (踩坑)
- **No new media upload** via the MCP (matrix-noted), you can reference existing assets but can't push new images/files through it. Plan media out-of-band (Strapi upload API / admin UI).
- **Token scoping is per content type**, a token that works for `article` will 403 on `product` if not granted. Scope errors look like "missing tool" or empty results, not always a clean 401.
- Strapi 5 uses **`documentId`** (not the old numeric `id`) as the stable handle, using v4-style numeric IDs breaks lookups.
- Self-host means **you carry uptime + the instance must be reachable** from the client; behind a VPN/firewall it'll just time out.
- **SEO命门:** headless, set canonical on the rendered front-end if content syndicates.

## Failure signals & fallback
403 / empty results (token not scoped to the type), timeouts (instance unreachable), or "can't upload media" (by design). Use a supported value-free diagnostic for the selected server that returns only allowlisted name, connection status and authentication state; report those states as unverified if unavailable. Verify the selected operation in the active host session before claiming readiness. Fallback within domain: **Sanity hosted MCP** or **Contentful MCP** if you'd rather not self-host; **directus/mcp** for a SQL-backed self-host alternative.

## Last verified: 2026-06
