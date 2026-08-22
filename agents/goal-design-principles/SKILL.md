---
name: goal-design-principles
description: Design a goal subsystem as a harness, not a loop patch — plugins on a capability seam, event-sourced state, CAS, persistent phase orthogonal to process-local activation, runtime authority, idle self-start, anti-drift re-injection. Use when designing or implementing a long-running goal/objective feature, splitting it into plugins, choosing event sourcing vs a row store, separating phase from activation, wiring CAS or live permission, or asking how DSH/deepseek-harness packages/goal is structured (根/主干/分支/树叶, 事件溯源, 能力接缝). Pair with goal-persistence for the product contract.
version: 1.0.0
metadata:
  category: agents
  created_by: agent
---

# Goal design principles

A long-running goal is a **harness subsystem**: plugins on a capability seam, state folded from the session log, live permission re-granted every process. Distilled from DeepSeek Harness `packages/goal/` (canonical source: `D:\GitRepo-AI\deepseek-harness\MyDoc\goal-design-principles.md`).

The product contract — durable objective, idle self-start, anti-drift, evidence-first complete — lives in **goal-persistence**. This skill is the architecture of how to *build* that contract without patching the agent loop.

**Spine:** durable state and live permission stay separate. State can replay. Permission must be re-granted.

## When not to use

- A one-shot todo, checklist, or in-turn reminder — not a cross-turn objective.
- The product *what* (status machine, steering prompt, budget) without the *how* — use **goal-persistence**.
- A retry queue, timer poll, or loop counter dressed as persistence.

## Root / trunk / branches / leaves

```
session log  (root: only durable truth)
    └── lifecycle state machine  (trunk: what version, what phase)
            ├── phase        persistent progress
            ├── activation   process-local "may auto-continue"
            ├── authority    live "who may mutate / stop"
            └── round        when to start the next turn, how to anti-drift
```

| Layer | Answers | Persistence |
|---|---|---|
| **Root** | What is true after replay? | `goal/change` events on the session log |
| **Trunk** | What version, what phase? | Fold + CAS commit (`revision + 1`) |
| **phase** | How far along? | Durable |
| **activation** | May this process auto-continue? | Process-local; never logged |
| **authority** | Who may mutate or stop? | Runtime; never logged |
| **round** | When to continue, how to steer? | Runtime |

Leaves are the terminal implementations on each branch — transition tables, `session-start` disarm, execution-time grant checks, idle driver + steering prompt. Do not invent a fifth branch until it answers a question the four do not.

## Composition

**Plugins, not loop changes.** Own state in a Goal service (`ctx.goals`). Model tool, human command, and round driver are consumers of that service and of `Agent`. The agent loop gains no goal branch.

**Capability seam.** A complete seam is Service Definition / Provider / Consumer. Scheduling, commands, and tools do not own state.

**Closed unions + `assertNever`.** `GoalPhase`, operations, and commands are closed; illegal transitions fail at fold *and* at the service. No boolean flags standing in for phase.

**Branded ids.** `GoalId = Branded<'GoalId'>` — never a bare `string` at a package boundary.

**Explicit config, fail loud.** Tunables (`blockedAfterConsecutiveRounds`, `defaultMaxGoalRounds`) are validated Config fields. Illegal values throw at load. A `DEFAULT_*` constant or `?? default` inside `run()` is not configurability.

## Persistence

**Log is the only truth.** Every mutation appends `goal/change`. Current state is a fold. Strict fold validates transitions and throws; projection fold keeps the latest snapshot because the write path already validated.

Not a SQLite row per session with the log as a side effect. Codex goal-persistence uses the row; DSH uses the fold. Pick one source of truth — do not keep both.

**Model-visible ⟺ logged.** Anything that reaches a model request is reconstructible from the session log. Goal state is `goal/change`. Continuation prompts are `user/message` events tagged with a goal source. In-memory steering that dies on restart is not a goal.

**CAS.** Every mutation carries `{ id, revision }`. Revision is monotonic `+1`. Stale refs throw. The model `get`s, then copies the exact id/revision — no last-write-wins, no mutex.

## Permission (orthogonal to persistence)

**Phase ≠ activation.**

| | phase | activation |
|---|---|---|
| Values | `active` / `paused` / `blocked` / `complete` | `armed` / `disarmed` |
| Stored | yes | never |
| On `session-start` | replayed | forced `disarmed` |

Do not log "may auto-continue". Restore and fork must not resume execution by themselves.

**Runtime authority, host-issued.** Check live facts at execution: surviving agent, `running`, current initiator, open turn. Mutating the objective requires a host-issued `{ kind: 'user' }` message in the current root-agent turn. `complete` / `blocked` also accept the current goal round as a narrow channel — report termination, never rewrite the objective.

Prompt-only restraint is not authority. Persisted root/fork lineage is not live permission.

## Loop

**Idle self-start, one continuation per idle.** Drive only when idle **and** `active` **and** `armed` **and** budget remains. Reserve the next round (`roundsStarted + 1`) and enqueue one followup. Not a retry queue, not a timer, not a loop counter.

**Anti-drift + evidence-first.** Every continuation re-injects the full objective. Complete against workspace / durable state with evidence — never on the model's say-so. `blocked` requires the same condition for N consecutive rounds plus a concrete reason.

**Fail-stop + graceful release.** Persist, queue, or driver failure disarms / blocks — no optimistic retry. Teardown closes admission, disarms every goal, cancels in-flight turns, awaits quiescence.

## Design checklist

Before writing code, every item is a yes or a rewrite:

1. State lives in one Goal service; loop, tools, and commands consume it.
2. Mutations are events; current state is a fold (or an explicit row store — not both).
3. Every model-visible input has a session event.
4. Writes are CAS on `{ id, revision }`.
5. `phase` is durable; `activation` is process-local and disarmed on session start.
6. Mutate/stop checks live execution facts, not prompts and not lineage.
7. Idle + active + armed + remaining budget ⇒ at most one continuation.
8. Continuation re-injects the full objective; complete/blocked are audited.
9. Failure disarms; teardown reaches quiescence.
10. Tunables are Config; illegal values throw at load.

## Four-plugin layout (DSH worked example)

```
dsh-goal                 Service  — ctx.goals, fold, CAS, phase, activation
dsh-tool-goal            Consumer — model get/create/update + authority
dsh-command-goal         Consumer — human /goal
dsh-goal-round-driver    Consumer — idle drive + anti-drift prompt
```

Data flow: human or model mutates through the service → `goal/change` lands on the log → fold updates the snapshot → `goal/changed` notifies the driver → if idle/active/armed, one reserved followup with the full objective.

## Persistence choice

| | Event-sourced fold (DSH) | Row store (Codex) |
|---|---|---|
| Source of truth | session log | SQLite row keyed by thread |
| Replay | fold `goal/change` | re-read the row |
| Resume auto-run | no — activation is process-local | yes — re-arm if status is active |
| Use when | the harness already event-sources the session; model-visible ⟺ logged is law | a dedicated state DB already exists and the session log is not the product log |

The rest of the checklist (CAS or equivalent occupancy, phase/status machine, idle self-start, anti-drift, fail-stop) applies to both.

## Canonical files

Load-bearing DSH paths (full index in the source doc):

| Concern | File |
|---|---|
| Event + message attribution | `packages/goal/goal/src/domain.ts` |
| Strict fold | `packages/goal/goal/src/fold.ts` |
| Service, CAS, projection | `packages/goal/goal/src/index.ts` |
| Types (`GoalId` / `GoalRef` / phase / activation) | `packages/goal/goal/src/types.ts` |
| Runtime authority | `packages/goal/tool-goal/src/authority.ts` |
| Model tools | `packages/goal/tool-goal/src/index.ts` |
| Idle driver | `packages/goal/goal-round-driver/src/index.ts` |
| Anti-drift prompt | `packages/goal/goal-round-driver/src/prompt.ts` |
| Human command | `packages/goal/command-goal/src/index.ts` |
