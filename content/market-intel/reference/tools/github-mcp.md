# Tool: GitHub API / official GitHub MCP

- **Domain(s):** frontier-research (also: browser-automation, trends-discovery)
- **Barrier route:** ① · **Source tier:** L1 · **Ready MCP:** yes, official GitHub MCP (PAT), or the REST API
- **Cost:** free [https://github.com/pricing, REST API free; rate limits below. The MCP server is open-source]
- **Repo / Provider:** github.com/github/github-mcp-server, `github/github-mcp-server (30.5k★, gh-api 2026-06)`, MIT, last push 2026-06 (very active)
- **Top pick for its domain:** no

## What it does / when to pick it
Repos, releases, and **star velocity**, the *code-adoption* proxy for frontier work. **Pick it to answer
"is anyone actually using this," not "is it good research"**: a paper with a fast-starring official repo and
real releases has traction that citations (slow) and arXiv (silent on code) won't show yet. Complements
arXiv (recency), Semantic Scholar (citations), and HF (model/dataset trending). Also serves trends-discovery
(GitHub trending), but see the launch-day inflation gotcha; stars are noisy.

## Install
The hosted MCP endpoint is `https://api.githubcopilot.com/mcp/`. Configure its PAT
through the selected host's supported secret settings with a no-echo transfer.
Never include it in MCP-add arguments. A separately authenticated `gh` CLI or
REST caller is another possible route; verify its exact operation in this session.
See `reference/install-guide.md` for host activation and secret handling.

## Auth / keys
A GitHub **Personal Access Token (PAT)**, fine-grained, read-only scopes are enough for scouting. Unauth
REST works but is capped at 60 req/hr; authenticated is 5000 req/hr. Secret hygiene (PAT is a key): edit
`~/.claude.json` from clipboard, never `claude mcp add` with the header inline, never `browser_snapshot` the
token page, see `reference/install-guide.md`. The `gh` CLI already holds your auth, so for read tasks it's
often the cleanest no-leak path.

## Usage, call examples
- `gh` CLI (no MCP needed): `gh api --hostname github.com repos/<owner>/<repo> --jq '{stars:.stargazers_count,pushed:.pushed_at,archived:.archived}'`
, this is the exact verification call this skill uses.
- Releases: `gh api --hostname github.com repos/<owner>/<repo>/releases?per_page=5`. Stargazers over time:
  `gh api --hostname github.com "repos/<owner>/<repo>/stargazers" -H "Accept: application/vnd.github.star+json"` (timestamps).
- MCP: `search_repositories`, `get_repository`, `list_releases`, etc.

## General experience & gotchas (踩坑)
- **Watch for launch-day star inflation.** A frontier repo can gain thousands of stars in 24 to 48h on HN/X
  hype that has nothing to do with sustained adoption. Look at **star velocity over time** + `pushed_at`
  (is it still maintained?) + release cadence, not a single star count.
- **Stars != quality or usage.** Awesome-list inclusion, a viral tweet, or a big lab's name spikes stars;
  forks/dependents/issues activity are better adoption signals.
- **GitHub trending has no official API**, the trending *page* is HTML-only; drive it via playwright MCP, or
  approximate via search sorted by stars with a date filter (`created:>2026-05-01 sort:stars`).
- **Rate limits bite fast**: 60/hr unauth. Always use a PAT (or `gh`, which is authed) for any batch. Search
  API has its own stricter limit (30/min) and secondary abuse limits, back off on 403 with `Retry-After`.
- An official repo may lag the paper (released later) or be a third-party reimpl, confirm it's the authors'
  repo before treating stars as the paper's adoption.

## Failure signals & fallback
403 (rate limit, use PAT/`gh` and honor `Retry-After`), 404 (wrong/renamed/private repo), or MCP ✗ in
`claude mcp list`. Fallback: **`gh` CLI** if the MCP is the problem; **HF** model/dataset trending for
adoption when there's no clean repo; **Semantic Scholar** for citation-based significance; playwright MCP
for the trending page. Deep synthesis → `research-lit` skill.

## Last verified: 2026-06
