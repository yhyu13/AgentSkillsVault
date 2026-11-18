# PCG analysis

Extract procedural generation: random sources, noise, asset recipes, parametric builders and generated results. This stage is about generation, not authoring style.

## Inputs

- Pinned source, manifest and the forensics runtime records.
- `assets/schemas/v2/pcg.schema.json` and `common.schema.json`.
- A task card instantiated from `assets/task-templates/pcg-extract.json`.

## Output

`dumps/pcg/<demo_id>/pcg.json` with `observed_version`, `evidence_refs`, `entities`, `coverage` and `unknowns`. Every entity has `id`, `kind`, `name`, `inputs`, `outputs`, `determinism` and `evidence`.

Kinds that stay separate, matching `pcg.schema.json`: `random_generator`, `noise_function`, `texture_recipe`, `world_builder`, `generator_output`, `not_observed`. A geometry or placement builder is a `world_builder`; its produced instances or pixels are a `generator_output`. The validator rejects any other kind even when `jsonschema` is unavailable.

## Procedure

1. **Pin the version.** Line numbers are only valid for the file whose SHA-256 is recorded.
2. **Find every random entry.** Search `seed`, `random`, `mulberry`, `xorshift`, `noise`, `permutation`. For each: algorithm, seed, value range, symbol and consumption sites. If none is found, record the search terms and files scanned.
3. **Separate noise from recipes.** A noise function has no resolution or asset identity. A recipe has a size, a generator, parameters and an output texture. Mixing them makes the dump unauditable.
4. **Record builders.** Inputs, transforms, outputs and side effects such as collision or batching. Distinguish explicit coordinates, loops, rule systems and random sampling.
5. **Link the chain.** `related_entities` must resolve: random → noise → recipe → material/world consumer.
6. **Attach results only from observation.** Pixels, instance counts and hashes need a runtime capture or a visual observation; otherwise keep them out of the entity and note the gap.
7. **Declare boundaries.** No serialized node graph observed means `node_graph: not_observed` plus the alternative mechanism actually found. "Procedural" is not automatically "PCG graph".

## Evidence rules

- Fixed seed in source (`seed_fixed: true`) does not imply deterministic output; async load order, time and unseeded calls still matter.
- A texture recipe without exported pixels must not carry a content hash. Record the recipe and the source hash instead.
- Same initial state twice proves one repeated state, not cross-browser bitwise repeatability.
- An excerpt line number is not a source line number unless a verified excerpt-to-source map exists.

## Acceptance

- [ ] Every entity has non-empty `inputs`, `outputs`, `determinism` and evidence, and a kind from the schema set.
- [ ] Each texture recipe names its resolution, generator, parameters and consumer, or states the unknown.
- [ ] Random, noise, recipe, builder and result entities are not collapsed.
- [ ] `related_entities` resolve; line ranges fall inside the pinned file.
- [ ] `coverage` matches what was actually inspected; no graph was invented.
