# Kanban pipeline vs direct coding CLI — when to use which

## The trade-off

The 5-role kanban pipeline (planner → implementer → auditor → verifier →
overseer) trades speed for audit trail and forced review separation.
A coding CLI (Claude Code `claude -p`, Codex CLI) trades audit trail
for speed and full context continuity.

## Kanban pipeline costs (observed)

Each feature flows through 5 separate LLM sessions. Each session:
- Cold-starts a full Hermes worker process (config load, skill scan,
  model connect): 5-15s overhead before any work
- Loads context fresh — the auditor doesn't see what the implementer
  saw unless it's written to state files / comments
- Runs on the dispatcher's 60s tick cadence — a card waits up to 60s
  before a worker picks it up

On a real campaign (AgentMOD human-mindset board), 191 done cards =
~955 LLM sessions for what a coding CLI could do in ~30-50 sessions.

## Coding CLI costs (observed, Claude Code)

- One session does plan + implement + review in a single context
- No dispatcher tick wait — runs immediately
- 12-90s per task, ~$0.05-0.30 per task (sonnet-4)
- BUT: no independent review — the same agent that wrote the code
  reviews it (perspective bias)
- BUT: no audit trail — no PENDING_REVIEW_v*.md markers, no dependency
  chain, no board state

## When to use the kanban pipeline

Use the 5-role pipeline when ANY of these are true:

1. **Compliance-sensitive work** — every change needs independent agent
   review before landing (auth, payments, PII, security primitives)
2. **Audit trail is a deliverable** — the project requires evidence
   that each change was reviewed by a separate agent
3. **Multi-phase releases** — work that genuinely needs plan →
   implement → audit → verify → oversee separation
4. **Human-in-the-loop gates** — the work needs to block for human
   decisions at specific points

## When to use a coding CLI instead

Use `claude -p` (or Codex CLI) directly when ALL of these are true:

1. **Mechanical coding** — write function X, fix bug Y, refactor Z
2. **No compliance requirement** — the project doesn't need an audit
   trail for routine changes
3. **Speed matters more than forced review** — the user wants
   throughput, not ceremony
4. **The change is self-verifying** — tests exist and can be run
   immediately after the change

## Hybrid: use the board for tracking, CLI for execution

The kanban board is still useful for TRACKING what needs doing even
when you're not running the 5-role pipeline. Pattern:

1. Create cards on the board for each task (one card per feature/fix)
2. Assign them to the default profile (or a worker profile with
   terminal access)
3. The worker loads `claude-code-worker-delegation`, invokes
   `claude -p` for the mechanical coding, verifies the result, and
   completes the card
4. The board tracks progress; the coding CLI does the work

This gives you board visibility without the 5-role overhead. The
trade-off: no independent auditor/verifier — the worker itself verifies
Claude's output (which is still better than no review, but weaker than
a separate auditor).

## Signal that the pipeline is the wrong tool

- `done=100+` cards on a single board, most being mechanical coding
- The user asking "why is this so slow" or "kanban agents seem less
  efficient than coding CLI"
- Cards taking 5 LLM sessions for work a CLI could do in 1 session
- No compliance requirement justifying the 5-role overhead

## Parallelizing the kanban dispatcher (multi-board config)

If the user asks whether multiple kanbans can run simultaneously: YES,
and they already do by default — but the real bottleneck is usually
`max_in_progress_per_profile`, not the dispatcher being single-process.

Key facts (verified in source + observed 2026-07-20):

1. **Each board has its own `kanban.db`** under
   `~/.hermes/kanban/boards/<slug>/`. Boards are DB-isolated — no
   cross-board contention.
2. **The dispatcher iterates ALL boards every tick** and can spawn
   workers on multiple boards per tick. `_tick_once()` in
   `gateway/kanban_watchers.py` loops `list_boards()` and calls
   `_tick_once_for_board(slug)` for each.
3. **Per-board dispatch locks** (`_dispatch_tick_lock` in
   `kanban_db.py`) are keyed off the board's DB path, so unrelated
   boards tick in parallel without racing on WAL frames.
4. **The machine-global `.dispatcher.lock`** at the kanban root
   serializes which GATEWAY process runs the dispatcher — it prevents
   two gateway processes from double-dispatching. But a single gateway
   dispatcher already handles all boards in parallel within each tick.
5. **`max_in_progress_per_profile` is the real parallelism limiter.**
   When unset (default), the same profile name can only have 1 task
   running at a time across ALL boards. Setting it to 2+ allows the
   same profile (e.g. `modbuilder`) to run tasks on multiple boards
   simultaneously.

Recommended config for multi-board parallelism:

```yaml
kanban:
  dispatch_in_gateway: true
  dispatch_interval_seconds: 30   # faster ticks (default 60)
  max_spawn: 5                    # workers per tick per board
  max_in_progress: 10             # global cap
  max_in_progress_per_profile: 2  # same profile across boards
```

After changing config, restart the gateway (`hermes gateway restart`)
for the dispatcher to pick up new settings.

**How to verify parallel dispatch is working:** check that the same
profile name has tasks in `running` status on multiple boards
simultaneously:

```bash
for slug in $(hermes kanban boards list | awk 'NR>1{print $1}'); do
  echo "--- $slug ---"
  hermes kanban --board "$slug" list --status running
done
```

If only one board has a running task at a time, check
`max_in_progress_per_profile` — it's the usual culprit.

## Signal that the pipeline is the right tool

- The project is compliance-sensitive (auth, payments, PII)
- The audit trail is a project deliverable
- Each change genuinely needs independent review before landing
- The user has explicitly set up the 5-role pipeline for review
  discipline, not just because it's the default

## Reference

- `claude-code-worker-delegation` skill — how a worker invokes
  `claude -p` as a subprocess for mechanical coding tasks
- `kanban-worker` skill § "Delegating coding to Claude Code CLI" —
  the quick-reference section auto-loaded into every dispatched worker
