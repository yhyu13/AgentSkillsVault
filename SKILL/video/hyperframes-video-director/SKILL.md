---
name: hyperframes-video-director
description: 用 HyperFrames 做视频时的导演层：先判断项目状态（回答/局部操作/恢复/新建），再选交付物路线与 flow/storyboard/mode，产出 BRIEF.md 与项目卡，并按「每步都有匹配证据」验收。Use when 用户要做 HyperFrames 视频、要在 10 条领域路线里选一条、要恢复已有工程的制作决策、要项目卡/验收清单，或要判断某个需求该走 slideshow/字幕/talking-head/motion/产品片/解释片/PR 片。Not for 直接渲染或 CLI 排障（用 hyperframes），Not for 可导航演示稿（用 slideshow）。
version: 1.0.0
license: MIT
metadata:
  imported_from: "E:/XD/P4V/tl_yuhang_preUGS/frontend/trunk/我的SKILL/HyperFrames视频导演"
  wrapper: "上游无 SKILL.md，本 vault 补写指针层；7 份原始文档逐字收录在 references/"
---

# HyperFrames 视频导演

导演层方法：**先恢复事实 → 再定路线 → 再谈制作**。它不渲染、不跑 CLI、不替 composition 写代码。

## 何时用 / 何时不用

- 用：判断一份视频需求该走哪条路线；从已有工程恢复上下文；写 `BRIEF.md` 与项目卡；给制作结果定验收点。
- 不用：`hyperframes render` / check / capture 等命令与实际制作 → 用 `hyperframes` skill。
- 不用：可翻页、分段呈现的演示稿 → 用 `slideshow` skill。

## 可用性矩阵（重要，先看这个）

本包是 HyperFrames 专家集的**整理稿**，19 个被路由的 skill 中，本机只装了 2 个：

| 被路由的 skill | 本机状态 | 缺的时候怎么办 |
|---|---|---|
| `hyperframes` | 已安装 | 直接转过去做项目与渲染契约 |
| `slideshow` | 已安装 | 直接转过去做可导航演示稿 |
| `hyperframes-core` / `-animation` / `-keyframes` / `-creative` / `-audio` / `-cli` / `-registry` / `-studio` | 未安装 | 不要假装有：按 `references/能力路由.md` 的职责边界自己处理，或明确告诉用户缺哪一层 |
| `embedded-captions` / `talking-head-recut` / `music-to-video` / `motion-graphics` / `pr-to-video` / `product-launch-video` / `faceless-explainer` / `general-video` / `remotion-to-hyperframes` | 未安装 | 同上：只借方法，不承诺交付物 |

缺依赖时**先说明缺什么**，再给能做到的替代路径；不要用"已经有 skill 能做"糊过去。

## 路由流程

1. **判断状态**：只是回答问题 / 对已有工程做局部操作 / 恢复已确认决策 / 真正的新建。前三种都不要重问整套 brief（`references/能力路由.md` §1）。
2. **收 brief**：一次只确认一个会实质改变交付的未决问题；已给出的不重复问（`references/制作方法.md` §2）。
3. **选路线**：按交付物查 `references/能力路由.md` §2 的十条路线表；容易选错的三组边界在 §3（三种"给讲话视频加东西"、产品/文章/PR 三个来源体系、slideshow 不是视频渲染管线）。
4. **定流程形态**：`flow`（automation/companion）× `storyboard`（yes/no）× `mode`（autonomous/collaborative），见 `references/能力路由.md` §4。
5. **落项目卡**：用 `references/项目卡模板.md` 的 JSON 骨架记录依赖、镜头、素材、步骤、输出、阻塞，保证能接着做。
6. **验收**：按 `references/验收规则.md` 逐阶段配证据——静态检查、浏览器检查（空报告≠通过）、关键帧与运动关系、音频结构、导出后验证。

## 六条不可让渡的方法

1. 先恢复事实，不从空白模板重来。
2. 分镜是可被反驳的提案，不是既定事实；静态草图 ≠ 最终预览。
3. 制作是依赖图，不是必做清单。
4. 动画必须可 seek、可重复：同一时间 + 同一输入 → 确定画面；不用网页时钟、随机交互、实时网络当时间轴。
5. 每一步都有与它匹配的证据；文件存在只是第一步。
6. 主观反馈翻译成可检查的问题，再动手。

## 边界

- 不接管渲染与发布授权：最终渲染等用户批准。
- 不把示意图数据当真实证据；PR/产品片必须读真实 PR、真实站点或用户素材。
- 不把 `slideshow` 的首屏 composition 导出后声称为"整份演示稿已导出"。

## 原始文档（逐字收录）

| 文档 | 内容 |
|---|---|
| `references/README.md` | 整理稿入口：本次蒸馏对象、边界、六条方法、最易误判的交付边界 |
| `references/总览.md` | 能力模型、21 项能力清单（1 主入口 + 10 领域路线 + 10 横向支撑） |
| `references/能力路由.md` | 状态判断、十条路线速查、易错边界、flow/storyboard/mode、横向能力调用时机 |
| `references/制作方法.md` | 从意图到可验证工程：brief、叙事先于动画、依赖图、composition 技术底线 |
| `references/验收规则.md` | 状态与证据一一对应；制作前/静态/浏览器/视觉/音频/渲染/导出各阶段验收 |
| `references/项目卡模板.md` | 可填写的 JSON 骨架与字段规则、续做核对清单 |
| `references/来源与依赖.md` | 来源证据索引、来源层与改编层、许可归属、依赖矩阵 |
