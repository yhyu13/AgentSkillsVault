---
name: game-tower-defense
description: Design and build tower defense games — core loop, map and path design, tower/enemy archetypes, wave balance, economy, and optional mechanics.
---

# Tower Defense Game Design

## When to use

- Enemies follow fixed paths in waves; the player builds defenses. There is NO player character — interaction is mouse-driven tower placement.

## Core loop

Place → Defend → Earn → Upgrade → Repeat. Enemies spawn in waves along a path from spawn to exit; kills earn gold; gold buys towers and upgrades; leaked enemies cost lives; clearing all waves wins.

Controls: click a buildable cell to place the selected tower; click an existing tower for upgrade/sell; right-click or ESC cancels selection; Spacebar skips the between-wave countdown.

## Map design

- Grid is code-defined, not tilemap. Cell types: buildable, path, blocked, spawn, exit.
- Typical size 12–18 × 8–12 cells at 64 px.
- Rules: path is connected from spawn to exit; single path per level; border is blocked; at least ~5 buildable cells adjacent to the path; longer paths = easier; more turns = more premium corner positions.
- Waypoints mark turns only (enemies move straight between them), first waypoint on spawn, last on exit, all intermediates on path.
- Obstacle cells are pre-marked blocked in the grid definition; obstacle sprites are placed afterward. Never mark them later — slot rendering happens first.
- Always render a visible path line and tower slots: AI-generated backgrounds don't encode gameplay geometry. Tower slots stay hidden until the player enters placement mode.

## Tower design

Every game needs 3–5 distinct archetypes:

| Archetype | Role | Stats pattern |
|---|---|---|
| Basic/arrow | Cheap, fast, single target | Low damage, high rate, medium range |
| Cannon/splash | Area damage | High damage, low rate, small range |
| Sniper | Long range, high damage | Very high damage, very low rate |
| Slow/utility | Debuff enemies | Low damage, applies slow |
| Machine gun | Rapid fire | Very low per-shot damage, very high rate |

Balance bands — cost 30–400, damage 5–100, range 80–350 px, fire rate 0.3–4 shots/s, projectile speed 150–600+ px/s. Upgrades: 3 levels per tower; each costs ~60–100% of the previous; +40–80% damage, +10–20% range, +15–30% rate.

Targeting modes: first (default — furthest along path), last, closest, strongest.

Homing vs prediction: prediction (lead shots) is built-in and free. Use homing only for slow projectiles or guaranteed-hit towers; never for splash towers (splash lands at a position) or machine guns. The two systems are mutually exclusive.

Each tower type gets a dedicated, visually distinct projectile (distinct shape and color) — shared projectiles destroy readability. Custom projectiles auto-scale; if a texture is missing, a default bullet is used.

## Enemy design

| Archetype | Role | Pattern |
|---|---|---|
| Basic | Cannon fodder | Low HP, low speed, low reward |
| Fast | Speed rush | Very low HP, high speed |
| Tank | Damage sponge | Very high HP, very low speed, high reward |
| Swarm | Overwhelm | Tiny HP, many spawned |
| Boss | Wave boss | Extreme HP, slow |

HP bands: basic 30–150, tough 200–800, boss 1000–3000. Speed 20–200 px/s. Exit damage 1–5+ lives. Display height: swarm 24–32 px, small 36–44, standard 48–56, tank 60–72, boss 80–96.

Spawn-interval floor: `(largest enemy height / slowest speed) × 1.2` seconds prevents visual overlap.

## Wave design

Structure: optional pre-delay, sequential groups of (type, count, interval), clear bonus.

Progression rules: wave 1 is basic-only with a relaxed interval; introduce a new enemy type every 2–3 waves; mix types from wave 4–5; boss waves every 5 or as the finale; scale by raising count and tightening intervals.

Timing: ~2 s pre-delay for wave 1, ~5 s between waves, spawn intervals 400–1500 ms.

## Economy

Starting gold: easy 150–200, medium 80–120, hard 50–70. Income: per-kill rewards 5–30 (bosses 100–200) plus per-wave clear bonuses. Sell refund ~70% of total invested — encourages experimentation.

## Optional mechanics

- **Destructible obstacles**: on blocked cells near the path; 3–8 clicks to destroy; reward 10–40 gold; destroying converts the cell to buildable — a click-vs-build strategic choice.
- **Combo kills**: rapid sequential kills (2 s window) trigger combo events; small bonuses (2–5 gold per level) so the economy stays intact.
- **Splash falloff**: center takes full damage, edge takes half — rewards aiming splash at clusters.

## Art direction

- Everything top-down/overhead with clear silhouettes; color-code tower types; enemies slightly smaller than towers, bosses larger.
- Layer order: full-screen background → path line → tower slots → towers → enemies → projectiles → HUD.
- Background stretches to the full screen, not the grid; center a smaller grid with offsets.
- The tower panel auto-renders buttons with the tower sprite, name, and cost — no icon assets needed.

## Forbidden

Player characters, multiple simultaneous paths, manual tower abilities, tilemap-based maps, terrain mutation after level start, enemy abilities, multiplayer, currencies other than gold, placement outside the grid.
