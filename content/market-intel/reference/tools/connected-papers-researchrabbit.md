# Tool: Connected Papers / ResearchRabbit

- **Domain(s):** frontier-research (also: none)
- **Barrier route:** ④ (browser, no official API) · **Source tier:** L3 (citation-graph exploration) · **Ready MCP:** no, drive with the **playwright MCP** (act-like-human)
- **Cost:** **free** to use the graph (both have free tiers; Connected Papers gates *unlimited* graphs / some features behind a paid plan, ResearchRabbit is free). No public API, UI-driven. (Pricing not asserted; confirm at https://www.connectedpapers.com/pricing if you hit a graph cap.)
- **Repo / Provider:** https://www.connectedpapers.com · https://www.researchrabbit.ai (non-GitHub; web apps, no clean official API).
- **Top pick for its domain:** no

## What it does / when to pick it
Given **one seed paper**, both build a **visual citation/similarity graph** of its neighborhood, prior work, derivative work, and co-cited papers, so you can see the cluster a paper sits in. **Decision rule:** pick this for **visual "what's around this paper" / neighborhood mapping** when you have a seed and want to find the surrounding literature cluster fast. For *quantitative* citation signal (counts, influentialCitationCount, programmatic reference/citation lists) prefer the **Semantic Scholar Graph API** ①, it's free, scriptable, and doesn't need a browser. For deep multi-paper synthesis, delegate to **`research-lit`**. Use Connected Papers / ResearchRabbit when the *visual map* itself is the deliverable.

## Install
Nothing to install, **no official API**. Drive the site with the **playwright MCP** (available only after current-session operation verification): navigate, enter the seed paper, read the resulting graph/related list from the DOM. See `reference/install-guide.md` → "④ browser / act-like-human" and `reference/domains/browser-automation.md`. No L1 install line (browser route, no package).

## Auth / keys
None required for the free tier of either. (ResearchRabbit needs a free account to save collections; Connected Papers works anonymously for a limited number of graphs.) No API key, no secret-hygiene concern.

## Usage, call examples
- playwright: `browser_navigate https://www.connectedpapers.com` → search/enter the seed (title or arXiv/DOI) → `browser_wait_for` the graph → `browser_snapshot` to read the connected-papers list and links.
- ResearchRabbit: log in (free) → add the seed to a collection → read "Similar Work" / "Earlier"/"Later Work" panels.
- Minimal flow: seed paper in → harvest the neighborhood paper list → take the arXiv IDs/DOIs over to **Semantic Scholar** for hard citation numbers.

## General experience & gotchas (踩坑)
- **No API = brittle browser scrape.** The shard routes this strictly through **playwright** because there's no clean API. The graph is a heavy interactive canvas (SVG/WebGL), read the *side list* of related papers, not the canvas; waits/retries are needed for the graph to finish rendering.
- **The graph is a discovery/visual aid, not significance evidence (L3).** A central, well-connected node is not automatically important, confirm with **Semantic Scholar** citation velocity / **OpenReview** scores before claiming a paper matters.
- **Connected Papers caps free graphs** (a small number per period/month) and gates more behind a paid plan, you may hit a wall mid-session; don't assert the exact limit, check the site. ResearchRabbit is free but account-gated for saved collections.
- **Underlying data is Semantic Scholar / OpenAlex graphs**, so for anything programmatic you usually want to go to **Semantic Scholar directly** rather than scraping the visualization.
- Coverage skews to indexed venues; very new arXiv preprints may have a thin neighborhood until citations accrue.

## Failure signals & fallback
Failure = graph won't render / free-graph quota hit / bot wall, or the neighborhood is empty for a brand-new paper. Fall back to the scriptable route: **Semantic Scholar Graph API** ① (references + citations + influentialCitationCount, free), this is the recommended substitute for everything except the visual map. For broader literature gathering, **arXiv API** + **paper-search-mcp**; for synthesis, **`research-lit`**.

## Last verified: 2026-06
