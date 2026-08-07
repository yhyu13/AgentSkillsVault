# Automatic review routing for Kanban campaigns

Use this when a dependency-gated campaign stalls because an implementation worker marked completed work `blocked` only to request review.

## Classification

Review is normally a downstream role, not human input.

Treat the implementer role as complete when all are true:

- the approved bounded implementation exists;
- its required handoff/report ends in a completion status;
- required tests and static checks are green;
- the block reason is only `review-required` or equivalent;
- an independent auditor or verifier is already linked downstream.

This does **not** approve the product, authorize a commit, or turn a later `FAIL` into `PASS`.

## Recovery procedure

1. Inspect the blocked task, run history, log, report, and board dependencies.
2. Confirm there is no product/specification failure or unresolved human decision.
3. Add a comment explaining that implementation-role completion merely routes work to independent review.
4. Complete the implementer role with a structured handoff containing changed files, checks, limitations, and no-commit/no-push status.
5. Dispatch at most one existing downstream auditor/verifier.
6. Re-read it and require a genuine `running` state with a new run/PID.
7. Let auditor/verifier complete their role with either `PASS` or `FAIL`; the overseer decides `GO`, `REWORK`, or `STOP`.

## Why this matters

Repeatedly blocking completed implementation as `needs_input` can trigger block-loop detection and automatic decomposition, creating a duplicate planner/implementer/verifier graph around work that already has a review chain. Prefer the original dependency graph and do not create speculative replacement cards.

## Watchdog rule

A project-scoped caretaker may apply this routing repair automatically only for a generic review convention. It must fail closed for missing specification decisions, credentials, destructive choices, genuine quality failures, overseer `STOP`, or exhausted repair limits.
