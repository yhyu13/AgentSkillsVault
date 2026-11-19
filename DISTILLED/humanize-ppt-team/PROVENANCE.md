# PROVENANCE — humanize-ppt-team (distilled pack)

> **已入库 2026-11-20。** 这个包不再是"只归档"。skill 已移到
> `SKILL/design/tier0/humanize-ppt-team-lead/`（含 5 个内嵌子 skill），进了 `scripts/install-manifest.txt`。
> 本目录只保留审计记录（本文件 + `audit/`）。目录结构、评分与本次修的缺陷见
> `SKILL/design/tier0/humanize-ppt-team-lead/audit/REVIEW-2026-11-20.md`。

蒸馏时间：2026-11-12
上游来源：`~/.workbuddy/plugins/marketplaces/experts/plugins/humanize-ppt-team`
（WorkBuddy 专家团插件，`humanize-ppt-team` v1；作者 LearnPrompt / 歸藏 / Zara Zhang / lewis 等，见各 skill 内 LICENSE）

蒸馏目标：把"一个插件运行时里的专家团"变成**一个自包含 skill 目录**，脱离插件也能跑完整链路，并让每个子 skill 单独可安装、单独可评分、单独可分发。

## 结构

```text
DISTILLED/humanize-ppt-team/
  PROVENANCE.md                     本文件
  audit/                            评分报告（score_skills.py 输出）
  humanize-ppt-team-lead/           父级 orchestrator skill（本次新写）
    SKILL.md  agents/  references/  scripts/  templates/
    skills/                         5 个嵌套子 skill（子目录 skill）
```

父目录 skill 负责调度与验收（Phase 0–6、交接协议、质检门），子目录 skill 负责专业生产（大纲、两路渲染、视频、演讲模式）。父不代写子产物，子不越界读原始资料。

## 各 skill 的上游与本地改动

只有 `SKILL.md` 被修改；除下表新增文件外，所有 payload（references / scripts / templates / assets / examples / docs / rules）均为上游原样拷贝，未改动、未删减。

| 子 skill | 上游路径 | 本地改动 |
|---|---|---|
| `humanize-ppt` | `skills/humanize-ppt` | description 补 `Use when` 触发线索；追加 "Handoff contract inside a deck pack" 一节（6 契约表 + 自检命令 + 不许交付清单） |
| `guizang-ppt-skill` | `skills/guizang-ppt-skill` | 补 `version` / `license`；description 补英文触发线索；把"占位符 / 占位色块 / 项目/XXX"改为不歧义写法；**新增** `scripts/check_deck.py`（标记残留 / 绝对路径 / 缺图 / motion 库 / 页数自检）；追加"交付前自检"一节 |
| `frontend-slides` | `skills/frontend-slides` | 补 `version` / `license`；**新增** `references/design-craft.md`（场景→预设决策表、排版与动效预算、导出现实）、`templates/starter-deck.html`（零依赖 3 页起步模板，键盘导航 + hash 深链 + reduced-motion）；Supporting Files 表补两行 |
| `html-ppt` | `skills/html-ppt` | 补 `version` / `license`；修断链 `examples/my-talk` → `examples/demo-deck`（实际存在）；把示例话术里的字面 `xxx` 改为具体表述 |
| `remotion-video-toolkit` | `skills/remotion-video-toolkit` | 补 `version: 1.4.0`（取自上游 `_meta.json`）；**新增** `references/index.md`（29 条 rules 的分组索引 + deck slot 约定）、`scripts/render_check.py`（渲染前体检：依赖 / Root 注册 / composition id / staticFile 缺失）、`templates/Composition.tsx`（槽位起步组件）；追加 "Deck slot workflow" 一节 |
| `humanize-ppt-team-lead` | 上游 `agents/humanize-ppt-team-lead.md` + `rules/humanize-ppt-team_rules.md` | **新写**。把主理人角色卡、团队 SOP、协作红线重写为可移植的调度条款（含单线程降级模式），并把 6 个成员角色卡作为 `agents/` 一并收进包内 |

## 为什么不直接拷贝

- 上游是"专家团插件"：`agents/` 是平台角色，`skills/` 是并列依赖，两者靠插件运行时绑定。换成单个 skill 目录后，必须有人写清"谁在什么阶段读哪份契约"，否则子 skill 之间没有接口。
- 上游 `skills/` 五个包的质量分基线为 8.28（min 7.2）：4 个缺 `version`、3 个缺触发线索、2 个含会误导分发的标记词或断链、1 个没有脚本可执行。发布为独立 skill 前必须修。

## 质量

`docs/skill-capacity-audit/score_skills.py --recursive` 结果：6 个 skill 平均 **10.0**，最低 **10.0**，断链 0，重复体 0，name/目录不一致 0。报告见 `audit/`。

## 再分发注意

子 skill 各自保留上游 LICENSE（MIT）。再分发时保留各自 `LICENSE` 文件与上方来源信息；父级 orchestrator（`humanize-ppt-team-lead` 的 SKILL.md / references / scripts / templates）为本仓原创，可随仓分发。
