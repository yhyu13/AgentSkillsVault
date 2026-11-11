---
name: ai-3d-scene-pipeline
description: >-
  用 AI 生产 3D 场景/关卡的完整链路：概念多视角参考图 → 资产拆解分流（Tripo 生成 vs
  Blender 代码搭建）→ Tripo 出高精度道具 → Opus 级模型驱动 Blender + Unity 组装 →
  独立审查 Agent 多机位盲审迭代。Use when the user wants to build or replicate a 3D
  scene with AI（3D 场景搭建 / 关卡复刻 / Tripo 资产生成 / 参考图还原 / 多机位验收）。
metadata:
  category: game-dev
  version: 1.0.0
  origin: local (distilled)
  source:
    article: 'https://ooo.run/post/how-to-use-ai-build-3d-games.html'
    canonical: 'https://littleprince.dev/'
    author: '@Saccc_c'
---

# AI 3D 场景生产线

## 何时调

- "用 AI 做一个 3D 场景 / 关卡 / 星球 / 房间"
- "照着这张参考图把它在 Blender/Unity 里还原出来"
- "3D 场景怎么接 Tripo 生成的道具"
- "怎么验收 AI 搭的场景像不像参考图"

## 不适用

- 角色建模与动作（走 `ai-3d-character-pipeline`）
- 浏览器里跑的小 3D 场景（走 `three-pbr-workflow` / `procedural-3d-scenes`）
- 纯美术 2D 概念图（走 `taste-imagegen-web` / `taste-imagegen-mobile`）

## 零、核心链路（一句话）

> 概念参考图 → 资产分流 → Tripo 生成 → Blender/Unity 组装 → **多机位盲审迭代**

缺任何一环都会退化：没参考图 = 风格漂；没分流 = 全靠模型生成、拓扑不可控；
没盲审 = AI 自己说"完成"。

## 一、步骤 1：概念参考图（定风格与空间）

先用图像模型出**一张满意的主场景图**，再围绕它补角度，不要一上来就抽卡。

必拍角度：

| 角度 | 用来定什么 |
|---|---|
| 俯视图（top） | 平面布局、物件间距、动线 |
| 斜侧视图（3/4 视角） | 物件高度、造型、前后层次 |
| 局部细节图 | 材质、边缘、小物件 |

要点：**服装/比例/配色在所有视角间高度一致**是这套方法成立的前提。

可复用提示词见 `references/prompts.md` §多视角场景图。

## 二、步骤 2：资产拆解分流（最容易被跳过、也最值钱的一步）

先让 AI 分析参考图，**逐个资产判定走哪条路**，不要直接开生成：

| 资产类型 | 走哪条路 | 理由 |
|---|---|---|
| 有机、雕塑感、纹理复杂（星球、雕像、异形植物） | **Tripo 生成** | 手工搭不出细节，AI 生成给首稿 |
| 规则几何（墙、台阶、箱子、路、柱） | **Blender/Unity 里用代码搭建** | 参数化更准、可复用、改起来便宜 |
| 角色 | Tripo + 绑骨（见 `ai-3d-character-pipeline`） | 单独走 |

判定标准一句话：**"这个形状能被参数化描述吗？"能 → 代码；不能 → 生成。**

输出物：一张**标注图**，标出哪些资产编号走 Tripo。
可复用提示词见 `references/prompts.md` §资产拆解与标注。

## 三、步骤 3：Tripo 出道具

- 静态场景道具 → 用**高精度模型**（作者用 H3.1；核心诉求是静态资产细节精度）。
- 生成后导出 glb/fbx 给 Blender。
- 批量生成用 API（见已装 skill `tripo-3d-generation`），比逐个点插件快一个量级。

## 四、步骤 4：Blender + Unity 组装

给模型的输入必须齐：**参考图 + 全部 Tripo 资产**。要求：

1. 严格按参考图摆位、调比例、调朝向。
2. 代码能做的（重复摆放、阵列、材质分配）用脚本，别手点。
3. 结构清理/减面在 Blender 做，引擎侧只做场景与交互。

## 五、步骤 5：多机位盲审迭代（验收闭环）

这是整条链路的**质量闸**，作者原话是"派一个独立的审查 Agent 进行多机位场景盲审"。

- 审查 Agent 独立于实现 Agent，避免自我确认偏误。
- 盲审 = 审查方拿**渲染图 vs 参考图**，逐角度找差异，不看实现过程。
- 差异清单 → 回到第 4 步修 → 再截 → 再审，直到没有显著差异。
- 多机位截图脚本/判据见 `references/review-loop.md`。

可复用提示词见 `references/prompts.md` §复刻 + 盲审迭代。

## 六、验收判据

- [ ] 每个场景有：主视图 + 俯视 + 至少一个斜侧视角的成片
- [ ] 盲审 Agent 给出的差异清单为空（或剩余差异被显式接受并记录）
- [ ] 资产来源可追溯：哪些是 Tripo 生成、哪些是代码搭建
- [ ] 引擎内能跑起来（不只是渲染图好看）

## 七、常见坑

| 坑 | 后果 | 防 |
|---|---|---|
| 参考图只有一张 | 布局靠猜 | 强制补俯视 + 斜侧 |
| 全资产都丢给 Tripo | 拓扑不可控、风格不统一、贵 | 先分流 |
| 没有盲审 Agent | AI 自评"完美" | 独立审查方 + 截图对照 |
| 只看 Blender 不看引擎 | 引擎里穿帮/光照不对 | 引擎内也要截图 |
| 场景先做漂亮再补交互 | 返工 | 先定交互点，再摆场景 |
