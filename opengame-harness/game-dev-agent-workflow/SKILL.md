---
name: game-dev-agent-workflow
description: End-to-end workflow for an agent building a 2D game autonomously — classify, design, generate assets, configure, implement, verify.
---

# Game Dev Agent Workflow

## When to use

- Building a complete 2D game from a user's idea, working autonomously until it runs.
- Extending a template-based game project with new scenes, entities, or content.

## The phases (execute in order)

1. **Classify** — physics-first: pick the archetype (and sub-mode) from what the world physically does, not the genre name. See the archetype classification rules.
2. **Scaffold** — copy the core template and the archetype module's code and docs. Do NOT read template source yet — that happens at implementation time. Reading early wastes context.
3. **Design** — write the GDD as a 6-section contract (architecture, assets, config, entities, levels, roadmap). Then expand the task list into concrete per-file operations from the roadmap.
4. **Assets** — generate from the design's asset registry. Split large batches. Maps come from predefined templates — never hand-invented layouts. After generation, read the asset manifest to learn the real keys.
5. **Config and registration** — merge game-specific values into the existing configuration (never replace the whole file), set the level order, register every scene, and update the title screen text.
6. **Implement** — read in layers (capability summary → targeted sources → module manual), output an implementation plan, then work the task list file by file, marking each done immediately.
7. **Verify** — run the pre-build checklist, then build → test → visual, fixing everything at each stage. Never skip verification.

## Non-negotiable principles

- **Plan first, in the open**: maintain a task list from the start; it must include a READ phase before any IMPLEMENT task and end with VERIFY.
- **Read-first**: when unsure about any API, type, hook, or signature — stop and read the source. Never guess, never assume, never invent names.
- **Templates are law**: never modify engine files; copy templates or extend base classes. Reference only hooks and types that demonstrably exist.
- **Config-driven**: game values live in configuration; code reads them through the value accessor.
- **Consistency chains**: scene keys, asset keys, animation keys, and config keys must match across every place they appear.
- **Error discipline**: read the full error, go to the file and line, fix the root cause, re-run the same stage before moving on. Never reinstall dependencies to fix code errors.
- **Dev server in background only** — foreground blocks everything.

## Definition of done

- Build passes with zero errors, tests pass, and the game runs.
- Every asset key used in code exists in the manifest with identical spelling.
- Every transition target is registered; the level order starts at the real first scene.
- No template placeholders remain.
- The game is playable end-to-end: title → gameplay → win/lose → restart.
