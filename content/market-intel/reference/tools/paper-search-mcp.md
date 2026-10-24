# Tool: openags/paper-search-mcp

- **Domain(s):** frontier-research (also: none)
- **Barrier route:** ① free official APIs · **Source tier:** L1 · **Ready MCP:** yes (stdio, `uvx`/clone, no key for the default arXiv/PubMed/bioRxiv/medRxiv venues)
- **Cost:** free, no key, no quota (it just fans out to public scholarly APIs) [github.com/openags/paper-search-mcp, fetched 2026-06]
- **Repo / Provider:** github.com/openags/paper-search-mcp, `openags/paper-search-mcp (2.6k★, gh-api 2026-06)`; active (pushed 2026-05-18, not archived, MIT)
- **Top pick for its domain:** no (arXiv MCP + HF Daily Papers are the default floor; reach for this when you need multi-venue / biomed coverage)

## What it does / when to pick it
One MCP that fans a single query out across multiple scholarly sources, **arXiv + PubMed + bioRxiv + medRxiv** (plus Sci-Hub / Google Scholar / Semantic Scholar paths in the repo), and returns normalized paper metadata with PDF download. **Decision rule:** pick it over the plain `arxiv` MCP whenever the topic touches **biomed / life-sciences venues arXiv does not index** (clinical, genomics, neuro), or when you want one call to cover several preprint servers at once. For pure CS/ML recency, the lighter `arxiv` MCP + HF Daily Papers is still the default; this is the multi-venue upgrade, not a replacement.

## Install
stdio MCP via `uvx` (or `git clone` + `pip install -e .`). It's a library-backed MCP, no hosted HTTP option, expect Windows stdio flakiness (use absolute paths, test in a plain shell first; see `reference/install-guide.md` → Windows notes). Exact, time-stamped command lives in `reference/volatile/pricing-install.md` → frontier-research (`uvx`/clone). Restart / `/mcp` reconnect after adding.

## Auth / keys
No API key for the default free venues (arXiv, PubMed, bioRxiv, medRxiv), they are open public APIs. No secret is configured, so the secret-hygiene rules don't apply. (Some optional sources in the repo, e.g. Semantic Scholar, accept a free key to lift rate limits, set it as an env var the user supplies if you enable them.)

## Usage, call examples
MCP tools follow a `search_<source>` / `download_<source>` shape, e.g. `search_arxiv`, `search_pubmed`, `search_biorxiv`, `download_arxiv`. Minimal flow: `search_pubmed("GLP-1 cardiovascular outcomes", max_results=20)` to pull biomed hits arXiv misses, then `download_arxiv(<id>)` for any preprint you want the full PDF of. Returns title / authors / abstract / date / DOI-or-id you can hand to a citation-significance check.

## General experience & gotchas (踩坑)
- **Use it for the biomed/multi-venue gap, not as the CS default (shard).** For cs.AI/cs.LG recency the dedicated `arxiv` MCP is leaner and you avoid extra source surface.
- **Per-source rate limits still apply downstream.** It wraps the underlying APIs, so be polite, arXiv is ~1 req / 3s; PubMed (NCBI E-utilities) throttles hard without an NCBI key/email and will 429 on bursts.
- **Source coverage varies by what's enabled.** The repo lists Sci-Hub / Google Scholar paths that are scrape-flavored and legally/operationally fragile, prefer the clean API venues (arXiv/PubMed/bioRxiv/medRxiv) for anything you'll cite.
- **It searches and downloads; it does not rank significance.** Match counts ≠ impact, pass results to Semantic Scholar (citation velocity / influentialCitationCount) before calling a paper important.
- **stdio on Windows is the main friction**, not the data, if `claude mcp list` shows `✗ Failed`, that's the launcher, not the APIs.

## Failure signals & fallback
Failure looks like: the MCP shows `✗ Failed`/`! Needs authentication` in `claude mcp list` (stdio launch problem, not your query); empty results for a CS topic (wrong venue, query arXiv directly); or PubMed 429s (add an NCBI email/key, slow down). **Fallbacks:** CS/ML recency → the `arxiv` MCP (or arXiv REST `export.arxiv.org/api/query`); significance/citation signal → **Semantic Scholar**; full-text grounded answers over the PDFs it downloads → **Future-House/paper-qa**; deep multi-paper synthesis → delegate to the **research-lit** skill.

## Last verified: 2026-06
