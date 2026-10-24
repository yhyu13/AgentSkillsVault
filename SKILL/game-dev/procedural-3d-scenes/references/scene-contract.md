# Scene Contract

Freeze this contract before parallel implementation. It is a pattern, not a demand to convert an existing JavaScript project to TypeScript. Preserve the host project's language and naming.

## 1. Brief fields

The integrator records these in the task prompt or an existing project planning location:

```text
Scene: <subject and purpose>
Mode: clay | full
Entry/route: <actual file and URL>
Reference views: <hero, overview, detail, gameplay as applicable>
World: up=Y, groundY=0, units=<meaning>, forward=<axis>
Bounds: <expected playable/visible bounds>
Seed: <integer or seed string; who owns PRNG>
Quality: low | medium | high; default=<from project/device policy>
Required interactions: <camera, input, gameplay>
External visual assets: none
Surface textures: forbidden (clay) | code-generated only (full)
Non-goals: <features explicitly deferred>
Acceptance: <build, browser, visual, interaction, resource checks>
```

Do not invent numeric FPS, bundle-size, or texture budgets. If the user supplies none, measure baseline/final values and report them rather than claiming a target was met.

## 2. Default module boundary

Adapt this shape to the project, then freeze it:

```ts
export interface SceneModuleContext {
  scene: Scene;
  renderer: WebGLRenderer;       // read/capability queries; not reconfigured by workers
  camera: Camera;                // owned by integrator unless explicitly delegated
  seed: number;
  quality: "low" | "medium" | "high";
  mode: "clay" | "full";
  registerDisposable?: (resource: { dispose(): void }) => void;
}

export interface SceneModule {
  root: Object3D;
  update?(dtSeconds: number, elapsedSeconds: number): void;
  resize?(width: number, height: number, pixelRatio: number): void;
  setQuality?(quality: "low" | "medium" | "high"): void;
  getDebugState?(): Record<string, unknown>;
  dispose(): void;               // idempotent; only resources owned by this module
}

export function createEnvironment(ctx: SceneModuleContext): SceneModule;
export function createSubject(ctx: SceneModuleContext): SceneModule;
export function createLook(ctx: SceneModuleContext): SceneModule;
```

Rules:

- A module adds its own `root` and removes it on disposal. The integrator owns the scene itself.
- Only the integrator changes renderer size, pixel ratio, tone mapping, output color space, shadow enablement, composer, global camera, and animation-loop registration.
- A camera/look agent may own a documented camera rig or lights root; it still does not replace the integrator's renderer.
- `update` receives seconds. Clamp large `dt` at the central loop. Static modules omit `update` instead of running empty per-frame work.
- No module installs a second animation loop, global resize listener, or duplicate controls.
- Workers import only declared dependencies. New dependencies are an integrator decision.
- Modules never reach into another worker's private objects. Share data through the frozen context/API.

## 3. Resource ownership table

For every created resource, identify one owner:

| Resource | Typical owner | Required cleanup |
|---|---|---|
| Geometry | module that created it | `dispose()` once; shared geometry disposed by its creator |
| Material | module that created it | `dispose()` once after all users are removed |
| Generated texture | texture/material registry | remove references and `dispose()` once |
| Render target/PMREM output | lighting/environment owner | dispose target and generator as applicable |
| Light/shadow resources | look owner | remove light; dispose owned shadow map if the project manages it explicitly |
| Controls | integrator or camera owner | `dispose()` |
| DOM/window listeners | installer | remove with the same function reference |
| Composer/passes | integrator/effects owner | dispose owned passes/targets |
| RequestAnimationFrame | integrator | cancel centrally |
| Global test hook (`window.__sceneTest`) | integrator | delete on teardown/remount if installed |
| Workers/timers/audio nodes | creator | terminate/clear/disconnect as applicable |

Never dispose shared renderer, shared camera, or another module's root. `dispose()` must tolerate being called twice.

## 4. Determinism and generated data

- The integrator derives independent named streams, e.g. `layout`, `subject`, `texture:<key>`, `effects`, so adding particles does not reshuffle the entire scene.
- Use one project-local seeded PRNG implementation. Do not use `Math.random()` for geometry or texture content that is expected to reproduce.
- Texture registry key includes generator version, semantic material, size, seed, colors/parameters, wrap mode, and quality-affecting options.
- Same key returns the same texture instance or an explicitly reference-counted resource. Define who releases it.
- A changed quality level either reuses compatible resources or disposes replaced resources after the new set is ready.

Example key (illustrative):

```text
v1:asphalt:256:seed=42:palette=slate:repeat=8,8:roughness-only
```

## 5. Quality contract

Quality controls must name actual levers, not vague labels:

```text
low:    DPR cap, shadow resolution/off, geometry segments, texture size (Full), effects off
medium: project-defined middle values
high:   project-defined upper values, still bounded on HiDPI
```

Changing quality must not recreate the whole application, duplicate listeners, reset user progress, or change layout seeds. Report which levers are implemented; do not expose inert UI.

## 6. Observability contract

Expose a small read-only debug/test surface following project conventions. Example:

```js
window.__sceneTest = {
  getState: () => ({
    mode,
    quality,
    seed,
    objectCounts: { /* semantic counts, not DOM scraping */ },
    camera: { position: camera.position.toArray(), target: controls.target.toArray() },
    renderer: {
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures
    }
  }),
  setCameraView: (name) => { /* named, deterministic test views */ },
  setQuality: (name) => { /* same path as real UI */ },
  regenerate: (seed) => { /* only if regeneration is a real feature */ }
};
```

The test hook calls production behavior; it must not maintain a parallel fake scene. Semantic counts and seeds are asserted from actual scene data. Renderer info is supporting evidence, not a complete leak proof. If installed, delete `window.__sceneTest` during teardown/remount so stale globals cannot survive into a new scene instance.

## 7. Change-amendment protocol

When a worker needs a contract change, it returns:

```text
BLOCKED—CONTRACT AMENDMENT
Current contract: <signature/field/axis/ownership rule>
Needed change: <exact requested change>
Reason: <reproducible blocker>
Affected modules: <names>
Minimal compatible option: <proposal>
Files not changed because of this blocker: <list>
```

Only the integrator edits the frozen contract. The integrator then notifies every affected worker with the new exact text. No silent compatibility shims or duplicate parallel APIs.

## 8. Ownership matrix template

| Path/module | Owner | May create | Must not touch | Proof before return |
|---|---|---|---|---|
| Entry/renderer/shared types | Integrator | loop, camera policy, composition | worker internals | baseline build |
| `environment.*` | Environment agent | static geometry, owned materials | entry, shared types | factory + bounds evidence |
| `subject.*` | Subject agent | hero geometry, subject animation | environment, look | named parts + update/dispose |
| `look.*` | Look agent | lights, mode materials, environment | geometry modules, renderer entry | screenshot + resource report |
| `textures.*` (Full only) | Texture agent | seeded generators and registry | scene entry, lights | cache/reproducibility check |
| Checks/captures | Verifier | test outputs only, unless explicitly assigned test files | production modules | logs/screenshots/assertions |

Two agents may read the same file; two agents may not write it. Test outputs should use per-agent filenames to avoid collisions.
