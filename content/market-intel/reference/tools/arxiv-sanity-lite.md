# Tool: karpathy/arxiv-sanity-lite

- **Domain(s):** frontier-research (also: none)
- **Barrier route:** ③ (self-host OSS) · **Source tier:** L4 (personal recommender over arXiv) · **Ready MCP:** no, self-hosted web app; query its DB/HTTP yourself or wrap a thin MCP
- **Cost:** **free**, self-host, no key. [github.com/karpathy/arxiv-sanity-lite, gh-api 2026-06]
- **Repo / Provider:** github.com/karpathy/arxiv-sanity-lite, `karpathy/arxiv-sanity-lite` (**1.6k★**, gh-api 2026-06; MIT). ⚠ **D-STALE: last push 2023-06 (~3yr, >18mo)**, not archived, unmaintained; current installation and runtime compatibility are unverified here.
- **Top pick for its domain:** no

## What it does / when to pick it
A self-hostable "tame your arXiv firehose" app: it ingests arXiv papers, builds tf-idf features, and **recommends papers similar to ones you've tagged/liked** (SVM over your library), with search and per-tag ranking. **Decision rule:** pick it only if you want a **persistent, personalized recommender you run yourself** over a chosen arXiv slice, e.g. a standing scout for one sub-field. For one-shot recent-paper queries it's overkill; use the **arXiv API + HF Daily Papers** ① (free, no setup). For citation-graph neighborhood exploration use **Connected Papers / ResearchRabbit**; for deep synthesis delegate to **`research-lit`**.

## Install
Clone the selected `karpathy/arxiv-sanity-lite` version as source and inspect its current
README and dependency requirements. Treat installation and entrypoints as unverified
until checked against that version; the dated repository is stale and may need dependency
repairs on a current Python. Do not start its daemon, feature computation or server from
the public source directory as a setup shortcut.

Before any runtime launch, use the full Market checkout's `tools/private_inventory.py`
to verify an existing PRIVATE versioned runtime. Identify every database, fetched-paper
cache, feature artifact, log, configuration file and personal tag/seed-paper store.
Launch only through an adapter that redirects all these writes to supported absolute
paths in that runtime. If the selected version has no supported path configuration,
keep it in setup until such an adapter exists and its writes have been verified. A clone
or dependency installation does not establish that boundary.

This is a self-hosted web application, not a ready MCP. A separate selected operation
must be exposed and verified before an agent can query it. See the
[installation guide](../install-guide.md) for host and readiness checks.

## Auth / keys
No API key is required for public arXiv retrieval. Personal tags, seed-paper selections and recommendation history are real DATA and belong in the PRIVATE runtime even when the source papers are public. Check current arXiv access limits before retrieval.

## Usage, call examples
After the private runtime adapter is verified, configure the selected paper categories
in its private configuration, fetch the chosen corpus, build features and start the
local interface through that adapter. Personal tagging and recommendation queries then
use the same private stores. Exact commands, routes and database paths remain unverified
here; inspect the selected version before using them. Do not infer readiness from the
historical entrypoint names alone.

## General experience & gotchas (踩坑)
- **Stale repo (push 2023-06).** The shard flags it **D-STALE** explicitly. Installation and runtime compatibility require current verification; dependency repairs may be needed. Budget setup time.
- **You run the infra.** Unlike the no-setup arXiv API, this is a daemon + feature-compute + web server you maintain, only worth it for a *standing* personalized scout, not a single query.
- **Recommendations are tf-idf/SVM over your tags, L4 personal signal, not significance.** It surfaces *similar* papers, not *important* ones. Verify significance via **Semantic Scholar** citation velocity / **OpenReview** scores, per the shard.
- **Coverage is only what your daemon fetched** (your configured categories + window), it won't know about a paper outside that slice. It also inherits arXiv's scope (no biomed venues; use **paper-search-mcp** for those).
- Politeness: the daemon hits the arXiv API, respect the ~1 req/3s limit or you'll get throttled.

## Failure signals & fallback
Failure = install breaks on old pins, the daemon returns empty (category/window misconfig or arXiv throttle), or recs are noisy on a thin tag set. Fall back to the zero-setup route: **arXiv API + HF Daily Papers** ① for recent papers, **Semantic Scholar** for citation signal, **Connected Papers / ResearchRabbit** for graph neighborhood, and **`research-lit`** for synthesis.

## Last verified: 2026-06
