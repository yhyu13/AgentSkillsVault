# 来源映射与证据边界

区分“原文提炼”“本次规范化”“待补证据”。本文件用于审计与迁移，不是运行本技能的前置依赖。

## 1. 原文来源与指纹

以下 SHA256 按源文件全部字节计算；引用行号从 1 开始。哈希只标识读取的来源版本，不证明引擎能力、兼容性或测试通过。

### S1 · 工程角色定义（主来源）

- 绝对路径：`C:/Users/XINDONG/.workbuddy/plugins/marketplaces/experts/plugins/game-development-studio/agents/engineering-lead.md`
- 读取范围：L1-L57（57 个实际文本行，文件末尾有换行）。
- SHA256：`b6869e40ad24f1bb7ad998a2fc8b9c083aaa97a0958092aa6136f2ebf40be2a2`
- 性质：虚拟角色的职责和工作方法定义，不是个人履历或游戏项目证据。

| 原文位置 | 原文要点 | 本次落点 |
|---|---|---|
| L15-L19 | 技术域覆盖；设计转工程；策划/美术/QA 边界 | `SKILL.md` §1、§6-7 |
| L22、L39 | GDD → 分层 → 模块 → ADR → 控制清单；ADR 四要素 | `SKILL.md` §4；`deliverables.md` §2-4 |
| L23 | 按项目选 Godot 4 / Unity / Unreal 5；候选技术名称 | `SKILL.md` §3 |
| L24、L40、L51 | Epic/Story；GDD ID、ADR、验收、证据；先写测试 | `SKILL.md` §6-7；`deliverables.md` §5-6 |
| L25、L41 | 帧率/内存/带宽预算先行；CPU/GPU/内存剖析；安全项 | `SKILL.md` §8；`workflow.md` §5-6 |
| L26 | CI/CD、构建、版本控制、遥测事件、A/B | `SKILL.md` §9；`deliverables.md` §8 |
| L29-L36 | GDD/索引/架构/版本/配置输入；代码与测试现状；知识缺口 | `SKILL.md` §2-3；`workflow.md` §1 |
| L44-L46 | 阶段/Story/Output Path；授权写入；SendMessage 交接 | `SKILL.md` §2、§9；`deliverables.md` §1、§9 |
| L49-L50 | 五条路径编码规则；ADR 备选/后果；一页控制清单 | `SKILL.md` §4-5；`deliverables.md` §4 |
| L54-L57 | 验证驱动、引擎一致性、API 诚实、人工审批 | `SKILL.md` §3、§7、§10 |

### S2 · 主理人协作段（必要补充）

- 绝对路径：`C:/Users/XINDONG/.workbuddy/plugins/marketplaces/experts/plugins/game-development-studio/agents/game-development-studio-team-lead.md`
- 读取范围：L25-L69，仅用于协作职责与阶段衔接；未据此提炼其他角色的完整技能。
- 相关全文指纹范围：L1-L113；SHA256 按整个文件计算，不按摘录行计算。
- SHA256：`a1cb070645ea1d44614f3d327af43691a7f620563e7047fcbb98a24002f5adf3`

| 位置 | 原文支撑 | 本次处理 |
|---|---|---|
| L30、L33 | 工程与 QA 职责列表 | 保留工程/QA 协作，不复制真人画像 |
| L53 | 技术搭建包含“至少 3 条基础层 ADR” | 写入 `SKILL.md` §4；该最低数量来自 S2，不误记为 S1 |
| L57 | 工程负责 Epic/Story 拆分与测试框架脚手架 | 保留技术接入职责，与 QA 的验收策略分开 |
| L61、L64、L68 | 工程实现/优化；QA 计划与最终门控 | 写入技术验证、性能剖析、QA 交接分工 |

只将职业协作关系迁移为职能；不沿用原插件中的固定姓名、子团队数量或特定通信路由。
通过当前环境可用渠道向统筹交接；单人向用户汇报；不依赖原插件固定成员或专用通信接口。

## 2. 本次规范化（非原文逐字内容）

| 处理项 | 原文基础/本次要求 | 规范化结果与边界 |
|---|---|---|
| 虚拟职业定位 | S1 职业定义；本次禁止真人画像 | 仅保留职业方法，Persona 对无材料项明确标不足 |
| 工程先写测试与 QA 边界 | S1 L19/L35/L40/L54；S2 L33/L57/L61/L68 | 工程负责可测试实现、技术验证/证据；QA 拥有验收测试策略与质量结论；不杜撰团队冲突 |
| 路径作用域基线 | S1 L49 | 保留 gameplay 数据驱动、core 零热路径分配、ai 可调试、network 服务端权威、ui 不持有游戏状态；目录映射和例外须项目确认 |
| 引擎清单降为候选能力 | S1 L23/L36/L55-L56 | 不宣称实测，不给未经核验的具体 API 签名；按版本与平台验证 |
| 架构模板细化 | S1 分层/模块/ADR；S2 三条基础层 ADR | 补充矩阵、依赖/数据流字段、待决状态和基础层选题，不新增已批准架构 |
| Story 与证据细化 | S1 需求 ID/ADR/验收/证据；本次要求模板落地 | 补充 AC、前置条件、状态、环境、命令、实际结果；未执行保留未运行 |
| 性能预算细化 | S1 预算先行、CPU/GPU/内存剖析 | 补充设备/场景/构建/采样口径、基线与同条件复测；不设置虚构阈值 |
| 安全/CI/遥测细化 | S1 能力列表 | 补充威胁边界、构建失败出口、事件字段、A/B 观察窗口；不声称已有安全控制或上线埋点 |
| 通用与单人使用 | S1 团队输出规则；本次独立技能要求 | 团队用消息交接，单人直接汇报；不要求原插件、固定成员或子团队 |
| npm 命令处理 | S1 L34 的命令示例 | 不作为通用前置要求；本次未执行仓库 npm、lint、typecheck 或游戏测试 |

`workflow.md` 和 `deliverables.md` 的可执行字段属于本次方法规范化，不应反向宣称为原文已有项目记录。

## 3. 待补证据

- 项目 GDD、系统索引与需求 ID：本次未读取真实游戏项目；待策划提供版本化输入。
- 引擎精确版本、官方 API 依据、包/插件/平台支持：来源只有能力名称，不能证明实际兼容。
- 分层与基础层 ADR 的项目上下文：只有最低数量要求，没有三条已经批准的具体决定。
- 性能数字、剖析记录、设备/画质/构建条件：原文没有，模板保留未测/待确认。
- 威胁模型、存档保护方案、权威部署与验证证据：原文没有，不能宣称安全达标。
- CI 配置、构建产物、技术用例、QA 验收记录：本次仅文档提炼，未运行游戏项目检查。
- 遥测 schema、A/B 样本与指标结果：原文仅列能力，没有上线或实验结果。
- 真人口吻、历史战绩、上下级行为：材料不足，不推断、不补写。

## 4. 制作溯源（非运行依赖）

### T1 · 提炼与初始化制作工具

- `C:/Users/XINDONG/.workbuddy/skills/distilly/prompts/shared/work_analyzer.md`
  - 读取范围 L1-L181；按职责、流程、技术标准与证据缺口分析。
  - SHA256：`a49cb41dd26c2e2a60ababf931ef4541789e9ae152dbbe9ff3fcf8c252de4371`
- `C:/Users/XINDONG/.workbuddy/skills/distilly/tools/skill_writer.py`
  - 读取范围 L1-L720；经 `create` 生成原件，未手工生成或修改原件。
  - SHA256：`01944f3a680afb1514105fd8404cedf8469f2bda0e1f9218ccbc83979a67002a`
- `C:/Users/XINDONG/AppData/Local/Programs/WorkBuddy/resources/app.asar.unpacked/resources/plugins/workbuddy-builtin/skills/skill-creator/scripts/init_skill.py`
  - 读取范围 L1-L325；先初始化标准技能，再编写独立中文正文。
  - SHA256：`f9c252c76e9cb1ad4a4ddd518b4f5e49688584b1945f608736e3e5848b772cff`

原件生成显式使用 `--character colleague --slug game-engineering-lead --no-install-claude-skill`，工具报告跳过宿主安装。
临时输入位于 `C:/Users/XINDONG/AppData/Local/Temp/studio-distill-n7byc6w2/`，仅作制作中间件，不是最终技能的依赖。
Windows writer 将 LF 转为 CRLF；原件 Work/Persona 与输入按文本读取一致，不因换行差异手改原件。

Distilly 原件：`D:/GitRepo-AI/AIGameMaker/documents/skills/_authoring/colleague/game-engineering-lead/`。
标准技能：`D:/GitRepo-AI/AIGameMaker/documents/skills/game-engineering-lead/`。

原件使用 Distilly 的 `colleague-game-engineering-lead` 名称；标准技能使用 `game-engineering-lead`，两者是不同产物。
`_authoring` 只保留提炼溯源，不作为本技能的安装入口；运行只读本技能与用户实际提供的项目资料。
