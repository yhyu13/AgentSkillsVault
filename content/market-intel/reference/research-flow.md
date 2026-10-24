# Research flow, how market-intel runs a task end-to-end

> **What this file is.** The canonical, fresh-agent runbook for a *single* market-intel research
> task: the exact path from "here is a theme" to "here is a cited report with a verifiable coverage
> ledger." Read this when you are handed a commercial-research theme and want to know the order of
> operations and which real primitive to reach for at each step. It is the prose companion to
> `SKILL.md`'s Workflow section, `SKILL.md` is the authority; this file is the orientation.
>
> **Scope.** One task, one shot. Watching a theme over time is an orchestration-product job (wrap
> this in `/schedule` or `/loop`), **not** something baked into the flow, see `SKILL.md` "Recurring
> / digest use" and `PHILOSOPHY.md` P5.
>
> **Doctrine it obeys.** Root-cause design (`PHILOSOPHY.md`); the P5 seam (the query path here never
> imports a refresh/ops script, it uses only query-side signals); Side A/B/C (the availability gate
> is *warn-level guidance*, never a fail-closed LLM gate). All primitives named below are real and
> live in this repo, none are invented.

## Last verified: 2026-06

---

## 0. Startup, does this skill even apply?

Before anything, gate the request (`SKILL.md` "When to stop and delegate immediately"):

- Single-fact lookup → plain web search, do not invoke this workflow.
- General web-only deep report (no specialized commercial source) → delegate to `deep-research`, exit.
- Academic / scientific literature → delegate to `research-lit`, exit.
- **Needs a specialized commercial source** (X data, real prices, market/finance, on-chain, SEO,
  social, leads) → continue. This is the only case where market-intel earns its keep.

## 1. Theme intake

State the theme in one line and extract its decision question: what would the user *do* with the
answer (buy/sell/build/avoid)? That intent sets which claims are "decision-grade" (→ the ≥2
independent-source bar in the guardrails) and how aggressive the disconfirmation search must be.

## 2. Triage → domains

Read `reference/sources-index.md` (thin, ~12 lines). Match the theme to 1 to N **real** commercial
domains. **Do not** read full domain shards yet. **Skip meta-domains** (`mcp-ecosystem`), they are
refresh-sweep infrastructure, never a research route. Zero domain matches → not in scope; route to
plain web search.

## 3. Pick the invocation SCALE (the dial)

The single biggest failure mode is **under-calling**. Pick a tier explicitly from the SCALE dial in
`SKILL.md` Step 1:

- `scan`, 1 top domain, 1 top tool, fixed stop (quick scoped check).
- `standard`, routed domains, 2 to 3 tools each, fixed stop.
- `deep`, **default for any genuine research / "comprehensive / 全面"**, all relevant domains, ALL
  available tools per domain, 3+ angles, cross-checked to ≥2 independent sources.
- `exhaustive`, all relevant, no omission, multi-angle until **saturation** (new calls add no new
  facts).

When in doubt, default to `deep`, not `standard`. Honor the **three iron rules** (no sampling;
saturate don't fixed-stop; report coverage) and the **~40 call / ~6 round cost ceiling**, exceeding
it is a stated choice, and the uncovered remainder becomes an explicit gap, never a silent truncate.
A numeric override (`{domains, tools_per_domain, queries_per_tool, stop}`) wins if the user gives one.

## 4. Verify the selected operation in the active host

Use the current Claude or Codex session's callable tools to identify the exact
source and operation. A separate host listing, companion `installed` flag, local
import or keyless catalog label is an inventory hint. None establishes readiness.
Apply [host-capabilities.md](host-capabilities.md) without invoking maintenance
scripts on the research path.

| bucket | required evidence | action |
|---|---|---|
| **available-now** | Current host/session/source/operation attribution, supported exposure, successful execution, authenticated or confirmed not-required auth, and usable response content | use at the selected scale |
| **setup** | Missing, stale, malformed or failed operation evidence | report the specific gap and host-appropriate setup path |
| **hard-gap** | Current attributed evidence explicitly says the selected operation is unsupported | report the unsupported operation and alternatives |

Evidence expires after 900 seconds and permits 60 seconds of future skew, both
inclusive. A newer authentication failure defeats older success. A paid plan,
tombstone or missing installation alone cannot establish current unsupported
capability. Price and recipe metadata guide setup; they never grant readiness.

## 5. Fan out to available-now tools, at scale

Hand the **available-now** sources + sub-questions to the heavy harness (`SKILL.md` Step 4): one
subagent per sub-question via the Agent tool (each told to load its target MCP via ToolSearch
first, subagents inherit MCPs only in deferred form), or `deep-research` for the web portion, or
`research-lit`'s `— sources:` detect-or-skip routing for source-routed retrieval. Prefer the free
browser-automation route (④, playwright available only after current-session operation verification) over paid APIs when it fits; reach for
paid ①/② only for history the browser can't backfill, scale reliability, or compliance.

Every subagent returns a **structured evidence unit**, not prose:
`{ status, claims:[{claim, source_url, quote, source_tier, date, confidence}], coverage_notes }`,
length-capped per field. The main agent reduces units, it never reads raw page dumps. Fan-out >5 →
insert a combiner layer (each merges 3 to 4 workers) so the main context never holds N long reports.

## 6. JIT-surface config gaps for the rest (theme-driven, at task-time)

For every `setup` (and any theme-critical `hard-gap`) tool: **do not silently
skip**. Emit a one-line, theme-specific suggestion naming what the missing tool would deepen, its
cost class, and the exact activation path (from `reference/activation-recipes.md`):

**Copy the canonical wording from [`report-template.md`](./report-template.md)** ("configure for
deeper data"); it is not restated here, because a template line living in three files drifts in three
directions. It names the tool, its cost tier, the canonical connection command, the key source,
and the selected host activation and fresh-operation checks. Report any actual activation
limitation; a source verified in this session can be used in this session.

Configuration is recommended **at task-time, driven by the theme**, not pre-done. These lines feed
the report's Coverage-gaps → "Configure for deeper data" block (`reference/report-template.md`).

## 7. Adversarial verify (guardrails, during synthesis)

Apply the HARD guardrails in `SKILL.md` "Quality guardrails":

1. **Citation gate**, an independent verifier fetches each cited URL and confirms the verbatim
   value before it enters the report (`✓verified / ⚠unverifiable / ✗dead`; drop dead).
2. **≥2 independent sources** for decision-grade claims (wire-service reprints = one source).
3. **Source tiers** L1 to L5; vendor self-claims (L3) can't be sole support for performance/profit.
4. **No silent degradation**, fallback from a barrier source is labeled in-section.
5. **Timestamp volatile data**, every price/rate/ranking carries `[fetched | published]`.
6. **Disconfirmation mandate**, a dedicated reverse-search subagent (scam/failure/loss/banned/
   expired/risk/regulation); report has a "Risks & counter-evidence" section (+ execution friction
   for arbitrage).
7. **Surface conflicts, don't average**, disagreement matrix, mark `confirmed/disputed/unresolved`.
8. **Failures become explicit gaps**, `failed/empty` → one rewrite+retry → else list under "Not
   covered."

## 8. Synthesize with the coverage report

Write per `reference/report-template.md`: snapshot date, executive summary (confidence-tagged),
findings by domain (tiered + dated + corroborated), cross-verification verdicts, disagreement
matrix, risks & counter-evidence, then the **Coverage-gaps** ledger, which makes "comprehensive"
*verifiable, not asserted*:

- tool coverage `invoked N / M available-now in scope` per domain + total, at the chosen SCALE;
- the **availability-gate classification** for this run (available-now / setup /
  hard-gap);
- uncovered tools as explicit gaps (reason each);
- the JIT theme-tied "configure for deeper data" suggestions from step 6;
- full source list with tiers + dates.

## 9. Close the loop (optional, cheap)

Append one line per source actually touched to the live-run ledger (reuses guardrail verdicts;
near-zero extra cost). This is the highest-value error signal for the next refresh sweep, a source
flagged `dead` in real use auto-nominates for the deletion path.

The incident helper appends to `metrics/live-runs.jsonl` below PRIVATE
DATA. It holds a lock across the read/modify/replace transaction and returns a
storage error if persistence cannot be verified. Keep observations in the reply
until the companion is initialized; never fall back to a public source path.
Use the [generated schema](live-run-schema.json) and
[generated examples](../metrics/live-runs.jsonl.example) for the outcome vocabulary.

---

## One-screen runbook

```
0. gate: commercial-source needed? else delegate (deep-research / research-lit) and exit
1. intake: theme + decision question (sets decision-grade bar)
2. triage: sources-index.md -> real domains (skip meta-domains)
3. SCALE: scan | standard | deep(default) | exhaustive  (+ 3 iron rules, ~40-call ceiling)
4. verify exact current host/session/source/operation evidence -> bucket each tool now:
      available-now | setup | hard-gap   (query-side signals only; P5-clean)
5. fan out: available-now ONLY, at SCALE; structured evidence units; combiner if >5
6. JIT gaps: theme-tied "configure <tool> to deepen <aspect>" for configurable/hard-gap
7. verify: 8 guardrails (citation gate, >=2 indep, tiers, no silent degrade, timestamps,
      disconfirmation, conflict matrix, failures->gaps)
8. synthesize: report-template.md + coverage ledger (invoked/available + gate buckets + JIT)
9. close loop: append the live-run ledger in the PRIVATE store (optional)
```
