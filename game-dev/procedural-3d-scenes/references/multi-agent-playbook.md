# Multi-Agent Playbook

Use parallelism for independent implementation or investigation, not as a substitute for design. The highest-value independent role is often the final verifier.

## 1. Choose the smallest effective team

| Scope | Team |
|---|---|
| One small static scene | Integrator implements; one read-only reviewer |
| Clay scene with separate environment and hero | Integrator + 2 geometry workers + verifier; look can stay with integrator |
| Full scene with several generated materials | Integrator + geometry + texture/material + look + verifier |
| Legacy/unclear project | One read-only explorer first; freeze contract before any coding fan-out |

Do not start visible Agent Manager sessions or worktrees unless the user explicitly requested them. Internal subagents normally share the caller's working directory: file allow-lists are mandatory. Do not assume branches or commits exist.

## 2. Dependency graph

```text
Explorer (optional, read-only)
        ↓
Integrator: baseline + brief + frozen contract + thin shell
        ↓
 ┌──────────────┬──────────────┬──────────────┐
 │ Environment  │ Subject      │ Look/Texture │  independent files only
 └──────────────┴──────────────┴──────────────┘
        ↓
Integrator: assemble in dependency order + run checks
        ↓
Verifier (fresh context, read-only) → integrator fixes → second fresh verifier pass
```

Texture work in Full may begin against frozen material keys before final geometry exists. Final UV/scale checks still happen after integration. Effects are last and optional.

## 3. Information every worker receives

Copy this prompt and fill every bracket. Remove irrelevant mode lines instead of leaving ambiguity.

```text
ROLE: <environment | subject | look | texture | verifier>
MODE: <clay | full>
PROJECT ROOT: <absolute path>
OBJECTIVE: <one observable deliverable>

READ FIRST:
- <entry/shared contract files>
- <relevant local conventions/tests>
- <skill reference paths supplied by integrator>

YOU OWN (only these files may be created/edited):
- <exact paths>
YOU MAY READ BUT NOT EDIT:
- <shared files and other modules>

FROZEN CONTRACT:
- Factory/export: <exact signature>
- Root/update/dispose contract: <exact shape>
- World: up=<axis>, ground=<value>, units=<meaning>, bounds=<value>
- Seed stream: <name/value>; no Math.random for reproducible content
- Quality inputs: <exact values and behavior>
- Camera/renderer ownership: <exact rule>

MODE RESTRICTIONS:
Clay: no surface maps, no texture loaders, no CanvasTexture/DataTexture,
no environment maps, no external visual assets, no postprocessing by default.
Full: every visual asset generated locally in code; no downloaded models,
images, HDRIs or skyboxes; generate/cache outside frame loop; dispose replacements.

IMPLEMENT:
1. <observable requirement and semantic object names/counts>
2. <camera/geometry/material/texture requirement>
3. <interaction/update/resize/quality requirement>
4. <disposal and debug-state requirement>

DO NOT:
- change shared contracts or dependencies;
- edit outside the allow-list;
- add a second render loop, renderer, controls, or global listener;
- leave a dev server running, deploy, commit, or push; if assigned browser checks,
  use an isolated port and stop every server you start afterwards;
- claim visual success without a captured and inspected frame.

SELF-CHECK:
- <existing exact build/type command, if safe for worker>
- <module-specific pure/static check>
- <browser check only if assigned an isolated port/output path>

RETURN ONLY:
1. Files changed (exact paths).
2. Exports/behavior implemented.
3. Commands run and exact pass/fail outcomes.
4. Evidence produced (logs/captures/debug values).
5. Contract amendments needed, if any.
6. Known gaps and checks not run.
```

If tools or permission rules prohibit one of these actions, the worker reports that fact; it does not silently substitute a weaker claim.

## 4. Role-specific acceptance

### Environment geometry worker

- Scale and ground contact match the frozen world contract.
- Large composition reads from required cameras before small details.
- Repeated static parts use shared geometry/instancing where appropriate.
- No accidental per-frame geometry creation.
- Returns bounds, semantic counts, and known collision/visual approximations.

### Subject/hero worker

- Silhouette and distinguishing parts are recognizable in Clay.
- Moving pivots and local axes are named and tested through their range.
- Subject does not privately override global lighting/camera/renderer.
- Returns required views and animation states to verify.

### Clay look worker

- Uses untextured materials only; colors remain within one deliberate monochrome palette.
- Lights reveal front/side/top volume without clipping all detail to white.
- Shadow policy is bounded and documented; no postprocessing is added casually.
- Returns material audit proving all surface map slots are empty.

### Full texture/material worker

- Each texture has a semantic key, seed, generator, size, color-space role, wrapping, and owner.
- Color data and non-color data use appropriate project-consistent color-space handling.
- Cache hits avoid regeneration; no generator is called in `update()` for static content.
- Material detail survives the agreed near/mid/far views without obvious seams or swimming.
- Returns cache/reproducibility evidence and texture inventory.

### Full lighting/environment worker

- Environment is procedural (code-built scene/gradient/generator), not an HDRI download.
- Key/fill/environment preserve material readability; emissive/bloom are not substitutes for lighting.
- Shadow cameras cover the intended subject without waste or shimmering caused by careless bounds.
- Returns exposure/lighting parameters and fallback behavior.

### Verifier

- Starts from integrated state, not individual worker claims.
- Reads the contract and runs mode-specific checks independently.
- Captures and inspects required frames; records console/page errors.
- Repeats mode/quality/restart cycles and compares resource counters after settling.
- Returns blocking findings with reproduction steps and exact file evidence where possible.

## 5. Integration protocol

1. Confirm every returned changed path is inside that worker's allow-list.
2. Inspect unexpected files before integration; do not discard user changes.
3. Integrate the shared shell, geometry, materials/textures, lighting, then effects.
4. After each layer, run the smallest relevant check and capture the same comparison view.
5. If two workers need the same change, amend the shared contract once; do not merge competing adapters.
6. Run the full verification gate only after all layers assemble.
7. Send one consolidated, evidence-backed repair assignment to the appropriate owner or fix centrally if ownership is unclear.

## 6. Repair prompt

```text
A verification finding is assigned to your owned module.
Finding: <observable defect, not vague taste>
Reproduction: <exact route/actions/view/state>
Expected: <contractual behavior>
Actual: <evidence/log/screenshot>
Owned files: <allow-list>
Unchanged constraints: <frozen contract/mode restrictions>
First reproduce or explain with evidence why the finding is invalid.
Make the smallest root-cause fix. Rerun the original check and return exact evidence.
Do not fix unrelated issues or change shared files.
```

## 7. Anti-patterns

- **Everyone edits `main.js`:** split modules first; the integrator owns the entry.
- **Workers add their own render loop:** one central loop calls module updates.
- **Shared `Math.random()`:** unrelated additions reshuffle the scene; use named seed streams.
- **Texture generation inside animation:** static maps stutter and leak; generate once and cache.
- **Independent agents independently “fix” integration:** the integrator owns contract amendments.
- **Five agents review the same files:** use one fresh verifier with a clear gate.
- **Build-only delivery:** always open the scene and inspect real frames.
- **Worktree assumption:** internal subagents are not automatically isolated; ownership rules still apply.
