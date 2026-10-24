# Tool: Pipepost (multi-platform)

- **Domain(s):** content-cms (also: social-publishing)
- **Barrier route:** ① · **Source tier:** L2 · **Ready MCP:** yes, local-first stdio MCP (`MendleM/Pipepost`), runs on your machine
- **Cost:** free with **3 credits/month**; purchased credits never expire (cross-publish to 5 platforms = 1 credit; publish + social generation for one article ≈ 2 credits) [pipepost.com pricing unreachable from this env 2026-06, confirm at https://pipepost.com; credit model per project README/Glama]
- **Repo / Provider:** master lists `https://pipepost.com`, but the real artifact is github.com/MendleM/Pipepost, `MendleM/Pipepost (4★, gh-api 2026-08-01)`, MIT, not archived, pushed 2026-04-16 (fresh). ⚠ very thin adoption (4★), verify it still works before relying on it.
- **Top pick for its domain:** no (it's the cross-platform syndication pick, not the default-publish pick)

## What it does / when to pick it
One MCP that publishes a single Markdown draft to **Dev.to, Hashnode, Ghost, WordPress, Medium, Substack** and broadcasts to **LinkedIn, X, Bluesky, Mastodon**, with SEO scoring, canonical-URL wiring, Unsplash covers, and IndexNow ping. **Decision rule:** pick Pipepost only when the job is *syndicating one article across many platforms at once*. For a single CMS backend use **WordPress MCP / Sanity hosted MCP**; for your own controllable blog use **static blog** (Hugo/Astro). It complements, not replaces, those, it is the "blast it everywhere with the right canonical" layer.

## Install
Local-first stdio MCP (not a hosted SaaS). See `reference/volatile/pricing-install.md` → content-cms for the current line. Install dependencies per the selected `MendleM/Pipepost` README. Before startup, use the full Market checkout's `tools/private_inventory.py` to verify an existing PRIVATE versioned runtime for configuration, drafts, caches, logs and publication receipts. Use supported absolute path redirects and revalidate before launch. The upstream configuration default is `~/.pipepost/config.json`; if that path is fixed, require a supported filesystem backing whose resolved PRIVATE versioned destination the resolver can prove. A later backup of a loose home-local file does not prove the writer's destination. Keep the tool in setup if no supported redirect or verifiable filesystem backing exists, or if any other real writer lacks a verified destination; these adapters have not been exercised here. On Windows, stdio MCPs are flaky (path/shell), test in a plain shell first; restart / `/mcp` reconnect after adding. See `reference/install-guide.md` (L0 mechanics, MCP transport, Windows).

## Auth / keys
You supply **per-platform** API tokens (Dev.to API key, Hashnode PAT, Ghost Admin API key, WP Application Password, Medium token, etc.) plus optional Unsplash key, loaded from the verified private configuration established above. Secret-hygiene: never paste these into the transcript or `browser_snapshot` a token page; copy via clipboard into the supported private configuration or the host's approved private secret store and backup. See `reference/install-guide.md` → Secret-handling hygiene.

## Usage, call examples
After the private runtime is verified, draft Markdown with front matter at an approved absolute path in that PRIVATE versioned runtime → call the publish tool with the target platform list and your **original/canonical URL** → Pipepost cross-posts, sets `rel=canonical` on each copy, generates social posts, and pings IndexNow. Confirm each returned post URL before declaring success. SEO-score tool can be run on the draft first.

## General experience & gotchas (踩坑)
- **SEO命门 (shard):** ALWAYS set the canonical URL to your own original before syndicating, Pipepost wires `rel=canonical`, but if you point it wrong (or omit it) the duplicated copies get **dedup-penalized** by search. This is the single most important field.
- **Master metadata is stale/misleading:** master lists provider `https://pipepost.com` (looks like a SaaS), but the real thing is a 4★ MIT GitHub MCP that runs locally, frame cost as a **credit model**, not a monthly subscription.
- **Thin adoption (4★):** treat as experimental. One person's tool; verify each platform's token still authenticates rather than assuming all 10 destinations work.
- **Per-platform quirks pass through:** Medium's API is import-only (canonical import), Dev.to/Hashnode honor `canonical_url`, Ghost needs the Admin key (not Content key). A failure on one destination does not roll back the others, check every returned URL.
- **Rate limits are the downstream platform's,** not Pipepost's: Webflow publish 1/min, Notion ~3 req/s (per shard), Pipepost won't shield you from those.
- pipepost.com itself refused connections from this environment (2026-06), pricing/feature claims here are from the GitHub README + Glama listing + web search, not a live fetch.

## Failure signals & fallback
Failure = an auth error on one platform (bad/expired per-platform token), or copies published with no/incorrect canonical (SEO risk). If Pipepost is unreliable (it's 4★), fall back to publishing per-platform directly: **WordPress MCP** / **Ghost MCP** / **Sanity hosted MCP** for the CMS backend, **Buffer**/**Postiz** for the social broadcast, and **static blog** (Hugo/Astro) as the canonical original.

## Last verified: 2026-06
