---
name: quality-first-delivery
description: Deliver complex interactive, visual, game or software artifacts to an evidence-backed quality bar instead of a feature checklist. Use when the user first asks to build a complex game, interactive page, visual scene or application, and when reconstructing or substantially improving one; especially relevant to references, effects, audio or quality-sensitive feedback. Not for a narrow edit, factual question, trivial utility, or a task explicitly limited to a prototype or review.
metadata:
  version: 2026.11.14.5
  provenance: local
---

# Quality-first delivery

A feature that exists is not yet a feature that works well. Preserve the requested scope and its original goal while independently raising the bar: plan, experience, test, critique, improve, then report. Never promise a perfect result or claim improvement without a baseline and evidence.

## Before building

1. Identify the user's real outcome, intended use, reference, deliverable and constraints. Separate fidelity/experience requirements from evidence or research goals. If a consequential choice is unclear and cannot be inferred, ask; otherwise use a reasonable assumption and state it. Do not expand permissions, spend, change the destination, or open restricted sources.
2. Build a short **quality contract** before implementation using [references/contract-template.md](references/contract-template.md). Enumerate every requested feature and quality requirement, then add experience dimensions needed for the stated outcome; for each, define observable success, a relevant check and actual limits. Mark each row `source: user` or `source: inferred`; a user requirement can never be marked not applicable. Link a real artifact path when one exists. Cross-check it against the request: do not omit a hard requirement, reclassify a failed requirement as optional, or silently replace a requested finished result with a prototype. Where a reference exists, identify comparable views/behaviors and what the evidence cannot establish. Baseline before changing existing work whenever feasible.
3. Route to available domain skills for the actual medium and verification. Read the matching instructions and apply their relevant checks; the presence of a skill is not evidence it was followed. Read [references/evidence-gates.md](references/evidence-gates.md) and the contract template for all tasks; also read [references/visual-interactive.md](references/visual-interactive.md) for games, visual scenes and interactive effects, and use [references/observation-recipes.md](references/observation-recipes.md) for concrete screenshot, accessibility, audio and frame-time procedures. In the record, address each applicable check or mark it unverified with its reason. If unsure whether this workflow fits or how much is proportionate, consult [references/application-cases.md](references/application-cases.md).

## Work to the bar

1. Make the core experience coherent before cosmetic layering. Test each requested dimension independently and together in the actual output; inspect the artifact, not only source code, state variables or a screenshot's existence. Prefer a representative end-to-end path over feature-count expansion.
2. Compare the result against the contract and reference at matching conditions where possible. Record specific, observable defects and untested dimensions; distinguish functional correctness, perceived quality, and performance. Rank the most damaging gaps, then fix and recheck within the user's scope. If a relevant dimension cannot be measured or experienced, explicitly mark it unverified rather than inventing a proxy.
3. Review the weakest required dimension and at least one representative end-to-end user path. If an important gap is found and a safe, authorized improvement is feasible, attempt a targeted fix and recheck it and the user path. Respect the user's iteration or resource limit; if none is stated, use at most two targeted fix-and-recheck cycles before reporting remaining gaps and asking whether to continue. This limits automatic iteration, not the quality bar: an unresolved requirement remains failed or unverified, never a pass. Where a useful failure-capable check can be run safely, exercise it and record what it detects. Do not claim a change improved the result without checking it.
4. Before delivery apply [references/evidence-gates.md](references/evidence-gates.md). Preserve the contract and an inspectable record of every requested dimension, its intended outcome, check, evidence and pass/fail/unverified state, plus changed items and remaining limits; put it in the deliverable workspace when permitted, otherwise summarize it in the final response. When practical, run the structure checker on the JSON record; this checks record completeness, evasive not_applicable rows, missing artifacts and unresolved row states, not evidence truth, inclusion of all requirements or quality. A green unit test, uniform value, pixel count, effect label or successful launch does not certify perceived quality. Quantitative claims require a measurement and a comparable baseline. Human judgment and real-device checks cannot be fabricated.

```bash
python scripts/check_contract.py path/to/quality-contract.json
python scripts/check_contract.py --self-test
```

5. Call the requested scope complete only when all required dimensions have evidence-backed passes, the record has at least one user-sourced pass, and you have independently reopened at least one artifact and one observation. If a condition is failed or unverified, or a real constraint prevents further work, report a partial result and specific next step. Only use a prototype/review stopping point when the user explicitly requested that scope or accepted the change; never lower the bar after a failed check to produce a pass.

## Scope and continuity

Use the user's requested destination and fidelity. A prototype or small mechanical slice is legitimate when requested; label it as such and do not quietly substitute it for a polished reproduction. Preserve existing evidence, licensing, budgets and safety restrictions. Follow user feedback by revising both the artifact and the contract as appropriate. A skill improves the chance of this workflow being selected; it cannot guarantee selection, outcomes, or the user's subjective approval.
