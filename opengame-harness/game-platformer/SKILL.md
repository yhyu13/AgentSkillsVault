---
name: game-platformer
description: Design and build side-scrolling platformer games — movement, combat, ultimate skills, enemy AI, level templates, and common mistakes.
---

# Platformer Game Design

## When to use

- The game is side-view with gravity: characters fall and jump.
- Brawlers, action platformers, run-and-gun, fighting-style games.

## Mechanics

- **Movement**: walk with configurable speed; jump with configurable power. Optional: coyote time (grace after leaving a ledge), jump buffering, one double jump.
- **Combat**: melee (alternating punch/kick combo) and/or ranged (projectiles). Both can coexist.
- **Ultimate skills** — pick by character fantasy:

| Skill | Style | Best for |
|---|---|---|
| Dash attack | Linear charge with trail | Melee, fast characters |
| Targeted AOE | Lock target, strike at position | Ranged, area denial |
| Area damage | Burst around player | Berserker, close combat |
| Beam | Horizontal laser | Tech, long range |
| Ground quake | Slam, grounded enemies only | Heavy, crowd control |
| Targeted execution | Lock target, instant kill | Assassin |
| Boomerang | Returning projectile | Thrown weapons |
| Multishot | Spread of N projectiles | Gunner/mech |
| Arc projectile | Gravity arc, optional explosion | Siege, arcing throws |

- **Enemy AI**: patrol (back-and-forth), chase (follow when detected), stationary (turrets), or custom (phase-based bosses — e.g., patrol above half health, chase below).

## Level design discipline

- If the user doesn't specify level count: design **one level**.
- **Copy predefined map templates** (tutorial flatlands, vertical climb, combat fortress, boss chamber). Never invent ASCII maps from scratch — downstream tooling validates known templates.
- Allowed modifications only: add/remove coins, platforms, enemies (max ~4); adjust solid block shapes while keeping 2-tile thickness.
- Never change: map dimensions, the solid bottom rows, spawn position (left), exit/boss position (right). Enemy spawns need 3+ tiles of flat floor.
- Symbols: dot = air, hash = solid, equals = one-way platform, P = player spawn, E = enemy spawn, B = boss, C = coin, D = door.

## Animation rules

- Exactly 2 frames per action.
- Three-layer sync: manifest frame keys → animation definition keys → the character's animation-key mapping. The mapping must define idle, walk, jump-up, jump-down, punch, kick, die — and fall back to idle for the ultimate if no unique animation exists. Missing punch/kick keys fall back to defaults that don't exist and crash.
- Tilemap layer names are case-sensitive ("Ground", "Objects").

## Feel and presentation

- Camera follows with the player in the lower third of the screen and smooth lerp — standard for side-scrollers.
- Keep a short victory delay (~half a second) after the last kill so the win registers before the victory screen.
- Damage numbers: yellow for damage dealt, red for damage taken — show on every hit.

## Multi-character games

Add a character-select stage before levels; each character is a separate player class with distinct stats/skills; route selection into level scenes through a player-class registry.

## Common mistakes

| Wrong | Right |
|---|---|
| Implement jump physics | Use the movement behavior; set jump power |
| Write a patrol AI | Use the patrol behavior with a speed |
| Design maps from scratch | Copy a template, tweak platforms/coins |
| One attack animation | Provide both punch and kick (the combo needs both) |
| Front-view character art | Side view facing right |
| Missing level-order update | First entry must be the actual first scene, or the game crashes on start |
