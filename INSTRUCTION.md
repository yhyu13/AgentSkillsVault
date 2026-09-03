# INSTRUCTION — Skill Provenance & Update Workflow

> **Rule:** every skill in this vault is a **copy of** (or a **distillation from**) a source.
> Record that source so a skill can be re-synced when upstream changes. **Never add a
> skill without recording its origin here.** This file is the authoritative origin record;
> it lives alongside the copied skills so the "where did this come from / how do I update it"
> question is always answerable.

## Origin types

| type | meaning | update method |
|------|---------|---------------|
| `repo` | external git repo (GitHub) | re-clone or `npx skills add <org>/<repo> --skill <name>`, then re-copy the whole skill dir (SKILL.md + references/scripts/templates/assets) |
| `sibling` | a repo under `D:\GitRepo-AI\` (parent-path subfolder) | `Copy-Item -Recurse -Force` from the sibling into the vault |
| `local` | locally invented / distilled (no upstream repo) | edit in place; no sync — bump `version:` when materially changed |

## Provenance table

### agents/
| skill | origin | source |
|-------|--------|--------|
| goal-persistence | sibling (distilled) | `D:\GitRepo-AI\codex` — goal feature (`codex-rs/ext/goal/`) |

### content/
| skill | origin | source |
|-------|--------|--------|
| blog-to-twitter-post | sibling | `D:\GitRepo-AI\content-repurposing-skills\blog-to-twitter-post` |
| blog-to-linkedin-post | sibling | `D:\GitRepo-AI\content-repurposing-skills\blog-to-linkedin-post` |
| long-blog-to-viral-social-posts | sibling | `D:\GitRepo-AI\content-repurposing-skills\long-blog-to-viral-social-posts` |
| tech-design-to-zhihu | local | written by agent (`metadata.created_by: agent`) |
| gracker-writing | sibling | `D:\GitRepo-AI\gracker-writing` (GitHub: Gracker/gracker-writing) |
| social-push | sibling | `D:\GitRepo-AI\social-push\skills\social-push` (GitHub: jihe520/social-push) |
| agent-browser | repo (vendored) | `github.com/vercel-labs/agent-browser`, vendored in `D:\GitRepo-AI\social-push\skills\agent-browser` |
| shuorenhua | sibling (partial — skill runtime only) | `D:\GitRepo-AI\shuorenhua` (GitHub: MrGeDiao/shuorenhua) — copy SKILL.md + references/ + evals/real-samples.md |
| notes-on-writing | sibling (wrapped) | `D:\GitRepo-AI\notes-on-writing` — Michael Nielsen's "Notes on Writing Well"; SKILL.md = YAML frontmatter + `notes_on_writing.md` verbatim; no LICENSE in source |
| content-craft | local (distilled) | 提炼自本目录 6 个内容 skill 的共同方法（gracker-writing / shuorenhua / blog-to-* / long-blog / tech-design-to-zhihu + social-push 发布红线） |

### design/
| skill | origin | source |
|-------|--------|--------|
| taste-frontend | sibling (repo, renamed) | `D:\GitRepo-AI\taste-skill\skills\taste-skill` (GitHub: Leonxlnx/taste-skill) — v2 default; original install name `design-taste-frontend` |
| taste-redesign | sibling (repo, renamed) | `D:\GitRepo-AI\taste-skill\skills\redesign-skill` (GitHub: Leonxlnx/taste-skill) — original install name `redesign-existing-projects` |
| taste-output | sibling (repo, renamed) | `D:\GitRepo-AI\taste-skill\skills\output-skill` (GitHub: Leonxlnx/taste-skill) — original install name `full-output-enforcement` |
| taste-imagegen-web | sibling (repo, renamed) | `D:\GitRepo-AI\taste-skill\skills\imagegen-frontend-web` (GitHub: Leonxlnx/taste-skill) |
| taste-imagegen-mobile | sibling (repo, renamed) | `D:\GitRepo-AI\taste-skill\skills\imagegen-frontend-mobile` (GitHub: Leonxlnx/taste-skill) |
| taste-brandkit | sibling (repo, renamed) | `D:\GitRepo-AI\taste-skill\skills\brandkit` (GitHub: Leonxlnx/taste-skill) |
| taste-stitch | sibling (repo, renamed) | `D:\GitRepo-AI\taste-skill\skills\stitch-skill` (GitHub: Leonxlnx/taste-skill) — original install name `stitch-design-taste` |
| taste-director | local (distilled) | written — router/composer over the 7 taste-* skills (dispatch by intent + shared taste contract) |

> Skipped 6 of the repo's 13 skills as redundant/niche: `taste-skill-v1` (superseded by v2), `gpt-tasteskill` (stricter GPT/Codex variant, subsumed by v2), `soft-skill` / `minimalist-skill` / `brutalist-skill` (fixed style presets — v2 infers the design language from the brief), `image-to-code-skill` (pipeline = imagegen-web + taste-frontend). All recoverable from the sibling clone.

### devops/
| skill | origin | source |
|-------|--------|--------|
| kanban-orchestrator | local (mirrored) | Hermes agent — `~/AppData/Local/hermes/skills/devops/` |
| kanban-cron-overseer | local (mirrored) | Hermes agent — `~/AppData/Local/hermes/skills/devops/` |
| cron-pipeline-state-machine | local | reference pattern doc (no upstream) |

### FDE/
| skill | origin | source |
|-------|--------|--------|
| book-chapter-to-vault | local | distilled from an FDE book (ch2–4) |
| analysis-to-vault | local | distilled from a deep-analysis FDE article |

### game-dev/
| skill | origin | source |
|-------|--------|--------|
| cat-game-architecture | local | distilled from GDC 2026 talk (Hao Yang, Tencent Photon) |
| gdd-markdown-template | repo | `github.com/TheLazyHatGuy/GDDMarkdownTemplate` |
| guide-from-probes | local | from a VibeGames project `.claude/skills/` |
| intro-scene-until-perfect | local | from `VibeGames/7_hotlineShanghai/.claude/skills/` (see `metadata.sources`) |
| kimi3-game-gen | local | distilled from KIMI3 research + a VibeGames case |
| phaser-gamedev | local | written (Phaser 3 best practice) |
| playwright-testing | local | written (Playwright / Vitest / Jest) |
| render-quality-loop | local | from a VibeGames project `.claude/skills/` |
| single-file-html-game | local | written — `mini-browser-games` convention + tier audit |
| technical-design-document | repo | `github.com/Siitoo/Technical-Design-Document` |
| three-pbr-workflow | repo | `github.com/vibe-stack/ggez` |
| ue4-shader-debug | local | written (UE4 shader compile debugging) |
| ue-renderdoc-auto-capture | local | from `~/.kilo/skills` (Kilo Code agent output; RenderDoc/rdc-cli) |
| webapp-testing | repo | `github.com/ComposioHQ/awesome-claude-skills` |
| game-dev-loop | local | written — orchestrator over the 14 game-dev skills (classify → GDD/TDD → scaffold → implement → test/debug → quality → guide → memory) |

### management/
| skill | origin | source |
|-------|--------|--------|
| manage-up-core + 9 (weekly-report, project-update, performance-review, proposal, meeting-summary, quarterly-review, upward-email, one-on-one-prep, style-report) | sibling | `D:\GitRepo-AI\manage-up\skills\<name>` — style-report 合并自 style-alibaba/amazon/bytedance/google/microsoft/tencent 6 个，各自内容在 `style-report/references/` |
| mgmt-discipline | sibling | `D:\GitRepo-AI\mgmt-skill\mgmt-skills\discipline` (+ router SKILL.md) |
| mgmt-individual | sibling | `D:\GitRepo-AI\mgmt-skill\mgmt-skills\individual` (+ router SKILL.md) |
| mgmt-org | sibling | `D:\GitRepo-AI\mgmt-skill\mgmt-skills\org` (+ router SKILL.md) |
| bezos-advisor / god-leader-advisor / renzhengfei-advisor / zhangyiming-advisor | sibling | `D:\GitRepo-AI\mgmt-skill\advisor-skills\<name>.md` |
| qiushi-methodology (11: 矛盾分析/实践论/群众路线/集中力量/调查研究/批评自我批评/统筹兼顾/持久战/星星之火/武装思想/workflows) | local | distilled from Mao 求是 methodology (原著依据 in `original-texts.md`) |
| torchcookpackopt-weekly-report | local | written for the torchcookpackopt project — moved to `archived/` (project-specific, not active) |
| management-loop | local | written — router/orchestrator over the management skills (report / advice / knowledge / methodology clusters) |

### math/
| skill | origin | source |
|-------|--------|--------|
| rigorous-proof | local | written from scratch |

### MattSkills/
| skill | origin | source |
|-------|--------|--------|
| 19 kept (engineering 17 + productivity grilling/handoff) | repo | matt-pocock skills collection — 16 trimmed (in-progress/ + misc/ + productivity aliases/non-dev + grill-with-docs)，recoverable via `npx skills add matt-pocock` |

### opengame-harness/
| skill | origin | source |
|-------|--------|--------|
| all 14 (game-skill, game-template, game-debug, game-gdd-writing, game-*-genre, …) | local (distilled) | an **OpenGame** TS monorepo (`agent-test/template-skill`, `agent-test/debug-skill`, `packages/core/src/skills`) — source repo is NOT under `D:\GitRepo-AI` |

### software-development/
| skill | origin | source |
|-------|--------|--------|
| aisides-ai-self-review | local | written for the AISides project |
| debugger-persona | local | written — debug diagnosis + Chinese doc writing + code discipline persona |
| journey | local | written (two-column ME/YOU history) |
| software-dev-loop | local | written — composes goal / docs / test / memory into one dev loop |
| llm-friendly-dsl-verification | local (distilled) | distilled from gdsl project — `D:\GitRepo-My\godot` (Godot GDExtension recipe-DSL methodology: compile→run→semantic-golden→fix-feedback→scene closed loop) |
| technical-research-analysis-doc | local | written — TorchLight 调研分析 format |
| skill-auto-improve-mirror | local | written by agent (Hermes) — skill improvement + version-aware cross-harness mirror (scripts/mirror_agent_skills.py) |
| governance-doc-design | local (distilled) | distilled from `F:\XD\git-repo\cindy\docs` conventions (product/design/dev/legal rule buckets, 状态+读取时机+事实来源 skeleton, append-only decision log) |

## Update workflow

### 1. Sibling repo (re-copy from `D:\GitRepo-AI\<repo>`)

```powershell
# e.g. re-sync a manage-up skill into the vault
Copy-Item -Recurse -Force "D:\GitRepo-AI\manage-up\skills\weekly-report" `
  "D:\GitRepo-AI\AgentSkillsVault\management\weekly-report"

# e.g. re-sync a content-repurposing skill (repo has skills at its root)
Copy-Item -Recurse -Force "D:\GitRepo-AI\content-repurposing-skills\blog-to-twitter-post" `
  "D:\GitRepo-AI\AgentSkillsVault\content\blog-to-twitter-post"
```

Then diff to confirm only intended changes, update this file if the source moved, and commit.

### 2. External repo

```bash
npx skills add <org>/<repo> --skill <name>       # installs/updates the skill
# then copy the resulting skill dir into the vault:
#   cp -r <installed>/<name> <vault>/<category>/<name>
```

Verify the vault copy stays byte-identical to the freshly installed one (`diff -rq`).

### 3. Local skill

No sync. Edit in place and bump the frontmatter `version:` (or the `metadata.version:`)
so downstream installs can tell it changed.

## Worked example — gracker-writing

`gracker-writing` is a single-skill repo at `D:\GitRepo-AI\gracker-writing`
(GitHub install: `npx skills add Gracker/gracker-writing`). To track + update it like
any other skill:

1. **Copy the whole skill dir** into the vault:
   ```powershell
   Copy-Item -Recurse -Force "D:\GitRepo-AI\gracker-writing" `
     "D:\GitRepo-AI\AgentSkillsVault\content\gracker-writing"
   ```
   (keeps `SKILL.md` + `references/` + `agents/openai.yaml`; drop `README.md`/`LICENSE` if
   you only want the skill payload).
2. **Record the origin** in the provenance table above:
   `gracker-writing | sibling | D:\GitRepo-AI\gracker-writing (GitHub: Gracker/gracker-writing)`.
3. **Update later** by re-running step 1 whenever the source repo changes.

## Add-a-new-skill checklist

1. Determine origin type: `repo` / `sibling` / `local`.
2. Copy the **whole** skill dir (SKILL.md + `references/` `scripts/` `templates/` `assets/` `examples/`).
   Copying only SKILL.md breaks relative links and helper scripts.
3. Add a row to the provenance table above.
4. Add the skill to `README.md` (layout tree + skills table).
5. Optionally add an `origin:` line to the SKILL.md frontmatter (the table here is authoritative).
6. Install to global agents (`~/.claude/skills`, `~/.kilo/skills`, `~/.codex/skills`) when requested.

## Not-yet-copied sibling sources

These repos exist under `D:\GitRepo-AI\` but are not yet in the vault. Track them here
so the origin is known before the copy happens:

| source | skills | suggested category |
|--------|--------|--------------------|
| `D:\GitRepo-AI\img2threejs` | img2threejs (image → procedural Three.js) | game-dev/ |
| `D:\GitRepo-AI\renderdoc\renderdoc-skill` | renderdoc-gpu-debug | game-dev/ |
| `D:\GitRepo-AI\threejs-game-skills\skills\*` | 9 × threejs-* | game-dev/ |
| `D:\GitRepo-AI\kilocode` / `kilo-marketplace` / `AutoUE` / `Unreal*` / `VibeUE-master` | (audit before copying) | tbd |
