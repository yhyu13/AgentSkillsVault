# File Ownership & Frozen Contracts

The rules that make Stage 3 safe to fan out in parallel. Every Coder agent gets a copy of this file in its prompt.

## The four invariants

1. **File ownership isolation** — each agent edits only its allow-listed files.
2. **Interface signature freezing** — `types.ts`, `store.ts`, `engine.ts`, `systems/*.ts` signatures are immutable once Stage 2 commits.
3. **Git branch isolation** — one branch per agent; main agent merges.
4. **Self-validation** — `npx tsc -b --noEmit` must pass before commit.

Violating any of these is a contract violation. If you need to, surface it back to the main agent — do not silently fix it.

## Canonical file tree

```
src/
├── types.ts            ← FROZEN (Stage 2)
├── store.ts            ← FROZEN signatures (Stage 2)
├── engine.ts           ← FROZEN signatures (Stage 2)
├── systems/
│   ├── input.ts        ← FROZEN signature, body = stage-3
│   ├── player.ts       ← FROZEN signature, body = stage-3
│   ├── enemies.ts      ← FROZEN signature, body = stage-3
│   ├── spawner.ts      ← FROZEN signature, body = stage-3
│   ├── combat.ts       ← FROZEN signature, body = stage-3
│   ├── weapons.ts      ← FROZEN signature, body = stage-3
│   ├── pickups.ts      ← FROZEN signature, body = stage-3
│   ├── upgrades.ts     ← FROZEN signature, body = stage-3
│   ├── fx.ts           ← FROZEN signature, body = stage-3
│   └── audio.ts        ← FROZEN signature, body = stage-3
├── data/
│   ├── weapons.ts      ← CONTENT TABLE (allowed to be complete in Stage 2)
│   ├── enemies.ts      ← CONTENT TABLE
│   ├── passives.ts     ← CONTENT TABLE
│   └── upgrades.ts     ← CONTENT TABLE
├── pages/
│   └── GameScreen.tsx  ← ALLOWED for one agent (UI/UX agent)
├── components/         ← ALLOWED for one agent (UI/UX agent)
├── sfx.ts              ← helper, ALLOWED for audio agent
├── bgm.ts              ← helper, ALLOWED for audio agent
└── index.css           ← theme tokens, ALLOWED for one agent
```

## Example allow-list (Vampire-Survivors-style)

A typical 4-agent split for a medium game:

| Agent           | Branch                | Files owned                                                              |
| --------------- | --------------------- | ------------------------------------------------------------------------ |
| Player & Input  | `agent/player-input`  | `src/systems/player.ts`, `src/systems/input.ts`, `src/data/passives.ts` |
| Enemies & AI    | `agent/enemies-ai`    | `src/systems/enemies.ts`, `src/data/enemies.ts`                         |
| Weapons & Combat| `agent/weapons-combat`| `src/systems/weapons.ts`, `src/systems/combat.ts`, `src/data/weapons.ts`|
| FX & Audio      | `agent/fx-audio`      | `src/systems/fx.ts`, `src/systems/audio.ts`, `src/sfx.ts`, `src/bgm.ts` |
| (optional) UI   | `agent/ui`            | `src/pages/GameScreen.tsx`, `src/components/*`, `src/index.css`         |

Each row must be a strict subset of `src/`. Two agents must never share a file path.

## Pre-commit guard (recommended)

Add a `.husky/pre-commit` or a simple `scripts/check-ownership.sh` that diffs the staged files against the agent's allow-list (passed via env var). Reject if any file outside the allow-list is staged.

```sh
#!/usr/bin/env bash
# check-ownership.sh
ALLOW=$(echo "$AGENT_ALLOWLIST" | tr ',' '\n')
STAGED=$(git diff --cached --name-only)
for f in $STAGED; do
  echo "$ALLOW" | grep -qxF "$f" || {
    echo "BLOCKED: $f is outside your allow-list" >&2
    exit 1
  }
done
```

In the Coder agent's prompt: `export AGENT_ALLOWLIST="src/systems/player.ts,src/systems/input.ts,src/data/passives.ts"` before commit.

## What to do when a contract blocks you

If a Coder agent discovers it needs to:

- add a new field to `Entity` in `types.ts` — do **not** edit. Report: "Need to add `entity.shield: number` to `Entity`. Requesting types.ts amendment."
- call a function not declared in any frozen module — do **not** declare it inline. Report: "Need `spawnProjectile(origin, dir)` exported from `weapons.ts`. Requesting new system signature."
- read data from another agent's `data/*.ts` — usually fine (data tables are read-only contracts). If the table doesn't exist yet, stub it locally and report.

The main agent batches all such requests, edits `types.ts` / signatures once, and either re-spawns affected agents or ships a micro-patch.

## Why this works

- TypeScript's structural types catch signature drift at `tsc` time — across branches and post-merge.
- Frozen `systems/*.ts` signatures mean each agent is implementing a function shape it cannot accidentally reshape.
- Git branches isolate risk; the main agent sees all conflicts at once.
- `tsc -b --noEmit` is fast (~5s for ~5,000 LOC), so agents iterate cheaply.

## Anti-patterns

- ❌ "I'll just edit `types.ts` real quick" — never.
- ❌ Two agents touching `data/weapons.ts` — move to per-agent data file.
- ❌ Coder agent adding `npm install foo` — surface as a request; main agent owns deps.
- ❌ Branch named `master` / `main` for an agent — those are merge destinations only.