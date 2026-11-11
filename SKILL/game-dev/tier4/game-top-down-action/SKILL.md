---
name: game-top-down-action
description: Design and build top-down action games — tilemap vs arena sub-modes, 8-way movement, dash, mouse aim, directional sprites, and level proportions.
---

# Top-Down Action Game Design

## When to use

- Overhead-view games with free movement: dungeon crawlers, twin-stick shooters, survivor-likes, space shooters.

## Decide the sub-mode FIRST

| Sub-mode | World | Best for | Detect via |
|---|---|---|---|
| Tilemap | Designed map, follow camera, exploration | Dungeons, room-clearing, RPG combat | dungeon, exploration, maze, adventure |
| Arena | Fixed screen, scrolling backdrop, waves | Space shooters, bullet hell, survival | shooter, bullet hell, survival, endless, waves |

Default when unclear: **tilemap**. The two modes share nothing at the level layer — tilemap uses dual tilesets and designed maps; arena uses a scrolling background and dynamic spawning. Never mix.

## Mechanics

- **8-way movement** with diagonal normalization (diagonals are not faster).
- **Mouse aiming**: 360° facing from the pointer.
- **Dash**: short burst with invulnerability frames and a cooldown — replaces jumping. No gravity, no jumping, ever.
- **Combat**: melee (attack zone that follows facing; roots the player briefly) and/or ranged (fires toward the mouse; player is NOT rooted — twin-stick).
- **AI**: patrol (2D wandering), chase (with a stop distance — ranged enemies stop and shoot, melee get close), stationary, or custom phase-based bosses.

## Proportions (tile = 64 px)

Player and normal enemies are exactly 1 tile tall. Bosses 1.25 tiles. Obstacles/props 0.75 tile. Projectiles ~0.15 tile. Camera zoom stays at 1.0; a compact map (~18×12 tiles) fills the screen naturally. Anti-pattern: a huge map with zoomed-out camera — everything feels tiny and empty.

## Tilemap-mode level design

- Copy predefined templates (open field, maze corridors, symmetric arena, boss chamber). Never design from scratch — the map pipeline validates known templates.
- Dual tilesets per theme: simple flat floor tiles + clearly contrasted wall tiles. Generate the map twice (floor pass with spawn markers, wall pass for collision).
- Outer border stays solid; spawn region left/center; boss/exit region right/center. Obstacles come in pairs and sit on floor tiles; they are physics sprite props (crates, barrels), NOT tiles, and they block movement like walls while being Y-sorted with characters.
- Map dimensions must equal ASCII columns × tile size — count rows carefully.

## Arena-mode rules

- The screen IS the world; the camera is static; the player is confined to screen bounds.
- One seamlessly tiling scrolling background (or a solid color). No tilesets, no maps.
- Enemies spawn dynamically on a timer that tightens as difficulty ramps (default every 30 s). Spawn off-screen with velocity toward the play area.
- Optional boss: after a kill threshold, pause spawning, spawn the boss, resume after its death. Score events feed the HUD.

## Directional animation rules

Views beat frames. Per action, generate front/back/side images (one frame each; side faces right, flip in code). Hero actions: idle, walk, melee, shoot, dash, die (die can be front-only). Characters resolve the base animation key to the direction suffix at runtime, with the base key as a safe fallback.

## Screen-shake restraint

Shake on damage taken and death only. Never on shooting or melee swings — at high fire rates constant shake is disorienting. Dash feedback is a trail effect, not a shake.

## Common mistakes

| Wrong | Right |
|---|---|
| Jump/gravity in top-down | Dash instead |
| One direction for sprites | Three directions per action |
| 2-frame × 1 direction | 1 frame × 3 directions |
| Inventing scene state groups | Use only the engine's auto-initialized groups |
| Screen shake on every shot | Shake only on damage/death |
| Single tileset | Dual floor + wall tilesets (tilemap mode) |
| Arena game with a tilemap | Scrolling background + dynamic spawns |
| Pre-placing enemies in arena | Spawn them on a timer |
| Character height = 2 tiles | 1 tile |
| Decision logic re-run every frame | Decide once per phase transition, flag it |
