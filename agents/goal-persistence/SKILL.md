---
name: goal-persistence
description: Design or implement a persistent goal: an objective that keeps an agent working across turns, sessions, and restarts until genuinely complete — durable state keyed by thread, an idle self-start loop, and an anti-drift steering prompt that re-injects the full objective every turn (completion audited against real state, blocked only after repeated recurrences). Use when the user wants a goal or objective to "stick" / "persist across turns or days", wants an agent to "keep working until done" without declaring victory early, or asks how a long-running goal / goal feature works.
version: 1.0.0
metadata:
  category: agents
  created_by: agent
---

# Goal persistence

An objective that keeps an agent working across turns, sessions, and process restarts until it is genuinely complete — never narrowed, never self-declared done early. Distilled from the Codex goal feature (canonical source: `D:\GitRepo-AI\codex\docs\goal-feature.md`).

## The mechanism

"Sticking with it for days" is not a retry queue or a loop counter. It is three things composed, plus one on restart:

1. **Durable state** — the goal is a single persistent row keyed by thread/context ID, never held only in memory. Fields: objective, status, budget, usage, and timestamps.
2. **Idle self-start** — when a turn ends and the thread goes idle, if the goal row is still active, start a fresh turn. Start only if genuinely idle, otherwise decline without queueing: exactly one continuation per idle, no busy-loop.
3. **Anti-drift steering** — that new turn re-injects the full objective as a steering prompt (the contract below).
4. **Resume** — on restart, re-read the durable row and re-arm the idle loop if the goal is still active.

## Anti-drift steering contract

The continuation turn is not empty; it re-injects the full objective. The contract it enforces:

- **Keep the full objective intact** — do not redefine success around a smaller or easier task.
- **Completion audit** — verify against actual state with evidence before marking complete; never on the model's own say-so.
- **Blocked audit** — mark blocked only after the same blocking condition recurred for at least three consecutive goal turns.

## Status machine

`Active → { Paused, Blocked, UsageLimited, BudgetLimited, Complete }`

- `Complete` and `BudgetLimited` are terminal.
- Only the allowed transitions are permitted; any other status change is rejected.
- Budget auto-transitions to `BudgetLimited` inside the accounting write when usage crosses the budget.

## Escape hatches

The loop stops only on a terminal status (`complete` / `budget_limited`), an explicit pause, or usage exhaustion. Everything else re-arms the idle loop.

## Accounting

Track token deltas (input − cached_input + output) and wall-clock time in memory; flush to the durable row on turn end; auto-transition to the budget-limited status when the budget is exceeded.

## Harness / test

Drive the lifecycle manually against a real state DB — start/stop turns, record usage, notify tool finish and error, resume — and assert on the captured state-transition events. That proves persistence, accounting, budget auto-transition, and resume with no real model. The loop is proved by the state transitions, not by watching a model run.

## Reference — canonical implementation

The Codex goal feature is the worked example: an extension crate plugged into a lifecycle API, a SQLite row per thread, and an idle/resume runtime. Load-bearing files (full list in the source doc above):

| Concern | File |
| --- | --- |
| Whole feature (contributor traits + tools) | `codex-rs/ext/goal/src/extension.rs` |
| Idle loop + resume | `codex-rs/ext/goal/src/runtime.rs` |
| Anti-drift prompt | `codex-rs/ext/goal/templates/goals/continuation.md` |
| Schema (one row per thread) | `codex-rs/state/goals_migrations/0001_thread_goals.sql` |
| Status model | `codex-rs/state/src/model/thread_goal.rs` |
| CRUD + budget auto-transition | `codex-rs/state/src/runtime/goals.rs` |
