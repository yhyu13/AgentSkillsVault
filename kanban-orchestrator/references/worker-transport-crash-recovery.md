# Kanban Worker Transport-Crash Recovery

Use this when a card is auto-blocked after repeated worker-process exits and the dispatcher only reports `pid ... not alive`.

## Diagnose before retrying

1. Inspect the card, attempt history, worker log, and board diagnostics.
2. Treat `pid ... not alive` as a scheduler symptom, not the root cause.
3. Find the last actionable exception in the worker log and distinguish:
   - implementation/test failure;
   - profile/configuration failure;
   - model-provider or HTTP transport failure;
   - context-growth/finalization-budget failure.
4. Check whether the worker wrote partial source or report files before it exited. Preserve and attribute them; do not blindly replay over them.

## Recovery pattern for context-sensitive transport failures

When the log shows a provider/HTTP decoding or streaming failure after the worker accumulated a large context:

1. Apply the smallest reversible profile mitigation supported by the current Hermes version. For a failure isolated to streamed response decoding, disabling response streaming for that worker profile is a reasonable retry mitigation; do not present it as a universal provider rule.
2. Add a durable recovery comment that records:
   - the actual log exception;
   - that no product failure was established;
   - the files already written, if any;
   - a narrow input set for the retry;
   - protected baseline paths;
   - the unchanged acceptance criteria.
3. Tell the retry to avoid broad repository/history scans, rereading large specifications, and optional probes. Direct it to the parent handoff and only the source/tests needed for the increment.
4. Require the worker to write its report and emit terminal completion markers immediately after mandatory validation.
5. Unblock the existing card, run one explicit dispatcher pass, and verify all three:
   - a new run ID exists;
   - the task is `running` with a live worker PID/heartbeat;
   - active diagnostics are clear.

## Do not

- Reassign or weaken acceptance criteria before identifying the root cause.
- Count transport crashes as bounded product-rework attempts.
- Claim recovery merely because `unblock` succeeded.
- Encode one endpoint's transient behavior as a permanent statement that streaming or the provider is broken.
- Resume competing same-project automation during recovery.

## Evidence to report

Return the board, task ID, prior failure class, mitigation, new run ID/PID, heartbeat or running evidence, diagnostics status, and unchanged downstream dependency chain.
