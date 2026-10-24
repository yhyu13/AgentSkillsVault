# Tool: Semantic Scholar Graph API (+ semantic-scholar MCP / skill)

- **Domain(s):** frontier-research (also: none)
- **Barrier route:** ① · **Source tier:** L1 · **Ready MCP:** yes, a `semantic-scholar` MCP exists; current-session availability of an MCP or sibling skill requires discovery and operation verification
- **Cost:** free; free API key lifts the rate limit [https://www.semanticscholar.org/product/api, fetched 2026-06, key is free, no paid tier shown]
- **Repo / Provider:** https://www.semanticscholar.org (provider; Graph API at https://api.semanticscholar.org/graph/v1)
- **Top pick for its domain:** yes

## What it does / when to pick it
The **significance / citation-graph** source: total citations, `influentialCitationCount`, and the
reference→citation graph around any paper. **Pick it to answer "does this paper matter," not "does it
exist"**, arXiv/HF tell you a paper dropped; Semantic Scholar tells you whether the field is building on it.
Use citation *velocity* (recent citations) over raw count for new work, and over retweet/upvote counts
(L4 hype). For multi-venue/biomed coverage, `paper-search-mcp` complements it.

## Install
REST works with no key: `https://api.semanticscholar.org/graph/v1/...`. For the MCP, search the registries
(smithery.ai / glama.ai) for "semantic-scholar mcp", or discover the `semantic-scholar` skill in the active host.
Exact line: `reference/volatile/pricing-install.md#frontier-research`. L0 mechanics: `reference/install-guide.md`.
Read installed skill instructions and verify the selected operation before using it. Any model or external-agent work uses installed `llmcall` with current defaults, including `mode="agent"` for agent work.

## Auth / keys
Unauthenticated works but is throttled (a shared pool, effectively very low and bursty). Request a **free**
key at semanticscholar.org/product/api to get a dedicated rate limit. Secret hygiene if you wire the key into
an MCP: edit `~/.claude.json` from clipboard, not `claude mcp add` inline; never `browser_snapshot` the key
page, see `reference/install-guide.md`.

## Usage, call examples
- Search: `GET /graph/v1/paper/search?query=mixture+of+experts&fields=title,year,citationCount,influentialCitationCount&limit=20`
- One paper + graph: `GET /graph/v1/paper/<paperId or arXiv:2401.xxxxx>?fields=title,citationCount,influentialCitationCount,references.title,citations.title`
- Add header `x-api-key: <KEY>` once you have one.
- MCP / skill: same operations exposed as `search_paper`, `get_citations`, etc.

## General experience & gotchas (踩坑)
- **Unauth is brutally throttled**, the "1000 req/s shared among ALL anonymous users" pool means you get
  sporadic 429s under any real load. Get the free key before batching; it's the single biggest reliability win.
- **`influentialCitationCount` > raw `citationCount`** for judging impact, it filters out perfunctory cites.
  But both lag: a 2-month-old paper shows near-zero even if it's a future landmark. Use citation *velocity*
  and cross-check HF/GitHub adoption for very recent work.
- **Coverage gaps & ID mismatches**: not every arXiv preprint is indexed promptly; look up by arXiv ID
  (`arXiv:<id>`) when title search misses. Author disambiguation is imperfect, same-name authors merge/split.
- `fields=` is **required** to get anything beyond the paperId, forget it and you get near-empty objects that
  look like a failure. Request only the fields you need (large `references`/`citations` expansions are slow).
- Bulk/`/paper/batch` endpoints have their own tighter limits; page deliberately.

## Failure signals & fallback
Repeated 429 (throttled, get/use the key), empty objects (missing `fields=`), or a paper not indexed
(look up by arXiv ID). Fallback for significance when S2 lacks a paper: **OpenReview** reviewer scores
(pre-publication signal), **GitHub** star velocity (code adoption), or `paper-search-mcp` for venues S2
misses. Deep synthesis → `research-lit` skill.

## Last verified: 2026-06
