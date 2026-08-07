# Design Doc Template — `<doc-name>.md`

The Designer agent fills one of these per concern (see [`references/workflow-stages.md`](../references/workflow-stages.md) Stage 1 for the canonical 6-doc split). Keep it tight — each doc targets ~10 KB / ~1,500 words.

> Tip: link, don't duplicate. If a section depends on another doc, link to its path (`../01-gameplay.md#loot-tables`).

---

# <Doc Title>

> Status: **DRAFT** → **READY** (when Stage 1 exit criterion is met)
> Owner: Designer agent
> Reads by: <list the Coder agents that will read this>

## 1. Purpose

One paragraph. What system or concern does this doc define? Why is it its own doc?

## 2. Scope

In-scope and out-of-scope, both as bullet lists. Anything not in scope must live in another doc.

## 3. Domain model

The types and constants this doc owns. These go verbatim into `src/types.ts` (frozen at Stage 2).

```ts
export interface <Name> {
  // fields with inline rationale comments only when non-obvious
}
```

If this doc introduces a new type, **paste the exact TypeScript** that will be merged into `types.ts`. Coder agents must not invent their own shape.

## 4. Behavior

- Inputs / outputs.
- State transitions (state machine diagram in Mermaid if useful).
- Formulas (damage, XP curve, spawn rate). Use code fences, not prose.
- Edge cases and how they are handled.

## 5. Data tables

If this doc introduces a `data/*.ts` table, paste the schema and 1–2 representative rows. The Scaffold agent will seed the rest in Stage 2.

```ts
export const <TABLE>: <RowType>[] = [
  // ...representative rows only
];
```

## 6. Files this doc owns (Stage 3 contract)

List the exact `src/...` paths a Coder agent reading this doc is allowed to edit. Anything not listed is forbidden.

```
src/systems/<this-system>.ts
src/data/<this-table>.ts
```

If a file needs to be touched by multiple agents (rare), say so explicitly and document the merge order.

## 7. Acceptance criteria

A checklist the Coder agent can self-verify before commit:

- [ ] `<criterion 1>`
- [ ] `<criterion 2>`
- [ ] `npx tsc -b --noEmit` is clean
- [ ] No files outside §6 were modified

## 8. Open questions

Anything unresolved. The main agent should answer these before Stage 2 commits `types.ts`.

---

## Notes for the Designer agent

- Prefer **concrete numbers** over adjectives ("spawns 4 enemies/sec, +0.5/sec/min" beats "spawns increase over time").
- One concern per doc. If you're writing "and also the UI for it", split.
- Reference `references/gdd-template.md` for which GDDMarkdownTemplate sections map here.
- Reference `references/file-ownership.md` for what a Coder agent is/isn't allowed to touch.