# Tool: alphaXiv (+ skill alphaxiv)

- **Domain(s):** frontier-research (also: none)
- **Barrier route:** ③④ (self-host comments backend exists, but in practice browser-driven) · **Source tier:** L4 (community signal) · **Ready MCP:** no, discover the optional **`alphaxiv` skill** in the active host or use a verified **playwright MCP** operation
- **Cost:** **free**, public site; community comments + LLM-optimized summaries over arXiv. (Site is JS-heavy and bot-blocks plain fetch, returned **403 to WebFetch, 2026-06**; this is expected, not a dead site. No pricing page to confirm.)
- **Repo / Provider:** https://www.alphaxiv.org (non-GitHub provider; an overlay on arXiv). Driven via the `alphaxiv` skill or playwright.
- **Top pick for its domain:** no

## What it does / when to pick it
alphaXiv layers a **discussion/comment thread and an LLM-optimized summary** on top of each arXiv paper. **Decision rule:** use it for a fast *single-paper* "explain this / what are people saying" pass, the optional **`alphaxiv` skill** is purpose-built for "summarize this paper / paste an arXiv URL or ID". Pick it when you have a specific paper and want a quick read plus community sentiment. It is **NOT** for broad literature search (use arXiv API / HF Daily Papers) and **NOT** for deep multi-paper synthesis (delegate to `research-lit`). Treat its community signal as **L4**, a lead about reception, never significance evidence on its own.

## Install
No MCP to add. Two routes:
1. **Optional skill:** check the active host's skill catalog for `alphaxiv` and read its installed instructions before invoking it with an arXiv/alphaXiv URL or ID. Market-intel does not bundle or install it. If absent, report the setup gap and use the verified browser route below or a verified arXiv read operation; do not assume a sibling skill is installed.
2. **Browser:** drive https://www.alphaxiv.org with the **playwright MCP** (available only after current-session operation verification), navigate to the paper, read the summary + comments from the DOM.
See `reference/install-guide.md` → "④ browser / act-like-human" and `reference/volatile/pricing-install.md` → frontier-research.

## Auth / keys
None for reading, public site. (Posting a comment would need an account; for read/summarize you need no key. No secret-hygiene concern.)

## Usage, call examples
- Skill: hand the `alphaxiv` skill an arXiv ID or URL (e.g. `2406.xxxxx` or `alphaxiv.org/abs/...`) → get the LLM-optimized summary + any community thread.
- playwright: `browser_navigate https://www.alphaxiv.org/abs/<id>` → `browser_snapshot` → extract summary and comments.

## General experience & gotchas (踩坑)
- **Browser-only in practice, plain fetch is blocked.** Confirmed **403 to WebFetch (2026-06)**; it's a heavy SPA. Don't try to `curl`/`WebFetch` it, use the `alphaxiv` skill (which has its own fallback chain) or playwright.
- **Community comments are L4 signal.** The shard is explicit: community/social signal is a *lead, not evidence*. A lively thread ≠ an important paper; verify significance via **Semantic Scholar** citation velocity / **OpenReview** scores. Threads are also sparse on most papers.
- **The summary is LLM-generated** over the paper, useful orientation, but it can smooth over caveats or mis-state numbers. For anything load-bearing, read the actual arXiv PDF (or use `paper-qa` for grounded full-text QA).
- **Single-paper tool, not a search engine.** Don't try to discover papers here; it's an overlay keyed to an arXiv ID you already have.

## Failure signals & fallback
Failure = 403 / SPA shell on a raw fetch, no comments on the paper, or the summary missing. Fall back: the **`alphaxiv` skill**'s own tiered fallback → read the paper directly via **arXiv API** ① / **HF** → grounded full-text QA via **Future-House/paper-qa** ④ → deep synthesis via **`research-lit`**. For significance (not vibes), cross to **Semantic Scholar** / **OpenReview**.

## Last verified: 2026-06
