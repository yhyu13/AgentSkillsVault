# Tool: indranilbanerjee/digital-marketing-pro

- **Domain(s):** ready-skills (also: serves seo-keywords work, AEO/GEO answer-engine optimization)
- **Barrier route:**, (skill/plugin scaffolding; core runs offline, no data barrier of its own) · **Source tier:** L2 · **Ready MCP:** no, installs as a Claude *plugin* via `/plugin marketplace add`
- **Cost:** free (MIT) [github.com/indranilbanerjee/digital-marketing-pro, gh-api 2026-06]
- **Repo / Provider:** github.com/indranilbanerjee/digital-marketing-pro, `indranilbanerjee/digital-marketing-pro (674★, gh-api 2026-08-01)`; active (pushed 2026-08-01, not archived, MIT)
- **Top pick for its domain:** no (niche AEO/GEO specialist; moderate adoption ~674★)

## What it does / when to pick it
A specialist bundle for **AEO/GEO, Answer Engine / Generative Engine Optimization**: auditing and optimizing content for how it gets *cited by AI answer engines* (ChatGPT, Perplexity, Google AI Mode + AI Overviews, Gemini, Microsoft Copilot) rather than classic blue-link SERPs. Core skills: `aeo-audit` (cross-platform audit), `geo-monitor` (continuous citation tracking), `entity-audit` (JSON-LD / entity-richness validation); adds "Share of AI Voice" as a metric and can generate an `llms.txt` companion file. **Decision rule:** pick this *only* when the explicit ask is AI-answer-engine visibility / citation optimization, the gap that classic SEO tools miss. For traditional SEO (rankings, backlinks, keyword volume) use `claude-seo`; for the broad marketing shell use `coreyhaines31/marketingskills`. It is a narrow add-on, not a marketing default.

## Install
Plugin install (**not** an MCP, no transport/key to run the core):
```text
/plugin marketplace add indranilbanerjee/neels-plugins
/plugin install digital-marketing-pro@neels-plugins
```
(The master row says "GitHub clone"; the repo's own README documents this marketplace route as primary, prefer it.) Optional `scripts/` need Python 3.8+, but stdlib-only core works without Python. Activates on session restart. Shard line: `reference/domains/ready-skills.md`; pricing/install: `reference/volatile/pricing-install.md → ready-skills`. L0 mechanics: `reference/install-guide.md`.

## Auth / keys
**None to run the core, it works offline** (MIT, no API key for the audit/monitor skills). No secret-hygiene concern for the plugin itself. Keys are *optional* and only needed if you wire connectors (Slack, HubSpot, Ahrefs, etc.) to execute real automation, those carry their own auth; have the user supply them, don't echo them. Per shard "Judgment", grounding the AEO/GEO audit in *real* citation data is the ceiling: offline mode reasons from best-practice heuristics.

## Usage, call examples
After install + restart, invoke the slash skills, e.g. `/digital-marketing-pro:aeo-audit` on a URL/brand, `/digital-marketing-pro:geo-monitor` for ongoing platform tracking, `/digital-marketing-pro:entity-audit` for schema/entity checks. Minimal flow: marketplace add → install → restart → run `aeo-audit` on your site. Output (citation patterns, Share-of-AI-Voice, JSON-LD gaps, `llms.txt`) is a heuristic scaffold, validate the "who-gets-cited" claims against live answer-engine results before acting.

## General experience & gotchas (踩坑)
- **Install-path mismatch:** master metadata tags it "GitHub clone" but the README's primary route is the `neels-plugins` marketplace, use the marketplace command; don't waste time hand-cloning.
- **Offline = heuristic, not measured.** It does not *observe* live ChatGPT/Perplexity citations unless you verify externally; treat baked-in stats (e.g. "Perplexity favors Reddit ~47%", "Wikipedia ~48% of ChatGPT cites") as the bundle's priors, not your site's measured data.
- **Niche + moderate adoption (~674★).** Newest/thinnest entry in the shard, a narrow AEO/GEO add-on, not a general marketing tool; flag the thin adoption when recommending.
- **AEO/GEO is a moving target**, the field shifts with each model/algorithm update (README cites March-2026 schema shifts); re-verify recommendations rather than trusting cached citation heuristics.
- Free MIT, active (pushed 2026-06), safe on staleness, but the small star count warrants a "low adoption" caveat.

## Failure signals & fallback
Failure looks like: confident AEO/GEO advice with **no live citation grounding**, marketplace-route confusion (don't fall back to manual clone unless the marketplace add fails), or scope creep (asking it to do classic SEO/keyword volume). **Fallbacks:** traditional SEO depth (rankings/backlinks/audit) → `claude-seo`; broad marketing workflow → `coreyhaines31/marketingskills`; bulk SERP/keyword data to ground it → `dataforseo` or free self-host `searxng`; business-ops gap → `ericosiu/ai-marketing-skills`.

## Last verified: 2026-06
