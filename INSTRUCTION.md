# INSTRUCTION — Skill Provenance & Update Workflow

> **Retired skills (2026-10-25).** 67 skills were removed from the vault and from
> every harness store after the defect audit flagged them as *never usable*,
> carrying *error references*, *low quality*, or *not standalone*. The origin rows
> below are kept for provenance and are tagged `(retired)`, but those skills are no
> longer installed. See `REMOVED-SKILLS.md` for the reason per skill and the
> upstream `vendor/` copy kept for re-adding; `.kilo/removed-skills.txt` stops the
> sync script from reinstalling them.

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
| blog-to-twitter-post | sibling | `D:\GitRepo-AI\content-repurposing-skills\blog-to-twitter-post` ；2026-10-25 本地 fork：description 首行判别化（消除 shadowing），v1.0.0 |
| blog-to-linkedin-post | sibling | `D:\GitRepo-AI\content-repurposing-skills\blog-to-linkedin-post` ；2026-10-25 本地 fork：description 首行判别化（消除 shadowing），v1.0.0 |
| long-blog-to-viral-social-posts | sibling | `D:\GitRepo-AI\content-repurposing-skills\long-blog-to-viral-social-posts` |
| tech-design-to-zhihu | local | written by agent (`metadata.created_by: agent`) |
| gracker-writing | sibling | `D:\GitRepo-AI\gracker-writing` (GitHub: Gracker/gracker-writing) |
| social-push | sibling | `D:\GitRepo-AI\social-push\skills\social-push` (GitHub: jihe520/social-push) |
| agent-browser | repo (vendored) | `github.com/vercel-labs/agent-browser`, vendored in `D:\GitRepo-AI\social-push\skills\agent-browser` |
| shuorenhua | sibling (partial — skill runtime only) | `D:\GitRepo-AI\shuorenhua` (GitHub: MrGeDiao/shuorenhua) — copy SKILL.md + references/ + evals/real-samples.md |
| notes-on-writing | sibling (wrapped) | `D:\GitRepo-AI\notes-on-writing` — Michael Nielsen's "Notes on Writing Well"; SKILL.md = YAML frontmatter + pointer to `references/notes_on_writing.md` (full essay relocated there); no LICENSE in source |
| content-craft | local (distilled) | 提炼自本目录 6 个内容 skill 的共同方法（gracker-writing / shuorenhua / blog-to-* / long-blog / tech-design-to-zhihu + social-push 发布红线） |
| style-cn-tech-deep-dive | local (distilled) | iTech @ cnblogs.com/p/23085057 — ZCode 争议 + 开源复盘长文；提炼 10 个指纹（戏剧钩子 / 第 N 层 / 平心而论反转 / 逆向数字 / N 条死线 / 冒号双行标题 / 立场标 / 收尾三段 / 圈层黑话 / 信息差诚实声明）+ 6 节级结构模板 + 句式库。原文全文存 `content/style-cn-tech-deep-dive/references/source-zcode-article.md`（95 行）作为风格 ground truth |
| lieflat-charts (retired) | repo (vendored) | `github.com/larashero3-dotcom/lieflat-charts` — cloned into `content/lieflat-charts`; vendored payload = SKILL.md + catalog.md + report-catalog.md + mono-tokens.js + color-presets.js + templates/ + scripts/ + examples/ + LICENSE. **跳过 `docs/assets/`**（38M README 预览图，可从源码仓库恢复）；PolyForm Noncommercial License. Skill 为「图表品味法典」：数据契约先行选图 + 一张图一个结论 + Lupi/Glance 双阅读速度 + Mono 视觉语法 + 彩色系统 + 12 套中英报告模板 |
| yu-hang-writing-style | local | 俞航本人工程笔记文风（技术规划 / 排查笔记 / 进展周报 / 使用手册 / 测试说明；去 AI 味 + AI 爱用词替换表）。原始副本维护在 `~/.agents/skills/yu-hang-writing-style`，同步复制到 vault |
| hyperframes | sibling (+ upstream assets) | `D:\GitRepo-AI\FDE20261023\.kilo\skills\hyperframes` — HTML 渲染成视频（渲染契约 / 工作流）。vault 副本 = FDE 版本 ∪ 用户级已装的 `assets/frame-presets/*`（48 文件），故为超集，不会被 `/MIR` 删掉 |
| hyperframes-cli (retired) | sibling | `D:\GitRepo-AI\FDE20261023\.kilo\skills\hyperframes-cli` — `npx hyperframes` 命令行（check / init / capture / usage） |
| hyperframes-registry (retired) | sibling | `D:\GitRepo-AI\FDE20261023\.kilo\skills\hyperframes-registry` — 450+ 现成 block / component 目录（examples/ references/） |
| hyperframes-video | sibling | `D:\GitRepo-AI\FDE20261023\.kilo\skills\hyperframes-video` — 视频交付路径；`/media-use`、`/figma` 两个 skill 未安装，原因与替代见本 skill 内文 |
| booth-kiosk-deck | sibling (+ reference impl) | `D:\GitRepo-AI\FDE20261023\.kilo\skills\booth-kiosk-deck` — 展位/评审全自动循环口播演示（HTML kiosk deck + HyperFrames MP4，15 分钟流水线）。源 skill 原缺参考实现，已按 SKILL.md 内引用路径把 `assets/day1025/booth/booth_1/`（build.py 单源 + tts/ + video/ + renders/ 样片 mp4，35 文件 10.75 MB）一并并入 skill 目录 |
| remotion-to-hyperframes (retired) | sibling | `D:\GitRepo-AI\FDE20261023\.kilo\skills\remotion-to-hyperframes` — Remotion 项目迁移到 HyperFrames（assets/ references/ scripts/） |
| progress-doc-style | local (imported) | 用户提供：`C:\Users\1\Downloads\progress-doc-style`（源自《性能跟踪分析平台进度》，纯写作风格与结构范式，不绑定具体项目）。进度/OKR 跟踪文档：OKR 简述表 + 分目标章节 + 行动项七列表 + 状态三符号 + 备注一句话 + 附背景。分发：vault → `~/.claude/skills`（实体）→ `~/.codex/skills`、`~/.kilo/skills`、`~/.agents/skills`（junction 视图） |
| genoffice (retired) | repo (submodule) | `github.com/genspark-ai/genoffice` @ `28cee5c` (Apache-2.0) — 上游 `skills/genoffice`：本地创建/转换/读写 Office 文档（docx/xlsx/pptx/pdf）。vendor 仓 71 MB，只装 skill 目录 |
| okr-planner | repo (submodule) | `github.com/genspark-ai/genoffice` @ `28cee5c` — 上游 `skills/recommended/okr-planner`；**注意**：与 vault 自有 `software-development/perf-tracking-platform` + `content/progress-doc-style` 同属 OKR 一片地，后续应合并，避免三份并存 |
| legalrabbit-docx | repo (submodule) | `github.com/LegalRabbit-AI/legalrabbit-docx-mcp` @ `a1c9be8` (MIT) — 上游 `plugins/docx/skills/legalrabbit-docx`。雷达结论要求「先做 token 基准再采纳」，本批**只装未测** |
| excel-hygiene | repo (submodule) | `github.com/BayramAnnakov/excel-hygiene` @ `bca5a74` (Apache-2.0) — `.xlsx` 确定性体检（仓库根即 skill） |
| market-intel (retired) | repo (submodule) | `github.com/DaizeDong/market-intel` @ `1046cd8` (MIT) — 上游 `skills/market-intel`：商用数据（X/Twitter/电商/金融/SEO）取数与研判 |
| pptx | repo (submodule) + local fork | `github.com/anthropics/skills` 的 `skills/pptx`（2026-10-25 由 `vendor/` 提升为 curated 副本——vendored 文件不手改）；description 首行判别化（新建 pptx，不含改已有 deck），v1.0.0 |

### design/
| skill | origin | source |
|-------|--------|--------|
| taste-frontend (retired) | sibling (repo, renamed) | `D:\GitRepo-AI\taste-skill\skills\taste-skill` (GitHub: Leonxlnx/taste-skill) — v2 default; original install name `design-taste-frontend` |
| taste-redesign | sibling (repo, renamed) | `D:\GitRepo-AI\taste-skill\skills\redesign-skill` (GitHub: Leonxlnx/taste-skill) — original install name `redesign-existing-projects` |
| taste-output | sibling (repo, renamed) | `D:\GitRepo-AI\taste-skill\skills\output-skill` (GitHub: Leonxlnx/taste-skill) — original install name `full-output-enforcement` |
| taste-imagegen-web | sibling (repo, renamed) | `D:\GitRepo-AI\taste-skill\skills\imagegen-frontend-web` (GitHub: Leonxlnx/taste-skill) |
| taste-imagegen-mobile | sibling (repo, renamed) | `D:\GitRepo-AI\taste-skill\skills\imagegen-frontend-mobile` (GitHub: Leonxlnx/taste-skill) |
| taste-brandkit | sibling (repo, renamed) | `D:\GitRepo-AI\taste-skill\skills\brandkit` (GitHub: Leonxlnx/taste-skill) |
| taste-stitch | sibling (repo, renamed) | `D:\GitRepo-AI\taste-skill\skills\stitch-skill` (GitHub: Leonxlnx/taste-skill) — original install name `stitch-design-taste` |
| taste-director | local (distilled) | written — router/composer over the 7 taste-* skills (dispatch by intent + shared taste contract) |
| frontend-slides (retired) | sibling | `D:\GitRepo-AI\FDE20261023\.kilo\skills\frontend-slides` — slide-deck HTML（bold-template-pack / STYLE_PRESETS / viewport-base.css） |
| html-artifacts | sibling | `D:\GitRepo-AI\FDE20261023\.kilo\skills\html-artifacts` — 自包含 HTML artifact（reference/ + scripts/，Apache-2.0） |
| html-slides (retired) | sibling | `D:\GitRepo-AI\FDE20261023\.kilo\skills\html-slides` |
| slideshow | sibling | `D:\GitRepo-AI\FDE20261023\.kilo\skills\slideshow` |
| ui-mockups | sibling | `D:\GitRepo-AI\FDE20261023\.kilo\skills\ui-mockups` — 产品 UI 截图级 mockup（浏览器窗口 chrome / 真实品牌图标） |
| visual-explainer | sibling | `D:\GitRepo-AI\FDE20261023\.kilo\skills\visual-explainer` — 可视化解释产物（commands/ kit/ mcp/ plan/ pptx/ video/ templates/ + extension.ts） |
| web-prototype | sibling | `D:\GitRepo-AI\FDE20261023\.kilo\skills\web-prototype` — 网页原型（assets/ references/ example.html） |
| html-ppt | repo (submodule) | `github.com/lewislulu/html-ppt-skill` @ `fd16290` — HTML PPT Studio：一个 theme 文件 = 一套外观、一个 layout 文件 = 一种页面、一个 animation class = 一种入场；token 化设计系统（`assets/base.css`），纯静态、可离线，MIT；已复制进 `SKILL/design/html-ppt`（2026-10-25 从 `vendor/html-ppt-skill` 重新复制：目录重构时该副本被删除，用户机器上只剩一个 1 文件的残桩和一份缺 13 个文件的旧拷贝） |
| hands-on-deck | repo (submodule) | `github.com/EveryInc/hands-on-deck` @ `a24b996` (MIT) — 上游 `skills/hands-on-deck`：任何 `.pptx` 相关的活（改现有 deck 而非新生成） ；2026-10-25 本地 fork：description 首行判别化（消除 shadowing），v1.0.0 |
| presentation-skill | repo (submodule) | `github.com/siril9/presentation-skill` @ `efd899c` (MIT) — 上游根即 skill（另带 `plugins/` 内同一 skill 的第二份拷贝，vault 副本已删除该重复目录）；裁剪掉 `decks/ examples/ tests/` 等演示物料 |
| html-to-pptx (retired) | repo (submodule) | `github.com/Hasasasa/html-to-editable-pptx` @ `17c1dbb` (MIT) — 上游根即 skill，`name: html-to-pptx`，目录按 frontmatter 改名 |
| brand-docx / brand-pptx / brand-xlsx | repo (submodule) | `github.com/ferdinandobons/brand-docs` @ `97a6e38` (MIT) — 上游 `skills/brand-*`：Word/PPT/Excel 的「参考模板 + 样式继承」机制 |
| huashu-design | repo (submodule) | `github.com/alchaincyf/huashu-design` @ `4fc7bfd` (MIT) — HTML 高保真原型/幻灯片/动画 + 专家评审；裁剪掉 `demos/`（保留 `assets/ scripts/ references/`） |
| xiaoma-studio | repo (submodule) | `github.com/crawfordxx/xiaoma-studio` @ `2907bd6` (MIT) — 代码做动效视频 / HTML 幻灯片；裁剪掉 `examples/`（31 MB） |
| visual-learner | repo (submodule) | `github.com/huseyingayiran/visual-learner` @ `e3c6497` (MIT) — 上游 `skills/visual-learner`：把主题/文档/会议纪要变成讲解产物，含 TTS 四档降级链 |
| opendeck | repo (submodule) | `github.com/open-deck-org/opendeck` @ `d0dbe02` (MIT) — 上游 `skills/opendeck`：动画 + 朗读的 HTML 演示 deck，音频只烘进 HTML（离线单文件） |
| storyboard (retired) | repo (submodule) | `github.com/gRAYESS123/storyboard-claude` @ `e6b1597` (MIT) — 上游 `skill/`，`name: storyboard`，目录按 frontmatter 改名；网页/文档 → 分镜 → 视频；裁剪掉 `examples/ media/ downloads/` |
| video-production | repo (submodule) | `github.com/speechlab0210/video-production-skill` @ `8c46c40` (MIT) — 上游根即 skill，`name: video-production`；含 **ASR 回译校验（TTS 合成后 Whisper 反识别，相似度 ≥0.85 才放行）** |

> Skipped 6 of the repo's 13 skills as redundant/niche: `taste-skill-v1` (superseded by v2), `gpt-tasteskill` (stricter GPT/Codex variant, subsumed by v2), `soft-skill` / `minimalist-skill` / `brutalist-skill` (fixed style presets — v2 infers the design language from the brief), `image-to-code-skill` (pipeline = imagegen-web + taste-frontend). All recoverable from the sibling clone.

### devops/
| skill | origin | source |
|-------|--------|--------|
| kanban-orchestrator | local (mirrored) | Hermes agent — `~/AppData/Local/hermes/skills/devops/` |
| kanban-cron-overseer | local (mirrored) | Hermes agent — `~/AppData/Local/hermes/skills/devops/` |
| cron-pipeline-state-machine | local | reference pattern doc (no upstream) |
| mock-devops-platform | sibling | `D:\GitRepo-AI\FDE20261023\.kilo\skills\mock-devops-platform` — 模拟 DevOps 平台（部署/流水线/告警）场景数据 |
| grafana/* (36) | repo (submodule) | `github.com/grafana/skills` @ `3b653d9` (Apache-2.0) — 上游 `skills/grafana-core` `grafana-lgtm` `grafana-cloud` `grafana-datasources`；**目录与 frontmatter `name:` 统一加 `grafana-` 前缀**（上游名如 `admin` `testing` `infrastructure` 会污染平铺的用户级命名空间） |
| monte-carlo/* (9) | repo (submodule) | `github.com/monte-carlo-data/mc-agent-toolkit` @ `d3915f3` (Apache-2.0) — 监控即代码（根因分析/事故响应/成本/主动监控）；只装 9 个，generic 名的 12 个（`prevent` `onboarding` `manage-mac` 等）留 vendor |
| planetscale/* (15) | repo (submodule) | `github.com/planetscale/skills` @ `999045c` (MIT) — 变更门禁 / 只读盘点 / Vitess 安全评审 / schema 建议循环 |
| dynatrace/* (11) | repo (submodule) | `github.com/Dynatrace/dynatrace-for-ai` @ `4f9aa71` (Apache-2.0) — DQL / 日志 / 链路 / 服务 / 成本 / 安全洞察；只装 11 个，平台专属的（aws/azure/gcp/mobile…）留 vendor |

### FDE/ — 个人学习库（learning-vault 流程）+ FDE 领域语料
| skill | origin | source |
|-------|--------|--------|
| book-chapter-to-vault | local | distilled from an FDE book (ch2–4)；模板本身 domain-agnostic，FDE 只是 worked example |
| analysis-to-vault | local | distilled from a deep-analysis FDE article；同上，FDE 语料在 `examples/` |

> 本目录不再放 `investment-masters`：它与 FDE 无关（AlphaGBM 投研大师包），已移出，源在 `vendor/investment-masters`（submodule @ `b1a304f`）。

### game-dev/
| skill | origin | source |
|-------|--------|--------|
| cat-game-architecture | local | distilled from GDC 2026 talk (Hao Yang, Tencent Photon) |
| gdd-markdown-template | repo | `github.com/TheLazyHatGuy/GDDMarkdownTemplate` |
| guide-from-probes (retired) | local | from a VibeGames project `.claude/skills/` |
| intro-scene-until-perfect (retired) | local | from `VibeGames/7_hotlineShanghai/.claude/skills/` (see `metadata.sources`) |
| kimi3-game-gen (retired) | local | distilled from KIMI3 research + a VibeGames case |
| phaser-gamedev | local | written (Phaser 3 best practice) |
| playwright-testing (retired) | local | written (Playwright / Vitest / Jest) |
| render-quality-loop (retired) | local | from a VibeGames project `.claude/skills/` |
| single-file-html-game | local | written — `mini-browser-games` convention + tier audit |
| technical-design-document | repo | `github.com/Siitoo/Technical-Design-Document` |
| three-pbr-workflow (retired) | repo | `github.com/vibe-stack/ggez` |
| procedural-3d-scenes | repo (submodule) | `github.com/yhyu13/opus55-3d-games` @ `05966a9` — 上游 `.claude/skills/procedural-3d-scenes`（v1.0.1）：编排「白膜 → 全程序化」两条交付路径，必选其一，Clay 优先；已复制进 `game-dev/procedural-3d-scenes` |
| three-clay-scenes | repo (submodule) | `github.com/yhyu13/opus55-3d-games` @ `05966a9` — 上游 `.claude/skills/three-clay-scenes`（v1.0.1）：白膜/单色/无贴图的第一版交付；已复制进 `game-dev/three-clay-scenes` |
| three-procedural-scenes | repo (submodule) | `github.com/yhyu13/opus55-3d-games` @ `05966a9` — 上游 `.claude/skills/three-procedural-scenes`（v1.0.1）：代码生成几何/材质/贴图/环境的完整版本；已复制进 `game-dev/three-procedural-scenes` |
| ue4-shader-debug | local | written (UE4 shader compile debugging) |
| ue-renderdoc-auto-capture | local | from `~/.kilo/skills` (Kilo Code agent output; RenderDoc/rdc-cli) |
| webapp-testing | repo | `github.com/ComposioHQ/awesome-claude-skills` |
| game-dev-loop | local | written — orchestrator over the 14 game-dev skills (classify → GDD/TDD → scaffold → implement → test/debug → quality → guide → memory) ；2026-10-25 本地 fork：description 首行判别化（消除 shadowing），v1.1.1 |
| ai-3d-toolchain (retired) | local (distilled) | 提炼自 `ooo.run/post/how-to-use-ai-build-3d-games.html`（作者 @Saccc_c）+ 本机 Blender 5.2.2 / blender_mcp 实测：Tripo + Blender CLI/MCP + Unity CLI/MCP + Auto-Rig Pro 组件清单与验收门槛；**Windows 三道墙**（`curl \| sh` 只支持 macOS/Linux、GBK 崩在 emoji 且副作用已发生、Blender 5.x legacy 插件注册姿势） |
| ai-3d-scene-pipeline | local (distilled) | 同上文章的场景段：概念多视角参考图 → 资产分流（Tripo 生成 vs Blender 代码搭建，判据"能否参数化"）→ Tripo 高精度道具 → Blender/Unity 组装 → **独立审查 Agent 多机位盲审**迭代。原文提示词存 `references/prompts.md`，机位表与差异清单格式存 `references/review-loop.md` |
| ai-3d-character-pipeline | local (distilled) | 同上文章的角色段：T-pose 四视图 → Tripo Smart Mesh P2.0（四边面 + 最高精度）→ 白模检查（Texture / Edit Mesh 分支）→ Auto-Rig Pro 绑骨蒙皮 + 三项动作测试 → Mixamo 动作获取与重定向 → IK 手部/道具接触精调。原文提示词存 `references/prompts.md` |
| game-archetype-classifier | local (distilled) | OpenGame TS monorepo — 物理态优先的 2D 原型分类（不按题材名分类） |
| game-asset-art-direction | local (distilled) | OpenGame TS monorepo — 2D 资产/动画/音频提示词与跨文件 key 一致性 |
| game-build-verification | local (distilled) | OpenGame TS monorepo — 发版前静态检查 + build→test→visual 顺序 + 禁止操作表 |
| game-debug | local (distilled) | OpenGame TS monorepo `agent-test/debug-skill` — 常驻 debug protocol（签名/成因/已验证修复） |
| game-dev-agent-workflow | local (distilled) | OpenGame TS monorepo — 2D 模板项目的 7 阶段自主开发流程（`game-dev-loop` 的 2D 具体化） |
| game-gdd-writing | local (distilled) | OpenGame TS monorepo — 每节都是下游构建契约的 GDD 写法（与 `gdd-markdown-template` 互补） |
| game-grid-logic | local (distilled) | OpenGame TS monorepo — 离散网格游戏子类型判别与关卡/难度设计 |
| game-platformer | local (distilled) | OpenGame TS monorepo — 横版重力游戏的移动/战斗/终极技能/敌人 AI |
| game-template | local (distilled) | OpenGame TS monorepo `agent-test/template-skill` — meta-template 与物理态家族演化、稳定性指标 |
| game-template-engineering | local (distilled) | OpenGame TS monorepo — KEEP/COPY/REFERENCE/UPDATE 四种操作纪律与 hook 模式 |
| game-top-down-action | local (distilled) | OpenGame TS monorepo — 俯视动作游戏的 tilemap/arena 子模式与 8 向移动 |
| game-tower-defense | local (distilled) | OpenGame TS monorepo — 塔防核心循环、路径/波次/经济设计 |
| game-ui-heavy-narrative | local (distilled) | OpenGame TS monorepo — UI 驱动型游戏（视觉小说/卡牌/问答）的场景流模式 |

> **合并记录（2026-10-24）：** 原 `opengame-harness/` 分类（14 个 skill）已并入 `game-dev/`。
> 该分类本身不是 skill、也不构成任何运行时依赖——13 个 skill 均为自包含方法论文档，可单独安装使用。
> 第 14 个 `game-skill` 是唯一绑定 OpenGame 仓库路径（`agent-test/template-skill`、`agent-test/debug-skill`）的，
> 而该仓库不在 `D:\GitRepo-AI` 下，其 `cd agent-test/...` 命令永远无法执行，且内容已被
> `game-template` + `game-debug` + `game-build-verification` 覆盖 → 已归档至 `archived/game-skill/` 并从各 harness 安装目录卸载。

### archived/
| skill | origin | source |
|-------|--------|--------|
| game-skill | local (distilled) | OpenGame TS monorepo `agent-test/template-skill` + `agent-test/debug-skill` 的说明书。**已退役**：仓库不在本机、命令路径失效、方法论已被 `game-template` / `game-debug` / `game-build-verification` 覆盖。仅作出处存档，不再安装 |

### management/
| skill | origin | source |
|-------|--------|--------|
| manage-up-core + 9 (weekly-report, project-update, performance-review, proposal, meeting-summary, quarterly-review, upward-email, one-on-one-prep, style-report) | sibling | `D:\GitRepo-AI\manage-up\skills\<name>` — style-report 合并自 style-alibaba/amazon/bytedance/google/microsoft/tencent 6 个，各自内容在 `style-report/references/` |
| mgmt-discipline | sibling | `D:\GitRepo-AI\mgmt-skill\mgmt-skills\discipline` (+ router SKILL.md) |
| mgmt-individual | sibling | `D:\GitRepo-AI\mgmt-skill\mgmt-skills\individual` (+ router SKILL.md) |
| mgmt-org | sibling | `D:\GitRepo-AI\mgmt-skill\mgmt-skills\org` (+ router SKILL.md) |
| bezos-advisor / god-leader-advisor (retired) / renzhengfei-advisor / zhangyiming-advisor | sibling | `D:\GitRepo-AI\mgmt-skill\advisor-skills\<name>.md` |
| qiushi-methodology (11: 矛盾分析/实践论/群众路线/集中力量/调查研究/批评自我批评/统筹兼顾/持久战/星星之火/武装思想/workflows) | local | distilled from Mao 求是 methodology (原著依据 in `original-texts.md`) |
| torchcookpackopt-weekly-report | local | written for the torchcookpackopt project — moved to `archived/` (project-specific, not active) |
| management-loop | local | written — router/orchestrator over the management skills (report / advice / knowledge / methodology clusters) |
| style-alibaba | local (from user's own store) | `~/.claude/skills/style-alibaba` (2026-10-25 提升进 vault)；与 `style-report/references/` 中的阿里双轨制内容同源；2026-10-25 description 首行判别化，v1.0.0 |
| style-amazon | local (from user's own store) | `~/.claude/skills/style-amazon` (2026-10-25 提升进 vault)；与 `style-report/references/` 中的 Amazon 叙事内容同源；2026-10-25 description 首行判别化，v1.0.0 |
| style-bytedance | local (from user's own store) | `~/.claude/skills/style-bytedance` (2026-10-25 提升进 vault)；与 `style-report/references/` 中的字节 OKR 内容同源；2026-10-25 description 首行判别化，v1.0.0 |
| style-google | local (from user's own store) | `~/.claude/skills/style-google` (2026-10-25 提升进 vault)；与 `style-report/references/` 中的 Google OKR/GRAD 内容同源；2026-10-25 description 首行判别化，v1.0.0 |
| style-microsoft | local (from user's own store) | `~/.claude/skills/style-microsoft` (2026-10-25 提升进 vault)；与 `style-report/references/` 中的 Microsoft Connects 内容同源；2026-10-25 description 首行判别化，v1.0.0 |
| style-tencent | local (from user's own store) | `~/.claude/skills/style-tencent` (2026-10-25 提升进 vault)；与 `style-report/references/` 中的腾讯产品指标内容同源；2026-10-25 description 首行判别化，v1.0.0 |

### math/
| skill | origin | source |
|-------|--------|--------|
| rigorous-proof | local | written from scratch |

### software-development/mattpocock/（原 MattSkills/，2026-10-24 迁移）
| skill | origin | source |
|-------|--------|--------|
| 19 kept (engineering 17 + productivity grilling/handoff) | repo (submodule) + local fork | upstream `github.com/mattpocock/skills` (MIT) 已挂为 `vendor/mattpocock-skills` submodule @ `5beb35b`（2026-10-19）；本目录是**裁剪过的 fork**：base ≈ `e38b908`（2026-08-19），裁掉 16 个（in-progress/ + misc/ + productivity aliases/non-dev + grill-with-docs），recoverable via submodule or `npx skills add matt-pocock`。**本地 delta（勿被 upstream 覆盖）**：`tdd/SKILL.md` +25 行 DoD laws（vault commit `f9d9280`）；`resolving-merge-conflicts` 保留为 skill（upstream 已从 skills/ 移除）；`~/.kilo/skills` 内 19 个安装副本与本目录 byte-identical，更新 upstream 后需手动 re-apply delta 再镜像 |
| grill-me | repo (submodule) + local fork | `github.com/mattpocock/skills` (MIT) 的 productivity 家族（vault 内 19 个已保留）；本 skill 2026-10-25 从用户 store 提升进 vault，description 首行判别化（只追问、不产出文档），v1.0.0 |
| grill-with-docs | repo (submodule) + local fork | `github.com/mattpocock/skills` (MIT) 的 productivity 家族；本 skill 2026-10-25 从用户 store 提升进 vault，description 首行判别化（追问 + ADR/术语表），v1.0.0 |

### software-development/
| skill | origin | source |
|-------|--------|--------|
| aisides-ai-self-review | local | written for the AISides project |
| debugger-persona | local | written — debug diagnosis + Chinese doc writing + code discipline persona |
| journey | local | written (two-column ME/YOU history) |
| software-dev-loop | local | written — composes goal / docs / test / memory into one dev loop ；2026-10-25 本地 fork：description 首行判别化（消除 shadowing），v1.3.1 |
| llm-friendly-dsl-verification | local (distilled) | distilled from gdsl project — `D:\GitRepo-My\godot` (Godot GDExtension recipe-DSL methodology: compile→run→semantic-golden→fix-feedback→scene closed loop) |
| technical-research-analysis-doc | local | written — TorchLight 调研分析 format |
| skill-auto-improve-mirror | local | written by agent (Hermes) — skill improvement + version-aware cross-harness mirror (scripts/mirror_agent_skills.py) |
| governance-doc-design | local (distilled) | distilled from `F:\XD\git-repo\cindy\docs` conventions (product/design/dev/legal rule buckets, 状态+读取时机+事实来源 skeleton, append-only decision log) |
| truth-seeking-research | local | 用户系统提示词蒸馏：求真优先、0–4 级可信度、检索边界、脚本计算、固定输出格式（英文改写 → 结论先行 → `[判断与建议]` → 免责声明）。分发：vault → `~/.claude/skills`（实体）→ `~/.codex/skills`、`~/.kilo/skills`、`~/.agents/skills`（junction 视图）+ `%LOCALAPPDATA%\hermes\skills\software-development\`（副本） |
| prompt-pro | local | 用户本地 skill：`C:\Users\yuhang\.minimax\skills\prompt-pro`。把粗请求补成可执行提纲（目标/验收/范围/约束/输出 五槽位），先 grounding 再落笔，提纲不单独成篇。先看真实系统再下笔的纪律 + 缺信息则问。分发：vault → `~/.claude/skills`（实体）→ `~/.codex/skills`、`~/.kilo/skills`、`~/.agents/skills`（junction 视图） |
| skill-distill | local | 用户贴出的 skill 文本（原出处未指明，标记 local）。会后沉淀流水线：四道闸（可复用/有判断/有证据/有边界）+ 粒度 + 归属 + 三段式写法 + 防重复防膨胀 + PR 流程 + 自检清单 + 红线。规范 skill 沉淀本身。分发：vault → `~/.claude/skills`（实体）→ `~/.codex/skills`、`~/.kilo/skills`、`~/.agents/skills`（junction 视图） |
| perf-tracking-platform | local (imported) | 用户提供：`C:\Users\1\Downloads\perf-tracking-platform`（XD 游戏引擎侧「性能跟踪分析平台」领域知识与工作指引：OKR/进度快照、指标口径、瓶颈判定、看板与报告要求；进度以 Feishu 进度文档为准）。分发：vault → `~/.claude/skills`（实体）→ `~/.codex/skills`、`~/.kilo/skills`、`~/.agents/skills`（junction 视图） |
| brainstorming / systematic-debugging / writing-plans (retired) / writing-skills (retired) / verification-before-completion / using-git-worktrees / receiving-code-review / requesting-code-review (retired) | repo (submodule) | `github.com/obra/superpowers` @ `2ce8aa1` (MIT) — 上游 `skills/<name>`；只装 8 个方法论 skill，`executing-plans` `finishing-a-development-branch` `subagent-driven-development` `using-superpowers` `diagnosing-superpowers` `dispatching-parallel-agents` 与 vault 自有 `software-dev-loop` / `tdd` / `diagnosing-bugs` 重叠，留 vendor |
| skill-inspector | repo (submodule) | `github.com/NVIDIA/SkillSpector` @ `d7338f5` (Apache-2.0) — 上游 `skills/skill-inspector`：装第三方 skill 前的注入/外泄/供应链扫描（**建议作为以后装任何第三方 pack 的前置闸**） |
| skillopt-sleep | repo (submodule) | `github.com/microsoft/SkillOpt` @ `84b36cd` (MIT) — 上游 `plugins/claude-code/skills/skillopt-sleep`：让 agent 自我优化 skill（配套 prompt 模板在 `skillopt/prompts/`，未装） |
| distilly | repo (submodule) | `github.com/titanwings/distilly` @ `0afc45c` (MIT) — 上游根即 skill（分支 `dot-skill`）：Work + Persona 分离的蒸馏流程；裁剪掉 `tests/` `.github/` |

### video/
| skill | origin | source |
|-------|--------|--------|
| ai-video-production | local (distilled) | 余弦博客《用 Opus 5.5 做视频：制作流程与提示词资源记录》(2026-09-27) + 已 vendor 的开源 skill 清单；含 `references/prompts.md`（提示词模板）与 `references/resources.md`（仓库/工具清单）。分发：vault → `~/.claude/skills`（实体）→ `~/.codex/skills`、`~/.kilo/skills`、`~/.agents/skills`（junction 视图） |
| remotion-best-practices (retired) / -create / -render / -captions / -markup / -multimedia / -maps / -interactivity / -docs / -saas / -studio / -upgrade | repo (submodule) | `github.com/remotion-dev/skills` @ `6c67adc` — Remotion 官方 Agent Skills（12 个），上游 `skills/<name>` |
| anidoodle | repo (submodule) | `github.com/alexgreensh/anidoodle` @ `f746cbd` — 手绘风插画与动画（自带配乐与故事线） |
| guizang-product-video-skill | repo (submodule) | `github.com/op7418/guizang-product-video-skill` @ `18842e0` — 读代码库做产品更新宣传片 |
| video-use | repo (submodule) | `github.com/browser-use/video-use` @ `43cfc56` — Agent 剪真实素材（上游根 SKILL.md） |
| manim-video | repo (submodule) | `github.com/browser-use/video-use` @ `43cfc56` — 上游 `skills/manim-video` |
| make-interfaces-feel-better | repo (submodule) | `github.com/jakubkrehel/make-interfaces-feel-better` @ `35545ea` — UI 与动效细节打磨 |
| onetake | repo (submodule) | `github.com/feitangyuan/onetake` @ `013a61a` — 一镜到底产品发布片（PolyForm Noncommercial；样片 mp4 未复制） |
| lemo-opuscar | repo (submodule) | `github.com/lemomo-ai/lemo-opuscar` @ `413a6bd` — 39 种纯代码影片风格库 |
| mengto/* (29) | repo (submodule, 筛选) | `github.com/MengTo/Skills` @ `398cd41` — `3d/`(16) + `media/`(2) + `codex/`(11)；`web-design/`、`game-*/`、`illustration/` 未复制 |
| kinetic-reel (retired) | repo (submodule) | `github.com/tuzhechen2005/opus-video-skills` @ `59744a6` — 纯代码动效字 reel：Canvas 2D + three.js 生成层 + WebGL 后期，无头 Chrome 逐帧 + ffmpeg 编码，Node 按同一份 `cues.js` 合成节拍对齐配乐；上游 `skills/kinetic-reel`；已复制进 `video/kinetic-reel` |
| painted-animation (retired) | repo (submodule) | `github.com/tuzhechen2005/opus-video-skills` @ `59744a6` — p5.js + p5.brush 手绘水彩/墨线动画：逐帧渲染、模型表（emotions/views）、音乐与歌词同步；上游 `skills/painted-animation`；已复制进 `video/painted-animation` |
| opus-video-prompts | repo (submodule, 补写指针层) | `github.com/joeseesun/opus-video-prompts` @ `7977c80` — 上游**没有 SKILL.md**（18 份提示词 + 54 案例 `cases.json` + README），本 vault 补写一层指针式 SKILL.md（说明怎么挑提示词、技术路线与边界）；上游原文逐字保留；已复制进 `video/opus-video-prompts` |
| video-shotcraft (retired) | repo (submodule) | `github.com/Vincentwei1021/video-shotcraft` @ `43bd349` (Apache-2.0) — 上游根即 skill（152 张 shot recipe 卡片 + 209 段 motion preview）；裁剪掉 `assets/ demos/ gallery/ videos/ workbench/ publish/`（保留 `references/ shot-polish/ template/`） |
| ffmpeg / moviepy (retired) / elevenlabs (retired) / playwright-recording (retired) / qwen-edit (retired) / ideogram4 / ltx2 / acestep / runpod / synthetic-ui-demo (retired) / video_toolkit (retired) | repo (submodule) | `github.com/digitalsamba/claude-code-video-toolkit` @ `da3f474` (MIT) — 上游 `.claude/skills/<name>`（11 个）+ `skills/openclaw-video-toolkit`；`video_toolkit` 的 frontmatter 名是 `video_toolkit`，目录按其改名；`remotion` / `remotion-official` / `frontend-design` 未装（与 vault 既有 remotion 系列 / taste-frontend 重叠） |

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
| frontend-slides (retired) | repo (submodule) | `github.com/zarazhangrui/frontend-slides` @ `9906a34` — 单文件零依赖 HTML 演示（bold-template-pack / STYLE_PRESETS / viewport-base.css），MIT；已由并行会话装进 `design/frontend-slides`（它的 `html-slides` router 依赖它） |
| generating-slides | repo (submodule) | `github.com/whq217/generating-slides` @ `0e2fa3a` — 自述「基于 Zara Zhang 的 Frontend Slides 二次开发」：22 套风格预设 + 七阶段引导 + 版面率/字号/秩序三层硬约束 + 机验脚本 + P 键出 PDF；**只 vendor 不装**：与已装的 `frontend-slides` 是同一条工作流的前后版本 |
| html-ppt-skill | repo (submodule) | `github.com/lewislulu/html-ppt-skill` @ `fd16290` — `vendor/html-ppt-skill`（上游仓库根即 skill）；MIT；已复制进 `design/html-ppt` |
| opus-video-prompts | repo (submodule) | `github.com/joeseesun/opus-video-prompts` @ `7977c80` — `vendor/opus-video-prompts`（提示词库，无 SKILL.md）；已包一层装成 `video/opus-video-prompts` |
| opus5.5-video-prompts | repo (submodule) | `github.com/Reger-c/opus5.5-video-prompts` @ `7977c80` — 与 `joeseesun/opus-video-prompts` **同一 commit**（`cases.json` 逐字节相同，镜像仓）；不重复安装 |
| opus-video-skills | repo (submodule) | `github.com/tuzhechen2005/opus-video-skills` @ `59744a6` — `vendor/opus-video-skills`，上游 `skills/kinetic-reel` + `skills/painted-animation`；已复制进 `video/` |
| opus55-3d-games | repo (submodule) | `github.com/yhyu13/opus55-3d-games` @ `05966a9` — 本仓自有 repo（3 个 three.js skill + 3 个游戏 + site）；上游 `.claude/skills/{procedural-3d-scenes,three-clay-scenes,three-procedural-scenes}` 已是 **v1.0.1**（commit `05966a9` "Harden procedural scene skill guidance"），与用户级已装内容一致 → 已按 submodule 更新指针，并把三个 skill 复制进 `game-dev/`，用户级实体随之刷新为**逐字节一致** |

### 雷达采纳批次（2026-10-24，34 个新 submodule）

浅 clone（`git clone --depth 1` 后手工注册 gitlink），指针见 `git submodule status`；完整清单与「装/不装」理由见 `SKILL_RADAR/2026-10-24-radar-adoption-install-record.md`。

| vendor 路径 | upstream | commit | license | 处置 |
|---|---|---|---|---|
| `vendor/genoffice (retired)` | genspark-ai/genoffice | 28cee5c | Apache-2.0 | 装 content/genoffice + content/okr-planner |
| `vendor/legalrabbit-docx-mcp` | LegalRabbit-AI/legalrabbit-docx-mcp | a1c9be8 | MIT | 装 content/legalrabbit-docx |
| `vendor/excel-hygiene` | BayramAnnakov/excel-hygiene | bca5a74 | Apache-2.0 | 装 content/excel-hygiene |
| `vendor/document-SKILLs` | appautomaton/document-SKILLs | dfb5685 | MIT | **只 vendor**：docx/pdf/pptx/xlsx 与 anthropic 集同名 |
| `vendor/market-intel (retired)` | DaizeDong/market-intel | 1046cd8 | MIT | 装 content/market-intel |
| `vendor/hands-on-deck` | EveryInc/hands-on-deck | a24b996 | MIT | 装 design/hands-on-deck |
| `vendor/presentation-skill` | siril9/presentation-skill | efd899c | MIT | 装 design/presentation-skill |
| `vendor/html-to-editable-pptx` | Hasasasa/html-to-editable-pptx | 17c1dbb | MIT | 装 design/html-to-pptx（目录改名） |
| `vendor/brand-docs` | ferdinandobons/brand-docs | 97a6e38 | MIT | 装 design/brand-docx + brand-pptx + brand-xlsx |
| `vendor/huashu-design` | alchaincyf/huashu-design | 4fc7bfd | MIT | 装 design/huashu-design |
| `vendor/xiaoma-studio` | crawfordxx/xiaoma-studio | 2907bd6 | MIT | 装 design/xiaoma-studio |
| `vendor/visual-learner` | huseyingayiran/visual-learner | e3c6497 | MIT | 装 design/visual-learner |
| `vendor/opendeck` | open-deck-org/opendeck | d0dbe02 | MIT | 装 design/opendeck |
| `vendor/storyboard-claude` | gRAYESS123/storyboard-claude | e6b1597 | MIT | 装 design/storyboard（目录改名） |
| `vendor/video-production-skill` | speechlab0210/video-production-skill | 8c46c40 | MIT | 装 design/video-production（目录改名） |
| `vendor/visual-explainer` | nicobailon/visual-explainer | 5f37886 | MIT | **只 vendor**：与 vault 既有 design/visual-explainer 同名 |
| `vendor/claude-skills` | alirezarezvani/claude-skills | 6d2f02e | MIT | 装 management/prd 等 7 个 |
| `vendor/everything-claude-finance` | brainbytes-dev/everything-claude-finance | 71f43fc | MIT | 装 management/finance/**（15） |
| `vendor/marketingskills` | coreyhaines31/marketingskills | e85f3cb | MIT | 装 management/marketing/**（3） |
| `vendor/grafana-skills` | grafana/skills | 3b653d9 | Apache-2.0 | 装 devops/grafana/**（36，`grafana-` 前缀） |
| `vendor/mc-agent-toolkit` | monte-carlo-data/mc-agent-toolkit | d3915f3 | Apache-2.0 | 装 devops/monte-carlo/**（9） |
| `vendor/planetscale-skills` | planetscale/skills | 999045c | MIT | 装 devops/planetscale/**（15） |
| `vendor/dynatrace-for-ai` | Dynatrace/dynatrace-for-ai | 4f9aa71 | Apache-2.0 | 装 devops/dynatrace/**（11） |
| `vendor/superpowers` | obra/superpowers | 2ce8aa1 | MIT | 装 software-development/ 8 个 |
| `vendor/skillspector` | NVIDIA/SkillSpector | d7338f5 | Apache-2.0 | 装 software-development/skill-inspector |
| `vendor/skillopt` | microsoft/SkillOpt | 84b36cd | MIT | 装 software-development/skillopt-sleep |
| `vendor/distilly` | titanwings/distilly | 0afc45c | MIT | 装 software-development/distilly |
| `vendor/agentskills-spec` | agentskills/agentskills | 69ef37e | Apache-2.0 | **只 vendor**：skill 格式规范，无 SKILL.md |
| `vendor/investment-masters` | AlphaGBM/investment-masters | b1a304f | MIT | **只 vendor**（投研主题，与 FDE 无关；不再复制进分类目录） |
| `vendor/company-brain` | nemock/company-brain | c82e2de | MIT | **只 vendor**：`derived_from` 边 + 置信度半衰期是设计模式 |
| `vendor/claude-code-video-toolkit` | digitalsamba/claude-code-video-toolkit | da3f474 | MIT | 装 video/ 11 个 |
| `vendor/video-shotcraft (retired)` | Vincentwei1021/video-shotcraft | 43bd349 | Apache-2.0 | 装 video/video-shotcraft |
| `vendor/html-video` | nexu-io/html-video | c414ecc | Apache-2.0 | **只 vendor**：BGM/TTS 混音契约参数来源 |
| `vendor/openai-edge-tts` | travisvn/openai-edge-tts | edaed2a | GPL-3.0 | **只 vendor**：本地 TTS 兜底服务，无 SKILL.md |

**anthropic 集的取舍（2026-10-24）**

| 上游 skill | 处置 | 理由 / 吸收方 |
|------------|------|---------------|
| `academy-guide (retired)` `algorithmic-art` `canvas-design` `claude-api` `discernment-nudge` `docx` `mcp-builder (retired)` `pdf` `pptx` `slack-gif-creator` `web-artifacts-builder` `xlsx` | **装** | vault 内无同类，能力不重复 |
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

0. **（第三方来源必做）先过安全扫描**：`software-development/skill-inspector`（NVIDIA SkillSpector）检查注入 / 数据外泄 / 供应链风险，再决定装不装。
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

### 2026-10-25 本地 fork（description 判别化）

这些 skill 的 INSTRUCTION.md 行是**合并行**（多个 skill 共一行），单独列在这里。
fork 原因：harness 预算不够时先砍 description 尾巴，首行必须自带判别词，否则兄弟 skill 会互相遮蔽
（证据：`docs/skill-capacity-audit/2026-10-25-skill-library-pressure.md`；候选单 `SKILL_CANDIDATES.md` #27-36）。

| skill | 版本 | description 首行改动 |
|---|---|---|
| brand-docx | v1.0.0 | "Word documents (.docx) only." + 不适用于 PowerPoint/Excel |
| brand-pptx | v1.0.0 | "PowerPoint decks (.pptx) only." + 不适用于 Word/Excel |
| brand-xlsx | v1.0.0 | "Excel workbooks (.xlsx) only." + 不适用于 Word/PowerPoint |
| style-report | v1.0.1 | "Router for six named company report styles ..." — 只在点名公司时用 |
| project-update | v1.0.0 | "One-off project status report, not a recurring cadence." + 不适用于 weekly-report |
| weekly-report | v1.0.0 | "Recurring weekly or monthly report." + 不适用于 project-update |
| aura-asset-images | v1.0.0 | "Aura Assets (aura.build) imagery only." + 不适用于 unsplash-asset-images |
| unsplash-asset-images | v1.0.0 | "Unsplash imagery only." + 不适用于 aura-asset-images |
| grafana-loki-label-analyzer | v1.0.0 | "Grafana Loki label schemas only." + 不适用于 Prometheus |
| grafana-prometheus-label-strategy | v1.0.0 | "Prometheus label schemas on Grafana Cloud only." + 不适用于 Loki |
| blog-to-linkedin-post / blog-to-twitter-post | v1.0.0 | 各自首行点名平台，并互相排除 |
| game-dev-loop / software-dev-loop | v1.1.1 / v1.3.1 | 首行点名领域，并互相排除 |
| hands-on-deck | v1.0.0 | 'Modify an EXISTING .pptx.' + 排除 pptx |
