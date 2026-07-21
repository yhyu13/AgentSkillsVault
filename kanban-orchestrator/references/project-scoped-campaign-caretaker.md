# Project-scoped Kanban campaign caretaker

Use this pattern when a durable, dependency-gated Kanban campaign stalls between cards because no long-lived dispatcher is advancing `ready` work.

## Purpose

A recurring caretaker is operational control, not another implementation role. It periodically:

- inspects one named board;
- dispatches one eligible card when none is running;
- verifies the worker genuinely reached `running` with a new run/PID;
- diagnoses stale, crashed, timed-out, or blocked workers before recovery;
- stops itself when the campaign completes, reaches `STOP`, or needs human action.

## Required isolation contract

The prompt must name all of these explicitly:

- exact board slug;
- exact repository/workdir;
- the caretaker's own cron job ID after creation;
- prohibition on inspecting or changing unrelated boards, cron jobs, repositories, or profiles;
- prohibition on source/report edits, staging, direct commits, and pushes.

A global cron or board listing is inventory only, never permission to alter unrelated automation.

## Per-tick decision order

1. Run board `list`, `stats`, and `diagnostics`.
2. **Running-card inventory + capacity check.** List all `running` cards. Check how many are healthy (recent `last_run_at`, live PID). Compare against dispatcher caps: `max_in_progress` (global, default 10) and `max_in_progress_per_profile` (default 2). If there is capacity remaining (running count < cap) AND independent `ready` cards exist, proceed to step 3 to dispatch them — do NOT leave ready cards sitting when capacity allows. If all running cards are healthy AND capacity is full OR no ready cards exist, emit a concise heartbeat and end the tick.
3. **READY DISPATCH (do this before block recovery — a stuck ready card is the most common stall).** If ANY card is `ready` and capacity allows (running count < `max_in_progress` and the card's assignee profile has < `max_in_progress_per_profile` running), dispatch it. When multiple independent `ready` cards exist (no parent links between them) and capacity allows, dispatch up to `max_spawn` (default 5) per tick — do NOT artificially serialize independent cards. After dispatch, re-read each dispatched card with `show <id>` and verify it actually entered `running` with a new run/PID. If it did NOT start (still `ready`, or dispatch returned no claim), check `diagnostics` and retry once. If it still won't start, emit `CARETAKER_STATUS: HUMAN_ACTION_REQUIRED` with the card id and the dispatch failure. Dispatch acceptance alone is never sufficient.
4. Verify the selected card is actually `running` and has a new run/PID. Dispatch acceptance alone is insufficient.
5. If a worker is unhealthy, inspect card state, runs, log, and diagnostics before acting.
6. Recover only diagnosed transient scheduler/provider/transport failures. Preserve acceptance criteria while narrowing redundant reads/tests; unblock or reclaim once, dispatch once, and verify the new run.
7. **Active block resolution — classify before acting.** When a card is `blocked`, read the block reason and comment thread, then classify (see "Block classification" below). Do NOT apply a blanket "do not unblock" rule — that leaves finalization-budget and transport blocks stuck forever. Auto-resolve non-human-gate blocks; surface genuine human gates.
8. Do not bypass genuine decision blocks, missing credentials, destructive choices, governance gates, `STOP`, or exhausted repair limits.
9. Preserve the campaign's dependency chain. Never manually promote an unfinished child and never create duplicate continuation cards. Exception: on overseer REWORK, the caretaker IS authorized to create a bounded repair cycle (see "REWORK auto-continuation" below). On overseer GO, the caretaker surfaces for human authorization of the next milestone — it does not auto-advance product scope.

## Block classification (active resolution)

When a card is `blocked`, classify the block into one of four buckets. The caretaker's default must be to actively resolve A and B, not to passively surface every block.

### A. Finalization-budget / environment-guard block → AUTO-RESOLVE

Signals: block reason mentions `__pycache__`, `*.pyc`, cache cleanup, cache scan, recursive delete, command approval, terminal approval, bulk file removal, bytecode cleanup, or "finalization-budget starvation", "optional ad-hoc probe", "not required validation".

These are NOT product defects. The worker finished required validation but couldn't emit final markers because an optional cleanup/probe command hit a terminal-approval guard. Independently verify the required validation already passed (read the implementation report, check test counts, confirm git index is empty). Add a concise corrective comment: *"CARETAKER RECOVERY (finalization-budget starvation, not a product defect). Independently reproduced evidence: [summary]. The blocked step is NOT required validation per the plan; it is an optional ad-hoc probe. [Why the host can't do it]. Resuming the role."* Then `unblock` ONCE, dispatch, and verify the new run reaches `running` or completes. Do NOT repeatedly replay the same block.

### B. Transport / stale-claim / scheduler / workspace-path block → AUTO-RESOLVE

Signals: `pid not alive`, `spawn failed`, `stale claim`, `timeout`, `provider error`, `connection error`, OR `workspace_path is non-absolute` / `spawn_failed` with a path that has lost its backslashes (e.g. `D:GitRepo-MyAISidesProject` instead of `D:\GitRepo-My\AISidesProject`).

Diagnose via `runs` + `log`. If the workspace path is broken (backslashes eaten by bash), the card will typically be in `archived` status after `failure_limit` consecutive spawn failures — it cannot be unblocked or reclaimed because it's already archived. Archive any orphaned downstream children (they inherit the broken path), then recreate the full chain with forward-slash workspace paths (`dir:D:/GitRepo-My/AISidesProject`). For non-path transport failures, reclaim or unblock ONCE, dispatch ONCE, verify the new run.

### C. Genuine human gate → SURFACE + HOLD (do NOT auto-resolve)

Signals: `review-required` WITHOUT a downstream auditor/verifier/overseer chain, `human`, `STOP`, `credential`, `destructive`, `production gate`, `legal`, `safety`, `ambiguous product decision`, or overseer declared `DECISION: STOP`.

Do NOT unblock. Report the exact card id, block reason, and the decision needed. Emit `CARETAKER_STATUS: HUMAN_ACTION_REQUIRED` and keep monitoring (do NOT self-pause — auto-resume must stay possible once the human acts, unless the block is a terminal overseer STOP).

**EXCEPTION — review-required with a pre-wired downstream chain (common in phased campaigns):** When an implementer blocks with `review-required` but its card already has dependency-linked auditor/verifier/overseer children in `todo`, the block is an incorrect handoff, not a genuine human gate. Per the kanban-worker skill: "If the implementer card already has a dependency-linked reviewer/auditor child, do NOT block with review-required. Completing the implementer role is exactly what promotes the independent reviewer." The caretaker should: (1) independently verify the evidence (run the tests, linter, and git checks the implementer claims passed), (2) add a corrective comment quoting the rule and the verified evidence, (3) unblock ONCE, (4) verify the card reaches `running` or completes. This is the same auto-resolve pattern as bucket A — the block is a worker anti-pattern, not a human decision. This pattern was observed twice in the AgentMOD campaign (cycle-010 and cycle-010 R1) where the modbuilder profile habitually blocked mid-handoff despite having downstream review roles.

### D. Product / spec failure → DO NOT auto-resolve (route to overseer)

Signals: `audit FAIL`, `verifier FAIL`, `test failure`, `spec violation`, or the implementer failed authorized work.

Do NOT unblock. These are genuine failures that the five-role chain handles via `REWORK`. Let the auditor/verifier/overseer consume the evidence and decide. Emit `CARETAKER_STATUS: HUMAN_ACTION_REQUIRED` only if the overseer records `STOP` after bounded repair exhaustion.

## Review-role behavior

An auditor or verifier may legitimately produce a `FAIL` verdict and still complete its role. This allows the overseer to consume the evidence and decide `REWORK`. If such a card is blocked only by a generic review convention after its report is complete, add a precise completion instruction, then safely unblock and dispatch once. Do not reinterpret a product failure as infrastructure failure.

## Git policy

The caretaker never stages, commits, or pushes. If the campaign policy already authorizes an overseer to create a reviewed local checkpoint after a fully successful `GO`, leave that authority with the overseer. Failed or blocked cycles do not commit. Remote push remains separately authorized.

## REWORK auto-continuation (bounded repair-cycle creation)

The biggest stall in a caretaker-driven campaign is the overseer recording `REWORK` and then exiting — the overseer is a one-shot dispatched worker, not a long-lived process, so it cannot create the next card itself. If the caretaker is forbidden from creating continuation cards (the default isolation rule), the campaign dies at every REWORK. This is the single most common failure mode for autonomous campaigns.

When the latest overseer card completes with `DECISION: REWORK`:

1. Read the overseer report (the `.hermes/` oversight file or the card's latest summary) and extract the exact findings.
2. Count prior repair attempts for this milestone (scan the board for cards with "repair N" in the title for the current milestone). Max 2 automated repair attempts per milestone.
3. If under the limit: create a fresh planner card with `parent=<overseer_id>`, the correct assignee profile, the project skill, a unique idempotency key (e.g. `<project>-<milestone>-repairN-planner-<date>`), and a body that quotes the exact REWORK findings and instructs the planner to plan remediation for those findings only. Then create implementer/auditor/verifier/overseer cards with true parent links (planner → implementer → auditor → verifier → overseer). Verify all card IDs, parents, assignees, and statuses. Then dispatch the planner and verify it reaches `running`.
4. If at the limit (2 repairs attempted, still REWORK): do NOT create a third. Emit `CARETAKER_STATUS: HUMAN_ACTION_REQUIRED` with the exact findings and the milestone. Surface for human review — repeated REWORK after 2 bounded attempts means either the increment is too large, the spec is ambiguous, or the worker profile can't handle this class of work.

This is the only card-creation the caretaker is authorized to do: bounded repair cycles scoped to exact overseer findings. It must NOT create the next milestone's planner on `GO` — advancing product scope is a human decision. It must NOT create speculative cards for anything other than overseer REWORK.

The main SKILL.md says "the overseer owns continuation and repair-cycle creation." In a caretaker-driven campaign, this responsibility transfers to the caretaker for bounded repair only. GO-based milestone advancement remains a human gate.

## GO auto-continuation

When the latest overseer card completes with `DECISION: GO`:
- The user profile may authorize autonomous milestone advancement after GO — if so, create the next cycle's planner card automatically (the campaign target is closing the completeness gap, not stopping at every milestone boundary). Read the COMPLETENESS.md tracker to find the next NOT_STARTED or PARTIAL requirement.
- If the user has NOT authorized autonomous GO advancement, emit `CARETAKER_STATUS: HUMAN_ACTION_REQUIRED` with "Milestone N complete (GO). Authorize next milestone (N+1) to continue." Wait for human authorization before creating the next milestone's planner chain.
- The distinction: some users want the campaign to run until COMPLETENESS.md is fully COMPLETE or BLOCKED; others want human gates between milestones. The caretaker prompt must state which policy is in effect.

### Overseer GO with "present for human review" language (CRITICAL — do not stall)

An overseer can return `DECISION: GO` with all blocking findings CLOSED, all tests green, and the full same-cycle chain successful, yet still write `NEXT_ACTION: present the GO checkpoint for human review; do not stage, commit, push, or advance the tracker automatically` in its machine-readable tail. This is the overseer being conservative about commit authority — it is NOT a `STOP` and NOT a genuine human gate.

When the user's standing profile authorizes successful local commits after full five-role chain success, the caretaker must treat this as a GO and proceed to create the next cycle's planner. The distinction:
- `DECISION: STOP` → terminal, pause, human must authorize
- `DECISION: GO` + `NEXT_ACTION: present for human review` → NOT terminal; the user's standing policy governs. If the user authorizes autonomous local commits, create the next cycle.
- `DECISION: REWORK` → create repair cycle, do not commit

The caretaker prompt should explicitly state: "If the overseer returns GO with all blockers closed and the full chain succeeded, treat it as authorized to proceed — the user profile says successful cycles may create reviewed local commits. Do not treat 'present for human review' language in NEXT_ACTION as a STOP."

This pattern was observed in the AgentMOD cycle-011 R3 transition: the overseer returned GO with 1238 tests passing and all 5 blockers closed, but the caretaker stalled because it treated the "human review" language as a gate. The user had to manually create the next cycle's planner.

## PREFLIGHT-STOP handling (CRITICAL — do not confuse with overseer STOP)

A planner preflight can return `PLAN_STATUS: PREFLIGHT-STOP` or `REPRESENTABLE: NO` when the next envelope is not independently representable from the binding specification alone (architecture blockers like unresolved field types, lifecycle semantics, or provenance shapes). This is NOT the same as an overseer `DECISION: STOP` — it is a planner finding that the spec is incomplete, not that the work is blocked by a human decision.

The correct response is to create a R1 contract-clarification planner card that resolves the blockers with an exact, testable contract, then create the full R1 five-role chain (planner → implementer → auditor → verifier → overseer). This is the same pattern as resolving B-001 through B-005 in the AgentMOD cycle-009→010 transition: the planner identified architecture gaps, the user authorized a contract-amendment R1 cycle, the R1 planner wrote the exact contract, and implementation proceeded.

The caretaker must distinguish:
- `DECISION: STOP` (from overseer) → terminal, pause, human must authorize new campaign
- `PLAN_STATUS: PREFLIGHT-STOP` (from planner) → NOT terminal, create R1 contract-clarification cycle automatically

The R1 planner's body must name the exact blockers (e.g., "resolve F-001 through F-007") and instruct it to write a complete contract with all fields, types, enums, validators, lifecycle invariants, and a bounded implementation scope. The R1 plan status must be `READY` (not another PREFLIGHT-STOP) before the implementer runs.

## User-authorized override of bounded-repair exhaustion (STOP)

An overseer can issue `DECISION: STOP` after bounded repair exhaustion (typically R3) with `NEXT_ACTION: pause for human review; do not begin another automatic repair loop`. This is the bounded-exhaustion rule working as designed — the caretaker must NOT invent a third or fourth repair attempt on its own.

However, when the USER explicitly says "continue" or "keep going until the gap is closed," that authorization overrides the pause. The user is the authority that the STOP was waiting for. Per the user profile: "diagnosed local code/evidence/routing failures should automatically generate complete dependency-linked repair chains until accepted, without fixed retry exhaustion or repeated human prompting." A bounded-repair "no R5" or "do not start another repair loop" rule is exactly the kind of fixed retry exhaustion that does not apply when the user says continue. In this case:

1. Read the latest verification report to identify the exact open findings (e.g., B-002, B-003, B-004).
2. Read the failed R-plan to understand what was attempted and why it failed.
3. Create an R(N+1) planner card with parent = the overseer that issued STOP, a unique idempotency key, and a body that names the exact open gaps from the verification report (not a generic "fix everything"). The R(N+1) planner body should note: "the user explicitly authorized continuing past the R(N) STOP — a GO here is valid if the gaps are genuinely closed."
4. Create the full R(N+1) five-role chain (planner → implementer → auditor → verifier → overseer) with proper parent links, idempotency keys, and role-body comments.
5. **CRITICAL — resume the caretaker if it self-paused.** When the overseer issued STOP, the caretaker correctly self-paused per its rules. But now that you've created a new repair chain, the caretaker must be resumed or it won't drive the new chain. Run `cronjob action=resume job_id=<id>` after creating the repair cards. Then trigger a bounded run to verify the caretaker picks up the new planner.
6. **Clear the STOP log.** Write to `docs/CARETAKER_STOP_LOG.md` that the STOP is resolved by user authorization, so the caretaker doesn't re-pause when it sees the old STOP entry on its next tick.
7. **Update the caretaker prompt** to state: "The user has authorized continuing past the R(N) STOP. Treat the R(N+1) chain as the active campaign. Do not re-pause on the old STOP entry."

This is distinct from the caretaker auto-creating repair cycles on REWORK (which is bounded at 2). A user-authorized override is a human decision to lift the exhaustion pause, not an autonomous retry. The caretaker should only do this when the user explicitly says to continue.

Observed across the AgentMOD campaign: the user said "continue until gap closed" at cycle-013 R3 STOP, then again at cycle-019 R4 STOP, then again at cycle-019 R5 STOP. Each time the orchestrator had to manually create the R(N+1) chain, resume the caretaker, and clear the STOP log. This reveals the critical lesson below.

Observed in the AISides M2/M5 campaigns: the same pattern — overseer STOP → user "continue" → manual chain creation → caretaker resume → STOP log clear.

**Key lesson: the three-step resume protocol.** When the orchestrator manually creates repair cards after a STOP, three things must happen in order: (1) create the repair chain cards, (2) resume the caretaker cron, (3) clear the STOP log. Missing step 2 or 3 causes the new chain to sit idle — the caretaker either doesn't run, or runs but immediately re-pauses when it sees the old STOP.

**CRITICAL lesson: "continue until gap closed" is a STANDING authorization, not a one-time override.** When the user says "continue until gap closed" or "keep going until done," that authorization applies to ALL future STOPs in that campaign, not just the next one. The caretaker prompt must be updated ONCE to state: "The user has authorized continuing past ANY STOP in this campaign until the gap is closed. Treat every overseer STOP as auto-resolvable — read the verification report, extract the exact open findings, create the R(N+1) repair chain, and continue. Do not self-pause on STOP. Do not require the user to say 'continue' again." Without this, the user has to manually intervene at every STOP boundary — which is exactly the "repeated human prompting" the user profile says to avoid. This was the root cause of the cycle-019 R4→R5→R6 stall: the caretaker was resumed and the STOP log was cleared after R4, but the prompt still said "pause on STOP," so it self-paused again at R5 STOP, and the user had to say "continue" a third time for R6.

**Board-drained lag pattern.** When the user asks "kanban stopped, are we done, if not continue," the board is typically fully drained (all cards done, no active/ready/blocked). This happens because: (a) the caretaker self-paused on a STOP and didn't create the next chain, or (b) the caretaker's "one card per tick" rule created a lag where the board drained between ticks and no downstream cards exist yet. The orchestrator must: check the latest oversight report for GO/REWORK/STOP, check COMPLETENESS.md for staleness, create the next chain if needed, update the tracker, and resume the caretaker. This is a recurring checkpoint duty, not a one-time fix. When the user says "continue" or "if not continue," that is a standing authorization to create the next milestone or repair cycle — do not ask for clarification, just inspect the board state and act. If the user has already authorized autonomous milestone advancement and unlimited repairs (the common case for long campaigns), the orchestrator should: (1) check the latest overseer decision, (2) if STOP with code defects → create decomposed repair cycle (see below), (3) if all milestones complete → check if M8/end-to-end has been reached, (4) update the completeness tracker, (5) resume the caretaker if paused, (6) report the current percentage and what's remaining.

## Claude Code CLI for implementer cards

When the user asks to "use Claude for coding" or Claude Code CLI is installed on the host (`claude --version` succeeds), the caretaker should include a Claude Code instruction in every implementer card body it creates:

```
IMPORTANT: Use Claude Code CLI for code generation: claude -p '<task>' --allowedTools 'Read,Write,Bash' --max-turns 15. Work from <repo-path>.
```

This delegates the actual code writing to Claude Code's agentic loop while the Kanban worker (e.g., modbuilder) manages the card lifecycle, evidence, and report. The worker calls `claude -p` via its terminal tool, then verifies the output (pytest, ruff, mypy, git diff --check) before calling `kanban_complete`.

The caretaker prompt itself should state: "Instruct workers to use Claude Code CLI (if installed) for code generation: `claude -p '<task>' --allowedTools 'Read,Write,Bash' --max-turns 15`. Include this instruction in every implementer card body."

## mypy --explicit-package-bases for hyphenated directory checkouts

When a Python repository lives in a hyphenated directory (e.g., `sdv-mod-generator/`), bare `mypy specification/models.py` fails with: "sdv-mod-generator contains __init__.py but is not a valid Python package name." This is a checkout limitation, not an implementation defect. The fix:

```bash
python3 -m mypy --explicit-package-bases specification/models.py specification/__init__.py
```

The `--explicit-package-bases` flag tells mypy to treat the cwd as the package root, bypassing the hyphenated-directory rejection. The caretaker and overseer should include this flag in their mypy verification commands and in the card body instructions for auditor/verifier roles. If an implementer blocks because "mypy fails with invalid package name," the fix is to add `--explicit-package-bases` to the command, not to rename the directory or the package. This was observed in the AgentMOD campaign where a modbuilder blocked mid-handoff because it couldn't run mypy — the orchestrator resolved it by providing the correct flag.

## COMPLETENESS.md tracker staleness

The cumulative tracker (e.g., `docs/status-reports/human-mindset/COMPLETENESS.md`) can fall multiple cycles behind because no automated role owns updating it:

- The caretaker creates cards but must NOT edit the tracker (it's a governance artifact).
- The overseer GO authorizes tracker advancement but is a one-shot worker that exits.
- The auditor and verifier are read-only.
- The implementer is scoped to code/tests only.

The result: the tracker still says "cycle 011 PREFLIGHT-STOP" even though Finding (cycle 011 R3 GO), Attestation (cycle 012 R1 GO), and GateDecision (cycle 013 R3 STOP) are all complete. No cron updates it.

This is a structural gap. The orchestrator (the parent session, not a cron) must manually update the tracker when:
- A cycle reaches GO with all blockers closed (advance the evidence row).
- A cycle reaches STOP (record the blocker in the blockers row).
- New envelopes are implemented (add evidence links to A-EXIT-01/A-EXIT-03 rows).
- The user asks for a status check (verify tracker matches actual board state before reporting).

Until a dedicated tracker-update role or cron is added, the orchestrator should check tracker staleness at every user checkpoint and update it as part of the handoff.

## Repair-limit policy in the caretaker prompt (REQUIRED)

The caretaker prompt MUST explicitly state the repair-limit policy in effect. Three policies exist:

1. **Default (2-limit):** Max 2 automated repair attempts per milestone. On the 2nd REWORK, surface HUMAN_ACTION_REQUIRED. On a STOP after exhaustion, self-pause.
2. **User-authorized unlimited (per-campaign):** The user has authorized unlimited repairs — keep creating repair chains on REWORK until GO or STOP. The caretaker prompt must say: "Human has authorized continued repair — no repair limit. Keep creating repair chains on REWORK until GO or STOP."
3. **User-authorized autonomous milestone advancement:** The user has authorized the campaign to auto-create the next milestone on GO (not just surface for human authorization). The prompt must say: "On GO, create the next milestone's planner chain automatically. Milestone order: [list]. On the final milestone GO, pause and emit COMPLETE."

If the prompt does not state the policy, the caretaker defaults to the conservative 2-limit and self-pauses on STOP — which means the user has to manually intervene at every REWORK/STOP boundary. This was the root cause of the AISides M2 and M5 stalls: the caretaker prompt initially said "do NOT unblock review-required/human blocks" (too conservative) and had a blanket 2-limit without stating it. The user had to ask "why blocked" and "I want active resolution" multiple times before the prompt was tightened.

## User expectation: active block resolution (CRITICAL)

When the user says "I want whenever kanban blocked, somehow we actively resolve it," they are expressing a standing preference: the caretaker should NOT passively surface blocks and wait. It should classify and auto-resolve everything except genuine human gates (STOP, credentials, destructive, production, legal/safety). This is a prompt-design requirement, not a one-time instruction:

- The caretaker prompt must contain the full block classification (A/B/C/D above) with explicit auto-resolve instructions for A and B.
- The prompt must NOT have a blanket "do not unblock" rule — that was the initial mistake that caused the user to ask twice.
- The caretaker should be verbose enough in its block-classification logic that it handles finalization-budget starvation, workspace-path bugs, stale claims, and bounded-repair exhaustion as auto-resolve categories, not as human gates.
- The ONLY blocks that warrant HUMAN_ACTION_REQUIRED are: terminal overseer STOP without user override, credentials, destructive/production gates, legal/safety, and ambiguous product decisions.

## Duplicate card creation race (CRITICAL — orchestrator + caretaker conflict)

When the orchestrator (parent session) manually creates a repair chain while the caretaker cron is enabled, and the existing chain still has live downstream cards (auditor/verifier/overseer in `todo` or `running`), the caretaker will correctly archive the manually-created chain as duplicates. This is the caretaker working as designed — it sees two chains for the same repair and treats the newer one as a duplicate.

The orchestrator must check `hermes kanban list` for live `running`/`todo` cards BEFORE creating any new repair chain. The correct action when an implementer blocks mid-chain with `review-required` (finalization-budget exhaustion) is:

1. Unblock and complete the implementer (its role is done if it produced evidence).
2. Let the existing chain continue — the auditor should promote to `ready` and the caretaker will dispatch it.
3. Only create a NEW repair chain if the overseer records REWORK and no live chain exists (all cards `done` or `archived`).

If the orchestrator does create cards while the chain is live, the caretaker will archive them — this is not a bug, it's the caretaker enforcing the dependency chain. The orchestrator should not fight this by recreating the cards; instead, verify the existing chain is advancing and let the caretaker drive it.

Observed in the AISides M5 campaign: the orchestrator unblocked a stalled implementer and immediately created a repair-6 chain, but the repair-5 auditor was already `running`. The caretaker archived all five repair-6 cards on its next tick. The correct behavior would have been to simply unblock the implementer, complete it, and let the caretaker advance the existing repair-5 chain to the auditor.

## Self-stop behavior

After creating the cron job, update its prompt with its actual job ID. On a later tick:

- if the board has no pending/running/blocked work and the latest overseer/final report declares completion, pause the caretaker itself;
- if the overseer declares a terminal `STOP`, report the exact blocker and pause itself — STOP is terminal until the user explicitly authorizes a new increment;
- if a card is `blocked` with a `review-required` / human-decision reason, surface it as `CARETAKER_STATUS: HUMAN_ACTION_REQUIRED` but **do not self-pause** — keep monitoring so the chain auto-resumes once the human unblocks the card. Self-pausing on every human-action block defeats auto-resume: the caretaker would never wake to observe the unblock and dispatch the next stage. Only a terminal STOP or durable completion warrants self-pause;
- do not self-pause merely because a worker is healthy or the board is momentarily between dependency promotions.

## Verification after creation

1. List cron jobs and verify enabled state, schedule, workdir, toolsets, delivery, and project scope.
2. Trigger one bounded run.
3. Confirm a fresh `last_run_at`, successful execution status, and no delivery error.
4. Re-read the target board to confirm the run did not duplicate workers or disturb dependency order.

For CLI-only sessions, use local delivery and state clearly that outputs are retained in cron history rather than proactively delivered to the terminal.

## Resuming a paused or older caretaker job

When you resume a caretaker that was paused or created under an earlier global model config, the first bounded run can be blocked by the scheduler's spend-safety guard with a `RuntimeError` like: *"Skipped to prevent unintended spend: global inference config drifted since this job was created (model 'X' -> 'Y'), and this job is unpinned."* This is a model-pin mismatch, not a broken job.

Fix it by explicitly pinning the job to the current working model before re-running:

```
cronjob action=update job_id=<id> provider=<current_provider> model=<current_model>
cronjob action=run    job_id=<id>
```

Then confirm `execution_success: true` and `last_status: ok`. This is a config step, not a reason to treat the cron tool as broken. Pin any long-lived caretaker on first resume, since global model drift between sessions is the common cause of the guard firing.

## Decomposed repair approach for multi-finding milestones

When a milestone survives 3+ repair cycles with the same findings surviving each time, the root cause is usually NOT that the worker can't fix the defects — it's that the scope is too large for one implementer run. The overseer itself will often recommend "a materially decomposed implementation approach."

The fix: instead of creating repair N+1 with ALL findings in one card body, split into one-finding-per-cycle:

1. Read the overseer's STOP/REWORK report and list the exact findings (e.g., finding 1: 52 row-named test matrices, finding 2: complete pre-mutation preflight, finding 3: decoded media validators, finding 4: Gate 2 mutation matrix).
2. Create repair 8a for finding 1 ONLY — narrow scope touching one file or one function. The idempotency key includes the finding number (e.g., `aisides-m5-repair8-f1-20260720`).
3. The overseer body must say: "on GO, do NOT auto-create M6 — instead create the next decomposed repair cycle for finding N+1." This prevents the caretaker from jumping to the next milestone prematurely.
4. On finding-1 GO, create repair 8b for finding 2. On finding-2 GO, create 8c for finding 3. And so on.
5. Each sub-cycle is small enough for one implementer run to complete with STAGE_STATUS: SUCCESS.

This breaks the repair-exhaustion loop. Observed in the AISides M5 (ffmpeg-video) campaign: repairs 1-7 all tried to fix all 5+ findings in one implementer run, each hitting finalization-budget exhaustion or partial completion (implementer would do real work — 259+ tests passing — but couldn't finish all matrices, so it blocked with FAILURE or review-required). Repair 8 decomposed to finding-1-only and the implementer completed successfully.

The decomposed approach is not "smaller increments" in the roadmap sense (that's the planner's job at milestone start). It is a REPAIR strategy: when a full-scope repair keeps failing because the scope is too large, decompose the remaining findings into separate repair cycles.

## "Restart" or "continue" — first check if the campaign is already live

When the user says "restart kanban and cron job until finish" or similar, the campaign is often ALREADY running. The word "restart" does NOT always mean "create a new planner card." Before creating any cards, run this diagnostic checklist:

1. `cronjob action=list` — are the caretaker and overseer crons `enabled: true` and `state: scheduled` (not paused)?
2. Check ticker heartbeat: `cat ~/AppData/Local/hermes/cron/ticker_heartbeat` — convert the epoch to UTC and compare to `date -u`. If within 2 minutes, the scheduler is alive.
3. `hermes kanban --board <slug> list` — are there any non-`done` cards (`running`, `ready`, `blocked`, `todo`)? If yes, the campaign is advancing.
4. If a card is `running`, verify it has a live run: `hermes kanban --board <slug> runs <id>` — if elapsed is low and the run is `running`, it's genuinely progressing, not stale.
5. Check for self-pause files: `ls docs/status-reports/<campaign>/CARETAKER_SELF_PAUSE.md` — if absent, no environment block is in effect.
6. Check the STOP log tail: `tail -5 docs/status-reports/<campaign>/CARETAKER_STOP_LOG.md` — if the latest entry is a resolved GO or board progression (not a terminal STOP), the campaign is healthy.

If all checks pass: trigger an immediate run of each cron via `cronjob action=run job_id=<id>`, verify `execution_success: true`, re-read the board to confirm advancement, and report status. Do NOT create new planner cards.

If the campaign is genuinely stopped (no non-done cards, caretaker paused, STOP in effect): follow the "User-authorized override of bounded-repair exhaustion" protocol above — create the R(N+1) chain, resume the caretaker, clear the STOP log.

## CLI card creation syntax (CRITICAL — positional title)

The `hermes kanban create` command takes the title as a POSITIONAL argument, not via `--title`. The `--board` flag must come BEFORE the `create` verb.

```bash
# CORRECT — board before verb, title positional
hermes kanban --board <slug> create "A.NNN planner: <scope>" \
  --assignee modplanner \
  --workspace "dir:D:/GitRepo-My/Project" \
  --idempotency-key "<unique-key>" \
  --parent <parent_task_id>   # omit for independent parallel chains

# WRONG — --title is rejected, board after verb is rejected
hermes kanban --board <slug> create --title "..."   # error: unrecognized --title
hermes kanban create --board <slug> "..."            # error: --board after verb
```

For attaching detailed role contracts after creation, use `hermes kanban --board <slug> comment <id> "<body>"` — comments are the durable annotation channel workers read on startup. Passing long multi-paragraph text via `--body` through bash is fragile (quoting, escaping). The `comment` subcommand is more reliable for role contracts.

For batch creation of multiple parallel planner cards, use `execute_code` with `hermes_tools.terminal` to call `hermes kanban create` for each card, capture the returned `t_<id>` via regex, and proceed to attach comments — all in one script.

## Parallel chain management (multiple independent cycles)

When the user says "run parallel kanban" or the orchestrator seeds multiple independent planner cards targeting different COMPLETENESS.md requirement rows simultaneously, the caretaker prompt must be updated from the sequential pattern to the parallel pattern. The key change: "find THE most recent active cycle" becomes "scan ALL active cycles and advance each one."

### How to seed parallel chains

1. Create 2-3 independent planner cards (no parent links between them), each targeting a different requirement row. Use `hermes kanban --board <slug> create "A.NNN planner: <target>" --assignee modplanner --workspace "dir:D:/Path/To/Repo" --idempotency-key "<unique-key>"`.
2. Attach the detailed role contract as a comment via `hermes kanban --board <slug> comment <id> "<body>"` — the comment is the durable annotation channel workers read on startup.
3. The dispatcher auto-promotes each `ready` card and spawns workers concurrently (up to `max_in_progress_per_profile` = 2 per profile). If all planner cards share the same profile (modplanner), only 2 run at once; the third waits.

### Caretaker prompt changes for parallel chains

The default caretaker prompt says "find the most recent active cycle" and creates "one card per tick." For parallel chains, update to:

- "Scan ALL non-done cards across ALL active cycles (not just the latest). Classify each non-done card by its cycle."
- "For EACH active cycle that has a completed role but NO downstream card: create the next role card. You may create multiple cards per tick — one per chain that needs advancement."
- "Chains are independent — do not link them with parent relationships."
- "When a chain reaches GO and its target row is still NOT_STARTED or PARTIAL, create the next increment's planner for the same row. When the target row is COMPLETE, start a new chain for the next NOT_STARTED row."
- "Self-pause only if ALL chains are stalled for 3 consecutive ticks (not just one chain)."

### Observed behavior (AgentMOD campaign, 2026-07-21)

Seeded two parallel planners (A.029 for B-EXIT-03, A.030 for B-EXIT-04) alongside the existing A.028 chain. After updating the caretaker prompt, the board ran 2-3 cards concurrently across different profiles (modbuilder + modauditor, or modplanner + modbuilder). The caretaker correctly created next-role cards for each chain independently on each tick. A.030 planner hit PREFLIGHT-STOP because it correctly identified that A.028's blocking finding needed repair first — this is correct dependency awareness, not a failure.

### Parallel board-drained recovery (CRITICAL — multi-chain variant)

The existing board-drained lag pattern (above) assumes a single chain. With parallel chains, the board drains when ALL chains complete simultaneously between ticks — the user asks "kanban stopped, are we done?" and the board shows zero non-done cards. The orchestrator must:

1. List ALL non-done cards (there will be none).
2. Identify ALL active chains by scanning recent card titles for distinct cycle numbers (A.028, A.029, A.030, etc.).
3. For EACH chain, read the latest oversight decision (GO → next increment planner, REWORK → repair planner, STOP → user-authorized override).
4. Create next cards for ALL drained chains in the same turn — do not advance only one and leave the others idle.
5. Trigger the caretaker via `cronjob action=run job_id=<id>` (the tool API, not `hermes cron run` CLI which can time out at 60s). Verify `execution_success: true`.
6. Re-read the board to confirm multiple cards are now `running` across different profiles.

The key difference from sequential: the orchestrator creates N cards (one per drained chain), not 1. A caretaker tick that creates only one next-card leaves the other chains idle for another full tick cycle (5 minutes), which compounds across a long campaign.

### When NOT to parallelize chains

- When chains touch the same files or shared mutable state (e.g., two contracts modifying the same `tool_contracts.py` file). The caretaker will not detect this — the orchestrator must verify file-level independence before seeding parallel chains.
- When one chain's plan depends on another chain's implementation (e.g., B-EXIT-04 parity metrics depends on B-EXIT-03 contract lifecycle being stable). The planner will correctly return PREFLIGHT-STOP in this case — this is CORRECT cross-chain dependency awareness, not a planning failure. Do NOT auto-create an R1 contract-clarification cycle for this kind of PREFLIGHT-STOP; wait for the blocking chain to reach GO, then the caretaker will re-evaluate.
- When the per-profile cap (2) would be exceeded — all planner cards use modplanner, so only 2 can run concurrently. The third waits in `ready`.

## Suggested status markers

Every caretaker output should name the board, action, active/next card and profile, diagnostics state, and exactly one marker:

- `CARETAKER_STATUS: HEALTHY`
- `CARETAKER_STATUS: RECOVERED`
- `CARETAKER_STATUS: COMPLETE`
- `CARETAKER_STATUS: HUMAN_ACTION_REQUIRED`
