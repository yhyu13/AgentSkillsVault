---
name: bili-video-repack
description: |
  把一支 B 站视频重做成三件套：中文 PPT 课件、可播放的口播动效网页、导出的 MP4。
  Load this skill whenever the user pastes a b23.tv / bilibili.com / BV link together with a
  production request, including but not limited to: 「下载视频并做成 PPT」「转成口播视频」
  「重讲一遍」「拆成课件」「这个视频讲什么，给我一版 deck」「做一个讲解视频」「视频转网页」
  「bilibili 转课件」. Also trigger when a link comes with a numbered list of deliverables
  where one of them is a deck or a video.
  Do NOT use for: 只想下载视频/音频文件（用 bilibili-video-downloader）；只要字幕或逐字稿；
  已有成片只做剪辑或转码（用 ffmpeg）；YouTube / 抖音 / 小宇宙等其他站点；
  不涉及视频源、纯粹写 PPT 或做动画（用 pptx / motion-showreel）。
---

# Bili Video Repack

一支视频 → 一份课件（PPT）+ 一支中文口播动效片（HTML 可播 + MP4）。

## 先算清三件事，再动手

| 项 | 怎么定 | 依据 |
|---|---|---|
| 事实源 | 原片逐字稿，不是摘要 | 每个数字、引语都要能回到某一段 |
| 口播时长 | 字数 ÷ 5.0 字/秒 | MiniMax 中文女声 speed 1.0 实测 <u>5.08 字/秒</u>（733 字 → 144.35 秒） |
| 出片成本 | 帧数 × 0.14 秒 | 1920×1080 PNG，Playwright 单帧约 0.14 秒（无全屏纹理层） |

先把这三条报给用户，再开工。时长偏差超过 20% 要重新商量，不要偷偷加速口播。

## Scripts（先把整包复制进项目）

```powershell
# <本 skill 目录> 就是这个 SKILL.md 所在目录，可能在不同 harness 的 store 里，
# 例如 ~/.claude/skills/bili-video-repack 或 ~/.minimax/skills/bili-video-repack。
Copy-Item "<本 skill 目录>\scripts\*.py" "<slug>\scripts\"
```

必须比项目根低一层：脚本用 `ROOT = dirname(dirname(__file__))` 去找 `<slug>/reel/`，
就地留在 skill 目录里跑会找不到 timeline。

| 脚本 | 作用 | 依赖 |
|---|---|---|
| `fetch_bili.py` | b23.tv / BV → `source.mp4` + `source.m4a` + meta | curl / imageio-ffmpeg |
| `tts_narration.py` | `reel/narration.json` → 10 段 mp3 + 真实时长 | 同目录 `mcode_cli.py` |
| `build_audio.py` | 时间轴 + numpy BGM + 混音 → `timeline.json/.js` | numpy |
| `capture.py` | Playwright 逐帧截图（`--stills` / `--video`） | playwright + chromium |

`mcode_cli.py` 必须跟 `tts_narration.py` 同目录，否则第 4 步第一行就 ImportError。

## Procedure

1. **取源** — `python scripts/fetch_bili.py <url> -o source/`
   走 B 站公开 API + DASH，不需登录。yt-dlp 报 412 时更要用这条路。

2. **转写** — 切 ≤115 秒的 mp3 逐段送 `connector__matrix__listen_audio`：
   `ffmpeg -i source/source.m4a -vn -c:a libmp3lame -ar 16000 -ac 1 -b:a 48k -f segment -segment_time 115 chunk_%02d.mp3`
   - 返回体是 `{"code":0,"transcription":"..."}`：取文本认 `transcription` 这个键。
     按 `text` 取会拿到整段 JSON 字符串——本项目第一版就是这样把 7 段全存成了 JSON。
   - 本地文件先 `mcode-tools upload_temp_url` 换 HTTPS 地址，别直接传路径。

3. **写口播稿** — 10 段上下，每段 30–110 字，落到 `reel/narration.json`。
   中文稿由逐字稿改写，不是自由创作：原片没说的数字一个都不许出现；估计值要写清口径
   （"她的估计""不是统计数字"）。这一段决定成片可信度，比排版重要。

4. **合成口播** — `python scripts/tts_narration.py`
   一次 batch ≤10 段；拿 `node_id` 后走 `get-asset-url` 下载，不要自己拼 OSS 地址。
   脚本会把每段真实时长写进 `reel/audio/timings.json`——后面的画面全部以它为准。

5. **排时间轴** — `python scripts/build_audio.py`
   固定节奏 `LEAD_IN 1.4s / GAP 0.55s / TAIL 2.6s`，同时产出 `timeline.json` 与
   `timeline.js`，页面和音轨读同一张表才对得上。BGM 用 numpy 合成，人声在场时把 bed
   压到 0.55 倍，最后统一峰值归一。用 numpy 而不是外部音乐库：零依赖、可复现。

6. **做页面** — `index.html + motion.js + timeline.js`，四条硬规则：
   - 画面只由 `t` 决定：`renderAt(t)` 幂等，不用 `Math.random`/`Date.now`/rAF/CSS 动画。
     逐帧截图和后来自动播放走的是同一个函数，才不会"预览好看导出变形"。
   - 绝对像素定位在 1920×1080 舞台上，`fitStage()` 只做整体 scale。
   - 字体用系统已装的（微软雅黑 / 楷体 / Georgia），不引外链——离线渲染不会等字体。
   - 最后一幕的 `end` 延到 `TL.total`，并且跳过退场淡出；否则片尾 TAIL 的 2.6 秒整屏空白。
   - 第一幕的 `start` 设 0，不要等于 `seg.start`：`LEAD_IN` 那 1.4 秒是给标题的时间，
     直接照搬会得到 42 帧空屏开场（本项目实测）。
   - 舞台居中用 `position:absolute; left/top:50%` + `translate(-50%,-50%) scale(s)`；
     用 grid `place-items:center` 时 1920 宽的元素会被推到左上方并被裁掉一半。
   - 文字要 `white-space: pre-wrap`，`normal` 会把 `textContent` 里的 `\n` 吃掉。
   - 幕与幕之间把上一幕的退场延到下一幕开始（`end + gap`），中间才不会闪一下空纸。

7. **渲帧** — 先 `python scripts/capture.py --stills 6,40,90,150 --sheet` 自查，
   再 `--video`。**不要给舞台加全屏半透明纹理层**（噪点、网格、扫描线）：
   单帧从 0.14 秒涨到 0.43 秒，全片要多花 20 分钟。要纸感就烘进底色。

8. **合成** —
   `ffmpeg -y -framerate 30 -i frames/f_%05d.png -i audio/final.wav -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest out/final.mp4`

9. **做 PPT** — PptxGenJS，16 页以内，同一套色板 + 页眉 + 页码。
   `npm root -g` 里的 pptxgenjs 要显式指定：`$env:NODE_PATH = (npm root -g)`，
   否则 `require('pptxgenjs')` 直接失败。

10. **PPT 自查** — 用 python-pptx + PIL 把每页重绘成 PNG。
    随包已带实现：`scripts/render_pptx.py`（依赖 PIL + python-pptx，约 250 行）：
    `python scripts/render_pptx.py deck.pptx --out qa --width 1920 --sheet sheet.png`。
    它能抓住"卡片越出画布""正文压到注释""低对比度"——这些在 PowerPoint 里反而看不出来。

## Output contract

```
<slug>/
  source/    source.mp4  source.m4a  source.meta.json  transcript/transcript_clean.txt
  reel/      index.html  motion.js  timeline.js  timeline.json
             audio/{narration/*.mp3, timings.json, final.wav, final.mp3}
             frames/  out/final.mp4
  ppt/       <name>.pptx  qa/slide-*.png
  01-口播稿与分镜.md        章节表 + 分段口播稿 + 分镜要点 + 事实口径说明
```

交付时说清：PPT 路径、`reel/index.html`（双击即播）、`out/final.mp4` 的分辨率/帧率/时长，
以及审片里还没解决的问题。口播稿文档里注明事实来源（BV 号 + 逐字稿路径）。

## Failure handling

- **ASR 返回空或整段 JSON** → 先看是不是取了 `text`；应为 `transcription`。
- **TTS 有 `failed_items`** → 只重试失败项，别整批重发（重复生成）。
- **`-c:a aac` 写 mp3 报 -22 且输出 0 字节** → 编码器不支持，换 `-c:a libmp3lame`。
- **截图纯黑/空白** → `window.__ready` 没等到，或某幕 `renderAt` 抛错；先用 `--stills` 单点复现。
- **成片末尾黑屏** → 最后一幕没延到 `TL.total`，见第 6 步。
- **原片是外语** → 照做：逐字稿取事实，交付语言跟用户走（默认中文）。

## Examples

**Input**: `【b23.tv 短链】1. 下载视频并制作成 PPT 2. 制作口播 HTML 和 MP4`
**Output**: `ppt/调情力-让你的生活更美好.pptx`（16 页，含 QA 图）+ `reel/index.html`
（153.3 秒 / 30fps，可播放可拖动）+ `reel/out/final.mp4`（1920×1080，4599 帧）+
`01-口播稿与分镜.md`。口播 10 段共 733 字，实测 144.35 秒。

## Windows (win32) platform notes

- Python 叫 `python`，不是 `python3`；ffmpeg 用 `imageio_ffmpeg.get_ffmpeg_exe()` 取绝对路径。
- `mcode-tools` 是 `.cmd` 分发器，`subprocess.run([...])` 会 WinError 2；用 `shell=True` 包一层。
- 路径含中文时不要用 `npm --prefix`（它仍会去 cwd 找 package.json）；先 `Set-Location` 再装。
- "换目录 + 写文件"会被本地安全策略拦（`cd x; ... > log`）；日志一律用绝对路径。
- 控制台按 GBK 解码中文会乱码，文件本身没问题；用 `-Encoding UTF8` 读，或直接看文件。
