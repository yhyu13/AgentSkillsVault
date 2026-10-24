# Tool: research-lit skill (delegate)

- **Domain(s):** frontier-research (also: none)
- **Barrier route:**, (delegation, not a data source) · **Source tier:** L1 (synthesis layer) · **Ready MCP:** no, it's a **skill** (`research-lit`), invoked, not added
- **Cost:** **free**, it's a local skill; cost is only whatever underlying paper sources/LLM calls it makes. (No pricing page; provider docs at https://docs.claude.com.)
- **Repo / Provider:** the separately installed `research-lit` skill. Discover its availability and instructions in the current host; this catalog does not install or attest it.
- **Top pick for its domain:** no (it's the *hand-off target*, not a source you query for raw data)

## What it does / when to pick it
`research-lit` is the **deep multi-paper synthesis / literature-review** skill. **Decision rule (shard, hard rule):** this domain (`frontier-research`) is about **source routing / discovery**, finding the right papers and signals. The moment the task becomes **"synthesize across many papers / write a related-work / produce a lit-review,"** STOP routing and **delegate to `research-lit`**, do **NOT** re-implement a lit-review inside the market-intel flow. Use the discovery tools (arXiv, HF Daily Papers, Semantic Scholar, OpenReview) to *gather and triage*; use `research-lit` to *read deeply and synthesize*.

## Install
Check the active host's skill catalog for `research-lit` and read its installed instructions before invoking it. If absent, report the missing workflow and use only a verified alternative or prepare installation. It is not an MCP server. See `reference/install-guide.md` (L0) for how skills differ from MCP sources. Any model or external-agent invocation must use installed `llmcall` with its current routing, model, timeout and fallback policy; agent work uses `mode="agent"`.

## Auth / keys
No source credential is implied by installing a skill. Verify each selected underlying operation separately, keep credentials in approved PRIVATE configuration, and keep raw research outputs in PRIVATE versioned DATA. Never print credentials or private configuration during setup.

## Usage, call examples
- Hand off when the deliverable is synthesis: invoke the `research-lit` skill with the research question / seed papers / topic.
- Typical pipeline: use **arXiv API + HF Daily Papers** ① to find candidate papers and **Semantic Scholar** to rank by citation signal → pass that shortlist + the question to **`research-lit`** for the actual review/synthesis.
- Triggers (from its own description): "find papers", "related work", "literature review", "what does this paper say".

## General experience & gotchas (踩坑)
- **Don't re-build a lit-review here.** The single most important shard lesson for this entry: market-intel does **routing/discovery**, `research-lit` does **synthesis**. Re-implementing review logic in-line duplicates a better tool and produces weaker output.
- **It's a sibling skill, not a data API**, you can't query it for "the citation count of paper X." For hard signals (citations, SOTA standing, reviewer scores) use the *data* tools (Semantic Scholar, OpenReview, GitHub) and feed results to `research-lit`.
- **Feed it good inputs.** Its output is only as good as the candidate set you hand it, do the discovery/triage first (arXiv + HF + Semantic Scholar) so it synthesizes the *right* papers rather than searching blindly.
- **Don't confuse with single-paper tools:** for "explain *this one* paper" the `alphaxiv` skill / `paper-qa` are lighter; reserve `research-lit` for genuine multi-paper synthesis.
- It may itself need to fetch full text, for grounded full-text QA over PDFs, `Future-House/paper-qa` is the complementary primitive.

## Failure signals & fallback
If synthesis is required, discover `research-lit` in the active host and follow its installed instructions. If absent, report the missing workflow and prepare installation or use a verified **Future-House/paper-qa** operation over a Semantic-Scholar/arXiv-gathered corpus. For narrower passes, separately discover and read the **arxiv** / **semantic-scholar** skills before invoking them; this catalog does not install those siblings.

## Last verified: 2026-06
