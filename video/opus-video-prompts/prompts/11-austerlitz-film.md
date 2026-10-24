# 奥斯特里茨战役历史电影（4 到 5 分钟）

- **作者**：Winter (@WinterArc2125)
- **原帖 / 来源**：https://x.com/WinterArc2125/status/2103116689944502720
- **分组**：2.2 带结构的讲解与营销片模板

## 说明

附了几幅战争油画作为视觉参考。开源仓库：[Battle-of-Austerlitz-Film](https://github.com/WinterArc21/Battle-of-Austerlitz-Film)，包含 WebGL 渲染器、地形数据、Kokoro 旁白、合成音效，以及 Chromium 到 FFmpeg 的渲染流程。

## 提示词（提示词原文）

```text
Create a 4–5 minute cinematic video about the Battle of Austerlitz (1805), built entirely in code.

Research the battle thoroughly and decide for yourself how to tell the story, structure the pacing, explain the strategy, and visualize the events. I want it to be historically accurate, dramatic, easy to understand, and visually exceptional.

Use the attached paintings as visual inspiration, not a strict style requirement. I love their scale, atmosphere, smoke, dramatic skies, cavalry, massed formations, landscape, and sense of chaos. Find a way to translate that feeling into code — but if you can invent a stronger visual language, do it.

Don't make it feel like a generic infographic or strategy game. It should feel like a cinematic historical film that happens to be rendered with code.

You have complete creative control. Surprise me.
```

## 怎么测

1. 在 Claude Code 里新建一个空目录，模型选 Opus 5.5，effort 建议 high 或更高。
2. 粘贴上面的提示词，替换方括号或 `<inputs>` 里要你填的内容。
3. 本机准备好 Node、Chrome 和 FFmpeg，让它自己渲染成 MP4。只在网页对话里跑的话，可以预览 HTML 后录屏。

> 提示词版权归原作者所有，转载请保留作者与原帖链接。
