# World dump

Record the scene as data: regions, geometry batches, collision, lights, quality switches and runtime handles. Keep units and coordinate conventions explicit.

## Inputs

- Pinned source, manifest and forensics records.
- `assets/schemas/v2/world.schema.json` and `common.schema.json`.
- Scene graph code, geometry construction, collision and lighting setup, and any runtime traversal exposed by the source.

## Output

`dumps/world/<demo_id>/world.json` with `world.` prefixed entities: `scene`, `world_region`, `geometry_batch`, `collision_system`, `lighting_set`, `quality_system`, `runtime_observation`, `not_observed`.

Domain fields live under `value`. If the source states no unit, write `not_specified`; do not convert to meters by assumption.

## Procedure

1. **Root the scene.** Background, fog, camera, lights, coordinate convention and unit evidence. Roots must not rely on a screenshot.
2. **Describe regions.** Dimensions, floor, ceiling, openings and explicit layout. Cite the lines that create them.
3. **Recover geometry and batching.** Input geometry, preserved attributes, transforms, UVs, material buckets and the merge function. Distinguish the builder from its output group.
4. **Separate collision.** Collider data structure, axis order, ray algorithm and spawn placement. If nothing was exported, `collider_count: not_captured`.
5. **Lights and quality.** Count only what source or a traversal establishes. Keep quality tiers, shadows, reflections and AO as separate switches.
6. **Runtime handles.** What the page exposes (scene, camera, renderer, state) and what each returns. Do not present the last pass's renderer info as whole-scene statistics.
7. **Search for absent systems.** LOD, streaming, partitioning, instancing. No hit becomes a scoped `not_observed`, never "does not exist".
8. **Validate.** Schema, hashes, line ranges, JSON Pointers and cross-references.

## Evidence rules

- Four explicitly created lights can be `count=4`; an estimate from a screenshot cannot.
- Source numbers prove values, not physical units.
- `mergeGeometries` proves a batching call, not the frame's draw-call count.
- AABB component order must come from the read/write code; state it explicitly.
- A traversal result describes one load of one build on one machine.

## Acceptance

- [ ] Observed scene, regions, collision, lights and quality systems have direct evidence.
- [ ] Absent structures are labeled with the search scope instead of assumed.
- [ ] Units stay `not_specified` when the source does not declare them.
- [ ] Uncaptured instance tables and collider counts are marked, not estimated.
- [ ] Cross-references to PCG, materials and shaders resolve.
