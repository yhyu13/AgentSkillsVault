---
name: fable52-reproduction
description: Reverse-engineer and reproduce a public or authorized single-page web game demo with traceable evidence, domain dumps and a runnable slice. 适用于网页游戏逆向、PCG/材质/Shader/场景转储、最小复现与小模型任务卡；当用户要求根据网页 Demo 的源码或运行证据复现玩法、画面或机制时触发。不用于无许可复制代码、仅凭截图猜测内部实现，或没有证据就宣称视觉等价。
metadata:
  version: 1.1.0
  provenance: local
---

# Fable 5.2 reproduction

Turn a browser demo into inspectable evidence and, only when licensed and requested, a runnable reproduction. The order is fixed: source and permission first, observation second, dumps third, reproduction fourth, validation last. A community catalog listing, a similar-looking screenshot or a model's prior never substitutes for source or runtime evidence.

- `assets/cases/case-evidence.json` pins the paths and SHA-256 of the recorded samples' source, dumps and runtime records. Those files stay in the source project; they are not bundled. Verify with `python scripts/verify_case_evidence.py --project <project>` where that workspace exists.

## 1. Support boundary

This package is self-contained: every instruction, schema, task template and checker it needs ships inside this directory. It does **not** ship a demo, a project workspace, captured evidence or a finished reproduction.

- Stage coverage is proven for two recorded samples only: `sublevel-07-fps-repro` and `materials-02`. Both are documented in [the first case](references/case-sublevel07.md) and [the second case](references/case-materials02.md); their facts do not generalize by default.
- The domain task templates are parameterized, but instantiating one for a new demo does not prove the demo can be dumped. Each stage must record what was actually observed.
- No small-model cross-type experiment has been completed. Treat cross-type reproduction as unproven until a recorded run exists.
- This skill never authorizes extra capture, GPU readback, paid model calls, network access beyond what the user granted, or reuse of unlicensed assets.

## 2. Workspace contract

Work inside a project root supplied by the user. Paths below are relative to that root; substitute the real root when running commands.

```text
<project>/
├── sources/manifests/      source records, licenses, hashes
├── sources/snapshots/      read-only responses and pages
├── demos/raw/<demo_id>/    untouched source files
├── demos/analysis/<demo_id>/ derived notes and experiments
├── dumps/<domain>/<demo_id>/  pcg | materials | pbr | shaders | world
├── reports/evidence/       claim-to-evidence records
├── reports/gaps/           not_observed / not_captured / failures
└── tools/                  project-local builders and validators
```

If the project has no builder or validator for a stage, produce the dump by hand and mark its checks `unverified`; do not invent a passing command. Never edit files under `demos/raw/`, frozen fixtures or historical reports. If the user has not supplied a project root and one is required, ask once instead of writing into an unrelated directory.

## 3. Evidence levels

Every technical claim carries one level and one version.

| Level | What it can support |
|---|---|
| `direct_source` | File structure, explicit parameters, code paths at a pinned version |
| `runtime_capture` | What this run actually executed, loaded or rendered |
| `static_inference` | A stated inference from a build artifact, with uncertainty |
| `visual_observation` | Appearance and visible behavior only |
| `third_party_claim` | That a third party asserted something |
| `unverified` | A lead; never a conclusion |

Rules that decide most disputes:

- Pin a commit or content hash before quoting a line number. A line number without a version is not evidence.
- `HTTP 200` means reachable once. It does not prove playable, open source, licensed for reuse, or error-free.
- An author's statement proves the author said it. It does not prove unattended generation, cost, or a clean run.
- Object existence, a constructor call or a bound symbol is not authorship. Report identity gaps as gaps.
- Never write `not_observed` as "does not exist". State the searched scope and the evidence that was unavailable.
- Preserve failed checks. Re-running a check after a fix adds a result; it does not erase the failure.

## 4. Pipeline

Run stages in order. A stage may be skipped only with a recorded reason; skipping it blocks every claim that depends on it.

```text
intake → forensics → {pcg | materials+pbr | shaders | world} → reconstruction → validation
```

1. **Intake** — [source intake](references/source-intake.md). Record URL, final URL, status, UTC time, license, commit, per-file SHA-256 and the exact quoted passage. Output a manifest and a read-only snapshot.
2. **Forensics** — [demo forensics](references/demo-forensics.md). Record startup, requests, WebGL, console, initial state and one controlled step sequence. Output runtime JSON plus logs and screenshots.
3. **Domain dumps** — [PCG](references/pcg-analysis.md), [materials and PBR](references/materials-pbr.md), [shaders](references/shader-analysis.md), [world](references/world-dump.md). Emit only observed entities; every entity needs an id, a kind, inputs, outputs and evidence.
4. **Reproduction** — [reconstruction](references/reconstruction.md). Build the smallest slice that exercises the agreed mechanisms, with manifest, README and license note. When the user asked for a finished experience, follow [quality delivery](references/quality-delivery.md) instead of silently shipping a graybox.
5. **Validation** — [validation](references/validation.md). Check schema, hashes, line ranges, JSON Pointers, cross-references, parameter ranges and at least one failure injection. Schema success is not experience quality.

Shared vocabulary: [evidence levels and claim records](references/evidence-levels.md).

## 5. Task templates

The JSON files under `assets/task-templates/` are parameterized; they contain `{{DEMO_ID}}`, `{{PROJECT_ROOT}}` and similar tokens rather than one sample's frozen paths. Instantiate one before use:

```bash
python scripts/instantiate_task.py assets/task-templates/pcg.json \
  --demo-id my-demo --project-root /path/to/project --out tasks/pcg-extract.my-demo.json
python scripts/instantiate_task.py assets/task-templates/intake.json \
  --demo-id my-demo --project-root /path/to/project \
  --source-commit <40-hex> --source-sha256 <64-hex> --source-path demos/raw/my-demo/index.html \
  --check-project --out tasks/intake.my-demo.json
python scripts/instantiate_task.py --self-test
```

The intake template consumes the three source flags; other templates ignore them and the script prints a warning. `--check-project` additionally requires the declared input files and the output directory to exist. The demo id must match the dump schema pattern `^[a-z][a-z0-9-]*$`.

The instantiator refuses unknown tokens, writes no file when a token is unresolved, and refuses to overwrite an existing task card. A task card is valid only when its `input_files`, `input_schema` and `acceptance_checks` resolve inside the actual project; check this before handing it to a weaker model.

## 6. Checkers

```bash
python scripts/validate_dumps.py --project /path/to/project --demo-id my-demo
python scripts/validate_dumps.py --project /path/to/project --demo-id my-demo --mutate
python scripts/validate_dumps.py --self-test
python scripts/capture_runtime.py --demo /path/to/index.html --out runtime.json --screenshot frame.png
python scripts/verify_case_evidence.py --project /path/to/project
```

A new report never overwrites an existing one unless `--overwrite` is passed.

`capture_runtime.py` needs Python Playwright plus Chromium. When the browser is unavailable it exits with a dependency message; record that failure and leave the forensic stage `unverified` instead of inventing runtime data. One headless load is not a playability, input, audio or performance test.

`verify_case_evidence.py` checks the recorded samples against the original project, because those files are not bundled. Without the project, the case numbers remain author records.

`validate_dumps.py` performs structural and relational checks that work on any demo: required envelope fields, unique entity ids, resolvable `related_entities`, non-empty evidence, source line ranges inside the observed file, JSON Pointers resolving to real fields, roughness/metalness bounds, and the `compiled_variants` consistency rule. With `jsonschema` installed it also applies `assets/schemas/v2/*.schema.json`.

What it cannot do: judge whether a claim is true, whether coverage is complete, whether the original was copied faithfully, or whether the result looks, sounds or feels right. Those require the observation records in [quality delivery](references/quality-delivery.md).

## 7. Stop conditions

Stop and report a gap instead of guessing when:

- the source, author or version cannot be pinned;
- the license forbids the intended use, or no license is found and the plan requires redistribution;
- the needed evidence is behind a login, payment or technical protection that was not authorized;
- a capture, GPU read or model run would exceed the granted authorization;
- the runtime experiment cannot be repeated;
- a dump fails schema or reference checks and the cause is unknown;
- the only available comparison is visual similarity.

A partial result with named gaps is acceptable. A fabricated entity, a back-filled hash, a relabeled failure or a deliberately weakened check is not.

## 8. Delivery checklist

- [ ] Every demo, file, entity and claim resolves to a versioned source or a recorded run.
- [ ] Original, derived and rebuilt files are separated; licenses and hashes are present.
- [ ] Dumps contain only observed entities, with scoped gaps for the rest.
- [ ] The applicable checkers actually ran; their exit codes and logs are recorded.
- [ ] Reproduction scope, deviations and unimplemented behavior are stated next to the artifact.
- [ ] Experience claims rest on observed output, not on wiring, schema success or a passing unit test.
- [ ] Remaining unknowns and the next authorization needed are explicit.
