# Tool: ComposioHQ/awesome-claude-skills

- **Domain(s):** ready-skills (also: none)
- **Barrier route:**, (a catalog/index, not an installable runtime) · **Source tier:** L2 · **Ready MCP:** no, it's a **discovery catalog** (curated list), not a skill or MCP you run
- **Cost:** free (no license declared on repo) [github.com/ComposioHQ/awesome-claude-skills, gh-api 2026-06]
- **Repo / Provider:** github.com/ComposioHQ/awesome-claude-skills, `ComposioHQ/awesome-claude-skills (63.8k★, gh-api 2026-06)`; active (pushed 2026-05-22, not archived; **license: none declared**, it's an awesome-list, treat entries per their own licenses)
- **Top pick for its domain:** no (it's the *discovery hub*, not a tool you invoke)

## What it does / when to pick it
A **discovery catalog** of Claude skills, an "awesome-list" indexing skills like deep-research, lead-research-assistant, and many more. **Decision rule:** reach for this when you *don't yet know which skill exists* for a need, it's the shard's named "Discovery → ComposioHQ catalog" entry. You do **not** install it to do work; you browse it to *find* a skill, then install that skill from its own repo. For a known marketing/SEO/research need, skip straight to `marketingskills` / `claude-seo` / `ishwarjha`.

## Install
**Nothing to install**, it's a GitHub README/catalog. Open the repo, find the skill you need, then follow *that skill's* install (its own `npx skills add` / `/plugin marketplace add` / clone). Shard lists it under "Discovery". L0 mechanics for whatever you ultimately install: `reference/install-guide.md`.

## Auth / keys
None, browsing a catalog needs no key. Auth concerns belong to whichever skill you pick from it. No secret-hygiene note (no key involved).

## Usage, call examples
Use it as an index: browse/search the list for a capability (e.g. "lead research", "deep research"), follow the link to the target skill's repo, then install that skill. Minimal flow: identify gap → search catalog → open the linked repo → install per its README → restart.

## General experience & gotchas (踩坑)
- **It's a map, not a vehicle.** Installing or "adding" this repo does nothing for a task, its value is purely navigational. Don't try to invoke it.
- **No license declared on the catalog itself**, each listed skill carries its own license; check the target repo's license/maintenance before adopting (entries vary widely in quality and freshness).
- **Catalog freshness lags reality.** With 63.8k★ it's popular and broad, but listed skills can be stale or dead, always verify the *target* repo (stars, last push, archived) the way you would any tool, before recommending it.
- Highest star count in the domain (63.8k★) reflects its role as the central index, not skill quality, popularity here ≠ any single skill's quality.

## Failure signals & fallback
Failure looks like: treating it as a runnable skill, or picking a listed skill that turns out stale/dead. **Fallbacks:** for the common needs the catalog would point you to anyway, marketing → `marketingskills`, SEO → `claude-seo`, packaged research → `ishwarjha/claude-marketing-research-skill`, broad coverage → `alirezarezvani/claude-skills`. If a catalog entry 404s/archived, drop it and use the focused L1 pick instead.

## Last verified: 2026-06
