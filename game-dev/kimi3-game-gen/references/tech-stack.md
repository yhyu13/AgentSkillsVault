# Tech Stack Reference

The fixed stack for every project generated through this skill. Do not deviate without a written justification in the design-doc.

## Layered view

| Layer       | Choice                       | Why this choice                                                           |
| ----------- | ---------------------------- | ------------------------------------------------------------------------- |
| Language    | TypeScript (strict)          | Coder agents self-validate with `tsc -b --noEmit`; no test framework      |
| Framework   | React 19                     | Component model fits per-system React pages; latest stable               |
| Styling     | Tailwind CSS (v3)            | Global theme tokens in `tailwind.config.js` + `src/index.css`            |
| Build       | Vite 5+                      | Single `npm run build`, fast HMR for the post-merge smoke test          |
| Render      | Canvas 2D + WebGL2 FX layer  | 2D for game world (simple, debuggable), GL for bloom/shockwave           |
| Audio       | Web Audio API, no files      | `sfx.ts` + `bgm.ts` synthesize everything in-browser                     |
| State       | Zustand                      | One `store.ts`, slices per system; persists settings to `localStorage`  |
| Engine      | Fixed-timestep loop          | `engine.ts` owns `update(dt=1/60)` + `render(alpha)`                     |
| Input       | Virtual joystick + keyboard  | Touch + desktop fall back; pointer events on canvas overlay              |
| Deploy      | Static `dist/` → CDN         | `website_version_manager build_version` returns immutable `version_id`   |

## Code-shape conventions

### `types.ts` — the contract root

Holds **every** shared type. Once committed in Stage 2, signatures here are immutable. Coder agents only consume them.

```ts
export type Vec2 = { x: number; y: number };

export interface Entity {
  id: number;
  pos: Vec2;
  vel: Vec2;
  hp: number;
  radius: number;
  faction: 'player' | 'enemy' | 'neutral';
  alive: boolean;
}

export interface Weapon { /* ... */ }
export interface Passive { /* ... */ }
export interface EnemyKind { /* ... */ }
export interface UpgradeCard { /* ... */ }
export interface GameState { /* ... */ }
```

### `store.ts` — zustand global state

```ts
import { create } from 'zustand';

export const useGame = create<GameState>((set, get) => ({
  // ...slices defined as plain actions, signatures frozen
}));
```

### `engine.ts` — the loop

```ts
export class GameEngine {
  start(): void { /* sets up rAF */ }
  pause(): void { /* ... */ }
  // signatures frozen; Coder agents implement body if their file owns this
}
```

Convention: `engine.ts` calls `update(dt)` on systems in a fixed order each tick; Coder agents fill in the system bodies.

### `systems/*.ts` — pure-update modules

Each system exports an `update(state, dt)` and an optional `render(ctx, state, alpha)`. Signatures frozen.

### `data/*.ts` — content tables

These are **allowed to be complete** in Stage 2 because data is leaf-level (no shared types beyond what `types.ts` declares). Coder agents do not touch data tables unless their design-doc says so.

## Why no test framework

KIMI3 chose `tsc` as the only mandatory gate. Rationale:

- Type errors surface integration bugs that runtime tests miss (signature drift across parallel agents).
- A test suite across N parallel agents requires a shared test harness that itself becomes a coupling point.
- Visual / gameplay correctness is verified by a human playtest post-merge, not by unit tests.

If the user explicitly asks for tests, add Vitest for the `systems/` and `data/` layers, but never let it block Stage 3 agent commits.

## Anti-patterns to avoid

- ❌ Adding a router (`react-router`, etc.) — games are single-screen.
- ❌ Using a state library other than Zustand — store.ts is frozen.
- ❌ Importing image/audio assets — procedural-first.
- ❌ Touching `node_modules/` — agents edit source only.
- ❌ Starting a dev server from a Coder agent — main agent does the smoke test.

## Bundle size sanity check

A typical KIMI3 game ships ≈ 468 modules in `dist/`. If your build is under 100 modules you're probably under-scoping the design-doc; if it's over 1500 modules you're probably leaking a library that should be procedural.