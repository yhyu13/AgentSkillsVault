---
name: market-intel
description: "Use for COMMERCIAL data (X/Twitter, e-commerce, finance, SEO, social, news) via the right MCP. Triggers: market research, competitor analysis, X sentiment, SEO, trends."
allowed-tools: Read, Glob, Grep, Bash, Agent, Skill, WebSearch, WebFetch
---

# market-intel

Select commercial data sources, verify their current operations, guide missing setup,
and apply research evidence requirements. Delegate retrieval, fan-out, verification
and synthesis to the available `deep-research` or `research-lit` workflow.
Do not re-implement those engines. [PHILOSOPHY.md](../../PHILOSOPHY.md) governs changes
to this scope, source selection and maintenance.

## When to stop and delegate immediately

Select the applicable route before starting:

- **Single-fact lookup / quick query** → just use plain web search. Do not invoke this workflow.
- **General web-only deep report** (no specialized commercial source needed) → delegate to
  `deep-research` and exit.
- **Academic / scientific literature** → delegate to `research-lit` and exit.
- **Needs a specialized commercial source** (X data, real e-commerce prices, market/finance
  feeds, on-chain data, SEO metrics, social sentiment, lead data) → continue below. Continue with this workflow only for this case.

> **Recurring / digest use:** this skill is one-shot by design. To watch a topic over time, wrap it
> in a user-owned `/schedule` routine (or `/loop`), the routine owns cadence, watchlist, and
> delivery (a notifier of your choice / the `feishu-notify` skill); market-intel just runs
> its normal workflow on each fire and emits its standard report. Do **not** build
> monitoring/distribution *into* the skill, that's an orchestration-product job, not the seam this
> skill owns (`PHILOSOPHY.md` P5).

## Workflow

### Step 1, Triage

Identify which commercial domain(s) the topic touches. Read `reference/sources-index.md` (a thin
one-line-per-domain index, ~12 lines). Match the topic to 1 to N of the **real** domains. **Do not
read the full domain shards yet.** If the topic maps to zero commercial domains, delegate per the
section above.

**Skip meta-domains during triage.** `reference/sources-index.md` lists "Meta-domains" (currently:
`mcp-ecosystem`), these are infrastructure shards consumed by the refresh sweep's Discovery phase
only. NEVER route a user research query to them. If a topic's only match is a meta-domain, the
topic is not in market-intel's scope (route to plain web search instead).

**Pick an invocation SCALE explicitly.** The single biggest failure mode here is
**under-calling**, too few tools, too few query angles → incomplete intel. The user may name
a tier or give numbers; **when in doubt for any genuine research ask, default to `deep`, not
`standard`** (reserve `standard`/`scan` for quick scoped checks).

| scale | domains | tools / domain | query angles / tool | stop condition |
|---|---|---|---|---|
| `scan` | 1 top | 1 top tool | 1 | fixed |
| `standard` | routed | 2 to 3 | 2 | fixed |
| `deep` (default for research / "comprehensive / 全面") | all relevant | **ALL available in domain** | 3+ | cross-checked to ≥2 independent sources |
| `exhaustive` | all relevant | **ALL available, no omission** | multi-angle until saturated | **SATURATION**, stop only when newly-called tools add no new facts |

Numeric override (user may specify directly): `scale = {domains: all|N, tools_per_domain: all|N,
queries_per_tool: M, stop: saturate|fixed}`.

**Three iron rules (`deep` & `exhaustive`):**
1. **No sampling.** Every *available* tool in a routed domain MUST be called, never a subset.
   A tool you cannot reach (cold MCP / missing key) is an **explicit gap** in the report, never
   a silent skip. (This is the "失败 = 显式 gap" guardrail applied to coverage.)
2. **Saturate, don't fixed-stop.** At `exhaustive`, keep fanning out across domains/tools until
   additional calls yield no new facts. "Comprehensive" means coverage-saturated, not "I hit N
   subagents." Use the combiner layer (Step 5) so wide fan-out doesn't blow context.
3. **Report coverage.** Every run states `tools invoked / tools available in scope` (per domain
   + total) and lists uncovered tools, so "comprehensive" is **verifiable, not asserted**.

**Absolute ceiling (cost guard, NOT a low default):** a hard cap of ~40 tool-calls / ~6 rounds
per run prevents true runaway (P5: no *infinite* fan-out). If `exhaustive` would exceed it,
surface the projected scope + the uncovered remainder as an **explicit gap**, never silently
truncate. Raising the ceiling is a deliberate, stated choice, not a default.

### Step 2, Verify the selected source in the current host session

Inspect tools exposed to this active Claude or Codex session. Identify the exact
source and operation needed for the topic. A child process listing, saved host
label, plugin setting, CLI path or installed library only establishes discovery.
Then check execution, authentication and usable response content for the selected
operation. HTTP success alone does not establish content validity.

Classify each relevant source as `available-now`, `setup` with a reason, or an
evidence-supported `hard-gap`. Availability requires current host/session/source/
operation attribution, a timestamp and verification method. Default evidence TTL
is 900 seconds with 60 seconds future skew, both inclusive. New authentication
failure defeats older success. Missing, malformed or stale proof means `setup`.

For **Claude**, reconnect after configuration and inspect this session's callable
MCP tools. For **Codex**, use its own MCP or app activation and inspect this Codex
session's tools. Neither host's subprocess listing proves the other's exposure.
The [host evidence guide](reference/host-capabilities.md) gives the schema and
activation details. Use the active host during research; maintenance scripts stay
outside the query path. For model or external-agent work, use installed `llmcall`
and inherit its current defaults.

Keep gaps explicit in the report and continue with evidenced alternatives. Missing
access is a setup requirement; it does not prove that the provider lacks the
operation. Companion inventory can guide setup but never grants readiness.

### Step 3, Select sources + guide install (non-blocking)

For each triaged domain, read only its shard: `reference/domains/<domain>.md`. Pick the best
**available** source. **Prefer the free browser-automation / act-like-human route (④) over paid
APIs when it fits**, after verifying the current browser session, using free open-source repos
per platform (see `reference/domains/browser-automation.md`). A real logged-in browser often
returns **richer data** than a stripped/paid API, at zero cost. Reach for paid official ① / resale
② sources when you need history the browser can't backfill (e.g. Keepa price history), large-scale
reliability, or supported access under the provider and account terms. Official and resale APIs
still require the relevant scopes, platform rules and rate limits; neither guarantees immunity
from account enforcement. Note browser scraping needs a session/cookies and,
at scale, a proxy pool, and most platform scraping violates that platform's ToS, use throwaway
accounts for heavy/write work and respect the disconfirmation + source-tier guardrails.

If the topic clearly depends on a source that is missing or not connected:

> "This topic depends on <source> (e.g. real X tweet data). Recommend installing it:
> Use the selected host's supported setup path (cost notes in `reference/volatile/pricing-install.md`); secret values stay in local configuration.
> Activation may require a restart or reconnect in the selected host. Until this session exposes
> the needed operation and a fresh response passes verification, I'll use an evidenced fallback
> and flag the setup gap. If activation and verification succeed, the source can be used in this session."

Never block on install. Prefer HTTP-transport sources on Windows (no local Node/uv needed; stdio
`npx`/`uvx` MCPs are flaky there).

#### Secret handling

Keep keys out of transcripts, including transcripts synced to cloud backups. Read the
procedure in [the installation guide](reference/install-guide.md) before handling a key.
These four prohibitions apply:
- **NEVER `browser_snapshot` a page that displays a key**, provider dashboards render it plaintext
  in the DOM and the snapshot captures it.
- **NEVER `claude mcp add` for a secret-bearing MCP**, it echoes the header/URL to stdout.
- **NEVER print or verify a key by value**, length only; mask token-in-URL output before showing it.
- **NEVER rotate on the user's behalf** as a cleanup, a transcript-clean key is one the user rotated
  from their own browser.

Secrets belong in the selected host's supported secret configuration. Claude's
configuration format does not configure Codex. Never expose secret-bearing settings
in transcripts or public source; follow the private companion's credential policy.

#### Companion configuration

Per-machine installation state, tool tiers, keys and rotation history belong in a
separate PRIVATE companion. Use [CONFIG.md](../../CONFIG.md#discovery-convention-e2)
for current selection: `MARKET_INTEL_DATA_DIR`, `MARKET_INTEL_CONFIG`, then fleet_guards
sibling discovery. `MARKET_INTEL_DATA_DIR`
must select the same companion's `data/` child. There is no required filesystem
location or separate XDG search.

The [version-1 companion spec](reference/companion-config-spec.md) owns layout,
registry and template formats, conformance and versioning. It includes root
`registry.json`, per-tool `claude.json.template` and `env.template`, and credential
Mode A (PRIVATE Git) or Mode B (ignored with a separate backup).
Use the [companion tutorial](reference/companion-config-repo.md) for setup and
surface [the hardening runbook](reference/companion-config-hardening.md) before
the first push. Review third-party app access and the selected credential policy
before storing real state.

1. Inspect the active host first. Consult the companion's registry only for setup;
   it records configured tools, not current operation readiness.
2. Read a selected `tools/<slug>/README.md` only when tier or rate-limit context is needed.
3. Never read `secrets/<slug>.env` into the transcript, including in Mode A. The
   companion's `apply.py` handles substitution into `~/.claude.json` without requiring
   the agent to see raw values; Claude settings do not configure Codex.
4. Recommend missing tools through the companion's `runbooks/add-new-tool.md`, when
   present, or through the public companion tutorial.

For leaked keys, tell the user to rotate at the provider, use the companion's
`scripts/capture-key.ps1 -Slug <slug> -Var <VARNAME>` for a no-echo clipboard update
(under a vault projection it stores into the vault and regenerates the file),
rerun `python3 scripts/apply.py --tool <slug>`, and restart Claude. Do not rotate
on the user's behalf. Without a companion, host tools can still support research;
missing inventory remains a setup limitation, and real outputs still require PRIVATE storage.

### Step 4, Delegate execution (to available-now tools only) + JIT-surface the rest

Fan out **only to the `available-now` bucket** from Step 2, at the chosen SCALE. Do not waste a
subagent on a tool that isn't live this turn, it would just fail. Hand the selected
available-now sources + sub-questions to the heavy harness:

- Mixed/general or when a connected commercial MCP exists → fan out subagents (Agent tool), one
  per sub-question, **each told to load its target MCP via ToolSearch first** (subagents inherit
  the session's MCPs but only in deferred form). Or invoke `deep-research` for the web portion.
- For source-routed retrieval, `research-lit`'s `sources:` mechanism already does
  detect-or-skip routing; reuse it rather than rewriting fan-out.

Require every subagent to return a **structured evidence unit**, not free prose:
`{ status: ok|partial|empty|failed, claims: [{claim, source_url, quote, source_tier, date, confidence}], coverage_notes }`
with a length cap per field. The main agent reduces these units, it does **not** read raw page
dumps. If fan-out exceeds ~5, insert a combiner layer (each combiner merges 3 to 4 workers) so the
main context never holds N long reports.

#### JIT config-gap surfacing, recommend configuration at task-time, driven by the theme

For every relevant tool that Step 2 put in `setup` (or a theme-critical
`hard-gap`), **do not silently skip it**. Configuration is recommended *at task-time, driven by the
theme*, not pre-done. For each, emit a one-line, **theme-specific** suggestion that names the
concrete thing the missing tool would deepen, the cost class, and the exact activation path. Read
the tool's recipe in `reference/activation-recipes.md` (and its `reference/tools/<slug>.md` only if
you need tier/gotcha detail) to fill the path. Template:

**The wording is owned by [`reference/report-template.md`](./reference/report-template.md)** ("configure
for deeper data"), so it is not restated here: copy it from there. It names the tool, its cost tier,
the canonical connection command, where the key comes from, and the selected host
activation and fresh-operation checks. Any remaining setup limitation must describe the actual
host/session evidence; configuration alone does not grant readiness.

Examples: an X-sentiment theme with `x-twitter` dark → "configure twikit (install-no-key) to add
real X founder/crypto discourse"; a macro-backdrop theme without FRED → "configure FRED MCP
(free-key) for the rates/CPI series this thesis leans on." These lines feed straight into the
report's **Coverage-gaps → Configure for deeper data** block (Output / `reference/report-template.md`), so
the gate's output is a concrete, theme-tied next step the user can act on, never a buried omission.

## Quality guardrails (HARD rules, apply during synthesis)

1. **Citation verification gate.** Before a number/claim enters the report, an independent
   verifier must actually fetch the cited URL and confirm the page contains that value (verbatim
   quote). Mark each `✓verified / ⚠unverifiable / ✗dead`. Drop `✗dead`; demote quote-less numbers
   to "unverified." A plausible URL is not a verified source.
2. **≥2 independent sources for decision-grade claims.** "Independent" = not syndicated from the
   same origin, treat byline/wire-service reprints (AP/Reuters/PR-Newswire pickups, identical
   verbatim quotes, the same press release) as **one** source, not several; the corroboration count
   must reflect that merge. Label confidence: high = ≥2 independent L1/L2 sources + verified; medium = 2
   sources incl. secondary, or 1 primary; low = single/secondary/unverified.
3. **Source tiers.** Tag every source L1 first-party/official · L2 independent third-party ·
   L3 interested party (vendor/marketing) · L4 UGC/anonymous · L5 fallback web / model inference.
   Vendor self-claims (L3) cannot be the sole support for a performance/profit claim.
4. **No silent degradation.** When a barrier source (X, real prices, social) is unavailable and
   you fall back to web, the relevant section must say so: "⚠ intended source unavailable, based
   on [L?] fallback, reliability reduced." Never swap silently.
5. **Timestamp volatile data.** Every price/policy/ranking/rate carries `[fetched YYYY-MM-DD |
   published ____]`. Missing publish date → mark "date unknown, treat as stale." Never present an
   undated precise figure. State a snapshot date at the report top.
6. **Disconfirmation mandate (esp. arbitrage/investing).** Run a dedicated reverse-search subagent
   (terms: scam/failure/loss/banned/expired/risk/regulation). Report must include a "Risks &
   counter-evidence" section and, for arbitrage, "execution friction" (fees, slippage, capacity,
   time window, compliance). Empty → "actively reverse-searched, none found, not proof of no risk."
7. **Surface conflicts, don't average them.** When sources disagree, present a disagreement matrix
   (source A says X vs source B says Y, likely cause, which side and why), do not silently pick or
   average. Mark each key claim `confirmed / disputed / unresolved`.
8. **Failures become explicit gaps.** Any subagent that returns `failed/empty` triggers one query
   rewrite + retry; if still empty, list it in an explicit "Not covered / insufficient data"
   section. A report must never look complete while hiding a missing dimension.

## Output

Synthesize per `reference/report-template.md`: snapshot date, executive summary, per-domain
findings with tiered+dated+confidence-tagged claims, cross-verification verdicts, disagreement
matrix, risks & counter-evidence, explicit coverage gaps + the Step 2/Step 4 JIT
"configure source X to deepen <theme aspect>" suggestions (available-now vs
setup vs hard-gap), full source list.

## Close the feedback loop (Step 5, write what you observed)

At the end of a research run, append one observation per source used to
`metrics/live-runs.jsonl` below the PRIVATE DATA directory. The resolver is
`fleet_guards.runtime`; the incident helper uses `tools/private_inventory.py`
to resolve the final canonical destination inside the companion worktree before writing.
If storage is missing or unresolved, stop persistence, explain the required setup,
and retain the observations in the reply until storage is ready. Never write this
ledger in the public source.

The next refresh uses observations to prioritize re-verification and automatically
nominate sources flagged `dead` for the C4 deletion process. Publish only reusable source
findings in `reference/tools/*.md`; research history stays private.

The canonical outcome vocabulary is defined in [live-run-schema.json](reference/live-run-schema.json).
The [generated synthetic ledger](metrics/live-runs.jsonl.example) covers every supported outcome.
Do not hand-write real-run records into public examples.

## Progressive loading rules

- SKILL.md (this file) is always loaded, keep it the only frequently-loaded content.
- Read `reference/sources-index.md` at triage (thin).
- Read `reference/domains/<domain>.md` only for triaged domains. **Never read the whole domains/
  directory.**
- Read `reference/tools/index.md` (thin) to find a picked tool's doc slug; then read
  `reference/tools/<slug>.md` **only for the specific tool you're about to use**, per-tool install +
  auth + usage + 踩坑. **Never read the whole `tools/` directory** (that breaks progressive loading
, the whole point of per-tool docs is on-demand, one-at-a-time loading). The shard decides *which*
  tool; the tool doc is the *how-to*.
- **Install docs are 3-tiered** (L0 / L1 / L2), read top-down only when you actually need that
  level of detail:
  - **L0** = `reference/install-guide.md`, universal mechanics (prerequisites, MCP transport
    choice on Windows, secret hygiene, BOM rules, Python install target). Read when bootstrapping
    a fresh machine or onboarding any new tool category.
  - **L1** = `reference/volatile/pricing-install.md`, per-domain, time-stamped exact commands +
    current prices. Read when actually guiding an install for a specific domain. **Prices rot;
    re-verify the live site before quoting.**
  - **L2** = `reference/tools/<slug>.md` (judgment) and optionally `reference/tools/<slug>.auto.md`
    (mechanical, spec §11.1 split). Read for the specific tool you're about to install/use. The
    `.auto.md` sibling, when present, holds install command + auth + pricing snapshot, that's the
    file to consult for "exactly what to type". The bare `<slug>.md` always exists; `.auto.md`
    is opt-in per tool.
  When a user asks "how do I install X", the right read order is **L2 first** (the auto.md if
  present, else slug.md "Install" section), fall back to **L1** for time-stamped exact commands,
  and only reach **L0** if a generic mechanic is unclear (PATH issue, BOM, env target).

## Maintenance

When asked to "refresh the market-intel source matrix / 刷新工具库", follow
`reference/refresh-protocol.md`: fan out one subagent per domain to find
new/changed/dead tools since each shard's `last_verified`, apply the same quality guardrails, edit
shards incrementally, record the diff in `CHANGELOG.md`, and bump the plugin version.
