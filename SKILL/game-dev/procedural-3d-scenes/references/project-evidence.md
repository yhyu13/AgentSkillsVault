# Source Project Evidence

## Provenance and limits

- Source root at audit time: `D:\GitRepo-AI\Game\opus55-3d-games`.
- Audited Git head: `05527c0` (`Fix mobile usability bugs across all three games`).
- Static source audit date: 2026-10-24.
- The audit read source and configuration; it did **not** rerun builds, browser tests, benchmarks, or deployment for this skill extraction.
- Historical runtime statements in the README are identified as historical claims, not freshly reproduced results.
- Paths below are relative to the source root. Line numbers describe the audited revision and may drift later.

**Critical negative finding:** the repository has no general clay/white-model/no-surface-texture mode. The Clay skill is a newly distilled target workflow, not documentation of an existing feature. Every game's low-quality path still builds textured scenes.

**Version warning:** `pelican-bike` and `cf-transport-ship` declare Three r186; `qq-speed` declares/locks Three r169. Do not assume addon/API parity when copying rendering code. Both in-repo versions already use the migrated color-management/output-pass APIs (`qq-speed/src/main.js:2-6`, `:96`; `qq-speed/src/textures.js:18`), so the compatibility risk is addon path/parameter drift, not a pre/post `outputColorSpace` migration split.

## 1. Reusable delivery architecture

The root README describes three esbuild projects bundled into route-specific single HTML pages with no external image/audio/third-party art assets (`README.md:41`, `README.md:92-117`). Actual build scripts bundle `src/main.js` as IIFE targeting ES2020 and inject the result into HTML:

- `pelican-bike/build.mjs:4-20`
- `cf-transport-ship/build.mjs:5-22`
- `qq-speed/build.mjs:4-17`

The root aggregator installs missing dependencies, builds all three, and copies route outputs (`build-site.mjs:6-36`). It recursively deletes `dist/` first (`build-site.mjs:12-16`), so do not treat it as a harmless read-only check or run it with unreviewed files in `dist/`.

Dependencies:

- Pelican: Three/esbuild/lil-gui/Playwright Core (`pelican-bike/package.json:12-18`), Three locked at r186 (`pelican-bike/package-lock.json:493-496`).
- FPS: Three/esbuild/Playwright Core (`cf-transport-ship/package.json:6-15`), Three locked at r186 (`cf-transport-ship/package-lock.json:488-491`).
- Racing: Three r169 and related tooling (`qq-speed/package.json:12-20`, `qq-speed/package-lock.json:1451-1454`).

**Distilled rule:** reuse the host project's build and version conventions. A self-contained HTML result does not prove its runtime texture/environment resources are procedural; inspect the generated code and network requests.

## 2. Procedural geometry kernels

### Pelican utilities and articulated models

`pelican-bike/src/util.js` contains reusable patterns:

- seeded RNG (`:13-21`) and frame-rate-independent damping (`:10-11`);
- cylinder-between-points (`:26-47`), custom lofting (`:53-91`), dynamic parallel-transport tubes (`:93-179`);
- two-bone IK, vertex coloring, merge normalization (`:181-225`).

The bird uses deformed/lofted geometry, morph targets, articulated joints, and IK (`pelican-bike/src/pelican.js:53-207`, `:254-417`, `:481-610`). The bicycle uses merged spokes, generated chain paths, instanced links, and animated wheels/gears (`pelican-bike/src/bicycle.js:51-121`, `:124-177`, `:331-486`). Fish geometry is lofted, merged, vertex-colored, and cached (`pelican-bike/src/fish.js:5-56`).

### Pelican streamed world

The coast uses seven recycled 72 m chunks (`pelican-bike/src/world.js:14-16`), seeded placement, instanced vegetation, vertex-colored terrain, and shared merged static geometry (`:348-548`, `:769-779`). Terrain is sampled more densely near the road, with cached height rows for center-difference normals (`:83-170`).

### FPS batching and map construction

The FPS `Batch` accumulates positions/normals/UVs/indices and emits one geometry per material (`cf-transport-ship/src/map.js:20-57`), then creates static meshes (`:560-576`). It is private, not an exported drop-in utility. Containers, crates, rails, cranes, hull forms, and collision footprints are generated together (`:111-242`, `:514-558`, `:631-683`). Guns are primitive-built, cached, and merged by material (`cf-transport-ship/src/guns.js:252-290`).

### Racing track kernel and tiled world batching

QQ Track samples closed centripetal Catmull–Rom paths into positions, tangent/right vectors, curvature, banking, slopes, bridge flags, bounds, and a spatial hash (`qq-speed/src/track.js:8-108`). Projection, nearest-point lookup, and curvature lookahead are separate reusable logic (`:110-222`). Roads, walls, curbs, tunnels, decals, and bridge supports derive from those samples (`:224-440`, `:442-618`). Four layouts are control-point data (`qq-speed/src/layouts.js:1-52`); themes are configuration (`qq-speed/src/maps.js:4-101`).

QQ exports `Batch`, merging by material, 260 m tile, and shadow flag (`qq-speed/src/world.js:6-49`). This retains more culling granularity than merging an entire map into one mesh.

**Distilled rule:** separate pure geometry/track kernels from look generation. Reuse exported utilities only after version and ownership review. Merge repeated static content, but retain spatial culling granularity where worlds are large.

## 3. Full procedural texture evidence

### Pelican

Canvas-generated road color/bump maps, feather bump, wicker, sprites, decals, signs, and stripes are implemented in `pelican-bike/src/textures.js:20-249` and `:252-388`.

### FPS

The toolkit contains tileable FBM and height-to-normal conversion (`cf-transport-ship/src/textures.js:19-88`). Deck, containers, crates, hull, painted steel, fences, decals, particles, and sign atlases are generated at startup (`:140-753`). Materials use separate normal and roughness maps (`cf-transport-ship/src/map.js:67-103`). Deck AO is baked from object footprints into a Canvas texture (`cf-transport-ship/src/map.js:577-580`, `:599-629`).

### Racing

Canvas texture caching covers road, ground, facades, signs, boost pads, clouds, and tunnels (`qq-speed/src/textures.js:34-38`, `:40-610`). Props provide cached materials/geometries and several themed procedural environments (`qq-speed/src/props.js:7-25`, `:485-660`, `:804-938`, `:940-1074`, `:1131-1268`). Cars are extruded procedural profiles with shared geometry, clearcoat/glass, emissive trim, animated wheels, and generated labels (`qq-speed/src/carModel.js:15-75`, `:78-242`).

**Distilled rule:** the source demonstrates broad code-generated texture coverage, not that every texture is necessary or cheap; this static audit did not benchmark generation. Preserve semantic surface families, central caching, UV/scale review, and explicit disposal.

## 4. Lighting, shaders, and postprocessing evidence

### Pelican

Procedural sky implements sun/moon, stars, Milky Way, FBM clouds, and time-of-day palettes (`pelican-bike/src/sky.js:21-170`, `:173-234`). Ocean combines Gerstner displacement, analytic normals, noise, Fresnel, crest lighting, foam, reflections, and fog (`pelican-bike/src/ocean.js:16-131`). CPU/GPU wave calculations are paired and JS phases are wrapped (`:176-203`).

The chain is half-float target → NaN/Inf sanitation → bloom → color grade → output (`pelican-bike/src/main.js:164-224`). PMREM refreshes only when time changes enough and the previous target is disposed (`:63-73`, `:522-526`).

### FPS

Environment includes atmospheric Sky, procedural ocean/cloud reflection/foam, day/dusk presets, PMREM, and lower-hemisphere approximation (`cf-transport-ship/src/env.js:6-206`, `:208-297`). World and first-person weapon scenes render separately before post effects (`cf-transport-ship/src/render.js:52-92`).

### Racing

Procedural sky, sprite clouds, water, and mountain rings are in `qq-speed/src/world.js:58-104` and `:176-275`. Low uses direct rendering; mid/high add composer/bloom with tier-specific DPR/MSAA (`qq-speed/src/main.js:152-180`). A shadow camera follows the racer and snaps to texels (`:1046-1053`).

**Distilled rule:** generate environment locally, throttle/dispose PMREM, synchronize CPU/GPU formulas when gameplay depends on visuals, and prove direct rendering before adding postprocessing. The NaN sanitizer is found in Pelican, not proven in the other two games.

## 5. Quality and lifecycle lessons

Pelican quality presets vary pixel ratio, shadow size, bloom, MSAA, and vegetation density (`pelican-bike/src/main.js:25-35`). Dynamic resolution reacts after sustained low FPS and recovers cautiously (`:941-969`). Quality rebuilds dispose composer passes and shadow maps (`:206-213`, `:970-980`). However, vegetation density is supplied during initial world construction (`:97-100`), while runtime quality changes rebuild shadows/composer but not world density (`:970-981`).

FPS quality changes DPR/MSAA and low removes bloom (`cf-transport-ship/src/render.js:53-80`); shadow sizes vary by tier (`cf-transport-ship/src/env.js:219-223`), and low disables four interior point lights (`cf-transport-ship/src/game.js:78-85`). `buildTextures(quality)` accepts but does not read its quality argument, so all tiers generate the same texture set (`cf-transport-ship/src/textures.js:699-753`).

QQ low removes shadows and composer (`qq-speed/src/main.js:152-180`) and omits CPU-updated snowfall (`qq-speed/src/props.js:1246-1266`), but still builds textured maps/props/cars. Its `disposeLevel()` disposes level geometries, not level materials/textures (`qq-speed/src/main.js:358-364`); item disposal only removes the group (`qq-speed/src/items.js:62-70`). Racer material cleanup is separate in `clearRacers()` and is not evidence of level-resource cleanup. This is a code-observed partial-cleanup risk, not a newly measured leak.

**Distilled rule:** low quality is not clay. Every quality control must identify whether it applies live or only at construction. Geometry-only disposal is incomplete when unique materials/textures/targets exist.

## 6. White silhouette recipe—and why it is not Clay

`Game.makeIcons()` (`cf-transport-ship/src/game.js:86-121`) creates a 256×96 render target, applies white unlit `scene.overrideMaterial`, fits an orthographic camera to generated guns, reads pixels for alpha coverage, restores clear state, and disposes the target.

Reuse this idea for thumbnails, masks, or coverage tests. Do not cite it as a general lit clay renderer: it does not suppress scene texture generation, provide clay lighting, or create a fast gameplay mode.

No evidence was found for a global clay toggle, no-texture URL option, low-quality texture-generation bypass, or generic offline model-preview CLI.

## 7. Existing verification assets and traps

Documented root commands — **not safe baseline checks**. Do not run them without an explicit user request that covers their side effects:

```bash
# DELETES ./dist recursively and may run npm install (build-site.mjs:15,20-23).
node build-site.mjs

# NOT A LOCAL CHECK: macOS-only Playwright import and absolute dist path;
# opens the LIVE https://games.xdullboy.com site and writes /tmp
# (tools/smoke.mjs:2,7,27,42). Do not run as a baseline check.
node tools/smoke.mjs
```

Individual projects use `node build.mjs`; build scripts also implement `--dev`. These are source-project commands, not universal skill commands.

Important portability limitations in the checked-in tools:

- Tools import Playwright from an original author's absolute macOS path, e.g. `tools/smoke.mjs:2`, `tools/landscape-check.mjs:2`.
- `smoke.mjs` starts a local server (`tools/smoke.mjs:7-18`) but navigates to the production site (`:21-28`).
- Several desktop/mobile scripts use an absolute original `dist` path, e.g. `tools/mobile-audit.mjs:2-8`; `tools/landscape-check.mjs:7-17` computes it relative to the repo.
- Screenshots use Unix `/tmp`, e.g. `tools/smoke.mjs:42-43`.
- Smoke checks console/page errors, title, canvas dimensions, text, and links (`tools/smoke.mjs:21-59`) but does not prove rendered pixels or compare images.
- Mobile/landscape audit scripts log findings without failure exit codes (`tools/mobile-audit.mjs:98-99`, `tools/landscape-check.mjs:89-90`).

Useful runtime hooks:

- Pelican query options and fixed-dt/NaN controls: `pelican-bike/src/main.js:20-35`, `:150-162`, `:217-249`, `:1259-1277`; `window.__pelican` exposes camera/state/settings/actions/renderer/FPS (`:1371-1399`). Fixed dt still renders frames.
- FPS supports autostart/quality/no-pointer-lock query options and `window.__game` (`cf-transport-ship/src/game.js:30-35`, `:74-76`, `:201-207`); it has render-free `fastForward(seconds, step)` (`:574-578`).
- QQ exposes `window.game` (`qq-speed/src/main.js:1065-1071`), but the audit found no equivalent autostart query or fast-forward hook.

README historical claims include a 320-second Pelican soak, stable resource counts, a 36 km boundary test, and track top-view checks (`README.md:59-61`, `:158-165`). Their scripts are absent from the audited tree. Pelican/QQ `npm test` entries are failing placeholders, and FPS has no real test script (`pelican-bike/package.json:6-8`, `qq-speed/package.json:6-8`, `cf-transport-ship/package.json:6-8`). Do not present those historical scripts as runnable assets.

## 8. Evidence-backed multi-agent seams

These are proposed extraction seams, not an existing orchestration configuration:

1. **Shared kernel:** seeded RNG/noise, loft/tube/IK, merge normalization, QQ exported `Batch`; first establish a Three-version compatibility policy.
2. **Clay implementation:** new material policy and startup path, not existing `low`; bypass texture generators and audit final material slots.
3. **Pelican look:** sky/ocean synchronization, PMREM throttling, NaN defense, adaptive DPR; separate `sky.js`, `ocean.js`, `world.js`, and render ownership.
4. **FPS look:** texture library, environment, map material factory, dual-scene composition; avoid unnecessary physics changes.
5. **QQ look:** Track/terrain/world/props separated from car and gameplay; preserve layout/map data contracts.
6. **Verification:** first repair portability and local-serving behavior of checks, then add comparable Clay/Full captures, resource sampling, switch/soak tests, and explicit failure exits.

The worker still must obey file allow-lists and frozen contracts. These seams do not authorize a broad refactor of the source games.
