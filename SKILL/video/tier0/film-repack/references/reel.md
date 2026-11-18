# 口播：稿子、时间轴与声音

成片的节奏由真实语音决定，不由估算的字数决定。这一份说明怎么写稿、怎么排时间、怎么让手机外放听得清。

## 写稿

- 一段 100–180 个汉字，对应 20–35 秒。太短会碎，太长会让画面停在同一个构图上。
- 每段配 3 条 `beats`：小标题 ≤10 字，解释 ≤24 字。它们是画面上的要点，不是稿子的复述。
- 稿子按「一章一个结论」写，不按原片顺序复述。原片可以倒叙，压缩版不行。
- 数字念法与总结一致：`12 万美元`、`3,900 美元`、`9,200 条笔记`。中文数字只用于年代（二零一二年）和约定俗成的说法（三周、八成）。
- 最后一段必须回到开头那个意象，让 7 分钟有收口。

`tts_segments.py` 会按字/秒检查每段：低于 3.4 说明太稀，观众会以为卡了；高于 6.8 说明塞满，听不清。改稿解决，不要改 `rate`。

## 时间轴怎么算

```
cursor = lead(1.6)
每段：audioStart = cursor，audioEnd = cursor + 真实时长；cursor = audioEnd + gap(0.5)
DUR = ceil((cursor - gap + tail(2.8)) * fps) / fps
```

- DUR 取整到帧，所以 `timeline.js` 和混音用的是同一个数。
- 段与段的 `start/end` 是中点对齐后的结果，画面切换发生在两段音频之间，不会切在字中间。
- 超过 1200 秒直接失败：这是渲染器的上限，也是「这已经不是压缩版」的信号。

## 混音

- 人声优先：床垫在说话时压到 0.55 倍，结束后 0.25 秒淡回。
- 床垫是 numpy 合成的四和弦循环（Am9–Fmaj7–Cmaj7–G6）+ 55 Hz 心跳，没有外部素材，不存在授权问题。
- 峰值归一到 0.92 之后，按 RMS 提升到约 -21 dBFS，再用 `tanh` 软限幅。TTS 语音很尖，只做峰值归一会让整片比别的视频小 5 dB。
- 验收看 `qa_reel.py` 的每段 `mean_db`：低于 -55 dB 就是那一段没人声。

## 画面契约

`index.html` + `stage.js` 必须提供：

```js
window.DUR = 411.433;          // 秒，来自 timeline.js
window.render = (t) => {...};  // 任意 t 都能单独渲染，不读音频状态
window.READY = true;           // 字体与资源就绪
```

`stage.js` 里已有：章节标题、三条要点（按段内时间依次出现）、原片静帧（右侧 520×293，双色调 + 缓慢推近）、字幕（自动降到 27/24px 以免截断）、章节轨道、进度条、每章开头的擦除转场。

静帧来自 `build_timeline.py` 复制进 `reel/stills/` 并在 `timeline.js` 里导出 `STILLS`；页面等图片加载完才置 `window.READY`，所以渲染器不会截到半张图。换风格时保留 `tokens()/wrap()` 的换行逻辑——它保证 `SpaceX` 不会被拆成 `Spac / eX`。

## 时间码是范围

一个章节可以覆盖原片十分钟（压缩比就是这么来的），`timecode` 写的是这个范围。屏幕上的静帧只代表"这一段长这样"，不是十分钟的证据；需要单点证据时，把具体秒数写进要点文案，像 `31:04 拒绝补贴` 那样。

## 渲染与合成

先把模板放进去：`cp "$SKILL/assets/reel/index.html" "$SKILL/assets/reel/stage.js" reel/`。

```bash
node ~/.agents/skills/motion-showreel/scripts/render.mjs reel \
  --fps 30 --size 1920x1080 --out reel/out/video.mp4 --workers 6
python "$SKILL/scripts/mux_audio.py" --project .
```

1920×1080、30fps、12343 帧，6 进程约 7 分钟。想更快可以降到 `--workers 8`，但同一台机器上再开别的重活会一起变慢。

渲染器自带的 `--audio` 在当前 ffmpeg 上会把帧数算多 2 帧并拒绝发布，所以拆成「先画面、后合成」两步；这也是改混音时不必重渲画面的原因。
