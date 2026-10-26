# Skill library pressure — research findings and local measurement

**Date:** 2026-10-25
**Scope:** the skills installed on this machine (vault `AgentSkillsVault` + hand-installed packs), and what the vendor documentation and the published literature say about how large a skill library an agent can usefully hold.
**Method:** vendor docs fetched and read directly; academic sources read on arXiv; local numbers produced by `docs/skill-capacity-audit/skill_pressure_analysis.py` (reproducible, see §7).

---

## 0. v2 corrections (post-remediation, 2026-10-25 later)

The v1 numbers below were measured **before** the vendor submodules were checked out and **before** the store reconciliation. An independent review (three critic subagents) found errors in the v1 text, and remediation changed the numbers. **This section supersedes every figure in §2, §5 and §8; the body below is the v1 snapshot and is kept for the reasoning, not the numbers.**

### 0.1 What changed

| action | effect |
|---|---|
| 4 vendor submodules checked out (github reachable through the proxy) | 14 vendor skills installed; manifest 268 → 269 after restoring `html-ppt` |
| `html-ppt` restored into the vault from its pinned submodule | the vault copy had been lost in the restructure; only a 1-file stub and a 13-file-short copy existed on disk |
| store reconciliation | 4 duplicate/divergent copies removed or converted to junctions; 0 duplicate names, 0 cross-store divergence remain |

### 0.2 Corrected figures

| metric | v1 (wrong / superseded) | v2 (current, from the script) |
|---|---|---|
| unique skills visible | 325 | **336** (264 curated + 13 vendor + 59 hand-installed) |
| listing size | 121,806 chars | **130,967 chars ≈ 36,380 tokens** |
| average entry cost (name + description) | 362 (description only) | **390 chars** |
| longest description | — | 1,260 chars (still under the 1,536-char per-entry cap) |
| manifest skills | 268 | **277** (269 + 8 promoted + 1 vendor copy promoted) |
| "genuinely divergent" skill copies | 6 | **2** — see §0.3 |
| duplicate frontmatter names | 1 (`html-ppt`) | **0** |
| cross-store content collisions | 4 | **0** |
| pairs whose descriptions still share a >40-character prefix | not measured | **1 of 20,072** (`docx` ↔ `pdf`) |

### 0.3 The v1 "6 divergent skills" claim was wrong

v1 reported six skills whose config-store copy differed from the vault copy, including `ue-renderdoc-auto-capture` (whose *scripts* differed) and therefore proposed porting a "newer local fix" and bumping versions. **That was a false alarm.** The divergence was a line-ending artefact: this machine has `core.autocrlf=true`, so git checkouts are CRLF while hand-copied files are LF. After normalising CRLF → LF, **104 of 106 copies are identical and only 2 genuinely differ** — `canvas-design` and `slack-gif-creator`, both Anthropic-distribution revisions that differ from the pinned upstream commit, and neither of which is a "newer local fix" of a vault skill. No skill content was changed, no version was bumped, nothing was ported. [来源: 1-实测]

`skill_pressure_analysis.py` now normalises line endings before hashing (`tree_hash(..., normalize=True)`) and reports raw and normalised results separately, so this class of false positive cannot recur.

### 0.4 Other v1 claims that were wrong

- **"the model cannot see the description at all"** — imprecise. Every skill *name* is always listed; what the budget removes is the *description*, which is the part that carries the trigger words. Corrected throughout.
- **`style-report` "removes 5 shadowing pairs at once"** — wrong. `style-report` appears in exactly **one** measured pair (`style-report` ↔ `style-google`, Jaccard 0.300). The other `style-*` pairs are sibling-to-sibling.
- **"invoked in all 262 trajectories"** — the paper says the shadowing skill was *invoked* in all 262 trajectories and was the *first pick* in 51. Both numbers are now given.
- **arXiv items are unrefereed preprints**, not peer-reviewed papers. They are cited as `[L3-unrefereed]`, not as level-2 evidence.
- **There is no usage telemetry on this machine** (see §9), so no tier was ever chosen from usage data.
- **Kilo has no skill-visibility setting** (see §9), so for the harness in use the only lever is what is installed.

### 0.5 What the remediation actually achieved

- All **277** manifest skills are installed and byte-identical to their source (`verify-install.ps1`: match=277, mismatch=0, missing=0) — the 14 vendor skills that were missing for the whole session are now present.
- The always-visible surface is tiered: 66 tier-A skills (26,984 chars ≈ 0.75× of the 1M-context listing budget) stay auto-matchable; 211 tier-B skills are installed and manually invocable but hidden from auto-selection.
- A standing guard (`scripts/verify-capacity.ps1`) now fails the build on retired skills present, duplicate names, cross-store divergence, untiered skills, or a tier-A listing over budget.

### 0.6 Phase 4 executed — and the acceptance metric was wrong

The 23 confusable skills were rewritten so that each description's **first words** name the skill's subject and state what it is *not* for, because a budget-truncated listing shows only the head. Nine skills had to be promoted into the vault first: the six company-style skills and the two `grill-*` skills lived only in the user's own store, and `pptx` was vendored — a vendored file is lost on `git submodule update`, so it was promoted to a curated copy rather than edited in place.

**The first acceptance metric failed, and the metric was at fault.** Whole-description Jaccard *rose* (for example `brand-pptx` ↔ `brand-xlsx`, 0.714 → 0.745) because correct disambiguation *adds* shared vocabulary: every rewritten description now contains "only", "Not for", "use", and the sibling's name. A lexical-overlap score structurally punishes the fix it is supposed to measure.

Two better instruments were added to the analysis script:

| metric | what it measures | why |
|---|---|---|
| **prefix overlap** | Jaccard over the first 120 characters only | that is the part a budget-truncated listing still shows |
| **divergence position** | how many characters a reader must consume before two descriptions differ | the question the fix actually asks: can the model tell them apart from the head alone? |

Measured against git before the rewrite (`HEAD` vs. the working tree), for the 13 pairs that git tracks:

| pair | divergence before | divergence now |
|---|---|---|
| `brand-docx` ↔ `brand-pptx` | 12 | **0** |
| `brand-pptx` ↔ `brand-xlsx` | 12 | **0** |
| `brand-xlsx` ↔ `brand-docx` | 12 | **0** |
| `blog-to-linkedin-post` ↔ `blog-to-twitter-post` | 38 | **0** |
| `blog-to-twitter-post` ↔ `blog-to-linkedin-post` | 38 | **0** |
| `project-update` ↔ `weekly-report` | 2 | **0** |
| `weekly-report` ↔ `project-update` | 2 | **0** |
| `aura-asset-images` ↔ `unsplash-asset-images` | 18 | **0** |
| `unsplash-asset-images` ↔ `aura-asset-images` | 18 | **0** |
| `grafana-loki-label-analyzer` ↔ `grafana-prometheus-label-strategy` | 21 | **0** |
| `grafana-prometheus-label-strategy` ↔ `grafana-loki-label-analyzer` | 21 | **0** |
| `game-dev-loop` ↔ `software-dev-loop` | 13 | **1** |
| `software-dev-loop` ↔ `game-dev-loop` | 13 | **1** |

**13 better, 0 same, 0 worse.** Across the whole library, 20,071 of 20,072 pairs now diverge within 40 characters; the one that does not is `docx` ↔ `pdf` (42 characters), which is a new finding rather than a regression — both are vendored Anthropic document skills, so the fix needs a curated copy, and it is not in the approved scope.

Two honest caveats:

- **`project-update` ↔ `weekly-report` and the `brand-*` pairs were already distinguishable** (2 and 12 characters). Their Jaccard was high because the *rest* of the description is shared task boilerplate, not because the head was ambiguous. The rewrite still helps a budget-truncated listing, but it was not fixing a real selection failure there.
- **The behavioural trigger test was attempted and is blocked by the model endpoint.** The harness is committed (`docs/skill-capacity-audit/trigger_test.py`): 16 realistic prompts through the Claude Code CLI, reading the Skill tool calls out of the stream-json transcript. With 4 concurrent workers 15 of 16 prompts timed out, and the transcript shows the endpoint returning **HTTP 429 rate_limit** on every one of ten retries; a serial probe timed out the same way, so the limit is a quota rather than a concurrency artefact. Also fixed in this pass: `docx` ↔ `pdf`, the one pair still sharing a >40-character prefix — both vendored skills were promoted to curated copies with front-loaded format words, and after that **all 20,253 pairs diverge within 40 characters**. The vendors both recommend the live trigger test; it is one command once the endpoint allows it.

---


## 1. The question, restated

> "Research the internet for the optimal number of skills. Are we overwhelming our agents with skills? What do OpenAI, Anthropic, or other credible best-practice sources say?"

---

## 2. Answer first

**Yes — the always-on listing is far past the point where it works as a selection interface. But the damage is concentrated, not uniform, and the fix is not "delete 300 skills".**

| finding | number | source |
|---|---|---|
| Unique skills visible to an agent on this machine | **325** | measured |
| Size of the always-preloaded listing (name + description) | **121,806 chars ≈ 33.8k tokens** | measured |
| Claude Code's listing budget (1% of a 200k-token window) | 7,200 chars → **fits ~20 of our skills** | [L3-Anthropic-CC] |
| Codex's listing budget (2% of window, or 8,000 chars when unknown) | 8,000–14,400 chars → **fits ~22–40 of our skills** | [L3-OpenAI-Codex] |
| Our listing vs. those budgets | **8.5× to 17× over** | measured |
| Skills whose description pairs with another at Jaccard ≥ 0.30 | **21 of 325 (6.5%)** | measured |
| Pass-rate loss measured at 202 skills vs. oracle-only | **21% (pooled), 26% (Haiku)** | [L2-ArXiv-Shadowing] |
| Pass-rate loss already measurable at 52 skills | **8–10%** | [L2-ArXiv-Shadowing] |

**The single most important finding:** the *description* is the entire interface an agent has for choosing a skill. Both vendors document that when the listing overflows its budget, descriptions are dropped or shortened — and both vendors explicitly tell authors to front-load trigger words *because descriptions get shortened*. [L3-Anthropic-CC][L3-OpenAI-Codex] At 17× over budget, most of our selection interface is not in the model at all. Separately, and independently, the literature says that even with full descriptions, past ~50 candidates the agent starts picking the *wrong* skill rather than no skill. [L2-ArXiv-Shadowing]

**But our overlap is not diffuse.** Only 21 skills sit in a confusable cluster, concentrated in a handful of families (`brand-*`, `style-*`, `grafana-*`, `blog-to-*`, the report-writing trio, the image-source pair). So the correct action is *targeted disambiguation plus a tiered install*, not a mass purge.

---

## 3. What the vendors say

### 3.1 Anthropic

**Progressive disclosure is the design; metadata is cheap per skill.**
Level 1 metadata (the YAML `name` + `description`) is always loaded; the body loads only on trigger. Anthropic's own table prices that metadata at **~100 tokens per skill**, and the platform docs state that this "lightweight approach means you can install many Skills without context penalty". [L3-Anthropic-Overview]

**But the Claude Code implementation caps the aggregate listing.**
From the Claude Code skill documentation: the listing of names and descriptions "always contains every skill name, but if you have many skills, Claude Code drops some descriptions to fit the listing's character budget, which removes the keywords Claude needs to match your request. **The budget scales at 1% of the model's context window.** When the listing overflows, Claude Code drops descriptions starting with the skills you invoke least, so the skills you use most keep their full text." [L3-Anthropic-CC]

The same page adds three facts that matter for this vault:

- **Every skill in the listing costs context on every turn, "whether or not Claude ever uses it."** [L3-Anthropic-CC]
- `/skill-doctor` reports per-skill context cost and invocation frequency, and flags never-invoked skills; `/doctor` estimates the listing's context cost. [L3-Anthropic-CC]
- There are three levers that remove a skill from the *model-visible* surface without deleting it: `"name-only"` (name kept, description dropped), `"user-invocable-only"` / `disable-model-invocation: true` (**description not in context**, body loads only when invoked by hand), and `"off"`. [L3-Anthropic-CC]

**So Anthropic's two statements are consistent once you read them precisely:** installing *many* skills is cheap **per skill**, but the aggregate listing is capped, and the cap is enforced by deleting exactly the part of the metadata the model matches against.

### 3.2 OpenAI

The Codex skill documentation is blunter about the same failure mode: the initial list "uses at most **2% of the model's context window, or 8,000 characters** when the context window is unknown. If many skills are installed, **Codex shortens skill descriptions first**. For large skill sets, **Codex may omit some skills from the initial list and show a warning**." [L3-OpenAI-Codex]

OpenAI's guidance to authors anticipates this exactly: *"Because implicit matching depends on description, write concise descriptions with clear scope and boundaries. **Front-load the key use case and trigger words so a host can still match the skill if descriptions are shortened.**"* [L3-OpenAI-Codex]

OpenAI also provides the off-ramp: `skills.max_context_tokens` (up to 10,000), `[[skills.config]] enabled = false` in `~/.codex/config.toml`, and `agents/openai.yaml` → `policy.allow_implicit_invocation: false` ("Codex won't implicitly invoke the skill based on user prompt; explicit `$skill` invocation still works"). [L3-OpenAI-Codex]

### 3.3 The gap between the two, and what it means for us

| | Anthropic / Claude Code | OpenAI / Codex |
|---|---|---|
| Listing budget | 1% of the model's context window | 2% of the context window, or 8,000 chars if unknown |
| Over-budget behaviour | drops descriptions, least-used first | shortens descriptions, then omits skills + warns |
| Remove from the matching surface | `skillOverrides` / `disable-model-invocation` | `allow_implicit_invocation: false` / `skills.config` |
| Manual invocation still works | yes (`/name`) | yes (`$name`) |

Both vendors therefore agree on the architecture: **keep a small, high-quality, always-matchable core; move the long tail out of the implicit-matching surface while keeping it manually invokable.** Neither vendor publishes a "recommended skill count" — the budgets are the operative constraint, and they are self-describing: 1–2% of the window.

At our average description length of 357 characters, 1–2% of a 200k-token window holds **20–40 skills**. At a 1M-token window it holds 100–200. That is the vendor-implied ceiling for *always model-invocable* skills.

---

## 4. What the scientific literature says (the "max numbers")

### 4.1 The most direct study: skill shadowing

**Song & Wei (Databricks), "More Skills, Worse Agents? Skill Shadowing Degrades Performance When Expanding Skill Libraries", arXiv:2605.24050v2 (21 May 2026, rev. 23 Jun 2026).** [L2-ArXiv-Shadowing]

They measure the pass-rate drop between an *oracle* library (only the skills that help) and progressively larger libraries, on SkillsBench (888 tasks, 3,838 task-model pairs, 2,545 trajectories, Haiku 4.5 + Sonnet 4.6), and decompose the drop into **skill shadowing** (the agent selects the wrong skill) vs. **context overhead** (the bigger context degrades execution even when selection is right).

| library size | Δ pass rate (pooled) | Δ shadowing | Δ context overhead | "oracle only" share | "no skill invoked" share |
|---|---|---|---|---|---|
| oracle only | — | — | — | 88.0% | 12.0% |
| **52** | **8%** [.02,.15] | .03 [−.01,.07] | .06 [−.11,.22] | 80.3% | 16.1% |
| **102** | **14%** [.09,.19] | .08 [.02,.15] | .06 [−.11,.23] | 64.4% | 28.3% |
| **202** | **21%** [.15,.27] | .14 [.06,.26] | .07 [−.13,.25] | 52.6% | 38.5% |

Three results that answer the question directly:

1. **The largest library they tested was 202 skills, and it cost 21% of pass rate** (26% on Haiku, 15% on Sonnet). We run 325.
2. **Shadowing is the cause, not context.** Only the shadowing term's confidence interval excludes zero at the larger sizes; the context-overhead term never separates from noise. Their conclusion: "the skill selection failure, not the enlarged context, is the primary bottleneck when expanding the skill libraries." A wrong skill is worse than a wrong tool call, because it injects plausible but incorrect reasoning that the agent then treats as authoritative.
3. **The failure mode is mass migration away from correct selection.** "Oracle only" collapses 88% → 52.6%, and "no skill invoked" grows 12% → 38.5%. Their example: a `video-frame-extraction` skill shadowed the correct skill for a `mario-coin-counting` task and was **invoked in all 262 trajectories**, and the agent's **first pick in 51** of them. Other recurring pairs: `senior-data-scientist` shadowing a trend-anomaly task, `reflow_machine_maintenance_guidance` shadowing an FJSP task.

**This is the paper's own framing of "the max number":** they stopped at 202 because that was the union of the benchmark's authored skill bundles — not because 202 is a cliff. Degradation was already significant at 52.

### 4.2 The adjacent tool-selection literature (skills amplify it)

The same paper summarises the mature tool-use findings, which is the right prior for skills because skills are matched by *natural-language description* rather than a typed schema — a strictly noisier signal: [L2-ArXiv-Shadowing]

> "Tool selection accuracy drops from above 90% with fewer than 30 candidates to 13.6% with 11,100 … Skills amplify these failure modes: they rely on natural-language descriptions with broader, more overlapping scope than typed tool schemas, and a wrong skill injects plausible but incorrect reasoning into the agent's context where it is treated as authoritative."

Corroborating studies:

- **Routing degradation at scale** (arXiv:2606.17519, production assistant, 110 agents / 584 tools): routing F1 drops **16–23 points** from 51 to 584 tools; the drop is recall-driven (55% → 37%), and even a perfect-retrieval oracle loses 10 points, so some of the damage is irreducible confusion. Embedding-based shortlisting recovers +10–11 F1. [L2-ArXiv-Routing]
- **Tool-menu filtering** (ToolMenuBench, arXiv:2606.15508): exposing all tools yields **32.1%** task success at 56,062 tokens per task; causal-minimal filtering yields **85.7%** at 1,125 tokens — a 53.6-point success gain and ~98% token reduction. [L2-ArXiv-ToolMenu]
- **Causal minimal tool filtering** (arXiv:2606.06284): 100 visible tools → 1 visible tool per step, success 0.83 → 0.99, tokens 24,569 → 2,405. [L2-ArXiv-CMTF]
- **How many tools to show** (arXiv:2605.24660): on BFCL's 370 tools, an adaptive policy matches the coverage of showing 50 tools while showing **7** on average; on ToolBench (3,251 tools) a fixed depth of 5 finds nothing on hard queries while the adaptive one finds 16.7%. [L2-ArXiv-Shortlist]
- Independently (blog, corroboration only): a 150-tool synthetic sweep found accuracy degrading from 25 → 50 tools onward, and a hard platform ceiling at 128 tools on OpenAI's API. [L4-SixDegree]

### 4.3 Synthesising an "optimal number"

No source publishes a magic number, but three independent lines converge:

| evidence | implied ceiling on *always model-invocable* skills |
|---|---|
| Claude Code 1% budget / Codex 8,000-char budget, at our 357-char descriptions | **20–40** |
| Selection accuracy >90% below 30 candidates; 8–10% pass-rate loss already at 52 | **~30–50** |
| 21% pass-rate loss at 202; 14% at 102 | well below 100 |

**Target: 30–50 always-on skills. The long tail stays installed but leaves the implicit-matching surface.** (A 1M-token-context model raises the vendor-implied ceiling to 100–200, but the selection-degradation curve does not move with it.)

---

## 5. What our library actually looks like

Measured with `skill_pressure_analysis.py` on 2026-10-25, after the 2026-10-25 retirement cleanup (68 retired skills removed from all five stores).

### 5.1 Size and provenance

| store | skills visible |
|---|---|
| `~/.claude/skills` (canonical) | 287 dirs / 286 unique names |
| `~/.kilo/skills` (junction view) | 268 |
| `~/.codex/skills` (junction view) | 286 |
| `~/.agents/skills` (junction view) | 287 |
| `~/.config/kilo/skills` (separate Kilo global store) | 165 |
| **union (what an agent sees)** | **325 unique skills** |

One duplicate frontmatter name exists inside the canonical store: `html-ppt` and `html-ppt-source` both declare `name: html-ppt`. The harness dedupes by name, so one of them is silently unreachable by name. See §5.6.

| provenance | count |
|---|---|
| vault-curated (`SKILL/…`) | 254 |
| vendor-sourced (installed) | 2 |
| hand-installed (outside this vault) | 69 |
| **total** | **325** |

### 5.2 Listing cost

| metric | value |
|---|---|
| description characters | 116,042 |
| name characters | 5,764 |
| **total listing** | **121,806 chars ≈ 33,835 tokens** (at 3.6 chars/token) |
| average description length | 357 chars (Anthropic's own reference point: ~100 tokens/skill ≈ 360 chars [L3-Anthropic-Overview]) |
| descriptions exceeding the 1,536-char per-entry cap | 0 |

**Our descriptions are the right length.** The problem is not per-skill quality; it is the count.

### 5.3 Against the vendor budgets

| budget | chars | our skills that fit | our listing vs. budget |
|---|---|---|---|
| Claude Code 1% @ 200k ctx | 7,200 | ~20 | **16.9× over** |
| Codex 2% @ 200k ctx | 14,400 | ~40 | **8.5× over** |
| Codex fallback (unknown ctx) | 8,000 | ~22 | **15.2× over** |
| Claude Code 1% @ 1M ctx | 36,000 | ~100 | **3.4× over** |
| Codex 2% @ 1M ctx | 72,000 | ~201 | **1.7× over** |

To fit Codex's 8,000-char fallback with 325 skills, every description would have to be **≤ 7 characters**. That is the arithmetic of why "install everything and let the model choose" cannot work at this scale.

### 5.4 Where the confusion actually is

Jaccard similarity over description content words; 15 pairs clear 0.30, covering 21 skills (6.5% of the library):

| pair | Jaccard | why it is ambiguous |
|---|---|---|
| `brand-pptx` / `brand-xlsx` | 0.714 | both "brand-aware Office engine, extract/generate/verify" |
| `brand-docx` / `brand-pptx` | 0.690 | same |
| `brand-docx` / `brand-xlsx` | 0.659 | same |
| `grill-me` / `grill-with-docs` | 0.556 | identical trigger surface, one adds ADR/glossary output |
| `blog-to-linkedin-post` / `blog-to-twitter-post` | 0.548 | same source, different platform |
| `project-update` / `weekly-report` | 0.429 | both "generate a structured status report" |
| `aura-asset-images` / `unsplash-asset-images` | 0.419 | both "pick stock images and return real URLs" |
| `grafana-loki-label-analyzer` / `grafana-prometheus-label-strategy` | 0.377 | both "audit a label schema and score cardinality" |
| `game-dev-loop` / `software-dev-loop` | 0.375 | both "the complete dev loop, persist goal → plan → test → memory" |
| `style-bytedance` / `style-tencent` | 0.333 | company report styles |
| `style-bytedance` / `style-google` | 0.333 | company report styles |
| `style-alibaba` / `style-tencent` | 0.333 | company report styles |
| `style-alibaba` / `style-bytedance` | 0.333 | company report styles |
| `style-google` / `style-microsoft` | 0.316 | company report styles |
| `style-google` / `style-report` | 0.300 | the router vs. one of its own targets |

**Read this as a 6.5% problem, not a 100% problem.** The `style-*` family (6 skills) and `brand-*` family (3 skills) are the two clusters worth fixing first: they are pure shadowing candidates, and the `style-report` / `style-alibaba` pair is a textbook case — a dispatcher skill whose description contains all its siblings' trigger words.

### 5.5 One mitigating factor in our favour

Our skill names are descriptive kebab-case (`blog-to-twitter-post`, `3d-ultra-realistic-water`, `dt-obs-logs`). When a harness drops a description under budget pressure, the *name* still carries most of the matching signal. A library with opaque names (`skill-17`, `helper-a`) would degrade much harder in the same truncation regime. This does not fix the 17× overage, but it means the truncation failure is graceful rather than silent for most of our catalogue.

---

### 5.6 Two copies of the same skill — a correctness bug, not a capacity issue

> **Superseded by §0.3.** The six "genuinely divergent" skills reported here were a CRLF/LF artefact; only `canvas-design` and `slack-gif-creator` actually differ, and both are Anthropic-distribution revisions rather than local fixes. The duplicate `html-ppt` name and the `artifacts-builder`/`web-artifacts-builder` pair have since been fixed. The mechanism below is what the guard now checks.

The `~/.config/kilo/skills` store is outside the vault's control, and it contains **106 skills that are also in the vault manifest**. Comparing them file by file against the vault source:

| comparison | count |
|---|---|
| byte-identical to the vault copy | 98 |
| **present in both but with different file contents** | **6** |
| manifest entry with no vault source present (un-checked-out vendor skills) | 2 |

The six divergent skills:

| skill | differing files | what differs |
|---|---|---|
| `ue-renderdoc-auto-capture` | 9 | `scripts/capture_rdc.ps1`, `scripts/analyze_tex_script.py`, `scripts/probe_*.py`, `references/ue-renderdoc-pitfalls.md` |
| `single-file-html-game` | 8 | `SKILL.md`, `assets/skeleton.html`, 4 reference files |
| `analysis-to-vault` | 7 | `SKILL.md`, 4 reference templates, 1 example |
| `cat-game-architecture` | 4 | `SKILL.md`, 3 reference files |
| `gdd-markdown-template` | 1 | `SKILL.md` |
| `technical-design-document` | 1 | `SKILL.md` |

Their *descriptions* are identical, so skill **matching** is unaffected — but the **body** the agent loads after invoking them is not the version the vault audited. In `ue-renderdoc-auto-capture` the divergence includes executable PowerShell and Python scripts, so an agent could run a script that is not the reviewed one. Which copy a harness loads depends on its store scan order, and Kilo, Claude Code, Codex and the Agents SDK do not all scan in the same order.

This is independent of the capacity question and worth fixing on its own: the install model currently has two truth sources for the same skill.

---

## 6. Verdict

**Are we overwhelming our agents? Yes — on two independent axes, and the second matters more.**

1. **Interface truncation (certain, now).** The listing is 8.5–17× over every vendor budget. Claude Code will drop descriptions for the least-used skills; Codex will shorten and then omit, with a warning. For any skill that is not among your most-used, the model is matching on a name, not a description — and the "use when" trigger words the audit was written for are simply not in context.
2. **Selection shadowing (measured, and growing).** 21 skills are in confusable clusters today; at 325 skills we are past the 202-skill point where the literature measured a 21% pass-rate loss, and the loss is monotonic in library size. Our own duplicate-`name` collisions and our two-storey store layout (vault + 69 hand-installed skills with no dedup rule) make this worse than the raw number suggests.

**What this does *not* mean:** it does not mean 325 skills is too many to *own*. A skill body only loads when invoked, so keeping 254 skills installed costs a body-load only when used. It means 325 is too many to keep in the *implicit-matching* surface at once.

**One thing found along the way that is not a capacity problem at all:** six skills exist in two stores with different file contents (§5.6), including one whose executable scripts differ. That is a correctness bug in the install model and should be fixed regardless of what we decide about library size.

---

## 7. Reproducing the local numbers

```powershell
# Reads the five user stores and the vault manifest; writes nothing outside --json.
python docs\skill-capacity-audit\skill_pressure_analysis.py `
  --json docs\skill-capacity-audit\2026-10-25-skill-library-pressure.json
```

Script: `docs/skill-capacity-audit/skill_pressure_analysis.py` · Output: `docs/skill-capacity-audit/2026-10-25-skill-library-pressure.json`

The script parses every `SKILL.md` frontmatter with a real YAML parser (falling back to regex), unions the five stores by skill name, sums the listing characters, applies each vendor's published budget, computes pairwise Jaccard similarity between description content-word sets to find shadowing candidates, and diffs the 106 manifest skills that also live in the unmanaged `~/.config/kilo/skills` store against their vault source.

Token estimates use 3.6 chars/token for mixed English/code description text; Anthropic's own reference is ~100 tokens per skill of metadata, which our measured 357-char average corroborates.

---

## 8. [Judgement and recommendations]

Everything above this line is either a vendor document, a published measurement, or a number produced by the script in this repo. Everything below is my reading of it.

### 8.1 Adopt a three-tier install (recommended, highest value)

Do **not** delete skills. Move them out of the implicit-matching surface while keeping them manually invokable — that preserves the whole 254-skill catalogue and fixes the truncation failure.

| tier | contents | mechanism | effect |
|---|---|---|---|
| **A — always model-invocable** | the 30–50 skills this user actually invokes | default | full descriptions in context |
| **B — manually invokable only** | the rest of the vault | Claude Code: `disable-model-invocation: true` or `skillOverrides: "user-invocable-only"` · Codex: `agents/openai.yaml` → `policy.allow_implicit_invocation: false` | description out of context, `/name` still works |
| **C — not installed** | anything that should not ship to every agent | keep in the repo, install per-project | nothing in context |

Tier A should be chosen from **actual usage data**, not from this report. Run `/skill-doctor` in Claude Code (it reports per-skill context cost and invocation frequency) and `codex` skill usage reports; the answer will be data-driven rather than guessed.

### 8.2 Fix the 21 confusable skills before anything else (recommended)

This is the highest-return change per unit of effort, because the literature is unambiguous that shadowing — not context size — is what costs you pass rate. Priority order:

1. `style-report` vs the `style-*` family — `style-report` appears in exactly **one** measured pair (`style-report` ↔ `style-google`, Jaccard 0.300); the other `style-*` pairs are sibling-to-sibling. Each `style-*` skill needs a first line naming the company, and `style-report` needs a first line saying it is the router ("use only when the user names a company style").
2. `brand-docx` / `brand-pptx` / `brand-xlsx` — identical structure, identical trigger words. Each needs a distinguishing first line ("Word documents" / "PowerPoint decks" / "Excel workbooks") and an explicit "not for X" clause.
3. `grill-me` vs `grill-with-docs` — differentiate on the *output* ("questions only" vs "questions + ADR/glossary artifacts").
4. `project-update` / `weekly-report` / `quarterly-review` — the trigger is the cadence: one-off status report / recurring weekly / quarterly retrospective.
5. `aura-asset-images` vs `unsplash-asset-images` — name the source in the first 6 words.
6. `game-dev-loop` vs `software-dev-loop` — put the domain in the first 6 words.

Per Anthropic's guidance, the first line of a description must carry the discriminating words, because that is what survives truncation. [L3-Anthropic-Overview]

### 8.3 Deduplicate the store layout and resolve the six divergent skills (recommended)

`~/.config/kilo/skills` holds 165 skills the vault does not manage: **106 of them are also vault-manifest skills** (98 identical, 6 divergent, 2 with no vault source) and **59 are hand-installed packs** that appear in no manifest. Nothing reconciles them, so a name can exist in two places with different content — and six of them do (§5.6).

Recommended sequence:

1. **Resolve the six divergent copies now.** For each of `ue-renderdoc-auto-capture`, `single-file-html-game`, `analysis-to-vault`, `cat-game-architecture`, `gdd-markdown-template`, `technical-design-document`, decide which copy is authoritative and delete the other. The vault copy is the audited one, so the config-store copy should go — but for `ue-renderdoc-auto-capture`, check first whether the config-store scripts are a *newer* local fix; if so, port that change into the vault before deleting.
2. **Bring the remaining 59 hand-installed skills into the vault** as `sibling`/`local` provenance rows in `INSTRUCTION.md`, so `build-manifest.ps1` → `sync-skills.ps1` owns the whole user-level surface and the manifest becomes the single source of truth; or
3. **Declare the config store out of scope** and have the vault refuse to install any name that already exists there.

Either 2 or 3 is fine; leaving it undefined is what produced the divergence in §5.6 and the duplicate `html-ppt` name.

### 8.4 Extend the vault tooling to carry the tier (proposed, not implemented)

`scripts/install-manifest.txt` is currently `<name>|<path>`. To support Tier B, the manifest needs a third field and `sync-skills.ps1` needs to write `disable-model-invocation: true` into the installed frontmatter (or emit the matching `skillOverrides` / `openai.yaml` per harness). This is a small, well-scoped change to the tooling and is the piece that makes tiering reproducible instead of a one-off manual edit. It has **not** been implemented — it is a proposal.

### 8.5 Do not chase token counts (deliberate non-advice)

It is tempting to focus on the 33.8k-token listing. The literature says that is the *smaller* half of the problem: context overhead was statistically indistinguishable from zero at 202 skills, while shadowing accounted for up to 68% of the degradation. [L2-ArXiv-Shadowing] Cutting the listing is necessary to restore *discovery* (the descriptions must be there to be matched), but it is not sufficient on its own — the confusable skills must also be disambiguated. Doing only the token reduction would leave most of the loss in place.

### 8.6 One number worth tracking

Re-run the script after each install cycle. The two metrics that predict agent quality are:

- `listing_over_budget_x` — should be **≤ 1.0** for every harness you use. Today it is 8.5–17.
- `skills_in_at_least_one_shadowing_pair` — should be near zero. Today it is 21.

---

## 9. Limits of this report

- **The vendor budget percentages are self-reported by their own products.** They are the best available description of the mechanism, but they are not independent measurement, and I could not observe Claude Code's or Codex's actual truncation on this machine from inside Kilo. Treat the 8.5–17× overage as "certainly over budget under the documented rules", not as a measured token count of a real session.
- **The arXiv items are preprints.** I read them on arXiv (abstract + full HTML for 2605.24050v2, abstract for the others). I did not verify peer-review status, and I did not reproduce their experiments.
- **The Jaccard threshold (0.30) is my choice, not a published constant.** The 21-skill figure is therefore threshold-dependent; the ranking and the identified families are not.
- **The Kilo harness's own listing behaviour is unverified.** In this session the harness pre-loaded full descriptions for every skill it found, with no visible truncation — but that snapshot was taken before the 254-skill install, so it is not evidence about the 325-skill state. Confirm with the harness's own context/doctor command before assuming Kilo is exempt from the budget.
- **The direction of the six-way drift is unverified.** The script proves the two copies differ; it does not establish which is newer. For `ue-renderdoc-auto-capture` the differing files include executable scripts, so check the config-store copy for a local fix before deleting it.
- **The "30–50" target is a synthesis, not a quoted recommendation.** It is my reconciliation of the vendor budgets with the selection-accuracy literature; no source states it.
- **There is no usage telemetry on this machine, so no tier was ever chosen from data.** `/skill-doctor` returns nothing (Claude Code's feature-flag fetch is disabled by `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`); `claude -p "/skill-doctor"` hangs and was killed; the Kilo `session-export.db` has zero rows; 187 Claude Code transcripts (439 MB) contain only 16 distinct skill references and 5 Skill-tool calls. Tier A was therefore derived from *deliberate installation* (skills the user installed by hand) plus the process skills the repo's own workflow documents — and it is provisional by construction. [来源: 1-实测]
- **Kilo — the harness in use — has no skill-visibility setting.** `~/.config/kilo/kilo.json` exposes no `skills` key, and the repo's `.kilo/kilo.jsonc` has none either. For Kilo the only lever on the always-on listing is *what is installed*, which is why `scripts/sync-skills.ps1 -Profile core -PruneToProfile` exists. The §5.3 budget rows describe Claude Code and Codex, not Kilo.
- **The 1M-context premise is this machine's configuration, not a published claim.** `~/.claude/settings.json` sets `CLAUDE_CODE_AUTO_COMPACT_WINDOW=1000000` and points at a 1M-context model, so the live Claude Code listing budget is 1% of 1M ≈ 36,000 characters ≈ 93 skills at our 384-char average entry cost — not the 200k row. The 200k row is kept in the table for reference. A vendor-documented budget is not an independent measurement either way.
- **The SkillSpector static scan could not run.** The `skillspector` CLI is not installed and the package does not resolve on PyPI under that name, so per its own rule the review fell back to manual source review: a scripted pattern scan over all 14 vendor skills (credential reads, pipe-to-shell, download-and-execute, persistence, obfuscation, exfiltration endpoints, secret literals) plus reading the hits. The Anthropic pack's hits were documentation about `ANTHROPIC_API_KEY` usage and prompt-injection *defences*; the four third-party packs returned zero hard-pattern hits. Verdict: **APPROVE**, with the caveat that this was not a full static scan.
- **The arXiv items are unrefereed preprints.** They are cited as `[L3-unrefereed]`, not as level-2 evidence, and I did not reproduce their experiments.

---

## 10. The CSDN link

The article you linked ("单智能体甜点区" / *The single-agent sweet spot*) does not address skill-library size. Its axis is **tool-invocation density per task** — it argues that a single agent's failure rate rises when a task needs more than ~3.2 tool calls across domains, and proposes response determinism × tool-call density × state-memory granularity as the design space. [L4-CSDN]

It is a useful framing for *how many tools a task should chain*, and it is orthogonal to the question of *how many skills should be installed*. Its quantitative claims (the 3.2 threshold, the ≥85% memory-contract coverage, 27 interviews, three production case studies) are self-reported by the author, paywalled beyond the first sections, and I could not find an independent replication — treat as commentary, not evidence. [L4-CSDN]

---

## Sources

| id | level | source | what it supports |
|---|---|---|---|
| L3-Anthropic-CC | 3 (vendor doc, 仅供参考) | [Claude Code — Extend Claude with skills](https://code.claude.com/docs/en/skills) — "Skill descriptions are cut short", "Find unused skills", "Override skill visibility from settings" | 1% listing budget; description dropping; `skillOverrides` states; `/doctor`, `/skill-doctor`; 1,536-char per-entry cap |
| L3-Anthropic-Overview | 3 (vendor doc, 仅供参考) | [Agent Skills overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview), [best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) | ~100 tokens/skill metadata; progressive disclosure; "choose the right Skill from potentially 100+ available Skills"; front-load the use case |
| L3-Anthropic-Research | 3 (vendor blog, 仅供参考) | [Equipping agents with Agent Skills](https://www.anthropic.com/research/equipping-agents-for-the-real-world-with-agent-skills) | start from evaluation; structure for scale; monitor real usage |
| L3-OpenAI-Codex | 3 (vendor doc, 仅供参考) | [Build skills — ChatGPT Learn](https://learn.chatgpt.com/docs/build-skills) | 2% / 8,000-char listing budget; description shortening then omission; `skills.max_context_tokens`; `skills.config`; `allow_implicit_invocation: false`; "front-load … so a host can still match the skill if descriptions are shortened" |
| L3-OpenAI-Agents | 3 (vendor doc, 仅供参考) | [OpenAI Agents SDK — Tools](https://openai.github.io/openai-agents-python/tools/), [Build skills](https://developers.openai.com/plugins/build/skills) | "keep each namespace fairly small, ideally fewer than 10 functions"; prefer namespaces over many deferred functions; "prefer one focused skill over a large collection of loosely related instructions" |
| L2-ArXiv-Shadowing | 2 (preprint) | Song & Wei (Databricks), [arXiv:2605.24050v2](https://arxiv.org/abs/2605.24050) | 21% pass-rate drop at 202 skills; shadowing dominates, context overhead does not; oracle-only share 88%→52.6% |
| L2-ArXiv-Routing | 2 (preprint) | [arXiv:2606.17519](https://arxiv.org/html/2606.17519) | 16–23 pp routing F1 drop, 51→584 tools; oracle ceiling −10 pp; embedding shortlisting recovers +10–11 pp |
| L2-ArXiv-ToolMenu | 2 (preprint) | [ToolMenuBench, arXiv:2606.15508](https://arxiv.org/html/2606.15508v1) | all-tools 32.1% success vs 85.7% filtered; ~98% token reduction |
| L2-ArXiv-CMTF | 2 (preprint) | [Causal Minimal Tool Filtering, arXiv:2606.06284](https://arxiv.org/pdf/2606.06284) | 100 → 1 visible tool/step; success 0.83→0.99; 24,569→2,405 tokens |
| L2-ArXiv-Shortlist | 2 (preprint) | [How Many Tools Should an LLM Agent See?, arXiv:2605.24660v2](https://arxiv.org/html/2605.24660v2) | adaptive depth 7 ≈ 50-tool coverage on 370 tools; depth-5 misses hard queries |
| L4-SixDegree | 4 (blog, 仅供参考) | [We Gave LLMs 150 Tools](https://sixdegree.ai/blog/mcp-tool-overload) | degradation onset between 25–50 tools; OpenAI 128-tool ceiling — corroboration only |
| L4-CSDN | 4 (blog, 仅供参考) | [单智能体甜点区](https://blog.csdn.net/weixin_29031057/article/details/162401190) | per-task tool-call-density framing; self-reported, unreplicated, different axis |

**Citation convention:** level 0 = math/self-evident; 1 = legal/primary spec; 2 = data, authoritative literature, high-citation papers; 3 = vendor official docs/blogs (corroborated here by level-2 sources, but 仅供参考 where they are the only support for a number); 4 = other commentary (corroboration only, never load-bearing).

---

> **Disclaimer:** This output was AI-assisted and is provided for information organisation and research reference only. It is not professional advice or a basis for decisions. Vendor-documented budget percentages describe those products' current behaviour and can change; the arXiv items are preprints whose peer-review status was not verified.
