---
name: game-archetype-classifier
description: Classify a 2D game idea into the correct game archetype using physics-first logic before designing or scaffolding.
---

# Game Archetype Classifier

## When to use

- Starting a new game project and need to pick the right engine module or template family.
- A game idea mixes genres and you need the dominant interaction model.
- Deciding sub-modes (arena vs tilemap, puzzle vs tactics vs match).

## When NOT to use

- The engine/archetype is already fixed by the user or the project.

## Core rule: physics first, never genre names

Never classify by genre labels ("RPG", "shooter", "puzzle game"). Ask what the world physically does:

| Archetype | Physics | Deciding question | Typical games |
|---|---|---|---|
| Side-view platformer | Side view + gravity | Does the character fall and jump? | Mario, Terraria, fighting games |
| Top-down action | Top-down + free movement | Can the character move up without jumping? | Zelda, Isaac, survivor-likes |
| Grid logic | Grid + discrete steps | Does everything snap to a grid? | Sokoban, Fire Emblem, match-3 |
| Tower defense | Fixed paths + waves | Do enemies follow a preset route? | Kingdom Rush, Bloons |
| UI-heavy | No physics, UI-driven | Is interaction mostly buttons/dialogue/cards? | Card games, visual novels, quizzes |

When in doubt between two, pick the one whose core loop the player repeats most.

## Sub-mode detection (decide immediately after the archetype)

### Top-down action

| Sub-mode | World model | Detect via keywords |
|---|---|---|
| Tilemap | Designed map, follow camera, exploration | dungeon, exploration, room, maze, adventure |
| Arena | Fixed screen, scrolling backdrop, wave spawns | space shooter, bullet hell, survival, endless, waves |

Default when unclear: **tilemap** — it is more structured and safer.

### Grid logic

| Sub-type | Timing | Input | Deciding question |
|---|---|---|---|
| Puzzle | Step | Direction keys | Each input = one discrete move? |
| Roguelike | Step | Direction keys + action key | Step-based with combat and enemy AI? |
| Tactics | Turn | Click to select, click to move | Units take turns with movement ranges? |
| Match | Freeform | Click/swap cells | Matching cells clear and cascade? |
| Arcade | Realtime | Direction keys on a timer | Game advances on a timer? |

Default when unclear: **puzzle** (step mode).

### UI-heavy flow patterns

Pick one flow pattern instead of inventing a scene graph:

| Scope | Pattern |
|---|---|
| One battle only | Title → Battle → Ending |
| One story + one battle | Title → Intro chapter → Battle → Ending |
| 3–5 story chapters | Title → Chapters… → Ending |
| Campaign with battles | Title → Chapter select → Chapters + Battles → Ending |
| Two-player local duel | Title → optional Character select → Battle → Ending |

## Output of classification

State explicitly: archetype, sub-mode (if any), the physical evidence from the request, and any ambiguity. This decision drives the template family, asset art direction, and design rules used downstream.
