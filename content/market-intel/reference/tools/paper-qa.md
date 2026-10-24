# Tool: Future-House/paper-qa (PaperQA2)

- **Domain(s):** frontier-research (also: none)
- **Barrier route:** ④ self-host (LLM-driven agent over local PDFs) · **Source tier:** L1 · **Ready MCP:** no, Python library, `pip install paper-qa`, call as a lib / CLI
- **Cost:** free & open-source (Apache-2.0); you pay only the LLM + embedding API spend it runs under the hood [github.com/Future-House/paper-qa, fetched 2026-06]
- **Repo / Provider:** github.com/Future-House/paper-qa, `Future-House/paper-qa (8.7k★, gh-api 2026-06)`; active (pushed 2026-06-05, not archived, Apache-2.0)
- **Top pick for its domain:** no (it's the deep full-text layer above the search tools, not the first-line scout)

## What it does / when to pick it
A grounded retrieval-augmented QA agent over **full-text PDFs**: it chunks/embeds a corpus of papers, retrieves the relevant passages, and answers with **inline citations back to the exact source**, designed to minimize hallucinated claims. **Decision rule:** pick it once you already have the right papers (from `arxiv` / `paper-search-mcp` / Semantic Scholar) and need to *read deeply and answer questions with citations*, "what does this set of papers actually say about X", contradiction-checking, evidence extraction. It sits a layer ABOVE raw search. If the job is multi-paper narrative synthesis / a written lit-review, hand off to the **research-lit** skill instead; PaperQA is the engine, research-lit is the workflow.

## Install
`pip install 'paper-qa>=5'` (Python ≥3.11), pin `>=5` so you land on PaperQA2, not the older v4 line (verified against the repo README 2026-06). It's a **library/CLI, not an MCP**, no `claude mcp add`; model-dependent execution remains at the adapter/setup boundary below. No MCP transport, so no Windows stdio concerns, just a Python env + your PDFs. Cross-link: `reference/volatile/pricing-install.md` → frontier-research (`pip install paper-qa`); L0 mechanics in `reference/install-guide.md`.

## Model integration status
PaperQA's question answering, agent and embedding modes require setup. All model or external-agent work must use installed `llmcall`, inheriting its current routing, model, timeout and fallback policy. No supported adapter for this library is supplied or verified here. Before using these modes, verify an actual installed-version adapter and its tool-I/O contract; otherwise stop at setup. Do not instantiate a direct provider client or add a separate model/provider ladder.

Plain deterministic browser scraping or local PDF text extraction remains usable through a current-session verified non-model route. Keep resulting content, indexes, cookies, profiles, traces and exports in PRIVATE versioned DATA. Any hosted browser or target-site credentials belong in the approved PRIVATE credential store and must stay out of transcripts.

## General experience & gotchas (踩坑)
- **It costs LLM tokens, not an API quota (shard).** "Free & open-source" means the code is free, a deep query over a large corpus can run many embedding + completion calls; watch spend on big PDF sets and inherit the installed llmcall policy.
- **Garbage-in on PDFs.** Extraction quality depends on the PDF, scanned/figure-heavy/table-dense papers parse poorly; answers are only as good as the chunked text it could read.
- **It answers from the corpus you give it, not the web.** It will not discover papers, feed it the right set first (`paper-search-mcp` / `arxiv` / Semantic Scholar). Missing-but-relevant work simply won't appear in the answer.
- **Grounding ≠ infallible.** Citations are checkable by design, but verify a load-bearing claim against the cited passage before quoting, that's the feature, use it.
- **First run downloads models / builds an index** and embedding the corpus takes time; reuse the index across questions instead of re-embedding per query.
- **`pip install paper-qa` is large** (verified 2026-06-16): pulls litellm + tantivy + pybtex + paper-qa-pypdf + many transitives. Plan for a few minutes + a few hundred MB of disk on first install. Bumped litellm version reinstalls it, note the existing litellm version before installing if other tools depend on it.

## Failure signals & fallback
Failure looks like: an adapter or shared-interface authentication error; empty / "insufficient context" answers (PDFs didn't parse, or the corpus doesn't actually cover the question, re-collect papers); or runaway cost (corpus too large, narrow it within the installed llmcall policy). **Fallbacks:** to *find* the papers first → **paper-search-mcp** (multi-venue) / the **arxiv** MCP; significance ranking → **Semantic Scholar**; for a written multi-paper survey rather than a Q&A engine → delegate to the **research-lit** skill.

## Last verified: 2026-06
