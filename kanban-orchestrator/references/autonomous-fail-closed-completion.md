# Autonomous fail-closed Kanban completion

Use this policy when a user explicitly authorizes an implementation campaign to continue autonomously until a durable target is accepted.

## Core policy

- Preserve the role chain: planner → implementer → independent auditor → realistic verifier → overseer.
- Keep audit and verification semantic gates fail-closed. Never relabel a failed audit as success to keep work moving.
- Do not impose a fixed repair-attempt ceiling unless the user or governing specification requires one. A concrete local implementation, test, evidence, finalization, environment-invocation, or routing defect should produce exactly one fresh narrow repair chain with a unique cycle and idempotency key.
- Carry the exact durable finding into the repair planner. Preserve accepted behavior and unrelated work; do not broaden scope.
- Reserve human intervention for genuine production/publishing actions, credentials or account access, destructive/irreversible operations, legal or safety judgments, or truly ambiguous product decisions.

## Routing repair

A caretaker normally dispatches and recovers existing cards. For an explicitly autonomous campaign, it may also repair missing orchestration when scope is already durable and unambiguous:

1. Inspect the completed planner/overseer artifact and board history.
2. If a known next role chain is missing, create only the smallest planner or remaining role cards needed, with true parent links.
3. Verify returned IDs, assignees, dependencies, and one real running claim.
4. Never use routing authority to invent product scope or override a quality verdict.

A completed implementation handoff awaiting independent review is not a human block. Generated cache cleanup, corrected bounded validation commands, and terminal-marker finalization are operational recovery when narrowly scoped and non-destructive.

## Completion test

Board emptiness is not completion. Stop only when all are true:

- the durable campaign target artifact says the target is complete;
- a fresh same-cycle independent audit is successful;
- realistic verification is successful using produced artifacts;
- oversight records GO;
- no pending, ready, running, or blocked campaign cards remain.

If the board is empty but the target is incomplete and the blocker is concrete/local, create the next narrow repair cycle. If a reserved human gate is reached, stop and report the exact required decision.

“Push Kanban” means advance cards unless Git push is separately and explicitly authorized.