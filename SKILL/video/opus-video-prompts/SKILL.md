---
name: opus-video-prompts
description: Ready-made prompts for "code-rendered video" work (Opus 5.5 用代码拍视频) — 18 battle-tested prompts covering motion graphics, hand-drawn/ink animation, science explainers, product launch films, lyric videos, UI morph loops and pixel-art, plus 54 public case links and the hard-won writing lessons. Trigger on "video prompt", "motion graphics video", "科普视频", "产品发布片", "歌词 MV", "生成视频提示词", or when choosing a technical route (Canvas / p5.js / Three.js / Remotion / Manim / Blender).
metadata:
  version: 1.0.0
  origin: repo (vendored) — github.com/joeseesun/opus-video-prompts @ 7977c807781d4ba7c235247b8899a72575a30d00
  wrapper: local (SKILL.md 是本 vault 写的指针层；prompts/ + cases.json + README.md 是上游原文)
---

# Opus 5.5 Video Prompts

18 份可直接复制的提示词 + 54 个公开案例 + 9 条技术路线。模型不直接输出视频：它写代码画出每一帧
（Canvas / p5.js / Three.js / Remotion / Manim / Blender 脚本），无头浏览器逐帧截图，FFmpeg 合成 MP4。

## 怎么用

1. 先看 `README.md` 的「写法经验」与「案例总览」——决定走哪条技术路线（动态图形 / 手绘线稿 / 科普讲解 / 产品发布片 / 歌词 MV）。
2. 从 `prompts/` 里挑一条最接近的，复制原文再改：
   - `prompts/01-inference-startup-launch.md`（现代发布片）
   - `prompts/05-transformer-explainer-js.md`（技术科普）
   - `prompts/10-talking-head-to-lineart.md`（口播转线稿）
   - `prompts/15-ui-morph-loop.md`（UI 形变循环）
   - `prompts/16-high-end-product-video.md`（高端产品片）
   - `prompts/17-pixel-wizard.md`（像素风）
   - `prompts/18-prehistoric-island-threejs.md`（Three.js 场景）
3. `cases.json` 是 54 个公开案例的索引（作者 + 链接 + 用到的路线），用来佐证某条路线被验证过。

## 边界

- 提示词是**给模型用的**，不是给用户看的方案；交付前要自己跑渲染并逐帧检查。
- 写实真人镜头不在本集范围（要写实得改调 Seedance / Runway / Higgsfield 这类视频模型）。
- 需要本机 Node.js + Chrome + FFmpeg；渲染链路与本 vault 的 `hyperframes-video` / `remotion-to-hyperframes` 重叠时，先按那两条 skill 的判据选引擎。

## 出处

- 上游：`github.com/joeseesun/opus-video-prompts`（README 声明「只收作者本人公开的提示词原文」）。
- 镜像仓库 `github.com/Reger-c/opus5.5-video-prompts` 与之**同一 commit**（7977c80），内容逐字节相同，不重复安装。
