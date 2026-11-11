# AI 与视频工程集成

> 专业整理：AI 与 Agent 集成工程师。依据 Remotion `4.0.532` 本地技术资料；本次未查上游源码、未执行安装、API 调用或渲染。

**结论：先按宿主选择可加载的技能位置，再把“规范→代码→预览→真实渲染”接成可验证流程。**

## 1. 适用与不适用

- 适用：让 Cursor、Claude Code、Codex、Kimi 辅助编写 Remotion 合成；接入 MCP；搭建生成、预览、渲染链路；比较技能改版效果。
- 不适用：仅凭技能文件证明代码正确；无模型凭据时承诺在线生成；向不支持 MCP 的客户端保证工具可用。

## 2. 输入、处理与输出

输入：宿主及版本、目标项目、技能/模板、模型凭据、场景任务集、运行环境。
处理：识别能力 → 选择规范 → 生成代码 → 预览 → 渲染 → 留证与评测。
输出：可追溯的代码变更、预览状态、渲染产物、日志和同任务集对比。

## 3. 七步工程流程

1. **确认宿主能力。** 核对客户端是否支持技能与 MCP。资料列出 `agent-plugin`、`claude-code-plugin`、`codex-plugin`、`kimi-code-plugin` 四类适配；目录约定不同，不能把复制文件等同于安装成功。
2. **选择模板。** `template-prompt-to-video` 用于通用视频闭环，`template-prompt-to-motion-graphics` 偏动态图形，`template-vibe-code` 偏可视化编辑。先做最小生成链路，再叠加需求。
3. **绑定规范。** 按资料记载使用 `remotion-best-practices`、`remotion-create`、`remotion-docs`、`remotion-markup`、`remotion-captions`、`remotion-multimedia`、`remotion-render`、`remotion-saas`、`remotion-studio`、`remotion-interactivity`、`remotion-maps`、`remotion-upgrade`；它们提供方法，不替代项目执行。
4. **配置凭据与预算。** 资料说明 AI 模板依赖外部模型服务；检查服务端凭据、网络、超时与调用预算。不把密钥写入技能、前端公开配置、日志或示例仓库。
5. **生成并审查代码。** 重点检查固定随机种子、`delayRender()` 就绪处理、`interpolate` 输入范围严格递增，以及秒与帧的换算。完整 API 签名在实际版本查证，不凭名称猜参数。
6. **分开预览与导出。** 实时预览用于快速检查，真实渲染用于验收。保存失败日志；生成失败可退回人工编辑，预览或渲染失败保留错误状态，不能只展示“成功”文案。
7. **评测改版。** 使用相同任务集、模型和环境比较基线与新版；资料中的 `skills-evals` 提供场景、运行与比较模块。成功率、耗时、成本、渲染失败和人工修正量需分别记录，不能只凭观感认定提升。

## 4. 输入与输出示例

输入：16:9、30fps、300 帧，三段文案与两张产品图，目标为可导出的产品介绍视频。
输出：参数化合成、场景时间轴、素材清单、预览检查、导出文件及日志。

先验证固定文案与素材的最小链路，再接入模型生成；生成失败保留上一版本，导出失败返回可定位日志。这里规定的是交付结构，不是本次已生成的视频。

## 5. 边界与检查清单

- 技能加载、MCP 连接、模型生成、代码编译、预览、真实渲染是六种不同成功状态。
- 模型生成具有不确定性；固定随机种子只能固定视频内部随机逻辑，不能保证模型每次输出相同代码。
- 规范与模板应绑定项目版本，升级后重做任务集评测。

检查项：宿主支持确认、安装路径正确、规范可读取、凭据隔离、最小链路通过、错误可恢复、真实导出完成、基线与改版同条件对比。

## 6. 数量与来源边界

10 §1 列出上述具名技能，§2 又写“umbrella 加 12 个独立目录”，数量口径未能确认。因此不把数量当作安装完整性指标，也不推断当前宿主可加载全部条目。

来源：

- `references/10-ai-agent-integration.md`：§1 官方技能、§2 宿主适配、§3 MCP、§4 AI 模板、§5 评测、§7 常见问题。
- `references/02-core-authoring.md`：§1 帧模型、§4 interpolate、§8 素材就绪。
- `references/01-architecture.md`：§1 版本背景、§4 渲染流程。
- `references/11-templates-qa.md`：§4 验收。

资料中的上游位置包括 `packages/skills/skills/`、`packages/mcp/src/index.ts`、`packages/skills-evals/src/cli.ts`、`packages/skills-evals/src/compare.ts`、`packages/template-prompt-to-video`。以上为分册记载路径，并非本次源码核验结果。
