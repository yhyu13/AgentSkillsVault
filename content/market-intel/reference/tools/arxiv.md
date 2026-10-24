# Tool: arXiv API (+ blazickjp/arxiv-mcp-server)

- **Domain(s):** frontier-research (also: none)
- **Barrier route:** ① · **Source tier:** L1 · **Ready MCP:** yes, `uvx arxiv-mcp-server` (blazickjp), or use the raw REST API
- **Cost:** free, no key [http://export.arxiv.org/api/query, no pricing page; usage policy at info.arxiv.org/help/api]
- **Repo / Provider:** github.com/blazickjp/arxiv-mcp-server, `blazickjp/arxiv-mcp-server (2.8k★, gh-api 2026-06)`, Apache-2.0, last push 2026-05 (active)
- **Top pick for its domain:** yes

## What it does / when to pick it
Free no-key search of arXiv + pull recent papers by category (cs.AI / cs.LG / cs.CL / cs.CV / stat.ML).
This is the L1 floor for "what dropped recently" in AI/ML. **Pick it first for recency**; pair it with
HF Daily Papers (curated, fewer/day) for the AI subset. Use Semantic Scholar (citations) or Papers-with-Code
(SOTA, note it's now dead) to judge *significance*, arXiv tells you a paper exists, not that it matters.
For biomed/multi-venue coverage arXiv misses, prefer `paper-search-mcp` (arXiv + PubMed + bioRxiv).

## Install
MCP: `uvx arxiv-mcp-server` (stdio). On Windows, stdio `uvx` is flaky, if it fails, fall back to the
raw REST endpoint `http://export.arxiv.org/api/query?search_query=...` (an Atom XML feed, no key).
Exact command lives in `reference/volatile/pricing-install.md#frontier-research`. L0 MCP/Windows
mechanics: `reference/install-guide.md`.

## Auth / keys
None. No key, no account. (Not a key-bearing tool, no secret-hygiene step needed.)

## Usage, call examples
- MCP tools: `search_papers`, `download_paper`, `read_paper`, `list_papers`.
- REST (no MCP): `GET http://export.arxiv.org/api/query?search_query=cat:cs.LG+AND+all:%22mixture+of+experts%22&sortBy=submittedDate&sortOrder=descending&max_results=20`
  → returns Atom XML; parse `<entry>` for title/authors/abstract/arxiv id/pdf link.
- Recent-by-category: `search_query=cat:cs.CL&sortBy=submittedDate&sortOrder=descending`.

## General experience & gotchas (踩坑)
- **Be polite: ~1 request / 3s.** arXiv has no hard auth but will throttle/temporarily block aggressive
  clients. Batch with `max_results` (up to ~2000 with `start` paging) instead of hammering.
- Results are **submission-ordered, not relevance-ranked** when you sort by date, a brand-new paper with
  zero citations sits next to a landmark; date != importance. Always cross-check significance elsewhere.
- arXiv is a **preprint** server: no peer review, version churn (v1→v5), and withdrawn papers persist.
  Cite the version. For "is this actually accepted/scored," go to OpenReview.
- Category drift: cs.AI is a catch-all; real ML work often lives in cs.LG/cs.CL/cs.CV. Search multiple cats.
- The Atom feed sometimes returns an empty `<feed>` (not an error) for over-narrow queries, looks like
  silent failure; loosen the query before assuming the API is down.
- arXiv covers physics/math/CS, **not** most biomed; for that use `paper-search-mcp` (multi-venue).

## Failure signals & fallback
Empty Atom feed, HTTP 503, or `uvx` not connecting (`claude mcp list` shows ✗). Fallback: raw REST
endpoint if the MCP is the problem; **HF Daily Papers** for the curated AI subset; `paper-search-mcp`
for multi-venue/biomed. For deep multi-paper synthesis, delegate to the `research-lit` skill.

## Last verified: 2026-06
