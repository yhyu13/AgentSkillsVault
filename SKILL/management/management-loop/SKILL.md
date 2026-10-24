---
name: management-loop
description: The management work orchestrator — classify the request (report / advice / methodology knowledge / methodology application) → route to the right sub-skill cluster → apply the manage-up anti-fluff discipline → verify → durable memory. Use when a management, workplace-reporting, leadership-advice, or 求是-methodology task needs the right tool among the management skills, or when the user asks which management skill fits.
version: 1.1.0
metadata:
  category: management
  created_by: agent
---

# Management Loop — classify → route → apply → verify → memory

One router + orchestrator over the vault's management skills. It does not replace
any of them — it picks the right cluster for the request and chains the handoffs
between them. The `management/` category has four distinct clusters; this skill
is the entry point that keeps them from being mixed up.

```
management request → classify cluster → route → apply (anti-fluff discipline) → verify → memory
  1. report   (manage-up family)
  2. advice   (persona advisors)
  3. knowledge (methodology knowledge bases)
  4. methodology (qiushi 求是 method)
  └──────────────← gate unmet ←──────────────┘
```

## When to Use

- A management / workplace / leadership request arrives and it is not obvious which of the 28 management skills applies.
- The user asks "which management skill fits", "怎么汇报", "用哪套方法论", or asks for a report AND advice AND methodology in one task.
- A task spans two clusters (e.g. write a weekly report in Amazon style, backed by a thinker's framework) and needs explicit routing + handoff.

## The four clusters

| Cluster | Skills | When it applies |
|---|---|---|
| **report** (ManageUp) | `manage-up-core`, `weekly-report`, `project-update`, `proposal`, `performance-review`, `meeting-summary`, `quarterly-review`, `upward-email`, `one-on-one-prep`, `style-report` | producing a workplace document/report for a boss or stakeholder |
| **advice** (persona advisors) | `god-leader-advisor`, `bezos-advisor`, `renzhengfei-advisor`, `zhangyiming-advisor` | "as a leader, what would X do / advise" — strategy, leadership, organization |
| **knowledge** (methodology KB) | `mgmt-discipline`, `mgmt-individual`, `mgmt-org` | learn/apply/compare a management discipline, thinker, or company's method |
| **methodology** (qiushi 求是) | `workflows` + `arming-thought`, `contradiction-analysis`, `investigation-first`, `mass-line`, `overall-planning`, `practice-cognition`, `protracted-strategy`, `spark-prairie-fire`, `concentrate-forces`, `criticism-self-criticism` | applying the Mao 求是 methodology as a thinking/working discipline |

## The loop

1. **Classify the request.** Is the deliverable a *document* (report), *advice* (persona), *knowledge* (KB lookup), or *method* (qiushi)? State the cluster and why. A request that doesn't fit one cluster is usually two — split it, don't blur it.
2. **Route.** Pick the specific skill(s) within the cluster.
   - report → the concrete report type (weekly / project / proposal / …), always anchored by `manage-up-core` anti-fluff rules.
   - advice → the persona whose worldview fits (neutral/scissor = `god-leader-advisor`; long-term/Amazon = `bezos-advisor`; gray/huawei = `renzhengfei-advisor`; growth/byteDance = `zhangyiming-advisor`).
   - knowledge → discipline (cross-company) / individual (thinker) / org (company), per the request's grain.
   - methodology → start with `workflows` to pick the right 求是 skill sequence; single-method requests go straight to that skill.
3. **Apply.** Run the selected skill's rules. For any written output, apply the `manage-up-core` anti-fluff baseline (BLUF, data-anchored, So-What, action-oriented, calibrated language) — even advice and methodology notes benefit from it.
4. **Verify.** Audit against the source of truth (real data, real principles, real original text — not self-declared).
5. **Write memory.** Durable decisions, facts, and lessons land in the store the same turn they happen.

**Loop back:** a gate unmet returns to step 2 (route), not to rewriting blindly.

## Rules

1. **Classify before you write.** "Which cluster" is the first answer, always. Mixing report and advice, or knowledge and methodology, produces mush.
2. **Anti-fluff everywhere.** `manage-up-core`'s five principles (BLUF / data anchor / So-What / action-oriented / calibrated language) apply to any management output, whatever the cluster.
3. **Persona ≠ knowledge base.** A persona advisor simulates a leader's *judgment*; a KB documents a *methodology*. Don't answer "how does Huawei do X" with the advisor's persona — route to `mgmt-org`.
4. **One grain per lookup.** `mgmt-discipline` (cross-company) / `mgmt-individual` (thinker) / `mgmt-org` (company) are three different grains; pick one, don't dump all three.
5. **Write memory as you go.** Decisions and gotchas land in the durable store the same turn they happen.

## Per-round gate (answer at the end of EVERY round)

A round does not close until all four questions are answered explicitly. Do not
advance to the next step — or repeat — on an unanswered gate.

1. **Success / fail criteria?** State the acceptance bar for THIS round: what must be true for the round to count as success vs failure. No criteria = drift, not a round.
2. **What should touch / not touch?** State the scope boundary: which files / areas / behaviors this round may modify, and which are off-limits.
3. **Report criteria?** State what the end-of-round report must contain — use the fixed report format below, nothing else as the round summary.
4. **Self-review rounds + next step?** State how many critic rounds you will run before accepting, and whether the next step auto-starts and repeats.

## Round report (fixed format)

At the end of every round, emit exactly this block — nothing else as the round's summary:

```
success criteria: <restate this round's original criteria verbatim>
criteria status: <one line per criterion: met / not met / partial, with evidence>
success confidence: <0-10>
failure confidence: <0-10>
touch: <files/areas modified>
not touch: <files/areas deliberately left alone>
next: <single next action>
self review status: <critic rounds run, blocking issues remaining>
next step status: <auto-start | wait-for-user | done>
```

The two confidence scores (0–10) are the agent's own estimate of how likely the
round succeeded and how likely it failed — they are NOT a verdict. The human
decides success/failure from the criteria status, not from the scores.

## Termination

The loop ends when the request's completion audit passes against the real source — report is data-anchored and fluff-free, advice is persona-consistent, knowledge is correctly grained, methodology is applied — and the final round report shows all criteria `met` with `next step status: done`. The agent never declares the loop a success itself; the human does, from the criteria status.

## When NOT to use

- A single skill obviously covers the request — don't route for the sake of routing.
- Non-management domains (code, content writing, math) — use their own skills.
- A task already inside one cluster with a clear single answer.
