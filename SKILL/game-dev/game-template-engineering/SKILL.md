---
name: game-template-engineering
description: Work inside a template-based game engine — the KEEP/COPY/UPDATE discipline, the hook pattern, and cross-file consistency rules.
---

# Game Template Engineering

## When to use

- Implementing a game inside a template/meta-template architecture with base classes and hooks.
- Evolving or maintaining a template library.

## The operation discipline

Every file in the architecture falls into one of four operations:

- **KEEP**: engine files — base classes, behaviors, systems, utilities, UI scenes. Never modify. Breaking them breaks every game.
- **COPY**: template stubs meant to be duplicated and customized. Copy the whole file, rename the class, then configure and override hooks.
- **REFERENCE**: example files used as a basis for new files (e.g., enemies) — create a new file, don't rename the template in place.
- **UPDATE**: registries and configuration — scene registration, level order, config values, asset manifests. Modify values only.

Roadmaps must list the UPDATE steps first (registration, level order, config, animation definitions). Omitting them is the top source of runtime errors.

## The hook pattern

- Base classes own the lifecycle (create, update, shutdown). Never rewrite lifecycle methods.
- Customize by overriding documented hook methods. Always call the super implementation — the base wires physics, UI, cameras, and systems for you.
- Hooks are opt-in: override only what the design requires.
- **Hook integrity rule**: only override hooks that actually exist in the base class, and only reference types that actually exist in the source. If you haven't seen it, it doesn't exist — read the source before using any API. Never write assumption comments; go read.
- Never narrow method visibility in an override — match or widen the base visibility.

## Read-first, in layers

Writing code without reading is the #1 cause of bugs. Read in three layers:

1. **Capability summary** — the compressed reference of systems, hooks, and components. Low context cost, covers what you won't modify.
2. **Targeted source reads** — full source of every template you'll copy, every base class you'll extend, every component you'll call (you need exact signatures).
3. **Module manual** — integration patterns and known mistakes. Read last so it stays freshest in context.

Before writing code, output a brief implementation plan: files to modify (with hooks), files to create (with the template each copies/extends), config changes, scene registrations, and asset keys referenced. If the plan is shorter than the design's roadmap, re-read the design.

## Consistency chains (the silent-crash sources)

- **Scene keys**: constructor key, registration, level-order list, and every transition call must use identical strings. The level order's first entry must be the actual first scene — a template default left in place crashes on start.
- **Asset keys**: manifest keys, animation definition keys, and code references must match exactly, character for character.
- **Config keys**: every field accessed in code must exist in configuration; merge new fields into the existing config — never replace the whole file (infrastructure sections like screen size must survive).
- **Config values** use a wrapper object with a value field — always read through the value accessor, and import the config with a default import plus safe destructuring with fallbacks.
- **Type imports**: interfaces and types are imported with the type-only import form; classes are not.

## Lifecycle hygiene

- Engine scene instances are reused: reset all mutable state on creation.
- Destroy per-round UI elements before recreating them; reset per-round timers and flags at round start.
- Register cleanup through the scene's shutdown event, never by overriding shutdown.
- Title/select scenes should stop residual UI overlays from previous sessions to prevent ghost UI.
