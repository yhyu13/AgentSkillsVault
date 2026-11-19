# 阶段契约：准入 · 准出 · 产物 schema

每个阶段只有同时满足「准入」和「准出」才能进入下一阶段。主理人负责卡门，成员不得自行宣布通过。

## Phase 0 · 目标确认

- **准入**：用户给出资料或需求。
- **准出**：`deck/brief/deck_brief.md` 存在，且填了受众、场景、目标、页数区间、是否需要视频/上线/PDF。
- **允许的假设**：用户没说的项按默认填（页数 10–14、无视频、给本地预览 + PDF 命令），但必须在 brief 里写成 `assumption:` 行。

## Phase 1 · AST 大纲（硬依赖）

- **准入**：Phase 0 准出。
- **准出**：
  - `deck/brief/ast_outline.md`：每条叙事单元写清 Audience / 前状态 / 后状态 / Transfer 手段。
  - `deck/plan/slide_plan.json`：可被 `json.load` 解析，`slides[].no` 从 1 连续，每页有 `title`、`purpose`、`layout`。
  - `deck/brief/speaker_intent.md`：每页一句"我要让听众此刻相信什么"。
  - `deck/brief/asset_manifest.md`：每个素材标 `source` 与 `status`（`have` / `generate` / `skip`）。
  - `deck/plan/video_slots.json`：没有视频需求时写 `{"slots": []}`，不要缺文件。
- **反例**：`slide_plan.json` 有 12 页但 `purpose` 全是"介绍 xxx"——状态没有变化，打回重写。

## Phase 2 · 页面生产

- **准入**：Phase 1 准出，且 `slide_plan.json` 页数与 brief 目标页数偏差 ≤ 30%。
- **准出**：至少一条路径产出可打开的主文件；`validate_pack.py --stage render` 通过（文件存在、无绝对路径、无 `[必填]` 残留、无空 `src=""`）。
- **并行**：`guizang-ppt-skill` 与 `frontend-slides` 可同时跑，输入同一份契约，输出到 `deck/final/guizang/` 与 `deck/final/frontend-slides/`。
- **主交付选择**：演讲/发布会 → 优先 guizang；需要多主题试风格或要立刻上线 → 优先 frontend-slides。选择理由写进 `DELIVERY.md`。

## Phase 3 · 视频 / 动效

- **准入**：存在 `video_slots.json` 且非空。
- **准出**：每个 slot 三选一 —— `deck/videos/<slot>.mp4`、`deck/videos/<slot>-poster.png`、或在 `deck/videos/PLAN.md` 写明降级为 CSS 动效及原因。
- **未渲染时**：必须给出可执行命令和缺什么（依赖、素材、时长），不能只写"待渲染"。

## Phase 4 · 演讲模式

- **准入**：主交付 HTML 已定。
- **准出**：`deck/presenter/` 里有改造后的入口或明确的接入说明；页面能显示当前页/下一页；每页有 speaker notes 或逐字稿；说明计时器与打开方式。
- **反例**：只加了 notes 但没有入口文件，用户点不到 —— 不合格。

## Phase 5 · 上线 / 导出

- **准入**：Phase 2 / 4 准出。
- **准出**：`DELIVERY.md` 里同时给出本地预览命令、静态部署路径或命令、PDF 导出命令，并确认资源为相对路径、整目录可上传。

## Phase 6 · 质检

- **准入**：以上阶段宣称完成。
- **准出**：`python scripts/validate_pack.py --deck deck --stage delivery` 退出码 0，且 G1–G5（见 `quality-gates.md`）全部给出结论；未通过项写进 `DELIVERY.md` 的"已知限制"。

## 回退规则

任一阶段准出不成立时，只回退到**最近一个**准出成立的阶段，不要整链重来。回退原因写进 `deck/brief/run-log.md`，一行一条：`<时间> <阶段> <失败项> <回退到>`。
