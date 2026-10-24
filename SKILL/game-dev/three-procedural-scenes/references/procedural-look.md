# Procedural Look Reference

Use these patterns inside the host project's architecture. Verify API names against its installed Three.js version; do not assume addons or defaults are identical across versions.

## 1. Deterministic random streams

A small seeded PRNG is sufficient for repeatable placement and texture generation. The specific algorithm matters less than using one stable implementation and documenting generator-version changes.

```js
function mulberry32(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

Derive independent streams by hashing the root seed with a stable stream name. Do not derive streams by consuming a shared generator a variable number of times. Never use current time inside a supposedly reproducible generator.

Fixed-seed test:

1. generate resource/layout A and record a stable hash or semantic samples;
2. dispose it correctly;
3. regenerate with the same seed/version and compare;
4. generate with a different seed and confirm the content changes without invalid geometry.

Pixel hashes can be sensitive to browser/GPU differences; compare CPU-generated source data where possible and use tolerant image comparison for rendered frames.

## 2. Texture roles and color handling

Classify before generating:

| Role | Examples | Typical handling |
|---|---|---|
| Color | base color, emissive color | project-consistent sRGB color input |
| Non-color scalar | roughness, metalness, AO, alpha, bump/height | no sRGB decode; store normalized scalar data |
| Vector | normal maps | no sRGB decode; correct tangent/UV convention and channel orientation |
| Environment/target | procedural PMREM, intermediate HDR | renderer/target workflow, not an ordinary color map |

Do not treat all Canvas textures as color data. A canvas used to pack roughness or normal channels is still non-color/vector data.

For every map, decide:

- dimensions and mip behavior;
- wrapS/wrapT and repeat;
- min/mag filtering and useful anisotropy bound;
- UV/world-space scale;
- channel packing and range;
- ownership/cache/disposal;
- whether the effect is visible enough to justify its cost.

## 3. Canvas/DataTexture generator pattern

Generate static pixels once. The example is deliberately small and omits renderer-specific constants until the project is known:

```js
function generateScalarRoughness({ size, seed, registry }) {
  const key = `v1:roughness:${size}:${seed}`;
  const cached = registry.get(key);
  if (cached) return cached;

  const data = new Uint8Array(size * size * 4);
  const random = mulberry32(seed);
  for (let i = 0; i < size * size; i++) {
    const value = Math.round(150 + random() * 80);
    data[i * 4 + 0] = value;
    data[i * 4 + 1] = value;
    data[i * 4 + 2] = value;
    data[i * 4 + 3] = 255;
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.needsUpdate = true;
  // Set wrapping/filter/color role according to installed Three.js and material use.
  registry.set(key, texture);
  return texture;
}
```

This demonstrates caching and data generation, not a production-quality noise pattern. Pure white noise usually produces harsh detail. Use interpolated value noise, FBM, cellular patterns, physical stripes/grain, or domain-specific masks as required.

Do not create canvases or large arrays in `update()`. If animated texture content is truly needed, bound its resolution/update rate and reuse the same pixel buffer and texture.

## 4. Tileable noise and height-to-normal

For tileable value/FBM noise, sample lattice coordinates modulo the lattice period in both axes. Blend using a smooth interpolation curve. A non-wrapped noise function mirrored at the edge may hide a seam but creates artificial symmetry; choose deliberately.

Height-derived normal maps:

1. generate a scalar height field with wrapped neighbor sampling;
2. compute central differences at each texel, including across edges;
3. choose a strength tied to texture/world scale;
4. normalize the resulting tangent-space vector;
5. encode to unsigned bytes;
6. verify green-channel orientation against the renderer/material convention.

Do not compute normals from unrelated random pixels at full strength. Inspect surfaces under moving light and at glancing angles; a technically valid normal map can still look like embossed noise.

## 5. Registry and reference ownership

A robust registry needs more than a Map:

```text
key → {
  texture,
  generatorVersion,
  dimensions,
  role,
  users/referenceCount (if shared with explicit release),
  lastUsed (only if an eviction policy exists),
  dispose()
}
```

Rules:

- Include every parameter that changes output in the key.
- Do not dispose a cached texture while another material still uses it.
- If cache is permanent for scene lifetime, scene teardown clears and disposes it.
- If cache evicts, define maximum entries/memory and recreate deterministically on demand.
- Replacing a material map does not automatically dispose the old texture; the owner handles it.
- Avoid cloning materials/textures per mesh without a visual need.

## 6. UV and world-space detail

Custom BufferGeometry needs intentional UVs. Common projections:

- box/projected UV for architectural panels and simple props;
- cylindrical UV for pipes, wheels, columns, and rotational forms;
- longitudinal + circumferential UV for roads, rails, and lofted tubes;
- world-space triplanar shader for suitable static organic/terrain surfaces when its cost is justified;
- explicit authored-in-code UV for hero objects requiring controlled seams.

State the intended physical tile size. Texture `repeat` without reference to object dimensions leads to inconsistent scale across procedural parts. Animated UV offset can make surface detail crawl; use it only when the material itself is meant to move.

At far views, high-frequency normal/roughness detail may shimmer. Mipmapping helps color textures but does not automatically make every shading effect temporally stable. Reduce detail strength/frequency where needed.

## 7. Material recipes are semantic, not random

Start from surface behavior:

| Surface | Primary cues | Usually avoid |
|---|---|---|
| Painted metal | colored dielectric coat/paint response, edge wear, moderate roughness variation | treating the whole painted surface as bare metal |
| Bare metal | metallic response, directional wear/scratches, environment reflections | strong random color noise |
| Rubber | high roughness, subtle grain, dark but readable fill response | shiny plastic highlights everywhere |
| Asphalt/concrete | multi-scale aggregate, broad roughness variation, restrained height/normal | high-contrast white noise and deep bumps |
| Wood/fabric | directional fibers/weave, scale-correct grain, roughness response | isotropic noise unrelated to structure |
| Glass/water | controlled transmission/reflection, thickness/fresnel context, stable normals | opacity tricks that hide sorting/depth problems |

These are look-development heuristics, not physical absolutes. Match the host material model and user style. Keep a clay fallback for every semantic family.

## 8. Procedural environment without HDRI

Valid approaches include:

- analytic key/fill/rim lights plus solid/gradient background for stylized scenes;
- code-built sky dome/fullscreen shader with sun, gradient, clouds, or stars;
- a small procedural environment scene rendered to PMREM for reflections;
- project-specific atmospheric sky addons whose inputs are generated parameters, not downloaded art.

A PMREM target is a generated renderer resource, not an external HDRI. Still count and dispose it. Update only when inputs change enough to affect the visible result. For day/night interpolation, ensure parameters and lighting transitions are continuous; do not abruptly swap environments.

Validate:

- metals have something meaningful to reflect;
- diffuse shadow sides remain readable;
- light direction agrees with sky/sun position;
- shadow camera covers the active subject without excessive unused area;
- exposure preserves bright detail and dark separation;
- generated stars/clouds do not shimmer or alias severely at the target view.

## 9. Shader contract

For each custom shader document:

```text
purpose | coordinate space | uniforms and ranges | texture inputs | time source
finite-value assumptions | precision needs | quality knobs | fallback | disposal owner
```

Rules:

- Use one time source from the central loop; wrap large phases where appropriate for numerical stability.
- Match CPU and GPU formulas when gameplay depends on visual displacement (for example waves and floating objects).
- Initialize every uniform; guard divisions, normalization, logarithms, powers, and bounds where invalid values are possible.
- Fix NaN/Infinity at the source. A sanitizer before bloom can be defense-in-depth, not a substitute for correct shader math.
- Avoid per-frame shader/material recompilation for simple state changes.
- Provide an untextured/direct-render diagnostic path so shader failures can be isolated.

## 10. Same-view look review

For each comparison, hold geometry, seed, camera, exposure policy, and viewport constant unless the specific change targets one of them.

Review in order:

1. direct clay;
2. direct full material without textures;
3. direct full textures;
4. procedural environment/lights;
5. each post effect separately;
6. final combined output.

This sequence identifies which layer caused a regression. “Final looks different” is not enough evidence to tune ten parameters simultaneously.
