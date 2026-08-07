---
name: kanban-cron-overseer
description: "Scheduled cron that babysits a Hermes Kanban board AND replaces human review on worker PRs. Two stages per tick: (1) health sweep — unstick stalls, recover crashed workers, escalate long-blocked cards; (2) review pass — read worker diffs, run pytest in worktree, verify TDD evidence (test committed before impl), merge on PASS or block on FAIL. Moderate autonomy: never auto-deploy, never push to protected branches without consent, always leave an audit trail. Detects role-mismatched cards, detects its own stall loops, and cleanly escalates human-review-required cards with timeout policy. Complements kanban-orchestrator (which decomposes + dispatches) and amg-pipeline-orchestrator / cron-pipeline-state-machine (which define the dispatcher pattern). For AMG this codifies the cron that replaces your spot-checking of Agent #1's weapon/tool ports."
version: 1.2.0
author: Hermes Agent
license: MIT
platforms: [linux, macos, windows]
environments: [kanban]
metadata:
  hermes:
    tags: [kanban, cron, multi-agent, review, TDD, automation]
    related_skills: [kanban-orchestrator, ai-coding-agents, software-development-practices, cron-pipeline-state-machine, multi-agent-subagent-pitfalls]
---

# Kanban Cron Overseer

> The babysitter + autonomous reviewer for a Hermes Kanban board. Runs
> on a cron schedule (recommended: every 15 min wall-clock, offset from
> any worker-pipeline cron). Two responsibilities per tick: keep the
> board healthy, and replace human review on worker PRs.

## What this skill is NOT

- Not an orchestrator. `kanban-orchestrator` decomposes work and creates
  cards. This skill never creates cards; it only acts on cards that
  already exist.
- Not a dispatcher. `cron-pipeline-state-machine` and the AMG dispatcher
  route between worker agents via state files. This skill does not
  spawn workers — it observes and reviews them.
- Not autonomous deployment. The Moderate mode (default) merges PRs to
  the integration branch but never pushes to `main`/`master`/`prod`
  without explicit human consent encoded in the cron's profile config.

## When to load this skill

Load when any of the following is true:

1. The user runs a Kanban board with ≥1 worker profile and wants a
   cron to keep it healthy without manual babysitting.
2. Worker PRs are landing with broken tests, missing TDD evidence
   (impl committed before the test), or scope drift, and the user
   wants the cron to block them instead of letting them merge.
3. The user has explicitly said "replace human review" — this skill is
   the playbook for that mode.
4. You are writing a NEW cron job and need the prompt template +
   state-file conventions + verdicts format for an overseer-style loop.

## What this skill CANNOT do (honest scope)

The skill name says "replace human review." That is partially true.
The cron CAN replace the mechanical parts of review: TDD evidence,
test pass/fail, security scan, scope drift, line-count limits. It
CANNOT replace judgment calls. Three categories are out of scope
and **must** stay human-owned:

1. **Subjective design / product decisions** — "is this API pleasant",
   "is this UX intuitive", "does this match the project's voice".
   No test pins these.
2. **Cross-cutting architectural calls** — "Redis vs in-memory",
   "monolith vs service", "should we bump the Content Patcher
   manifest version". These need a human because they affect
   downstream phases the cron cannot see.
3. **Sensitive surfaces** — auth, payments, PII, security
   primitives, anything that touches production secrets or
   compliance boundaries. Even with passing tests, the user wants
   a human eye.

The cron detects these via the `requires_human` card tag (set by
the orchestrator at `kanban_create` time). When set, the cron
NEVER issues a KEEP/FIX/DELETE verdict — it only escalates. See
§ Human review required below.

Beyond the `requires_human` tag, the cron also has hard "I don't
know" categories where it defaults to FIX (not KEEP) and writes
the reasoning. Better to over-escalate than to under-escalate.

## Two stages per tick

### Stage 1: Health sweep (ALWAYS runs)

Pure observation + recovery actions on the board state. Outputs a
health report at the end of every tick.

Actions, in order:

1. **Probe shell.** Expect BLOCKED on this host (tirith blocks
   `terminal` in cron sessions). If shell is available, the cron is
   in a degraded mode — see "Shell-blocked mode" below.
2. **Scan board state.** For each card in `ready`, `in_progress`,
   `blocked`:
   - `ready` for > N minutes (default 30) with no worker claimed it
     → candidate for promotion (re-prioritize? reassign? escalate?)
   - `in_progress` for > M minutes (default 90) with no
     `last_run_at` advancement → candidate for reclaim
   - `blocked` for > K minutes (default 60) with no comment thread
     activity → candidate for user ping
3. **Recover crashed workers.** If a task has a `⚠` badge (worker
   claimed but no progress in 15+ min), call `kanban_reclaim` on it
   via the dashboard API, OR if shell is blocked, write a comment
   noting "RECOVER: worker crashed, resetting to ready."
4. **Promote stale `ready` cards.** If a `ready` card's
   `priority=urgent` and has been waiting > 15 min, write a comment
   noting it for the dispatcher. Do NOT change priority yourself.
5. **Escalate long-blocked cards.** Any card `blocked` for > 60 min
   with no comment → emit a one-line alert to the user via cron
   delivery: "card <id> blocked for >60m, please check thread."
6. **Self-throttle.** If Stage 1 finds > 10 stalls in a single tick,
   the board is unhealthy. Write a "BOARD DEGRADED" header to the
   health report. Do NOT attempt Stage 2 — reviewing PRs while the
   board is on fire produces unreliable verdicts.
7. **Role-mismatch detection** (Stage 1.5 — runs after stalls,
   before self-throttle). For each `ready` card with no claim:
   - Resolve `assignee` to a known profile on this host (use
     `hermes profile list` if shell available; if blocked, compare
     against the names the parent pre-stages in
     `docs/KNOWN_PROFILES.md`).
   - **Unknown profile / typo**: write a comment
     "OVERSEER: assignee '<name>' is not a known profile. Card
     will not be picked up by the dispatcher. Reassign to one of:
     <known profiles>." Do NOT change assignee yourself.
   - **Profile exists but wrong role for the card body**: read
     the card body. If it mentions "implement", "code", "fix",
     "test", "refactor" but assignee is a research/reviewer-only
     profile (no write tools), write a comment "OVERSEER:
     assignee '<name>' is read-only; this card needs write
     capability. Reassign to <implementer-profile>." Do NOT
     change assignee yourself.
   - **Multi-role need detected**: card body contains "and then
     <other-step>" or lists two roles' worth of work. Write a
     comment "OVERSEER: this card appears to need multi-role
     work. Recommend splitting into one card per role." Do NOT
     split it yourself.
   - **Profile config failure**: if a worker was assigned but
     never spawned (visible as `last_run_at=null` for >5m in
     `in_progress`), check whether the profile's model is
     configured (`hermes profile show <name>`). Write the
     diagnostic to the comment; user must fix the profile.
8. **Stall-loop detection** (NEW). Read the previous tick's
   `OVERSEER_HEALTH_<date>.md` section. If THIS tick's findings
   (stalled card IDs) overlap >80% with the previous tick's
   findings, the cron is in a loop — writing comments doesn't
   fix anything. Increment a `consecutive_no_progress_ticks`
   counter. At counter ≥ 3, write `OVERSEER_ESCALATION.md` with
   "Overseer stalled: 3+ consecutive ticks with same stalls and
   no progress. Parent session intervention required." At
   counter ≥ 6, set the cron to `enabled=false` for the next
   hour (write `docs/OVERSEER_SELF_PAUSE.md`, do NOT call any
   cron tools — the user reads this on next login and decides).

### Stage 2: Review pass (runs ONLY when board is healthy)

For each PR-shaped card in `in_progress` whose worker has called
`kanban_complete` but the card is still pending merge, do a review pass
matching `software-development-practices §Code Review`:

1. **Read the diff.** Use `git diff <base>..<branch>` (via
   `execute_code` + `subprocess` if shell available; otherwise read
   the worker's commit messages + file list from the kanban comment
   thread).
2. **Static security scan.** Run the patterns from
   `software-development-practices §Code Review §Security Scan Patterns`:
   hardcoded secrets, shell injection, eval/exec, SQL injection.
3. **TDD evidence check.** For every code file in the diff, find the
   matching test file. Check git log:
   - Test commit timestamp must precede the impl commit timestamp.
   - Test must fail BEFORE impl lands (look for a commit message
     like "test: red — …" before the "feat: …" commit).
   - If TDD evidence is missing AND the card body said "TDD
     required" → verdict FAIL with "missing test-first evidence."
4. **Baseline tests.** If shell is available, `pytest <test_files>
   -v --tb=short` in the worker's branch. Expect exit 0.
5. **Self-review checklist.** Security, validation, error handling,
   tests — the four-bullet list from `software-development-practices`.
6. **Independent reviewer (optional).** If the profile has a
   dedicated reviewer profile, dispatch it via `delegate_task` with
   the diff. Otherwise, do the review inline.
7. **Verdict.** Write `PENDING_REVIEW_<card_id>.md` next to the
   card with one of three values:
   - `KEEP` — all checks pass, ready to merge
   - `FIX` — one or more failures, with `feedback_for_agent_1`
     describing what to change
   - `DELETE` — the change is wrong-headed, scrap it
   - `HUMAN_REQUIRED` — the cron CANNOT decide this one. See
     § Human review required below. Default for any card with
     the `requires_human` tag, any card touching auth/payments/
     PII/security-primitive files (path glob match), any card
     body containing the words "design", "UX", "architecture",
     "API shape", "compliance", "license", or any card whose
     review would require reading docs outside the repo.

On `KEEP`: merge to integration branch (NOT to `main`/`master`
unless the cron's profile config explicitly allows it). Write a
"merged: <hash>" comment on the card. Promote any children with
`parents=[this_card]` from `todo` to `ready`.

On `FIX`: leave the card in `in_progress`, write the verdict to
the comment thread, and tag the original worker profile. Do NOT
reclaim — the same worker is fine for a fix iteration.

On `DELETE`: `kanban_block` the card with reason "DELETE verdict
from overseer — <one-line reason>." Pause the card; user resumes
after deciding whether to retry or drop.

On `HUMAN_REQUIRED`: do NOT merge, do NOT block, do NOT change
the card state. Write `PENDING_REVIEW_<card_id>.md` with verdict
`HUMAN_REQUIRED` and a one-paragraph explanation of WHY the cron
cannot decide (which heuristic triggered). Emit a one-line user
ping via cron delivery: "card <id> requires human review —
<reason>. Reply in thread or run /unblock." See § Human review
required for the full escalation + timeout protocol.

## Human review required

Cards that the cron cannot decide MUST be escalated cleanly.
Without this protocol, they pile up in `in_progress` forever and
the user only finds them when something downstream breaks.

### Detection (any of these triggers HUMAN_REQUIRED)

1. **Explicit tag**: orchestrator sets `requires_human=true` at
   `kanban_create` time. The orchestrator's job is to know which
   cards need a human in the loop; the overseer's job is to
   enforce that boundary even when the worker forgets.
2. **Sensitive surface path match**: any file in the diff matches
   a glob in the cron's profile config:
   - default sensitive_globs = `["**/auth/**", "**/secrets/**",
     "**/payments/**", "**/pii/**", "**/crypto/**",
     "**/security*", "**/credentials*"]`
   - user can extend via `docs/SENSITIVE_PATHS.md`
3. **Subjective language in card body**: contains "design",
   "UX", "API shape", "architecture", "compliance", "license",
   "breaking change", "deprecate", "migration plan".
4. **External dependency check needed**: card body references a
   library/version upgrade, an external service, or "compatibility
   with <external-system>".
5. **Previous tick was already HUMAN_REQUIRED on the same card**:
   no progress means the user hasn't responded yet — emit a
   re-ping, do NOT loop silently.

### Escalation protocol

When HUMAN_REQUIRED fires:

1. **Write verdict file** with `verdict: HUMAN_REQUIRED` and a
   one-paragraph "why" section listing which heuristic(s)
   triggered.
2. **Emit user ping** via cron delivery (one line):
   `OVERSEER: card <id> requires human review — <heuristic>.
   Reason: <one sentence>. Reply in thread or run /unblock.`
3. **Do NOT change card state**. Leave it in `in_progress`. The
   worker is technically done (called `kanban_complete`); the
   cron is waiting on a human verdict, not a worker verdict.
4. **Track in `OVERSEER_HUMAN_PENDING.md`**: append a row
   `<card_id>, <timestamp>, <heuristic>, <re_ping_count>`. This
   is the queue of cards waiting on the user.

### Timeout policy (USER MUST CONFIGURE)

The cron's profile config MUST define a `human_review_timeout_min`
(default: 120). After the card has been in HUMAN_REQUIRED state
for that long:

- **Default (safe)**: cron writes
  `OVERSEER_HUMAN_PENDING_TIMEOUT_<card_id>.md` and leaves the
  card in `in_progress`. User MUST escalate to `blocked` or
  resolve manually. Do NOT auto-block (might lose context) and
  do NOT auto-KEEP (unsafe).
- **Aggressive (user opted in)**: cron auto-blocks the card with
  reason "human review timeout — user did not respond within
  <N> min". User can `/unblock` and resume. Only safe when the
  user explicitly enabled this in profile config — the default
  is the safe path because over-blocking loses work, but
  over-merging loses trust.

### Re-ping cadence

While waiting on human review, the cron re-pings:

- At 30 min: gentle reminder ("still waiting on <card_id>")
- At 60 min: harder reminder with explicit link to the verdict file
- At timeout: write the timeout file (per policy above)

If the user responds in the comment thread with `/unblock` +
verdict (KEEP/FIX/DELETE), the cron on its NEXT tick reads the
thread, applies the verdict, and removes the card from
`OVERSEER_HUMAN_PENDING.md`.

### What the cron CANNOT do for human-required cards

- Cannot translate "this looks fine to me" into KEEP. The user
  must say it.
- Cannot translate "this is fine EXCEPT change X" into FIX
  unless X is mechanically checkable. Subjective X requires
  the user to issue the FIX verdict themselves.
- Cannot self-resolve. Even if the user hasn't responded, the
  cron cannot decide.
- Cannot merge based on "tests pass + 2 ticks with no
  objections". That is consensus-seeking, not review.

### Honest answer to "can the cron replace human review?"

The cron can replace the **waiting**. The user no longer has to
check every PR — the cron reads every PR, runs every check it
can, and ONLY escalates the ones it can't decide. The 90% case
(mechanical checks: TDD, tests, security, scope) is fully
automated. The 10% case (judgment: design, sensitive surfaces,
architecture) is fully escalated. The cron's value is not
"fewer user decisions" — it's "fewer UNNECESSARY user
decisions, more confidence when the user IS in the loop".

## Cron stall handling (NEW)

The cron itself can stall. Three failure modes documented from
the AMG 5-agent pipeline (see `multi-agent-subagent-pitfalls §
Rule 6 masks Rule 4` and `cron-pipeline-state-machine §HARD
INVARIANT 3`):

### Mode 1: Stall-loop (cron keeps writing the same comments)

Detection: covered in Stage 1 step 8 above — >80% overlap with
previous tick's findings for 3+ consecutive ticks.

Recovery:
- 3 ticks: write `OVERSEER_ESCALATION.md`, keep running (user
  reads on next login)
- 6 ticks: write `OVERSEER_SELF_PAUSE.md`, set `enabled=false`
  via the cron's own config (NOT via a sub-cron — see
  § Self-modification below). User resumes after investigating.
- 9 ticks: do NOT self-reenable. The user MUST reenable from a
  parent session. The cron's escalation chain ends here.

### Mode 2: Tool failure mid-tick

If `kanban_list` returns an error, the cron CANNOT observe the
board. Action:

1. Write a single line to `OVERSEER_HEALTH_<date>.md`:
   `tool_failure: <tool_name> returned <error_class>. Skipping
   tick.`
2. Exit clean. Do NOT retry the tool (it might be persistently
   broken — hammering it just generates noise).
3. On the next tick, retry. If the tool works, proceed normally.
4. If the tool fails for 3 consecutive ticks, write
   `OVERSEER_ESCALATION.md` with the tool name + error class.

The cron must NEVER exit silent on tool failure — silent exit
breaks the audit trail and the user has no signal that the
overseer is alive.

### Mode 3: Self-modification prohibition

The cron cannot:
- Spawn subagents (overseer observes; it does not delegate)
- Call `cronjob` tools to modify OTHER cron jobs (would let
  the overseer hide itself)
- Push to git (parent owns git topology)
- Modify `~/.hermes/skills/` (overseer skill is upstream-owned)
- Modify the cron's own `prompt` field (the cron cannot rewrite
  its own instructions — that is prompt injection bait)

The cron CAN write to `docs/` (state files) and to kanban
comments. That's the entire writable surface.

If the cron detects it needs to do something outside its
writable surface, it writes `OVERSEER_ESCALATION.md` and exits.

## Hard rules (NEVER violate)

1. **Never auto-merge to protected branches.** Default
   `protected_branches = ["main", "master", "prod", "release/*"]`.
   Merge only to the integration branch configured in the cron's
   profile (default: `integration/<profile-name>`). User explicitly
   promotes integration → main from a parent session.
2. **Never push secrets.** If the diff contains anything matching
   the security scan patterns, FAIL immediately, do not merge.
3. **Never skip TDD evidence check.** Even if tests pass and code
   looks clean, missing test-first evidence = FIX verdict with
   that single reason.
4. **Never create cards.** This skill observes and routes; it does
   not decompose work. If a problem requires a new card, write it
   to `docs/PENDING_KANBAN_CARD.md` for the parent session to
   create.
5. **Never invoke the orchestrator.** If Stage 1 finds the board
   is degraded for 3+ consecutive ticks, write
   `docs/OVERSEER_ESCALATION.md` and stop. Do not try to fix a
   systemic problem by spawning more agents.
6. **Never issue a verdict on a HUMAN_REQUIRED card.** The cron
   can write the verdict FILE with `HUMAN_REQUIRED`, but it
   cannot decide for the user. See § Human review required.
7. **Never silently exit.** Every tick writes SOMETHING to
   `OVERSEER_HEALTH_<date>.md`, even if it's just "no findings".
   A silent tick = the cron is dead or stuck.
8. **Never modify itself or other crons.** See § Cron stall
   handling § Mode 3. The cron's only writable surface is
   `docs/` files and kanban comments.

## State files (in `docs/`)

**Parent-pre-staged (commit these BEFORE creating the cron):**
- `KNOWN_PROFILES.md` — list of profile names available on this
  host. Used by Stage 1.5 role-mismatch detection. Format:
  ```
  - <profile-name>: <role-description>, <has_write_tools: yes/no>
  ```
- `SENSITIVE_PATHS.md` — extended glob list beyond the default
  sensitive_globs. Format: one glob per line, comments start
  with `#`. Used by Stage 2 HUMAN_REQUIRED detection.

**Cron-written (append-only audit trail):**
- `OVERSEER_HEALTH_<YYYY-MM-DD>.md` — one per day
  - Each tick writes a 5-line section: timestamp, stage1_findings,
    stage2_verdicts, action_taken, next_check
  - This is the audit trail. Persistent forever; prune yearly via
    `git rm` from a parent session.
- `PENDING_REVIEW_<card_id>.md` — one per reviewed card
  - Verdict (KEEP/FIX/DELETE/HUMAN_REQUIRED) + reasoning + links
    to evidence
- `OVERSEER_HUMAN_PENDING.md` — queue of cards awaiting user
  review. Append-only, one row per card:
  `<card_id>, <timestamp>, <heuristic>, <re_ping_count>`
  - Cron removes rows when the user resolves them.
- `OVERSEER_HUMAN_PENDING_TIMEOUT_<card_id>.md` — written when
  human review timeout fires (per the timeout policy above).

**Escalation files (terminal signals to parent session):**
- `OVERSEER_ESCALATION.md` — written when the board is degraded
  for ≥ 3 consecutive ticks. Parent session must read this.
- `OVERSEER_SELF_PAUSE.md` — written when the cron self-pauses
  after 6 consecutive no-progress ticks. Parent session must
  investigate, then reenable the cron from outside.

**Work requests back to orchestrator:**
- `PENDING_KANBAN_CARD.md` — when the overseer detects a problem
  that requires a new card (e.g., role mismatch, multi-role need,
  systemic drift), it writes the card spec here. The parent
  session's orchestrator reads this and creates the card.

## Cron prompt template

Use this as the `prompt` field when creating the cron job via
`cronjob action="create"`:

```
You are the kanban cron overseer for <PROJECT>. Each tick, run two
stages. ALWAYS start with Stage 1; only proceed to Stage 2 if Stage 1
reports a healthy board.

Load the kanban-cron-overseer skill via skill_view first.

# Stage 1: Health sweep

1. Probe shell: try `terminal command="date"`. Expect BLOCKED on this
   host. If available, prefer shell; if blocked, use file tools only.
2. List all cards via kanban_list(filter="all"). For each:
   - ready >30m with no claim → write to OVERSEER_HEALTH_<date>.md,
     tag for promotion
   - in_progress >90m with no last_run_at advancement → call
     kanban_reclaim (dashboard) OR write a "RECOVER" comment
   - blocked >60m with no comment activity → emit one-line user
     ping via cron delivery
3. If >10 stalls → write "BOARD DEGRADED" header, skip Stage 2,
   end tick.
4. Role-mismatch (Stage 1.5): for each ready card, check assignee
   against docs/KNOWN_PROFILES.md. Unknown profile / wrong role /
   multi-role need → write OVERSEER comment with reassignment
   recommendation. Do NOT change assignee yourself.
5. Stall-loop detection: read previous tick's OVERSEER_HEALTH. If
   findings overlap >80% with last tick, increment
   consecutive_no_progress_ticks. At ≥3, write OVERSEER_ESCALATION.md.
   At ≥6, write OVERSEER_SELF_PAUSE.md and exit (parent reenables).
6. NEVER exit silent — always write SOMETHING to OVERSEER_HEALTH.

# Stage 2: Review pass (only if board healthy)

For each PR-shaped card in in_progress whose worker called
kanban_complete but the card is still pending merge:

1. CHECK FOR HUMAN_REQUIRED FIRST (before any verdict):
   - card has requires_human=true tag?
   - diff touches files matching sensitive_globs (default:
     **/auth/**, **/secrets/**, **/payments/**, **/pii/**,
     **/crypto/**, **/security*, **/credentials*) OR matches in
     docs/SENSITIVE_PATHS.md?
   - card body contains: design, UX, API shape, architecture,
     compliance, license, breaking change, deprecate, migration?
   - card body references external dependency / upgrade?
   If ANY match → verdict: HUMAN_REQUIRED. Write
   PENDING_REVIEW_<card_id>.md, append to OVERSEER_HUMAN_PENDING.md,
   emit user ping, leave card in_progress. SKIP steps 2-7.

2. Read git diff via execute_code + subprocess (or comment thread
   fallback if shell blocked).
3. Run security scan patterns (hardcoded secrets, shell injection,
   eval/exec, SQL injection). ANY hit → verdict FIX, halt.
4. Verify TDD evidence: test commit must precede impl commit,
   test must have a red-phase commit message. Missing → verdict
   FIX with "missing test-first evidence".
5. If shell available, run pytest in the worker's branch. Exit
   !=0 → verdict FIX with test failure log.
6. Write verdict to PENDING_REVIEW_<card_id>.md:
   - KEEP: merge to integration/<profile> branch, comment on card
   - FIX: leave in_progress, write feedback to comment thread
   - DELETE: kanban_block with reason
7. NEVER auto-merge to main/master/prod/release/*.

Hard rules: never auto-merge to protected branches. Never push
secrets. Never skip TDD evidence check. Never create cards. Never
issue verdict on HUMAN_REQUIRED card. Never silently exit. Never
modify yourself or other crons. Writable surface = docs/ + kanban
comments only.

Output: ≤ 8 lines to chat. Round type, cards reviewed, verdicts,
action taken. No verbose logs. No fabrication. If shell blocked
and review can't proceed, say so and exit clean.

Project root: <ABS_PATH>
Integration branch: <INTEGRATION_BRANCH>
Protected branches: <PROTECTED_BRANCHES>
Worker profiles: <LIST>
Human review timeout (min): <TIMEOUT_MIN, default 120>
Self-pause after N ticks: <N, default 6>
Stall-loop threshold (%): <PCT, default 80>
```

## Shell-blocked mode (default on this host)

When `terminal` is blocked by tirith:

- **Stage 1 works fully** — board state, kanban_list, kanban_reclaim,
  comment writing all use kanban_* tools (not shell).
- **Stage 2 is degraded**:
  - Git diff: fall back to reading the worker's commit messages
    from the comment thread + listing files via kanban_list
    file attachments.
  - pytest: cannot run. Verdict becomes "KEEP-with-caveat" or
    "FIX: tests could not be verified in shell-blocked mode" —
    parent session must run pytest before merging.
  - Security scan: still runs (it's a pattern match on the diff
    text, no shell needed).

When the cron cannot run Stage 2's mechanical checks, write the
review verdict with a "⚠ shell-blocked" annotation. Parent
sessions consume these annotations and run the missing checks
manually.

## Verdicts format

```
# Review for card <card_id>: <short title>

**verdict:** KEEP | FIX | DELETE
**reviewer:** kanban-cron-overseer
**timestamp:** <ISO-8601>

## TDD evidence
- [ ] Test file present: <path>
- [ ] Test commit precedes impl: <hash-test> → <hash-impl>
- [ ] Red-phase commit message: "test: red — <what fails>"

## Security scan
- [ ] No hardcoded secrets
- [ ] No shell injection (os.system, shell=True)
- [ ] No eval/exec
- [ ] No SQL injection

## pytest result
- shell available: <yes/no>
- if yes: <exit_code>, <test_count>, <duration>

## Self-review checklist
- [ ] Validation: <one line>
- [ ] Error handling: <one line>
- [ ] Tests: <one line>

## Reasoning
<2-3 sentences>

## Feedback (FIX only)
<bullet list of what to change>
```

## Anti-patterns

1. **Single mega-tick that does Stage 1 and Stage 2 in parallel.**
   Stage 2's verdicts are unreliable if Stage 1 found the board
   on fire. Sequential.
2. **Auto-merging without TDD evidence.** Tests pass ≠ TDD was
   followed. A worker can write passing tests AFTER the impl
   without test-first practice. Always verify the git log.
3. **Treating "no stalls" as "board is healthy."** No stalls can
   still mask a stuck pipeline where every card is in_progress
   and no one is finishing. Add a "max in_progress age" check
   even if no ready/blocked stalls exist.
4. **Spawning subagents from inside the overseer.** Overseer
   observes; it does not delegate. If a problem needs a worker,
   write it to PENDING_KANBAN_CARD.md and let the parent session
   route it.
5. **Cron delivery default footgun.** `cronjob action="create"`
   defaults to `deliver="local"` — overseer output never reaches
   the user. ALWAYS set `deliver="origin"` (or the appropriate
   channel) when creating the overseer cron. See
   `software-development-practices §Scheduled Dual-Agent Loops §Cron
   delivery default footgun`.
6. **Scheduling the overseer on the same offset as a worker
   pipeline cron.** They will race for shell access and produce
   interleaved, confusing output. Offset the overseer by 7-8
   minutes (e.g., workers at :00/:15/:30/:45, overseer at :07/:22/
   :37/:52).

## Reference

- `kanban-orchestrator` — decomposition + dispatch (complementary role)
- `ai-coding-agents` — Claude Code CLI specifics, worktree patterns
- `software-development-practices §TDD §Code Review` — the iron law
  and the review pipeline the Stage 2 verifier mirrors
- `cron-pipeline-state-machine` — state machine dispatcher pattern
- `multi-agent-subagent-pitfalls` — 12 known bugs from AMG 5-agent
  pipeline, especially Pitfall 5 (project-marker file false-missing
  in workdir-relative searches) and Pitfall 7 (cronjob.run doesn't
  fire a tick)
