# Tool: Papers with Code API

> ⚠ **DEAD 2026, API sunset by Meta.** The REST API `https://paperswithcode.com/api/v1/` **302-redirects
> to `https://huggingface.co/papers/trending`** (confirmed via fetch 2026-06). The SOTA-leaderboard +
> paper↔code signal is **LOST**. Do not build on this. Treat as a documented gap, not a usable source.

- **Domain(s):** frontier-research (also: none)
- **Barrier route:** ① (dead) · **Source tier:** L1 (formerly) · **Ready MCP:** no
- **Cost:** was free, no key, now N/A (sunset) [https://paperswithcode.com, site/API redirects away]
- **Repo / Provider:** https://paperswithcode.com (provider; API sunset by Meta)
- **Top pick for its domain:** no

## What it does / when to pick it
**It no longer works.** Historically: SOTA leaderboards per benchmark + paper↔code links, the best
"is this *actually* SOTA on this benchmark" signal. As of 2026 the API is sunset (302 → HF Papers trending),
so **don't pick it.** The SOTA-leaderboard capability is now a genuine **GAP** in this domain: HF Papers
"trending" is only a weak *popularity* proxy, not a benchmark leaderboard. If a task truly needs SOTA
standing, say so explicitly and use the fallbacks below rather than asserting a leaderboard you can't verify.

## Install
N/A, nothing to install; the endpoint is dead. (Kept here so the router doesn't re-attempt it.)
See `reference/volatile/pricing-install.md#frontier-research` (marked DEAD) and `reference/install-guide.md`.

## Auth / keys
N/A (no key was ever required; the API is gone). Not a key-bearing tool.

## Usage, call examples
- `GET https://paperswithcode.com/api/v1/...` → **302 redirect to huggingface.co/papers/trending** (no data).
- There is no working call. Do not retry programmatically.

## General experience & gotchas (踩坑)
- The redirect returns HTTP **302, not 404**, so a naive client may follow it and parse HF's trending HTML,
  silently substituting popularity for SOTA. That is a **silent-degradation trap**; flag the gap instead.
- Old MCP wrappers / blog snippets still reference `paperswithcode.com/api/v1`, they will appear to "work"
  (200 after redirect) while returning the wrong thing. Don't trust them.
- There is currently **no clean free replacement for benchmark-SOTA leaderboards.** Be honest about this in
  reports, don't invent a leaderboard standing.

## Failure signals & fallback
Failure signal = the 302 to `huggingface.co/papers/trending` (i.e. it never returns leaderboard JSON).
Fallbacks: **HF Papers trending** (weak popularity proxy only), **Semantic Scholar** citation velocity
(impact, not SOTA), **GitHub** star velocity on the official repo (adoption), and **OpenReview** scores
(quality signal). For a specific benchmark, read the paper's own results table or the leaderboard on the
benchmark's own site/repo. Deep synthesis → `research-lit` skill.

## Last verified: 2026-06
