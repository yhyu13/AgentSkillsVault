---
name: source-anchored-design
description: Turn a question into a reviewer-hardened, source-anchored design or research doc. Fan out background research agents only when the question decomposes into independent primary-source hunts, write a conclusion-first doc where every claim carries a file:line / URL / spec anchor, then harden it with a single critic subagent loop until no blocking issues remain. Use when the user wants a design doc, research note, or technical proposal whose claims are traceable to primary sources and that has survived independent review. Composes the `research` and `criticism-self-criticism` skills into one loop.
---

# source-anchored-design

One question → one reviewer-hardened, source-anchored doc. Two phases: research+draft, then a critic loop. The critic loop is the high-value half; the multi-agent research fan-out is optional and gated.

## When to Use

- The user wants a design doc, research note, or technical proposal whose claims must be traceable to primary sources.
- Every claim needs a `file:line` / URL / spec anchor, and the doc must survive independent review.
- The question decomposes into ≥2 independent primary-source hunts (fan out), or is one narrow thing read in-line.

## When NOT to Use

- A trivial write-up with no claim that needs a source anchor.
- Raw research notes without the critic-hardening loop.

## Phase 1 — Research + first draft

**Fan-out is gated, not default.** Launch N background research agents only when the question splits into ≥2 *independent* primary-source hunts (independent = different sources, no overlap, no ordering). A real example that earned it: "engine binding internals" (repo source) vs "LLM DSL prior art" (web) vs "scripting perf" (web) — three disjoint reads.

- Each agent: primary sources only (repo source, official docs, specs, first-party APIs), every claim traced to its owner, return findings + citations (`file:line` / URL). Mark `待确认` where no primary source exists.
- If the question is one narrow thing, read the sources yourself — a subagent just re-reads context and adds latency.

**Write the doc:**
- 结论先行 (bold first paragraph), then 是什么/不是什么 (≤3 对比句), body, 一句话总结. The core claim appears exactly twice: definition + close.
- Every claim anchored (`file:line` / URL); numbers carry units/baseline; no fabricated symbols — grep before you write.
- 去AI味: no 「值得注意的是/综上所述/赋能/抓手」; one idea per paragraph.
- Save where the repo keeps such notes; if there is none, pick a sensible spot and say where.

## Phase 2 — Critic loop (mandatory, repeat until zero blocking)

1. **Send the latest draft to ONE critic subagent** (fresh context — never self-review): "Verify every anchor against source, check internal consistency, find factual errors / overclaims / contradictions. Return blocking vs minor, each with file:line evidence + a specific fix. Do not edit the file."
2. **Re-verify the critic's load-bearing claims yourself** before applying. The critic can be wrong, and a wrong critic claim propagated is worse than the original error. Grep/read the source.
3. **Apply minimal fixes.** No refactor, no scope expansion, no "while I'm here".
4. **Exit only when blocking = 0.** For minor issues, fix the cheap concrete ones; skip vague style notes.

## Multi-agent vs single-agent (the honest rule)

| Move | Keep? | Why |
|---|---|---|
| Research fan-out (N parallel agents) | Optional, gated | Wall-clock parallelism on *independent* reads only. Cost: token duplication, wait-for-all, overlap risk. Not a correctness tool. |
| Single critic subagent | Keep, always | This is where correctness gains come from; it caught real errors every round. One voice, one pass. |
| Self-review by the main agent | Never | Fresh context is the entire point. |

## Anti-patterns

- Fanning out when the questions overlap or chain (redundant reads, inconsistent findings).
- Fanning out the critic (multiple reviewers = conflicting verdicts, no clean blocking signal).
- Applying a critic's fix verbatim without re-verifying its evidence (the critic is not the source of truth; the source is).
- Declaring done with a "minor-only" list that still contains a factual error you did not re-check.
