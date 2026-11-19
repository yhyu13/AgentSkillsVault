# Materials and PBR analysis

Split the surface data from the lighting and output chain. Two files, two questions: what makes the surface, and what turns it into pixels.

## Inputs

- Pinned source, manifest and forensics records.
- `assets/schemas/v2/materials.schema.json`, `pbr.schema.json` and `common.schema.json`.
- Texture generation code, material factories, light and environment setup, render targets and post-processing.

## Outputs

- `dumps/materials/<demo_id>/materials.json` with `mat.` entity ids.
- `dumps/pbr/<demo_id>/pbr.json` with `pbr.` entity ids.
- Cross-links through `related_entities`; do not duplicate a definition in both files.

## Procedure

1. **Draw the minimal chain.** recipe/texture → material binding → lights and environment → reflections → post-processing → output. Every link is an entity or a scoped gap.
2. **Separate texture from material.** Color space, wrap, filter, resolution and channel meaning belong to the texture; map bindings and scalar parameters belong to the material.
3. **Read the channel writes.** Do not infer an ORM layout from file names or from a shared map. Cite the code that writes each channel. If the map is packed differently, record it.
4. **Record actual parameters.** Color, roughness, metalness, normal scale, env intensity, transparency, side. Values must come from source or a captured state.
5. **Separate direct light, environment, planar reflection and post effects.** Emissive color is a material or light contribution, not a separate PBR entity kind; record it where the schema allows. A visible reflection does not identify the algorithm; only a mirror camera, probe or capture does.
6. **Record the output order as written.** Name the passes that exist, in order. Do not assume a Bloom/GTAO/film chain from familiarity; many demos ship none.
7. **Attach runtime values with pointers.** GPU, quality tier and sampled brightness are runtime fields and must not be presented as calibration or performance proof.
8. **Validate.** Run `scripts/validate_dumps.py`; unresolved cross-references fail the stage.

## Evidence rules

- Albedo is usually sRGB; normal, ORM and data maps are usually linear. Record what the code sets, not what is conventional.
- `roughnessMap = metalnessMap` does not reveal which channel is which.
- A class name such as `MeshStandardMaterial` does not prove a specific BRDF implementation or a custom patch.
- An approximate screen-space effect keeps its approximation label no matter how good it looks.
- Visual similarity with a different camera, light rig or tone mapping is not a material match.

## Acceptance

- [ ] Observed recipes and materials are linked; uncovered items carry a reason.
- [ ] Channel meaning, color space and map binding cite source lines.
- [ ] Lights, environment, planar reflection and pass order are not conflated; absent or unobserved items are labeled.
- [ ] Numeric ranges are valid and runtime fields point at a real record.
- [ ] The applicable validator ran; unverified checks are named rather than implied.
