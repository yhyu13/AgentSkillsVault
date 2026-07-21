# Phased Implementation Campaign Reference

Use this support file when turning a large architecture or product specification into a self-continuing Kanban implementation campaign.

## Board and role setup

- Create a dedicated board and bind it to the repository/project.
- Discover profiles first; create or request profiles rather than inventing assignees.
- Recommended separation: planner, implementer, specification auditor, realistic verifier, overseer.
- Commit the reviewed specification as a clean local checkpoint before implementation. Never push unless explicitly authorized.

## Per-cycle graph

```text
planner -> implementer -> specification auditor -> realistic verifier -> overseer
```

Each cycle implements exactly one smallest dependency-ready increment.

### Parallel cycle variants

The serial chain `planner → implementer → auditor → verifier → overseer` is the safe default. These parallel variants are valid when the independence condition is met — the orchestrator should use them instead of serializing when there is no true data dependency.

**Parallel auditor + verifier (both depend on implementer, neither depends on the other):**

```text
planner -> implementer -> +-> auditor ----+
                        |                +-> overseer
                        +-> verifier ----+
```

Create auditor and verifier both with `parents=[implementer_id]`, no link between them. Create overseer with `parents=[auditor_id, verifier_id]`. The dispatcher fans out both in the same tick.

**Parallel implementer lanes (independent findings/sub-components):**

```text
planner -> +-> implementer_1 -> auditor_1 -> verifier_1 -> +
          |                                               +-> overseer
          +-> implementer_2 -> auditor_2 -> verifier_2 -> +
```

Each implementer lane is an independent five-role chain. The overseer waits on all lanes. Valid when findings touch different files with no shared mutable state.

**Parallel cycles across milestones (independent modules):**

```text
planner_A (module X) -> implementer_A -> auditor_A -> verifier_A -> overseer_A
planner_B (module Y) -> implementer_B -> auditor_B -> verifier_B -> overseer_B
```

Two independent five-role chains, no parent links between them. Valid only when the planner proves module X and module Y have no data dependency (no shared interfaces, types, or migration ordering).

**Do NOT parallelize when:** findings touch the same files, one fix changes a contract another depends on, milestones share API/type/migration ordering, or independence is uncertain. When in doubt, serialize — the serial chain is never wrong, just slower.

### Planner contract

- Inspect current Git state, specification, implementation, tests, and cumulative tracker.
- Select one increment and write scope, exclusions, files, acceptance criteria, verification, rollback, and requirement mappings.
- Do not implement.

### Implementer contract

- Consume only the fresh parent plan.
- Trace definitions/usages and implement minimal scope with tests.
- Record changed files and exact command results.
- Do not commit.

### Auditor contract

- Remain read-only.
- Map every plan and applicable specification criterion to source/test evidence.
- Record `PASS|FAIL` with severity, path/line, and remediation.
- Complete the audit role even on FAIL so downstream evidence gathering can continue.

### Verifier contract

- Remain read-only.
- Exercise realistic repository workflows and positive, negative, idempotency, compatibility, and regression paths applicable to the increment.
- Distinguish local/mocked/simulated evidence from external proof.
- Record exact commands and `PASS|FAIL`.

### Overseer contract

- Consume fresh same-cycle reports and independently inspect Git state.
- Update cumulative requirement-level completeness.
- Decide `GO|REWORK|STOP`.
- `GO`: require audit PASS, verifier PASS, green checks, coherent evidence, and no unrelated changes; create an authorized local checkpoint and next cycle.
- `REWORK`: no commit; create a new narrowly scoped repair cycle.
- `STOP`: no commit or new cycle; preserve evidence and request human action.

## Durable reporting

Keep a cumulative tracker and per-cycle reports in a repository-approved location:

```text
COMPLETENESS.md
phase-<x>-cycle-<nnn>-plan.md
phase-<x>-cycle-<nnn>-implementation.md
phase-<x>-cycle-<nnn>-audit.md
phase-<x>-cycle-<nnn>-verification.md
phase-<x>-cycle-<nnn>-oversight.md
FINAL-COMPLETION.md
```

The tracker should enumerate every phase exit criterion and final acceptance criterion with:

- `NOT_STARTED | PARTIAL | COMPLETE | BLOCKED`
- evidence links
- last validated cycle
- remaining gap

Board task completion is role completion, not product completeness.

## Recursive continuation safety

When the overseer creates the next cycle:

1. Capture each successful task ID.
2. Add dependencies at creation time.
3. Use unique cycle IDs and idempotency keys.
4. Assign only known profiles.
5. Keep workspace, board, project, report path, commit policy, and specification authority explicit in every card.
6. Pass created IDs through `created_cards`; phantom or prose-only cards are not continuation.
7. Stop spawning after final completion criteria are evidenced.

## Verification checklist

- [ ] Explicit target board used on every operation.
- [ ] First planner is actually running, not merely ready.
- [ ] Clean specification checkpoint exists before code work.
- [ ] One small increment per cycle.
- [ ] Auditor and verifier cannot edit implementation.
- [ ] FAIL verdicts reach overseer without being mistaken for advancement approval.
- [ ] Completeness tracker covers all phase exits and final criteria.
- [ ] GO/REWORK/STOP controls commit and continuation.
- [ ] Repair attempts for the same finding are bounded.
- [ ] Local commits are reviewed checkpoints; no push without authorization.
- [ ] Final completion report exists and no further card was spawned.
- [ ] User receives a non-empty handoff with board, IDs, current status, reports, and tracking commands.
