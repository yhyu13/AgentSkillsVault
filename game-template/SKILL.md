---
name: game-template
description: Scaffold a stable, engine-appropriate web game project from a minimal meta-template and evolve reusable template families from completed games. Use when starting a new game, choosing an engine, or extracting reusable patterns from a finished project.
---

# Game Template Skill

## When to use

- Start a new web game project.
- Choose an engine or template (Phaser, raw canvas, three.js, etc.).
- Define a stable project skeleton for a team.
- Extract reusable patterns from a completed game to improve future scaffolding.

## Core idea

Begin from a minimal, engine-agnostic **meta-template (M0)** that contains only universal structure: build toolchain, initialization, scene flow, asset loading, configuration, and base abstractions. As you complete games, classify each project's physics regime and generalize its stable patterns into **template families**. Never start from a genre assumption; let families emerge from the code.

## Meta-template structure

A good M0 includes:

- **Build toolchain**: Vite + TypeScript (or equivalent), plus any CSS framework.
- **Entry point** and a **game configuration file** (e.g., `gameConfig.json`).
- **Scene lifecycle**: Preloader → TitleScreen → Level scenes → UI overlays.
- **Shared managers**: level progression, state machine, utility helpers.
- **Base abstractions**:
  - `BaseGameScene` with template-method hooks:
    - Abstract methods: `setupWorld()`, `createEntities()`.
    - Lifecycle hooks: `onPreCreate()`, `onPostCreate()`, `onPreUpdate()`, `onPostUpdate()`.
    - Utility methods: `onLevelComplete()`, `onGameOver()`.
  - `BaseEntity` with hooks: `onUpdate()`, `onDamageTaken()`, `onDeath()`.
  - Copy-and-customize templates for scenes and entities (e.g., `_TemplateScene`, `_TemplateEntity`).
- **No domain-specific code**: no gravity, character archetypes, behavior systems, or domain managers in M0.

## Scaffolding steps

1. Ask the user for the engine if it is not specified. Default to a robust framework unless they explicitly request raw canvas, three.js, or another renderer.
2. Copy the meta-template into the target project directory.
3. Customize the game configuration file with game-specific values (dimensions, physics, controls, etc.).
4. Create game scenes by extending `BaseGameScene` and overriding `setupWorld()` and `createEntities()`.
5. Create game entities by extending `BaseEntity`.
6. Keep all domain values config-driven rather than hard-coded.
7. If using raw canvas or three.js, preserve the same structural conventions: preloader, title, levels, UI overlays, a config file, and base classes.

## Evolving template families

After completing a game, feed it back into the template library:

1. **Collect** the project:
   - Read all source files, the file tree, the config file, and a concise code summary.
   - Focus on scene files, base classes, config, and directory structure.
2. **Classify** the physics regime. Do not use fixed genres. Determine:
   - `hasGravity`: is Y-axis gravity applied?
   - `perspective`: side, top-down, or none.
   - `movementType`: continuous, grid, path, or UI-only.
   - Produce a short snake_case archetype label that describes the **physics**, not the genre.
   - If a matching family already exists by physics profile, merge into it; otherwise create a new family.
3. **Extract** patterns with rule-based analysis:
   - Directory structure under the source root.
   - Class hierarchy and method signatures.
   - Hooks: abstract methods, plus protected methods starting with `on`, `setup`, `create`, `get`, or `check`.
   - Local import graph.
   - Config extensions beyond the M0 baseline.
   - Full contents of base classes, template files, utilities, and the config file.
4. **Abstract** the code into reusable templates:
   - Replace game-specific names with generic placeholders (e.g., `Player`, `Enemy`, `Entity`).
   - Replace hard-coded values with config references.
   - Mark extension points with `TODO` / `override` comments.
5. **Merge** into the library:
   - Deduplicate hooks by name, summing occurrence counts.
   - Deduplicate config fields by path; the latest project wins.
   - Deduplicate template files by path, keeping the more complete version.
   - Update base classes to the latest version.
   - Increase family stability as more projects contribute (e.g., full stability after five projects).

## Best practices

- Keep M0 minimal; add domain details only in derived projects.
- Use the same base-class conventions across families so later edits stay coherent.
- Store the library manifest separately from large template files.
- Always classify by observed physics, not by genre names.
