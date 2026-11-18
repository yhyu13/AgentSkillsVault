# Shader analysis

Inventory the shader code that actually exists, and label how each unit is represented. Most errors in this area come from promoting a patch or a program count into "complete shader source".

## Inputs

- Pinned source, manifest and forensics records.
- `assets/schemas/v2/shaders.schema.json` and `common.schema.json`.
- Inline shader strings, `ShaderMaterial`, `ShaderPass`, `onBeforeCompile` hooks, render targets and pass chains.
- Compiled variants only if a capture actually exposed them.

## Output

`dumps/shaders/<demo_id>/shaders.json`. Each `shader_unit` carries `representation`, `stages`, `uniforms`, `dependencies`, `compiled_variants`, `injection_points` (patches only) and evidence.

Representations: `complete_source`, `source_patch`, `runtime_compiled`, `ir`, `binary`.

## Procedure

1. **Locate candidates.** Search `ShaderMaterial`, `ShaderPass`, `onBeforeCompile`, `vertexShader`, `fragmentShader`, `RenderTarget`. Give every hit a candidate id and a location.
2. **Classify the representation.** A full string is `complete_source`. A replacement of built-in chunks is `source_patch`, even when it contains a lot of code. Do not present a patch as independently compilable.
3. **Map stages and uniforms.** Record name, type, stage and injection point. A uniform read at runtime but never declared belongs in `unknowns`.
4. **Link dependencies.** Material, texture, render target and pass position must resolve in the materials/PBR dumps.
5. **Audit variants.** Only a program capture fills variants. Otherwise `status: not_captured` and `items: []`. Never distribute a program total across units.
6. **Declare exclusions.** State whether engine-internal shaders, IR, binary and compile logs were analyzed. Importing a library is not transcribing its shaders.
7. **Validate.** Schema, line ranges, uniform consistency, variant contradiction and cross-references.

## Evidence rules

- A patch must name the chunk it replaces, for example `map_fragment` or `lights_fragment_end`.
- `programs=39` is a count of programs, not 39 custom shaders.
- Runtime-compiled source, decompiled text, IR and binary are different artifacts and different files.
- An empty variant list with a reason is honest; a guessed variant list is not.
- Effect names in UI copy are not evidence of the technique behind them.

## Acceptance

- [ ] Each observed shader or patch is classified by representation with source evidence.
- [ ] Patch injection points, stages and uniforms are recorded; nothing is copied from another demo's counts.
- [ ] Dependencies resolve to materials, textures or targets.
- [ ] Variants are either captured with items or empty with `not_captured`.
- [ ] Missing shader evidence is recorded as a scoped gap, not filled with a plausible unit.
