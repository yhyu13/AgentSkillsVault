---
name: aisides-ai-self-review
description: Implement AISidesProject through an autonomous five-stage AI planning, implementation, specification audit, realistic verification, and oversight cycle with fail-closed gates. Use for any scheduled or manual implementation work in AISidesProject.
version: 1.0.0
metadata:
  category: software-development
  created_by: agent
---

# AISides AI Self-Review

Implement `D:/GitRepo-My/AISidesProject` through small, independently reviewed increments.

## Authority and scope

The authoritative product specification is:

`docs/superpowers/specs/2026-07-14-human-mvp-agent-pipeline-design.md`

It supersedes conflicting MVP automation in `README.md` and `docs/AGENT_JOBS.md`.
Do not automate Bilibili login or publishing, use unofficial Bilibili APIs, bypass access controls, or let AI make final copyright/content-safety decisions. AI self-review governs software implementation; the three production release gates remain human-controlled.

Do not push, rewrite history, read secrets, or edit `.env`. Preserve unrelated user changes, including untracked files. Never fabricate provider, publishing, or real-environment evidence. The deterministic AISides controller is authorized to create a local Git checkpoint only after all five same-cycle stages succeed and the overseer records `GO`; it must rerun the full suite, exclude local `.hermes/` and generated status-report artifacts, stage only the reviewed project checkpoint, and never push.

## Five-stage engineering cycle

1. **Planner**
   - Inspect live Git state, specification, implementation, tests, and latest oversight evidence.
   - Select exactly one smallest dependency-ready implementation increment.
   - Prefer this order: foundational schema/state/events/transactions; research-and-assets; mocked ai-render; video-and-package; risk-and-publish assistant; metrics/reporting; end-to-end dry run; live provider bake-off.
   - Write/update `.hermes/aisides-current-plan.md` with scope, exclusions, files, acceptance criteria, validation, and realistic verification.
   - Do not implement.

2. **Implementer**
   - Consume only the fresh accepted plan.
   - Implement the smallest complete increment using TDD where practical.
   - Run targeted and relevant regression checks.
   - Record factual evidence in `.hermes/aisides-implementation-report.md`.
   - Do not commit or push; the controller owns the post-`GO` local checkpoint.

3. **Specification auditor**
   - Independently map every plan criterion and applicable product requirement to source/test evidence.
   - Inspect changed code and tests; run focused checks.
   - Do not edit implementation. Write `.hermes/aisides-spec-audit.md`.
   - Fail on missing coverage, unsafe state transitions, approval bypass, artifact overwrite, weak idempotency, secret leakage, or superseded automation.

4. **Real-project verifier**
   - Exercise a realistic repository workflow, not merely unit tests.
   - Use safe local fixtures and mocked paid/external services unless explicit credentials and authorization exist.
   - Verify produced files, hashes, state transitions, recovery, idempotency, and relevant CLI behavior.
   - Do not edit implementation. Write `.hermes/aisides-real-verification.md`.
   - Mark unavailable external proof honestly; never synthesize results.

5. **Overseer**
   - Consume all fresh stage evidence and independently inspect Git state.
   - Rerun core validation and distinguish implemented, tested, realistically verified, and externally proven.
   - Write `.hermes/aisides-oversight.md` with `DECISION: GO|REWORK|STOP`, findings, and the single next action.
   - `SUCCESS` means the cycle evidence is coherent and the decision is recorded; `GO` allows the next planner cycle, while `REWORK` directs the next planner to the defect. Use `FAILURE` for an inability to perform oversight.

## Continuous completion-driven operation

For AISides implementation sessions, prefer throughput based on completed evidence rather than fixed timetable gaps. A deterministic controller should poll at short intervals and activate exactly one stage at a time:

```text
planner -> implementer -> specification auditor -> real-project verifier -> overseer
   ^                                                                    |
   +-------------------- GO or bounded REWORK ---------------------------+
```

The recommended implementation of this controller is NOT a custom state-machine cron — it is a project-scoped Kanban caretaker cron (see `kanban-orchestrator` skill, `references/project-scoped-campaign-caretaker.md`). The caretaker runs every 5 minutes, dispatches one ready card, verifies it reached running, and on overseer REWORK auto-creates a bounded repair cycle (max 2 attempts, or unlimited if user-authorized). The five-role chain is dependency-linked Kanban cards on a project-specific board (`aisides-mvp-v2-completeness`), with profiles `modplanner`, `modbuilder`, `modauditor`, `modverifier`, `modoverseer` and this skill attached to every card. Model-pin the caretaker cron at creation/resume to avoid the spend-safety guard blocking runs after global config drift. When a milestone survives 3+ repair cycles with the same findings, decompose into one-finding-per-cycle (see `references/project-scoped-campaign-caretaker.md` § "Decomposed repair approach for multi-finding milestones").

Rules:

- Immediately queue the next stage after observing a fresh semantic `SUCCESS`; do not wait for `:15`, `:30`, `:45`, or the next hour.
- After overseer `GO`, immediately begin the next smallest dependency-ready increment.
- Route specification-audit or realistic-verification `FAILURE`, and overseer `REWORK`, back to the planner with the exact review evidence.
- Permit at most two automated repair attempts for one blocking finding, then pause all stages and alert.
- `STOP`, human-only release gates, missing/invalid evidence, or independent cascading failures remain terminal until reviewed.
- Keep idle stage jobs paused so their fallback schedules cannot overlap the controller.
- Give every planner launch a unique root-run cycle ID and propagate it unchanged through all five stages; hourly IDs are not sufficient for multiple cycles per hour.
- Never accelerate by merging independent roles, skipping realistic verification/oversight, overlapping mutations, or weakening the three human production gates.

### Why parallel Kanban dispatch does not apply to the five-stage cycle

When the user asks to "run parallel kanban" or "parallelize the campaign," do NOT immediately create parallel chains. First diagnose whether independent workstreams actually exist. The five-stage cycle (planner→implementer→auditor→verifier→overseer) is inherently sequential by contract: each stage consumes the previous stage's fresh `SUCCESS` evidence as a gate, and the `STAGE_STATUS` markers enforce same-cycle dependency. Parallelizing stages within one cycle breaks the audit/verification contract that makes the completeness tracker trustworthy.

Parallel dispatch is valid ONLY when ALL of the following are true:
- Two or more requirements/milestones are simultaneously `NOT_STARTED` or `PARTIAL`.
- Their file surfaces do NOT overlap (e.g., M3 source-assets touches `pipeline/source_assets.py` while M4 mock-render touches `pipeline/mock_render.py` — these could theoretically parallelize).
- Neither is a dependency of the other (check the design spec roadmap ordering).
- Each gets its own five-card chain with unique cycle IDs and idempotency keys.

Parallel dispatch is NOT valid when:
- Only one finding remains in the current milestone (no second workstream exists).
- The remaining stages are read-only (auditor/verifier/overseer) — they inspect code but don't mutate it, so there is no parallelizable mutation work.
- The remaining NOT_STARTED items overlap on the same files as the active cycle (e.g., CP-005 quarantine touches `pipeline/transaction.py` and `pipeline/events.py`, which M8 finding 3.3 also modifies — parallel implementers would conflict and break the audit contract).
- The user's intent is "finish faster" but the bottleneck is sequential review gates, not dispatch throughput.

Correct response to a parallel request: check `hermes kanban list --status todo` and the completeness tracker for simultaneously actionable requirements with non-overlapping file surfaces. If none exist, state plainly that the cycle is sequential by design, the caretaker is already driving at maximum throughput (every 5m, immediate dispatch on stage completion), and parallelizing would violate the audit contract. Do NOT create speculative parallel chains that will be archived as duplicates by the caretaker.

## Roadmap campaigns and dry-run completion

When the user authorizes a multi-increment campaign through the local end-to-end dry run:

- Treat the ordered roadmap as the campaign boundary: foundation contracts/state/events/transactions; research-and-assets; mocked `ai-render`; FFmpeg video-and-package; risk/manual-publish assistant; metrics/reporting; then the fixture-based dry run.
- Continue selecting one smallest dependency-ready increment per five-stage cycle; broad campaign authorization does not permit one giant implementation cycle or skipping independent review.
- Persist campaign progress and a machine-checkable completion condition outside mutable singleton reports. Do not infer completion merely because a planner selected the dry-run increment.
- Completion requires a fresh same-cycle auditor success, realistic verifier success based on produced local artifacts, and overseer `GO` for the end-to-end dry-run increment.
- The dry run must use freely usable local fixtures and mocked external/paid providers, produce and inspect the expected task card, events, versioned artifacts, video/package, risk checklist, sample metrics/votes, and report, and exercise recovery/idempotency and approval invalidation.
- Never log in to Bilibili, publish, use unofficial Bilibili APIs, access credentials, or portray a mocked provider as external proof.
- Once the verified campaign target is reached, stop the campaign rather than automatically planning live-provider bake-off or later production scope. Pause role jobs/controller according to the campaign controller contract and issue a durable completion report.
- If bounded rework exhausts or a human production gate is reached, stop and alert honestly; “run until finished” does not authorize bypassing fail-closed gates.

## Machine-readable stage contract

Every stage response must end with exactly:

```text
STAGE_SUMMARY: <short factual result>
CYCLE_ID: <ID supplied by the pre-run script>
STAGE_STATUS: SUCCESS|FAILURE|BLOCKED
```

A downstream stage proceeds only when its deterministic pre-run script prints `GATE_OPEN` for a fresh upstream `SUCCESS` in the same cycle. On `GATE_CLOSED`, perform no repository inspection, tests, or mutations and return `BLOCKED` with the supplied cycle ID.

Scheduler `ok` is not semantic success. Missing, stale, wrong-cycle, failed, or blocked markers close the gate. Parse markers only from the final `## Response` block. For every stage—especially implementer runs with long validation—terminal marker emission outranks optional ad-hoc checks or extra narration: once required repository evidence and validation are complete, stop using tools and return the three markers exactly once. A report file is not a substitute for the final response contract.

## Failure and circuit-breaker rules

- `SUCCESS`: role objective and required validation completed.
- `FAILURE`: authorized work was attempted but failed.
- `BLOCKED`: dependency gate was closed or a required human-only action is pending; no substantive work was attempted.
- A deterministic watchdog pauses all five stages when at least two stages are bad in one cycle and at least one is a genuine failure/scheduler error.
- Blocked-only propagation does not trip the breaker.
- Persist alerts locally even if message delivery fails.

## Controller-contract defects

When all five stage outputs are fresh same-cycle `SUCCESS` and oversight records `GO`, but the controller enters `exhausted`, diagnose the controller contract before treating the product increment as failed. This is an orchestration defect and must not consume a bounded implementation-rework attempt.

- Align decision parsing with the writer's Markdown grammar. Accept exactly one complete plain, heading, bold, or bold-heading declaration (for example `DECISION: GO`, `## DECISION: GO`, or `**DECISION: GO**`), while rejecting missing, malformed, duplicate, conflicting, embedded, or unsupported decisions. Count declarations independently from valid matches so a valid marker plus a malformed duplicate fails closed.
- Regression-test all supported Markdown forms of `GO`, `REWORK`, and `STOP`, plus missing, malformed, unsupported, and duplicate declarations.
- When fresh same-cycle evidence is already complete, recover at `waiting_overseer` and consume the accepted overseer output rather than rerunning the five stages solely because parsing failed.
- Harden checkpoint validation by removing inherited `PYTHONPATH`, using `PYTHONDONTWRITEBYTECODE=1 python3 -B`, excluding local evidence/status-report paths, and requiring `git diff --cached --check` before committing.
- See `references/controller-checkpoint-recovery.md` for the parser regression matrix, accepted-cycle replay procedure, checkpoint hardening, and final health checks.
- During recovery, pause only the AISides controller and watchdog; do not alter unrelated project jobs.
- Persist `waiting_planner` and the exact latest planner output as `planner_before` before queueing the fresh planner. A queued run is not completion evidence.
- Verify recovery from a newly saved planner output containing a unique cycle and final `SUCCESS`, then verify the controller advances to `waiting_implementer` with only the implementer role enabled.
- If a manually queued job appears unchanged, inspect scheduler evidence for `already running` before queueing again; wait for that run's saved output rather than creating duplicate requests.
- When recovering from `exhausted`, update the state to `waiting_planner` with the exact current planner output path as `planner_before` before invoking the controller. Do not leave the state at `idle`: the controller treats `idle` as non-advancing and will not consume a manually launched planner result. Verify the controller then hands off to `waiting_implementer` and enables only the implementer.
- Treat a successful `cron run` response as queue/execution acceptance only, not as saved stage evidence. Re-read the latest output file and controller state after the scheduler tick before claiming recovery.
- On this Windows project host, use the verified Python 3.13 launcher `python3 -B` for every test, import probe, and validation command; never use the ambiguous `python` alias when it may resolve to Python 2.7. Before declaring oversight blocked for environment reasons, print `python3 --version`, require Python 3.13, and verify required imports. If the next gate's evidence is stale, do not retry the downstream role against old evidence: restart from the earliest stale/expired stage, obtain a fresh same-cycle success marker, then run each dependent stage in order.

## Recovery after bounded review failure

When AISides reaches the bounded retry limit:

- Repair only the newest exact audit/verifier finding; do not advance roadmap scope.
- For evidence parsers, count marker declarations independently from validating well-formed values. A valid marker plus a malformed duplicate must fail before any archive/destination mutation.
- Prove parser repairs with RED/GREEN regression coverage and an external temporary-fixture reproduction.
- Pause the AISides controller and breaker while resetting state and clearing stale alerts. Clear alerts only after the direct breaker probe is silent and healthy.
- Trigger a fresh planner cycle and verify its saved final markers; scheduler acceptance alone is insufficient.
- After handoff, keep only the controller, breaker, and currently eligible AISides role enabled.
- Run all Python probes with bytecode suppression and perform the cache scan last; diagnostic imports can recreate `__pycache__` after an earlier clean scan.
- If an implementer repeatedly finishes required tests/reporting but omits terminal markers, treat this as **finalization-budget starvation**, not a product failure. Harden the job prompt so required validation and report writing are followed by an immediate no-more-tools boundary; explicitly prohibit optional temporary scripts, ad-hoc verification, cleanup probes, cache probes, and extra narration after the report. Recover through a fresh planner cycle when upstream evidence has exceeded its freshness window; do not replay a stale implementer gate or trust the report as a marker substitute.
- Before resetting an exhausted pipeline, independently rerun the full suite, check the index, run the watchdog directly, and require exit 0 with empty stdout. Only then clear the project-scoped alert, record the exact latest planner output as `planner_before`, persist `waiting_planner`, resume controller/watchdog/root role, and verify a newly saved planner `SUCCESS` advances to `waiting_implementer`.
- For AISides progress questions, always reconcile four sources: `TODO.md`, the newest file under `docs/status-reports/`, live controller/cron state, and current `.hermes` stage evidence. Report both literal checkbox completion and evidence-adjusted completion when they differ; identify stale status-report fields explicitly rather than silently treating the snapshot as live truth.
- When restarting the AISides Kanban campaign, inspect the explicit project board, blocked card, run history, worker log, diagnostics, Git baseline, and same-project automation before acting. For an orchestration-only command-approval block after valid implementation, add narrow recovery guidance, split missing validation into separate bounded commands, unblock the existing card, dispatch exactly one worker, and verify a new run is actually `running`. Do not duplicate the card, bypass approvals, retry an explicitly denied command, resume the legacy cron pipeline, or touch unrelated projects. See `references/kanban-capability-block-restart.md`.
- Human-directed repair after a final `STOP` is a new authorized campaign, not an automatic retry. Require an explicit user authorization plus a binding design/spec path; create a fresh planner card with a unique cycle and idempotency key, exact scope, exclusions, and preserved baseline. Resume the project caretaker only after the planner is actually running, and keep checkpointing disabled until fresh same-cycle audit and realistic-verification `SUCCESS` plus overseer `GO`. If the design forbids tracker/board/checkpoint changes, treat that as the design-review boundary; a later explicit user authorization may create the new Kanban planner, but never infer authorization to commit or push.
- **Distinguish a code-defect STOP from a capability-boundary STOP.** A STOP is terminal either way, but the recovery path differs. A code-defect STOP (audit found a local defect, repair attempts exhausted) requires a new repair campaign against the same increment. A capability-boundary STOP (audit found NO local defect; the blocker is a genuine host/environment limit, e.g. native Windows `ReadFile` mutates `FileBasicInfo.LastAccessTime` so no non-mutating observation facility exists) is handled by: (1) recording the exact boundary fact in the completeness ledger (`BLOCKED (accepted capability boundary)` with the host reason and what evidence is deferred), (2) closing the current milestone accepting the boundary, and (3) advancing to the next dependency-ready milestone that does NOT depend on the blocked capability — after explicit user authorization. The next milestone's planner card must state that the blocked milestone's certification is deferred and must not be treated as a dependency. This is not "retrying the STOP"; it is accepting a documented environment limit and continuing where the environment does not block. The caretaker cron surfaces the STOP as HUMAN_ACTION_REQUIRED; the user's authorization to advance is the gate.
- A verifier that correctly returns `BLOCKED` because its audit parent failed is valid role evidence, not a recoverable infrastructure failure. Do not repeatedly redispatch it against the same terminal failed parent. Complete the verifier role with metadata preserving `stage_status=BLOCKED` and the upstream finding, then dispatch the dependent overseer so it can record `REWORK` or `STOP`. Never convert the semantic verdict to `SUCCESS` or `GO` merely to make the board empty.
- A project-scoped caretaker may dispatch one ready card, observe one running worker, and recover only transport/stale-claim/capability failures. It must fail closed on audit/spec failures, bounded repair exhaustion, human-review STOP, and missing final-completion evidence. It may self-pause only after durable final completion; it must not create speculative repair attempt 3 or resume after STOP without explicit human authorization.
- **User-authorized override of bounded-repair exhaustion.** When the 2-repair limit is exhausted and the overseer blocks with `review-required` / "human disposition required," the block is NOT a genuine human gate — it is the bounded-exhaustion rule waiting for the user's decision. When the user explicitly says "continue," "keep going," "actively resolve," or otherwise authorizes further repair, that authorization lifts the 2-limit. The caretaker (or orchestrator) should: (1) unblock and complete the overseer card (its role was done — it produced the REWORK evidence), (2) read the oversight report for the exact remaining findings, (3) create a fresh repair chain (repair 3+) with parent=overseer_id, forward-slash workspace paths, a unique idempotency key, and a body quoting the exact findings, (4) **resume the self-paused caretaker cron** — when the overseer issued STOP, the caretaker correctly self-paused per its rules; after creating the new repair chain you MUST `cronjob action=resume` the caretaker or it won't drive the new chain. This self-pause-then-resume step was missed initially in the M2 campaign, causing the new repair chain to sit idle until the caretaker was manually resumed. The same pattern repeated at M5. The repair-limit override is a human decision to lift the pause, not an autonomous retry. This was observed in the M2 approvals campaign: repair 2 exhausted on the Gate 2 non-selected-candidate-byte defect, the user said "actively resolve it," and repair 3 closed the gap to GO. See `references/project-scoped-campaign-caretaker.md` § "User-authorized override of bounded-repair exhaustion" in the kanban-orchestrator skill for the full pattern.
- **Forward-slash workspace paths on Windows bash.** When creating Kanban cards from bash (git-bash/MSYS), backslash paths like `D:\GitRepo-My\AISidesProject` get eaten into `D:GitRepo-MyAISidesProject` (non-absolute), causing `spawn_failed` and auto-archive after 2 failures. ALWAYS use forward slashes: `--workspace "dir:D:/GitRepo-My/AISidesProject"`. If a card is already stuck with a broken path (status will be `archived`), recreate the full chain with forward-slash paths.
- **Duplicate card creation race — do not manually create repair cards while the chain is still live.** When the orchestrator manually creates a repair chain while the caretaker cron is enabled and the existing chain still has live downstream cards (auditor/verifier/overseer in `todo` or `running`), the caretaker will correctly archive the manually-created chain as duplicates. This happened in the M5 campaign: the implementer blocked with `review-required` (finalization-budget exhaustion), the orchestrator unblocked and completed it, then manually created a repair-6 chain — but the repair-5 auditor was already `running`, so the caretaker archived all five repair-6 cards. The correct action when an implementer blocks mid-chain is: (1) unblock and complete the implementer (its role is done if it produced evidence), (2) let the existing chain continue (auditor → verifier → overseer), (3) only create a NEW repair chain if the overseer records REWORK and no live chain exists. Check `hermes kanban list` for live `running`/`todo` cards before creating any new chain.
- **Decomposed repair approach for multi-finding milestones (M5 lesson).** When a milestone survives 3+ repair cycles with the same findings surviving each time, the root cause is usually NOT that the worker can't fix the defects — it's that the scope is too large for one implementer run. The overseer itself will recommend "a materially decomposed implementation approach." The fix: instead of creating repair N+1 with ALL findings in one card body, split into one-finding-per-cycle. Create repair 8a for finding 1 only (e.g., "decompose 52 row-named semantic child matrices"), with a narrow scope touching only one file. On GO, the overseer creates repair 8b for finding 2 (e.g., "complete pre-mutation preflight"), then 8c for finding 3, etc. Each sub-cycle is small enough for one implementer run to complete with STAGE_STATUS: SUCCESS. This breaks the repair-exhaustion loop that kept M5 stuck through 7 full-scope repair cycles. The idempotency key should include the finding number (e.g., `aisides-m5-repair8-f1-20260720`). The overseer body must say "on GO, do NOT auto-create M6 — instead create the next decomposed repair cycle for finding N+1" so the caretaker doesn't jump to the next milestone prematurely. This pattern was observed in the AISides M5 (ffmpeg-video) campaign: repairs 1-7 all tried to fix all 5+ findings in one implementer run, each hitting finalization-budget exhaustion or partial completion. Repair 8 decomposed to finding-1-only (52 row-named test matrices) and the implementer completed successfully.
- See `references/implementer-finalization-budget-and-progress-reconciliation.md` for the failure signature, prompt pattern, safe restart transaction, and progress-reporting checklist.
- **Board-drained after REWORK — orchestrator must create the next chain.** When the caretaker cron does NOT auto-create the repair chain after an overseer REWORK (board drained: all cards `done`, no `running`/`ready`/`blocked`/`todo`), the orchestrator (parent session) must manually create the next five-role chain. This happens when the caretaker prompt lacks REWORK auto-continuation language or when the "one card per tick" rule causes the board to drain between ticks. Steps: (1) read the overseer's REWORK findings from `.hermes/aisides-oversight.md`, (2) create the full five-role repair chain using the `templates/create-five-role-chain.py` template from the `kanban-orchestrator` skill (set BOARD, WORKSPACE, PARENT_OVERSEER, CYCLE_ID, FINDING_TEXT, and ROLES), (3) trigger `hermes cron run <caretaker_id>` to dispatch the planner — note this command may time out at 60s but the trigger succeeds; wait 10-15s then check board state, (4) verify the planner reached `running`. This was the pattern at M8 repair 5→6: overseer REWORK with 3 blocking findings → board drained → orchestrator created repair-6 chain via script → caretaker dispatched it.

## Review standards

- Gather context before edits; trace symbols and usages.
- Match repository conventions and touch only planned scope.
- Tests must prove behavior, including negative paths and approval boundaries.
- Use real command output for all validation claims.
- A green test suite does not prove real-project utility.
- Keep `.hermes/` reports as local runtime evidence; do not add them to Git unless explicitly requested.

## Completeness tracker maintenance

The cumulative requirement-level tracker at `docs/completeness/mvp-v2/COMPLETENESS.md` is the governance artifact for campaign progress. No automated role owns updating it — the caretaker creates cards but must NOT edit the tracker, and the overseer is a one-shot worker that exits after its decision. The orchestrator (parent session) must update the tracker when:

- A cycle reaches `GO` with all blockers closed → advance the evidence row for that requirement to `COMPLETE` with the cycle ID, test counts, and fresh audit/verifier SUCCESS evidence.
- A cycle reaches `REWORK` → mark the requirement `PARTIAL (REWORK)` with the exact findings and which repair is in progress.
- A cycle reaches `STOP` after bounded repair exhaustion → record the blocker in the requirement row and the campaign judgment section.
- A capability boundary is accepted → mark the requirement `BLOCKED (accepted capability boundary)` with the exact host reason and what evidence is deferred, then record that the milestone is closed accepting the boundary.
- The user asks for a status check → verify the tracker matches actual board state before reporting; reconcile stale rows against live evidence.

States: `NOT_STARTED`, `PARTIAL`, `PARTIAL (REWORK)`, `COMPLETE`, `BLOCKED`, `BLOCKED (accepted capability boundary)`. `COMPLETE` requires accepted implementation plus fresh independent audit and realistic verification evidence at the requirement level — a green unit suite or a completed Kanban role alone is insufficient.
