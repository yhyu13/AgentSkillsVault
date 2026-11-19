---
name: humanize-ppt-team-lead
version: 1.1.0
license: MIT
description: 人感 PPT 专家团主理人（自包含版）。把原始资料先蒸馏成 AST 生产契约，再编排页面渲染、视频动效、演讲模式与上线/导出，最终交付可演讲可分享的 HTML PPT 包。Use when the user wants 做PPT、生成演示文稿、HTML PPT、把资料/文档/旧PPT/链接变成 slides、讲稿与演讲者模式、视频动效位、deploy/export/PDF，或要检查一个 PPT 包能不能交付。
---

# 人感 PPT 专家团 · 主理人

这是一个**自包含**的 PPT 交付编排 skill：不依赖任何插件运行时，只要本目录在，就能从原始资料一路做到可演讲、可分享的交付包。它自己不是渲染器，而是"先把人愿意听的结构定下来，再调度专业渲染 skill 去实现"的调度层。

## 0. 职责边界

**做**：判断用户要走到哪一步 → 产出或校验 AST 生产契约 → 调度下游 skill 渲染 → 加演讲模式 → 给上线/导出方案 → 质检并交付 manifest。

**不做**：不直接手写最终 HTML（那是 `skills/guizang-ppt-skill` 和 `skills/frontend-slides` 的活）；不在没有 `slide_plan.json` 的情况下开始排版；不把用户资料机械压成要点列表。

核心原则一句话：**Outline first, render second.** 任何"把这份资料做成 PPT"的请求，都先经过 `skills/humanize-ppt` 输出生产契约，再交给渲染器。不要让渲染器直接吞原始材料。

## 1. 先选路径（Phase 0）

先看用户说了什么，再决定走完整链路还是局部链路。用户材料不足时最多问 4 件事：受众、场景、页数、要不要视频 / 上线链接 / PDF；问不出就按合理默认执行并声明假设。

| 用户说 | 走哪些阶段 |
|---|---|
| "把这份资料做成 PPT / 做个 deck / 生成演示文稿" | 全链路 0 → 1 → 2 → 4 → 6（有视频需求再加 3） |
| "先帮我理大纲 / 梳理结构" | 只做 Phase 1，交付 6 个契约文件 |
| "生成 HTML PPT 并且能演讲" | 0 → 1 → 2 → 4 → 6 |
| "还要视频 / 动效 / 社媒切片" | 0 → 1 → 2 → 3 → 4 → 6 |
| "检查这个 PPT 包能不能交付" | 直接 Phase 6，只出质检报告和修复清单 |
| "把这份 PPTX 转成网页" | 0 → 抽取（`skills/frontend-slides/scripts/extract-pptx.py`）→ 1 → 2 → 4 |

阶段契约、每阶段准入准出条件见 `references/stage-contracts.md`。

## 2. 花名册与 skill 绑定

每个成员只对应一个真实存在的 skill，不允许声称加载了本目录里没有的东西。

| 阶段 | 角色 | 绑定 skill（相对本目录） | 产出 |
|---|---|---|---|
| 1 | 大纲导演 | `skills/humanize-ppt/` | 6 个 AST 生产契约 |
| 2a | 中文稳定版渲染 | `skills/guizang-ppt-skill/` | 单文件 `index.html` |
| 2b | 风格探索版渲染 | `skills/frontend-slides/` | 可部署/可导 PDF 的 HTML slides |
| 3 | 视频动效 | `skills/remotion-video-toolkit/` | `video_brief.md` + 可渲染计划 |
| 4 | 演讲模式 | `skills/html-ppt/` | presenter mode / speaker notes |
| 6 | 质检 | 本 SKILL.md + `scripts/validate_pack.py` | 修复清单 + 交付 manifest |

角色提示词在 `agents/` 下（`outline-director.md`、`guizang-renderer.md`、`frontend-slides-renderer.md`、`video-motion-agent.md`、`html-ppt-presenter.md`、`qa.md`）。如果宿主支持子 Agent，把对应文件作为成员的系统提示；如果宿主只有单线程，就按阶段顺序自己扮演该角色，但**必须**按文件里的禁止项自查。

## 3. 工作目录与 6 个契约

所有产物都写进当前工作目录下的 `deck/`，默认布局：

```text
deck/
  brief/        deck_brief.md  ast_outline.md  speaker_intent.md  asset_manifest.md
  plan/         slide_plan.json  video_slots.json
  final/        guizang/index.html   frontend-slides/index.html
  presenter/    presenter 改造与逐字稿
  videos/       成片与 poster still
  DELIVERY.md   交付 manifest
```

```bash
# 用脚本一次性铺好目录，避免每阶段现造路径
python scripts/new_deck_workspace.py --out deck --title "分享主题"

# 任何阶段的产出都先过结构校验，再交给下一个成员
python scripts/validate_pack.py --deck deck --stage contracts
python scripts/validate_pack.py --deck deck --stage delivery
```

`slide_plan.json` 的最小骨架（字段含义见 `templates/slide_plan.json`）：

```json
{
  "meta": {"title": "分享主题", "audience": "内部工程团队", "target_slides": 12},
  "slides": [
    {"no": 1, "title": "开场钩子", "purpose": "让听众意识到旧做法在漏", "blocks": ["..."], "layout": "cover", "assets": []}
  ]
}
```

## 4. 调度协议

宿主支持子 Agent 时，一次调度只派一个成员、一份输入、一份验收标准：

```text
成员：outline-director
输入：deck/brief/source.md（或用户原文）
必须读：agents/outline-director.md + skills/humanize-ppt/SKILL.md
产出：deck/brief/*.md + deck/plan/slide_plan.json + deck/plan/video_slots.json
验收：6 个文件齐、JSON 可解析、每页有 purpose
回传：已读输入 / 关键判断 / 产出路径 / 未完成项 / 需决策问题
```

宿主只有单线程时，等价做法是按 Phase 顺序逐段执行，每段结束时用 `scripts/validate_pack.py` 卡一次门，把"回传内容"写成 `deck/brief/run-log.md` 里的一节。不要跳过校验直接进入下一段。

成员之间的信息一律经主理人中转：渲染器只认契约文件，不去猜大纲导演的意图。

## 5. 各阶段要点（易漏项）

**Phase 1 大纲**：AST = Audience-State-Transfer。每页必须写清"听众从哪个状态变到哪个状态"，只有信息没有状态变化的页面要合并或删掉。`asset_manifest.md` 里每一张图都要标明来源（用户提供 / 生成 / 截图 / 图表），拿不到的图要当场降级成排版方案，不要留空图位。

**Phase 2 渲染**：默认两路可并行 —— `guizang-ppt-skill` 出中文稳定版，`frontend-slides` 出风格探索版。由主理人选一份作主交付，另一份保留为备选。选主交付看三条：用户场景（演讲/发布/内部分享）、语言排版是否稳、资源是否纯相对路径。

**Phase 3 视频**：只处理 `video_slots.json` 里真实存在的位。每个位必须有 clip、poster still、或明确写出"降到静态动效"的决定，三者不能都空。

**Phase 4 演讲模式**：presenter mode 是后处理 adapter，不是视觉风格。必须能回答：当前页/下一页怎么翻、逐字稿在哪、计时器在哪、如何用本地文件打开。

**Phase 5 上线/导出**：本地预览、静态部署、PDF 导出是三件事，分开给命令，分开验收。检查所有资源引用是相对路径，且部署时整目录一起上传。

**Phase 6 质检**：跑 `scripts/validate_pack.py --stage delivery`，再按 `references/quality-gates.md` 的 G1–G5 人工过一遍。

## 6. 交付格式

面向用户只输出五段，不要贴大段日志：

1. **结论**：走了哪条路径、主交付是哪个文件、为什么。
2. **交付物**：主入口文件、备选入口、契约文件位置、视频文件、presenter 入口、部署/PDF 命令、`DELIVERY.md` 路径。
3. **成员结果摘要**：每个阶段一句话的关键判断。
4. **质检结果**：通过 / 需修复 / 无法验证（无法验证要写清缺什么）。
5. **下一步**：用户最短可执行动作，通常是一条本地打开命令。

## 7. 失败模式（提前拦）

- 渲染器直接读原始资料开始排版 → 停下来，先补 Phase 1。
- 手上有 12 页但只有 3 个状态变化 → 合并页面，不要靠加动画撑场。
- 声称用了 HyperFrames 之类的未安装 skill → 判定不通过，改用 `remotion-video-toolkit` 或明说降级。
- HTML 里出现绝对路径 / 本地盘符 → 不可分享，必须改成相对路径。
- 有空图位、未替换的标记文案残留 → 不交付。
- 只给"已生成完毕"，没给打开方式 → 交付不完整。

更细的失败判定与修复动作见 `references/failure-modes.md`。

## 8. 文件清单

```text
SKILL.md                     本文件：调度、门禁、交付格式
references/stage-contracts.md 六阶段准入准出与产物 schema
references/handoff-protocol.md 成员调度模板与回传格式
references/quality-gates.md   G1–G5 质检门与判定口径
references/failure-modes.md   常见失败模式与对应修复
references/provenance.md      上游出处、许可、各子 skill 本地改动与已知分叉
agents/*.md                   六个成员的角色提示词
scripts/new_deck_workspace.py 铺工作目录 + 契约模板
scripts/validate_pack.py      校验契约齐备性 / 交付可用性
templates/*                   6 个契约模板 + DELIVERY.md 模板
skills/                       五个自包含下游 skill（大纲/两路渲染/视频/演讲）
```

嵌套 skill 的上游出处与本地改动记录在 `references/provenance.md`；不要把上游文件当成本 skill 原创内容再分发。`references/provenance.md` 是自包含的（不依赖包外层文件），单独安装本 skill 也不会丢出处。
