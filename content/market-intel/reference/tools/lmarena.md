# Tool: lmarena (now arena.ai)

- **Domain(s):** frontier-research
- **Barrier route:** 1 official API · **Source tier:** free · **Ready MCP:** no
- **Top pick for its domain:** partial, covers LLM chat/agent human-preference rankings; does NOT replace Papers with Code for paper-anchored task SOTA

## What it does / when to pick it
Live human-eval Elo leaderboard for LLMs via pairwise blind voting, users see two anonymous model outputs side-by-side, pick the better one, and Elo updates from the aggregate. Substitute for the now-broken D-404 Papers with Code, but only **partially**: it covers chat-quality and agent rankings, not paper-task SOTA. **Decision rule:** pick when the question is "which frontier LLM is currently winning on human preference" or "what's the live Elo of GPT/Claude/Gemini/Llama right now." Do NOT pick when the question is "what's SOTA on benchmark X" (use HuggingFace leaderboards + arXiv direct) or "which open-source model fits constraint Y" (use HF hub query).

## Install
Browser only, no install. Hit https://arena.ai/leaderboard directly. For programmatic pulls, scrape the leaderboard HTML/JSON with the firecrawl skill or playwright; no official public API endpoint published as of 2026-06.

Install: <TODO: confirm install method for any community wrapper>, see https://arena.ai/leaderboard.

## Auth / keys
**Free, no key.** Public leaderboard, no auth wall. Voting (contributing data) requires no account either.

## Usage, call examples
- Browser: open https://arena.ai/leaderboard, filter by category (Overall / Hard Prompts / Coding / Math / Vision / Multi-turn).
- Programmatic snapshot: use firecrawl-scrape on https://arena.ai/leaderboard to capture the table; parse model name + Elo + 95% CI + vote count.
- Cross-check before quoting: visually confirm the "last updated" timestamp on the page header, Elo shifts daily.

## General experience and gotchas (踩坑)
- **lmarena.ai → arena.ai rebrand** (Jan 28, 2026, Series A $1.7B valuation). Old `lmarena.ai` URLs 301-redirect, old citations to "LMSYS Chatbot Arena" or "lmarena" all point here. Update any pinned bookmarks/scripts.
- **Human-preference ≠ task SOTA.** Elo measures "users like this answer better in blind A/B", strongly correlated with chat quality, weakly correlated with niche benchmarks (long-context retrieval, code-exec, math proofs). For paper-anchored SOTA, this tool is the **wrong source**; use HF leaderboards + arXiv.
- **Vote-volume skew.** New models can show inflated/unstable Elo until vote count crosses ~5 to 10k; always read the 95% CI column, not just the point estimate.
- **No official public API** as of last check, programmatic access means scraping the leaderboard page. Respect their rate limits and don't hammer; the page itself is the canonical artifact.
- **Last leaderboard update verified 2026-05**, re-confirm the on-page timestamp before quoting any Elo number in a report; the ranking head reshuffles within weeks of any major model release.

## Failure signals & fallback
Failure looks like: stale Elo (top page hasn't updated in 4+ weeks, check the timestamp), scrape returning empty (JS-rendered, switch to playwright/firecrawl-interact), or the question being task-SOTA-shaped rather than preference-shaped.

**Fallbacks:**
- Paper-task SOTA → **HuggingFace leaderboards** + arXiv direct (was D-404 Papers with Code, now broken)
- Open-source model discovery by capability/size → **huggingface-skills hub_repo_search / hub_repo_query**
- Specific benchmark scores (MMLU, GPQA, SWE-bench) → the benchmark's own GitHub leaderboard, not arena.ai

## Last verified: 2026-06
