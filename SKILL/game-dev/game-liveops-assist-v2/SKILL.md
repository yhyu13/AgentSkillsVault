---
name: game-liveops-assist-v2
description: 游戏发行与长线运营的 AI 辅助任务：玩家反馈/工单分类聚簇、内容本地化（术语表翻译与回译抽检）、UGC 审核初筛、买量素材批量制作与版本数据对比、游戏内助手（推荐/NPC 问答/阵容建议/战报）。触发词：反馈归类、工单分诊、本地化、审核初筛、素材 A/B、NPC 问答、战报生成。不适用于：研发期玩法验证与工程开发（用 game-proto-validation-v2 / engine-project-agent-v2）。本 skill 是 game-liveops-assist 的改进版，与原版并存，优先用本版。
metadata:
  category: game-dev
  version: 1.0.0
  origin: local (distilled from Kimi article)
  source:
    article: 'https://mp.weixin.qq.com/s/qSwHJXAuAyrjeYXGC3XnFA'
    published: '2026-11-02'
---

# game-liveops-assist-v2 · 发行与运营 AI 辅助（路由版）

共同原则：**AI 做初稿、初筛、归类与起草，人做裁定与发布**；一切对外内容发出前必须经人工确认；隐私最小化，只用业务必需的数据。

## 任务路由（按需读对应文件，不要全读）

| 任务 | 按需读 |
|---|---|
| 玩家反馈 / 客服工单分类梳理 | `references/feedback-triage.md` |
| 本地化：翻译、校对、回译抽检 | `references/localization.md` |
| UGC 与内容审核初筛 | `references/moderation.md` |
| 买量素材批量与版本数据对比 | `references/ua-creative.md` |
| 游戏内助手：推荐 / NPC 问答 / 战报 | `references/in-game-assistant.md` |

## 通用红线

- 不代替人做对外承诺、定价与补偿决定、审核终判
- 高危内容（自伤、违法、人身威胁、涉未成年人）不走常规分级，标记后**立即上抛**
- 获客"玩法原型"的制作方法走 game-proto-validation-v2；本 skill 只负责素材量产与投放数据对比
- 涉玩家隐私的数据只用业务必需的最小范围

## 相对原版（game-liveops-assist）的改进

五类任务从单文件大杂烩拆成按需加载的 references（做本地化时不再读审核的规则，省 token 也防串味）；反馈梳理补上"去重聚簇 + 严重度排序 + 固定 CSV 表头"；本地化补术语表格式与超限处理策略；审核补高危内容立即上抛规则；素材对比补归因纪律（一次只变一个主变量）与数据口径。
