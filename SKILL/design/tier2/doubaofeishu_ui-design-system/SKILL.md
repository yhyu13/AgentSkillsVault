---
name: doubaofeishu_ui-design-system
description: 建或改 UI 设计系统与组件库时用这一套：先立 Design Token（颜色/字体/间距/圆角阴影），再按原子→分子→模板搭组件，每个组件给全状态矩阵，最后像素级走查。Use when 要做设计系统 / 组件库规范 / Design Token / 颜色字体间距体系 / 组件状态矩阵 / 暗色模式规范 / 响应式断点与栅格 / 页面模板 / 设计交付标注 / 像素级走查（design system, design tokens, component library, dark mode, responsive grid, UI spec）。Not for 品牌 VI 与 logo（用 taste-brandkit）、Not for 出界面图（用 taste-imagegen-web / ui-mockups）、Not for 单页视觉审美评测（用 taste-director）。
version: 1.0.0
metadata:
  source_family: doubaofeishu
  imported_from: "F:/XD/DistillSkills/飞书豆包distill"
  wrapper: "上游为单篇 .md 规范稿（无 SKILL.md），本 vault 补写指针层；原文逐字收录在 references/"
---

# UI 设计系统与组件规范

先建设计系统，再做页面。页面只是组件的组合，**组件才是资产**；所有视觉决策都必须能回溯到 Token，否则就是在制造技术债。

## 何时用 / 何时不用

- 用：从零搭设计系统、把散乱的界面收敛成组件库、定义 Token 与主题、补组件状态矩阵、定响应式断点与栅格、做设计交付标注与像素级走查。
- 不用：品牌 VI / logo / 插画（`taste-brandkit`）；出界面图 / 概念图（`taste-imagegen-web`、`ui-mockups`）；只做视觉审美点评（`taste-director` 路由）；纯前端代码重构（走工程 skill）。

## 四条原则（都带可判定的数）

1. **组件库先于页面设计**：任何界面工作的第一步是建立或复用 Token 体系；页面里不允许出现系统外的颜色、字号、间距值。
2. **无障碍是设计基因**：正文对比度 ≥ 4.5:1（大文本 ≥ 3:1）；所有交互元素有清晰 focus ring；颜色不能是传达信息的唯一手段；标题层级、列表、按钮语义正确。
3. **像素级精准**：所有间距/尺寸/圆角是 8px 栅格的整数倍；文字基线对齐、图标垂直居中；边框 1px 不模糊、阴影不发灰；状态切换时尺寸位置不跳动。
4. **对开发者友好**：Token 用语义命名（`color-primary-500`，不是 `color-blue`）；props 克制、常用值为默认；每个组件有完整状态矩阵；交付附间距/字号/色值标注。

## Design Token：三级结构

```text
基础色 Primitive   gray-50..900 / blue-50..900（每色系 10 档，50 最浅）
      ↓
语义色 Semantic    primary / success / warning / danger / info
      ↓
组件色 Component   button-bg-primary / input-border-focus（只能引用语义色）
```

换主题只改语义色，组件色自动跟随；组件色直连基础色就等于把主题焊死。

| 维度 | 规范 |
|---|---|
| 字体族 | 中文 PingFang SC / 思源黑体；西文 Inter / SF Pro / Roboto；等宽 JetBrains Mono / SF Mono / Menlo |
| 字号阶梯 | 1.2 或 1.25 倍率，6–8 档：12 / 14 / 16 / 18 / 24 / 32px |
| 字重 | 400 / 500 / 600 / 700 |
| 行高 | 正文 1.5–1.6，标题 1.2–1.3 |
| 间距 | 4 / 8 / 12 / 16 / 24 / 32 / 48px（8px 基准） |
| 圆角 | 2（标签）/ 4（按钮输入）/ 8（卡片弹窗）/ 12–16（大面板）/ 999（胶囊） |
| 阴影 | sm 悬停、md 卡片下拉、lg 弹窗抽屉；用灰色半透明，不用纯黑 |

## 组件三层 + 状态矩阵

- **原子 Atoms**：Button、Input、Checkbox/Radio/Switch、Badge、Tag、Icon、Avatar —— 每个都要全状态。
- **分子 Molecules**：Form Item（Label + Input + Error）、Table Column、Card Header、Nav Item —— 封装重复组合。
- **模板 Templates**：Dashboard、表单页、列表页、详情页、空状态页 —— 保证同类页面布局一致。

状态矩阵（缺一个就是没做完）：`default` / `hover` / `active` / `focus` / `disabled` / `loading` / `error` / `success`。

组件 API 纪律：核心 props ≤ 8 个；最常用状态设为默认；同一概念全库同词（都用 `disabled`，不要混 `readonly`）；预留 `className`/`style`/`children` 透传；枚举值类型明确，不收任意字符串。

## 六步流程

```text
1 Token     定主色 → 生成 10 档色板 → 语义映射 → 字号阶梯/间距/圆角阴影 → 输出 JSON 或 CSS Variables
2 原子库    优先级 Button → Input → Checkbox/Radio/Switch → Badge/Tag → Icon → Avatar，逐个补全状态矩阵
3 分子库    识别重复组合 → 封装 props 与状态 → 与原子视觉语言一致 → 补使用场景
4 模板      定页面骨架 → 栅格与断点（mobile/tablet/desktop）→ 留出内容区域（空框）→ 提供变体
5 组装页面  从模板出发只用组件库；缺组件先回库补，再上页面；检查各断点表现
6 设计 QA   8px 对齐 / 对比度 ≥4.5:1 / 同类型组件间距圆角阴影一致 / 断点不崩不溢出 / 焦点顺序与语义标签
```

## 验收（交付前逐项过）

1. 页面里所有颜色、字号、间距都能对回 Token（没有硬编码值）。
2. 每个用到的组件都有完整状态矩阵，focus ring 可见。
3. 文本对比度 ≥ 4.5:1，大文本 ≥ 3:1。
4. 8px 栅格全对齐；同类型组件视觉参数一致。
5. 各断点布局不崩、不溢出；暗色模式颜色走语义映射而不是另起一套。

## 原始文档

`references/ui-design-system-source.md`（12.9 KB，逐字收录，v1.0.0 / 2026-11-10）：
核心原则、Token 体系（颜色/字体/间距/圆角阴影全表）、组件分层与状态矩阵、组件 API 原则、
六步设计流程、响应式断点与栅格、暗色模式映射、常见坑（设计系统类/视觉类/交付类）、适用边界、自检清单。

需要具体数值、示例与避坑细节时读原文；本 SKILL.md 只做路由与硬指标摘要。
