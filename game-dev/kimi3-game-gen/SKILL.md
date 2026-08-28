---
name: kimi3-game-gen
description: Builds web games and interactive web apps by replicating the KIMI3 vibecoding-webapp-swarm workflow — Document-Driven Development (DDD) with parallel coder agents. This skill should be used when generating a playable game or webapp (e.g. Vampire Survivors-style games, arcade games, interactive demos) that needs a complete experience (logic, procedural art, audio) with no asset files, or when orchestrating multi-agent parallel development with git branch isolation, frozen interface contracts, and tsc self-validation.
---

# KIMI3 Game Gen — Document-Driven Game Development

## Overview

Replicates KIMI3's "vibecoding-webapp-swarm" workflow: a Document-Driven Development (DDD) pipeline that produces a complete, playable browser game (logic + procedural art + procedural audio) from a short user prompt, by orchestrating multiple specialized agents in parallel with frozen interface contracts.

The output is a single static React + TypeScript + Vite + Tailwind project (≈ 42 files / ~5,000 LOC), deployed as static HTML/JS/CSS. No image, audio, or asset files are shipped — sprites are drawn on Canvas 2D and sounds are synthesized via the Web Audio API.

## When to use this skill

- User asks to "build", "generate", "make", or "vibecode" a browser game (Vampire Survivors-likes, bullet hells, arcade, roguelikes, idle clickers, top-down shooters, etc.).
- User asks to replicate a classic game (Pac-Man, Snake, Tetris, Pong, Breakout, Asteroids, etc.).
- User asks to "ship a complete webapp in one shot" with logic + art + audio, no asset pipeline.
- User asks to set up a multi-agent parallel coding workflow with frozen contracts.

Do **not** use this skill for: 3D games (use Babylon/Three/Unity stack), apps requiring real asset pipelines, native/mobile, server-side games, or projects that need an art team — this workflow's strength is "zero assets, full experience".

## Workflow (TL;DR)

```
Stage 1: Design        → Designer agent emits N design-docs (one per concern)
Stage 2: Scaffold      → Scaffold agent builds types.ts / store.ts / engine.ts / systems/* + data tables
Stage 3: Parallel Dev  → N Coder agents on isolated git branches, each owns a file list, tsc self-checks
Stage 4: Delivery      → Main agent merges, full tsc, vite build, static deploy
```

Read [`references/workflow-stages.md`](references/workflow-stages.md) for the full stage-by-stage playbook.

## Tech stack (fixed)

| Layer       | Choice                                | Rationale                                                         |
| ----------- | ------------------------------------- | ----------------------------------------------------------------- |
| Language    | TypeScript (strict)                   | `tsc -b --noEmit` is the only mandatory self-check               |
| Framework   | React 19                              | Spec-driven; latest stable                                        |
| Styling     | Tailwind CSS                          | Global theme tokens, zero CSS authoring friction                 |
| Build       | Vite                                  | `vite build` is the single command; ~470 modules typical         |
| Render      | Canvas 2D (main) + WebGL2 (FX layer)  | `enemies.ts` draws programmatic silhouettes; `fxgl.ts` does bloom |
| Audio       | Web Audio API (zero files)            | `OscillatorNode` / `GainNode` / `BiquadFilter` / `Convolver`     |
| State       | Zustand                               | `store.ts` is the global state root                              |
| Engine      | Fixed-timestep loop in `engine.ts`    | `dt = 1/60`, decoupled from render rate                          |
| Deploy      | Static `dist/` → CDN                  | `website_version_manager build_version` returns `version_id`     |

Read [`references/tech-stack.md`](references/tech-stack.md) for deeper rationale and code-shape conventions.

## Core contracts (the "frozen skeleton")

These rules are what make parallel agents safe to run at the same time.

1. **File ownership isolation** — Each Coder agent gets an explicit allow-list of files. Crossing the boundary is a contract violation. See [`references/file-ownership.md`](references/file-ownership.md).
2. **Interface signature freezing** — Once Stage 2 (scaffold) merges `types.ts`, `store.ts`, `engine.ts`, and `systems/*.ts` signatures, they are immutable. Coder agents implement bodies only.
3. **Git branch isolation** — Each agent works on its own branch (`agent/<name>`); the main agent merges & resolves conflicts.
4. **Self-validation loop** — Before every commit: `npx tsc -b --noEmit` must pass. No dev server is started by Coder agents — only by the main agent post-merge.
5. **Procedural-first assets** — Default to `ctx.arc` / `ctx.fillPath` silhouettes and synthesized audio. Only fall back to AI-generated images for hero/key art, never for sprites-at-scale.

## Stage 1 — Design (Designer agent)

Spawn one Designer agent. It reads [`assets/design-doc-template.md`](assets/design-doc-template.md) and emits one Markdown file per concern, into `/mnt/agents/output/design/`. Use [`references/gdd-template.md`](references/gdd-template.md) as the section checklist (adapted from `C:\Git-repo-my\GDDMarkdownTemplate`).

Typical output: ~6 docs / ~65 KB total covering concept, gameplay, systems, art direction, audio direction, technical risk register.

## Stage 2 — Scaffold (Scaffold agent)

Run [`scripts/scaffold-webapp.ps1`](scripts/scaffold-webapp.ps1) (or `scaffold-webapp.sh` under Git Bash / WSL). Then have the Scaffold agent emit:

```
src/
├── types.ts          ← ALL shared types, frozen
├── store.ts          ← zustand global state, signatures frozen
├── engine.ts         ← fixed-timestep loop, signatures frozen
├── systems/
│   ├── input.ts      ← signatures frozen, body empty/stub
│   ├── spawner.ts
│   ├── combat.ts
│   ├── pickups.ts
│   ├── weapons.ts
│   ├── upgrades.ts
│   ├── enemies.ts
│   ├── player.ts
│   ├── fx.ts
│   └── audio.ts
├── data/
│   ├── weapons.ts    ← full data tables (allowed to be complete here)
│   ├── passives.ts
│   └── enemies.ts
└── pages/, components/   ← placeholders or full implementations
```

Then `git commit` and create one branch per Coder agent.

## Stage 3 — Parallel Development (Coder agents)

For each design-doc, spawn a Coder agent on its own git branch. Each agent:

1. Runs `setup-local.sh` to install deps in isolation (or `npm ci` if no script).
2. Reads its assigned design-doc section only.
3. Implements ONLY its allow-listed files.
4. Runs `npx tsc -b --noEmit` until clean.
5. Commits on its branch.

Use Kilo's `agent_manager` tool with `mode: "worktree"` to fan out N agents in parallel — each gets an isolated worktree, and the main agent merges after all are green.

## Stage 4 — Delivery (main agent)

1. `git merge --no-ff agent/<name>` for each branch.
2. Resolve any conflicts (mostly cosmetic — signatures were frozen).
3. `npx tsc -b --noEmit` — full project type-check.
4. `npm run build` — Vite production build.
5. `website_version_manager build_version` (or any static-host deploy) → captures `version_id`.
6. Optional: smoke-test the built `dist/index.html` in a headless browser.

## Worked example — "Blood Moon Survivors"

A real KIMI3 case (see [`references/kimi3-analysis.md`](references/kimi3-analysis.md)): user gave a 2-line prompt ("build a Vampire Survivors-like" + "fix the boss HP bar bug"), and the system produced ~5,000 LOC, deployed to `https://iwgf77mjicz7o.ok.kimi.link/`.

Architecture that emerged:

```
React App
└── GameScreen.tsx
    └── GameEngine (class, rAF loop)
        ├── engine.ts       — fixed timestep 1/60
        ├── player.ts
        ├── enemies.ts      — 12 enemy AIs + 3 bosses (WeakMap sub-state)
        ├── spawner.ts      — wave timeline + difficulty multiplier
        ├── combat.ts       — spatial hash O(n) collision
        ├── pickups.ts      — XP gems / chests / magnet
        ├── weapons.ts      — 12 weapons + 8 evolutions + projectile pool
        ├── upgrades.ts     — card weights / evolution gates
        ├── fx.ts           — particles / shake / hitstop / damage numbers
        ├── audio.ts        — Web Audio procedural
        ├── input.ts        — virtual joystick + keyboard fallback
        └── store.ts        — zustand (settings persisted to localStorage)
```

## Reference index

- [`references/workflow-stages.md`](references/workflow-stages.md) — detailed stage playbook
- [`references/tech-stack.md`](references/tech-stack.md) — stack rationale + code shapes
- [`references/gdd-template.md`](references/gdd-template.md) — design-doc section checklist (GDDMarkdownTemplate)
- [`references/file-ownership.md`](references/file-ownership.md) — isolation rules + frozen contracts
- [`references/kimi3-analysis.md`](references/kimi3-analysis.md) — raw analysis that informed this skill (Astrocade vs Kimi tech-stack comparison, original SKILL excerpts)

## Resources

### scripts/
- [`scripts/scaffold-webapp.ps1`](scripts/scaffold-webapp.ps1) — Windows PowerShell scaffold (Vite + React 19 + TS strict + Tailwind v3)

### references/
- `workflow-stages.md` — stage-by-stage playbook
- `tech-stack.md` — stack details
- `gdd-template.md` — design-doc checklist
- `file-ownership.md` — isolation + contracts
- `kimi3-analysis.md` — raw analysis source (Astrocade comparison, original skill excerpts)

### assets/
- [`assets/design-doc-template.md`](assets/design-doc-template.md) — blank design-doc skeleton the Designer agent fills in