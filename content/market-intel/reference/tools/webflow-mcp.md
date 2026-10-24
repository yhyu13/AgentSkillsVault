# Tool: webflow/mcp-server

- **Domain(s):** content-cms (also: none)
- **Barrier route:** ① · **Source tier:** L1 · **Ready MCP:** yes, official, hosted/remote with OAuth (also `npx @webflow/mcp-server`)
- **Cost:** free MCP (repo MIT, gh-api verified 2026-06); needs a paid Webflow plan with CMS. Exact CMS site-plan price (previously noted ~$23/mo billed yearly) is unverified, confirm at https://webflow.com/pricing
- **Repo / Provider:** github.com/webflow/mcp-server (`webflow/mcp-server` (132★, gh-api 2026-06), MIT, not archived, pushed 2026-06)
- **Top pick for its domain:** no (fills the Webflow gap, previously this domain only had Webflow as a rate-limit footnote)

## What it does / when to pick it
Webflow's **official MCP**: read/write **CMS collections and items**, create/update/delete items, and **publish** to the live site, plus site/page metadata. **Decision rule:** pick this only when the content lives in a **Webflow site's CMS**, it's the right (and now only first-class) tool for that platform. If you control the stack and just want a blog, static (Hugo/Astro) or WordPress MCP is cheaper and unconstrained; Webflow is a design-led hosted platform, so you choose it because the site is *already* on Webflow, not for headless flexibility.

## Install
See `reference/volatile/pricing-install.md` → content-cms (`webflow/mcp-server`, 132★, official, OAuth). Two paths: the **remote/hosted MCP with OAuth** (Windows-friendly, no local process, preferred), or local stdio `npx @webflow/mcp-server` with a Webflow API token in env. Restart / `/mcp` reconnect after adding; OAuth servers show `! Needs authentication` until you finish the browser consent. Cross-link `reference/install-guide.md` for add/verify mechanics.

## Auth / keys
**OAuth** on the hosted path, authorize in the browser, grant the site, done; **no long-lived key to paste, so little to leak**. If you instead run the local stdio server, it uses a **Webflow API token** (Webflow → Site/Workspace settings → Apps & integrations → API access), that token is a secret: copy via clipboard, edit `~/.claude.json` directly, never echo via `claude mcp add`. See `reference/install-guide.md`.

## Usage, call examples
Tools cover: list collections, list/read items, create/update/delete an item, and **publish** the site (or specific items). Minimal flow: list collections → list items in the target collection → create/patch an item (matching the collection's field slugs) → publish so the change goes live. Items created but not published stay as staged/draft and won't appear on the live site.

## General experience & gotchas (踩坑)
- **Publish rate limit ~1/min** (domain-shard footnote), batch your edits, then publish **once** at the end; firing a publish per item will throttle/queue you.
- **Two-step model:** writing a CMS item ≠ live. "I created it but it's not on the site" almost always means you never published. Publish is a distinct call.
- **Field slugs are strict**, items must match the collection's defined fields (slug + type); a typo'd or missing required field is rejected, not silently dropped.
- **Star reality:** repo is 132★, MIT, pushed 2026-06 (actively maintained, official). It's new to this domain (was only a rate-limit footnote before the 2026-06 refresh), treat it as a recently-promoted first-class source.
- **SEO命门:** if Webflow content is also syndicated elsewhere, set the canonical URL to your Webflow original to avoid dedup penalties (general content-cms rule).
- **Signup is PerimeterX/Akamai fingerprint-blocked** (confirmed 2026-06-16), `webflow.com/signup` returns "Access to this page has been denied" page immediately on headless navigation. No bypass via UA spoof, cookies, or stealth in tested config. **User-only signup in a normal browser.** Once the account exists, API token is at Workspace settings → Integrations → Generate API token; OAuth path for the MCP works normally once the account is real.

## Failure signals & fallback
`! Needs authentication` in `claude mcp list` (OAuth not completed), publish throttling (you exceeded ~1/min), or field-validation errors (item doesn't match collection schema). Verify `✓ Connected`. Fallback within domain: there is no like-for-like Webflow alternative, if you only need cross-platform publishing rather than Webflow specifically, use **Pipepost** (multi-platform syndication) or move the blog to **WordPress MCP** / static (Hugo/Astro).

## Last verified: 2026-06
