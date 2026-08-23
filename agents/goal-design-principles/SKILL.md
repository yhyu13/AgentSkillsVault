---
name: goal-design-principles
description: Design a goal subsystem as a harness, not a loop patch — walk the thread (需求→接缝→树根→主干→切开), then pin 是什么/不是什么 on 树根, trunk, and four orthogonal branches (phase, activation, authority, round). Use when designing or implementing a long-running goal/objective, splitting it into plugins, choosing event sourcing vs a row store, separating phase from activation, wiring CAS or live permission, or asking how DSH/deepseek-harness packages/goal is structured (树根→主干→分支→树叶, 是什么/不是什么). Pair with goal-persistence for the product contract.
version: 1.1.1
metadata:
  category: agents
  created_by: agent
---

# Goal design principles

A long-running goal is a **harness subsystem**. Distilled from DeepSeek Harness `packages/goal/` (analysis note: `MyDoc/goal-design-principles.md` in that repo).

The product contract — durable objective, idle self-start, anti-drift, evidence-first complete — lives in **goal-persistence**. This skill is how to *build* that contract without patching the agent loop.

**Spine:** 状态可回放，权限必须重授. Durable state and live permission stay separate. State can replay. Permission must be re-granted.

Walk the **thread** first. Then pin **是什么 / 不是什么** on each tree layer. Leaves only implement their branch — they do not invent a fifth.

## When not to use

- A one-shot todo, checklist, or in-turn reminder — not a cross-turn objective.
- The product *what* (status machine, steering prompt, budget) without the *how* — use **goal-persistence**.
- A retry queue, timer poll, or loop counter dressed as persistence.

## Thread

If a step's **不是什么** is what you built, later leaves will split in the same place.

| Step | 是什么 | 不是什么 |
|---|---|---|
| Need | Agent holds one objective across turns until genuinely complete | Patch `agent-loop`, add a counter, or put "please continue" in the prompt |
| Seam | One Goal service owns state; command / tool / driver consume it | A monolith; consumers each keep a copy |
| 树根 | Every mutation appends `goal/change`; current state is a fold | A side table; in-memory steering that dies on restart |
| Trunk | Strict fold + CAS → what version, what phase | Last-write-wins; scattered booleans |
| Cut | `phase` is durable; activation / authority / round are runtime-only | Logging "may auto-continue" so restore/fork resume by themselves |

Cross-cutting (not a fifth branch): capability seam, branded `GoalId`, Config that throws at load.

## Tree — 是什么 / 不是什么 per layer

```
session log                          树根
    └── lifecycle state machine      主干
            ├── phase                durable progress
            ├── activation           process-local "may auto-continue"
            ├── authority            live "who may mutate / stop"
            └── round                when to continue, how to anti-drift
```

Layers in order: **树根 → 主干 → 分支 → 树叶**.

### 树根 · session log

Answers: what is true after replay?

- **是什么:** all durable goal state is appended `goal/change`. Anything that reaches a model request is reconstructible from the log (continuation prompts are `user/message` tagged with a goal source).
- **不是什么:** a SQLite row per session (Codex). Current fields with the log as a side effect. In-memory steering.

### Trunk · replayable lifecycle

Answers: what version, what phase?

- **是什么:** fold the event stream. Strict fold validates transitions and throws; projection fold keeps the latest snapshot because the write path already validated. Mutations carry `{ id, revision }` (`+1`). Phase transitions are checked at fold *and* service. Operations/commands are closed unions; miss one and `assertNever` fires.
- **不是什么:** last-write-wins. A mutex. Boolean flags standing in for phase.

### Branch · phase

Answers: how far along?

- **是什么:** `active` / `paused` / `blocked` / `complete`, written to the log. `block` only from `active`; the first three may `complete`.
- **不是什么:** "may this process auto-continue". `armed` does not live on phase.
- **Leaves:** allowed `transition()` set, `validateSnapshotTransition`, `decodeSnapshot`, `resolveBlockReason`.

### Branch · activation

Answers: may *this process* auto-continue?

- **是什么:** `armed` / `disarmed`, process-local, never logged. `session-start` / restore / fork force `disarmed`. create/resume → armed; pause/complete/block/clear → disarmed; edit unchanged.
- **不是什么:** a field on `goal/change` that replays with state. A restored session with `phase=active` must not start running by itself.
- **Leaves:** `session-start` disarm, `disarm()` / `resume()` remaining-budget check, `goal/changed` → checkpoint → `requestDrive`.

Legal pair: `phase=active` and `activation=disarmed`.

### Branch · authority

Answers: who may mutate or stop?

- **是什么:** live facts at execution — surviving agent, `running`, current initiator, open turn. Mutating the objective needs a host-issued `{ kind: 'user' }` in the current root-agent turn. `complete` / `blocked` also accept the current goal round as a narrow channel: report termination, never rewrite the objective.
- **不是什么:** prompt-only restraint. Persisted root/fork lineage as live permission. Subagent, injected message, or expired turn.
- **Leaves:** `goalToolExecution` / `requireDirectHuman` / `completionAuthority`; `blockedAfterConsecutiveRounds`.

### Branch · round

Answers: when to start the next turn, how to anti-drift?

- **是什么:** drive only when idle **and** `active` **and** `armed` **and** budget remains. Reserve `roundsStarted + 1`, inject the full objective. At most one continuation per idle. Complete against workspace / durable state with evidence. `blocked` needs the same condition for N consecutive rounds plus a concrete reason. Persist/queue/driver failure disarms or blocks. Teardown closes admission, disarms every goal, cancels in-flight turns, awaits quiescence.
- **不是什么:** a retry queue, a timer, a loop counter, a busy-loop. "The model said so" as complete. Optimistic retry on failure.
- **Leaves:** `drive()` reservation, `validReservation` + `agent/pre-step`, `renderGoalRoundPrompt`, wrapup, fail-stop disarm.

Do not invent a fifth branch until it answers a question the four do not.

## Cross-cutting

| Discipline | 是什么 | 不是什么 |
|---|---|---|
| Seam | `dsh-goal` owns `ctx.goals`; tool / command / driver consume it and `Agent`. Loop unchanged. | A goal branch inside the loop |
| Branded id | `GoalId = Branded<'GoalId'>` | Bare `string` at a package boundary |
| Fail loud | Tunables are validated Config (`blockedAfterConsecutiveRounds`, `defaultMaxGoalRounds`) | `DEFAULT_*` or `?? default` inside `run()` |

## Persistence choice

| | Event-sourced fold (DSH) | Row store (Codex) |
|---|---|---|
| Source of truth | session log | SQLite row keyed by thread |
| Replay | fold `goal/change` | re-read the row |
| Resume auto-run | no — activation is process-local | yes — re-arm if status is active |
| Use when | the harness already event-sources the session; model-visible ⟺ logged is law | a dedicated state DB already exists and the session log is not the product log |

The rest of the tree (CAS or equivalent occupancy, phase machine, idle self-start, anti-drift, fail-stop) applies to both. Pick one source of truth — do not keep both.

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

Human or model mutates through the service → `goal/change` lands on the log → fold updates the snapshot → `goal/changed` notifies the driver → if idle/active/armed, one reserved followup with the full objective.

## Canonical files

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
