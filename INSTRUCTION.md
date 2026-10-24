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
| hyperframes | sibling (+ upstream assets) | `D:\GitRepo-AI\FDE20261023\.kilo\skills\hyperframes` — HTML 渲染成视频（渲染契约 / 工作流）。vault 副本 = FDE 版本 ∪ 用户级已装的 `assets/frame-presets/*`（48 文件），故为超集，不会被 `/MIR` 删掉 |
| hyperframes-cli | sibling | `D:\GitRepo-AI\FDE20261023\.kilo\skills\hyperframes-cli` — `npx hyperframes` 命令行（check / init / capture / usage） |
| hyperframes-registry | sibling | `D:\GitRepo-AI\FDE20261023\.kilo\skills\hyperframes-registry` — 450+ 现成 block / component 目录（examples/ references/） |
| hyperframes-video | sibling | `D:\GitRepo-AI\FDE20261023\.kilo\skills\hyperframes-video` — 视频交付路径；`/media-use`、`/figma` 两个 skill 未安装，原因与替代见本 skill 内文 |
| remotion-to-hyperframes | sibling | `D:\GitRepo-AI\FDE20261023\.kilo\skills\remotion-to-hyperframes` — Remotion 项目迁移到 HyperFrames（assets/ references/ scripts/） |
| progress-doc-style | local (imported) | 用户提供：`C:\Users\1\Downloads\progress-doc-style`（源自《性能跟踪分析平台进度》，纯写作风格与结构范式，不绑定具体项目）。进度/OKR 跟踪文档：OKR 简述表 + 分目标章节 + 行动项七列表 + 状态三符号 + 备注一句话 + 附背景。分发：vault → `~/.claude/skills`（实体）→ `~/.codex/skills`、`~/.kilo/skills`、`~/.agents/skills`（junction 视图） |

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
| frontend-slides | sibling | `D:\GitRepo-AI\FDE20261023\.kilo\skills\frontend-slides` — slide-deck HTML（bold-template-pack / STYLE_PRESETS / viewport-base.css） |
| html-artifacts | sibling | `D:\GitRepo-AI\FDE20261023\.kilo\skills\html-artifacts` — 自包含 HTML artifact（reference/ + scripts/，Apache-2.0） |
| html-slides | sibling | `D:\GitRepo-AI\FDE20261023\.kilo\skills\html-slides` |
| slideshow | sibling | `D:\GitRepo-AI\FDE20261023\.kilo\skills\slideshow` |
| ui-mockups | sibling | `D:\GitRepo-AI\FDE20261023\.kilo\skills\ui-mockups` — 产品 UI 截图级 mockup（浏览器窗口 chrome / 真实品牌图标） |
| visual-explainer | sibling | `D:\GitRepo-AI\FDE20261023\.kilo\skills\visual-explainer` — 可视化解释产物（commands/ kit/ mcp/ plan/ pptx/ video/ templates/ + extension.ts） |
| web-prototype | sibling | `D:\GitRepo-AI\FDE20261023\.kilo\skills\web-prototype` — 网页原型（assets/ references/ example.html） |
| html-ppt | repo (submodule) | `github.com/lewislulu/html-ppt-skill` @ `fd16290` — HTML PPT Studio：一个 theme 文件 = 一套外观、一个 layout 文件 = 一种页面、一个 animation class = 一种入场；token 化设计系统（`assets/base.css`），纯静态、可离线，MIT；已复制进 `design/html-ppt` |

> Skipped 6 of the repo's 13 skills as redundant/niche: `taste-skill-v1` (superseded by v2), `gpt-tasteskill` (stricter GPT/Codex variant, subsumed by v2), `soft-skill` / `minimalist-skill` / `brutalist-skill` (fixed style presets — v2 infers the design language from the brief), `image-to-code-skill` (pipeline = imagegen-web + taste-frontend). All recoverable from the sibling clone.

### devops/
| skill | origin | source |
|-------|--------|--------|
| kanban-orchestrator | local (mirrored) | Hermes agent — `~/AppData/Local/hermes/skills/devops/` |
| kanban-cron-overseer | local (mirrored) | Hermes agent — `~/AppData/Local/hermes/skills/devops/` |
| cron-pipeline-state-machine | local | reference pattern doc (no upstream) |
| mock-devops-platform | sibling | `D:\GitRepo-AI\FDE20261023\.kilo\skills\mock-devops-platform` — 模拟 DevOps 平台（部署/流水线/告警）场景数据 |

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
| procedural-3d-scenes | repo (submodule) | `github.com/yhyu13/opus55-3d-games` @ `05966a9` — 上游 `.claude/skills/procedural-3d-scenes`（v1.0.1）：编排「白膜 → 全程序化」两条交付路径，必选其一，Clay 优先；已复制进 `game-dev/procedural-3d-scenes` |
| three-clay-scenes | repo (submodule) | `github.com/yhyu13/opus55-3d-games` @ `05966a9` — 上游 `.claude/skills/three-clay-scenes`（v1.0.1）：白膜/单色/无贴图的第一版交付；已复制进 `game-dev/three-clay-scenes` |
| three-procedural-scenes | repo (submodule) | `github.com/yhyu13/opus55-3d-games` @ `05966a9` — 上游 `.claude/skills/three-procedural-scenes`（v1.0.1）：代码生成几何/材质/贴图/环境的完整版本；已复制进 `game-dev/three-procedural-scenes` |
| ue4-shader-debug | local | written (UE4 shader compile debugging) |
| ue-renderdoc-auto-capture | local | from `~/.kilo/skills` (Kilo Code agent output; RenderDoc/rdc-cli) |
| webapp-testing | repo | `github.com/ComposioHQ/awesome-claude-skills` |
| game-dev-loop | local | written — orchestrator over the 14 game-dev skills (classify → GDD/TDD → scaffold → implement → test/debug → quality → guide → memory) |
| ai-3d-toolchain | local (distilled) | 提炼自 `ooo.run/post/how-to-use-ai-build-3d-games.html`（作者 @Saccc_c）+ 本机 Blender 5.2.2 / blender_mcp 实测：Tripo + Blender CLI/MCP + Unity CLI/MCP + Auto-Rig Pro 组件清单与验收门槛；**Windows 三道墙**（`curl \| sh` 只支持 macOS/Linux、GBK 崩在 emoji 且副作用已发生、Blender 5.x legacy 插件注册姿势） |
| ai-3d-scene-pipeline | local (distilled) | 同上文章的场景段：概念多视角参考图 → 资产分流（Tripo 生成 vs Blender 代码搭建，判据"能否参数化"）→ Tripo 高精度道具 → Blender/Unity 组装 → **独立审查 Agent 多机位盲审**迭代。原文提示词存 `references/prompts.md`，机位表与差异清单格式存 `references/review-loop.md` |
| ai-3d-character-pipeline | local (distilled) | 同上文章的角色段：T-pose 四视图 → Tripo Smart Mesh P2.0（四边面 + 最高精度）→ 白模检查（Texture / Edit Mesh 分支）→ Auto-Rig Pro 绑骨蒙皮 + 三项动作测试 → Mixamo 动作获取与重定向 → IK 手部/道具接触精调。原文提示词存 `references/prompts.md` |

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
| truth-seeking-research | local | 用户系统提示词蒸馏：求真优先、0–4 级可信度、检索边界、脚本计算、固定输出格式（英文改写 → 结论先行 → `[判断与建议]` → 免责声明）。分发：vault → `~/.claude/skills`（实体）→ `~/.codex/skills`、`~/.kilo/skills`、`~/.agents/skills`（junction 视图）+ `%LOCALAPPDATA%\hermes\skills\software-development\`（副本） |
| prompt-pro | local | 用户本地 skill：`C:\Users\yuhang\.minimax\skills\prompt-pro`。把粗请求补成可执行提纲（目标/验收/范围/约束/输出 五槽位），先 grounding 再落笔，提纲不单独成篇。先看真实系统再下笔的纪律 + 缺信息则问。分发：vault → `~/.claude/skills`（实体）→ `~/.codex/skills`、`~/.kilo/skills`、`~/.agents/skills`（junction 视图） |
| skill-distill | local | 用户贴出的 skill 文本（原出处未指明，标记 local）。会后沉淀流水线：四道闸（可复用/有判断/有证据/有边界）+ 粒度 + 归属 + 三段式写法 + 防重复防膨胀 + PR 流程 + 自检清单 + 红线。规范 skill 沉淀本身。分发：vault → `~/.claude/skills`（实体）→ `~/.codex/skills`、`~/.kilo/skills`、`~/.agents/skills`（junction 视图） |
| perf-tracking-platform | local (imported) | 用户提供：`C:\Users\1\Downloads\perf-tracking-platform`（XD 游戏引擎侧「性能跟踪分析平台」领域知识与工作指引：OKR/进度快照、指标口径、瓶颈判定、看板与报告要求；进度以 Feishu 进度文档为准）。分发：vault → `~/.claude/skills`（实体）→ `~/.codex/skills`、`~/.kilo/skills`、`~/.agents/skills`（junction 视图） |

### video/
| skill | origin | source |
|-------|--------|--------|
| ai-video-production | local (distilled) | 余弦博客《用 Opus 5.5 做视频：制作流程与提示词资源记录》(2026-09-27) + 已 vendor 的开源 skill 清单；含 `references/prompts.md`（提示词模板）与 `references/resources.md`（仓库/工具清单）。分发：vault → `~/.claude/skills`（实体）→ `~/.codex/skills`、`~/.kilo/skills`、`~/.agents/skills`（junction 视图） |
| remotion-best-practices / -create / -render / -captions / -markup / -multimedia / -maps / -interactivity / -docs / -saas / -studio / -upgrade | repo (submodule) | `github.com/remotion-dev/skills` @ `6c67adc` — Remotion 官方 Agent Skills（12 个），上游 `skills/<name>` |
| anidoodle | repo (submodule) | `github.com/alexgreensh/anidoodle` @ `f746cbd` — 手绘风插画与动画（自带配乐与故事线） |
| guizang-product-video-skill | repo (submodule) | `github.com/op7418/guizang-product-video-skill` @ `18842e0` — 读代码库做产品更新宣传片 |
| video-use | repo (submodule) | `github.com/browser-use/video-use` @ `43cfc56` — Agent 剪真实素材（上游根 SKILL.md） |
| manim-video | repo (submodule) | `github.com/browser-use/video-use` @ `43cfc56` — 上游 `skills/manim-video` |
| make-interfaces-feel-better | repo (submodule) | `github.com/jakubkrehel/make-interfaces-feel-better` @ `35545ea` — UI 与动效细节打磨 |
| onetake | repo (submodule) | `github.com/feitangyuan/onetake` @ `013a61a` — 一镜到底产品发布片（PolyForm Noncommercial；样片 mp4 未复制） |
| lemo-opuscar | repo (submodule) | `github.com/lemomo-ai/lemo-opuscar` @ `413a6bd` — 39 种纯代码影片风格库 |
| mengto/* (29) | repo (submodule, 筛选) | `github.com/MengTo/Skills` @ `398cd41` — `3d/`(16) + `media/`(2) + `codex/`(11)；`web-design/`、`game-*/`、`illustration/` 未复制 |
| kinetic-reel | repo (submodule) | `github.com/tuzhechen2005/opus-video-skills` @ `59744a6` — 纯代码动效字 reel：Canvas 2D + three.js 生成层 + WebGL 后期，无头 Chrome 逐帧 + ffmpeg 编码，Node 按同一份 `cues.js` 合成节拍对齐配乐；上游 `skills/kinetic-reel`；已复制进 `video/kinetic-reel` |
| painted-animation | repo (submodule) | `github.com/tuzhechen2005/opus-video-skills` @ `59744a6` — p5.js + p5.brush 手绘水彩/墨线动画：逐帧渲染、模型表（emotions/views）、音乐与歌词同步；上游 `skills/painted-animation`；已复制进 `video/painted-animation` |
| opus-video-prompts | repo (submodule, 补写指针层) | `github.com/joeseesun/opus-video-prompts` @ `7977c80` — 上游**没有 SKILL.md**（18 份提示词 + 54 案例 `cases.json` + README），本 vault 补写一层指针式 SKILL.md（说明怎么挑提示词、技术路线与边界）；上游原文逐字保留；已复制进 `video/opus-video-prompts` |

### vendor/
| skill | origin | source |
|-------|--------|--------|
| anthropics-skills (19 upstream) | repo (submodule) | `github.com/anthropics/skills` pinned @ `dbd4588f9e1033efb41dad4bef2f7947c8993d44` — submodule 路径 `vendor/anthropics-skills`，**不复制进分类目录**；用户级分发时从 `vendor/anthropics-skills/skills/<name>` 取 |
| tripo-skills (`tripo-3d-generation`) | repo (submodule) | `github.com/meterlong/tripo-skills` @ `ce707a6` — submodule 路径 `vendor/tripo-skills`；上游 SKILL.md 在仓库根，用户级实体装到 `~/.claude/skills/tripo-3d-generation`（**不复制进 game-dev/**，分发时从 `vendor/tripo-skills` 取） |
| blender-mcp | repo (submodule) | `github.com/ahujasid/blender-mcp` @ `febcd90` — submodule 路径 `vendor/blender-mcp`（MCP server + Blender 插件源码；安装陷阱见 `game-dev/ai-3d-toolchain`） |
| tripo-3d-for-blender | repo (submodule) | `github.com/Tripo-Developer/tripo-3d-for-blender` @ `d65412f` — submodule 路径 `vendor/tripo-3d-for-blender`（Tripo 官方 Blender 插件，MIT） |
| unity-mcp | repo (submodule) | `github.com/CoplayDev/unity-mcp` @ `ed4e205` — submodule 路径 `vendor/unity-mcp`（MCP for Unity，MIT；官方 Unity MCP 走 Unity 6.3 `com.unity.ai.assistant` 包） |
| remotion-skills (12 upstream) | repo (submodule) | `github.com/remotion-dev/skills` @ `6c67adc` — submodule 路径 `vendor/remotion-skills`；上游在 `skills/<name>`，**已复制进 `video/remotion-*`**（12 个） |
| anidoodle | repo (submodule) | `github.com/alexgreensh/anidoodle` @ `f746cbd` — `vendor/anidoodle`；已复制进 `video/anidoodle` |
| guizang-product-video-skill | repo (submodule) | `github.com/op7418/guizang-product-video-skill` @ `18842e0` — `vendor/guizang-product-video-skill`；已复制进 `video/guizang-product-video-skill` |
| video-use (+ manim-video) | repo (submodule) | `github.com/browser-use/video-use` @ `43cfc56` — `vendor/video-use`；已复制进 `video/video-use`（上游根 SKILL.md）与 `video/manim-video`（上游 `skills/manim-video`） |
| make-interfaces-feel-better | repo (submodule) | `github.com/jakubkrehel/make-interfaces-feel-better` @ `35545ea` — `vendor/make-interfaces-feel-better`；已复制进 `video/make-interfaces-feel-better`（上游在 `skills/<name>`） |
| onetake | repo (submodule) | `github.com/feitangyuan/onetake` @ `013a61a` — `vendor/onetake`；已复制进 `video/onetake`（PolyForm Noncommercial；**未复制 `cases/*.mp4` 与 `assets/*.gif`**，只保留 README 与 logo，样片看 vendor） |
| mengto-skills | repo (submodule) | `github.com/MengTo/Skills` @ `398cd41` — `vendor/mengto-skills`；**筛选复制**进 `video/mengto/`：`3d/`(16) + `media/`(2) + `codex/`(11，视频/动画/审查相关)；`web-design/`(85MB)、`game-*/`、`illustration/` 未复制 |
| lemo-opuscar | repo (submodule) | `github.com/lemomo-ai/lemo-opuscar` @ `413a6bd` — `vendor/lemo-opuscar`；已复制进 `video/lemo-opuscar`（上游在 `plugin/skills/lemo-opuscar`，脚本运行时会自行 clone 完整库） |
| awesome-opus-5-5-videos | repo (submodule) | `github.com/athemeroy/awesome-opus-5-5-videos` @ `87e5cbf` — `vendor/awesome-opus-5-5-videos`（纯资料：1000+ 视频索引，不装成 skill） |
| awesome-claude-video | repo (submodule) | `github.com/opusvideo/awesome-claude-video` @ `4b74fdb` — `vendor/awesome-claude-video`（纯资料） |
| awesome-opus-5.5-video | repo (submodule) | `github.com/zhuyansen/awesome-opus-5.5-video` @ `a359f1c` — `vendor/awesome-opus-5.5-video`（纯资料） |
| awesome-claude-video-skills | repo (submodule) | `github.com/zhuyansen/awesome-claude-video-skills` @ `a613dcc` — `vendor/awesome-claude-video-skills`（纯资料：180 个开源视频 skill 索引 + 安全评级） |
| ai-animation-skill | repo (submodule) | `github.com/Unclecheng-li/AI-Animation-Skill` @ `4b107dd` — 科普文本 → 仿 PPT 轮播单页 HTML（含 14 个 Animation 模板），MIT；**只 vendor 不装**：产物是 HTML 演示，与 `frontend-slides` / `html-ppt` 重叠 |
| frontend-slides | repo (submodule) | `github.com/zarazhangrui/frontend-slides` @ `9906a34` — 单文件零依赖 HTML 演示（bold-template-pack / STYLE_PRESETS / viewport-base.css），MIT；已由并行会话装进 `design/frontend-slides`（它的 `html-slides` router 依赖它） |
| generating-slides | repo (submodule) | `github.com/whq217/generating-slides` @ `0e2fa3a` — 自述「基于 Zara Zhang 的 Frontend Slides 二次开发」：22 套风格预设 + 七阶段引导 + 版面率/字号/秩序三层硬约束 + 机验脚本 + P 键出 PDF；**只 vendor 不装**：与已装的 `frontend-slides` 是同一条工作流的前后版本 |
| html-ppt-skill | repo (submodule) | `github.com/lewislulu/html-ppt-skill` @ `fd16290` — `vendor/html-ppt-skill`（上游仓库根即 skill）；MIT；已复制进 `design/html-ppt` |
| opus-video-prompts | repo (submodule) | `github.com/joeseesun/opus-video-prompts` @ `7977c80` — `vendor/opus-video-prompts`（提示词库，无 SKILL.md）；已包一层装成 `video/opus-video-prompts` |
| opus5.5-video-prompts | repo (submodule) | `github.com/Reger-c/opus5.5-video-prompts` @ `7977c80` — 与 `joeseesun/opus-video-prompts` **同一 commit**（`cases.json` 逐字节相同，镜像仓）；不重复安装 |
| opus-video-skills | repo (submodule) | `github.com/tuzhechen2005/opus-video-skills` @ `59744a6` — `vendor/opus-video-skills`，上游 `skills/kinetic-reel` + `skills/painted-animation`；已复制进 `video/` |
| opus55-3d-games | repo (submodule) | `github.com/yhyu13/opus55-3d-games` @ `05966a9` — 本仓自有 repo（3 个 three.js skill + 3 个游戏 + site）；上游 `.claude/skills/{procedural-3d-scenes,three-clay-scenes,three-procedural-scenes}` 已是 **v1.0.1**（commit `05966a9` "Harden procedural scene skill guidance"），与用户级已装内容一致 → 已按 submodule 更新指针，并把三个 skill 复制进 `game-dev/`，用户级实体随之刷新为**逐字节一致** |

**anthropic 集的取舍（2026-10-24）**

| 上游 skill | 处置 | 理由 / 吸收方 |
|------------|------|---------------|
| `academy-guide` `algorithmic-art` `canvas-design` `claude-api` `discernment-nudge` `docx` `mcp-builder` `pdf` `pptx` `slack-gif-creator` `web-artifacts-builder` `xlsx` | **装** | vault 内无同类，能力不重复 |
| `frontend-design` | 弃 | 与 `taste-frontend` / `taste-redesign` 重叠（同一套「别像 AI 默认」的审美判据） |
| `brand-guidelines` | 弃 | 只讲 Anthropic 品牌色/字体，与 `taste-brandkit` / `taste-stitch` 重叠 |
| `theme-factory` | 弃 | 主题配色/字体，与 `taste-brandkit` / `taste-stitch` / `lieflat-charts` 色彩预设重叠 |
| `internal-comms` | 弃 | 与 manage-up 全套（`weekly-report` `project-update` `meeting-summary` `one-on-one-prep` `upward-email`）重叠 |
| `doc-coauthoring` | 弃 | 与 `proposal` / `technical-design-document` / `content-craft` / `gracker-writing` 的写作流程重叠 |
| `skill-creator` | 弃 | 与 `skill-distill` / `skill-auto-improve-mirror` / `self-improvement` 重叠 |
| `webapp-testing` | 换版本 | 保留 vault 版本（ComposioHQ `awesome-claude-skills`），弃 anthropic 版本（同名会覆盖 vault 副本） |

### 用户级分发（2026-10-24 定：单实体 + junction 视图）

```
~/.claude/skills/   ← 唯一实体（canonical store）
~/.kilo/skills/     ← junction 视图 → ~/.claude/skills/<name>
~/.codex/skills/    ← junction 视图
~/.agents/skills/   ← junction 视图
```

规则：

1. **只往 `~/.claude/skills` 写实体**，另外三个目录只放 junction（`cmd /c mklink /J <link> <target>`，junction 不需要管理员权限）。
2. 删 junction 用 `cmd /c rmdir <link>`（只删链接）；`Remove-Item -Recurse` 对 junction 在 PS 5.1 上有误删目标内容的风险。
3. 覆盖前先比 hash：`robocopy /E` 会覆盖同名 `SKILL.md`（实测 anthropic `webapp-testing` 盖掉 vault 版本）。
4. 加新 skill：实体复制进 `~/.claude/skills/<name>`，再给另外三个目录补 junction（`mklink /J`）。
5. 改完用 `Get-ChildItem <dir> -Directory | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint }` 验证视图是 junction 而不是实体副本。

### writing/
| skill | origin | source |
|-------|--------|--------|
| karpathy-explain-better | local | distilled from Karpathy 2026-10-02 X post (4 AI uses: ASD-STE100 简化文字 → 结构图 → 可交互网页 → 讲解视频)；SKILL.md 含触发条件/形式组合/工作流/交付前自检/常见坑；references/modes.md 含每种形式的提示词模板与判断清单；**references/form4-video-delivery.md** 形式 4 交付细则（时长口径 / 逐帧亚像素渲染 / 校验三件套 / faststart+Range / 跨平台清单）；**references/scripts/** 四件可运行脚本（`ffmedia.py` 探测、`plan_timeline.py` 时长规划、`render_pipe.py` 逐帧渲染、`verify_video.py` 交付校验）+ README（含抖动阈值标定表）；分发：vault → `~/.claude/skills`（实体）→ `~/.codex/skills`、`~/.kilo/skills`、`~/.agents/skills`（junction 视图）

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
- 改完要分发：**唯一实体写 `~/.claude/skills/<name>`**，另外三个目录只放 **junction**：`cmd /c mklink /J <link> <target>`（junction 不需要管理员权限；MSYS `ln -s` 在 Windows 上要 `MSYS=winsymlinks:nativestrict`，否则静默变成复制——所以统一用 `mklink /J`）。删 junction 用 `cmd /c rmdir <link>`（只删链接，不要 `Remove-Item -Recurse`）。
- 分发后用 `diff -rq <vault>/<cat>/<skill> <home>/<skill>` 验证**逐字节一致**。
