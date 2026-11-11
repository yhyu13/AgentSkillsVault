# App 宣传片（Remotion，第 1 支）

- **作者**：Danny Stuart
- **原帖 / 来源**：https://dannystuart.substack.com/p/claude-code-opus-remotion-agentic-promo-video
- **分组**：2.3 SaaS/产品宣传片

## 说明

每支大约 10 分钟。作者的经验：先出分镜再写代码，之后可以针对单个镜头修改；描述质量时，给参考视频比堆形容词有效；用“dramatic cuts”“orbiting camera”这类镜头语言。草稿阶段关掉动态模糊、用半分辨率，或直接在 Remotion Studio 里拖动预览。

## 提示词（提示词原文（博客中有省略号））

```text
I want you to create a promotional video in an app/saas style. It will be to promote a fictional app that helps designers have a visual tool to manage Git... It must be 10-15 seconds long. Use dramatic cuts and kinetic typography. Dynamic apple style video... Light style/theme... Storyboard the video and plan carefully before coding anything.
```

## 怎么测

1. 在 Claude Code 里新建一个空目录，模型选 Opus 5.5，effort 建议 high 或更高。
2. 粘贴上面的提示词，替换方括号或 `<inputs>` 里要你填的内容。
3. 本机准备好 Node、Chrome 和 FFmpeg，让它自己渲染成 MP4。只在网页对话里跑的话，可以预览 HTML 后录屏。

> 提示词版权归原作者所有，转载请保留作者与原帖链接。
