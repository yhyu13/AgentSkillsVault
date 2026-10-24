# Report template

> Maintenance commands below require the full consumer checkout. Replace
> `<absolute-market-intel-checkout>` with its located absolute path, and confirm
> that `tools/console.py` and `.claude-plugin/plugin.json` exist there. An installed
> skill-only directory or the current user project is not a checkout substitute.
> These commands guide setup; research uses current host tools directly.


> Data snapshot: <YYYY-MM-DD> · Scale: <scan|standard|deep|exhaustive> · Domains: <...>
> Sources available this run: <verified source_id + capability_id, host/session and observation time> · Fallbacks used: <...>

## Executive summary
3 to 6 bullets. Each decision-grade bullet carries a confidence tag (high/medium/low).

## Findings by domain
For each triaged domain:
- **<claim>**, value/finding `[L? tier]` `[fetched DATE | published DATE]` `confidence: high/med/low`
  - source: <verified URL>, verbatim quote: "…", `✓verified / ⚠unverifiable`
  - corroboration: <2nd independent source, or "single source ⚠">

## Cross-verification verdicts
Per key claim: `confirmed / disputed / unresolved` + why.

## Disagreement matrix
| claim | source A says | source B says | likely cause | lean / undecided |
|---|---|---|---|---|

## Risks & counter-evidence (mandatory)
From the disconfirmation subagent. For arbitrage/investing also list **execution friction**
(fees, slippage, capacity, time window, compliance/ban risk). If none found, state that reverse
search was run and found nothing, not proof of no risk.

## Coverage gaps
- **Tool coverage:** invoked <N> / <M> available-now in scope (per domain + total) at scale `<scan|standard|deep|exhaustive>`. Makes "comprehensive" verifiable, not asserted.
- **Availability gate (current operation classification, this run):** available-now <list> · setup with reasons <list> · hard-gap <list>. Fan-out hit only the available-now bucket.
- **Uncovered tools (explicit gaps, not silent skips):** <tool, reason: cold-mcp / missing-key / unreachable / paid-tier-only>
- **Not covered / insufficient data:** <dimensions that returned empty/failed>
- **Configure for deeper data (JIT, theme-tied):** "To deepen <this theme aspect>, configure
  <source> (<free-key | free-tier | install-no-key | paid $X>), `python "<absolute-market-intel-checkout>/tools/console.py" connect <slug>`
  (canonical, resolves by slug), or see `reference/activation-recipes.md` for the key source;
  then activate in the selected host and verify a fresh operation response. Configuration alone does not grant readiness."

## Sources
Full list with tier + date. Mark any unverified or dead links.
