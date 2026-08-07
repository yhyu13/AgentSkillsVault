# Repeated worker crash recovery

Use this when Kanban auto-blocks a card after consecutive worker exits.

## Diagnostic sequence

```text
hermes kanban show <task-id>
hermes kanban runs <task-id>
hermes kanban log <task-id>
hermes kanban diagnostics
```

Interpretation:

- `pid ... not alive` describes the dispatcher-visible exit, not necessarily the root cause.
- The worker log is authoritative for provider errors, tool failures, oversized context, or an explicit worker block.
- Multiple long attempts that fail at similar context sizes suggest retrying unchanged will reproduce the failure.

## Recovery sequence

1. Preserve the card's acceptance criteria.
2. Add a comment that constrains only the execution path: exact files to read, prohibited broad discovery, concise output shape, and whether edits are allowed.
3. Unblock with a reason that records the diagnosis.
4. Run one dispatch pass.
5. Check `kanban_show` and confirm a fresh run is `running`.

Example recovery instruction for a planning card:

```text
Keep this pass compact and read-only. Read only the named design document and project instructions. Do not inspect implementation code or perform broad searches. Return a concise structured plan through the normal Kanban completion handoff.
```

Do not persist a transient provider error as a universal tool limitation. The durable lesson is to inspect logs, reshape the retry to reduce unnecessary context, and verify the respawn.