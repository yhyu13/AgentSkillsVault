# Verification Gate

Use the host project's real scripts and browser tooling. Commands below are patterns, not evidence that a script exists. Record skipped checks explicitly.

## 1. Static and resource-policy checks

### Both modes

- Dependencies and import paths resolve through the existing build.
- No remote model, image texture, HDRI, skybox, or other visual-art URL was added.
- Random visual content uses the agreed seeded path.
- No geometry/material/texture construction appears in a per-frame update unless genuinely dynamic and bounded.
- Every owned resource has a cleanup path; event listeners and animation loops have one owner.

### Clay: fail on any surface-texture path

Search source and inspect final scene materials. Relevant names include:

```text
TextureLoader, CubeTextureLoader, RGBELoader, EXRLoader,
CanvasTexture, DataTexture, VideoTexture, CompressedTexture,
map, normalMap, roughnessMap, metalnessMap, aoMap, bumpMap,
displacementMap, emissiveMap, alphaMap, envMap
```

Do not reject a variable merely because it contains the substring `map`; inspect material slots and executable behavior. Shadow render targets and renderer-internal textures are not surface art textures. No texture generator may execute in Clay at all, even once.

At runtime traverse visible scene materials and report every populated texture slot. Expected surface-texture count: **0**.

### Full: inventory every generated visual resource

For each texture/material family record:

```text
key | generator | seed | dimensions | color/data role | wrap/repeat | cache owner | dispose owner
```

Assert no network visual-art dependency, deterministic regeneration for a fixed seed/version, and cache reuse. Procedural PMREM/render-target textures are allowed and counted as renderer resources, but must be disposed by their owner.

## 2. Build gate

1. Run the existing typecheck/lint/build command that covers the changed entry.
2. Use the same command after each integration layer where feasible.
3. Distinguish baseline failures from introduced failures with actual before/after evidence.
4. Inspect built asset references if offline/self-contained delivery is required. A bundled library is fine; an unexpected remote texture is not.

Do not add dependencies or rewrite the build solely to make a generic command from this reference work.

## 3. Browser smoke gate

At the real route/entry:

- Wait on a scene-specific readiness signal, not an arbitrary sleep alone.
- Collect `pageerror`, console errors, failed requests, and WebGL shader errors.
- Assert canvas exists, has nonzero dimensions, and the expected scene debug state exists.
- Assert semantic scene counts and finite camera/object transforms. NaN/Infinity in transforms or uniforms is blocking.
- Capture the initial frame only after readiness and at least one rendered update.
- Treat a blank, uniformly cleared, or fully black/white frame as a failure to investigate, not a valid screenshot.

## 4. Required visual views

Choose views that expose the scene's risks; names are illustrative:

| View | What it proves |
|---|---|
| Hero/default | Intended first impression, subject readability, framing |
| Overview | Layout, ground contact, bounds, missing regions |
| Side/back | Actual 3D volume, no facade-only geometry |
| Detail/near | Normals, seams, UV scale and procedural detail (Full) |
| Far/gameplay | LOD readability, shimmer, texture density, clipping |
| Narrow viewport | Resize, aspect, UI overlap, touch targets if interactive |
| Mode/quality states | Real switches, fallback, resource cleanup |

Capture identical camera poses between Clay and Full when upgrading. Inspect every produced image. A metric cannot judge composition or whether the requested subject is recognizable.

## 5. Interaction and lifecycle gate

Exercise the real user paths, not only debug functions:

- camera orbit/pan/zoom or gameplay input;
- resize and orientation change;
- every exposed quality/mode button;
- start/pause/restart/regenerate where present;
- background/foreground or offscreen behavior if the app handles it;
- teardown/remount if the host framework supports it.

After each action assert the actual state changed and no errors appeared. Inert controls are blocking.

## 6. Resource-stability check

Renderer counters support leak investigation but are not a complete proof. Compare like-for-like states after warmup and settling.

```text
warm up scene
record renderer.info.memory and semantic object counts
for N representative cycles:
    switch quality/mode or regenerate/restart
    restore the same baseline state
    allow disposal/render settling
record the same counters again
```

Investigate monotonic growth, duplicated canvas/listeners/loops, and stale generated textures. Also watch update behavior for continuous allocation and frame-time degradation. Choose N from the risk and runtime; report N rather than using an unexplained magic number.

For long-running scenes, add a project-appropriate soak with actual simulated time or controls. Do not claim a leak-free result from a few frames.

## 7. Performance evidence

If no target was supplied, measure and report rather than declaring “optimized.” Record:

- device/browser/headless environment and viewport/DPR;
- quality mode and scene seed;
- draw calls/triangles/geometries/textures from renderer info;
- frame-time sampling method and warm-up;
- generated texture count/dimensions and generation duration where relevant.

Averages alone hide spikes. Inspect startup generation stalls and quality-switch stalls. Software WebGL/headless results are not hardware-GPU promises.

## 8. Independent review prompt

```text
Read the frozen scene contract and integrated diff. Do not edit files.
Check: mode violations, remote art, unseeded randomness, frame-loop resource creation,
shared-resource disposal, duplicate loops/listeners, missing resize/quality behavior,
unsupported performance/visual claims, and test assertions that only mirror implementation.
Return BLOCKING vs NON-BLOCKING findings with exact file:line and reproduction.
Explicitly list checks you could not run. Do not infer rendering success from build output.
```

The integrator reproduces load-bearing findings, applies minimal fixes, and reruns the failed gate.

## 9. Final evidence table

| Check | Command/action | Result | Evidence | Not run / limitation |
|---|---|---|---|---|
| Static mode policy |  |  |  |  |
| Build/typecheck |  |  |  |  |
| Browser errors |  |  |  |  |
| Hero/overview/detail captures |  |  |  |  |
| Interaction/resize |  |  |  |  |
| Clay zero surface maps / Full inventory |  |  |  |  |
| Determinism/cache |  |  |  |  |
| Resource cycles |  |  |  |  |
| Independent review |  |  |  |  |

“Pass” requires observable output. Empty fields are not passes.
