# Tool: geo-optimizer-skill (Answer-Engine / Generative-Engine Optimization)

- **Domain(s):** seo-keywords
- **Barrier route:** ④/① · **Source tier:** L2 · **Ready MCP:** **yes**, ships CLI + Python + an MCP + an Astro integration.
- **Cost:** free, open-source (no key for the OSS toolkit; the LLM-citation checks consume whatever model access you supply) [github.com/Auriti-Labs/geo-optimizer-skill, gh-api fetched 2026-07-01]
- **Repo / Provider:** [Auriti-Labs/geo-optimizer-skill](https://github.com/Auriti-Labs/geo-optimizer-skill), not archived; last pushed 2026-09-30 (GitHub API checked 2026-10-09).
- **Top pick for its domain:** no, it's the **OSS pick for the new GEO/AEO angle** (folded into seo-keywords per the 2026-07 Horizon scan). Paid ② incumbents in this space: Profound, Otterly, Ahrefs Brand Radar.

## What it does / when to pick it
GEO/AEO = measuring and improving whether **answer engines** (ChatGPT, Perplexity, Gemini, Google AI Overviews) *cite your site*, as opposed to classic SERP rank. This toolkit audits your pages, suggests optimizations, and tracks citation/visibility across those engines. **Decision rule:** when the research question is "how do LLMs represent / cite my (or a competitor's) brand", a distinct capability from keyword rank, reach for a GEO tool. Use this OSS toolkit for the free route; note **Profound / Otterly / Ahrefs Brand Radar** as the paid ② tier for enterprise brand-citation monitoring. Classic keyword/backlink work stays on **DataForSEO / GSC** (this does not replace them, it's a new modality alongside them).

## Install
Per the repo README: CLI (`npx`/Python package) or wire the MCP into your client. The citation-audit features call out to the answer engines, so you supply the relevant model/API access for those checks. Volatile install line: `pricing-install.md` → seo-keywords.

## Auth / keys
No key for the OSS toolkit itself. Citation checks against ChatGPT/Perplexity/Gemini/Google AI Overviews consume whatever access you provide for those engines; budget accordingly.

## Usage, call examples
Audit a URL for answer-engine visibility, get optimization suggestions, and track whether target engines cite the page over time. MCP mode exposes these as tools to the model.

## General experience & gotchas (踩坑)
> New (folded 2026-07 Horizon scan), not yet exercised in a live market-intel run, notes from repo docs + gh-api verification 2026-07-01; harden with a `live-runs.jsonl` entry after first use (R4).
- **GEO is a moving target:** answer engines change how they surface/cite sources frequently; a "visibility score" is a snapshot, not a stable rank. Re-measure over time, don't treat one audit as ground truth.
- **New capability, not a new territory:** GEO measures citation in answer engines, same search-visibility domain as SEO, new modality. It complements, not replaces, keyword/backlink tooling.
- **Paid tier is where the enterprise data is:** the OSS toolkit covers audits + basic tracking; Profound/Otterly-class vendors have broader engine coverage + historical panels. Match the tool to how much brand-citation history you need.

## Failure signals & fallback
Failure looks like flaky/empty citation checks (answer-engine access misconfigured) or stale visibility data. **Fallback:** (1) verify your model/API access for the engines being audited; (2) for enterprise-grade coverage, evaluate Profound/Otterly/Ahrefs Brand Radar (②); (3) for classic SERP/keyword intelligence, stay on DataForSEO/GSC.

## Last verified: 2026-07
