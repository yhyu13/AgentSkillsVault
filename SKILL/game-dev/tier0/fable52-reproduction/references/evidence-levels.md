# Evidence levels and claim records

## Claim record

Use one record per testable statement. Keep them in `reports/evidence/claims.json` or alongside the dump that consumes them.

```yaml
claim_id: string
demo_id: string
statement: string            # one testable proposition, not a paragraph
observed_version: string     # commit, build hash or capture id; "unknown" is allowed
evidence_refs: [string]
evidence_type: direct_source | runtime_capture | static_inference | visual_observation | third_party_claim
confidence: confirmed | supported | tentative
derivation: string           # how the evidence supports the statement
unknowns: [string]
```

- `confirmed`: first-hand evidence covers the statement and the version is pinned.
- `supported`: several consistent observations, with listed unknowns.
- `tentative`: a hypothesis. It must not appear in a "reproduced capability" list.

## Level boundaries

| Claim | Minimum level | Still not proven |
|---|---|---|
| A function exists at line N | direct_source | That it runs, or that it matters |
| The page requested 16 modules | runtime_capture | That the app is playable end to end |
| The material uses an ORM layout | direct_source of the channel writes | That the render matches the reference |
| The scene contains 4 lights | direct_source code or a runtime traversal | The intended lighting design |
| The result looks close | visual_observation | Internal algorithms, performance or parity |
| The author says it took 41 minutes | third_party_claim | Unattended generation or a clean run |

## Common invalid shortcuts

- Line numbers quoted from an unpinned copy; a blob hash is not a commit hash.
- "The variable is named `isPCSS`, therefore shadows are PCSS." Naming is not implementation; check the code path and one observable difference.
- "The texture is 2048², therefore it is high quality." Resolution says nothing about content or filtering in context.
- "The console was empty, therefore there are no errors." Record which console, which reload, and what the network panel showed.
- "Two runs produced the same initial state, therefore the app is deterministic." It shows one repeated state, not bitwise cross-browser determinism.
- "The dump validated, therefore the reproduction is faithful." Validation covers structure and declared relations only.

## Identity and authorship

Distinguish three statements that are often merged:

1. the object exists in this run;
2. the constructor or loader call that created it was observed in the same run;
3. the author, model or process behind the source is known.

A captured UUID proves (1). A same-run stack proves (2) for that call. Neither proves (3). When only (1) is available, write `identity: not_captured` and keep the gap visible in the report; do not infer authorship from names, timing or visual style.
