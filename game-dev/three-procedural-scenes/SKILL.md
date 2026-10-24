---
name: three-procedural-scenes
description: Build or upgrade Three.js scenes whose geometry, lighting environment, materials, and textures are all generated in code, with no external art assets. Use for full procedural look development, Canvas/DataTexture or shader textures, procedural PMREM environments, seeded material generation, and converting an approved clay scene into a complete textured scene. For fast untextured white-model or monochrome work, use three-clay-scenes first.
metadata:
  version: 1.0.1
  category: 3d-rendering
  parent-skill: procedural-3d-scenes
  source-of-truth: .claude/skills/three-procedural-scenes
---

# Three.js Fully Procedural Scenes

Build the complete look **after** a runnable clay baseline exists. Preserve the approved geometry, world layout, seed, camera views, interaction, and lifecycle. Full procedural means the visual assets originate in local code; it does not mean downloading an HDRI and calling the result procedural.

## Hard constraints

- No external models, image textures, HDRIs, skyboxes, decals, or baked light maps unless the user explicitly relaxes this rule.
- Generate geometry, texture pixels/shader patterns, material parameters, and lighting environment locally.
- Use deterministic seeded random streams for reproducible layout and texture content.
- Generate static textures outside the render loop. Cache by complete parameter key; bound dimensions/counts; dispose replacements.
- Keep Clay available as a fallback/comparison path when upgrading an existing scene.
- Use the host project's Three.js version and rendering conventions. Do not copy addon behavior across r169/r186 or other versions without checking installed APIs.
- Add postprocessing only after the unpostprocessed scene renders correctly. Never use bloom to hide weak lighting or materials.

## Read

1. Parent `procedural-3d-scenes`, especially `../procedural-3d-scenes/references/scene-contract.md` and `../procedural-3d-scenes/references/verification.md`.
2. `references/procedural-look.md` before writing texture, material, environment, or shader code.
3. `references/performance-lifecycle.md` before quality switches, regeneration, or postprocessing.
4. `../procedural-3d-scenes/references/multi-agent-playbook.md` for parallel work.
5. `../procedural-3d-scenes/references/project-evidence.md` when reusing source-project techniques.

## Workflow

### Gate A — Freeze the approved baseline

Record:

- entry/route and current build/browser checks;
- clay screenshots from named camera views;
- geometry bounds, semantic material groups, seed streams, and quality behavior;
- renderer color/tone-mapping/shadow policy;
- known geometry defects that textures must not be used to conceal.

If no Clay baseline exists and the user explicitly wants Full directly, build a thin untextured vertical slice anyway. It is a diagnostic baseline, not an extra delivery demanded from the user.

**Exit:** the same camera and seed can reproduce the baseline; baseline browser errors are known.

### Gate B — Write the procedural look contract

For each semantic surface, define a small row:

```text
surfaceKind | base color range | roughness range | metalness | texture generator
texture role(s) | UV/world scale | seed stream | quality sizes | fallback clay material
```

Choose detail based on viewing distance and physical scale. Do not generate every possible map for every material. A roughness variation may be useful where a normal map is not; an emissive map is irrelevant to a non-emissive surface.

Define the procedural environment separately: sky/background, key/fill/rim lights, reflections, shadows, and time-of-day state if any. Specify which effects are static, event-driven, or per-frame.

**Exit:** every texture and dynamic effect has an owner, cache/update policy, and measurable view where it matters.

### Gate C — Implement deterministic generators and registry

- Use one seeded PRNG/noise utility with independent named streams.
- Generate tileable surfaces with wrapped sampling or explicit edge handling; test seams at actual repeat.
- Generate into Canvas/DataTexture or a project-approved shader path. Do not block startup generating needless variants.
- Set color-space role correctly: color/emissive color data versus normal/roughness/metalness/AO/data maps. Use installed Three.js constants and project conventions.
- Configure wrapping, repeat, mipmapping/filtering, and bounded anisotropy deliberately.
- Return `{ texture, key, bytesOrDimensions, dispose }` or an equivalent project-owned record through one registry.

**Exit:** same generator version/key/seed produces the same content; repeated requests reuse the cached resource; no network art request occurs.

### Gate D — Assign materials and verify UV/scale

Replace the central Clay material factory rather than editing every geometry module. Preserve semantic groups and fallback materials.

Check:

- UVs exist and have the intended orientation/density; generated custom geometry may need explicit UVs.
- Tiling follows world scale or the intended object scale, not accidental bounding-box size.
- Normal maps have valid tangents/UV behavior for the installed renderer; shader world-space detail uses stable coordinates.
- Roughness/metalness remain plausible and readable under the procedural environment.
- Transparent/emissive materials have explicit depth/blending policies and do not cause avoidable sorting artifacts.

**Exit:** identical near/mid/far camera views are captured against Clay; no visible seam, stretching, z-fighting, or accidental texture swimming.

### Gate E — Build lighting and environment procedurally

Use code-built gradient/sky geometry, a procedural scene rendered through PMREM, analytic lights, or an existing project environment generator. Do not load an HDRI.

Start with:

1. environment/fill that preserves shadow-side readability;
2. one clear key direction and intentional shadow coverage;
3. optional rim/accent lights tied to scene features;
4. reflections/environment intensity matched to material response.

For dynamic time-of-day, update expensive environment targets only when the change exceeds a defined threshold or at a bounded cadence. Dispose the previous target only after its replacement is ready and no longer needed.

**Exit:** materials are distinguishable, whites/highlights retain detail, shadow motion is stable, and environment updates do not introduce visible popping or unbounded resource growth.

### Gate F — Add optional shaders and postprocessing last

First prove the direct render. Then integrate one effect at a time:

- validate all uniforms are finite and initialized;
- sanitize or fix NaN/Infinity sources before bloom/feedback effects;
- use the correct output/color-management pass for the installed Three.js version;
- bound render-target size, samples, and pixel ratio;
- provide a direct-render low/fallback path;
- dispose composer passes and owned render targets on quality rebuild/teardown.

**Exit:** default, brightest, darkest, and effect-heavy views are inspected; no black-frame propagation, clipping, banding severe enough to obscure content, or shader errors.

### Gate G — Verify Full delivery

Run all parent checks plus:

- Full resource inventory with generator, seed, size, color/data role, cache and disposal owner.
- Fixed-seed regeneration comparison and different-seed sanity check.
- Cache-hit evidence and proof static generators do not run in the frame loop.
- Same-view Clay/Full comparison and required near/mid/far/narrow screenshots.
- Repeated quality/mode/regeneration/restart cycles with renderer-resource counts after settling.
- Startup and generation timing where procedural synthesis is a stated performance concern.
- One independent read-only review of network assets, ownership, determinism, disposal, and unsupported claims.

## Multi-agent execution

Recommended ownership after contract freeze:

- **Geometry agent:** preserves/fixes approved geometry and UVs only; no private lighting rig.
- **Texture/material agent:** generators, registry, material factory, texture inventory.
- **Lighting agent:** procedural environment, lights, shadow policy, PMREM lifecycle.
- **Effects agent (optional):** one isolated composer/effects module after direct render is green.
- **Integrator:** entry, renderer, camera/controls, shared seed/quality, loop, dependency and disposal composition.
- **Verifier:** read-only browser, visual, determinism, cache, and resource-cycle checks.

Texture and lighting workers may develop in parallel against frozen semantic keys, but final look approval happens only after integration. No worker may add an HDRI, create a second renderer/loop, or silently change global exposure to make its local test look better.

Use internal subagents by default. Do not create visible Agent Manager sessions, worktrees, branches, commits, dependency installs, or deployments unless the user explicitly requests those actions.

## Performance degradation order

Measure first. When over budget, preserve art direction while reducing cost in this general order:

1. unnecessary per-frame generation/allocation and duplicate resources;
2. excessive DPR/render-target resolution and postprocessing;
3. shadow coverage/resolution/update frequency and number of shadowed lights;
4. texture dimensions/count, normal/detail maps with little visual value, and anisotropy;
5. environment/PMREM refresh frequency;
6. geometry duplication/segments/particles and distant detail.

The exact order is evidence-dependent. Do not sacrifice the defining feature merely to keep an invisible texture effect.

## Common failures

| Failure | Root-cause response |
|---|---|
| Same seed gives different scene | Audit hidden `Math.random`, shared stream consumption order, time-dependent inputs, and incomplete cache keys |
| Seams at tile boundaries | Use wrapped noise/sampling and inspect repeat edges; do not blur only the visible center |
| Color map looks washed/wrong | Check color-space role and output pipeline; do not compensate randomly with light intensity |
| Normal/roughness detail sparkles at distance | Check mipmaps/filtering, texel density, normal strength, and whether detail exceeds pixel footprint |
| Startup stalls | Inventory synchronous generators; remove unused variants, lower dimensions, cache, or schedule generation without changing correctness |
| Quality switch grows textures | Ensure old textures/PMREM/composer targets are released after replacement; compare settled counters |
| Bloom turns frame black | Reproduce with effects isolated; check NaN/Infinity and invalid HDR inputs before changing bloom aesthetics |
| Full looks worse than Clay | Revert the latest look layer, compare identical views, and repair lighting/material scale rather than adding more effects |
| “Procedural” scene downloads HDRI | Remove external art; generate environment locally or use analytic lights/fallback |

## Definition of done

- All visual art is generated locally in code; no undeclared external visual request exists.
- Geometry/layout and interaction remain consistent with the approved baseline.
- Fixed-seed behavior is reproducible; texture generation is cached and outside static per-frame paths.
- Lighting/materials/textures read correctly in required views; direct and postprocessed paths are both tested where present.
- Quality switches and teardown dispose owned resources; repeated cycles show no unexplained monotonic growth.
- Build and real browser checks pass, screenshots are inspected, and unmeasured performance or device claims are excluded.

## References

- `references/procedural-look.md` — seeded texture recipes, registry, color roles, materials, environment, shaders.
- `references/performance-lifecycle.md` — generation budgets, quality changes, cleanup, postprocessing, and test patterns.
