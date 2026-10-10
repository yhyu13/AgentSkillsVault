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
| notes-on-writing | sibling (wrapped) | `D:\GitRepo-AI\notes-on-writing` — Michael Nielsen's "Notes on Writing Well"; SKILL.md = YAML frontmatter + pointer to `references/notes_on_writing.md` (full essay relocated there); no LICENSE in source |
| content-craft | local (distilled) | 提炼自本目录 6 个内容 skill 的共同方法（gracker-writing / shuorenhua / blog-to-* / long-blog / tech-design-to-zhihu + social-push 发布红线） |
| style-cn-tech-deep-dive | local (distilled) | iTech @ cnblogs.com/p/23085057 — ZCode 争议 + 开源复盘长文；提炼 10 个指纹（戏剧钩子 / 第 N 层 / 平心而论反转 / 逆向数字 / N 条死线 / 冒号双行标题 / 立场标 / 收尾三段 / 圈层黑话 / 信息差诚实声明）+ 6 节级结构模板 + 句式库。原文全文存 `content/style-cn-tech-deep-dive/references/source-zcode-article.md`（95 行）作为风格 ground truth |
| lieflat-charts | repo (vendored) | `github.com/larashero3-dotcom/lieflat-charts` — cloned into `content/lieflat-charts`; vendored payload = SKILL.md + catalog.md + report-catalog.md + mono-tokens.js + color-presets.js + templates/ + scripts/ + examples/ + LICENSE. **跳过 `docs/assets/`**（38M README 预览图，可从源码仓库恢复）；PolyForm Noncommercial License. Skill 为「图表品味法典」：数据契约先行选图 + 一张图一个结论 + Lupi/Glance 双阅读速度 + Mono 视觉语法 + 彩色系统 + 12 套中英报告模板 |
| yu-hang-writing-style | local | 俞航本人工程笔记文风（技术规划 / 排查笔记 / 进展周报 / 使用手册 / 测试说明；去 AI 味 + AI 爱用词替换表）。原始副本维护在 `~/.agents/skills/yu-hang-writing-style`，同步复制到 vault |

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
| truth-seeking-research | local | 用户系统提示词蒸馏：求真优先、0–4 级可信度、检索边界、脚本计算、固定输出格式（英文改写 → 结论先行 → `[判断与建议]` → 免责声明）。分发：vault → `~/.claude/skills`、`~/.codex/skills`、`~/.kilo/skills`（副本）+ `~/.agents/skills`（符号链接）+ `%LOCALAPPDATA%\hermes\skills\software-development\`（副本） |

### writing/
| skill | origin | source |
|-------|--------|--------|
| karpathy-explain-better | local | distilled from Karpathy 2026-10-02 X post (4 AI uses: ASD-STE100 简化文字 → 结构图 → 可交互网页 → 讲解视频)；SKILL.md 含触发条件/形式组合/工作流/交付前自检/常见坑；references/modes.md 含每种形式的提示词模板与判断清单；**references/form4-video-delivery.md** 形式 4 交付细则（时长口径 / 逐帧亚像素渲染 / 校验三件套 / faststart+Range / 跨平台清单）；**references/scripts/** 四件可运行脚本（`ffmedia.py` 探测、`plan_timeline.py` 时长规划、`render_pipe.py` 逐帧渲染、`verify_video.py` 交付校验）+ README（含抖动阈值标定表）；分发：vault → `~/.claude/skills`（副本）→ `~/.codex`、`~/.kilo`（副本）+ `~/.agents/skills`（符号链接视图）

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

---

## 沉淀流程（Agent 必须遵守）

**不要在任务进行中顺手改 skill。** 沉淀走「候选队列 → 人工批量审核 → 才动 skill」：

1. 任务中发现可复用经验 → 追加到 vault 根目录 **`SKILL_CANDIDATES.md`**（一条一行，带证据、目标 skill、建议落位）。
2. 任务结束时不改任何 skill，只更新候选队列。
3. 用户批量审核后，才按候选条目改 skill（此时才 bump `version:` + 更新上面的 provenance 表）。
4. 判断标准是可以被复用的做法/判据/坑，不是一次性的项目细节。

### 改 skill 时的硬规则

- **改前先 `git pull`**：本 vault 可能同时有多个 Agent / 机器在改（2026-10-07 实测两个会话同改一个 skill，靠提交时撞在一起合并）。
- 同一 skill 一次只允许一个会话改；改完立刻提交并推送，别留未提交改动过夜。
- 改完要分发：vault → `~/.claude/skills`（副本）→ `~/.codex/skills`、`~/.kilo/skills`（副本）+ `~/.agents/skills`（**符号链接视图**，目标写 `/c/Users/<user>/.claude/skills/<name>`；`ln -s` 需 `MSYS=winsymlinks:nativestrict`，否则 MSYS 会静默变成复制）。
- 分发后用 `diff -rq <vault>/<cat>/<skill> <home>/<skill>` 验证**逐字节一致**。
