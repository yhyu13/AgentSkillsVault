# Performance and Lifecycle Reference

Procedural generation moves asset cost from download/storage into CPU/GPU generation, memory, and shader work. It is not automatically faster. Measure startup and steady-state behavior separately.

## 1. Cost inventory

Before optimizing, list:

| Stage | Cost to measure |
|---|---|
| Module/load | bundle size, imports, parsing/compilation |
| Geometry creation | CPU time, vertex/triangle counts, merged/instanced counts |
| Texture generation | number, dimensions, CPU duration, temporary canvases/buffers |
| Environment | PMREM generation/refreshes, target sizes, dynamic sky cost |
| First frame | shader compilation, pipeline stalls, time to meaningful frame |
| Steady render | CPU update, draw calls, triangles, DPR, shadows, postprocessing |
| Quality/mode switch | regeneration time, GPU-resource churn, old-resource disposal |
| Teardown | remaining listeners/loops/resources and ability to remount |

Use browser performance tools or project instrumentation. Do not infer texture cost only from network savings.

## 2. Startup generation policy

- Generate only surfaces used by the initial scene/quality level.
- Prefer shared tileable families over unique large textures for every object.
- Keep dimensions proportional to actual screen footprint and viewing distance.
- Avoid generating all map themes/levels before one is selected unless measurements and product requirements justify it.
- Reuse scratch buffers/canvases where ownership remains clear.
- If generation causes a visible long task, reduce/split work or schedule it with a truthful loading state. Worker/OffscreenCanvas is an optional measured optimization, not a default requirement or universally available path.
- Never trade deterministic output for speed by introducing unseeded scheduling dependence.

A loading overlay does not make the generation nonblocking; inspect the actual main-thread work.

## 3. Frame-loop hygiene

Static content must not regenerate per frame. Search update/render paths for:

```text
new *Geometry, new *Material, new *Texture, document.createElement("canvas"),
generate*, build*, PMREM/fromScene, compile*, dispose*
```

Some hits are legitimate dynamic operations; inspect and bound them. Reuse vectors/arrays in hot paths where profiling shows allocation pressure. Do not micro-optimize all allocations blindly.

Animation should update existing uniforms/transforms/buffers. Mark buffer attributes for update only when contents change. Cap work when offscreen/hidden according to application behavior.

## 4. Quality switching as a transaction

Use a predictable sequence:

```text
1. Validate requested quality and preserve scene state/seed.
2. Compute the target configuration from one policy function.
3. Create replacement resources only for levers that actually changed.
4. Install replacements and render/validate the new state.
5. Remove old references and dispose old owned resources exactly once.
6. Update debug state and run the same camera comparison.
```

Do not rebuild world geometry if only DPR/composer changed. Conversely, do not expose “vegetation density” or “texture size” controls that only apply on initial construction unless the UI clearly says restart is required.

If a rebuild fails, retain or restore the last good state where practical. Avoid a half-disposed live scene.

## 5. Disposal checklist

For each scene/module, walk the ownership table:

- remove roots from parent;
- dispose owned geometries and materials, accounting for sharing;
- dispose generated textures and clear/release registry entries;
- dispose procedural PMREM targets and generators as required by installed API;
- dispose composer passes/render targets owned by the scene;
- remove controls and DOM/window listeners;
- cancel animation frame, timers, workers, and pending async work;
- disconnect audio/resources outside rendering if owned;
- prevent late async completion from adding resources to a disposed scene;
- make repeated `dispose()` harmless.

Do not dispose the shared renderer from a feature module. Do not dispose a shared texture from every mesh that uses it.

### Partial-disposal warning

Disposing geometries alone is not complete scene cleanup when unique materials/textures/targets are created. Renderer counters may not immediately reflect every JavaScript reference, so combine counter checks with ownership review.

## 6. Shadow and environment costs

Shadows scale with light count, map size, casters, and update frequency. Measure before increasing resolution. Fit shadow cameras tightly and stabilize movement where needed; texel snapping can reduce shimmer for a following orthographic shadow camera, but implementation depends on light/camera orientation.

Environment/PMREM updates are not ordinary per-frame uniforms. Use thresholds/cadence for animated skies and dispose old targets. Cache static results. Test both rapid quality toggles and slow environmental transitions.

## 7. Postprocessing safety and fallback

Integrate in this order:

1. direct renderer output verified;
2. composer with minimal/output-only path verified against color expectations;
3. one effect with bounded target size/samples;
4. bright/dark/adversarial shader inputs tested;
5. low-quality direct path tested;
6. rebuild/dispose cycles tested.

NaN/Infinity can propagate through blur/bloom into large black or invalid regions. Reproduce by isolating the suspected source or using a test-only invalid-input hook when available. Fix the source and consider bounded sanitation as defense-in-depth. Do not copy a sanitizer blindly across GLSL versions or claim other projects have one without checking.

## 8. Resource-cycle probe

Implement using the project's actual controls and debug state:

```text
await ready()
await setView("hero")
await warmUpAndSettle()
baseline = sampleRendererAndScene()

repeat N times:
    use real quality/mode/regenerate/restart control
    await readiness and settling
    restore original quality/mode/seed/view
    await readiness and settling
    sampleRendererAndScene()

assert no duplicate canvases/loops/listeners detectable by the app
inspect counter trends and retained resource ownership
capture final hero frame and compare with baseline
```

Report N and settling logic. Avoid asserting exact equality when the renderer legitimately retains caches; require an explained stable plateau instead. A stable `renderer.info` alone does not prove no JS leak.

## 9. Performance report template

```text
Environment: <browser, device/headless/software GL, viewport, DPR>
Build/commit: <identifier>
Scene/seed/quality: <values>
Startup: <generation and first-meaningful-frame method/results>
Steady state: <sampling window, frame-time distribution, draw calls, triangles>
Resources: <geometries, textures, generated texture inventory>
Switch/soak: <cycles/duration, before/after/plateau values>
Visual evidence: <capture paths and views>
Limitations: <devices/checks not covered>
```

No “60 FPS everywhere,” “zero leak,” or “instant generation” claim without matching evidence.

## 10. Degradation decision table

| Evidence | First candidate |
|---|---|
| Long startup task, many unique maps | Remove unused variants, reduce size/count, share/cache, schedule generation |
| High steady GPU time at high DPR | Lower DPR/render-target scale |
| Shadow-heavy GPU cost | Reduce shadowed lights/casters, tighten bounds, adjust resolution/update policy |
| Environment spikes at intervals | Reduce PMREM refresh frequency/size and cache static results |
| High draw calls with repeated props | Share/instance/merge while retaining useful culling granularity |
| Texture shimmer at distance | Reduce frequency/strength, inspect mips/filtering and screen footprint |
| Counters grow per switch | Fix transaction ownership and dispose replaced resources |
| Frame black after bloom | Isolate invalid shader inputs and post chain; retain direct fallback |
| Full slower but visually indistinguishable | Remove low-value maps/effects before damaging defining geometry |
