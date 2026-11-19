# 上游出处与本地改动（随本 skill 一起分发）

本文件原先只存在于包外层（`../PROVENANCE.md`）。装到 store 之后外层文件不存在，
断链会让"这堆东西是谁的、能不能再分发"变成无据可查，因此把出处收进 skill 内部。

- 上游：WorkBuddy 专家团插件 `humanize-ppt-team` v1（`~/.workbuddy/plugins/marketplaces/experts/plugins/humanize-ppt-team`）
- 蒸馏时间：2026-11-12
- 各子 skill 的作者与许可：见 `skills/<name>/LICENSE`，均 MIT
- 本 skill（`humanize-ppt-team-lead`）的 SKILL.md / references / scripts / templates 为本仓原创，可随仓分发

## 子 skill 与本地改动

只有 `SKILL.md` 被修改；除下表"新增"列的文件外，payload 均为上游原样拷贝。

| 子 skill | 相对路径 | 本地改动 |
|---|---|---|
| `humanize-ppt` | `skills/humanize-ppt/` | description 补触发线索；追加 "Handoff contract inside a deck pack"（6 契约表 + 自检命令） |
| `guizang-ppt-skill` | `skills/guizang-ppt-skill/` | 补 `version`/`license`；新增 `scripts/check_deck.py`（标记残留 / 绝对路径 / 缺图 / motion 库 / 页数自检） |
| `frontend-slides` | `skills/frontend-slides/` | 补 `version`/`license`；新增 `references/design-craft.md`、`templates/starter-deck.html`（零依赖 3 页起步模板） |
| `html-ppt` | `skills/html-ppt/` | 补 `version`/`license`；修断链 `examples/my-talk` → `examples/demo-deck`；2026-11-20 起与 `SKILL/design/tier0/html-ppt` 对齐（含 narrated-deck） |
| `remotion-video-toolkit` | `skills/remotion-video-toolkit/` | 补 `version: 1.4.0`；新增 `references/index.md`、`scripts/render_check.py`、`templates/Composition.tsx` |

## 已知分叉（明确记录，不要当同步过的）

- `skills/frontend-slides/` 是 **2026-11-12 的上游快照**，与 `vendor/frontend-slides` 子模块已经分叉：
  上游后来把"Viewport Fitting"重写成"Fixed 16:9 Stage"，那是架构级重写，不是补丁。
  本包不跟随，因为 `agents/frontend-slides-renderer.md` 与 `viewport-base.css` 是按旧架构写的。
  要升级就整包迁移两处（renderer 角色卡 + viewport-base.css），不要只换 SKILL.md。
- `skills/html-ppt/` 已于 2026-11-20 与仓内 `SKILL/design/tier0/html-ppt` 逐文件对齐（含 narrated-deck 与 opendeck 合并），
  不再持有旧副本，也不再额外打 `version`/`license` 字段——那套字段以仓内 tier0 版本为准。
