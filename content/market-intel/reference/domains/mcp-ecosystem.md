# Domain: mcp-ecosystem (meta-domain, discovery surfaces only)

**Triage signals:** this shard is **never** the answer to a user's research query. It exists so
that the weekly/monthly refresh sweep knows **where new MCP servers come from**, and the other
real domain shards can incorporate what this shard surfaces. User questions such as "what MCPs
are new this week" go to plain web search. This shard is consumed only by Discovery phase D1
(surfaces A + B + C) of an explicitly requested or scheduled `refresh-protocol.md` sweep.

**Why a meta-domain.** The MCP catalog turnover is sub-week. Pulling discovery sources into every
single domain shard would duplicate them 15×. One shard, polled on the weekly cadence, lets each
domain shard stay focused on its own data territory and trust that "new MCP fan-out" is handled
upstream. Verified 2026-06.

## Tier 1, authoritative registries (poll weekly)

| surface | URL | what to poll | signal-to-noise | cadence |
|---|---|---|---|---|
| **MCP official registry** | `registry.modelcontextprotocol.io` (UI: `anthropic.modelcontextprotocol.io/registry`) | REST `/v0/servers?since=<iso>` for incremental delta; falls back to full list | **high** (authoritative, but coverage lags 3rd-party catalogs by ~weeks); `since=` works as of 2026-06, confirmed via curl | weekly |
| **PulseMCP** | `pulsemcp.com` + RSS `pulsemcp.com/feed` | weekly newsletter (Sunday) + "Newest" sort on catalog + RSS for releases | **highest**, most curated 3rd-party index; one human pass already done; categorized; tracks dead/forked servers | weekly (newsletter); RSS continuously |
| **Glama.ai MCP** | `glama.ai/mcp/servers` | quality-score sort + weekly digest email + `/mcp/servers?sort=created` | **high**, own quality scoring (security/license/maintenance heuristic); fewer junk listings than mcp.so | weekly |
| **Smithery.ai** | `smithery.ai` | "trending" + "newest" + install-count sort; CLI: `npx @smithery/cli list` | **medium-high**, install-count is real signal but inflatable; great cross-IDE install surface (Claude/Cursor/Cline/Windsurf one-click) | weekly |
| **mcp.so** | `mcp.so` | category browse + new listings | **medium-low**, widest catch, most noise; many dead/stub listings; use only when 上面 4 个都miss了 | monthly |
| **Apify MCP store** | `mcp.apify.com` + `apify.com/store` | actor count + run-volume + maintainer | **medium-high**, actors carry real run counts and pricing → harder采用度 signal | monthly |
| **GitHub MCP Registry** | `github.com/mcp` (NOT a repo, GitHub's official MCP discovery page launched 2025-09-16) | catalog browse + filter by category; aggregates ~100 community MCP servers (Figma, Postman, Stripe, Supabase, etc.) | **high**, GitHub-curated non-Anthropic discovery surface; official | weekly |
| **ChatGPT Apps Directory** | `chatgpt.com/apps` (anti-bot 403s WebFetch; OpenAI Apps SDK / MCP integrations) | ~979 apps as of 2026-06; MCP-based; browse + search | **high**, OpenAI counterpart to GitHub MCP Registry; captures non-Anthropic MCP momentum the Anthropic-only sweep would miss | weekly (manual, anti-bot) |

## Tier 2, GitHub velocity (poll weekly via gh-api)

| surface | query | signal-to-noise |
|---|---|---|
| **topic:mcp-server** | `gh api --hostname github.com --method GET search/repositories -f q='topic:mcp-server' -f sort=updated -f per_page=50`; repeat with `-f sort=stars` | **medium**, broad; filter `pushed:>last_verified` + stars ≥ N to cut noise |
| **anthropic/modelcontextprotocol org** | `gh api --hostname github.com orgs/modelcontextprotocol/repos`; also watch `modelcontextprotocol/servers` (87.3k★) reference list | **high**, official reference servers + spec changes land here first |
| **awesome-mcp-servers** | `punkpeye/awesome-mcp-servers` (89.3k★), diff README between sweeps | **high**, human-curated, broken into domain sections; diff = newly-curated entries |
| **new-repo velocity** | `gh api --hostname github.com --method GET search/repositories -f q='mcp server created:>YYYY-MM-DD' -f sort=stars` | **medium-high** for "new + already starred"; check star-curve for inflation |
| **fork networks of top picks** | for each existing top-pick MCP, check forks + "used by" + releases | **high**, surfaces more-active forks, upstream-deprecated, dependents adopting alternatives |

Anti-inflation: any new repo with stars-but-zero-issues-zero-forks or contributors concentrated on
one new account → demote to `WATCH`, do not promote across to a real domain shard.

## Tier 3, community + IDE markets (poll monthly, manual)

| surface | what to poll | signal-to-noise |
|---|---|---|
| **MCP Discord** (Anthropic-run) | `#mcp-showcase` channel (new submissions), `#mcp-general` for adoption chatter; invite via modelcontextprotocol.io | **high**, devs ship + announce here first; live debug of broken servers; **manual only** (no API; export via discord-history-export skill if needed) |
| **Cline marketplace** | `cline.bot` MCP marketplace section + Cline GitHub releases | **medium**, Cline ships an in-IDE MCP browser; what's featured = curated adoption signal |
| **Cursor MCP directory** | `cursor.com/directory` + Cursor's MCP page | **medium**, Cursor's "Featured" + "Popular" tabs; install-count visible |
| **Continue.dev hub** | `hub.continue.dev` (blocks + assistants now wrap MCPs) | **medium**, assistant configs reveal which MCPs Continue users actually stack |
| **Cody / Sourcegraph** | `sourcegraph.com/cody` extension listings; OpenCtx providers (Cody's pre-MCP equivalent, partly migrating to MCP) | **medium-low**, slower MCP uptake than Cline/Cursor; useful for code-context MCPs |
| **Hacker News** | Algolia HN search `mcp server`, `model context protocol`; comments only | **high for go-by-go reality check**, HN comments call out vaporware/套壳 fast |
| **Reddit** | `r/ClaudeAI`, `r/mcp`, `r/LocalLLaMA` "MCP" filter; monthly digest threads | **medium**, real-use feedback; filter营销号 by reading comments not OPs |
| **Anthropic Skills + Plugins** | `claude.ai` Skills marketplace + plugin marketplace (Claude Code) | **high**, orthogonal to MCP but overlapping discovery surface for "ready-to-use capability"; tracked separately in `domains/ready-skills.md` |

## Polling recipe (weekly light pass, used by Discovery D1 surfaces A + B + C)

1. Pull **MCP official registry** delta via `since=<last_verified>`; dedupe.
2. Pull **PulseMCP** RSS + newsletter; cross-ref with (1).
3. Pull **Glama.ai** `?sort=created` (or digest email); cross-ref.
4. Pull **Smithery** trending + newest; cross-ref.
5. `gh api --hostname github.com --method GET search/repositories -f q='topic:mcp-server pushed:>YYYY-MM-DD' -f sort=stars -f per_page=50` + diff against last sweep's seen-set.
6. Diff `punkpeye/awesome-mcp-servers` README HEAD vs last sweep.
7. Manual: scroll Discord `#mcp-showcase` since last poll (no API).
8. Output: one consolidated candidate list, dedup by repo URL, each with `discovery_surface` tag.
9. Drop candidates into `discovery-state.md` in the PRIVATE companion DATA directory inbox; defer Verify & Diff to the monthly sweep per refresh-protocol §Cadence.

## Decision rule, when does an entry from here get promoted to a real domain shard

A candidate from this meta-domain is **never directly written** into a real domain shard. Promotion requires:

1. **Domain fit unambiguous**, the candidate's data territory maps cleanly to exactly one of the 15 existing domain shards (or one of the 6 placeholder future-domains in the horizon-scan watchlist). Cross-domain MCPs (e.g. "search + scrape + LLM") get filed under the **dominant** capability; auxiliary capabilities are noted in the row's `note` column.
2. **Discovery quality threshold passed**, must satisfy `refresh-protocol.md` D3 gates: activity ≥1, barrier-route ≥1, at least one independent 3rd-party adoption signal (HN/Reddit/dependents/install-count). New-but-unadopted → stays in `discovery-state.md` watchlist, NOT promoted.
3. **Comparative verdict vs. existing top pick**, ADD / REPLACE / WATCH / SKIP must be filled, per D5. Naked "new MCP exists" is not promotion-worthy.
4. **Verified against gh-api / official site**, star count, last-commit, and any pricing claim re-checked against L1 sources per defense protocol step 2. No memory-based numbers.
5. **No domain match → horizon-scan path**: if a candidate represents a new **territory** none of the 15 shards covers (e.g. a new agent-memory MCP category, a new modality), it is NOT promoted to an existing shard. Instead it goes into `horizon-scan` H2 with FOLD / NEW-DOMAIN / NEW-SKILL verdict, see refresh-protocol H1 to H4.

Mechanical implication: this shard is **read by** Discovery D1.A + D1.B + D1.C subagents; it is **written to** only when a new discovery surface appears (e.g. a new IDE ships an MCP marketplace, or a new registry launches). It is **never updated** based on individual MCP discoveries, those flow downstream to the matching real shard.

## What this shard explicitly does NOT track

- Individual MCP servers themselves, those live in the relevant domain shard's table.
- MCP protocol spec changes, those go in `CHANGELOG.md` if they affect tooling layer, else ignored.
- LLM/agent frameworks that *consume* MCPs (Claude Code, Cursor, Cline), those are install surfaces, tracked above only as discovery channels, not as research-data sources.
- Anthropic Skills (orthogonal capability layer), separate shard `domains/ready-skills.md`.

**Install guidance:** no installable artifact for this shard, it is a pure discovery surface registry. Per-MCP install guidance lives in `reference/volatile/pricing-install.md` under the relevant domain.
