# Tool: AgricIDaniel/claude-seo

- **Domain(s):** ready-skills (also: serves seo-keywords work)
- **Barrier route:**, (skill/plugin scaffolding; runs offline, no data barrier of its own) · **Source tier:** L1 · **Ready MCP:** no, Claude plugin; marketplace registration and selected-plugin installation are separate
- **Cost:** free (MIT) [github.com/AgricIDaniel/claude-seo, gh-api 2026-06]
- **Repo / Provider:** github.com/AgricIDaniel/claude-seo, `AgricIDaniel/claude-seo (16.3k★, gh-api 2026-07)`; active (pushed 2026-07-06, not archived, MIT)
- **Top pick for its domain:** yes (the default SEO pick in this domain)

## What it does / when to pick it
The strongest ready-made SEO plugin: **25 sub-skills + 18 agents**, runs **offline** (no API key to function). Covers technical/on-page audit, keyword and content workflows, internal linking, SERP/competitor analysis scaffolding. **Decision rule:** when the ask is *SEO specifically* (audit, keyword strategy, content optimization), pick `claude-seo` over the general `marketingskills` bundle, it's the shard's named SEO default. For a broad marketing workflow (ads/email/competitor), go to `marketingskills`; for first-party + Ahrefs-wired, the Anthropic plugin.

## Install
`/plugin marketplace add AgricIDaniel/claude-seo` registers the marketplace catalog only.
Inspect that catalog or the selected version's manifest, choose the actual plugin IDs
needed for this task, and use the host's plugin manager to install and enable those
plugins. Current plugin and marketplace IDs are unverified here; do not guess them from
the repository name. This is a plugin workflow, not an MCP registration.

Restart or reconnect the active host after installation, then verify the selected
plugin's exposed skills or commands and the intended operation. Registration alone or
a restart alone does not make the catalog's entire contents available. See the
[installation guide](../install-guide.md) for host scope and readiness checks.

## Auth / keys
**None to run, it works offline** (its differentiator). No secret-hygiene concern for the plugin itself. The ceiling, as with every ready-skill, is the data you feed it: to make audits/keyword work *data-real* rather than heuristic, connect a live source (GSC for your own site's real clicks/impressions → `gsc-mcp`; backlinks → `ahrefs-mcp`; bulk SERP → `dataforseo`). Those carry their own auth.

## Usage, call examples
After the selected plugins are installed and enabled, inspect their current command or
skill surface and invoke the one needed for the task. The counts above describe a dated
catalog snapshot, not a promise that every skill is installed. Verify the selected
operation after reconnecting; keep it in setup while its plugin ID, activation or
execution remains unverified. Data-dependent conclusions still require the relevant
source connections and usable results.

## General experience & gotchas (踩坑)
- **Offline = heuristic, not measured.** Out of the box it reasons from SEO best practices; it does *not* see your real rankings/traffic unless you connect GSC or a SERP/backlink MCP. Don't present offline output as measured data.
- **Largest agent/skill count in the domain** (25 + 18), powerful but adds a lot of skills/agents to the surface; expect list clutter.
- shard "Judgment": the skill is a shell; **the work moved to MCP wiring + auth**, the SEO ceiling is set by whether you wire GSC (own-site truth) / Ahrefs (backlinks) / DataForSEO (bulk SERP) behind it.
- Free MIT, 11.5k★, recent push (2026-07), recommend without a staleness caveat.

## Failure signals & fallback
Failure looks like: confident SEO recommendations with **no real-rank/traffic grounding** (no data MCP connected), or skill clutter making the right sub-skill hard to find. **Fallbacks:** own-site real metrics → `gsc-mcp` (free); backlinks → `ahrefs-mcp`; bulk SERP/keyword volume → `dataforseo` (cheap) or free self-host `searxng`; broad (non-SEO) marketing → `marketingskills`.

## Last verified: 2026-06
