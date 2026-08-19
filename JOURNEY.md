# JOURNEY — Game Template / Game Debug Skills

`ME` = the human. `YOU` = the AI.

---

## Era 1: Locating the source skills

| ME | YOU |
|---|---|
| "Where are these skills? Can we generate SKILL from those?" | Located Game Skill as two concrete modules in `agent-test/template-skill/` and `agent-test/debug-skill/`, plus the OpenGame skill loader in `packages/core/src/skills/` and `packages/core/src/tools/skill.ts`. Confirmed they were standalone TS packages, not yet Agent Skills. |

## Era 2: First source-derived skill

| ME | YOU |
|---|---|
| "I want you generate skill from these ts files." | Read every TS source file in both modules (types, config, collector, classifier, extractor, abstractor, merger, library-manager, evolve; runner, validator, diagnoser, repairer, recorder, debug-loop, generalizer, protocol-manager, evolve) and generated a source-derived `game-skill` SKILL.md in `.qwen/skills/game-skill/`. |

## Era 3: Repo-neutral skills

| ME | YOU |
|---|---|
| "Generate generic game template/debug skills." | Extracted the logic into plain-language, repo-neutral `game-template` and `game-debug` SKILL.md files under `.qwen/skills/`. |

## Era 4: Publish to the skills vault

| ME | YOU |
|---|---|
| "Copy `.qwen/skills/game-template/SKILL.md` and `.qwen/skills/game-debug/SKILL.md` into `C:\Git-repo-AI\AgentSkillsVault` and push to remote." | Copied both skills into `AgentSkillsVault/game-template/` and `AgentSkillsVault/game-debug/`, committed, rebased over a remote update, and pushed to `origin main`. |

## Era 5: Critique and rewrite

| ME | YOU |
|---|---|
| Supplied a 10-point critique: skills were Phaser-shaped despite claiming engine-agnosticism, hook rule was a hard-coded string match, protocol was under-specified, merge operators undefined, debug loop lacked exit semantics, pre-validations mixed cheap and expensive checks, no out-of-scope guidance, no worked examples, and frontmatter descriptions were overloaded. | Rewrote both skills from scratch addressing every point: added an engine-mapping table and generic lifecycle names; replaced prefix matching with a structural hook rule; added a concrete protocol schema with a JSON example and confidence threshold; defined exact merge algorithms; added iteration-limit exit behavior and dev-server probe details; split validations by cost; added "When NOT to use" sections; added worked examples for template evolution and debug repair; tightened frontmatter to one sentence each. Committed as `4958b22` and pushed. |

## Era 6: Re-sync and final push

| ME | YOU |
|---|---|
| "Copy `.qwen/skills/game-template/SKILL.md` and `.qwen/skills/game-debug/SKILL.md` into `AgentSkillsVault` and push to remote." | Verified the `.qwen` copies and the vault copies were already identical; pulled and pushed so `origin main` stayed up to date. |

---

## How this project teaches vibe coding with AI

### The human's job

- Set the level of abstraction: first source-derived, then repo-neutral.
- Provided a structured, prioritized critique rather than a vague "make it better."
- Insisted on executable skills with schemas, examples, and explicit thresholds.

### The AI's job

- Did not pretend the source code was already generic; extracted concrete constants, schemas, and thresholds from the TS files.
- Accepted the critique and rewrote without defending the first draft.
- Verified file identity before pushing, avoiding empty commits.

### Portable rules

1. A skill is a contract, not a summary — if the central abstraction (here, the debug protocol) lacks a schema, the skill is theater.
2. Repo-neutrality requires explicit engine-mapping tables, not just deleting file paths.
3. "Concrete operators" beat prose: every deduplication, merge, and exit condition needs a defined algorithm or numeric threshold.
4. Worked examples are the fastest way to turn design notes into executable instructions.
5. When asked to "copy and push", verify identity first; identical content needs no new commit.

### One-sentence takeaway

The human sets the bar for executability; the AI meets it by extracting schemas, examples, and explicit thresholds from the source, then documents the division of labor.
