# 来源索引与证据边界

## 1. 来源与版本

本技能包整理自当前 Remotion 视频工程专家使用的本地技术知识库，不复制宿主专属角色控制规则，也不复制密钥、凭据或内部提示词。

- 专家资料版本：`1.0.0`。
- 技术分册标注的 Remotion 基线：`4.0.532`。
- 原资料位置：`C:/Users/XINDONG/.workbuddy/plugins/cache/experts/remotion-video-engineering/1.0.0/skills/remotion-video-engineering-knowledge/`。
- 本次读取日期：2026-11-08。
- 资料中的上游源码路径：`packages/...`，只作来源映射；本次没有读取上游源码、运行渲染、部署云端或核对现行价格/许可。

原资料路径用于追溯，不是技能运行依赖。技能包内使用相对引用，可独立阅读。

## 2. 十二份技术分册到本包资料的映射

| 原始文件 | 真实标题/主题 | 本包主要落点 |
|---|---|---|
| `references/01-architecture.md` | 01 · 总体架构与九大领域 | `00-architecture.md`、版本背景 |
| `references/02-core-authoring.md` | 02 · 核心作者层（帧模型 · 合成 · 动画） | `01-core-composition.md` |
| `references/03-render-pipeline.md` | 03 · 渲染管线与编码（renderer / bundler / compositor） | `02-render-pipeline.md` |
| `references/04-media-webcodecs.md` | 04 · 媒体解析与浏览器内转码（media-parser / webcodecs / media） | `02-render-pipeline.md` |
| `references/05-studio-devtools.md` | 05 · Studio 与开发工具链（studio / studio-server / cli / codemods / eslint） | `03-studio-devtools.md` |
| `references/06-cloud-scale.md` | 06 · 云端规模化渲染（lambda / cloudrun / serverless） | `04-cloud-scale.md` |
| `references/07-player-embed.md` | 07 · 播放器嵌入与事件系统（player） | `05-player-embed.md` |
| `references/08-ecosystem-effects.md` | 08 · 生态组件与特效（effects / transitions / 第三方集成 / 字体） | `06-ecosystem-effects.md` |
| `references/09-assets-captions-sfx.md` | 09 · 素材 · 字幕 · 音效 · 语音识别 | `07-assets-captions.md` |
| `references/10-ai-agent-integration.md` | 10 · AI 与 Agent 集成 | `08-ai-integration.md` |
| `references/11-templates-qa.md` | 11 · 模板族 · CI 流水线 · 质量验收 | `09-quality-assurance.md` |
| `references/12-faq-troubleshooting.md` | 12 · 高频问题与故障排查（60 问 + 报错字典） | 各领域故障分诊、`09-quality-assurance.md` |

## 3. 校正与保留的不确定性

| 原资料位置 | 问题 | 本包处理 |
|---|---|---|
| 11 §4 第 3 条 | 写成 duration / fps == durationInFrames | 改为 durationInFrames / fps ≈ duration，容差需约定 |
| 03 §4 与 §11 | VP8/VP9 与 yuva420p 支持关系矛盾 | 不采纳冲突组合，要求实际版本校验与试渲染 |
| 04 §2 | 时间刻度 1,000,000 被表述为“纳秒级” | 单位说明有错，不反向猜测实际单位 |
| 02 §4 与 §9 | “单调递增”与“严格递增/未定义行为”措辞不一 | 采用严格递增工程约束，不沿用未定义行为结论 |
| 10 §1 与 §2 | 具名技能数量与目录口径不完全一致 | 不据数量推断安装完整性 |
| 03 §1 | 云渲染 API 出现在 renderer 导出清单中 | 能力清单以 06 §2 为主要参考，不将链路图当作导入路径证明 |
| 02 §3 与 §9 | 仅说明相对帧，直接加 `from` 不足以覆盖嵌套时间轴 | 明确 `from` 按父时间轴解释，嵌套时累计偏移；顶层示例单独限定 |

其他未能确认：完整 API/组件签名、默认端口、音量/速率合法范围、部分缩放算法、实际浏览器/GL/云配额、现行价格、Layer 版本、许可门槛。

## 4. 哪些内容属于专业提炼

- 先固定输入与环境，再建立基线的实验方法。
- 按失败环节定位、逐项排除变量的诊断方法。
- 容量—成本—质量权衡、资源清理与权限边界。
- 输入/输出示例、检查清单、复用任务模板。
- 文档证据与成片证据的区分。

这些方法不是对原分册逐字复制，也不构成新的事实来源。

## 5. 使用边界

本包适用于资料整理、方案与排障参考，不宣称当前 Remotion 最新版全部兼容。商业使用、外部素材与音效、数据上传和云部署需分别核对授权、隐私与费用；“存在 API”不代表“已获许可”。

本次整理只产生文档与技能资料，不修改原专家、原技能或用户原项目，不安装/注册/发布专家，不自动运行任何示例。
