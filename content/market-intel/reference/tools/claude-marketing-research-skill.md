# Tool: ishwarjha/claude-marketing-research-skill

- **Domain(s):** ready-skills (also: none)
- **Barrier route:**, (packaged skill; data barrier handled by whatever MCPs you connect) · **Source tier:** L1 · **Ready MCP:** no, packaged skill, installed from GitHub
- **Cost:** free (Apache-2.0) [github.com/ishwarjha/claude-marketing-research-skill, gh-api 2026-06]
- **Repo / Provider:** github.com/ishwarjha/claude-marketing-research-skill, `ishwarjha/claude-marketing-research-skill (43★, gh-api 2026-08-01)`; not archived, but **thin adoption (43★) and last push 2026-03 (~5mo)**, newer than 18mo, so not dead, but low-traction; verify it still installs before relying on it.
- **Top pick for its domain:** no (specialist: a single packaged research *pipeline*)

## What it does / when to pick it
A **6-stage market-research workflow**: competitor → product → persona → positioning (and through to the research deliverable). **Decision rule:** pick this when the user wants a *structured, end-to-end market-research pipeline* out of the box rather than assembling research steps themselves, it's the shard's named "packaged market-research pipeline" choice. For broad marketing/ads/email/SEO, use `marketingskills` / `claude-seo`; for *discovery* of other skills, use the `awesome-claude-skills` catalog.

## Install
Install from GitHub (clone / packaged-skill install, **not** `npx skills add`, **not** an MCP). See shard `reference/domains/ready-skills.md` (listed as "GitHub"). Activates on session restart. L0 mechanics: `reference/install-guide.md`. Because adoption is thin, confirm the repo's current README install steps before quoting an exact command.

## Auth / keys
None for the skill itself, it's a workflow template. As with every ready-skill, output is only as grounded as the data MCPs you connect (competitor stage → a SERP/web MCP like Tavily/Bright Data; persona/positioning → social/community sources). No key-bearing secret in the skill, so no secret-hygiene note here.

## Usage, call examples
Invoke the skill and feed it a product/market; it walks the 6 stages (competitor → product → persona → positioning → …) producing a structured research artifact. Minimal flow: install → restart → run on your target market → review each stage's output, grounding competitor/persona claims against real data MCPs rather than trusting the template's generated assertions.

## General experience & gotchas (踩坑)
- **Thin adoption (43★) and a ~5-month-old last push**, usable and recent enough (not in the 18mo "dead" zone), but lower-traction than the 8k to 32k★ bundles; treat as a convenience template, verify it installs cleanly.
- **Pipeline output is a scaffold, not validated facts.** The 6 stages structure the *thinking*; competitor/persona/positioning claims must be grounded against real sources (shard: the skill is a shell, the work is the MCP wiring).
- **Single-purpose**, it does market research and not much else; don't reach for it for ads/email/SEO execution.
- Apache-2.0, free; star count was absent from the shard (shard lists it without a number), annotated here from gh-api as 43★.

## Failure signals & fallback
Failure looks like: stale/broken install (low maintenance), or stage output that's plausible but ungrounded. **Fallbacks:** broad marketing → `marketingskills`; SEO depth → `claude-seo`; first-party + `/competitive-brief` → Anthropic Marketing plugin; can't find/trust a skill → discover alternatives via `awesome-claude-skills` catalog or the mega-bundle `alirezarezvani/claude-skills` (has its own market-research module).

## Last verified: 2026-06
