---
name: procedural-3d-scenes
description: Orchestrate browser-based procedural 3D scenes with a clay-first delivery path and a separate fully procedural lighting/material/texture path. Use for Three.js scene generation, white-model or monochrome blockouts, code-only visual assets, multi-agent scene implementation, or upgrading an approved clay scene without external art assets. Not for 2D-only games, imported-asset showcases, or deployment without an explicit request.
metadata:
  version: 1.0.1
  category: 3d-rendering
  source-project: opus55-3d-games
  source-of-truth: .claude/skills/procedural-3d-scenes
---

# Procedural 3D Scenes

Deliver a runnable scene before polishing it. Start with **clay/monochrome and no surface textures**, unless the user explicitly requests the complete procedural look. Treat the fully procedural version as a second, separately verified delivery—not as unfinished work silently added to the first.

## Choose one delivery path

| Request | Path | Required child skill |
|---|---|---|
| 白膜/白模、单色、blockout、快速看构图、先看几何、不要贴图 | **Clay** | `three-clay-scenes` |
| 全程序化、代码生成材质和贴图、无外部美术资源、完整光照 | **Full** | `three-procedural-scenes` (includes its Clay diagnostic baseline) |
| 先做白模，之后再做完整版本 | **Clay now; preserve upgrade seams** | Clay first, Full later |
| User only asks for analysis or a plan | Analyze only; do not modify the scene | Read the relevant references |

Unless the user explicitly asks for the complete procedural look, default to Clay and state that choice. Do not ask a question when the request already selects a path. “No external assets” alone does not mean “no textures”: code-generated textures belong to Full.

## Non-negotiable boundaries

1. **Ground in the actual project.** Read its package manifest, entry point, build scripts, existing renderer, and tests. Reuse its module and error-handling conventions. Never replace the stack merely because these skills use Three.js examples.
2. **No external art by default.** Do not fetch models, image textures, HDRIs, skyboxes, or baked light maps. Runtime library imports allowed by the host project are not art assets.
3. **Clay means no surface maps.** No image/canvas/data textures, texture loaders, generated normal/roughness/AO maps, or environment maps. Internal renderer targets such as shadow maps are not surface textures.
4. **Full means generated, not downloaded.** Texture pixels, material parameters, geometry, and lighting environment must originate in code. Record seeds and cache keys.
5. **Never deploy, commit, push, install dependencies, or create visible Agent Manager worktrees unless the user requested that action.** Internal read/review subagents are sufficient by default.
6. **Build success is not visual success.** A delivery requires a real rendered frame, browser-error inspection, and the checks in `references/verification.md`.

## Read in this order

1. This file.
2. `references/scene-contract.md` before assigning implementation work.
3. The selected child skill and its listed reference.
4. `references/multi-agent-playbook.md` when work splits across agents.
5. `references/verification.md` before integration, not after delivery.
6. `references/project-evidence.md` only when mining the source project or needing provenance. Its commands and paths are evidence, not universal commands for another repository.

## Workflow and gates

### Gate 0 — Establish a truthful baseline

- Identify the existing run/build/test commands from scripts actually present.
- Record the current Git state without changing it. Do not overwrite unrelated work.
- Run the narrowest existing smoke/build command only after inspecting its side effects. A documented check that deletes output, installs dependencies, or targets a deployed URL is not a baseline check; do not run it without an explicit user request covering those effects. If the baseline fails, report the pre-existing failure separately from new failures.
- Write a short scene brief: subject, camera intent, interaction, target path, asset restriction, performance target if supplied, and explicit non-goals.
- Define measurable acceptance: route/entry loads, expected objects exist, console/page errors are zero, screenshots are nonblank, mode-specific resource checks pass.

**Exit:** the current project runs or its baseline blocker is known; the selected path and acceptance checks are explicit.

### Gate 1 — Freeze the integration contract

The integrator owns the entry point, renderer, camera/controls policy, shared types, dependencies, and final cleanup. Freeze:

- module factory signatures and return shape;
- coordinate system, units, ground level, forward/up axes, and bounds;
- deterministic seed ownership;
- quality levels and resize/update/dispose behavior;
- each agent's file allow-list;
- test observability and expected object names/counts.

Use the default contract in `references/scene-contract.md`, adapting names to the project. Workers must request contract changes instead of editing shared files silently.

**Exit:** two workers cannot need to edit the same file; every requested feature has one owner.

### Gate 2 — Produce a thin runnable vertical slice

Implement one representative subject, ground/reference scale, one camera, and the minimal lighting needed to read shape. Keep the update loop alive even if `update()` is initially empty. Build and open it before multiplying content.

For Clay, stop adding rendering features once geometry, framing, interaction, and stability pass. For Full, keep the clay baseline available as a fallback and comparison image; a diagnostic slice suffices when the user asked for Full directly and no separate Clay delivery was requested.

**Exit:** first real screenshot exists and is visually inspected; there are no uncaught browser errors.

### Gate 3 — Fan out only independent modules

Use multiple agents when at least two substantial modules can proceed independently after the contract is frozen. Otherwise use one implementation agent plus an independent reviewer.

Recommended split:

- **Clay:** environment geometry; hero/subject geometry; clay lighting and camera; read-only verifier.
- **Full:** preserve approved geometry; procedural texture/material library; lighting/environment; optional effects; read-only verifier.

Do not assign “make it beautiful” to everyone. Assign files, exported signatures, constraints, and proof. The integrator alone composes shared files and resolves contract amendments; this does not imply a Git merge. See `references/multi-agent-playbook.md` for copyable prompts and recovery rules.

**Exit:** every worker returns changed files, self-check evidence, known gaps, and no unauthorized contract changes.

### Gate 4 — Integrate in dependency order

1. Shared contract and renderer shell.
2. Geometry and scene layout.
3. Mode-specific material system.
4. Lighting/environment.
5. Optional animation/effects.
6. Test hooks and project-owned checks.
7. Resize, quality switches, restart/teardown, and disposal.

After each stage, rerun the same narrow check. Do not batch all failures until the end. Preserve a clay toggle or previous approved entry when practical; fallback code must not secretly generate Full textures in Clay mode.

### Gate 5 — Verify and review

Run `references/verification.md` in this order:

1. Static/resource-policy checks.
2. Project build/type checks.
3. Browser load and console checks.
4. Desktop and narrow-viewport screenshots; inspect the images.
5. Interaction, resize, quality/mode switches, and restart.
6. Resource stability over repeated cycles or a representative soak.
7. One fresh-context reviewer for contract violations, missing disposal, nondeterminism, and unsupported claims.

A reviewer does not replace running checks. Reproduce important review findings before changing code.

### Gate 6 — Deliver only what was proven

Report:

- selected path and actual entry/route;
- commands run and their outcomes;
- screenshots or captures produced;
- procedural seed and quality controls, if applicable;
- remaining limitations and unrun checks;
- no claim of deployment, performance, or visual parity without evidence.

## Definition of done

### Clay delivery

- Recognizable silhouettes, correct scale/contact, readable monochrome shading, and intentional camera.
- Every scene material has no surface map slots populated; no texture-generation or loader path executes.
- No external visual assets and no required postprocessing.
- Build/browser/interaction/resource checks pass or are explicitly listed as not run.

### Full delivery

- The approved geometry/layout remains intact unless a change is documented.
- All geometry, lighting environment, materials, and texture content are generated locally in code with deterministic seeds where randomness is used.
- Texture generation is cached and outside the frame loop; disposal covers geometries, materials, generated textures, render targets, controls, listeners, and composer passes owned by the scene.
- Desktop/mobile-appropriate quality behavior and browser screenshots are checked; no console errors or runaway GPU-resource growth.

## Stop and recover

- **WebGL unavailable/context lost:** show a readable failure state; do not claim success from a blank canvas. Restore only through the project's owned lifecycle.
- **Visual regression after Full upgrade:** disable texture/effect layers in reverse integration order; retain the last good clay scene.
- **Performance drops:** measure first. Reduce pixel ratio, shadow cost, generated texture size/count, geometry duplication, and postprocessing before changing the art direction randomly.
- **Agent needs a shared-file change:** stop that worker's edit, send an amendment request to the integrator, update the contract once, then resume affected work.
- **No browser automation available:** state that visual/browser validation was not performed; do not replace it with “build passed.”

## References

- `references/scene-contract.md` — frozen APIs, ownership, seed/quality/disposal contract.
- `references/multi-agent-playbook.md` — role matrix, copyable worker prompts, integration and repair protocol.
- `references/verification.md` — checklist to execute against the host project (not pre-executed) and failure triage.
- `references/project-evidence.md` — source-project patterns and exact source anchors; provenance, not a universal template.
