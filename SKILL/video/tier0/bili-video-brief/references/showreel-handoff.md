# 口播片交接

摘要和课件交付后，才决定要不要做片子。做的话按 motion-showreel 的规矩来：页面暴露确定性的 `window.renderAt(t)`，逐帧截图，ffmpeg 合成。

## 目录

```
<slug>/
  reel/narration.json     口播稿与音色
  reel/audio/narration/   逐段 mp3
  reel/audio/timings.json 真实时长（脚本写）
  reel/audio/final.wav    混音
  reel/timeline.json      时间轴（脚本写）
  reel/timeline.js        window.TIMELINE = {...}，页面直接读
  reel/index.html         舞台
  reel/motion.js          renderAt(t)
  reel/frames/            单帧 PNG（约 7 GB，出片后删）
  reel/out/final.mp4
```

## narration.json

```json
{
  "voice": "zh-CN-YunyangNeural",
  "rate": "+6%",
  "segments": [
    {"id": "s01", "chapter": "问题", "text": "……"}
  ]
}
```

- 10 到 17 段，每段 60 到 130 字。段是**论点**，不是句子：一段对应一个镜头能讲完的意思。
- 估时用**汉字/秒**：云扬 +6% 实测 3.4 到 3.9 汉字/秒（术语密的段落偏低）。写完先估总长，超过 5 分钟就砍段。
- 另一个常被引用的数是**字符/秒**（含拉丁与标点），同一支片子会高出近一倍（本片 3.71 对 6.53）。两个数不能混用，报告时写明口径。
- 复合词多、专名多的段落会读得慢，估时留 10% 余量。

## 时长公式

```
成片 = 口播总时长 + 1.4（开场） + 0.55 ×（段数 − 1） + 2.6（收尾）
```

`build_audio.py` 按这个公式排轴，`check_timeline.py` 校验它没有被手工改坏。实测差 20% 以上要改稿，不要加速语音。

## 页面契约

- `window.renderAt(t)` 幂等：只由 t 决定画面，不用 `Math.random`、`Date.now`、`requestAnimationFrame`、CSS 动画、定时器。
- 舞台 1920×1080，绝对定位；外层只做整体缩放（预览用 `translate(-50%,-50%) scale(s)`）。
- 字体只用系统已有的（微软雅黑、Consolas、宋体、Georgia），不联网加载。
- 每一段要有**一个看得见的变化**：数字增长、路径收束、卡片拆开、标题改写。不要一句配一张静止标题。
- 段与段交接不留空帧：第一段从 0 秒开始，上一段延伸到下一段的起点，最后一段延伸到全片结束。
- 深色块在淡入过程中会变成灰色（与纸色混合），所以「落位」要快，别让主角卡在半透明。

## 截图与出片

```bash
node scripts/shot.mjs "$PWD" 6 20 32 45        # 抽静帧（调 window.renderAt）
node scripts/render_video.mjs "$PWD" 0 2350    # 第 1 段帧 [start] [stop]
node scripts/render_video.mjs "$PWD" 2350 4700 # 第 2 段（可并行）
```

- 本机 Python 版 Playwright 的驱动是空的，用全局 npm Playwright：`export NODE_PATH=$(npm root -g)`，浏览器用 `%LOCALAPPDATA%\ms-playwright` 里已装的 Chromium。
- `render_video.mjs` 接受 `[start] [stop]`，改一个镜头只重渲那一段，别整片重来。
- 单进程约 0.4 到 1 秒一帧；两三个进程分段并行能压到 5 分钟内出全片。
- 合成用 `-crf 19 -pix_fmt yuv420p`，30 fps，音频 AAC 192k。出片后抽 0:03 / 1:02 / 2:13 / 结尾四帧看过。

## 声音

- 语音：edge-tts，中文用 `zh-CN-YunyangNeural`，rate 提到 +6% 更接近讲解节奏。实测 3.71 汉字/秒、6.53 字符/秒。
- 铺底：`build_audio.py` 用 numpy 合成，Am9–Fmaj7–Cmaj7–G6 循环，人声在场压到 0.55，另有 4 秒一次的低频脉冲。不要为了「高级感」加打击乐。
- 不叠加原片音频；摘要类视频不应该出现原片声音。

## 画面来源

摘要类视频**不复用原片画面**。所有图形、终端、图表都由代码画；数据只用逐字稿里出现的，示意值在口径表里标注。

## 验收

1. `check_timeline.py` 返回 0。
2. 每段中间抽一帧：没有文字溢出、压线、单位混用。
3. MP4 1920×1080、30 fps、时长与 `timeline.json` 的 `total` 差不超过一帧、有音轨。
4. 开场三秒内出现第一个变化；结尾没有戛然而止。
