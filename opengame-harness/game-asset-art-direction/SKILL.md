---
name: game-asset-art-direction
description: Direct AI asset generation for 2D games — per-archetype view/framing rules, animation and audio prompt writing, and cross-file key consistency.
---

# Game Asset Art Direction

## When to use

- Generating or specifying images, sprites, animations, tilesets, backgrounds, or audio for a game.
- Checking asset key consistency across the asset manifest, animation definitions, and code.

## Asset categories

- **Background**: full-scene environment art, landscape orientation. No background removal.
- **Tileset**: a perfect square grid of seamless tiles that fill the entire canvas with no margins or gaps.
- **Animation frames**: per-action frame sequences for characters.
- **Static image**: single items — collectibles, portraits, projectiles, props, icons. Output size is fixed; scale in code, not in the prompt.
- **Audio**: short sound effects (about a second) and loopable background music (10–30 s).

Split large batches into two calls: backgrounds/tilesets/statics first, then animations and audio.

## Per-archetype character rules (critical)

| Rule | Platformer | Top-down | Tower defense | UI-heavy | Grid logic |
|---|---|---|---|---|---|
| View | Side view | Overhead | Overhead | Front or 3/4 | Top-down (front-facing for match pieces) |
| Framing | Full body, action-ready | Full body | Clear silhouette | Bust shot (chest up) | Fill ~80% of a cell |
| Default facing | Right | Three directions: front, back, side(right) | Single direction | Forward | — |
| Frames | 2 per action | 1 per direction per action | Static, or 2-frame walk | One static image per expression | Mostly static |

Iron rules:

- **Exactly one character per image** — no groups, no background figures.
- **Top-down: directional coverage beats frame count** — 3 directions × 1 frame, always. Side sprites face right; flip in code.
- **UI-heavy: portraits are static** — separate image per expression (neutral, happy, angry…), named `{character}_{expression}`.

## Tileset art rules

- Floor tiles: solid, simple, flat color with at most subtle seams. Busy floors compete with characters.
- Wall tiles: clearly contrasted from the floor — darker, thicker, raised appearance.
- Top-down tilemap games need TWO tilesets per theme: floor + walls. Arena games need none.
- Tiles must be seamless and fill the canvas completely.

## Animation prompt writing

The action description is the highest-leverage parameter. Bad: "running". Good: "running forward, legs in full stride, arms pumping, cape flowing backward".

1. Describe body position and limb placement.
2. State motion direction ("forward", "overhead arc", "downward").
3. Name key visual elements ("sword extended", "shield raised").
4. Keep the character description identical across all actions.

Standard sets:

- Platformer hero: idle, run, jump, attack 1, attack 2, die. Enemy: idle, walk, attack, die.
- Top-down hero: idle, walk, melee, shoot, dash, die — each in front/back/side.

## Audio prompt writing

Describe sound quality ("8-bit chiptune", "orchestral"), emotional tone ("heroic", "urgent"), instruments ("brass", "synth pads"), and for effects the sound shape ("rising pitch", "sharp attack, quick decay").

Suggested durations: jump/hit 0.3–0.5 s, collect/click 0.5–1 s, level music 15–30 s loopable, menu music 10–20 s calm.

## Key consistency chain (the #1 silent-crash source)

The same logical asset flows through several places, and every spelling must match exactly:

generation key → manifest key → animation definition key → code reference key.

Naming conventions:

- Frames: `{character}_{action}_{frame}` (platformer) or `{character}_{action}_{direction}` (top-down).
- Animation keys: append `_anim` to the frame base.
- Animation entries must be declared as animation-type assets, not plain data — otherwise no animations are created.
- Verify every frame key in the animation definitions exists in the asset manifest and on disk before running.

## Common pitfalls

- Passing size parameters to static images — their output size is fixed; scale in code.
- Dimension strings using "x" instead of the tool's expected separator — follow the generation tool's format exactly.
- Generating tilesets for arena or tower-defense games — those use backgrounds plus code-defined grids.
- Missing animation entries — an empty animation table means invisible, frozen sprites.
