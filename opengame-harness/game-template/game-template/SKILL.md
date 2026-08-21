---
name: game-template
description: Scaffold a web game from a minimal meta-template and evolve reusable template families.
---

# Game Template Skill

## When to use

- Starting a new web game project.
- Choosing or customizing an engine/framework for a game.
- Building a team-shared project skeleton.
- Extracting reusable patterns from a finished game to improve future scaffolding.

## When NOT to use

- One-off prototypes with fewer than three scenes or a single source file.
- Games with no expected reuse or follow-on projects.
- Situations where the engine and architecture are already fixed and no template library is needed.

## Core idea

Begin from a minimal, engine-agnostic **meta-template (M0)** that contains only universal structure: build toolchain, initialization, scene flow, asset loading, configuration, and base abstractions. As you complete games, classify each project's physics regime and generalize its stable patterns into **template families**. Never start from a genre assumption; let families emerge from the code.

## Meta-template structure

A good M0 includes:

- **Build toolchain** (e.g., Vite + TypeScript) plus optional styling support.
- **Entry point** and a **game configuration file** (e.g., `gameConfig.json`).
- **Scene/stage lifecycle**: Loading → Title → Level → UI overlays.
- **Shared managers**: level progression, state machine, utility helpers.
- **Base abstractions** using one valid pattern (template-method is one choice; composition, ECS, or behavior trees are acceptable alternatives):
  - `BaseGameScene` with extension points such as `setupWorld()` and `createEntities()`, plus lifecycle hooks mapped to the engine's pre-init/post-init/pre-update/post-update events.
  - `BaseEntity` with hooks mapped to the engine's update, damage, and destroy events.
  - Copy-and-customize templates such as `SceneTemplate` and `EntityTemplate`.
- **No domain-specific code**: no gravity constants, character archetypes, behavior systems, or domain managers in M0.

### Engine-specific mapping

The lifecycle names are placeholders. Map them to the engine you are using:

| Generic concept | Phaser-style equivalent | Raw canvas / three.js equivalent |
|-----------------|------------------------|----------------------------------|
| Loading stage | `Preloader` scene | Custom preload routine / asset loader |
| Title stage | `TitleScreen` scene | Title screen renderer / router |
| Level stage | `Level` scene | Game loop / world update |
| UI overlays | `UIScene` | HTML overlay / HUD renderer |
| Scene transition | `scene.start()` / `scene.launch()` | Router push / state change |
| Pre-init hook | `onPreCreate` | Constructor / `init` callback |
| Post-init hook | `onPostCreate` | After assets load / `create` callback |
| Pre-update hook | `onPreUpdate` | Before `requestAnimationFrame` tick |
| Post-update hook | `onPostUpdate` | After `requestAnimationFrame` tick |

## Scaffolding steps

1. Ask the user for the engine if it is not specified. Default to a robust framework unless they explicitly request raw canvas, three.js, or another renderer.
2. Copy M0 into the target project directory.
3. Customize the game configuration file with game-specific values (dimensions, physics, controls, etc.).
4. Create game scenes by extending the base scene class and overriding the domain extension points.
5. Create game entities by extending the base entity class.
6. Keep all domain values config-driven rather than hard-coded.
7. If using raw canvas or three.js, preserve the same structural stages (loading, title, level, UI) and a config file, but use the engine's native lifecycle hooks.

## Evolving template families

After completing a game, feed it back into the template library.

### 1. Collect

- Read all source files, the file tree, the config file, and a concise code summary.
- Focus on scene/stage files, base classes, config, and directory structure.

### 2. Classify

Determine the physics regime from the code, not from genre names:

- `hasGravity`: is Y-axis gravity applied?
- `perspective`: side, top-down, or none.
- `movementType`: continuous, grid, path, or UI-only.

Produce a short, descriptive archetype label (e.g., `side_gravity_continuous`). If a project is hybrid, pick the dominant physics profile and note ambiguity in the summary. If a matching family already exists by physics profile, merge into it; otherwise create a new family.

### 3. Extract

With rule-based analysis, extract:

- Directory structure under the source root.
- Class hierarchy and method signatures.
- Hooks: treat any public or protected method on a base scene/entity/system class as a hook, unless it is a pure helper (getter/setter/utility/constructor). If the project uses a documented naming convention (e.g., `on*` or `handle*`), use that convention instead and record it.
- Local import graph.
- Config extensions beyond the M0 baseline.
- Full contents of base classes, template files, utilities, and the config file.

### 4. Abstract

Transform game-specific code into reusable templates:

- Replace concrete names with generic placeholders (e.g., `Player` → `PlayerEntity`).
- Replace hard-coded values with config references.
- Mark extension points with `TODO` / `override` comments.

### 5. Merge

Use concrete merge operators:

- **Hooks**: deduplicate by qualified name (`Class::method`). Increment `occurrenceCount` by 1 per contributing project. If signatures differ, keep the most common signature and store variants.
- **Config fields**: deduplicate by path. If values are identical, keep one. If values differ, store all observed values with project provenance and flag the conflict for review; do not silently overwrite.
- **Template files**: deduplicate by path. Compare normalized content (ignoring comments/whitespace). If semantically identical, keep one. If different, keep the variant from the higher-stability project or store both under a `variants/` directory. Do not use raw line count as the deciding metric.
- **Base classes**: replace with the version from the higher-stability project; if stability is equal, use the latest.
- **Stability**: `min(1.0, uniqueContributingProjects / N)`, where `N` is a configurable threshold (default 5).

## Worked example

A completed lunar-lander clone is classified as:

- `hasGravity: true`
- `perspective: side`
- `movementType: continuous`
- Archetype label: `side_gravity_continuous`

Extraction finds base classes `BasePlayer`, `BaseObstacle`, and hooks such as `onCollide` and `onFuelEmpty`. Abstraction replaces `LanderSprite` with `PlayerEntity`, `Asteroid` with `ObstacleEntity`, and thrust values with `gameConfig.player.thrust`. The result is merged into the `side_gravity_continuous` family, raising its stability count by one.

## Best practices

- Keep M0 minimal; add domain details only in derived projects.
- Document the hook convention you adopt so extraction stays consistent.
- Store the library manifest separately from large template files.
- Always classify by observed physics, not by genre names.
- Treat `BaseGameScene` / `BaseEntity` as one valid pattern, not the only pattern.
