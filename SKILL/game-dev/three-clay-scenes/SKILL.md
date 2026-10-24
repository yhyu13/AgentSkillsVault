---
name: three-clay-scenes
description: Build or refactor fast Three.js white-model, clay, untextured monochrome 3D scenes with procedural geometry and simple readable lighting. Use for 白膜/白模, clay render, grayscale blockout, no-texture mode, first-pass 3D composition, or a fast baseline before procedural materials. For code-generated textures and full procedural look development, use three-procedural-scenes instead.
metadata:
  version: 1.0.1
  category: 3d-rendering
  parent-skill: procedural-3d-scenes
  source-of-truth: .claude/skills/three-clay-scenes
---

# Three.js Clay Scenes

The first delivery is a **readable, interactive, untextured 3D scene**, not a cheaper-looking version of the final textured scene. Spend effort on silhouette, proportions, contact, camera, and composition. Do not spend it on surface maps, HDR environments, or postprocessing.

## Hard constraints

- No downloaded models or visual-art assets; generate geometry in code unless the user explicitly supplied geometry.
- No `TextureLoader`, image/canvas/data/video textures, generated texture maps, or material `envMap`.
- No Canvas-drawn labels used as scene textures. Prefer actual geometry or HTML UI.
- No HDRI/PMREM environment, SSAO/GTAO, bloom, or composer by default.
- No texture synthesis “for later.” That belongs to `three-procedural-scenes`.
- Use the existing project's Three.js version and renderer policy. Do not rewrite a working application around this skill.

Renderer-internal shadow targets are allowed. They are not surface textures. A solid background, fog, monochrome vertex colors when genuinely supplied, and plain material colors are allowed.

## Read

- Parent: `procedural-3d-scenes`; frozen API: `../procedural-3d-scenes/references/scene-contract.md`.
- Detailed craft: `references/clay-craft.md` in this skill.
- Verification: `../procedural-3d-scenes/references/verification.md`.
- Multi-agent work: `../procedural-3d-scenes/references/multi-agent-playbook.md`.

## Implementation workflow

### 1. Lock the visual brief

Specify in one paragraph:

- subject and 3–5 distinguishing silhouette features;
- world scale, ground plane, axes, and camera views;
- monochrome palette: background, primary clay, secondary clay, optional single accent;
- required motion/interaction and explicit non-goals.

Default to neutral warm/cool gray on a contrasting gray background. “White on white with white lights” is not an acceptable default because it erases edges.

### 2. Build the blockout before details

- Use primitives, extrusions, lathes, tubes, and project-local geometry helpers.
- Establish large masses and negative spaces first. Add only details visible at required viewing distances.
- Place every object with deliberate ground/contact relationships. Avoid accidental floating and coplanar overlap.
- Set correct normals and winding; recalculate normals only when geometry requires it, not every frame.
- Keep semantic groups and stable names for testing and later material assignment.

**Checkpoint:** capture default, overview, and side/back views. If the subject is not recognizable without texture, fix geometry—not lighting tricks.

### 3. Apply a small untextured material set

Start with a few shared materials, not one material per mesh:

- primary clay for the hero;
- secondary clay for environment/supporting masses;
- darker clay for recesses/undersides where geometry alone is insufficient;
- optional single accent only when the user permits monochrome to be broken.

Use project-consistent `MeshStandardMaterial` or a cheaper lit material when appropriate. Set color, roughness, and metalness explicitly enough to avoid accidental shiny plastic. Do not enable a map slot or vertex colors unless colors are genuinely provided.

Share materials and geometries across repeated meshes. Keep ownership clear for disposal.

### 4. Light for geometric readability

Use the minimum rig that reveals volume:

1. soft environmental/hemisphere fill so shadow faces retain form;
2. one directional key at an oblique angle to separate faces;
3. optional bounded shadow from the key when contact/depth needs it.

Avoid stacking many intense lights. Exposure and material color must preserve detail below clipping. Use a solid scene background and distance-appropriate fog only if it improves depth without hiding geometry.

Shadows are optional, not mandatory. When enabled, bound the shadow camera to the scene, use reasonable map size for the project, and avoid every tiny mesh casting and receiving indiscriminately.

### 5. Camera and interaction

- Fit the subject using its real bounds rather than guessed camera distance.
- Keep horizon/ground and hero scale intentional at both desktop and narrow aspect ratios.
- Set orbit limits or gameplay-camera constraints to avoid going under the ground or losing the subject, when applicable.
- Provide named test views that use the same camera rig as the real scene.
- Resize through the central renderer/camera owner only.

### 6. Optimize without changing the brief

- Instance or share repeated static geometry/materials where useful.
- Keep static matrices static according to project conventions.
- Do not allocate vectors, geometry, materials, or arrays indiscriminately every frame.
- Cap pixel ratio using the host application's policy; do not assume maximum device DPR is free.
- Implement quality only through real levers: DPR, shadows, geometry density, optional effects. Never add texture-size controls in Clay.

### 7. Verify the clay contract

Run all applicable parent checks plus:

- Traverse every scene material and assert every surface texture slot is null/absent.
- Confirm no texture loader/generator executes and no remote art request occurs.
- Inspect default/overview/side/detail/narrow screenshots.
- Confirm subject recognition, contact, no z-fighting, no severe clipping, and no blown-out white regions hiding shape.
- Exercise camera/input/resize/restart and repeated quality changes.
- Check resource counters after repeated restart/remount or regeneration cycles where supported.

## Multi-agent execution

Freeze exports and world axes first. A useful split is:

- environment worker: `environment.*` only;
- subject worker: `subject.*` only;
- look worker: `look.*` only, untextured materials/lights/camera rig as delegated;
- integrator: entry/renderer/shared types/loop;
- verifier: read-only checks and captures.

Do not create a texture worker in Clay. Do not let each geometry worker invent a separate palette or lighting rig; the look contract is shared.

Use internal subagents by default. Do not create visible Agent Manager sessions, worktrees, branches, commits, dependency installs, or deployments unless the user explicitly requests those actions.

## Upgrade seam for the later Full version

Preserve semantic material groups and stable names such as `paintedMetal`, `rubber`, `road`, `glass`, or project equivalents. Clay may use a small shared palette while retaining a `surfaceKind` metadata field or a central material-assignment function.

Do **not** pre-generate Full textures. The later upgrade replaces the central material factory and adds lighting/texture modules without rewriting geometry. Record the clay camera poses and seed so Full comparisons are meaningful.

## Common failures

| Failure | Correct response |
|---|---|
| White silhouette has no internal detail | Separate key/fill directions, darken background or clay slightly, improve bevels/normals |
| Scene looks flat | Add real depth and overlapping forms; use oblique key light; do not hide it with bloom |
| Z-fighting on roads/decals | Fix coplanar geometry/offset policy and near/far precision; do not add a texture |
| Too many draw calls | Share/instance repeated geometry and materials after measuring |
| “No textures” but sky HDRI was added | Remove it; use solid background/fog or non-environment geometric sky if required |
| White-mode check passes source grep but canvas textures appear | Audit runtime materials and executed code, not only names |
| Full material work starts before geometry approval | Return to clay gate; preserve fast iteration |

## Definition of done

- Scene is recognizably complete in geometry and composition with zero surface textures.
- Monochrome lighting retains shape and contact; default and required views are inspected.
- Existing build passes; real browser reports no uncaught/shader errors.
- Interaction/resize works; resource ownership and disposal are implemented.
- Any unrun visual, mobile, performance, or soak check is stated explicitly.

## Reference

Read `references/clay-craft.md` for geometry, palette, lighting, camera, runtime audit, and concrete pseudocode.
