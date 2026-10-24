# Tool: skillsmp.com (skill aggregator)

- **Domain(s):** ready-skills (also: mcp-ecosystem)
- **Barrier route:** none (public read-only search over GitHub-hosted SKILL.md files) · **Source tier:** L1 · **Ready MCP:** yes, hosted at `https://skillsmp.com/mcp`
- **Cost:** free. Anonymous REST is 50/day plus 10/minute; the MCP path has **no daily quota** and only a per-IP burst limit. An optional API key raises REST to 500/day and does **not** affect MCP.
- **Repo / Provider:** https://skillsmp.com (independent community project, states in its own FAQ that it is not affiliated with Anthropic and does not vouch for the safety or quality of what it indexes)
- **Top pick for its domain:** yes. It is the only source here that indexes SKILL.md files across GitHub as a whole rather than curating one list, so it finds skills that every awesome-list in this domain misses.

## What it does / when to pick it
Aggregates SKILL.md files from GitHub and exposes search over their **full text**. Front page claims a corpus in the millions. **Decision rule:** this is the first stop whenever the question is "does a skill for X already exist", before considering writing one. The curated repos in this domain (`awesome-claude-skills`, `aso-skills`, `gtm-agents`) are lists somebody maintained by hand and are strictly narrower; use them for a fast browse of one niche, use skillsmp when coverage matters.

Measured 2026-08-29: an 11-agent survey that swept five configured registries, both Anthropic repos, six aggregator sites and GitHub code search concluded "no skill exists for this problem". A single pass over skillsmp with the same question returned nine relevant skills, three of them direct hits. **Omitting this source produces confident false negatives.**

## Install
Hosted HTTP MCP, nothing to clone.

```
claude mcp add -t http -s user skillsmp https://skillsmp.com/mcp
```

After reconnecting, use a supported value-free diagnostic for the selected server, returning only allowlisted name, connection status and authentication state. If that diagnostic is unavailable, report those states as unverified. Discover the tools in the active host session and verify the selected operation with usable results before claiming readiness; a connected label alone is insufficient. See the [installation guide](../install-guide.md).

`-s user` is required; `claude mcp add` defaults to the local scope and would write it into the current project instead of the shared config. The site's own docs give `"type": "streamable-http"`, which Claude Code does not accept and which yields a server that silently never connects. The correct value is `"http"`.

Do not route it through a shared stdio aggregator. It is already remote HTTP, so there is no gain and a preflight health check to lose.

## Auth / keys
None needed for the MCP path, which is the path you want. A key exists only to raise the REST daily quota; it is issued once per account at `/developers` after a Google or GitHub login, is shown exactly once, and is sent as `Authorization: Bearer <key>`. **Secret hygiene:** never place it in a URL, query string, or log.

## Usage, call examples
Three tools: `search_skills(query, page, limit<=50, sortBy, category, occupation, language)`, `get_skill(id)`, `list_categories()`.

The only header that matters is `MCP-Protocol-Version: 2025-06-18`; omitting it returns HTTP 400 with JSON-RPC -32600, and no other version string is accepted. The handshake can be skipped entirely because the server is stateless.

```bash
curl -s -X POST https://skillsmp.com/mcp \
  -H 'Content-Type: application/json' \
  -H 'MCP-Protocol-Version: 2025-06-18' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_skills","arguments":{"query":"helpdesk","limit":20,"sortBy":"recent"}}}'
```

The payload sits in `result.content[0].text` as a JSON **string** that needs a second parse. Each row has exactly nine fields: `id, name, author, description, contentLanguage, githubUrl, skillUrl, stars, updatedAt`. `get_skill` returns the same nine fields and no body, so never call it to read content; go to `githubUrl`.

**Search playbook that actually works.** Pick one uncommon single noun, not a phrase and not a generic word like tool or agent. Run it once with the default sort, then run the same word again with `sortBy=recent`; the second call is not optional, because star sort fills the page with monorepos and recent is the only way small purpose-built repos become visible. Group and count by **repository**, not by row.

## General experience & gotchas
- **`pagination.total` is a sentinel, not a match count.** It equals rows returned plus one and grows as you page (page 1 gives 3, page 50 gives 101). It is meaningful only when it is 0 with `totalIsExact=true`. Never report "N skills matched" from it.
- **Default sort is by the star count of the containing repository**, so every skill in one monorepo carries an identical score and a weak match inside a 387k-star repo outranks a perfect match in a 30-star one. Taking the top 3 is close to sampling at random.
- **Deduplicate on repository.** One measured page of 20 rows came from 4 repositories. Repos also publish the same skill under `skills/`, `docs/zh-CN/skills/`, and `.kiro/skills/` as separate rows; prefer the path without a `docs/<locale>/` segment.
- **Matching is stemmed and runs over the full skill text**, so a row whose name and description look unrelated may be a real hit, and conversely `slack` matches stack, `ticketing` matches ticking, `intercom` matches interconnect. Query words whose first letters form a common stem are close to useless.
- **Errors arrive as HTTP 200 with a JSON-RPC error object**, so code that branches on status treats "skill does not exist" as success.
- **An invalid category slug returns 200 and zero rows rather than an error**, and a valid but mismatched one returns low-relevance residue rather than an empty set. The tell is star magnitude collapsing from five digits to two.
- **Windows CJK:** passing a Chinese query as a shell argument corrupts the bytes and the server answers -32700. Build the body in Python with `ensure_ascii=True` and set `PYTHONIOENCODING=utf-8`. Chinese search itself works fine.
- **Burst limiting is real and unannounced.** There are no rate-limit headers on the MCP path, so a 429 arrives with no warning. Measured: 16 concurrent requests direct from one IP produced two 429s. Serialize with a short delay and retry with backoff rather than reducing coverage.
- **The site exposes no license field at all**, so it cannot tell you whether a skill is usable. Check on GitHub before vendoring anything; one indexed repo is 2.99 GB with a NOASSERTION license.

## Failure signals & fallback
Failure looks like a plausible page of results that are all one monorepo, or a confident zero that is really a stem collision. If a query returns nothing, try a different single noun before concluding absence. **Fallbacks:** for a quick browse of one niche use the curated repos in this domain; for the official surface use the Anthropic plugin marketplace; when the question is what is installed on this machine rather than what exists publicly, read the local skills and plugins directories instead, which this tool cannot see.

Anything adopted from here is untrusted third-party content. Before installing, scan the skill body for instructions aimed at the agent that reads it, check whether its scripts write run output into their own repository directory, and check for hardcoded credential paths. Never point a live skill directory at a stranger's clone that a nightly sync will fast-forward; take a pinned vendored copy instead.

## Last verified: 2026-08
