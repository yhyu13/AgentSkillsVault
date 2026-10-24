# 2026-10-24 雷达采纳批次：submodule 落地 + skill 安装记录

> **English rephrase of the task:** "Now add those repos as git submodules into the related topic folders, then install the skills."
> 实际执行口径（本 vault 既有约定）：submodule 落 `vendor/<repo>`；skill 复制进对应分类目录；
> 用户级分发 = `~/.claude/skills` 实体 + `~/.kilo|~/.codex|~/.agents/skills` junction 视图。
> 范围 = 6 篇雷达笔记各自结尾「采纳/复制」清单里的 repo（用户确认：只取采纳清单，不取全部 Top-20）。

## 0. 结论先行

- **34 个 repo 变成 submodule**，全部落在 `vendor/`，指针已写入 `.gitmodules` + git index（`git submodule status` 全部可见）。
- **137 个 skill 装进 vault 分类目录**，并分发到用户级四个 harness（`~/.claude/skills` 实体 + 3 个 junction 视图）。
- **7 个候选明确不装**，理由分三类：无 skill 形态（纯 app / 索引 / MCP server）、许可证缺失或 `NOASSERTION`（不可复制）、与 vault 已有 skill 重名或重叠。
- **4 处刻意的适配**（重命名 / 前缀 / frontmatter 补丁），已在 §4 逐条记录——不是上游原样。
- 结论一仍然成立：**stars 决定不了采纳，文件里有没有方法才决定**。本批次 34 个 repo 的 ★ 从 0 到 304,484，采纳理由全部是「文件里有本 vault 缺的那一块」。

## 1. 口径与规则

| 项 | 规则 |
|----|------|
| submodule 位置 | `vendor/<repo>`（沿用 vault 既有约定；用户已确认不放进 SKILL_RADAR 子目录） |
| clone 深度 | `git clone --depth 1` 后手工注册 gitlink（`git update-index --cacheinfo 160000,<sha>,path`）——34 个 repo 全量 clone 约 1.5 GB，浅 clone 约 400 MB |
| 后续同步 | `git submodule update --init --depth 1 <path>` 可复现浅 clone；需要完整历史时去掉 `--depth 1` |
| 安装单位 | 整个 skill 目录（SKILL.md + references/ scripts/ assets/ templates/），不只拷 SKILL.md |
| 目录名 | 与 frontmatter `name:` 对齐；不一致时以 frontmatter 为准并重命名目录 |
| 大文件裁剪 | 排除纯演示物料（`examples/` `demos/` `gallery/` `videos/` `media/` `downloads/` `decks/` `tests/`），保留运行所需资产（`assets/` `scripts/` `references/` `templates/`） |
| 分发 | 实体写 `~/.claude/skills/<name>`；`~/.kilo`、`~/.codex`、`~/.agents` 只放 junction（`cmd /c mklink /J`） |

## 2. 已 vendored 的 34 个 repo

指针 = `git submodule status` 里的 commit；许可证取自 `GET /repos`（2026-10-24 快照）。

| vendor 路径 | upstream | commit | license | 处置 |
|---|---|---|---|---|
| `vendor/genoffice` | genspark-ai/genoffice | 28cee5c | Apache-2.0 | 装 `content/genoffice`、`content/okr-planner` |
| `vendor/legalrabbit-docx-mcp` | LegalRabbit-AI/legalrabbit-docx-mcp | a1c9be8 | MIT | 装 `content/legalrabbit-docx` |
| `vendor/excel-hygiene` | BayramAnnakov/excel-hygiene | bca5a74 | Apache-2.0 | 装 `content/excel-hygiene` |
| `vendor/document-SKILLs` | appautomaton/document-SKILLs | dfb5685 | MIT | **只 vendor**：docx/pdf/pptx/xlsx 与 anthropic 集同名，覆盖会顶掉 vault 版本 |
| `vendor/market-intel` | DaizeDong/market-intel | 1046cd8 | MIT | 装 `content/market-intel` |
| `vendor/hands-on-deck` | EveryInc/hands-on-deck | a24b996 | MIT | 装 `design/hands-on-deck` |
| `vendor/presentation-skill` | siril9/presentation-skill | efd899c | MIT | 装 `design/presentation-skill` |
| `vendor/html-to-editable-pptx` | Hasasasa/html-to-editable-pptx | 17c1dbb | MIT | 装 `design/html-to-pptx` |
| `vendor/brand-docs` | ferdinandobons/brand-docs | 97a6e38 | MIT | 装 `design/brand-docx` `brand-pptx` `brand-xlsx` |
| `vendor/huashu-design` | alchaincyf/huashu-design | 4fc7bfd | MIT | 装 `design/huashu-design`（排除 demos/） |
| `vendor/xiaoma-studio` | crawfordxx/xiaoma-studio | 2907bd6 | MIT | 装 `design/xiaoma-studio`（排除 examples/） |
| `vendor/visual-learner` | huseyingayiran/visual-learner | e3c6497 | MIT | 装 `design/visual-learner` |
| `vendor/opendeck` | open-deck-org/opendeck | d0dbe02 | MIT | 装 `design/opendeck` |
| `vendor/storyboard-claude` | gRAYESS123/storyboard-claude | e6b1597 | MIT | 装 `design/storyboard` |
| `vendor/video-production-skill` | speechlab0210/video-production-skill | 8c46c40 | MIT | 装 `design/video-production` |
| `vendor/visual-explainer` | nicobailon/visual-explainer | 5f37886 | MIT | **只 vendor**：与 vault 既有 `design/visual-explainer`（FDE20261023 兄弟仓）同名 |
| `vendor/claude-skills` | alirezarezvani/claude-skills | 6d2f02e | MIT | 装 `management/prd` `cs-financial-analyst` `cs-product-strategist` `competitive-matrix` `finance-lead` `cs-growth-strategist` `product-strategist` |
| `vendor/everything-claude-finance` | brainbytes-dev/everything-claude-finance | 71f43fc | MIT | 装 `management/finance/**`（15 个：DCF/LBO/可比交易/财报/会计准则） |
| `vendor/marketingskills` | coreyhaines31/marketingskills | e85f3cb | MIT | 装 `management/marketing/**`（customer-research / competitor-profiling / marketing-council） |
| `vendor/grafana-skills` | grafana/skills | 3b653d9 | Apache-2.0 | 装 `devops/grafana/**`（36 个，core/lgtm/cloud/datasources 四组） |
| `vendor/mc-agent-toolkit` | monte-carlo-data/mc-agent-toolkit | d3915f3 | Apache-2.0 | 装 `devops/monte-carlo/**`（9 个，保留 vendor 自带 `monte-carlo-` 前缀） |
| `vendor/planetscale-skills` | planetscale/skills | 999045c | MIT | 装 `devops/planetscale/**`（15 个） |
| `vendor/dynatrace-for-ai` | Dynatrace/dynatrace-for-ai | 4f9aa71 | Apache-2.0 | 装 `devops/dynatrace/**`（11 个） |
| `vendor/superpowers` | obra/superpowers | 2ce8aa1 | MIT | 装 `software-development/` 8 个方法论 skill |
| `vendor/skillspector` | NVIDIA/SkillSpector | d7338f5 | Apache-2.0 | 装 `software-development/skill-inspector`（装第三方 skill 前的安全闸） |
| `vendor/skillopt` | microsoft/SkillOpt | 84b36cd | MIT | 装 `software-development/skillopt-sleep` |
| `vendor/distilly` | titanwings/distilly | 0afc45c | MIT | 装 `software-development/distilly` |
| `vendor/agentskills-spec` | agentskills/agentskills | 69ef37e | Apache-2.0 | **只 vendor**：skill 格式规范，无 SKILL.md |
| `vendor/investment-masters` | AlphaGBM/investment-masters | b1a304f | MIT | 装 `FDE/investment-masters` |
| `vendor/company-brain` | nemock/company-brain | c82e2de | MIT | **只 vendor**：`derived_from` 边 + 置信度半衰期是蒸馏层设计模式，不是可直接用的 skill |
| `vendor/claude-code-video-toolkit` | digitalsamba/claude-code-video-toolkit | da3f474 | MIT | 装 `video/` 11 个素材生成 skill |
| `vendor/video-shotcraft` | Vincentwei1021/video-shotcraft | 43bd349 | Apache-2.0 | 装 `video/video-shotcraft`（排除 assets/ demos/ gallery/ videos/） |
| `vendor/html-video` | nexu-io/html-video | c414ecc | Apache-2.0 | **只 vendor**：BGM/TTS 混音契约的参数来源，装的是 15 张 frame 模板不是管线 |
| `vendor/openai-edge-tts` | travisvn/openai-edge-tts | edaed2a | GPL-3.0 | **只 vendor**：本地 TTS 兜底服务，无 SKILL.md；GPL 仅作参考不复制代码 |

## 3. 安装结果（137 个 skill）

| 分类 | 数量 | 目录 |
|------|------|------|
| content | 5 | `genoffice` `okr-planner` `legalrabbit-docx` `excel-hygiene` `market-intel` |
| design | 12 | `hands-on-deck` `presentation-skill` `html-to-pptx` `brand-docx` `brand-pptx` `brand-xlsx` `huashu-design` `xiaoma-studio` `visual-learner` `opendeck` `storyboard` `video-production` |
| management | 22 | `prd` `cs-financial-analyst` `cs-product-strategist` `competitive-matrix` `finance-lead` `cs-growth-strategist` `product-strategist` + `finance/**`(15) + `marketing/**`(3) |
| devops | 71 | `grafana/**`(36) `monte-carlo/**`(9) `planetscale/**`(15) `dynatrace/**`(11) |
| software-development | 11 | `brainstorming` `systematic-debugging` `writing-plans` `writing-skills` `verification-before-completion` `using-git-worktrees` `receiving-code-review` `requesting-code-review` `skill-inspector` `skillopt-sleep` `distilly` |
| FDE | 1 | `investment-masters` |
| video | 12 | `video-shotcraft` `ffmpeg` `moviepy` `elevenlabs` `playwright-recording` `qwen-edit` `ideogram4` `ltx2` `acestep` `runpod` `synthetic-ui-demo` `video_toolkit` |

分发：`~/.claude/skills` 210 → **347** 个实体；`~/.kilo` / `~/.codex` / `~/.agents` 各 347 个 junction（验证：junction 属性 = 347/347）。

## 4. 刻意的适配（不是上游原样）

| 位置 | 上游 | vault 内 | 原因 |
|------|------|----------|------|
| `design/html-to-pptx` | 目录 `html-to-editable-pptx` / name `html-to-pptx` | 目录改为 `html-to-pptx` | 目录名与 frontmatter 对齐 |
| `design/storyboard` | name `storyboard` | 目录改名 | 同上 |
| `design/video-production` | name `video-production` | 目录改名 | 同上 |
| `video/video_toolkit` | name `video_toolkit` | 目录改名 | 同上 |
| `devops/grafana/*` | 36 个通用名（`admin` `testing` `infrastructure` …） | 目录与 frontmatter 统一加 `grafana-` 前缀 | 平铺的用户级命名空间里 `admin`/`testing` 会污染召回 |
| `devops/monte-carlo/*` | 目录名无前缀 / name 带 `monte-carlo-` | 目录改成 frontmatter 名 | 同上 |
| `management/finance/equity-research/{earnings-models,sector-analysis}` | 无 frontmatter | 补 `name:` + `description:`（取正文首句引用块） | 没有 frontmatter 的 skill 不会被 harness 加载 |
| `management/finance-lead` | name `Finance Lead` | name 改 `finance-lead` | 目录名与 name 一致 |

其余 skill 目录与上游**逐字节一致**（复制自 vendor 目录，未改动）。

## 5. 明确不装的候选

| 候选 | 原因 |
|------|------|
| `punkpeye/awesome-mcp-servers`（96,810★） | 纯索引，0 个 SKILL.md；且仓库 ~560 MB |
| `googleapis/mcp-toolbox`（16,717★） | MCP server，仓库 ~1.4 GB；非 skill |
| `modelcontextprotocol/servers`（91,540★） | license `NOASSERTION`；是 MCP server 而非 skill |
| `dlkakbs/hermes-startup-architect` | 无 license 文件；笔记结论就是「按描述重写，不复制」 |
| `M-MMahmood/business-frameworks-agent-skills` | 无 license，0 个 SKILL.md；26 个框架层留给 `management/` 自研 |
| `kings0527/structflow` | 无 license；只作证据纪律参考 |
| `zavora-ai/skill-observability-monitoring` | license `NOASSERTION`；笔记结论是「合成一个复合 skill」，不是直接抄 |
| `Vincentwei1021/video-talkcraft` | license `NOASSERTION` |
| `DotIN13/beatsdeck` | 无 license |
| `decklight/decklight`（5★） | 仓库里没有 SKILL.md（是 CLI app），装不了 skill |
| `appautomaton/document-SKILLs`（docx/pdf/pptx/xlsx） | 与 anthropic 集同名 skill 冲突，用户级平铺命名空间会顶掉既有版本 → 只 vendor |
| `nicobailon/visual-explainer` | 与 vault 既有 `design/visual-explainer` 同名 → 只 vendor |

## 6. 盲区与未核实项

- **未取 skill 安装量（installs）**：本批次仍只按「文件里有没有方法」选型，没有 installs 数据支撑。
- **未跑通端到端**：这些是装进来的第三方 skill，**没有一个在本机实跑过**。首次使用前先看它自带的 README/依赖（多数需要 API key 或 MCP server）。
- **star 数是 2026-10-24 快照**，本批次记录的 commit 也是当天状态；上游后续更新不会自动进来（submodule 指针需手动 `git submodule update`）。
- **裁剪过的目录可能让个别 skill 缺素材**：`huashu-design`（排 demos/）、`xiaoma-studio`（排 examples/）、`storyboard-claude`（排 examples/ media/ downloads/）、`video-shotcraft`（排 assets/ demos/ gallery/ videos/ workbench/）。如果某个 skill 报「找不到文件」，去 `vendor/` 里看被排掉的是什么。
- **`presentation-skill` 里的 `plugins/presentation-skill` 是同一 skill 的第二份拷贝**，已在 vault 副本中删除，避免双份注册。

## 7. `[判断与建议]`

1. **先跑安全闸再装下一批**：本批次已经装了 137 个第三方 skill，`software-development/skill-inspector`（NVIDIA SkillSpector）应当成为「装任何第三方 pack 之前」的前置步骤。
2. **devops 这 71 个 skill 是一次性铺开的观察面，不是推荐清单**：Grafana / PlanetScale / Dynatrace / Monte Carlo 都是产品绑定 skill，需要对应账号与实例才有意义。建议先只留常用的，其余在 vault 里待命即可。
3. **`okr-planner` 填上了一个真空**：雷达结论「OKR 写作是白区（最高 11★）」，本次 `genoffice` 的 `okr-planner` 是现成解，但它和 vault 自有的 `perf-tracking-platform` / `progress-doc-style` 是同一片地——**建议后续合并成一个 vault 自己的 OKR skill**，不要三份并存。
4. **观察清单还没做**：SKILL_RADAR 的 README 写着「按 stars + installs + pushed_at 三轴索引」，本批次没补 installs 轴，下一轮扫描补上。
5. **下次扫描别只加数量**：本批次的价值全部来自「填补具体空白」（DOCX/XLSX/PPTX 编辑、DCF/LBO、PromQL、DQL、读音质量闸），不是来自 star 排名。空白驱动的扫描比 Top-20 扫描更值钱。

## 8. Sources

| # | 来源 | 等级 | 支撑什么 |
|---|------|------|---------|
| 1 | `GET /repos/{owner}/{repo}`（GitHub REST，2026-10-24，带 token） | 1 | 每个 repo 的 license / pushed_at / 默认分支 / `SKILL.md` 计数（`git/trees?recursive=1`） |
| 2 | `GET /search/repositories`（发现候选） | 1 | 候选发现，★ 排序 |
| 3 | 本仓 6 篇雷达笔记的「行动建议」节 | 1（内部一手） | 采纳清单本身 |
| 4 | 本机 git submodule status / 目录哈希 | 0 | 指针、落位、逐字节一致 |
| 5 | `GET /repos/{owner}/{repo}/contents/...` 逐文件读取 | 1 | frontmatter 适配前的原始 `name:` 值 |

---

## 9. 勘误（2026-10-24 同日复核）

本记录保留当日安装事实，不回改上文表格；以下为事后复核结论：

- **`FDE/investment-masters` 已删除**。复核发现它是 `vendor/investment-masters`（submodule @ `b1a304f`）的**逐字节副本**（`git diff --no-index` 零内容差异），且该 skill 与 FDE 无关——内容是 AlphaGBM 的 15 位投资大师方法蒸馏（SEC 13F、Buffett/Dalio/Soros）。
- **现只保留 `vendor/investment-masters`（vendor-only）**，不装进任何分类目录。原先把它放进 `FDE/` 的原因是选型时把「distilled masters（人物蒸馏）」与包名 `investment-masters` 混淆。
- 受影响文档已同步：`INSTRUCTION.md`（FDE 小节 + vendor 表）、`README.md`（目录树 + skill 表）、`docs/skill-capacity-audit/2026-10-24-capacity-audit.md`（路径列）。

---

> 免责声明：本输出由 AI 辅助生成，仅用于信息整理与研究参考，不构成专业意见或决策依据。
