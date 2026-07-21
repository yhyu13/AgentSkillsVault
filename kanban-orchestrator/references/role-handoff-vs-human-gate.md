# Role handoff vs. genuine human gate

Use this when an implementer, auditor, or verifier blocks after producing its required report because validation is non-green or “review is required.”

## Core rule

A role completes when it has finished its assigned responsibility and recorded factual evidence. Product acceptance is a separate governance decision owned by the downstream auditor, verifier, or overseer.

Examples:

- Implementer changed code, wrote `implementation.md`, and ran required checks. A regression collection failure is evidence to hand downstream only when the implementation-role deliverable is otherwise complete. If binding implementation or test-matrix work is still missing, the card is genuinely incomplete and should be resumed or routed through bounded rework rather than force-completed.
- A block can be mixed: an environment diagnosis may be false while required work is still incomplete. Independently probe the exact environment command, correct the diagnosis, and resume the same card with the unfinished criteria; do not relabel the whole block as either purely operational or purely product failure.
- Auditor finds a critical defect and writes a complete audit. It should complete with `FAIL`, allowing realistic verification and oversight to proceed.
- Verifier reproduces a defect and writes a complete verification report. It should complete with `FAIL`, not wait for someone to approve the finding.

A genuine human gate exists only when the role cannot finish without a decision or input unavailable to downstream roles, such as choosing between incompatible architectures, authorizing destructive action, supplying credentials, or accepting an explicit risk.

## Recovery procedure

1. Inspect the card body, report artifact, comments, runs, logs, and downstream dependency graph.
2. Confirm the role deliverable is substantively complete. Do not infer completion from a comment alone.
3. Preserve every non-green result exactly; never relabel failure as success.
4. Add a completion-only recovery comment:
   - identify the independent downstream reviewers;
   - state that generic review-required blocking is not a human gate;
   - prohibit code/report edits and redundant broad reruns when evidence is already complete;
   - require immediate `kanban_complete` with exact PASS/FAIL/limitation evidence;
   - explicitly prohibit `kanban_block` for the same reason.
5. Unblock and dispatch once, then verify a new run/PID.
6. If the worker repeats the same semantic block, inspect whether profile guidance or the card contract mandates blocking. Fix that durable instruction before another replay. Do not loop unblocks indefinitely.
7. Keep the caretaker active while this is an invalid role-handoff block. Self-pause only for a genuine human decision, bounded-repair exhaustion, governance STOP, or final completion.

## Card-contract prevention

Every implementer/auditor/verifier card in a reviewed campaign should say:

> Complete your role after writing factual evidence, even when checks or verdicts are non-green. Record the limitation or `FAIL` and call `kanban_complete`; downstream governance decides acceptance. Call `kanban_block` only for a genuine missing human decision or unavailable prerequisite that prevents the role deliverable itself.

## Safety boundary

This procedure advances evidence through the dependency graph; it does not bypass quality gates. The overseer must still refuse `GO`, commit, or continuation when audit, verification, or required checks are non-green.