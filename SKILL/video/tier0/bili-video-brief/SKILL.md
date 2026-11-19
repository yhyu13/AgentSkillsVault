---
name: bili-video-brief
description: 摘要优先：把一支讲解视频做成可核对的中文摘要（每条要点回溯到逐字稿时间戳）和一版能讲的课件，之后再按需交给 motion-showreel 出 HTS 口播片。用户给出 b23.tv、bilibili.com、BV 链接或本地视频，并要求「下载并总结」「这视频讲了什么」「要点要能对回原片」「做成带时间戳的课件」时使用。适用于：先把一支讲解视频的每条要点钉回逐字稿时间戳，再出摘要与课件。不用于：只要视频文件或逐字稿；要复用现成课件模板与三件套流水线（用 bili-talk-repack）；整门多集课程；YouTube、抖音等其他站点；已有成片只做剪辑。
version: "2026.11.17"
license: MIT
metadata:
  category: video
  outputs: summary, pptx, html, mp4, transcript
---

# 视频摘要与课件

一支 5 到 20 分钟的讲解视频，变成三样东西：**可核对的摘要**、**一版能讲的课件**、**可选的口播片**。顺序不能反：先把事实钉住，再谈画面。摘要错了，后面所有产物都是错的放大器。

「可核对」不是形容词：`check_summary.py` 会把摘要里每个时间戳和每个引语拿回逐字稿里查，查不到就失败。引语必须是原片连续说过的，转述不要加引号。

事实只来自逐字稿。讲者的比喻不当数据，讲者的自述不当事实，讲者的预判写明是预判。没有数字就不要造数字；示意图里的数字要标「示意」。

## 先报三件事

| 项 | 怎么定 |
|---|---|
| 原片 | 平台、BV 号、标题、时长、语言、有无官方字幕 |
| 深度 | 只要一页结论 / 要能讲的课件 / 还要口播片 |
| 交付范围 | 摘要 + 课件默认做；口播片按需做，不超过 5 分钟 |

深度和时长与素材量冲突时先问，不擅自把 40 分钟压成 3 分钟，也不把 6 分钟吹成 15 页废话。

## 和邻居的分工

| 你想要 | 用哪个 |
|---|---|
| 先要一份「讲了什么、哪些可信」的稿，之后可能要做片子 | 本技能（摘要优先） |
| 已经有课件模板和口播网页流水线，只差把片子做出来 | `bili-talk-repack` |
| 一整门多集网课要分集交付 | `course-repack` |
| 只想拿视频 / 字幕文件 | 直接 yt-dlp，不用技能 |

本技能不接管别人的模板：它产出摘要、课件和一条可选的、自己画的片子。用户明确说「照上次那套三件套再做一遍」时，转 `bili-talk-repack`。

## 0. 值不值得做

- 信息密度：纯带货、纯剪辑集锦、纯情绪 rant，不做，直接说「这支片子没有可核对的内容」。
- 站点：B 站可下；YouTube 用 yt-dlp 也行但要说明；抖音、小红书先问。
- 时长：超过 20 分钟先问是整片摘要还是只要前 N 分钟。摘要可以分章，口播仍控制在 3 到 5 分钟。
- 版权：摘要和课件是评论性使用；原文逐字稿不外发，画面不复用，配图自己画。

## 1. 取源

```bash
python scripts/fetch_bili.py "https://b23.tv/xxxx" -o source/
# -> source/source.mp4  source/source.m4a  source/source.meta.json
```

公开接口不需要登录，720P 视频加 AAC 音频足够做摘要和口播。没有 DASH 流就是登录墙，停下来说明，不要反复请求同一接口。

**先探字幕再转写**，有官方 CC 就省 20 分钟，而且更准：

```bash
yt-dlp --list-subs "https://www.bilibili.com/video/BVxxxxxxxxxx"
```

只列出 `danmaku` 说明没有字幕（游客态下 B 站字幕需要登录），按无字幕处理，不要假装有稿。

## 2. 转写与校正

中文口播用 faster-whisper，按 115 秒切块，一块一个进程，中断可从已完成块续跑：

```bash
ffmpeg -i source/source.mp4 -vn -ac 1 -ar 16000 -c:a pcm_s16le source/audio.wav
ffmpeg -i source/audio.wav -f segment -segment_time 115 -c copy source/transcript/chunk_%02d.wav
python scripts/transcribe_zh.py source/transcript/chunk_00.wav source/transcript/chunk_00.txt --threads 8
python scripts/merge_transcript.py source/transcript --chunk-seconds 115 -o source/transcript/asr_raw.txt
```

- `language="zh"` 钉死，不要自动检测：一段全是产品名的音频会让检测翻成英文。
- `initial_prompt` 带这一集的专名（产品名、命令名、缩写），能显著减少同音误写：`--prompt "术语：Herdr、PTY、tmux、Codex"` 或 `--prompt-file prompt.txt`。默认提示是中性的一句，不要用上一集的词表——模型会把提示里的词硬塞进听不清的地方。
- 每块时间戳加 `块号 × 115` 才是真实时间，`merge_transcript.py` 会做，并且拒绝非整段切分。
- 中文模型的典型错误：会话/绘画、伪终端/尾中端、Pane/Pain、Zellij/Xellite、遥测/摇测。这类错误只能人工校正，不要靠换更大的模型解决。

校正写成表，一条一条落账：

```json
{"from": "持久化绘画", "to": "持久化会话", "why": "session，不是画面"}
```

```bash
python scripts/apply_corrections.py source/transcript/asr_raw.txt corrections.json -o source/transcript/transcript_clean.txt
python scripts/check_transcript.py source/transcript/transcript_clean.txt --duration 562
```

`merge_transcript.py` 从文件名取块号，不靠排序下标：缺了 `chunk_03` 会直接报错，而不是让后面所有时间戳整体前移 115 秒。

`apply_corrections.py` 有一条规则匹配不到就报错退出：规则过期说明稿件变了，账本必须重读。`check_transcript.py` 查重叠、空行、覆盖到结尾、语言比例和过长的段落。

超过 15 秒的段落意味着模型丢了语气断点，时间戳只有段落级精度。读摘要没问题，做逐帧对齐前必须处理：要么用 `scripts/refine_segment.py` 只重转那一段并保留原文字，要么在摘要里说明时间戳精度。不要用字数比例去编时间戳。

## 3. 摘要

`01-摘要与口径.md` 固定五段，顺序不要改：

1. **一分钟版**：4 到 6 句，读完知道结论。
2. **分章要点**：每章一个小标题，要点后面带 `00:42` 这样的时间戳。
3. **关键概念表**：视频里出现的对象、状态、命令，一列名字一列含义。
4. **口径表**：每条重要说法的来源与强度（讲者自述 / 讲者判断 / 未核验）。
5. **未核验**：版本号、价格、命令是否仍可用。

写完后跑：

```bash
python scripts/check_summary.py 01-摘要与口径.md --transcript source/transcript/transcript_clean.txt --duration 562
```

它查五段结构（含关键概念表）、时间戳是否落在片长内、每章是否至少有一个时间戳，以及每个引语的**整句**能否在逐字稿里找到（只忽略标点，不忽略后半句）。

短引语（少于 6 个汉字）不参与比对，所以默认最多允许 3 条，超过就失败；确实需要更多时加 `--allow-short-quotes`，等于自己承认这些词没有证据价值。术语不要加引号，加了引号就应该是一句原话。

想先看它怎么工作，跑这个假视频样例：

```bash
python scripts/check_summary.py examples/demo/summary.md   --transcript examples/demo/transcript.txt --duration 60
```

硬规则见 `references/summary-contract.md`。最容易犯的三条：把比喻写成数据；把「作者说」写成「事实是」；把讲者的预判写成本文结论。

## 4. 课件

15 页以内，13.333×7.5，纸色加墨色加一个强调色。每页一个判断，标题就是结论；页面底部保留来源和页码；备注写时间戳与口径。

```bash
python scripts/check_deck.py decks/<name>.pptx --max-pages 16 --min-notes 0.8
python scripts/render_pptx.py decks/<name>.pptx --out decks/qa --sheet decks/qa/sheet.png
```

版式、字号、配色和常见的溢出问题见 `references/deck.md`。`render_pptx.py` 只是近似渲染，用来抓溢出和低对比，不能当 PowerPoint 验收；它报「possible text overflow」时必须真的去看那页。

## 5. 可选：口播片

摘要和课件交付后，才决定要不要做片子。用户说的 HTS 口播片就是这一类：HTML/Canvas 逐帧渲染的画面加上一条口播音轨，不是实拍，也不是录屏。做的话交给 motion-showreel 的管线：页面暴露 `window.renderAt(t)`（幂等）、30 fps、1920×1080、TTS 用真实时长排轴。

```bash
python scripts/tts_edge.py  <project>           # 读 reel/narration.json，写 reel/audio/timings.json
python scripts/build_audio.py <project>         # 铺底 + 混音 + 写 timeline.json / timeline.js
python scripts/report_numbers.py <project> --md # 时长、帧数、两种字速口径
python scripts/check_timeline.py reel/timeline.json
node scripts/shot.mjs "$PWD" 6 20 32            # 抽静帧自查
node scripts/render_video.mjs "$PWD" 0 2350     # 分段渲染，可多进程并行
ffmpeg -y -framerate 30 -i reel/frames/f_%05d.png -i reel/audio/final.wav \
  -c:v libx264 -crf 19 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest reel/out/final.mp4
```

字段、时长公式和交接契约见 `references/showreel-handoff.md`。两句硬话：**口播时长必须用合成后的真实音频算，不能用字数估**；**时间轴校验不过不许渲染整片**。

## 交付前检查

按顺序停下来，不要跳到下一个产物：

1. `source.meta.json` 有 BV、时长、字节数；音视频都能被 ffmpeg 读到。
2. `check_transcript.py` 返回 0；长段落已说明精度。
3. `check_summary.py` 返回 0（时间戳与引语都回溯成功）。
4. `check_deck.py` 返回 0；抽 3 页看过溢出和对比。
5. 字速按两种口径报：汉字/秒 3.2–4.2，字符/秒 5.5–7.0（`report_numbers.py` 直接给）。只报一个数时必须写明是哪种。`check_timeline.py` 返回 0。
6. 成片 1920×1080、30 fps、时长与时间轴差不超过一帧、音轨存在；开场、中段、结尾各抽一帧看过。
7. 交付里写明哪些数字是示意、哪些说法未核验。

## 这次实测

一次真实交付：562 秒中文原片 → 216 行逐字稿（93 条校正）→ 15 页课件 → 19 条引语整句回溯成功（终稿保留 13 条长引语） → 17 段口播、228.09 秒成片、6843 帧、3.71 汉字/秒。数字、耗时和踩过的坑见 `references/measured-run.md`；失败表见 `references/pitfalls.md`。

## 边界

- 不做整门多集课程（那是 course-repack 的活），不做已有成片剪辑。
- 不复用原片画面和音频；摘要类视频用自己画的图。
- 不替用户判断视频「好不好看」，只负责「讲了什么、哪些可信」。
- 讲者的商业立场要写明，但不要替观众下道德判断。
