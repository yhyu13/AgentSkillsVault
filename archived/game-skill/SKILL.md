---
name: game-skill
description: End-to-end playable web game creation with OpenGame. Use when the user asks to build, scaffold, debug, run, or evolve a Phaser/TypeScript web game. Composes Template Skill (scaffolding) and Debug Skill (systematic repair).
---

# Game Skill

OpenGame's agent uses **Game Skill** to turn a high-level game prompt into a working, playable web game. It is composed of two concrete modules in this repo:

- **Template Skill**: `agent-test/template-skill/` — evolves a meta-template into specialized project skeletons.
- **Debug Skill**: `agent-test/debug-skill/` — runs the project and repairs build/runtime errors using a living protocol.

This skill is derived directly from the TypeScript source of both modules and tells you how to run them, what conventions they enforce, and what data structures they use.

## When to invoke

- User asks to create, build, make, scaffold, or generate a game.
- User asks to pick an engine or template (Phaser, raw canvas, three.js, etc.).
- User asks to run, test, fix, debug, or evolve a generated game.
- User mentions the meta-template, template families, debug protocol, or OpenGame skill pipeline.

## Required environment

Set one of these API keys (used by classifier, abstractor, diagnoser, repairer, and generalizer):

```bash
export REASONING_MODEL_API_KEY="..."
# fallback: DASHSCOPE_API_KEY or OPENAI_API_KEY
```

Optional overrides:

```bash
export REASONING_MODEL_BASE_URL="..."   # default: dashscope-intl compatible OpenAI endpoint
export CLASSIFIER_MODEL_NAME="..."      # default: qwen-plus
export ABSTRACTOR_MODEL_NAME="..."
export DIAGNOSER_MODEL_NAME="..."
export REPAIRER_MODEL_NAME="..."
export GENERALIZER_MODEL_NAME="..."
```

Without an API key the modules fall back to rule-based heuristics and signature matching.

## Part 1 — Template Skill

Location: `agent-test/template-skill/`

Pipeline:

```
Completed Game Project
  -> Collector   (read files)
  -> Classifier  (LLM/heuristic: determine archetype)
  -> Extractor   (rules: extract patterns)
  -> Abstractor  (LLM/heuristic: generalize templates)
  -> Merger      (update template library)
```

### Meta Template M0

M0 is at `agent-test/template-skill/meta-template/`.

- `core/` — copied into every new project:
  - Vite + TypeScript + Tailwind CSS toolchain.
  - `src/main.ts`, `src/gameConfig.json`.
  - `src/LevelManager.ts`, `src/StateMachine.ts`, `src/utils.ts`.
  - UI scenes: `Preloader.ts`, `TitleScreen.ts`, `UIScene.ts`, `PauseUIScene.ts`, `VictoryUIScene.ts`, `GameOverUIScene.ts`, `GameCompleteUIScene.ts`.
- `extension/` — shared abstractions:
  - `BaseGameScene.ts` — template-method base with abstract `setupWorld()` / `createEntities()` and lifecycle hooks (`onPreCreate`, `onPostCreate`, `onPreUpdate`, `onPostUpdate`), plus `onLevelComplete()` / `onGameOver()`.
  - `BaseEntity.ts` — entity base with hooks `onUpdate()`, `onDamageTaken()`, `onDeath()`.
  - `_TemplateScene.ts`, `_TemplateEntity.ts` — copy-and-customize templates.
  - `manifest.json` — structural description and extension points.

### How to use Template Skill

```bash
cd agent-test/template-skill
npm install

# one-time: create empty library
npx tsx scripts/init.ts

# evolve from a completed game project
npx tsx scripts/evolve.ts <path/to/completed-game>

# batch evolve
npx tsx scripts/evolve.ts <proj1> <proj2> <proj3>

# view status
npx tsx scripts/status.ts
```

Output goes to `agent-test/template-skill/output/`:

- `library.json` — manifest (families metadata only).
- `families/{archetype}/` — per-family template files and `family.json`.

### Classification details

Archetypes are **not** predefined. The classifier is library-aware:

- LLM first: reads the code summary and existing family physics profiles, then returns JSON with `archetype`, `reasoning`, `physicsProfile`, `confidence`, `isNewFamily`.
- Physics profile fields:
  - `hasGravity: boolean`
  - `perspective: "side" | "top_down" | "none"`
  - `movementType: "continuous" | "grid" | "path" | "ui_only"`
- Fallback physics signals (regex on all `.ts` code):
  - `gravity` → side view, continuous, gravity.
  - `free_movement` → top-down, continuous.
  - `grid_discrete` → top-down, grid.
  - `path_wave` → top-down, path.
  - `ui_state` → none, ui_only.
- Match against existing families by physics profile before minting a new archetype label.

### Extraction details

Rule-based (`src/extractor.ts`):

- File structure: directories under `src/` and files per directory.
- Class hierarchy: regex for `class X extends Y`, method visibility/abstract/override/signatures.
- Hooks: abstract methods, or protected methods starting with `on`, `setup`, `create`, `get`, `check`.
- Imports: local imports only (`./` or `../`), tracks imported names.
- Config extensions: diff against M0 baseline `meta-template/core/src/gameConfig.json`, recursing one level.
- Code snippets: full contents of `Base*.ts`, `_Template*.ts`, `utils.ts`, `gameConfig.json`.

### Abstraction details

- LLM: generalizes concrete names to placeholders, hard-coded values to `gameConfig.xxx.value`, texture keys to placeholder comments, game logic to `TODO`/`override`.
- Fallback: promotes `Base*` files as `base_class`, `_Template*` as `copy_template`, `utils.ts` as `utility`.

### Merge details

- New family if archetype not present; otherwise merge into existing family.
- Hooks deduplicated by name, occurrence counts summed.
- Config fields deduplicated by path (latest wins).
- Template files deduplicated by path, keeping longer content.
- Base classes deduplicated by name, latest wins.
- Stability: `min(1.0, contributingProjects.length / 5)`.

## Part 2 — Debug Skill

Location: `agent-test/debug-skill/`

Pipeline:

```
Game Project
  -> Validator   (proactive checks from protocol P)
  -> Runner      (npm run build/test/dev, parse errors)
  -> Diagnoser   (signature match + LLM fallback)
  -> Repairer    (apply known/LLM/direct fixes)
  -> Recorder    (update protocol P)
  -> Debug Loop  (REPEAT...UNTIL)
  -> Generalizer (promote repeated patterns to rules)
```

### Seed protocol P0

Initial entries at `agent-test/debug-skill/seed-protocol/protocol.json`.

Reactive seed error codes:

- `TS2307` — incorrect import path.
- `TS2339` — property does not exist on type.
- `TypeError` — object accessed before initialization.
- `TextureNotFound` — texture key mismatch with `asset-pack.json`.
- `AnimationNotFound` — animation key not defined in `animations.json`.
- `SceneNotFound` — scene not registered in `main.ts`.
- `RangeError` — max call stack / infinite recursion.

Proactive seed checks (`errorCode` used as check id):

- `ASSET_KEY_CONSISTENCY` — texture/audio keys used in code must exist in `public/assets/asset-pack.json`.
- `CONFIG_FIELD_CONSISTENCY` — `gameConfig.xxx` / `config.xxx` accesses must match keys in `src/gameConfig.json`.
- `SCENE_REGISTRATION_CONSISTENCY` — `scene.start()` / `scene.launch()` targets must be registered in `src/main.ts`.
- `ANIMATION_KEY_CONSISTENCY` — animation keys in `.play('...')` must exist in `public/assets/animations.json`.
- `IMPORT_TYPE_KEYWORD` — interface/type imports should use the `type` keyword.
- `OVERRIDE_VISIBILITY` — override methods should not narrow base visibility.
- `LEVEL_ORDER_MISMATCH` — `LEVEL_ORDER[0]` should not be a template default like `Level1Scene`/`Level1`.

### How to use Debug Skill

```bash
cd agent-test/debug-skill
npm install

# one-time: initialize live protocol from seed
npx tsx scripts/init.ts

# run debug loop on a game project
npx tsx scripts/debug.ts <path/to/game-project>
npx tsx scripts/debug.ts <path> --max-iterations 5 --dev

# evolve from historical traces
npx tsx scripts/evolve.ts
npx tsx scripts/evolve.ts output/history/my-game/trace.json

# view status
npx tsx scripts/status.ts
```

Output goes to `agent-test/debug-skill/output/`:

- `protocol.json` — live protocol.
- `protocol.md` — auto-rendered Markdown.
- `history/{project-id}/trace.json` — per-session traces.

### Runner details

Runs `npm run build`, `npm run test`, `npm run dev` in the target project directory.

- Build/test timeout: 120s; dev probe timeout: 15s.
- TypeScript error parsing supports:
  - `file(line,col): error TSxxxx: message`
  - `file:line:col - error TSxxxx: message`
- Runtime parsing (test/dev only):
  - `ReferenceError`, `TypeError`, `RangeError`, `SyntaxError`.
  - Phaser: `Texture 'x' not found`, `Animation 'x' not found`, `Scene 'x' not found`.
- Errors deduplicated by `code:file:line:message`.

### Diagnoser details

Two-phase:

1. Signature matching: score is a weighted sum of error code (0.5), message regex (0.35), and file context glob (0.15). Threshold = `SIGNATURE_MATCH_THRESHOLD = 0.8`.
2. LLM fallback for novel errors: returns candidate `(signature, rootCause, fix)` JSON.

### Repairer details

Fix types:

- `edit` — search/replace patch in source (`search|||replace` format).
- `config` — JSON patch merged into `src/gameConfig.json`.
- `shell` — logged, **not auto-executed**.
- `delete` — delete file at path in `patch`.
- `create` — `path::content` format.

If no diagnosis is available, a direct LLM repair fallback asks for `{search, replace, description}` JSON.

### Recorder details

- Matched existing entry: increments `occurrences`, updates `lastMatchedAt`, adds contributing project.
- Novel entry: added only if the fix is verified (next build/test has fewer errors or passes).
- Unverified fixes are not recorded.

### Debug Loop details

Default `MAX_DEBUG_ITERATIONS = 10`. Flow:

1. Run proactive validations.
2. REPEAT:
   - `npm run build`.
   - On failure: diagnose → repair → re-run same stage → record outcome.
   - `npm run test`.
   - On failure: same.
3. UNTIL both pass or max iterations reached.
4. Optional `npm run dev` probe if `--dev`.
5. Save trace, evolve protocol inline.

### Generalizer details

- Groups reactive entries by `errorCode`.
- If a group reaches `GENERALIZATION_THRESHOLD = 3` occurrences and no existing rule, generate a `ProtocolRule`.
- LLM rule generation first; rule-based fallback aggregates common tags and file contexts into `ValidationCheck` entries.
- New rules are picked up by the Validator in future sessions.

## Common thresholds and constants

- Template family full stability: 5 contributing projects.
- Debug loop max iterations: 10.
- Signature match threshold: 0.8.
- Generalization threshold: 3 occurrences.
- Dev probe timeout: 15s; build/test timeout: 120s.

## Key files

- `agent-test/template-skill/src/{types,config,collector,classifier,extractor,abstractor,merger,library-manager,evolve}.ts`
- `agent-test/template-skill/meta-template/`
- `agent-test/debug-skill/src/{types,config,runner,validator,diagnoser,repairer,recorder,debug-loop,generalizer,evolve,protocol-manager}.ts`
- `agent-test/debug-skill/seed-protocol/protocol.json`
