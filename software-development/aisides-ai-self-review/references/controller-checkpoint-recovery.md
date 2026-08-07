# AISides controller acceptance and checkpoint recovery

Use this procedure when all five stages have fresh same-cycle `SUCCESS` and oversight records `GO`, but the controller fails before or during checkpointing.

## Decision parsing contract

Oversight may render the authoritative line as plain text, a Markdown heading, bold text, or a bold heading:

- `DECISION: GO`
- `## DECISION: GO`
- `**DECISION: GO**`
- `### **DECISION: GO**`

The parser must:

1. Count decision declarations independently of valid matches.
2. Accept exactly one complete declaration with `GO`, `REWORK`, or `STOP`.
3. Reject missing, unsupported, malformed, duplicated, or conflicting declarations.
4. Regression-test all accepted forms and all fail-closed cases before recovery.
5. Parse the repository oversight artifact associated with the fresh overseer output; scheduler `ok` alone is insufficient.

## Recovering an already accepted cycle

Do not rerun five expensive stages merely because the controller parser rejected valid evidence.

1. Pause only the AISides controller and circuit breaker.
2. Confirm planner, implementer, auditor, verifier, and overseer outputs are fresh, share one cycle ID, and end in `SUCCESS`.
3. Confirm oversight contains exactly one valid `GO` declaration.
4. Restore controller state to `waiting_overseer`, retaining the exact historical `overseer_before` path so the already-produced fresh overseer output is consumed once.
5. Resume and run the controller once.
6. Verify `last_decision=GO`, `checkpoint_cycle`, and either a checkpoint commit or a factual `controller_error` naming the next gate.

## Checkpoint hardening

Before retrying checkpoint creation:

- Run the same full validation contract used by oversight.
- Remove inherited `PYTHONPATH` from the checkpoint test subprocess; set `PYTHONDONTWRITEBYTECODE=1` and use `python3 -B`.
- Stage the intended project checkpoint, exclude `.hermes/`, `doc/`, `docs/AISIDES_STATUS_REPORT.md`, and `docs/status-reports/`.
- Run `git diff --cached --check`. If it reports whitespace defects in intended checkpoint files, make the smallest content-preserving correction, unstage safely on failure, rerun tests, and retry.
- Verify the resulting commit SHA, clean staging area, local branch ahead count, and that no push occurred.

## Final health verification

- Run a direct circuit-breaker probe and require it to remain silent/healthy.
- Clear project-scoped alerts only after that probe.
- Resume controller, circuit breaker, and only the next eligible stage.
- Confirm idle stages remain paused.
- Check `TODO.md`, the latest `docs/status-reports/` report, live controller state, current stage outputs, and Git state together; reports can lag live state.
