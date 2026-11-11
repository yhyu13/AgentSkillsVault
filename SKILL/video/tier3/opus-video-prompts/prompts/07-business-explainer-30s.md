# 30 秒企业讲解片模板

- **作者**：Alex Prompter (@alex_prompter)
- **原帖 / 来源**：https://x.com/alex_prompter/status/2103499977632997524
- **分组**：2.2 带结构的讲解与营销片模板

## 说明

作者建议：Claude 会在对话里直接播放，录屏即得视频；之后一次只提一条修改意见，例如“慢一点”“更有活力”“加一个讲价格的场景”。

## 提示词（提示词原文）

```text
Adopt the role of an expert motion designer. Build a 30-second animated explainer for my business as a single HTML page. 5 scenes. The customer's problem, what I do, how it works in 3 steps, one proof point, and my name at the end. Bold text, smooth transitions, my brand colours. My business [DESCRIBE WHAT YOU SELL, WHO IT'S FOR AND YOUR COLOURS]
```

## 怎么测

1. 在 Claude Code 里新建一个空目录，模型选 Opus 5.5，effort 建议 high 或更高。
2. 粘贴上面的提示词，替换方括号或 `<inputs>` 里要你填的内容。
3. 本机准备好 Node、Chrome 和 FFmpeg，让它自己渲染成 MP4。只在网页对话里跑的话，可以预览 HTML 后录屏。

> 提示词版权归原作者所有，转载请保留作者与原帖链接。
