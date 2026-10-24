# Tool: alirezarezvani/claude-skills

- **Domain(s):** ready-skills (also: none)
- **Barrier route:**, (skill mega-bundle; no data barrier of its own) · **Source tier:** L2 · **Ready MCP:** no, distributed through a plugin marketplace; selected plugins require a separate install
- **Cost:** free (MIT) [github.com/alirezarezvani/claude-skills, gh-api 2026-06]
- **Repo / Provider:** github.com/alirezarezvani/claude-skills, `alirezarezvani/claude-skills (23.5k★, gh-api 2026-07-31)`; active (pushed 2026-06-07, not archived, MIT)
- **Top pick for its domain:** no (huge, but breadth-over-depth; reach for the focused bundles first)

## What it does / when to pick it
A **mega bundle of 338 skills** including market-research, C-level/exec, and finance modules. **Decision rule:** pick this when you want *one install that covers a wide surface* (including business-ops/exec/finance that the focused marketing bundles lack), or when a focused bundle is missing a niche skill. For the everyday marketing/competitor/content default, `marketingskills` is leaner; for SEO, `claude-seo`. Use this as the broad fallback, not the first reach (L2 tier vs the L1 focused picks).

## Install
`/plugin marketplace add alirezarezvani/claude-skills` registers the marketplace catalog only.
Inspect that catalog or the selected version's manifest, choose the actual plugin IDs
needed for this task, and use the host's plugin manager to install and enable those
plugins. Current plugin and marketplace IDs are unverified here; do not guess them from
the repository name. This is a plugin workflow, not an MCP registration.

Restart or reconnect the active host after installation, then verify the selected
plugin's exposed skills or commands and the intended operation. Registration alone or
a restart alone does not make the catalog's entire contents available. See the
[installation guide](../install-guide.md) for host scope and readiness checks.

## Auth / keys
None to install. With 338 skills the relevant concern isn't keys but **scope**: only the skills you actually invoke matter, and each is only as grounded as the data MCP behind it (the recurring shard lesson, the skill is a shell; the data wiring is the work). No secret in the bundle, so no secret-hygiene note.

## Usage, call examples
After the selected plugins are installed and enabled, inspect their current command or
skill surface and invoke the one needed for the task. The counts above describe a dated
catalog snapshot, not a promise that every skill is installed. Verify the selected
operation after reconnecting; keep it in setup while its plugin ID, activation or
execution remains unverified. Data-dependent conclusions still require the relevant
source connections and usable results.

## General experience & gotchas (踩坑)
- **338 skills = massive surface clutter.** This is the main cost: the skill list balloons, making the *right* skill harder to find than in a focused 40-skill bundle. Know the skill name you want before installing.
- **Breadth over depth.** Any single module (e.g. its market-research) is generally shallower than a purpose-built bundle (`ishwarjha` for the research pipeline, `claude-seo` for SEO). Use it to *cover gaps*, not as the primary tool for a domain that already has a focused L1 pick.
- shard tier **L2** (vs L1 for `marketingskills`/`claude-seo`), reflects "broad but not the sharpest"; the shard's default-pick rule routes marketing→`marketingskills`, SEO→`claude-seo`, research→`ishwarjha`, leaving this as the wide-coverage backstop.
- Still: free MIT, 17.6k★, pushed 2026-06, well-maintained, safe to recommend as the breadth option.

## Failure signals & fallback
Failure looks like: drowning in skill clutter, or a module that's too shallow for the task. **Fallbacks (go more focused):** marketing → `marketingskills`; SEO → `claude-seo`; packaged research → `ishwarjha/claude-marketing-research-skill`; business-ops specifically → `ericosiu/ai-marketing-skills`; pure discovery of yet more skills → `awesome-claude-skills` catalog.

## Last verified: 2026-06
