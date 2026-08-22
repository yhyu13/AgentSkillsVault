# 知乎专栏粘贴说明

知乎不渲染 mermaid，也不显示 SVG。本文配图已是 PNG，按顺序在编辑器里上传后，再贴正文。

## 标题

让 Agent 盯住一个目标连跑几天，不要去改主循环

## 导语（30–40 字，可作开头摘要）

给 Agent 加长期目标，不要改 loop、不要写进提示词。DeepSeek Harness 的做法是：状态可回放，权限必须重授。

## 配图上传顺序

1. `images/02-tree.png` — 根 / 主干 / 四根分支
2. `images/01-architecture.png` — 四个插件与数据流
3. `images/03-two-dimensions.png` — phase 正交于 activation
4. `images/04-authority.png` — 运行时三层权限
5. `images/05-round-loop.png` — 一次一续 + 反漂移

正文里的 `![…](images/….png)` 粘贴后不会自动带上本地文件；在对应位置插入刚上传的图即可。

## 标签建议

Agent、LLM、系统设计、开源
