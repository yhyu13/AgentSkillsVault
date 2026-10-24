# Tool: Notion hosted MCP

- **Domain(s):** content-cms (also: none)
- **Barrier route:** ① · **Source tier:** L1 · **Ready MCP:** yes, hosted HTTP `https://mcp.notion.com/mcp` (OAuth)
- **Cost:** free with any Notion plan (MCP itself is free; uses your existing workspace); Enterprise admins can gate MCP clients [price unverified 2026-06, confirm at https://www.notion.com/help/notion-mcp]
- **Repo / Provider:** https://www.notion.so (hosted MCP, not a self-host repo)
- **Top pick for its domain:** no (use as a lightweight CMS via a status property, not a real headless CMS)

## What it does / when to pick it
Notion's official hosted MCP, reads/writes **Notion-flavored markdown** and is notably **token-efficient** (compact output, good for keeping context small). **Decision rule:** pick when the "CMS" is really a Notion database used as an editorial/content backend, model publish state with a **status property** (e.g. Draft → Published). It's not a true headless CMS; for production content infra prefer Sanity/Contentful/WordPress. Great for internal content ops, research notes, and editorial pipelines.

## Install
See `reference/volatile/pricing-install.md` → content-cms. Add the remote HTTP MCP `https://mcp.notion.com/mcp` and complete the **OAuth** flow. HTTP transport is Windows-friendly. Restart / `/mcp` reconnect after adding; OAuth servers show `! Needs authentication` until you finish browser consent.

## Auth / keys
OAuth, no long-lived key to paste, little to leak. Authorize in the browser and grant the specific pages/databases the integration may see (Notion's connection picker is page-scoped). See `reference/install-guide.md` for connect/verify mechanics. (No bearer-key clipboard dance needed; it's OAuth.)

## Usage, call examples
Tools cover search, page/database read, create/update pages, and append blocks (markdown). Minimal CMS flow: query the content database filtered by `Status = Ready` → create/update the page body → flip the status property to `Published`. Output is Notion markdown, so it round-trips cleanly.

## General experience & gotchas (踩坑)
- **Page-scoped sharing trap:** the integration only sees pages explicitly shared with it. "It returns nothing" almost always means the database/page wasn't connected to the integration, not an auth failure.
- **Rate limit ~3 req/s** (matrix-noted, Notion API standard), batch/paginate; bursts get 429'd.
- Token-efficient output is a real advantage when scanning many pages, but **block-level fidelity is lossy** (complex Notion blocks → flattened markdown); don't treat it as a perfect HTML source.
- "As a CMS" only works if you **enforce the status property** in your own render/sync step, Notion has no native publish/unpublish.
- **SEO命门:** if a Notion-backed site syndicates, set canonical on the rendered output.

## Failure signals & fallback
Empty results (page not shared with integration), 429 (rate limit), or `! Needs authentication` (OAuth incomplete) in `claude mcp list`. Fallback within domain: **WordPress MCP** / **Sanity hosted MCP** for a real CMS backend; **Pipepost** if the goal is multi-platform publishing rather than a Notion store.

## Last verified: 2026-06
