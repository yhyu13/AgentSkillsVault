# Workflow Stages — Detailed Playbook

The KIMI3 DDD pipeline in four stages. Each stage has a single owner agent and a clear exit criterion.

## Stage 1 — Design

**Owner:** Designer agent (single).

**Inputs:**
- User's one- or two-sentence prompt.
- [`assets/design-doc-template.md`](../assets/design-doc-template.md) — blank skeleton.
- [`references/gdd-template.md`](gdd-template.md) — section checklist (full GDDMarkdownTemplate condensed).

**Outputs:**
- N Markdown files in `/mnt/agents/output/design/` (or local `docs/design/`).
- One file per concern; no file should exceed ~15 KB.
- Total ~6 docs, ~65 KB, ~6,000 words for a Vampire-Survivors-scale game.

**Recommended doc split** (adapt to scope):

| File                  | Sections from GDDMarkdownTemplate                             |
| --------------------- | ------------------------------------------------------------- |
| `00-concept.md`       | §3 Game Overview (concept, genre, flow, look & feel)         |
| `01-gameplay.md`      | §4 Gameplay & Mechanics (progression, combat, economy)       |
| `02-story-world.md`   | §5 Story, Setting, Character + §6 Levels                    |
| `03-interface.md`     | §7 Interface (HUD, menus, controls, audio direction)         |
| `04-ai-systems.md`    | §8 Artificial Intelligence (enemy AI, support AI)            |
| `05-tech-risk.md`     | §9 Technical + §10 Art + risk register                        |

**Exit criterion:**
- Every system the game will need is named and bounded.
- Every data-table (`weapons.ts`, `enemies.ts`, etc.) has its schema defined.
- The Designer agent can hand each doc to a separate Coder agent with zero ambiguity.

## Stage 2 — Scaffold

**Owner:** Scaffold agent (single, main thread).

**Inputs:**
- All Stage 1 design-docs.
- [`scripts/scaffold-webapp.ps1`](../scripts/scaffold-webapp.ps1).

**Steps:**
1. Run the scaffold script to create a clean Vite + React 19 + TS strict + Tailwind v3 project.
2. Add zustand: `npm i zustand`.
3. Author the frozen skeleton:
   - `src/types.ts` — all shared types.
   - `src/store.ts` — zustand store with frozen action signatures.
   - `src/engine.ts` — fixed-timestep loop skeleton.
   - `src/systems/*.ts` — one stub per system, signatures frozen.
   - `src/data/*.ts` — full data tables.
4. Smoke-test: `npx tsc -b --noEmit` must pass.
5. Commit to `master`. Then `git checkout -b agent/<system-name>` for each Coder agent.

**Exit criterion:**
- `tsc -b --noEmit` is green on `master`.
- Every system name in the design-docs has a matching `systems/<name>.ts` stub.
- Every data-table has a matching `data/<name>.ts` with at least one row.

## Stage 3 — Parallel Development

**Owner:** N Coder agents in parallel, each on its own git branch.

**Fan-out pattern (Kilo `agent_manager`):**
```
agent_manager(
  mode: "worktree",
  tasks: [
    { prompt: "...", branchName: "agent/player",  displayName: "Player & Input"  },
    { prompt: "...", branchName: "agent/enemies", displayName: "Enemies & AI"     },
    { prompt: "...", branchName: "agent/weapons", displayName: "Weapons & Combat"},
    ...
  ]
)
```

**Per-agent contract:**
1. Read your assigned design-doc section **only**.
2. Implement ONLY your allow-listed files (see [`file-ownership.md`](file-ownership.md)).
3. Run `npx tsc -b --noEmit` until clean.
4. `git add` only your allow-listed files (a pre-commit guard or careful review).
5. Commit on your branch.
6. Report back to main agent.

**Forbidden for Coder agents:**
- Starting a dev server.
- Editing files outside your allow-list.
- Modifying any signature in `types.ts` / `store.ts` / `engine.ts`.
- Adding new dependencies.

**Exit criterion (per agent):**
- Branch builds with `tsc` clean.
- Commit message references the design-doc section it implements.

## Stage 4 — Delivery

**Owner:** Main agent.

**Steps:**
1. `git fetch` all agent branches.
2. `git merge --no-ff agent/<name>` in a planned order (leaf → root).
3. Resolve conflicts (mostly cosmetic — signatures are frozen).
4. `npx tsc -b --noEmit` — full project type-check.
5. `npm run build` — Vite production build.
6. Verify `dist/index.html` is a self-contained static bundle.
7. Deploy via `website_version_manager build_version` (or equivalent static host). Capture `version_id`.
8. Optional: headless browser smoke-test the deployed URL.
9. Report URL + `version_id` to the user.

**Exit criterion:**
- Build green, deploy green, URL responds 200, game loads and is interactive.

## Failure modes & recovery

| Symptom                                        | Likely cause                                  | Fix                                                           |
| ---------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------- |
| `tsc` fails after merge                        | Two agents widened the same type             | Revert both, redefine in `types.ts`, re-run agents           |
| Branch conflicts in non-frozen file             | Shared `data/*.ts` edited by two agents       | Move table to per-system data file; re-scaffold               |
| Build > 1500 modules                           | Library leak / accidental dep                 | `npm ls`, purge, replace with procedural impl                 |
| Game runs but no audio                         | AudioContext not resumed (autoplay policy)    | Resume on first user gesture; do not autoplay                |
| Canvas blurry on HiDPI                         | Missing DPR scaling                           | Scale ctx by `devicePixelRatio` in resize handler            |
| First frame jitters                            | `update(dt)` running with real frame dt       | Accumulator + fixed 1/60 step (see `engine.ts`)              |

## Metric targets

A healthy KIMI3-style run produces:

- Total LOC: ~5,000
- Files: ~42
- Build modules: ~470
- `tsc` clean across all stages
- Two user prompts to playable URL

If any metric is wildly off, revisit the design-doc scope.