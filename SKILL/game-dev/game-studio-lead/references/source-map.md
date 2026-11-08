# 来源映射与证据边界

## 1. 提炼性质

本包只提炼可迁移的游戏开发统筹方法，不复刻人物人格、私人身份、私有指令或模型权重。
专业方法的唯一来源是下列主理人角色规范；没有读取其他成员定义来扩写其专业细节。
工具源码只证明创建流程与格式，不证明游戏开发能力或项目运行效果。

证据分三类：

- **原文规范**：来源明确写出的职责、流程、输出和协作要求。
- **本次规范化**：将原文整理成通用技能、能力路由和可复用交接结构；不声称原文有同样字段。
- **待补证据**：来源未定义或未验证的规则、数据、经验与运行结果。

## 2. 真实来源与本次 SHA256

### S1：专业方法来源

- 绝对路径：`C:/Users/XINDONG/.workbuddy/plugins/marketplaces/experts/plugins/game-development-studio/agents/game-development-studio-team-lead.md`
- 本次读取范围：L15-L113，覆盖职责、阶段、协作、路由和输出规范。
- 本次完整文件 SHA256：`a1cb070645ea1d44614f3d327af43691a7f620563e7047fcbb98a24002f5adf3`
- 类型：角色工作方法规范，不是项目案例、实测报告或私人经验记录。
- 排除内容：L12-L13 的姓名与花名、身份扮演表述，以及宿主专用参数和工具调用。

### S2：提炼方法

- 绝对路径：`C:/Users/XINDONG/.workbuddy/skills/distilly/prompts/shared/work_analyzer.md`
- 本次使用行号：L8、L12-L65、L176-L181。
- SHA256：`a49cb41dd26c2e2a60ababf931ef4541789e9ae152dbbe9ff3fcf8c252de4371`
- 采用：只提取有依据的职责、流程、输出和经验知识；无材料处明确说明不足。

### T1：提炼创建流程

- 绝对路径：`C:/Users/XINDONG/.workbuddy/skills/distilly/prompts/flows/create.md`
- 本次使用行号：L54-L77、L96-L147。
- SHA256：`5b2d4919877f9926046a9174e1128197023868523189b034f94d0df0d902e2bf`
- 采用：工作与行为两路输入、临时 meta/work/persona 和官方写入器流程。

### T2：工作文档结构

- 绝对路径：`C:/Users/XINDONG/.workbuddy/skills/distilly/prompts/shared/work_builder.md`
- 本次使用行号：L13-L101。
- SHA256：`f2939e6d6b6dc636e3886dd85e37c144a6672f910e85a38f8d9f34faaff359e9`
- 采用：Markdown 职责、流程、输出和知识依据结构；未套用其中写代码等不属于统筹的能力。

### T3：Distilly 官方写入器

- 绝对路径：`C:/Users/XINDONG/.workbuddy/skills/distilly/tools/skill_writer.py`
- 关键行号：L242-L296、L485-L551、L602-L612、L661-L683。
- 本次完整文件 SHA256：`01944f3a680afb1514105fd8404cedf8469f2bda0e1f9218ccbc83979a67002a`
- 采用：只通过 `--action create` 生成档案；显式 `--no-install-claude-skill`。
- 转录复核：此哈希已经真实磁盘 `read_bytes` 的 SHA256 实算、PowerShell `Get-FileHash` 与主代理独立结果交叉确认；以完整实算值为准，不改动源工具。

### T4：元数据 schema

- 绝对路径：`C:/Users/XINDONG/.workbuddy/skills/distilly/tools/skill_schema.py`
- 关键行号：L94-L116、L208-L232、L235-L334、L353-L411。
- SHA256：`d049094b1ffbab3adf66d3b56bf2bc4ca28df856cd14732b19a62e8ef4175e61`
- 采用：身份、分类、来源和生成产物结构；不将工具默认值当作人物事实。

### T5：角色预设

- 绝对路径：`C:/Users/XINDONG/.workbuddy/skills/distilly/tools/skill_presets.py`
- 关键行号：L23-L49、L233-L267、L296-L300。
- SHA256：`db651d18266cc3933e19a2c4c7d0b7d497a58eb9bf75d0d9ef631b1534405b46`
- 采用：`colleague` 预设、标准研究配置与显式 base-dir；不是职业证据。

### T6：独立技能初始化器

- 绝对路径：`C:/Users/XINDONG/AppData/Local/Programs/WorkBuddy/resources/app.asar.unpacked/resources/plugins/workbuddy-builtin/skills/skill-creator/scripts/init_skill.py`
- 关键行号：L216-L292、L295-L321。
- SHA256：`f9c252c76e9cb1ad4a4ddd518b4f5e49688584b1945f608736e3e5848b772cff`
- 采用：先初始化 `game-studio-lead/`，再重新整理独立 `SKILL.md` 与 references；不复用 Distilly 原件作最终入口。

### T7：只读结构校验器

- 绝对路径：`C:/Users/XINDONG/AppData/Local/Programs/WorkBuddy/resources/app.asar.unpacked/resources/plugins/workbuddy-builtin/skills/skill-creator/scripts/quick_validate.py`
- 关键行号：L11-L65。
- SHA256：`5b1b51ae317567c7f389a2b6407677eb1571baf69ac6650d5a2c889ceed3770a`
- 范围：检查基础 frontmatter 与名称格式；不能据此声称游戏工作流或宿主运行已实测。

## 3. 原文规范映射

| 方法 | S1 行号 | 本包位置 | 性质 |
| --- | --- | --- | --- |
| 只统筹、不专业建造 | L15-L23、L82-L87 | SKILL §1、role-boundaries §1-2 | 原文规范 |
| 问、选项、决策、草案、确认 | L21、L80 | SKILL §6 | 原文规范 |
| 诊断与引擎/平台/强度确认 | L38-L42 | SKILL §3、workflow §2 | 原文规范 |
| 七阶段及 Phase 0/8 | L38-L71 | SKILL §4、workflow §1、§3 | 原文规范 |
| 概念、MDA、视觉锚点与九节 | L44-L47 | workflow Phase 1 | 原文规范 |
| 串行系统设计与八节 GDD | L49-L50 | workflow Phase 2 | 原文规范 |
| 架构、至少三条 ADR、可访问性分级 | L52-L54 | workflow Phase 3 | 原文规范 |
| UX、资产、Epic/Story、冲刺与可选切片 | L56-L58 | workflow Phase 4 | 原文规范 |
| 实现、QA、设计范围评审与回顾 | L60-L61 | workflow Phase 5 | 原文规范 |
| 至少三轮 Playtest、性能、资产、音频 | L63-L64 | workflow Phase 6 | 原文规范 |
| 发布材料、原文“最终 QA 门控，签字放行” | L66-L68 | workflow Phase 7；歧义处理见 §4 | 原文规范；本次拆分质量建议与人工授权 |
| Task ID、角色、优先级、上下文、产物、路径、交接 | L75-L79 | role-boundaries §4、handoff-template A | 原文规范；字段排版为本次整理 |
| 集中交接、不改写专业判断 | L77-L78、L84 | role-boundaries §5 | 原文规范 |
| PASS/CONCERNS/FAIL 与豁免 | L22、L85、L106 | SKILL §7、workflow §4 | 原文规范 |
| Markdown、约定路径、已知风险与缓解 | L23、L70-L71、L104-L107 | SKILL §8、handoff-template D | 原文规范 |
| 孤立问题直接路由 | L93-L102、L110 | SKILL §1、role-boundaries §3 | 原文规范 |
| MDA、SDT、心流、Bartle、先测后写 | L111 | SKILL §9 | 原文参考框架，非项目实测 |
| 写入许可、提交发布删除审批 | L80、L87、L113 | SKILL §6、role-boundaries §6 | 原文规范 |

## 4. 本次规范化

- 将统筹职责改写为通用技能，用中文祈使句组织方法，不恢复姓名、花名或身份扮演。
- 将原规范 Phase 0-8 明确为“诊断 + 七个开发阶段 + 汇编”，不改变编号。
- 将宿主专用建队、成员调用和消息工具改为“承接职责、分派、集中交接”的协议。
- 将多角色不可用时的处理整理为能力路由、请求承接与明确阻塞；不声称并行已完成。
- 明确 Phase 1 美术依赖视觉锚点；原文同时写“互不依赖/可并行”和“基于视觉锚点”，本次保留共享输入依赖，不静默忽略冲突。
- 将交接字段扩展为分派、回收、门控和汇编四个模板，区分已分派、已交付、已评审与未验证。
- 增加证据路径、版本、依赖和未决事项的记录要求；这些是可迁移整理，不是原文实测案例。
- 明确门控豁免不改变原判，也不替代高影响动作审批；原文没有给出更细的豁免授权规则。
- 原文 L68 写“最终 QA 门控，签字放行”；本次结合 L112-L113 的用户决策与人工审批边界，将其规范为 QA 建议性质量门（advisory），由用户或经授权的发布负责人作最终决定并人工签字。QA 不自动批准发布；这属于本次歧义处理，不声称原文已给出相同授权细则。
- 独立运行入口只使用方法正文与 references，不复制原插件、档案元数据、私有身份指令或执行脚本。

## 5. 待补证据与适用限制

| 缺口 | 本次处理 |
| --- | --- |
| full / lean / solo 的具体评审规则 | 保留名称，标为待项目约定 |
| 三态门控的量化阈值、Bug 严重度与豁免细则 | 由项目与专业职责补充，不自行制定 |
| 美术圣经九节、GDD 八节的具体目录 | 保留数量要求，不代替专业定义 |
| Basic/Standard/Comprehensive 的达标细则 | 由美术与项目确认，不由统筹推定 |
| 引擎、平台、预算、产能、工期与优先级约定 | 等待项目输入，不假设技术栈或排期 |
| 真实 Playtest、性能、回归和发布结果 | 没有样本与执行记录，不填成功结论 |
| 私人经验、人物性格、表达风格 | 未提炼；不从角色规范推断 |
| 私有指令、模型权重 | 不属于本次提炼对象，未复制 |
| 多宿主实际运行兼容性 | 未实测；Distilly manifest 的兼容列表只是生成元数据 |

## 6. 中间档案与最终入口

- 最终运行入口：`D:/GitRepo-AI/AIGameMaker/documents/skills/game-studio-lead/SKILL.md`
- 提炼档案：`D:/GitRepo-AI/AIGameMaker/documents/skills/_authoring/colleague/game-studio-lead/`
- 系统临时输入目录：`C:/Users/XINDONG/AppData/Local/Temp/studio-distill-dgajvkr6/`
- 临时输入仅为 `game-studio-lead_meta.json`、`game-studio-lead_work.md`、`game-studio-lead_persona.md`；同一目录另存经授权移出的三个初始化占位备份，不属于最终技能内容。

档案包含 writer 生成的 `SKILL.md`、`work.md`、`persona.md`、`work_skill.md`、`persona_skill.md`、`meta.json`、`manifest.json`。
**`_authoring/` 仅是提炼中间档案，不是安装入口；不要递归安装其中所有 SKILL.md。**
`persona` 文件只记录原文协作边界，没有人物性格画像。
meta 显式标记 `is_real_person: false`、`is_fictional: true`，避免 colleague 预设默认真人身份被误当作事实。

## 7. 实际执行记录

- 读取了 S1、S2 以及 T1-T7；未扫描其他插件角色定义。
- 通过 `skill_writer.py --action create --character colleague --slug game-studio-lead --base-dir D:/GitRepo-AI/AIGameMaker/documents/skills/_authoring/colleague --no-install-claude-skill` 创建档案。
- writer 返回 `Host installs: skipped`；未设置环境变量，未执行安装。
- Python 命令使用 `-B`，避免在源工具目录生成字节码。
- writer 在 Windows 写入时将临时输入 LF 换成 CRLF；档案 work/persona 与输入在换行归一化后内容一致，不声称字节完全相同。
- 通过指定绝对路径 `init_skill.py game-studio-lead --path D:/GitRepo-AI/AIGameMaker/documents/skills` 初始化最终包后，另行整理独立正文。
- 最终自检范围仅为文件结构、引用、来源与内容边界；不包含真实游戏制作、评审或发布验证。
