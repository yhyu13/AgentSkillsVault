# Kanban capability-block restart

Use this when an AISides Kanban stage has implemented its accepted scope but is `blocked` because command approval denied a validation command.

## Diagnose before restarting

1. Inspect the project board explicitly; do not rely on the process-local active board.
2. Read the blocked card, attempt history, worker log, and board diagnostics.
3. Confirm whether the block is a capability/approval issue rather than a product or test failure.
4. Inspect Git status and preserve the documented dirty/untracked baseline.
5. Inventory same-project cron automation, but do not resume or alter it when the Kanban campaign is the active controller. Never touch unrelated boards or projects.

## Recovery transaction

1. Independently reproduce the claimed prerequisite failure with the exact interpreter, environment sanitation, plugin policy, and narrowest prescribed command. For Python validation, print the interpreter/version, import the named dependency, and run `pytest --collect-only` for one required node before accepting claims that the environment is unusable.
2. Classify mixed blocks explicitly. A false environment diagnosis does not erase genuinely incomplete implementation or evidence work; preserve both facts in the recovery comment.
3. Add a recovery comment that preserves the accepted scope, factual targeted-test evidence, and the precise unfinished acceptance criteria.
4. Tell the worker to continue only the missing implementation/evidence and validation; do not restart accepted work or spend time reinstalling dependencies that the live probe proves available.
5. Replace one large compound validation command with separate bounded commands for focused tests, full tests, Git diff/index/status checks, and the final cache scan. Match the binding plan exactly, including `env -u PYTHONPATH`, `PYTHONDONTWRITEBYTECODE=1`, `python3 -B`, and `PYTEST_DISABLE_PLUGIN_AUTOLOAD=1` where specified.
6. Do not bypass approval controls, retry an explicitly denied command, or pursue a prohibited equivalent.
7. Unblock the existing card; do not create a duplicate repair card for an orchestration/capability block. Continuing the same bounded attempt does not consume or invent an extra repair attempt when its authorized scope remains unfinished.
8. Run one dispatcher pass with the explicit project board and a one-worker cap.
9. Verify the card has a new run ID and is actually `running`. An unblock or spawn response alone is not recovery proof.

## Completion checks

- The implementation report contains factual results for every required command, including limitations.
- The worker emits exactly one `STAGE_SUMMARY` / `CYCLE_ID` / `STAGE_STATUS` triplet.
- Only after semantic success may the dependency engine promote the auditor.
- Preserve the five-role chain and local-checkpoint policy; no push.

This pattern applies only when the prior work is still valid and the block is orchestration/capability-related. A genuine implementation failure should enter the bounded REWORK path instead.