---
name: kanban-orchestrator
description: Decomposition playbook + anti-temptation rules for an orchestrator profile routing work through Kanban. The "don't do the work yourself" rule and the basic lifecycle are auto-injected into every kanban worker's system prompt; this skill is the deeper playbook when you're specifically playing the orchestrator role.
version: 3.0.0
platforms: [linux, macos, windows]
environments: [kanban]
metadata:
  hermes:
    tags: [kanban, multi-agent, orchestration, routing]
    related_skills: [kanban-worker]
---

# Kanban Orchestrator — Decomposition Playbook

> The **core worker lifecycle** (including the `kanban_create` fan-out pattern and the "decompose, don't execute" rule) is auto-injected into every kanban process via the `KANBAN_GUIDANCE` system-prompt block. This skill is the deeper playbook when you're an orchestrator profile whose whole job is routing.

## Profiles are user-configured — not a fixed roster

Hermes setups vary widely. Some users run a single profile that does everything; some run a small fleet (`docker-worker`, `cron-worker`); some run a curated specialist team they've named themselves. There is **no default specialist roster** — the orchestrator skill does not know what profiles exist on this machine.

Before fanning out, you must ground the decomposition in the profiles that actually exist. The dispatcher silently fails to spawn unknown assignee names — it doesn't autocorrect, doesn't suggest, doesn't fall back. So a card assigned to `researcher` on a setup that only has `docker-worker` just sits in `ready` forever.

**Step 0: discover available profiles before planning.**

Use one of these:

- `hermes profile list` — prints the table of profiles configured on this machine. Run it through your terminal tool if you have one; otherwise ask the user.
- `kanban_list(assignee="<some-name>")` — sanity-check a single name. Returns an empty list (rather than an error) for an unknown assignee, so this only confirms a name you're already considering.
- **Just ask the user.** "What profiles do you have set up?" is a fine first turn when the goal needs more than one specialist.

Cache the result in your working memory for the rest of the conversation. Re-asking every turn wastes a tool call.

## When to use the board (vs. just doing the work)

Create Kanban tasks when any of these are true:

1. **Multiple specialists are needed.** Research + analysis + writing is three profiles.
2. **The work should survive a crash or restart.** Long-running, recurring, or important.
3. **The user might want to interject.** Human-in-the-loop at any step.
4. **Multiple subtasks can run in parallel.** Fan-out for speed.
5. **Review / iteration is expected.** A reviewer profile loops on drafter output.
6. **The audit trail matters.** Board rows persist in SQLite forever.

If *none* of those apply — it's a small one-shot reasoning task — use `delegate_task` instead or answer the user directly.

For mechanical coding tasks where speed matters more than the audit
trail, consider skipping the 5-role pipeline entirely and using a
coding CLI (Claude Code `claude -p` or Codex CLI) directly. See
`references/kanban-vs-coding-cli.md` for the full trade-off analysis
and when each approach wins.

## The anti-temptation rules

Your job description says "route, don't execute." The rules that enforce that:

- **Do not execute the work yourself.** Your restricted toolset usually doesn't even include terminal/file/code/web for implementation. If you find yourself "just fixing this quickly" — stop and create a task for the right specialist.
- **For any concrete task, create a Kanban task and assign it.** Every single time.
- **Split multi-lane requests before creating cards.** A user prompt can contain several independent workstreams. Extract those lanes first, then create one card per lane instead of bundling unrelated work into a single implementer card.
- **Run independent lanes in parallel.** If two cards do not need each other's output, leave them unlinked so the dispatcher can fan them out. Link only true data dependencies.
- **Never create dependent work as independent ready cards.** If a card must wait for another card, pass `parents=[...]` in the original `kanban_create` call. Do not create it first and link it later, and do not rely on prose like "wait for T1" inside the body.
- **If no specialist fits the available profiles, ask the user which profile to create or which existing profile to use.** Do not invent profile names; the dispatcher will silently drop unknown assignees.
- **Decompose, route, and summarize — that's the whole job.**

## Decomposition playbook

### Step 1 — Understand the goal

Ask clarifying questions if the goal is ambiguous. Cheap to ask; expensive to spawn the wrong fleet.

### Step 2 — Sketch the task graph

Before creating anything, draft the graph out loud (in your response to the user). Treat every concrete workstream as a candidate card:

1. Extract the lanes from the request.
2. Map each lane to one of the profiles you discovered in Step 0. If a lane doesn't fit any existing profile, ask the user which to use or create.
3. Decide whether each lane is independent or gated by another lane.
4. Create independent lanes as parallel cards with no parent links.
5. Create synthesis/review/integration cards with parent links to the lanes they depend on. A child created with unfinished parents starts in `todo`; the dispatcher promotes it to `ready` only after every parent is done.

Examples of prompts that should fan out (using placeholder profile names — substitute whatever exists on the user's setup):

- "Build an app" → one card to a design-oriented profile for product/UI direction, one or two cards to engineering profiles for implementation, plus a later integration/review card if the user has a reviewer profile.
- "Fix blockers and check model variants" → one implementation card for the blocker fixes plus one discovery/research card for config/source verification. A final reviewer card can depend on both.
- "Research docs and implement" → a docs-research card can run in parallel with a codebase-discovery card; implementation waits only if it truly needs those findings.
- "Analyze this screenshot and find the related code" → one card to a vision-capable profile for the visual analysis while another searches the codebase.

Words like "also," "finally," or "and" do not automatically imply a dependency. They often mean "make sure this is covered before reporting back." Only link tasks when one card cannot start until another card's output exists.

Show the graph to the user before creating cards. Let them correct it — including which actual profile name should own each lane.

### Step 3 — Create tasks and link

Use the profile names from Step 0. The example below uses placeholders `<profile-A>`, `<profile-B>`, `<profile-C>` — replace them with what the user actually has.

```python
t1 = kanban_create(
    title="research: Postgres cost vs current",
    assignee="<profile-A>",  # whichever profile handles research on this setup
    body="Compare estimated infrastructure costs, migration costs, and ongoing ops costs over a 3-year window. Sources: AWS/GCP pricing, team time estimates, current Postgres bills from peers.",
    tenant=os.environ.get("HERMES_TENANT"),
)["task_id"]

t2 = kanban_create(
    title="research: Postgres performance vs current",
    assignee="<profile-A>",  # same profile, run in parallel
    body="Compare query latency, throughput, and scaling characteristics at our expected data volume (~500GB, 10k QPS peak). Sources: benchmark papers, public case studies, pgbench results if easy.",
)["task_id"]

t3 = kanban_create(
    title="synthesize migration recommendation",
    assignee="<profile-B>",  # whichever profile does synthesis/analysis
    body="Read the findings from T1 (cost) and T2 (performance). Produce a 1-page recommendation with explicit trade-offs and a go/no-go call.",
    parents=[t1, t2],
)["task_id"]

t4 = kanban_create(
    title="draft decision memo",
    assignee="<profile-C>",  # whichever profile drafts user-facing prose
    body="Turn the analyst's recommendation into a 2-page memo for the CTO. Match the tone of previous decision memos in the team's knowledge base.",
    parents=[t3],
)["task_id"]
```

`parents=[...]` gates promotion — children stay in `todo` until every parent reaches `done`, then auto-promote to `ready`. No manual coordination needed; the dispatcher and dependency engine handle it.

If the task graph has dependencies, create the parent cards first, capture their returned ids, and include those ids in the child card's `parents` list during the child `kanban_create` call. Avoid creating all cards in parallel and linking them afterward; that creates a window where the dispatcher can claim a child before its inputs exist.

### Step 4 — Complete your own task

If you were spawned as a task yourself (e.g. a planner profile was assigned `T0: "investigate Postgres migration"`), mark it done with a summary of what you created:

```python
kanban_complete(
    summary="decomposed into T1-T4: 2 research lanes in parallel, 1 synthesis on their outputs, 1 prose draft on the recommendation",
    metadata={
        "task_graph": {
            "T1": {"assignee": "<profile-A>", "parents": []},
            "T2": {"assignee": "<profile-A>", "parents": []},
            "T3": {"assignee": "<profile-B>", "parents": ["T1", "T2"]},
            "T4": {"assignee": "<profile-C>", "parents": ["T3"]},
        },
    },
)
```

### Step 5 — Report back to the user

Tell them what you created in plain prose, naming the actual profiles you used:

> I've queued 4 tasks:
> - **T1** (`<profile-A>`): cost comparison
> - **T2** (`<profile-A>`): performance comparison, in parallel with T1
> - **T3** (`<profile-B>`): synthesizes T1 + T2 into a recommendation
> - **T4** (`<profile-C>`): turns T3 into a CTO memo
>
> The dispatcher will pick up T1 and T2 now. T3 starts when both finish. You'll get a gateway ping when T4 completes. Use the dashboard or `hermes kanban tail <id>` to follow along.

## Continuous phased implementation campaigns

For a large specification that must be implemented incrementally, reviewed, tested, reported, and continued until complete, use a **small-cycle campaign**, not one giant goal-mode card.

1. Create a project-specific board so unrelated work cannot collide.
2. Before dispatch, inventory existing automation that targets the same repository (cron controllers, watchdogs, status writers, other boards, and active workers). Pause or retire only same-project processes that could mutate the repository or write competing campaign state. A global inventory is discovery, not permission to alter unrelated projects. Record exactly what was paused and why.
3. Preserve the repository's pre-existing modified and untracked files as an explicit baseline. Reports, status writers, and an older pipeline may have live outputs even when source code is clean; cards must identify these paths so workers do not stage, overwrite, or mistake them for their own evidence.
4. Use distinct configured profiles for planning, implementation, specification audit, realistic verification, and oversight when independent authorship matters.
5. Checkpoint the reviewed specification before implementation starts. Never mix an uncommitted design rewrite into the first code increment.
6. Make each cycle a dependency chain: `planner → implementer → auditor → verifier → overseer`.
7. Scope each cycle to exactly one smallest dependency-ready increment. The planner writes acceptance criteria; the implementer changes code; auditor and verifier remain read-only; the overseer decides `GO | REWORK | STOP`.
8. Persist a cumulative requirement-level completeness tracker plus per-cycle plan, implementation, audit, verification, and oversight reports. A board status of `done` is not completeness evidence by itself.
9. On `GO`, the overseer may create a reviewed local checkpoint only when explicitly authorized, then creates the next cycle. On `REWORK`, it creates a new narrowly scoped repair cycle and does not commit. Bound repeated repair of the same finding and stop for human review after exhaustion.
10. Stop only when every phase exit criterion and final acceptance criterion has fresh audit and realistic-verification evidence. Write a final completion report and do not spawn another cycle.

## Parallelism within phased campaigns (when valid)

The default per-cycle graph is a serial chain: `planner → implementer → auditor → verifier → overseer`. That is the **safe default** — but it is not the only valid topology. Parallelism is valid whenever two cards have **no data dependency** between them. The orchestrator should actively look for parallelization opportunities during Step 2 (sketch the task graph) and use them instead of defaulting to a linear chain.

### Parallel auditor + verifier (most common win)

The auditor (spec-compliance check) and verifier (runtime-behavior check) both depend on the implementer's output, but **neither depends on the other**. The auditor reads code against the spec; the verifier runs tests against the build. These are independent concerns.

```
planner → implementer → ┌→ auditor ──┐
                         └→ verifier ─┘→ overseer
```

Create both with `parents=[implementer_id]` and no link between them. The overseer is created with `parents=[auditor_id, verifier_id]` so it waits for both. The dispatcher can fan out both in the same tick (up to `max_spawn: 5`). This cuts ~1 tick (30s) per cycle — meaningful across a 50-cycle campaign.

**When NOT to parallelize auditor+verifier:** when the verifier needs to know which spec criteria the auditor flagged as ambiguous before it can write meaningful test paths. Rare — usually the verifier tests against the plan's acceptance criteria, not the auditor's findings.

### Parallel implementer lanes (independent findings)

When a milestone has multiple **independent** findings or sub-components (e.g., "fix SQL injection in /search" AND "add CSRF to /settings" — different files, no shared state), create them as parallel implementer cards with no parent links between them. Each gets its own auditor/verifier/overseer chain, or they share a single overseer with `parents=[impl_1, impl_2, ...]`.

This is the **decomposed repair** pattern (see `references/project-scoped-campaign-caretaker.md` § Decomposed repair approach) formalized as a first-class parallelism strategy, not just a repair tactic.

**When NOT to parallelize implementer lanes:** when findings touch the same files, share mutable state, or one finding's fix changes the contract another finding depends on. If you're not sure, serialize.

### Parallel cycles across milestones

When the planner identifies that milestone N+1 has **no data dependency** on milestone N (e.g., milestone N touches `auth/` and milestone N+1 touches `payments/` — different modules, no shared interfaces), the two cycles can run concurrently. Create both planner cards as independent (no parent link). Each spawns its own five-role chain. The overseer of each chain makes independent GO/REWORK/STOP decisions.

**When NOT to parallelize across milestones:** when milestone N+1's plan depends on milestone N's implementation (API contracts, shared types, migration ordering). This is the common case — most milestones are genuinely sequential. Only parallelize when the planner can prove independence.

### Dispatcher capacity awareness

The dispatcher caps concurrency via `max_in_progress` (global, default 10), `max_in_progress_per_profile` (per-profile, default 2), and `max_spawn` (per-tick, default 5). When planning parallel lanes:
- Assign parallel cards to **different profiles** to avoid the per-profile cap (2 per profile by default).
- If parallel cards must share a profile, bump `max_in_progress_per_profile` via `hermes config set kanban.max_in_progress_per_profile <N>`.
- The caretaker's "dispatch at most one card per tick" is a per-tick rate limit, not a concurrency prohibition — but it does mean parallel ready cards get dispatched across consecutive ticks (30s each), not in one tick. For urgent fan-out, dispatch manually via `hermes kanban dispatch`.

**Diagnostic command.** When the user asks "why is only 1 card running" or "why can't kanban run parallel," the answer is almost always the graph shape (parent links), not the dispatcher caps. Diagnose in this order:
1. `hermes config get kanban` — prints all caps at once (`max_in_progress`, `max_in_progress_per_profile`, `max_spawn`, `dispatch_interval_seconds`, `failure_limit`). Confirm the caps allow concurrency before blaming them.
2. `hermes kanban --board <slug> list` — inspect card statuses. If every card is `running` + `done` + `todo` with nothing in `ready`, the graph is serial by design (parent links gate promotion). No cap change will help.
3. Count `running` cards. If count == 1 and independent `ready` cards exist, the issue is the caretaker's old "dispatch one per tick" rule — the patched caretaker (above) now dispatches up to `max_spawn` when capacity allows.

**Topology diagrams.** See `references/phased-implementation-campaign.md` § Parallel cycle variants for ASCII diagrams of the three valid parallel topologies (parallel auditor+verifier, parallel implementer lanes, parallel milestone cycles).

Important operational details:

- Pass `--board <slug>` (or the board argument in the tool API) on every board operation. Do not rely solely on `boards create --switch` or other process-local active-board state across separate CLI invocations; verify the target board explicitly before creating cards.
- Create true dependencies in the original card creation call. A failed auditor may still complete its **audit role** with a FAIL verdict so verifier and overseer can gather full evidence; the overseer, not raw task status, decides whether work advances.
- Recursive continuation instructions must require successful `kanban_create` return IDs, explicit parent links, unique cycle/idempotency keys, and `created_cards` verification. Never let an overseer merely claim that it spawned the next cycle.
- After tool calls, always return a user-facing summary naming the board, task graph/IDs, current running card, commit policy, report locations, and tracking commands. An empty response after successful orchestration is a failed handoff.
- A completed planner card is not a running campaign. After planner `SUCCESS`, inspect its durable plan and create the next implementer card with `parents=[planner_id]`; create audit, verifier, and overseer cards with true parent links when their contracts are known. When the user explicitly asks to generate the jobs, bootstrap the complete currently-known five-role chain rather than creating only a root planner and hoping it fans out. If downstream contracts genuinely depend on planner findings, inspect the completed plan immediately and create the rest before declaring automation healthy. Do not assume a periodic caretaker invents missing cards: caretakers dispatch and recover existing cards but must not speculate implementation scope. Verify every returned card ID, dependency, assignee, and status, then re-list before dispatching.
- When the user explicitly says to start/continue/restart a campaign, FIRST inspect the board and cron state before creating any cards. The word "restart" does NOT always mean "create a new planner." If the campaign is already live (crons enabled, ticker heartbeat fresh, cards in `running`/`ready` status), "restart" means VERIFY and ENSURE — confirm crons are enabled, trigger an immediate run of each cron via `cronjob action=run`, verify the board advanced, and report status. Do NOT create a fresh planner card when the chain is already advancing — that creates a duplicate. Only create a fresh uniquely keyed planner/root card when the campaign is genuinely stopped (all cards `done`, no `running`/`ready`/`blocked` cards, caretaker self-paused or STOP in effect). In that stopped case: inspect the latest STOP/blocker evidence, create a fresh uniquely keyed planner/root card for the newly authorized increment, do not try to resume a stale STOP card, resume the project-scoped caretaker only after the fresh root card exists, dispatch at most one card, and verify the card has a real running claim/PID.
- A completed implementer must complete its role even when independent audit/verifier review remains. `review-required` is a handoff state, not a human gate, when the card's report and validation evidence are complete. Reserve `kanban_block` for genuine human, credential, destructive, or unavailable-decision gates. Send known full-suite or quality limitations downstream to the auditor/verifier instead of blocking the implementer.
- When a worker incorrectly blocks after producing a complete handoff, first independently reproduce the worker's claimed evidence (tests, linters, git state) before acting on the block reason. This includes trying alternative tool invocations when the worker cited a tool failure — a worker that reports "mypy is broken" may simply have used the wrong flag; see `references/mypy-hyphenated-checkout.md` for the hyphenated-directory case. Only after confirming the work is genuinely GREEN: add a concise corrective comment with the reproduced evidence and the correct invocation, explicitly prohibit broad reruns or implementation changes, unblock once, dispatch, and verify a new run reaches `running` or completes. Do not repeatedly replay the same review-required block.
- Interpret “push Kanban” as advancing cards through the board unless the user separately authorizes a Git remote push. Never infer Git push authority from Kanban wording.
- CLI flag ordering: `hermes kanban --board <slug> <verb>` — the `--board` flag goes BEFORE the verb, not after. `hermes kanban list --board foo` is rejected as an unrecognized argument. This applies to every board-scoped verb (`list`, `show`, `create`, `comment`, `unblock`, `archive`, etc.).
- `hermes kanban edit <id>` only sets completion results (`--result`, `--summary`, `--metadata`); it does NOT edit the card body. To attach detailed role instructions after creation, use `hermes kanban comment <id> "<body>"` — comments are the durable annotation channel workers read on startup.

See `references/phased-implementation-campaign.md` for a reusable card contract and verification checklist.
See `references/mypy-hyphenated-checkout.md` for the mypy `--explicit-package-bases` fix on hyphenated-directory checkouts.
See `templates/create-five-role-chain.py` for a reusable Python script that creates a full five-role dependency-linked Kanban chain (planner → implementer → auditor → verifier → overseer) in one shot — use this when the caretaker cron doesn't auto-create repair chains on REWORK.

### Periodic campaign caretakers

A valid dependency graph can still idle when a completed parent promotes its child to `ready` but no gateway dispatcher or daemon is active. For long-running campaigns, add a project-scoped recurring caretaker that dispatches at most one card, verifies a genuine new run, diagnoses failures before recovery, and self-pauses at completion, `STOP`, or a real human gate. The caretaker is operational control only: it must not implement, stage, commit, push, create speculative continuation cards, or touch unrelated boards/automation. **Exception**: on overseer `REWORK`, the caretaker IS authorized to create a bounded repair cycle (max 2 attempts) — see `references/project-scoped-campaign-caretaker.md` § REWORK auto-continuation. Without this, every REWORK kills the campaign because the one-shot overseer can't create the next card itself. On `GO`, the caretaker surfaces for human authorization of the next milestone (no auto-advance of product scope). A successful dispatch response is not sufficient evidence; re-read the card and require `running` plus a new run/PID.

A final overseer `STOP` is terminal until the user explicitly authorizes a new repair campaign. When a binding design/spec is supplied, create a fresh planner card with a unique cycle/idempotency key and exact scope before resuming any caretaker. Verify the planner has a real running claim; do not treat card creation or dispatch acceptance as execution. Preserve the old STOP evidence and do not let the caretaker invent a third repair attempt or continuation card.

**Standing "continue" authorization (CRITICAL):** When the user says "continue until gap closed," "keep going until done," or similar, that authorization applies to ALL future STOPs in that campaign, not just the next one. The caretaker prompt must be updated ONCE to treat every overseer STOP as auto-resolvable — read the verification report, extract the exact open findings, create the R(N+1) repair chain, clear the STOP log, and continue without requiring the user to say "continue" again. This is the user's standing profile: "without fixed retry exhaustion or repeated human prompting." If the caretaker is not updated, the user will have to manually intervene at every STOP boundary. See `references/project-scoped-campaign-caretaker.md` § "User-authorized override of bounded-repair exhaustion" for the full protocol.

See `references/project-scoped-campaign-caretaker.md` for the full decision loop, isolation contract, recovery boundaries, cron verification, self-stop pattern, the four-bucket active block classification (finalization-budget / transport / human-gate / spec-failure), REWORK auto-continuation (bounded repair-cycle creation — the fix for campaigns that stall when the one-shot overseer exits after REWORK), GO auto-continuation including the "present for human review" language pattern (a GO with all blockers closed is NOT a STOP — the user's standing commit policy governs), PREFLIGHT-STOP handling (the critical distinction between a planner preflight that needs a contract-clarification R1 cycle vs an overseer terminal STOP), the review-required-with-downstream-chain auto-resolve pattern (implementer blocks with review-required despite having a pre-wired auditor/verifier/overseer chain — the caretaker verifies evidence and unblocks, not the overseer), the model-pin-on-resume step for caretaker jobs created under an earlier global config, and **parallel chain management** for running multiple independent cycles concurrently (seeding parallel planners, updating the caretaker prompt to scan ALL active cycles, and when NOT to parallelize).

### Two-cron cooperation (caretaker + overseer)

For long-running campaigns that need both card-creation and pre-audit PR review, use two crons:

1. **Caretaker** (every 5m, kanban-orchestrator skill): creates next-role cards on GO/REWORK, handles PREFLIGHT-STOP, unblocks incorrect review-required blocks, self-pauses on terminal STOP. Never reviews PRs or merges.
2. **Overseer** (every 15m offset 7-8 min, kanban-cron-overseer skill): health sweep + pre-audit PR review (security, TDD, tests, scope drift). Never creates cards, never merges to protected branches.

The caretaker is the card-creation engine; the overseer is the independent reviewer. They are complementary — the caretaker advances the chain, the overseer catches evidence gaps before the auditor runs. The overseer's review pass is an optimization (catch failures before audit), not a gate (the auditor/verifier/overseer chain still runs every cycle regardless). If token cost matters, slow the overseer to every 30m and keep the caretaker at 5m.

Pre-stage `docs/KNOWN_PROFILES.md` and `docs/SENSITIVE_PATHS.md` in the repo before the overseer's first run — it reads these for role-mismatch and human-gate detection.

## Common patterns

**Fan-out + fan-in (research → synthesize):** N research-style cards with no parents, one synthesis card with all of them as parents.

**Parallel implementation + validation:** one implementer card makes the change while one explorer/researcher card verifies config, docs, or source mapping. A reviewer card can depend on both. Do not make the implementer own unrelated verification just because the user mentioned both in one sentence.

**Pipeline with gates:** `planner → implementer → reviewer`. Each stage's `parents=[previous_task]`. Reviewer blocks or completes; if reviewer blocks, the operator unblocks with feedback and respawns.

**Same-profile queue:** N tasks, all assigned to the same profile, no dependencies between them. Dispatcher serializes — that profile processes them in priority order, accumulating experience in its own memory.

**Human-in-the-loop:** Any task can `kanban_block()` to wait for input. Dispatcher respawns after `/unblock`. The comment thread carries the full context.

## Pitfalls

**Inventing profile names that don't exist.** The dispatcher silently fails to spawn unknown assignees — the card just sits in `ready` forever. Always assign to a profile from your Step 0 discovery; ask the user if you're unsure.

**Bundling independent lanes into one card.** If the user asks for two independent outcomes, create two cards. Example: "fix blockers and check model variants" is not one fixer task; create a fixer/engineer card for the fixes and an explorer/researcher card for the variant check, then optionally gate review on both.

**Over-linking because of wording.** "Finally check X" may still be parallel with implementation if X is static config, docs, or source discovery. Link it after implementation only when the check depends on the implementation result.

**Over-serializing by defaulting to a linear chain.** The phased-implementation pattern (planner → implementer → auditor → verifier → overseer) is the safe default, but it is not the only valid topology. If you reflexively link every card as a single chain, the board will always have exactly 1 running card — not because the dispatcher can't parallelize, but because the graph shape forbids it. Before creating the chain, ask: "do these two cards have a true data dependency, or are they just adjacent in my mental narrative?" The two most common parallelizable pairs in a phased campaign are (1) auditor + verifier (both depend on implementer, neither depends on each other) and (2) independent implementer lanes (different findings touching different files). See § Parallelism within phased campaigns above for the variants. The dispatcher supports up to `max_in_progress` (10) concurrent cards and `max_in_progress_per_profile` (2) per profile — use that capacity when the graph allows.

**Forgetting dependency links.** If the task graph says `research -> implement -> review`, do not create all tasks as independent ready cards. Use parent links so implement/review cannot run before their inputs exist.

**Reassignment vs. new task.** If a reviewer blocks with "needs changes," create a NEW task linked from the reviewer's task — don't re-run the same task with a stern look. The new task is assigned to the original implementer profile.

**Argument order for links.** `kanban_link(parent_id=..., child_id=...)` — parent first. Mixing them up demotes the wrong task to `todo`.

**`hermes cron run` timeout (fire-and-check pattern).** The `hermes cron run <job_id>` command can time out at 60s in the terminal tool, but the trigger succeeds — the scheduler fires the job asynchronously. Do NOT treat the timeout as a failure. Instead, wait 10-15 seconds, then check the board state with `hermes kanban list --status running` to verify the caretaker dispatched the card. The `cron run` response "Triggered job: ... Ran now: succeeded" or "Job is already being fired by the scheduler; not run again" both indicate success.

**Board-drained after REWORK (orchestrator must create the chain).** When the overseer returns REWORK and the caretaker cron either (a) doesn't have REWORK auto-continuation enabled in its prompt, or (b) has a "one card per tick" rule that caused the board to drain between the overseer completing and the next tick, the board will be fully empty (all cards `done`, no `running`/`ready`/`blocked`/`todo`). The orchestrator (parent session) must: (1) read the overseer's REWORK findings from `.hermes/aisides-oversight.md`, (2) create the full five-role repair chain manually using `templates/create-five-role-chain.py`, (3) trigger the caretaker via `hermes cron run`, (4) verify the planner reached `running`. This is the most common stall pattern in caretaker-driven campaigns — the caretaker dispatches existing cards but often doesn't create new chains even when authorized, because its prompt may not have the REWORK auto-continuation language. Always check for an empty board after an overseer decision and create the next chain before reporting "done."

**Board-drained with PARALLEL chains (create N cards, not 1).** When running multiple independent chains (parallel cycles targeting different requirement rows) and the user reports "kanban stopped," ALL chains will drain simultaneously between ticks. The board shows zero non-done cards. The orchestrator must identify every active chain, read each chain's latest oversight decision, and create next cards for ALL drained chains in the same turn — not just one. A caretaker tick that creates only one next-card leaves the other chains idle for another full tick cycle (5 minutes). See `references/project-scoped-campaign-caretaker.md` § "Parallel board-drained recovery."

**Don't pre-create the whole graph if the shape depends on intermediate findings.** If T3's structure depends on what T1 and T2 find, let T3 exist as a "synthesize findings" task whose own first step is to read parent handoffs and plan the rest. Orchestrators can spawn orchestrators.

**Tenant inheritance.** If `HERMES_TENANT` is set in your env, pass `tenant=os.environ.get("HERMES_TENANT")` on every `kanban_create` call so child tasks stay in the same namespace.

**Windows backslash path escaping in bash.** When creating Kanban cards via `hermes kanban create --workspace "dir:D:\\Path\\To\\Repo"` from a bash terminal (git-bash/MSYS on Windows), backslashes get eaten and the path becomes non-absolute (`D:GitRepo-MyAISidesProject` instead of `D:\\GitRepo-My\\AISidesProject`). The dispatcher then fails to spawn the worker with `spawn_failed: workspace_path is non-absolute`, and after `failure_limit` (default 2) consecutive failures the card is auto-archived. ALWAYS use forward slashes in workspace paths: `--workspace "dir:D:/GitRepo-My/AISidesProject"`. Forward slashes are accepted by every Hermes tool and every Windows API. This applies to `--workspace`, `--workdir`, and any path passed through bash. If a card is already stuck with a broken path, it will be in `archived` status — recreate it with forward slashes.

**Attaching long body text after card creation.** The CLI `hermes kanban create` accepts a positional `title` (not `--title`) and an optional `--body`. Passing long multi-paragraph text through bash is fragile (quoting, escaping, newlines). A more reliable pattern: create the card without `--body`, then use `hermes kanban comment <id> "<body>"` — comments are the durable annotation channel workers read on startup. For programmatic batch creation of multiple cards (e.g., a full five-role chain with parent links, or seeding multiple independent parallel chains), use `execute_code` with `hermes_tools.terminal` and `shlex.quote()` for the body text. This lets you create cards, capture the returned IDs via regex, and create children with correct parent links — all in one script. The `--idempotency-key` flag prevents duplicate cards if the script retries. Always verify every returned card ID exists and has the correct parent link before declaring the chain bootstrapped.

## Goal-mode cards (persistent workers)

By default a dispatched worker gets **one shot** at its card: it does its work, calls `kanban_complete`/`kanban_block`, and exits. For open-ended cards where one turn rarely finishes the job, pass `goal_mode=True` to wrap that worker in a Ralph-style goal loop — the same engine behind the `/goal` slash command:

```python
kanban_create(
    title="Translate the full docs site to French",
    body="Acceptance: every page translated, no English left, links intact.",
    assignee="<translator-profile>",
    goal_mode=True,        # judge re-checks the card after each turn
    goal_max_turns=15,     # optional budget (default 20)
)["task_id"]
```

How it behaves:
- After each worker turn, an auxiliary judge evaluates the worker's response against the card's **title + body** (treated as the acceptance criteria).
- Not done + budget remains → the worker keeps going **in the same session** (full context retained — not a fresh respawn).
- Worker calls `kanban_complete`/`kanban_block` itself → loop stops, normal lifecycle.
- Budget exhausted without completion → the card is **blocked** for human review (sticky), never a silent exit.

When to use it: long, multi-step, or "keep going until X is true" cards. When NOT to: cheap one-shot cards (translation of a single string, a quick lookup) — the judge overhead isn't worth it, and the dispatcher's existing retry/circuit-breaker already handles transient worker failures.

Write the body as **explicit acceptance criteria** — the judge is only as good as the goal text. "Translate the README" is weaker than "Translate every section of the README to French; no English sentences remain."

## Recovering stuck workers

When a card is blocked after repeated worker exits, diagnose the run before unblocking it:

1. Inspect `kanban_show` plus the attempt history (`hermes kanban runs <id>`).
2. Read the worker log (`hermes kanban log <id>`) and board diagnostics (`hermes kanban diagnostics`). A generic `pid ... not alive` event is only the scheduler symptom; the log normally contains the actionable cause.
3. Distinguish a task/content failure from a model-provider or transport failure. If the provider failed after the worker accumulated a very large context, do not blindly replay the same card.
4. Add a recovery comment that narrows inputs, tool use, and expected output while preserving the original acceptance criteria. For a planning card, this can mean reading only the target artifact and project instructions, avoiding broad repository discovery, and returning a concise structured handoff.
5. Unblock, run one dispatcher pass, and verify that a new run is actually `running`. Do not claim recovery merely because `unblock` succeeded.

This is a retry-shaping technique, not a permanent claim that a provider or compression format is broken. See `references/repeated-worker-crash-recovery.md` for a compact diagnostic and recovery recipe.

When a worker profile keeps crashing, hallucinating, or getting blocked by its own mistakes (usually: wrong model, missing skill, broken credential), the kanban dashboard flags the task with a ⚠ badge and opens a **Recovery** section in the drawer. Three primary actions:

1. **Reclaim** (or `hermes kanban reclaim <task_id>`) — abort the running worker immediately and reset the task to `ready`. The existing claim TTL is ~15 min; this is the fast path out.
2. **Reassign** (or `hermes kanban reassign <task_id> <new-profile> --reclaim`) — switch the task to a different profile (one that exists on this setup) and let the dispatcher pick it up with a fresh worker.
3. **Change profile model** — the dashboard prints a copy-paste hint for `hermes -p <profile> model` since profile config lives on disk; edit it in a terminal, then Reclaim to retry with the new model.

Hallucination warnings appear on tasks where a worker's `kanban_complete(created_cards=[...])` claim included card ids that don't exist or weren't created by the worker's profile (the gate blocks the completion), or where the free-form summary references `t_<hex>` ids that don't resolve (advisory prose scan, non-blocking). Both produce audit events that persist even after recovery actions — the trail stays for debugging.
