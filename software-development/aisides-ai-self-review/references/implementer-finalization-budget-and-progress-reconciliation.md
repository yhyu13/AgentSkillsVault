# Implementer finalization budget and progress reconciliation

## Failure signature

Use this diagnosis when all of the following hold:

- The implementer report records completed scoped work and passing required tests.
- Scheduler `last_status` is `ok`.
- The final `## Response` block lacks one or more of `STAGE_SUMMARY`, `CYCLE_ID`, or `STAGE_STATUS`.
- The response ends in optional verification narration, commonly a temporary-script or ad-hoc check.

This is an output-contract/finalization-budget defect. Do not weaken the controller by accepting the report as semantic stage success, and do not classify green product code as failed implementation.

## Durable prompt pattern

The implementer prompt should state that after required tests and `.hermes/aisides-implementation-report.md` are complete:

1. No additional tools may be called.
2. Temporary scripts and ad-hoc verification are prohibited.
3. Optional cleanup, cache probes, and extra narration are prohibited.
4. The response must immediately end with exactly one marker triplet using the pre-run cycle ID.
5. Missing markers mean stage failure even if tests passed.

This no-more-tools boundary is stronger than merely saying “end with markers”; without a budget boundary, the agent can spend its final turn on optional work and never emit them.

## Safe exhausted-pipeline restart

1. Limit scope to this project's controller, breaker, and role IDs.
2. Pause controller and breaker before editing state.
3. Independently validate the dirty worktree: full suite, staged index, diff whitespace, and final cache scan as applicable.
4. Run the breaker script directly. Require exit 0 and empty stdout.
5. Clear the project alert only after that healthy probe.
6. Read the exact newest planner output path and persist it as `planner_before`.
7. Persist `phase=waiting_planner` before launching anything; reset retry count only when the incident is orchestration-only rather than product rework.
8. Resume controller, breaker, and planner only; trigger planner once.
9. Verify a new saved planner output has a fresh cycle and final `SUCCESS` markers.
10. Verify controller advances to `waiting_implementer`, planner pauses, and only implementer becomes eligible.
11. Do not retry implementer against stale planner evidence. A correct `BLOCKED` result proves the gate works but does not recover the pipeline.

## Progress reconciliation checklist

Never answer AISides TODO progress from checkboxes alone. Read:

1. `TODO.md` for literal total/done/open counts.
2. The newest `docs/status-reports/*.md` snapshot.
3. Live controller state and cron job metadata/output.
4. Current `.hermes` planner, implementation, audit, verification, and oversight evidence.
5. Git checkpoints for fully accepted cycles.

Report separately:

- Literal checkbox completion.
- Evidence-adjusted completion.
- Immediate-recovery completion.
- Whole roadmap items that have completed all five stages and checkpointing.
- Current in-flight stage and whether the newest status report is stale.

Do not promote an in-flight increment to a completed roadmap item until same-cycle audit and realistic verification succeed, overseer records `GO`, and checkpoint policy completes.
