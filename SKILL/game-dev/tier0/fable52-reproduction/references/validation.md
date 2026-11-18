# Validation

Validation answers a narrow question: do the dumps satisfy the declared structure and relations? It does not answer whether the analysis is true or the reproduction is good.

## Inputs

- Domain dumps under `dumps/<domain>/<demo_id>/`.
- `assets/schemas/v2/*.schema.json` plus this package's `scripts/validate_dumps.py`.
- The pinned source file, runtime records and screenshots referenced as evidence.
- Python 3.10+; `jsonschema` is optional and only adds schema enforcement.

## Outputs

- `reports/evidence/<demo_id>-dump-validation.json`: status, per-domain statistics, document hashes, errors, mutation results.
- `dumps/index.json`: optional; if the project maintains one, rebuild it from a passing report rather than from a failed run.

Report status is `passed` or `failed`. A passed report may still contain `coverage.status: partial`; the two mean different things and must not be merged.

## Procedure

1. **Structure.** Run the checker. With `jsonschema` installed it applies the v2 schemas; without it, the built-in structural checks still run.
2. **Pinned input.** Confirm the observed file's byte count and SHA-256 against the manifest.
3. **Evidence.** Every evidence entry is non-empty and its line range falls inside the pinned file. JSON Pointers must resolve.
4. **Relations.** Unique entity ids, unique evidence ids, resolvable `related_entities`, resolvable texture and material links.
5. **Semantics.** Roughness and metalness within `[0,1]`; `compiled_variants.status=not_captured` implies an empty list.
6. **Failure injection.** Copy a dump in memory and introduce: missing evidence, duplicated entity id, dangling related entity, out-of-range line. Each must be rejected. The on-disk dump is never modified.
7. **Write the report.** Only an overall pass updates the index.

```bash
python scripts/validate_dumps.py --project <project> --demo-id <demo_id>
python scripts/validate_dumps.py --project <project> --demo-id <demo_id> --mutate
```

The report path is refused when it already exists; pass `--overwrite` to replace your own run or `--out` to keep a separate record. This protects historical reports from accidental replacement.

## Evidence rules

- A passing validator proves declared structure only. It does not prove algorithm parity, visual parity or performance.
- If evidence hashes changed, re-analyze; do not update the hash to make the check green.
- `coverage=partial` must not be rewritten as `complete` by deleting unknowns.
- Failure feedback names the file, entity, field and error code so a weaker model can return to the exact task.
- Never run a validator that overwrites a historical report without checking its output path first.

## Error codes

`SCHEMA`, `SOURCE_HASH`, `EVIDENCE_MISSING`, `EVIDENCE_POINTER`, `EVIDENCE_LINE_RANGE`, `DUPLICATE_ENTITY_ID`, `DUPLICATE_EVIDENCE_ID`, `UNRESOLVED_RELATED_ENTITY`, `PARAMETER_RANGE`, `VARIANT_CONTRADICTION`, `ENVELOPE`.

## Acceptance

- [ ] Every domain document passes the applicable checks and the command exit code matches the report.
- [ ] At least four failure injections are rejected as expected.
- [ ] Report hashes match the files on disk.
- [ ] Index statistics match entity, evidence and cross-link counts.
- [ ] The report distinguishes schema success from coverage completeness.
