# Tool: Sanity hosted MCP

- **Domain(s):** content-cms (also: none)
- **Barrier route:** ① · **Source tier:** L1 · **Ready MCP:** yes, hosted HTTP `https://mcp.sanity.io` (OAuth, GA)
- **Cost:** free tier $0 forever (2 datasets, 20 seats); Growth $15/seat/mo [https://www.sanity.io/pricing, fetched 2026-06]
- **Repo / Provider:** https://www.sanity.io (hosted MCP, not a self-host repo)
- **Top pick for its domain:** yes (best headless experience)

## What it does / when to pick it
Sanity's official hosted MCP: **40+ schema-aware tools**; it reads your project's schema and keeps its rules auto-updated, so writes respect your content types. **Decision rule:** pick this when the project is a true **headless / structured-content** CMS (multi-channel, typed content, GROQ queries), it is the cleanest headless experience in the domain. If the backend is a plain WordPress blog, use WordPress MCP; if you just want a fully owned blog with no platform, use static (Hugo/Astro).

## Install
See `reference/volatile/pricing-install.md` → content-cms. Two paths: the `sanity` CLI auto-configures the MCP, **or** add the remote HTTP MCP `https://mcp.sanity.io` and complete the **OAuth** flow. HTTP transport is Windows-friendly (no local Node process). Restart / `/mcp` reconnect after adding; OAuth servers show `! Needs authentication` until you finish the browser consent.

## Auth / keys
Complete OAuth through the host's supported browser flow and verify the selected project and operation. OAuth tokens and account identifiers are private even when no key is pasted. Keep session state in approved PRIVATE configuration and avoid commands or screenshots that expose credentials. See `reference/install-guide.md` for the connect/verify mechanics.

## Usage, call examples
Tools cover document create/patch/publish, schema introspection, GROQ query, and dataset ops. First verify a bounded schema or read query and its content. Prepare and review the intended document before an authorized write or publication. Schema validation does not prove that a dataset is private or that publication is authorized.

## General experience & gotchas (踩坑)
- **GA, schema-aware = the domain's strongest fit** for structured content; this is why it's a top pick alongside WordPress MCP.
- Historical free-tier notes describe **public datasets only**; confirm current plan terms and dataset visibility. Public test datasets may contain only synthetic generator-owned fixtures. Keep real research and operational outputs in PRIVATE versioned DATA; a draft flag does not establish privacy.
- OAuth scope is per-project/per-org; if you're in the wrong org the tools connect but return empty/permission errors, confirm the active project.
- Drafts vs. published is a real distinction in Sanity (`drafts.` prefix); "I created it but it's not live" usually means you created a draft and never published.
- **SEO命门:** if Sanity feeds a site that also syndicates, set canonical on the rendered front-end.
- **8-step onboarding wizard before any token can issue** (confirmed 2026-06-16), `/get-started` walks useCase → referralSource → javascriptLevel → projectType → projectName → technologies → isIntegratingExisting → isMigratingCms. Radios use `sr-only` (visually hidden) inputs under cosmetic labels; clicks must hit `label[for=...]`, not the `<input>`. Sticky page header intercepts `playwright.click` events, fall back to JS `.click()` on the label. **Project must exist before any API token can be created.**
- **Robot tokens are project-scoped.** Use only the role needed for the authorized operation and verify the current provider instructions. Keep real project identifiers, organization identifiers and tokens in approved PRIVATE companion configuration; do not copy them into public examples or command output.
- **Free Growth Trial = 30 days**, then converts to Personal (free, public datasets only). Trial gives access to AI Assist + Comments + Scheduled drafts; if you depend on those past day 30 budget for paid Growth.

## Failure signals & fallback
Missing active-session operation exposure, authorization failure, or content from the wrong project requires setup or correction. A saved connection listing does not prove readiness, and an empty result alone does not identify the cause. Fallback within domain: a separately verified **WordPress MCP** for a blog backend, or **Contentful MCP** for multi-locale content.

## Last verified: 2026-06
