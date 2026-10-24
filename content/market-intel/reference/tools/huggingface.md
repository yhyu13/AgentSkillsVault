# Tool: Hugging Face, Daily Papers + Hub API + official MCP

- **Domain(s):** frontier-research (also: none)
- **Barrier route:** ① · **Source tier:** L1 · **Ready MCP:** yes, official HTTP MCP `https://huggingface.co/mcp`
- **Cost:** free for read (no key); HF token only for write/private/gated [https://huggingface.co/pricing, fetched 2026-06, read access is free, no plan required]
- **Repo / Provider:** https://huggingface.co (provider; not a single GitHub repo)
- **Top pick for its domain:** yes

## What it does / when to pick it
Curated **Daily Papers** (a human-picked AI subset of arXiv, ~10 to 30/day) plus the Hub API for trending
**models** and **datasets**. Pick HF when you want the *signal-filtered* daily AI feed rather than arXiv's
firehose, or when "what models/datasets are trending" is the question (adoption proxy that arXiv can't give).
Use alongside arXiv (recency, broader) and Semantic Scholar (citation significance). HF Papers "trending"
is also the **weak proxy** for SOTA now that Papers-with-Code is dead, but it's popularity, not a leaderboard.

## Install
HTTP MCP (Windows-friendly, preferred): `claude mcp add --transport http --scope user huggingface https://huggingface.co/mcp`
(for private or gated access, configure the token through host secret settings with a no-echo transfer; never add a secret-bearing CLI header). For read-only
you can skip the MCP entirely and hit REST: `https://huggingface.co/api/daily_papers` and the Hub API.
Exact command + token notes: `reference/volatile/pricing-install.md#frontier-research`. L0 mechanics:
`reference/install-guide.md`.

## Auth / keys
None for read (Daily Papers, public models/datasets). For write/private/gated content, get an HF token
at huggingface.co/settings/tokens (free account). Secret hygiene if you add a token: edit `~/.claude.json`
from clipboard, never `claude mcp add` with the header inline, never `browser_snapshot` the token page,
see `reference/install-guide.md`.

## Usage, call examples
- REST (no key): `GET https://huggingface.co/api/daily_papers` → list with title, arxiv id, upvotes, summary.
- Hub trending models: `GET https://huggingface.co/api/models?sort=trendingScore&limit=20`.
- Datasets: `GET https://huggingface.co/api/datasets?sort=downloads&direction=-1&limit=20`.
- MCP: paper/model/dataset search + semantic tools exposed by `https://huggingface.co/mcp`.

## General experience & gotchas (踩坑)
- **Daily Papers is curated and narrow**, it's the AI highlight reel, not exhaustive. A paper absent from
  Daily Papers is not unimportant; use arXiv for completeness.
- **Upvotes / trendingScore = popularity, not rigor.** Launch-day and lab-affiliation hype inflate it. Treat
  as L1-curated lead, cross-check citations (Semantic Scholar) before calling something significant.
- Model "trending" is heavily weighted to **recency + downloads**; a re-upload or quantized fork can spike.
  Check the org and the model card, not just the rank.
- The HF MCP exposes a lot of tools (Spaces, inference, etc.), for research scouting you only need the
  paper/model/dataset read tools; ignore the rest to avoid tool flood.
- Read endpoints are free but **not infinite**, heavy unauth polling can hit soft limits; add a token if
  you batch. Gated models/datasets 401 without a token even for "read."

## Failure signals & fallback
401/403 on a gated resource (need token), empty Daily Papers (rare, try the REST endpoint directly), or
MCP ✗ in `claude mcp list`. Fallback: **arXiv API** for raw recency, **Semantic Scholar** for significance,
**GitHub MCP** for repo/release adoption signal. Deep synthesis → `research-lit` skill.

## Last verified: 2026-06
