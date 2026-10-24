# Tool: Contentful MCP (official)

- **Domain(s):** content-cms (also: none)
- **Barrier route:** ① · **Source tier:** L1 · **Ready MCP:** yes (official, connected)
- **Cost:** free tier $0 (100K API calls/mo, no overages, 2 locales); Lite $300/mo (1M calls) [https://www.contentful.com/pricing/, fetched 2026-06]
- **Repo / Provider:** github.com/contentful/contentful-mcp-server, `contentful/contentful-mcp-server (58★, gh-api 2026-06)` (MIT, pushed 2026-06, active); provider https://www.contentful.com
- **Top pick for its domain:** no (Sanity is the headless top pick; pick Contentful for multi-locale/enterprise fit)

## What it does / when to pick it
Official Contentful MCP: create/edit/publish entries with **multi-locale** support. **Decision rule:** pick over Sanity when the project already runs on Contentful, or when **localization across many locales** is the central requirement, that's Contentful's strength. Both are headless; default to Sanity for greenfield (schema-aware, cheaper private datasets) and Contentful when the team/stack is already there.

## Install
See `reference/volatile/pricing-install.md` → content-cms. Add the official Contentful MCP; auth via a **CMA token** (Content Management API). Prefer HTTP transport on Windows. Restart / `/mcp` reconnect after adding.

## Auth / keys
Get a **CMA (Content Management API) token** from the Contentful web app → Settings → API keys → Content management tokens. The CMA token is a long-lived secret, secret-hygiene applies: copy via clipboard, edit `~/.claude.json` directly, never `browser_snapshot` the token page, never echo it via `claude mcp add`. See `reference/install-guide.md`.

## Usage, call examples
Tools cover entry/asset create-update-publish, content-type introspection, and locale-aware field edits. Minimal flow: get content type → create entry with localized fields (`{ "en-US": ..., "de-DE": ... }`) → publish. Verify the entry ID + published version.

## General experience & gotchas (踩坑)
- Free tier is genuinely generous for research (**100K API calls/mo, no overages**), but the first paid step is a cliff: **Lite is $300/mo**. Stay on free unless you truly need 1M calls or extra locales.
- **Draft vs. published is versioned**: every publish increments a version; editing a published entry creates a draft delta you must publish again. "Edited but not live" = unpublished draft version.
- Multi-locale fields are objects keyed by locale code, sending a bare string to a localized field errors or only sets the default locale.
- Free tier caps at **2 locales**; multi-locale work past that forces the paid plan.
- **SEO命门:** Contentful is headless, set canonical on the rendered front-end, especially if content syndicates.
- **Signup is half-OAuth half-captcha** (confirmed 2026-06-16), "Continue with Google" works for the OAuth leg, but redirects to a follow-up lead-gen form at `be.contentful.com/register` that has BOTH `g-recaptcha-response` AND `h-captcha-response` textareas. Submit silently no-ops without both solved. Account is not fully provisioned until the form clears; `app.contentful.com` redirects back to /login until then. **The agent can drive the OAuth leg; the user must clear both captchas.**
- **CMA token (Content Management API), not Content Delivery, is what you want for read+write.** It lives at Settings → API keys → "Add API key" inside a space (so a space must exist first). The displayed "Personal Access Tokens" UI under user profile is a different surface, also valid for management, scoped to your user not a space.

## Failure signals & fallback
401 (revoked/space-mismatched CMA token) or validation errors on localized fields → use a supported value-free diagnostic for the selected server that returns only allowlisted name, connection status and authentication state; report those states as unverified if unavailable. Confirm the intended space/environment in private configuration and verify the selected operation in the active host session before claiming readiness. Fallback within domain: **Sanity hosted MCP** (the other major headless option), or **WordPress MCP** for a non-headless blog target.

## Last verified: 2026-06
