---
name: film-repack
description: 适用于把一支 30 分钟以上的纪录片、访谈或长演讲（B 站 b23.tv/BV、YouTube、本地 MP4，含英文等非中文原声）重做成三件套：带原片时间码的逐字稿、可核对的中文压缩总结、带原片静帧的 PPTX 课件，以及用 motion-showreel 渲染的 1920×1080 口播 MP4。触发场景：用户说「下载这个视频并总结」「做成 PPT」「做成口播成片 / HTS MP4」，或直接贴链接加片长。不用于中文讲解短视频的一条命令成片（用 video-to-deck-reel）、多集课程（course-repack）、只要下载文件、已有成片只做剪辑。
version: 2026.11.17
license: MIT
---

# Film Repack — 长片重讲三件套

一支 30–120 分钟的片子，人不会看第二遍。这个 Skill 把它压成能核对的总结、能讲的课件、能听的成片，并且让每一个数字都能回到原片的那一秒。

它不生产观点，只做压缩与搬运：原片说什么，总结就说什么；原片没说的，不补。

## 什么时候用，什么时候别用

| 情况 | 用这个？ |
|---|---|
| 一支 ≥20 分钟的纪录片 / 访谈 / 长演讲，要总结 + 课件 + 口播成片 | ✅ |
| 用户贴 b23.tv、BV、YouTube 链接并说「下载、总结、做成 PPT」 | ✅ |
| 只要一句话摘要，或片子 ≤5 分钟 | ❌ 直接读、直接答，流水线比片子还长 |
| 中文讲解视频（十几分钟），只想一条命令出课件 + 成片 | ❌ 用 video-to-deck-reel；它不接受英文源，也只有一个大命令 |
| 多集课程（一整个合集） | ❌ 用 course-repack |
| 只要口播网页或只要 MP4、不做课件 | ❌ 用 bili-talk-showreel 或 motion-showreel |
| 已有成片，只做剪辑、转码、加字幕 | ❌ 用 ffmpeg / 剪辑工具 |
| 自制教学视频（自己写稿、自己出画） | ❌ 用 video-production |

相邻 Skill 的分界只有一句：**本 Skill 的输入是一支已经存在的长片，输出必须同时包含逐字稿、课件和成片**。少一件就换 Skill，不要在这里减配。

与 `video-to-deck-reel` 的区别要在选之前就判断清楚：那一个是中文讲解视频的一条命令流水线（`pipeline.py`，两个 OCR/ASR 引擎切换），它的语种闸门是「不是中文就停」；本 Skill 面向英文或其他语种的长纪录片，多出逐字证据链、原片静帧和课件同源镜像验收。**中文片子别在这里绕一圈**，英文片子也别发给它——它会在第一步拒绝。

## 三条硬规则

1. **数字必须有出处。** 总结、口播、课件里的每个数字，都能在 `source/transcript.txt` 找到对应时间码。原片说「他估计」，总结就写「讲者估计」；不说「研究表明」。
2. **不把听不清补顺。** 逐字稿是证据，不是文章。专名拼错可以按上下文校正并在 `notes/` 标注，但不能把没听到的话写成听到的。
3. **交付前必须有机器读过的证据。** 课件要过溢出检查，成片要过时长/音轨/静音检查。没有 `deck/qa/report.json` 和 `reel/qa/report.json`，就不能说「做完了」。

## 产物

```
<project>/
  source/source.mp4  source.json  audio16k.wav  chunks/  asr/<lang>/  transcript.txt
  source/stills/*.jpg  source/stills.json      # 每章一帧，课件和成片都用它
  notes/中文总结.md                  # 带 [mm:ss] 的压缩总结
  deck/deck.json  <slug>.pptx  build-report.json  qa/slide-*.png  qa/img/  qa/report.json
  reel/narration.json  timeline.js  index.html  stage.js
  reel/audio/narration/*.mp3  timings.json  final.wav  final.mp3  reel/stills/
  reel/out/video.mp4  final.mp4  reel/qa/report.json  reel/qa/stills/
```

## 流程

七步，每步都有命令和通过线。不要跳步：后面的检查依赖前面的记录。

### 0 环境

```bash
SKILL="<film-repack 技能所在目录>"       # 脚本都在这里；项目目录只放产物
MOTION="<motion-showreel 技能所在目录>"   # 先装好 motion-showreel，再把它的目录填这里
python -c "import faster_whisper, edge_tts, pptx, playwright, numpy; print('py ok')"
ffmpeg -version >/dev/null && ffprobe -version >/dev/null && echo "ff ok"
yt-dlp --version && node -e "console.log(process.version)"
sh "$MOTION/scripts/setup.sh"           # 首次，装 Playwright Chromium
```

后面所有命令里的 `$SKILL` 都指这个目录，`--project .` 指当前项目。两者不是一回事：脚本常驻技能里，产物留在项目里。

缺 `yt-dlp` 时不要改成手写 playurl 请求：B 站的 WBI 签名按发布变化，脚本会先坏在签名上。

### 1 取源，并把清晰度记成事实

```bash
python "$SKILL/scripts/fetch_source.py" --url "https://b23.tv/xxxx" --project . --max-height 720
```

B 站经常「标称 720p、实发 480p」。`source.json` 同时记 `requested_max_height` 和 `actual{width,height,fps}`，交付时引用 `actual`。多 P 视频会被拒绝：那是课程，不是一支片子。

通过线：`source.json` 存在，`actual.height` 与声明值一致或有明确差异记录。

### 2 切块 + 转写

```bash
python "$SKILL/scripts/chunk_audio.py" --project . --span 110
python "$SKILL/scripts/asr_chunks.py" --project . --lang en --model small --jobs 4 --threads 6
python "$SKILL/scripts/merge_transcript.py" --project . --lang en
python "$SKILL/scripts/check_transcript.py" --project . --lang en
```

`asr_chunks.py` 用 `wave` 解码，不经过 faster-whisper 的 PyAV 路径（1.2.x 与新版 PyAV 不兼容，会一行都转不出来）。中断后重跑只补没完成的块。

通过线是 `check_transcript.py` 的 `PASS`：块数齐全、最长空档 ≤25 秒、语速在 90–240 词/分、没有连续重复行、语言概率 ≥0.60。任何一条失败，按提示重跑那一块（`--only 7 --model medium`），不要把缺口留在稿子里。

### 3 写总结与口径

读 `source/transcript.txt`，写 `notes/中文总结.md`：结论在前，分节，每个数字后面跟 `[mm:ss]`。这一步不调用脚本，但它决定后面两件产物对不对。

通过线：随便抽 5 个数字，都能在逐字稿里找到原句。

### 3b 每章取一帧

```bash
python "$SKILL/scripts/grab_stills.py" --project .
```

按 `narration.json` 的每章时间码取中点，写 `source/stills/<id>.jpg` 和清单。没有这一帧，19 页课件和 15 个镜头就是同一张排版模板换文字——纪录片看不到原片画面，是最容易被一眼看穿的偷懒。默认裁掉顶部 10%（上传者水印带）。

通过线：`stills 15/15`。少一两帧可以继续（页面会退回纯文字），整批失败要先查 `source.mp4` 能不能播。

### 4 课件

```bash
python "$SKILL/scripts/build_deck.py" --project .      # deck.json -> .pptx + 备注里的时间码
python "$SKILL/scripts/render_deck.py" --project .     # 同源 HTML 镜像 -> 溢出/对比度 + 每页 PNG
```

`render_deck.py` 用 `deckkit.py` 的同一套几何去画镜像，所以框的位置、字号、行距和 pptx 一致；它抓的是文字溢出框、标题折成五行、灰底灰字这类人一眼就看见的问题。它不是 PowerPoint 渲染，报告里写明了这一点。

通过线：`PASS deck render check`，且 `deck/qa/report.json` 的 `slides[].overflow` 全为空。

### 5 口播稿、语音、时间轴

先写 `reel/narration.json`（人写的，不代写）：

```json
{"voice": "zh-CN-YunyangNeural", "rate": "+0%", "segments": [
  {"id": "s01", "chapter": "章节标题", "timecode": "00:02–00:58",
   "text": "这一段要念出来的话。", "beats": [["小标题", "一句解释"]]}]}
```

```bash
cp "$SKILL/assets/reel/index.html" "$SKILL/assets/reel/stage.js" reel/   # 渲染页模板，必须放进项目
python "$SKILL/scripts/tts_segments.py" --project .
python "$SKILL/scripts/build_timeline.py" --project . --title "片名" --source "BVxxx · 原片 51:11"
```

`reel/index.html` 与 `reel/stage.js` 是渲染页；`timeline.js` 由 `build_timeline.py` 写进同一个目录。三个文件缺一个，`render.mjs` 会在 `window.DUR` 上报错。

时间轴只认 `timings.json` 里的真实时长，DUR 向上取整到整帧，因此画面和声音不会因为字数估算而错位。`tts_segments.py` 会检查每段字速（默认 3.4–6.8 字/秒）：太快说明稿子塞太满，改稿，不要加变速。

通过线：`timings.json` 无 `incomplete`；`build_timeline.py` 打印的 `mix rms` 在 -23 到 -19 dBFS 之间。

### 6 渲染与合成

```bash
node "$MOTION/scripts/render.mjs" reel \
  --fps 30 --size 1920x1080 --out reel/out/video.mp4 --workers 6
python "$SKILL/scripts/mux_audio.py" --project .
```

先出无声画面再合成：`render.mjs` 自带的 `--audio` 在 ffmpeg 7.x 上会把自己的帧数校验算多 2 帧而拒绝发布，文件本身是对的；拆成两步还能在改混音时不必重渲一万帧。

通过线：`mux_audio.py` 打印的时长与 `timeline.json` 的 DUR 相差不超过 2 帧，且 `audio=yes`。

### 7 验收

```bash
python "$SKILL/scripts/qa_reel.py" --project .
python "$SKILL/scripts/selfcheck.py" --project .
```

`qa_reel.py` 只读成品文件，不信渲染器：尺寸、帧率、总时长、音轨、每段是否有人声、黑帧总量，最后按章节中点导出一张静帧。`selfcheck.py` 检查产物与记录是否齐全（逐字稿行数、课件页数、`report.json` 的 `passed`）。

通过线：两个脚本都 `PASS`。任一失败，报告里写着具体是哪一段、差多少，按提示回上一步。

## 失败与下一步

| 现象 | 原因 | 下一步 |
|---|---|---|
| `output has N frames, expected M` | render.mjs 边渲染边混音时的帧数校验 | 去掉 `--audio` 重渲画面，再跑 `mux_audio.py` |
| 逐字稿某段为空 | 该块是音乐、静音，或模型在长静音上失效 | `asr_chunks.py --only <n> --model medium` 重跑该块 |
| 语速 >240 词/分、出现重复句 | whisper 在循环 | 同一块用 `medium` 重跑；仍循环就降 `--span` 到 60 秒 |
| `check_transcript.py` 报语言概率 <0.6 | `--lang` 给错 | 改对语言重跑；不要把英文片按中文转写 |
| 课件 `overflow` 非空 | 文案超框 | 删字或拆页，改 `deck.json` 后重跑两步 |
| TTS 某段 4xx/超时 | 网络或音色不可用 | 已完成的段有缓存，重跑同一条命令即可；换 `--voice` 会重做相关段 |
| 成片某段静音 | 该段音频没生成或时间轴错位 | 看 `qa_reel.py` 报的 shot id，回到 `timings.json` 确认该段时长 |

## 已知边界

- **CPU 转写是主要成本。** 51 分钟英文片，`small` + 4 进程实测约 7 分钟（6 进程约 5 分钟）；`medium` 大约 3 倍。片长 2 小时请先评估时间，或改用带 GPU 的机器。
- **`render_deck.py` 是镜像，不是 PowerPoint。** 字体缺失、复杂表格、SmartArt 不在检查范围内；这类版式请另外用真机打开看。
- **口播音色依赖网络 TTS。** 私有化环境请把 `tts_segments.py` 换成自己的合成器，但必须继续写真实时长到 `timings.json`，否则时间轴会错位。
- **原片自带烧录字幕时，静帧上会有原片字幕。** 这是原片的一部分，不擦除；如果客户不接受，换帧或换裁切比例。
- **静帧和逐字稿是他人作品的衍生内容。** 裁掉顶部水印带只是为了版式干净，不改变归属。产出给自己看、内部培训或已获授权时可以直接用；要公开发布 `final.mp4` 或课件，先确认你持有原片的授权，并在成片或说明里写明片名与上传者。这条不能靠脚本检查，只能靠交付的人。
- **章节时间码是范围，不是单点证据。** 一个 10 分钟的章节配一帧只说明"这一段长这样"；具体数字的证据在要点文案和 `notes/` 里各自的秒数。
- **它不判断内容对不对。** `qa_reel.py` 证明「文件就是时间轴说的那样」，不证明「讲得对」。语义核对只能靠人读 `notes/中文总结.md`。

## 与 motion-showreel 的契约

`reel/index.html` 必须暴露 `window.DUR`、`window.render(t)`、`window.READY`；`timeline.js` 由 `build_timeline.py` 生成，不要手改。画面只读时间，不读音频状态，所以任何一帧都能单独重渲——这也是能分段渲染、能改一段不重跑全片的前提。

风格可以换：`stage.js` 是最小实现（章节标题 + 三条要点 + 字幕 + 进度），换掉它不影响流水线，只要保持同一个 `render(t)` 契约。
