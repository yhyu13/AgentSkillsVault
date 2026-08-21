---
name: game-grid-logic
description: Design and build discrete grid games — puzzle, roguelike, tactics, match-3, and arcade sub-types, level design, advanced mechanics, and difficulty scaling.
---

# Grid Logic Game Design

## When to use

- Everything snaps to a grid and moves in discrete steps: Sokoban, sliding puzzles, match-3, tactics, snake-like arcade, grid roguelikes.

## Detect the sub-type first

| Sub-type | Timing | Input | Deciding question |
|---|---|---|---|
| Puzzle | Step | Direction keys | Each input = one discrete move? |
| Roguelike | Step | Direction keys + action key | Step-based with combat and enemy AI? |
| Tactics | Turn | Click to select, click to move | Units take turns with movement ranges? |
| Match | Freeform | Click/swap cells | Matching cells clear and cascade? |
| Arcade | Realtime | Direction keys on a timer | Game advances on a timer? |

Default: puzzle (step mode). Roguelike = puzzle timing plus combat, HP, and a three-phase turn (player acts → world reacts → enemies act).

## Core loops

- **Puzzle**: observe → plan → move → evaluate → repeat. Undo available when stuck.
- **Tactics**: select unit → highlight range → move/act → end turn → enemy turn.
- **Match**: swap adjacent cells → 3+ match clears → gravity drops pieces → chains → score.
- **Roguelike**: move or bump-attack → traps/terrain trigger → each enemy takes one step → check win/lose.
- **Arcade**: input between ticks → tick advances state → speed increases over time.

## Level design

- Grids are code-defined 2D arrays — not tilemaps, not physics. This is deliberate: cells mutate at runtime (holes filled, doors opened, items collected), and a single data authority avoids sync bugs.
- Typical sizes: 6–16 cells per side for puzzle, up to 20×20 for tactics. Default cell 64 px. Center the grid on screen with computed offsets.
- Cell vocabulary: empty, wall, floor, goal, hazard, spawn, special, ice, portal.
- Design rules: walls form the boundary; one spawn per player entity; every goal must be reachable; every puzzle must have at least one solution; introduce mechanics gradually; symmetric boards feel fair; avoid dead-end states (or guarantee undo).
- For levels with entities on walkable cells, use a **dual-layer map**: one layer for terrain, one for entity placement — avoids symbol conflicts.
- Copy predefined board templates (small/medium puzzle, large tactics, match-3 board) rather than designing freehand.

## Entity design

Each entity type declares: type string (unique), walkable/pushable/destructible flags, and optional HP. Common types: player, pushable box, wall block, enemy, collectible (walkable + destructible), goal marker, bomb, ice, portal. Visually distinct per type; ~80% of a cell.

## Undo scope

The built-in undo saves cell types and entity positions only. HP, cooldowns, facing, inventory flags, and game-specific state must be snapshotted/restored via custom undo hooks.

## Combat design (roguelike/tactics)

- Bump attack: moving into an enemy deals damage instead of moving. Typical damage 1–3.
- Special ability on the action key: 2–4 cell range, 3–5 turn cooldown, 2–5 damage.
- Enemy AI: chaser (pathfinds toward the player), patroller (fixed pattern, reverses at walls), static emitter (area effect every N turns).
- HP: player 3–10, basic enemies 1–2, tough 3–5, boss 8–15. Healing is rare and small.
- Initialize timers to their actual duration, never zero — a zeroed timer fires on the first frame.

## Advanced mechanics (layer them gradually)

- **Ice sliding**: entity keeps moving until blocked; triggers interactions at every intermediate cell.
- **Portal pairs**: entering a portal teleports to its pair; one-way per step.
- **Elemental conduction**: abilities react to cell/entity types (electric + water = connected-area damage; use connected-region detection for large water bodies).
- **Turrets**: fire along a fixed line every N turns with per-turret initial delay — creates timing puzzles.
- Combinations: ice + portals, ice + turrets, conduction + turrets. Teach one per level, combine later.

## Difficulty scaling

- Puzzle: grow grid 6×6 → 10×10, add ice then hazards, then move limits.
- Match-3: grow piece variety 4 → 6 colors, tighten move limits, add clear-specific-color objectives.
- Tactics: 1 unit vs 2 → 3 units vs mixed squads + boss, then terrain effects.
- Roguelike: add patrollers, emitters, locked doors, traps, then a boss.

## Polish

- Feedback per action: smooth move tween, push delay, collect shrink/fade, match burst + bounce drop, chain delay for drama, bump recoil, red damage tint flash.
- Distinct sounds for move, push, collect, attack, damage, wall bump, win, lose, undo. Chain combos rise in pitch.
- Selection/highlight: pulsing border on selection, blue movement range, red attack range, red flash on invalid moves.
- Status display via UI events (HP, score, move count, status line) — not in-world sprites.

## Forbidden

Continuous physics, free real-time movement, multiplayer, hex grids, isometric/3D rendering, procedural level generation, persistent save/load, tilemap-based maps.
