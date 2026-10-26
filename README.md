# AgentSkillsVault

Personal vault of Agent skills sourced from local filesystem
(not the hub). Skills are grouped by category; each category folder
contains one directory per skill with `SKILL.md` plus optional
`references/`, `templates/`, `assets/`, `scripts/`, `examples/`
subdirs.

## Layout

```
AgentSkillsVault/
├── README.md
├── KNOWLEDGE.md
├── agents/                          �?agent autonomy & persistence patterns
�?  └── goal-persistence/            �?Codex product contract (row + idle + anti-drift)
├── devops/                          �?orchestration, kanban, cron pipelines
�?  ├── kanban-orchestrator/
�?  ├── kanban-cron-overseer/
�?  ├── cron-pipeline-state-machine/
�?  ├── mock-devops-platform/        �?模拟 DevOps 平台（部�?流水�?告警）场景数�?
�?  └── grafana/* (16)               �?Grafana 官方 skills（core/lgtm/cloud/datasources；`grafana-` 前缀�?
├── software-development/            �?code review, self-review,  analysis
�?  ├── aisides-ai-self-review/
�?  ├── software-dev-loop/           �?goal �?docs �?test �?memory dev loop
�?  ├── technical-research-analysis-doc/  �?TorchLight 调研分析文档格式 (背景→结论先行→影响链条→mermaid→方案对�?
�?  ├── truth-seeking-research/      �?求真优先 + 0�? 级可信度引用 + 结论先行输出格式
�?  ├── prompt-pro/                  �?把粗请求改写成可执行提纲�? 槽位�? grounding 后再执行
�?  ├── skill-distill/               �?会后沉淀流水线：四道�?+ 粒度 + 归属 + 三段式写�?+ 防重复防膨胀 + PR 流程
�?  ├── perf-tracking-platform/      �?XD 性能跟踪分析平台领域知识：OKR 进度 + 指标口径 + 瓶颈判定 + 看板/报告
�?  ├── governance-doc-design/       �?author governance/rule/design docs (buckets + 状�?+ 事实来源 + decision log)
�?  ├── brainstorming/ systematic-debugging/    �?obra/superpowers �?8 个方法论 skill
�?  ├── verification-before-completion/ using-git-worktrees/ receiving-code-review/ 
�?  ├── skill-inspector/             �?NVIDIA SkillSpector：装第三�?skill 前的注入/外泄扫描�?
�?  ├── skillopt-sleep/              �?Microsoft SkillOpt：让 agent 自我优化 skill
�?  ├── distilly/                    �?Work + Persona 分离的蒸馏流�?
�?  └── journey/                     �?two-column ME/YOU project history + vibe-coding lessons
├── FDE/                             �?个人学习库（learning-vault 流程�? FDE 领域语料
�?  ├── book-chapter-to-vault/       �?.docx book chapter �?learning notes + cheatsheet + kanban + mindmap（模�?domain-agnostic�?
�?  └── analysis-to-vault/           �?long-form analytical article �?thesis + argument map + cheatsheet + day-job notes（同上）
├── game-dev/                        �?game design + 3D/web game tooling
    ├── game-dev-loop/               �?orchestrator: classify �?GDD/TDD �?scaffold �?implement �?test/debug �?quality �?guide �?memory
    ├── cat-game-architecture/
    ├──            �?deterministic E2E probes �?playthrough guide (no screenshots needed)
    ├── 
    ├── gdd-markdown-template/
    ├── 
    ├── phaser-gamedev/
    ├── 
    ├──          �?screenshot sweep �?render-quality evaluation �?improve loop
    ├── single-file-html-game/
    ├── technical-design-document/
    ├── 
    ├── procedural-3d-scenes/          �?白膜 �?全程序化两条交付路径的编排（opus55-3d-games�?
    ├── three-clay-scenes/             �?白膜 / 单色 / 无贴图的第一版交付（opus55-3d-games�?
    ├── three-procedural-scenes/       �?代码生成几何 / 材质 / 贴图 / 环境（opus55-3d-games�?
    ├──               �?Tripo + Blender CLI/MCP + Unity CLI/MCP + Auto-Rig Pro 环境搭建与自检
    ├── ai-3d-scene-pipeline/         �?概念多视角参考图 �?资产分流 �?Tripo 道具 �?组装 �?多机位盲�?
    ├── ai-3d-character-pipeline/     �?T-pose 四视�?�?Smart Mesh P2.0 �?绑骨蒙皮 �?Mixamo �?IK 精调
    ├── game-archetype-classifier/    �?物理态优先的 2D 原型分类
    ├── game-dev-agent-workflow/      �?2D 模板项目 7 阶段自主开发流�?
    ├── game-gdd-writing/             �?GDD 每节 = 下游构建契约
    ├── game-template/                �?meta-template 与物理态家族演�?
    ├── game-template-engineering/    �?KEEP/COPY/REFERENCE/UPDATE 操作纪律
    ├── game-debug/                   �?常驻 debug protocol（签名→成因→已验证修复�?
    ├── game-build-verification/      �?发版前静态检�?+ build→test→visual
    ├── game-asset-art-direction/     �?2D 资产/动画/音频提示词与 key 一致�?
    ├── game-grid-logic/              �?离散网格（解�?肉鸽/战棋/消除�?
    ├── game-platformer/              �?横版重力（移�?战斗/终极技能）
    ├── game-top-down-action/         �?俯视动作（tilemap / arena�?
    ├── game-tower-defense/           �?塔防（路�?波次/经济�?
    ├── game-ui-heavy-narrative/      �?UI 驱动（视觉小�?卡牌/问答�?
    └── webapp-testing/
├── math/                            �?rigorous math proof generation + adversarial audit
�?  └── rigorous-proof/
├── management/                      �?职场向上汇报 (ManageUp) + 管理方法�?(mgmt-skill) + 角色顾问
    ├── management-loop/             �?router: classify �?report/advice/knowledge/methodology �?apply �?verify �?memory
    ├── manage-up-core/ + 9 汇报技�?(weekly-report, project-update, style-report �?
    ├── mgmt-discipline/ mgmt-individual/ mgmt-org/  (方法论知识库)
    ├── bezos-advisor/  renzhengfei-advisor/ zhangyiming-advisor/  (角色顾问)
    ├── prd/ cs-financial-analyst/ cs-product-strategist/ competitive-matrix/ finance-lead/ cs-growth-strategist/   �?alirezarezvani/claude-skills
    ├── finance/** (15)               �?DCF / LBO / 可比交易 / 财报模型 / 会计准则（everything-claude-finance�?
    └── marketing/** (3)              �? /  / （marketingskills�?
└── content/                         �?博客/长文 �?社媒内容再利�?(Content Repurposing)
    ├── blog-to-twitter-post/
    ├── blog-to-linkedin-post/
    ├── long-blog-to-viral-social-posts/
    ├── tech-design-to-zhihu/        �?技术设计稿 �?知乎专栏（无 mermaid，出 PNG�?
    ├── gracker-writing/             �?技术文章写作（准确/有用/易读，Android/性能优化长文�?
    ├── shuorenhua/                  �?�?AI �?说人话（先保信息，再谈风格）
    ├── notes-on-writing/            �?Michael Nielsen 写作笔记（目�?标题/开�?危险�?结构/经典风格�?
    ├── social-push/                 �?一句话发布内容到多平台（小红书/X/知乎/微博/微信/掘金/Linux.do�?
    ├── content-craft/               �?内容生产总纲（提炼自全部内容 skill 的共同手艺）
    ├──               �?数据可视�?报告生成（数据契约先行选图 + Lupi/Glance 双阅读速度 + Mono 语法 + 彩色系统 + 12 套中英报告模板）
    ├── agent-browser/               �?agent-browser CLI 浏览器自动化（social-push 依赖�?
    ├── yu-hang-writing-style/       �?俞航工程笔记文风（技术规�?排查笔记/进展周报/使用手册/测试说明，去 AI 味）
    ├── progress-doc-style/          �?进度/OKR 跟踪文档文风（OKR 简述表 + 行动项七列表 + 状态三符号 + 备注一句话�?
    ├──                    �?本地创建/转换/读写 Office 文档（docx/xlsx/pptx/pdf�?
    ├── okr-planner/                 �?目标 �?可度�?KR（与 vault 自有 OKR 件并存，待合并）
    ├── legalrabbit-docx/ excel-hygiene/  �?docx 加工 + .xlsx 体检
    ├──                 �?商用数据（X/Twitter/电商/金融/SEO）取数与研判
    ├── hyperframes/                 �?HTML 渲染成视频（渲染契约 / 工作�?/ assets/frame-presets�?
    ├──              �?`npx hyperframes` CLI（check / init / capture / usage�?
    ├──         �?450+ 现成 block / component 目录（查完再手写特效�?
    ├── hyperframes-video/           �?视频交付路径（媒�?声音�?CLI 自带命令�?
    └──      �?Remotion 项目迁移�?HyperFrames（assets/ references/ scripts/�?
└── design/                          �?anti-slop 前端设计 taste（Leonxlnx/taste-skill 精�?7/13 + 本地 router�?
    ├── taste-director/              �?路由总纲：按意图分发到下�?7 �?+ 共享 taste 契约
    ├──               �?旗舰 v2：读 brief �?推断设计语言 �?出不像模板的界面
    ├── taste-redesign/              �?现有项目：先审计 UI �?再修布局/间距/层级/样式
    ├── taste-imagegen-web/          �?网页 comps 图（�?section 一张横向图�?
    ├── taste-imagegen-mobile/       �?移动�?screen/flow �?
    ├── taste-brandkit/              �?品牌 kit 板（logo/配色/字体/身份应用�?
    ├── taste-stitch/                �?�?Google Stitch 屏幕生成的语�?DESIGN.md 设计系统
    ├── anatomy/                     �?等距 SVG 插图器：将想法做�?真实可工作的小机�?�?0�?00 件精密零件，4 色调光，分屏 SVG + WebGL + 3D），�?kit/references/scripts/examples�?1.7 MB，wheresryan22/anatomy，MIT�?
    ├──              �?HTML slide deck（bold-template-pack / STYLE_PRESETS / viewport-base.css�?
    ├── html-artifacts/              �?自包�?HTML artifact（reference/ + scripts/�?
    ├──                  �?HTML 幻灯�?
    ├── slideshow/                   �?幻灯片编�?
    ├── ui-mockups/                  �?产品 UI 截图�?mockup（浏览器窗口 chrome / 真实品牌图标�?
    ├── visual-explainer/            �?可视化解释产物（commands/ kit/ mcp/ plan/ pptx/ video/ templates/�?
    ├── hands-on-deck/ presentation-skill/   �?deck 编辑 / 演示构建 / HTML→可编辑 PPTX
    ├── brand-docx/ brand-pptx/ brand-xlsx/   �?参考模�?+ 样式继承机制
    ├── huashu-design/ xiaoma-studio/         �?HTML 高保真原型与幻灯�?/ 代码做动效与幻灯�?
    ├── visual-learner/ opendeck/  video-production/  �?讲解产物 / 朗读 deck / 分镜 / TTS 质量闸（ASR 回译�?
    └── web-prototype/               �?网页原型（assets/ references/ example.html�?
├── writing/                         �?「换种形式让人看懂」工作流（不堆文�?/ 画图 / 试出�?/ 讲清楚）
�?  └── karpathy-explain-better/     �?Karpathy 4 法：简化文�?ASD-STE100) �?结构�?�?可交互网�?�?讲解视频；含判断清单与升�?降级信号
├── video/                           �?AI 视频生产：流�?+ 渲染选型 + 社区开�?skill（源自余�?2026-09-27 博客资源盘点�?
�?  ├── ai-video-production/         �?总纲：制作流程（素材→脚本→配音→包装→提速→自验收→HANDOFF）、短片多 agent 流水线、对抗审片、提示词模板、审片清�?
�?  ├── remotion-*/ (12)             �?Remotion 官方 Agent Skills（best-practices / create / render / captions / markup / multimedia / maps / interactivity / docs / saas / studio / upgrade�?
�?  ├── onetake/                     �?一镜到底产品发布片（每拍从上一拍长出来，不切幻灯片�?
�?  ├── anidoodle/                   �?手绘风插画与动画（自带故事线与配乐）
�?  ├── guizang-product-video-skill/ �?读代码库 + 用真实组件做产品更新宣传�?
�?  ├── video-use/                   �?Agent 剪真实拍摄素�?
�?  ├── manim-video/                 �?数学/公式动画
�?  ├── make-interfaces-feel-better/�?UI 与动效细节打�?
�?  ├── lemo-opuscar/                �?39 种纯代码影片风格�?
�?  ├── mengto/* (29)                �?MengTo 设计�?skills�?D 材质/光照/�?天空 (16) + 素材�?(2) + 视频与审查向 (11)
�?  ├──              �?152 �?shot recipe 卡片（构�?运镜/节奏�?
�?  └── ffmpeg/                                         �?素材生成与加工（claude-code-video-toolkit�?
└── vendor/                          �?外部 repo �?submodule 形式 vendored（不复制进分类目录）
    ├── anthropics-skills/           �?github.com/anthropics/skills�?9 个官�?skill；pinned @ dbd4588�?
    ├── tripo-skills/                �?github.com/meterlong/tripo-skills（Tripo 3D 生成 skill，装�?tripo-3d-generation, retired 2026-10-26�?
    ├── blender-mcp/                 �?github.com/ahujasid/blender-mcp（Blender MCP server + 插件�?
    ├── tripo-3d-for-blender/        �?github.com/Tripo-Developer/tripo-3d-for-blender（Tripo 官方 Blender 插件�?
    ├── unity-mcp/                   �?github.com/CoplayDev/unity-mcp（MCP for Unity，MIT�?
    ├── remotion-skills/             �?github.com/remotion-dev/skills（Remotion 官方 12 �?Agent Skills�?
    ├── anidoodle/                   �?github.com/alexgreensh/anidoodle（手绘风动画�?
    ├── guizang-product-video-skill/ �?github.com/op7418/guizang-product-video-skill
    ├── video-use/                   �?github.com/browser-use/video-use�? skills/manim-video�?
    ├── make-interfaces-feel-better/�?github.com/jakubkrehel/make-interfaces-feel-better
    ├── onetake/                     �?github.com/feitangyuan/onetake（一镜到底发布片�?
    ├── mengto-skills/               �?github.com/MengTo/Skills（设计向 Agent Skills�?
    ├── lemo-opuscar/                �?github.com/lemomo-ai/lemo-opuscar�?9 种影片风格库�?
    ├── awesome-opus-5-5-videos/     �?github.com/athemeroy/awesome-opus-5-5-videos（资料索引）
    ├── awesome-claude-video/        �?github.com/opusvideo/awesome-claude-video（资料索引）
    ├── awesome-opus-5.5-video/      �?github.com/zhuyansen/awesome-opus-5.5-video（资料索引）
    └── awesome-claude-video-skills/ �?github.com/zhuyansen/awesome-claude-video-skills�?80 个视�?skill 索引 + 安全评级�?
    ├──  legalrabbit-docx-mcp/ excel-hygiene/ document-SKILLs/    �?Office 文档 + 商用数据
    ├── hands-on-deck/ presentation-skill/ html-to-editable-pptx/ brand-docs/            �?deck / 演示 / 模板继承
    ├── huashu-design/ xiaoma-studio/ visual-learner/ opendeck/ storyboard-claude/ video-production-skill/ visual-explainer/  �?HTML 幻灯片与朗读�?
    ├── claude-skills/ everything-claude-finance/ marketingskills/                      �?MBA 方法层（PRD / 估�?/ 营销�?
    ├── grafana-skills/ mc-agent-toolkit/ planetscale-skills/ dynatrace-for-ai/         �?可观测性观察面
    ├── superpowers/ skillspector/ skillopt/ distilly/ agentskills-spec/               �?方法�?/ 安全 / 优化 / 格式规范
    ├── investment-masters/ company-brain/                                             �?蒸馏层参�?
    └── claude-code-video-toolkit/  html-video/ openai-edge-tts/       �?视频素材�?shot 卡片
```

## User-level distribution�?026-10-24 起）

四个 harness 的用户级 skill 目录**只有一份实�?*，其余全�?Windows junction 视图�?

```
~/.claude/skills/      �?唯一实体（canonical store�?47 �?skill�?
~/.kilo/skills/        �?347 �?junction �?~/.claude/skills/<name>
~/.codex/skills/       �?347 �?junction �?~/.claude/skills/<name>
~/.agents/skills/      �?347 �?junction �?~/.claude/skills/<name>
```

- 好处：改一处四�?harness 同步生效；磁盘从 ~113 MB 降到 ~35 MB；不再有「哪�?harness 少装了几�?skill」的漂移�?
- 实测：Kilo �?skill 扫描会跟�?junction（`.agents/skills/agent-browser` �?junction，仍出现�?skill 列表里）�?
- 反面教材：`robocopy /E` 合并同名 skill �?*覆盖**同名�?`SKILL.md`（例�?anthropic �?`webapp-testing` 盖掉�?vault 版本）——先比对 hash 再覆盖�?
- 去掉 anthropic 集里与既�?skill 重叠�?6 个：`frontend-design` / `brand-guidelines` / `theme-factory` / `internal-comms` / `doc-coauthoring` / `skill-creator`；`webapp-testing` 保留 vault 版本（ComposioHQ），弃用 anthropic 版本�?
- 上游 19 个里的其�?12 个（`academy-guide` `algorithmic-art` `canvas-design` `claude-api` `discernment-nudge` `docx` `mcp-builder` `pdf` `pptx` `slack-gif-creator` `web-artifacts-builder` `xlsx`）照装，源在 `vendor/anthropics-skills/`�?
- 第二批（`vendor/` �?8 个新 submodule）只�?4 个：`html-ppt`（design）、`kinetic-reel` / `painted-animation` / `opus-video-prompts`（video）；
  `ai-animation-skill`（科普→HTML 演示）、`generating-slides`（`` 的二次开发版�?*�?vendor 不装**——与已装�?`` / `html-ppt` 重叠�?
  `opus5.5-video-prompts` �?`opus-video-prompts` 是同一 commit 的镜像，不重复装�?
  `opus55-3d-games` �?submodule 指针已更新到 `05966a9`，其�?3 �?three.js skill（`procedural-3d-scenes` / `three-clay-scenes` / `three-procedural-scenes`，v1.0.1）已复制�?`game-dev/` 并刷新用户级实体——三处（submodule / vault / 用户级）逐字节一致�?

## 雷达采纳批次�?026-10-24�?

`SKILL_RADAR/` �?6 篇雷达笔记各自结尾的「采纳清单」已落地�?*34 �?repo 成为 `vendor/` submodule�?37 �?skill 装进分类目录并分发到用户�?*�?

- 记录全文：`SKILL_RADAR/2026-10-24-radar-adoption-install-record.md`（含每个 repo �?commit / license / 装或不装的理由）�?
- 选型依据是「文件里有没有方法」，不是星标：本批次 �?�?0 �?304,484，但 6�?�?`everything-claude-finance`（DCF/LBO）比 163k�?�?agent 名单更值钱�?
- **�?vendor 不装**：无 SKILL.md �?app / 索引（`awesome-mcp-servers`、`decklight`）、许可证缺失�?`NOASSERTION`（`hermes-startup-architect`、`structflow`、`beatsdeck`、`video-talkcraft`、`zavora-ai/*`）、与 vault 同名冲突（`document-SKILLs`、`visual-explainer`）�?
- **刻意适配**（非上游原样）：`grafana-*` 前缀、目录名对齐 frontmatter、两个无 frontmatter �?skill 补了 `name:`/`description:`�?
- 未实跑：这些是第三方 skill，首次使用前先看它的 README 与依赖（多数�?API key �?MCP server）；装任何新 pack 前先�?`software-development/skill-inspector`�?

## Skills

| Skill | Category | Used By |
|-------|----------|---------|
| agents/goal-persistence | agents | persistent goal: durable state + idle self-start + anti-drift steering + resume |
| devops/kanban-orchestrator | devops | AgentMOD caretaker, AISides caretaker, PKB caretaker |
| devops/kanban-cron-overseer | devops | AgentMOD overseer |
| devops/cron-pipeline-state-machine | devops | (reference pattern) |
| software-development/aisides-ai-self-review | software-development | AISides caretaker |
| software-development/software-dev-loop | software-development | goal �?plan doc �?implement �?test �?journey �?memory dev loop (holy grail) |
| software-development/technical-research-analysis-doc | software-development | UE pak/打包/热更/渲染 调研 �?TorchLight 格式分析文档（背景→结论先行→影响链条→mermaid→方案对比） |
| software-development/journey | software-development | two-column ME/YOU project history + vibe-coding lessons |
| software-development/llm-friendly-dsl-verification | software-development | prove an LLM-friendly DSL end-to-end (compile→run→semantic-golden→fix-feedback→scene) with real evidence |
| software-development/governance-doc-design | software-development | author governance/rule/design docs: product/design/dev/legal buckets, 状�?读取时机+事实来源 skeleton, append-only decision log |
| software-development/truth-seeking-research | software-development | 事实/研究/数据问题：求真优先�?�? 级引用、脚本计算、英文改�?+ 结论先行 + 免责声明 |
| software-development/prompt-pro | software-development | 把粗请求改写成可执行提纲（目�?验收/范围/约束/输出 5 槽位）；�?grounding 再落笔；提纲不单独成�?|
| software-development/skill-distill | software-development | 会后沉淀流水线：四道闸（可复�?有判�?有证�?有边界）+ 粒度 + 归属 + 三段式写�?+ 防重复防膨胀 + PR 流程 + 自检清单 |
| software-development/perf-tracking-platform | software-development | XD 游戏引擎性能跟踪分析平台：OKR/进度快照、指标口径（帧时�?P95/P99、卡顿率、长卡顿、低�?54fps 战斗场数�?5 分钟温度曲线、loading）、瓶颈判定（GPU busy% vs gt/rt/gpu 取最大；CPU 拆模块、GPU �?pass）、看板地址与报告要�?|
| FDE/book-chapter-to-vault | FDE | .docx book chapter �?learning notes + cheatsheet + kanban + mindmap（流�?domain-agnostic，FDE 语料�?`examples/`�?|
| FDE/analysis-to-vault | FDE | long-form analytical article �?thesis + argument map + day-job notes（同上） |
| game-dev/cat-game-architecture | game-dev | C.A.T / GDC 2026 AI-driven 3D game refactor |
| game-dev/game-dev-loop | game-dev | orchestrator: classify �?GDD/TDD �?scaffold �?implement �?test/debug �?quality �?guide �?memory |
| game-dev/gdd-markdown-template | game-dev | 13-section GDD scaffold |
| game-dev/phaser-gamedev | game-dev | Phaser 3 2D games: scenes, sprites, physics, tilemaps, animations |
| game-dev/single-file-html-game | game-dev | mini-browser-games style single-file HTML games + tier audit |
| game-dev/technical-design-document | game-dev | TDD scaffold (engineering counterpart to GDD) |
| game-dev/procedural-3d-scenes | game-dev | 编排「白�?�?全程序化」两条交付路径，必选其一、Clay 优先（opus55-3d-games�?|
| game-dev/three-clay-scenes | game-dev | 白膜 / 单色 / 无贴图的第一�?3D 交付（opus55-3d-games�?|
| game-dev/three-procedural-scenes | game-dev | 代码生成几何 / 材质 / 贴图 / 环境的完�?3D 交付（opus55-3d-games�?|
| game-dev/ai-3d-scene-pipeline | game-dev | 概念多视角参考图 �?资产分流(Tripo vs 代码) �?Tripo 道具 �?Blender/Unity 组装 �?独立 Agent 多机位盲�?|
| game-dev/ai-3d-character-pipeline | game-dev | T-pose 四视�?�?Tripo Smart Mesh P2.0 四边�?�?白模检�?�?Auto-Rig Pro 绑骨蒙皮 �?Mixamo 重定�?�?IK 道具接触精调 |
| game-dev/webapp-testing | game-dev | Playwright verification of running web game |
| math/rigorous-proof | math | rigorous math proof generation + adversarial audit (theorem �?complete proof �?compilable LaTeX) |
| management/manage-up-core | management | ManageUp 核心方法论（反空话五大原则：BLUF/数据锚定/So-What/行动导向/校准语言�?|
| management/management-loop | management | router: classify �?report/advice/knowledge/methodology �?apply (anti-fluff) �?verify �?memory |
| management/weekly-report | management | 数据驱动周报/月报 |
| management/project-update | management | 项目进展汇报（红绿灯+风险矩阵�?|
| management/performance-review | management | 绩效自评/述职 |
| management/proposal | management | 提案/资源申请（ROI + 不行动代价） |
| management/meeting-summary | management | 会议纪要（聚焦决策与行动项） |
| management/quarterly-review | management | 季度复盘/QBR（记分卡+根因分析�?|
| management/upward-email | management | 向上汇报邮件 |
| management/one-on-one-prep | management | 1:1 沟通准�?|
| management/style-report | management | 大厂汇报风格（阿�?亚马�?字节/谷歌/微软/腾讯，合并自 6 �?style-*�?|
| management/mgmt-discipline | management | 15 管理学科横切方法论知识库 |
| management/mgmt-individual | management | 管理大师/实践者个人方法论（德鲁克/波特/科特勒等�?|
| management/mgmt-org | management | 17 标杆企业组织方法论（华为/字节/亚马�?丰田等） |
| management/bezos-advisor /  / renzhengfei-advisor / zhangyiming-advisor | management | 角色化管理顾�?|
| content/blog-to-twitter-post | content | 博客 �?Twitter/X 帖子（源锚定 + 趋势 + 平台规则 + 视觉简报） |
| content/blog-to-linkedin-post | content | 博客 �?LinkedIn 思想领导力帖子（3 版本 + 推荐�?|
| content/long-blog-to-viral-social-posts | content | 长文 �?病毒式社媒帖子（钩子模板 + 平台规则�?|
| content/tech-design-to-zhihu | content | 技术设计稿 �?知乎专栏：说人话、多 PNG、TL;DR + 收获结论 + PS/PPS/PPPS |
| content/gracker-writing | content | 技术文章写作：准确/有用/易读，翻译腔修正 + 四层质检（Android/性能优化/Perfetto�?|
| content/shuorenhua | content | �?AI �?说人话：中文 AI 腔清理，保真合同 + Tier/档位/scope + 回读质检 |
| content/notes-on-writing | content | Michael Nielsen 写作笔记：目�?标题/开�?危险�?结构/经典风格（英文） |
| content/social-push | content | 一句话发布内容到多平台（小红书/X/知乎/微博/微信/掘金/Linux.do），基于 agent-browser |
| content/agent-browser | content | agent-browser CLI 浏览器自动化（快�?ref/登录态，social-push 依赖�?|
| content/content-craft | content | 内容生产总纲：准�?有用/易读 + 活人�?+ �?AI �?+ 四形态骨�?+ 发布红线（提炼自全部内容 skill�?|
| content/yu-hang-writing-style | content | 俞航本人的工程笔记文风：判断开�?+ 数字/命令/路径原样 + 原因到结论显式带逻辑�?+ 没定论留 TODO；含 AI 爱用词替换表。适用技术规�?排查笔记/周报/手册/测试说明 |
| content/progress-doc-style | content | 进度/OKR 跟踪文档写作风格：标题带更新日期 + OKR 简述表 + 分目标章�?+ 行动项七列表（对应KR/行动/状�?优先�?时间/交付�?备注�? 状态三符号 + 备注一句话 + 附背景保留原�?|
| design/taste-redesign | design | 现有项目升级：审�?UI �?识别 generic AI 模式 �?高级设计标准（不破坏功能�?|
| design/taste-imagegen-web | design | 网页 comps 参考图（每 section 单独一张横向图，供编码模型复刻�?|
| design/taste-imagegen-mobile | design | 移动�?screen/flow 参考图（iOS/Android/跨平台） |
| design/taste-brandkit | design | 品牌 kit 板：logo 方向/配色/字体/身份应用 |
| design/taste-stitch | design | �?Google Stitch 屏幕生成的语�?DESIGN.md 设计系统（taste 品味 �?Stitch Visual Descriptions�?|
| design/taste-director | design | router 总纲：按意图分发�?7 �?taste-* 子技�?+ 共享 anti-slop taste 契约 |
| design/anatomy | design | 等距 SVG 插图器：将想法做�?真实可工作的小机�?�?0�?00 件精密零件，4 色调光，分屏 SVG + WebGL + 3D），�?kit/references/scripts/examples�?1.7 MB，wheresryan22/anatomy，MIT�?|
| writing/karpathy-explain-better | writing | Karpathy 4 法：别再说「再解释一遍」——把答案换成简化文�?/ 结构�?/ 可交互网�?/ 讲解视频。SKILL.md + references/modes.md（含每种形式的提示词模板、判断清单、决策树�?|
| video/ai-video-production | video | AI 视频生产总纲：技术路线选型（Remotion / HyperFrames / �?Canvas / Three.js / Blender�? 长片流水线（素材→脚本→配音→包装→提速→自验收→HANDOFF�? 短片�?agent 流水�?+ 对抗审片 + 提示词模�?+ 审片清单 |
| video/remotion-* (12) | video | Remotion 官方 Agent Skills（best-practices / create / render / captions / markup / multimedia / maps / interactivity / docs / saas / studio / upgrade�?|
| video/onetake | video | 一镜到底产品发布片/功能演示：每一拍从上一拍长出来，不切成幻灯�?|
| video/anidoodle | video | 手绘风插画与动画，自带故事线与配�?|
| video/guizang-product-video-skill | video | 读代码库 + 用真实组件做产品更新宣传�?|
| video/video-use | video | Agent 剪真实拍摄素材（读字�?挑最好一�?剪辑调色加字幕） |
| video/manim-video | video | 数学/公式动画 |
| video/make-interfaces-feel-better | video | UI 与动效细节打磨（做界面镜头时用） |
| video/lemo-opuscar | video | 39 种纯代码影片风格库（每种一段可复用风格提示�?+ 样片�?|
| video/mengto/* (29) | video | MengTo 设计�?skills�?D 材质/光照/�?天空 (16) + 素材�?(2) + 视频与审查向 (11) |
| design/html-artifacts | design | 自包�?HTML artifact 生成（reference/ + scripts/�?|
| design/slideshow | design | 幻灯片编�?|
| design/ui-mockups | design | 产品 UI 截图�?mockup（浏览器/app 窗口、仪表盘、编辑器�?|
| design/visual-explainer | design | 可视化解释产物（commands/ kit/ mcp/ plan/ pptx/ video/ templates/�?|
| design/web-prototype | design | 网页原型（assets/ references/ example.html�?|
| content/hyperframes | content | HTML �?视频渲染契约与工作流（渲染逐帧确定性） |
| content/hyperframes-video | content | 视频交付路径；媒体与声音�?CLI 自带命令 |
| devops/mock-devops-platform | devops | 模拟 DevOps 平台（部�?流水�?告警）场景数�?|
| design/html-ppt | design | HTML PPT Studio：theme 文件 = 外观、layout 文件 = 页面类型、animation class = 入场；token 化设计系统，纯静态可离线（lewislulu/html-ppt-skill，MIT�?|
| video/opus-video-prompts | video | 「用代码拍视频」提示词库：18 份提示词 + 54 个公开案例 + 技术路线与写法经验（joeseesun/opus-video-prompts；本 vault 补写指针�?SKILL.md�?|
| content/okr-planner | content | 目标 �?可度�?KR 的拆解（genoffice 推荐集；�?vault 自有 OKR 件并存，待合并） |
| content/legalrabbit-docx | content | docx 加工（legalrabbit-docx-mcp，MIT；token 优势待实测） |
| content/excel-hygiene | content | .xlsx 确定性体检（scripts/ + examples/�?|
| design/hands-on-deck | design | 拿到一�?.pptx 之后的编�?改写（EveryInc/hands-on-deck，MIT�?|
| design/presentation-skill | design | 内容驱动�?deck 构建/编辑/渲染/校验（siril9/presentation-skill，MIT�?|
| design/brand-docx / brand-pptx / brand-xlsx | design | 参考模�?+ 样式继承机制（ferdinandobons/brand-docs，MIT�?|
| design/huashu-design | design | HTML 高保真原�?幻灯�?动画 + 专家评审（alchaincyf/huashu-design，MIT�?|
| design/xiaoma-studio | design | 用代码做动效视频 / HTML 幻灯�?/ 大屏页（crawfordxx/xiaoma-studio，MIT�?|
| design/visual-learner | design | 主题/文档 �?讲解产物，含 TTS 四档降级链（huseyingayiran/visual-learner，MIT�?|
| design/opendeck | design | 动画 + 朗读�?HTML deck，音频只烘进 HTML（open-deck-org/opendeck，MIT�?|
| design/video-production | design | AI 教学视频流水线，�?**ASR 回译质量�?*（speechlab0210/video-production-skill，MIT�?|
| management/prd / cs-financial-analyst / cs-product-strategist / competitive-matrix / finance-lead / cs-growth-strategist /  | management | 商业方法层：PRD、财务分析、竞品矩阵、增长与产品策略（alirezarezvani/claude-skills，MIT�?|
| management/finance/** (15) | management | DCF / LBO / 可比交易 / 财报模型 / GAAP-IFRS-HGB 准则（everything-claude-finance，MIT，★6 但方法密度最高） |
| management/marketing/ | management | RETIRED 2026-10-25 (customer-research, competitor-profiling, marketing-council)（coreyhaines31/marketingskills，MIT�?|
| devops/grafana/* (16) | devops | Grafana 官方 skills：PromQL / LGTM �?/ Cloud 成本与可观测性（grafana/skills，Apache-2.0�?|
| software-development/brainstorming / systematic-debugging /  /  / verification-before-completion / using-git-worktrees / receiving-code-review /  | software-development | obra/superpowers 的方法论 skill（MIT�?|
| software-development/skill-inspector | software-development | 装第三方 skill 前的注入/外泄/供应链扫描闸（NVIDIA SkillSpector，Apache-2.0�?|
| software-development/skillopt-sleep | software-development | �?agent 自我优化 skill（Microsoft SkillOpt，MIT�?|
| software-development/distilly | software-development | Work + Persona 分离的蒸馏流程（titanwings/distilly，MIT�?|
| vendor/investment-masters | vendor | 投研大师方法蒸馏，含证据边界规则（AlphaGBM/investment-masters，MIT）�?投研主题，与 FDE 无关�?*�?vendor，不装进分类目录** |
| video/ffmpeg | video | 素材生成与加工全链路（digitalsamba/claude-code-video-toolkit，MIT�?|

## 评分�? / 10 / 20�?

逐份通读全部 skill 后打分：**0 无用 · 10 专业 · 20 天才**。结果：**16 �?20 分（天才）�?1 �?10 分（专业）�? �?0 �?*——重�?破损已在前几轮清理掉，剩下没有「无用」的�?

### 20 �?· 天才（最值得用）

| Skill | 类别 | 为什么是天才 |
|---|---|---|
| `goal-persistence` | agents | 持久目标的非显然洞察：durable state + idle self-start + anti-drift |
| `rigorous-proof` | math | 对抗式审计的数学证明�?|
| `shuorenhua` | content | �?AI 味的 Tier/scope/protected-span 系统 |
| `manage-up-core` | management | 反空话替换表 + 先问再写，精炼方法论 |
| `workflows` | qiushi | �?skill 编排 + 显式数据交接 |
| `mass-line` | qiushi | 「群众路线」→ AI 信息源映射，真正新颖 |
| `journey` | software-development | ME/YOU 双列 + vibe-coding 论纲 |
| `grilling` | software-development/mattpocock | frontier 访谈轮次 + 事实/决策分离 |
| `diagnosing-bugs` | software-development/mattpocock | 先反馈环后假设的调试�?|
| `wayfinder` | software-development/mattpocock | 战争迷雾决策图，plan-don't-do |
| `cat-game-architecture` | game-dev | GDC 2026 C.A.T 提炼成可 grep 验证的规�?|
| `game-template` | game-dev | 物理态家族演�?+ 稳定性指�?|
| `game-template-engineering` | game-dev | KEEP/COPY hook 纪律 + 反幻觉规�?|

### 10 �?· 专业�?1 个）

其余全部�?10 分——清晰、可执行、做好本职，是扎实的默认项。不在上�?16 个里的，都是 10 分�?

See [KNOWLEDGE.md](KNOWLEDGE.md) for operational findings: Claude CLI
adoption status, parallelism config, worker profile setup, and live
board state.

## Installation

Every skill is a complete directory containing `SKILL.md` and, when present, its
`references/`, `scripts/`, `templates/`, `assets/`, and `examples/`. Always copy
the whole skill directory. Copying only `SKILL.md` can leave broken links and
missing helper scripts.

The examples below install one skill. Replace `<category>` and `<skill-name>`
with a vault path such as `game-dev/phaser-gamedev`.

### Quick reference

| CLI / agent | Project-level destination | User/global destination | Refresh / verify |
|---|---|---|---|
| Claude Code | `<project>/.claude/skills/<skill-name>/` | `~/.claude/skills/<skill-name>/` | Start a new session or reload Claude Code |
| Codex CLI | `<project>/.codex/skills/<skill-name>/` | `~/.codex/skills/<skill-name>/` | Start a new Codex session |
| Kilo Code CLI | `<project>/.kilo/skills/<skill-name>/` | `~/.kilo/skills/<skill-name>/` | Run `/reload` or start a new session |
| Hermes Agent | N/A; use an external directory for shared project skills | `~/.hermes/skills/<category>/<skill-name>/` | `hermes skills list` |
| Portable Agent Skills | `<project>/.agents/skills/<skill-name>/` | `~/.agents/skills/<skill-name>/` | Restart the compatible agent host |

> **Windows:** `~` means your user profile directory, normally
> `C:\Users\<you>`. Git Bash examples can use `/d/GitRepo-AI/AgentSkillsVault`;
> PowerShell examples should use `D:\GitRepo-AI\AgentSkillsVault`.

### Claude Code

Project installation (recommended for repository-specific skills):

```powershell
$Vault = "D:\GitRepo-AI\AgentSkillsVault"
$Project = "C:\path\to\project"
$Skill = "game-dev\phaser-gamedev"
$Name = Split-Path $Skill -Leaf
New-Item -ItemType Directory -Force "$Project\.claude\skills" | Out-Null
Copy-Item -Recurse -Force "$Vault\$Skill" "$Project\.claude\skills\$Name"
```

Global installation for all projects:

```powershell
$Vault = "D:\GitRepo-AI\AgentSkillsVault"
$Skill = "game-dev\phaser-gamedev"
$Name = Split-Path $Skill -Leaf
New-Item -ItemType Directory -Force "$HOME\.claude\skills" | Out-Null
Copy-Item -Recurse -Force "$Vault\$Skill" "$HOME\.claude\skills\$Name"
```

Reload Claude Code or begin a new session after installation. A project may
intentionally ignore `.claude/`; check `git status` if the skill should be
shared with the team.

### Codex CLI

Project installation:

```powershell
$Vault = "D:\GitRepo-AI\AgentSkillsVault"
$Project = "C:\path\to\project"
$Skill = "game-dev\phaser-gamedev"
$Name = Split-Path $Skill -Leaf
New-Item -ItemType Directory -Force "$Project\.codex\skills" | Out-Null
Copy-Item -Recurse -Force "$Vault\$Skill" "$Project\.codex\skills\$Name"
```

Global installation:

```powershell
$Vault = "D:\GitRepo-AI\AgentSkillsVault"
$Skill = "game-dev\phaser-gamedev"
$Name = Split-Path $Skill -Leaf
New-Item -ItemType Directory -Force "$HOME\.codex\skills" | Out-Null
Copy-Item -Recurse -Force "$Vault\$Skill" "$HOME\.codex\skills\$Name"
```

Start a new Codex session so it rescans the skill directories.

### Kilo Code CLI

Install the CLI if needed:

```bash
npm install -g @kilocode/cli
```

Project installation:

```powershell
$Vault = "D:\GitRepo-AI\AgentSkillsVault"
$Project = "C:\path\to\project"
$Skill = "game-dev\phaser-gamedev"
$Name = Split-Path $Skill -Leaf
New-Item -ItemType Directory -Force "$Project\.kilo\skills" | Out-Null
Copy-Item -Recurse -Force "$Vault\$Skill" "$Project\.kilo\skills\$Name"
```

Global installation:

```powershell
$Vault = "D:\GitRepo-AI\AgentSkillsVault"
$Skill = "game-dev\phaser-gamedev"
$Name = Split-Path $Skill -Leaf
New-Item -ItemType Directory -Force "$HOME\.kilo\skills" | Out-Null
Copy-Item -Recurse -Force "$Vault\$Skill" "$HOME\.kilo\skills\$Name"
```

Kilo also discovers `.agents/skills/` by default and can read
`.claude/skills/` when Claude Code compatibility is enabled. Run `/reload` in
Kilo after copying a skill. For a shared vault without copying files, add an
absolute path under `skills.paths` in `kilo.jsonc`:

```jsonc
{
  "skills": {
    "paths": ["D:/GitRepo-AI/AgentSkillsVault/game-dev"]
  }
}
```

### Hermes Agent

Hermes uses `~/.hermes/skills/` as its primary skill store and supports
category directories:

```powershell
$Vault = "D:\GitRepo-AI\AgentSkillsVault"
$Category = "game-dev"
$Name = "phaser-gamedev"
New-Item -ItemType Directory -Force "$HOME\.hermes\skills\$Category" | Out-Null
Copy-Item -Recurse -Force "$Vault\$Category\$Name" "$HOME\.hermes\skills\$Category\$Name"
```

Verify discovery:

```bash
hermes skills list
```

To let Hermes read the vault directly instead of maintaining copies, add the
category directories you use to `~/.hermes/config.yaml`:

```yaml
skills:
  external_dirs:
    - D:/GitRepo-AI/AgentSkillsVault/game-dev
    - D:/GitRepo-AI/AgentSkillsVault/devops
    - D:/GitRepo-AI/AgentSkillsVault/software-development
    - D:/GitRepo-AI/AgentSkillsVault/FDE
```

Hermes can modify skills in writable external directories. Keep the vault in
Git and review changes before committing. If a skill is published through a
supported Hermes Hub or URL source, prefer `hermes skills inspect` followed by
`hermes skills install`; manually copied vault skills can still be listed and
loaded normally.

### Portable `.agents/skills` installation

For hosts supporting the open Agent Skills compatibility directory, install
project skills under `.agents/skills/`:

```powershell
$Vault = "D:\GitRepo-AI\AgentSkillsVault"
$Project = "C:\path\to\project"
$Skill = "game-dev\phaser-gamedev"
$Name = Split-Path $Skill -Leaf
New-Item -ItemType Directory -Force "$Project\.agents\skills" | Out-Null
Copy-Item -Recurse -Force "$Vault\$Skill" "$Project\.agents\skills\$Name"
```

This is useful when one repository is used with multiple compatible agents.
Support and precedence vary by host, so use a host-native directory when exact
behavior matters.

### Install an entire category

The following PowerShell helper copies every immediate skill directory that
contains a `SKILL.md`:

```powershell
$Vault = "D:\GitRepo-AI\AgentSkillsVault"
$Category = "game-dev"
$Destination = "$HOME\.claude\skills" # Change for Codex, Kilo, etc.
New-Item -ItemType Directory -Force $Destination | Out-Null
Get-ChildItem "$Vault\$Category" -Directory | Where-Object {
  Test-Path (Join-Path $_.FullName "SKILL.md")
} | ForEach-Object {
  Copy-Item -Recurse -Force $_.FullName (Join-Path $Destination $_.Name)
}
```

### Dependencies, MCP servers, and plugins

Skills provide instructions; they do not automatically install the tools they
describe. Read each skill's `SKILL.md`, `README.md`, or adjacent installation
guide and install only the required dependencies. For example, the Phaser
skills have a dedicated [installation guide](game-dev/PHASER-SKILLS-INSTALL.md)
covering Playwright MCP, Pillow, and Phaser.

Review third-party scripts and MCP servers before enabling them. Do not copy
credentials, private assets, generated caches, or machine-specific secrets into
the vault.

## Sync Back to Vault

When installed skills are updated, sync back to the correct category
folder:

```bash
# From installed location to vault
cp -r ~/AppData/Local/hermes/skills/<category>/<skill-name>/ \
  /d/GitRepo-My/AgentSkillsVault/<category>/<skill-name>/

# Verify byte-identical
diff -rq <vault-copy> <installed-copy>
```


## Retired skills

67 skills were removed on 2026-10-25 after the defect audit flagged them as
never usable, carrying error references, low quality, or not standalone.
See `REMOVED-SKILLS.md` for the list, the reason for each, and the upstream
`vendor/` copy kept for re-adding. `.kilo/removed-skills.txt` stops the sync
script from reinstalling them.

49 more skills were retired on 2026-10-26 after two independent audits agreed
they were unusable or redundant here (payload scripts not shipped, routers to
retired skills, duplicates), plus the PlanetScale, Dynatrace and Grafana
Cloud-only families, which need accounts this machine does not have. Same
record: `REMOVED-SKILLS.md` (second section) and `.kilo/removed-skills.txt`.
