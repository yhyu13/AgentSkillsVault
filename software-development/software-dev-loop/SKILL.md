---
name: software-dev-loop
description: The complete software-development loop — persist the goal → write a plan doc and self-critique it → implement and self-critique → red-green test + benchmark → dump JOURNEY in between → write durable long-term memory. Use when starting or running a real software build, when a task needs goal, docs, testing, and memory chained in order, or when the user asks for the "holy grail" dev workflow.
version: 1.0.0
metadata:
  category: software-development
  created_by: agent
---

# Software Dev Loop — goal → docs → test → memory

One loop that chains the vault's dev skills into a single build process. It does not replace any of them — it is the sequence and the handoff between them.

```
goal → plan doc → implement → test → journey → long-term memory
  └──────────────← bug or goal unmet ←──────────────┘
```

## The loop

1. **Persist the goal.** Capture the objective once; keep it intact for the whole run. (`goal-persistence`)
2. **Write a plan doc, then self-critique it.** Decide on paper before code; critique the plan once and improve it before implementing.
3. **Implement the plan, then self-critique the implementation.**
4. **Test.** Red-green TDD for behavior, plus a benchmark that measures how good the result is. (`tdd`)
5. **Dump a JOURNEY in between.** Record the human/AI back-and-forth and lessons at checkpoints, not only at the end. (`journey`)
6. **Write long-term memory.** Persist durable facts, decisions, and lessons so the next session resumes instead of re-discovering.

**Loop back:** a failing test or an unmet goal returns to step 2 (plan), not straight to more code.

## Pillars → skills

| Pillar | Skill | Contribution |
|---|---|---|
| Goal | `goal-persistence` | durable objective, anti-drift steering, completion audit |
| Documentation — plan/design | `content-craft`, `technical-research-analysis-doc` | 结论先行, 说人话, code anchors, impact chain |
| Documentation — journey | `journey` | ME/YOU two-column history, risks/TODO up top, vibe-coding lessons |
| Testing | `tdd` | red-green loop, seams, vertical slices, anti-patterns |
| Benchmark | (this skill) | a numeric baseline so "better" is measured, not felt |
| Long-term memory | (this skill) | durable memory file + optional MCP knowledge graph |
| etc | `code-review`, `diagnosing-bugs`, `debugger-persona`, `implement` | review, root-cause, minimal fix, build |

## Rules

1. **Goal first, never narrowed.** Re-inject the objective every turn; audit completion against real state, never self-declared.
2. **Plan before code.** A plan doc names the approach, the seams, and the success criteria. Self-critique it once before implementing.
3. **Vertical slices.** One test → one implementation → repeat. Don't write all tests then all code.
4. **Measure goodness.** "It works" is not a result; a benchmark number against a baseline is.
5. **Write memory as you go.** Decisions and gotchas land in the durable store the same turn they happen.
6. **Journey in between.** Dump `JOURNEY.md` at checkpoints, not only at the finish.
7. **Loop back on failure.** Return to the plan, not to more code.

## Stage handoff

Each stage hands a written artifact to the next:

- **goal** → objective + status + completion evidence
- **plan doc** → approach + seams + success criteria
- **implement** → code + what changed
- **test** → red-green results + benchmark vs baseline
- **journey** → `JOURNEY.md` (ME/YOU table + risks + lessons)
- **memory** → durable facts / decisions / lessons appended to the store

## Long-term memory (pillar 4)

A fresh session must resume without re-discovering what this one learned.

- **Durable memory file** — one project memory doc (default `<project>/KNOWLEDGE.md`, or a `.memory/` directory). Read it at session start; append decisions (why), facts (numbers with baselines), gotchas (error signature + fix), and next steps as they happen.
- **MCP knowledge graph (optional)** — if memory tools (`memory_create_entities` / `memory_add_observations`) are available, mirror the same facts as entities + observations.

Either way the contract is the same: read first, append as you learn, never let a discovered fact live only in the chat.

## Termination

The loop ends when the goal's completion audit passes against real state — tests green, benchmark meets baseline, memory and journey written. A failing test or unmet goal is not termination; it is a return to step 2.

## When NOT to use

- Trivial one-shot edits — a one-line change does not need the whole loop.
- Pure research or content with no code — use `research` or the writing skills directly.
- A single skill already covers the task — don't compose for the sake of composing.
