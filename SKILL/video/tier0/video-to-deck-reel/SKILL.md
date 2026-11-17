---
name: video-to-deck-reel
description: 把一支中文讲解视频做成中文课件、可播放的画布口播网页和 1920×1080 MP4，一条命令跑完取源、转写、口播、时间轴、逐帧渲染、合成与查错。Use when 用户给 b23.tv / bilibili.com / BV 链接或本地视频，并要求「下载并总结」「做成 PPT」「做成口播视频」「用 motion showreel 出片」，或要求从一支片子同时交付课件和成片。不用于：只要视频文件或逐字稿；整门多集课程；已有成片只做剪辑；YouTube / 抖音等其他站点。
version: "2026.11.17"
license: MIT
metadata:
  category: video
  outputs: pptx, html, mp4, transcript
  entry: scripts/pipeline.py
  verified_on: windows / python 3.13 / node 22 / faster-whisper large-v3
---

# Video → Deck → Reel

一支讲解视频进来，三件东西出去：一份课件、一个可播放的画布网页、一支 1920×1080 的 MP4。
四条机械闸门把关：逐字稿、口播稿、帧序列、课件。中文无字幕源走 funasr 换道；这台机器没有
PowerPoint / LibreOffice，所以课件预览从 pptx 真实几何生成，再截图看。

不是所有环节都能自动化。写口播稿、写课件文案、看预览图判断风格，这三步要人（或模型）做判断；
其余步骤一条命令跑完，失败时打印它执行过的命令，不打印“重试”。

## 先报三个数，再动手

| 项 | 算法 | 本次实测 |
|---|---|---|
| 原片 | `source.meta.json` 里的时长与分辨率 | BV1VNes61EvX，522 秒，852×480 |
| 转写 | 每 115 秒一段，`large-v3`，语言概率 < 0.50 直接停 | 5 段 206 行 2897 字，p=1.000 |
| 口播 | 汉字数 ÷ 5.0 字/秒 先估算，合成后用实测替换 | 929 字 → 实测 213.01 秒，4.36 字/秒 |
| 成片 | 1.4 + Σ段长 + 0.55×间隔 + 2.6 | 223.06 秒，6692 帧，19.7 MB |

估算与实测相差超过 20% 时改稿，不改语速。`4.36 字/秒` 是 edge-tts `zh-CN-YunyangNeural`
在这台机器上的速度，换声音、换机器都要重新实测，不要把 4.36 当常数。

字速落在 4.1–4.4 之间是这一类稿子的常态。帧成本取决于画布复杂度：纯矢量 0.05–0.08 秒/帧，
带全屏纹理按 0.14 秒留余量。**这些数字只来自一次交付**，换题材要重测。

## 一条命令

```bash
python scripts/pipeline.py <project> --url https://b23.tv/xxxx --to asr
python scripts/pipeline.py <project> --file D:/clips/talk.mp4 --to asr   # 本地视频
# whisper 起不来时（av/torch 不匹配）换道，其余阶段不变；
# funasr 没有语言头，只用于已确认是中文的片子
python scripts/pipeline.py <project> --engine funasr --stage asr
# 人写 reel/narration.json、ppt/deck.json、ppt/theme.json，再把模板复制成 reel/index.html
python scripts/pipeline.py <project>
```

阶段顺序：`fetch → asr → narration → tts → timeline → frames → video → deck → verify`。
`--only tts,timeline` 只跑指定阶段，`--stage video` 只跑一个，`--list` 打印顺序。

幂等到什么程度，写清楚：

| 阶段 | 重跑时 |
|---|---|
| `fetch` | 已有 `source.mp4` 就跳过；要换源先删 `source/` |
| `asr` | 逐段跳过已完成的 `chunk_NN.txt`，只补缺段 |
| `tts` | 默认重合成全部 12 段；只改了几段就用 `tts_edge.py --only s03,s07` |
| `frames` | 校验 `reel/frames/.render_manifest.json`（timeline.json 与 index.html 的 sha1 + fps/尺寸/总帧数）：变了就清空重渲，没变就复用 |
| `video` | 总是重新编码（几秒到几十秒，值得重做） |
| `deck` | 总是重建 pptx 与预览（pptxgenjs 很快） |

`asr` 之前停下来的那条命令（`--to asr`）不会碰口播稿；`narration` 阶段要求
`reel/narration.json` 已经存在。缺文件时它会打印“先写口播稿”并以 **退出码 4** 结束整条
命令，不会打印完继续往下跑、也不会替你编一份。

`fetch` 走公开接口，不需要登录。返回没有 DASH 流就是登录墙，脚本停下并说明；
分辨率上限约 480p，这限制的是原片，不限制重建成片。

## 两种转写引擎

| 引擎 | 用法 | 本次 522 秒原片实测 | 专名表现 |
|---|---|---|---|
| faster-whisper `large-v3` | 默认，`--model large-v3` | 约 25 分钟（单进程 32 核，115 秒一段） | 好：Seedance / Codex / Blender / GPT-6 Astra |
| FunASR `paraformer-zh` | `--engine funasr` | 约 3 分 20 秒（RTF 0.05） | 差：`c dance`、`白魔`、`移镜`、`二点五七二零 p` |

两条路的语言保证不一样，别混：

- whisper 不指定语言，让模型自己判，判出来不是中文或概率 < 0.50 就拒绝写文件。
  这是真的语言检测。
- funasr 是中文专用模型，**没有语言头**。脚本只能检查输出的 CJK 占比（< 50% 拒绝），
  这拦的是“输出成了英文/乱码”，**拦不住非中文源**：给它一段英文，它也可能整段写成中文，
  CJK 占比接近 1.0，门照放。所以 funasr 只用于你已确认是中文的片子；换了语种先跑 whisper。

建议：用 funasr 先出 30 秒草稿，确认片子讲了什么；交付用 large-v3 重跑。
不要用 funasr 的稿子做口播稿的数字依据——专名与数量都可能塌。

## 四个闸门

| 闸门 | 命令 | 拦什么 |
|---|---|---|
| 逐字稿 | `scripts/transcribe_zh.py` | whisper：语言不是 zh 或概率 < 0.50 不落盘；funasr：只查长度与输出 CJK 占比（< 50% 拒），语种要人确认 |
| 口播稿 | `scripts/check_narration.py` | 逐字稿为空/无时间码、数字不在逐字稿（含 chapter/metric）、绝对化判断没口径、段长或段数越界、时间轴与稿不一致 |
| 帧序列 | `scripts/check_frames.py` | 空白帧、整片静止、逐段几乎不动（传 `--timeline`）、尺寸不对、帧数不足、帧名不连续 |
| 课件 | `scripts/check_deck.py` | 页数、备注缺时间、时间码越界、形状越界、字号过小、估计溢出、数字不在逐字稿（传 `--transcript`） |

`check_narration.py --selftest` 是一正六负：数字、绝对化、小数、时间轴不一致、空逐字稿、缺 id，
另有数词归一的断言。退出码 0 才算检查器本身可用：

```bash
python scripts/check_narration.py --selftest     # 期望 SELFTEST PASS
python scripts/check_narration.py reel/narration.json source/transcript/transcript_clean.txt
python scripts/check_narration.py reel/narration.json source/transcript/transcript_clean.txt reel/timeline.json
```

## 分工与文件

```text
<project>/
  source/source.mp4              原片
  source/source.meta.json        bvid、标题、时长、分辨率、流信息
  source/transcript/chunk_NN.txt 分段转写（可断点续跑）
  source/transcript/transcript_clean.txt
  reel/narration.json            口播稿 + 每段的画面元数据
  reel/audio/narration/*.mp3     每段语音
  reel/audio/timings.json        实测秒数
  reel/timeline.json             时间轴（页面与音频共用）
  reel/timeline.js               同一份时间轴，给页面读
  reel/index.html                画布页面，暴露 renderAt(t)，读 reel/timeline.js
  reel/frames/f_NNNNN.png        逐帧
  reel/frames/.render_manifest.json  帧的身份：时间轴与页面的 sha1
  reel/out/final.mp4             成片
  ppt/deck.json                  课件文案
  ppt/theme.json                 颜色与版面常量
  ppt/deck.pptx                  课件
  ppt/preview.html + preview/    从 pptx 真实几何生成的预览
```

`reel/index.html` 不是凭空写的：把 `templates/canvas/index.html` 复制成 `reel/index.html`，
只改 `TITLE` / `SUBTITLE` 和 `drawSegment()` 里的版面。它已经是可渲染的（清屏、时间轴切段、
进度条、淡入淡出、token-aware 换行），`render_frames.mjs` 能直接驱动。

两边读同一份时间轴。页面按 `timeline.json` 排画面，音频按 `timings.json` 排声音，
两边都源自实测秒数；只要有一边用估算，后面每一段都会漂。

## 口播怎么写

`reel/narration.json` 每段四个必填字段 `id` / `chapter` / `text`，可选 `visual` / `tags` / `metric`
由页面读取，`tts_edge.py` 与 `build_timeline.py` 会原样带到时间轴上。

- 70–130 个汉字一段，8–16 段。少于 8 段讲不完一支 8 分钟的片子，多于 16 段会变成念稿。
  短片子要放宽：`NARR_MIN_CHARS` / `NARR_MAX_CHARS` / `NARR_MIN_SEGMENTS` / `NARR_MAX_SEGMENTS`
  四个环境变量是这道闸门的阈值，改之前先在口播稿里写下为什么（比如 3 分钟的片子只有 12 段 × 60 字）。
- 数字只能来自逐字稿。`check_narration.py` 会把中文数字与阿拉伯数字都归一成整数对照。
- 绝对化判断（最好、唯一、一定、保证、绝对）必须在同一句里有口径词（讲者、自述、案例、估计、未验证）。
- 压缩重讲，不是逐句翻译：删重复、删产品操作细节，保留主张、例子、步骤、限制。
- 讲者的成本判断、平台额度、未完成项，交付里要标明是他说的，不写成结论。

规则细节与反例见 `references/narration.md`。

## 画面怎么写

页面只在一张画布上画，暴露 `window.renderAt(t)`，字体就绪后置 `window.__ready = true`。
帧从 `canvas.toDataURL()` 取，不用页面截图：在本机，普通截图会让整片变成同一张浅图。

- 一个持续的世界（一张平面图、一间房、一条时间线），换章只换强调层，不换场景。
- 每一段至少有一种随时间变化的东西：位移、透明度、依次出现、视锥扫过。
- 三层运动保底：镜头极慢推进（±2% 缩放）、视锥方向漂移（±10°）、扫描线横穿。
  实测一层都没有时，两秒内只有 0.44% 的像素在变，`check_frames.py` 会判 FROZEN。
- 深色底不要整片同亮度；标题、正文、注释至少三档字号。
- 底部字幕最多三行，压一条渐变遮罩，避免与图形打架。

接口、尺寸与已验证的失败见 `references/canvas.md`。

## 课件怎么写

`ppt/deck.json` 的每页是一个 `type` 加文案，`scripts/build_deck.js` 有七种版式：
`cover` / `statement` / `points` / `steps` / `compare` / `quote` / `closing`。
颜色写在 `ppt/theme.json`，不带 `#`，因为 pptxgenjs 要裸十六进制。

- 每页必须写 `source`（原片 mm:ss），`check_deck.py` 会拒绝没有时间的页。
- 上限 16 页。文案里不出现逐字稿没有的数字——**闸门查的是阿拉伯数字**：中文数词在幻灯片正文里
  绝大多数是序数词与量词（第四版、一篇），逐个抓会把整份课件判红。所以中文数字靠人读，阿拉伯数字
  靠闸门。
- 这台机器没有 PowerPoint / LibreOffice，所以预览从 **pptx 真实几何**生成：
  `deck_preview.py` 读 pptx 里每个形状的坐标，输出 `preview.html`，`shot_preview.mjs` 逐页截图。
  预览不是第二套版式，改一行 pptx 就会出现在图上。
- 溢出用 `check_deck.py` 的按字符宽度估算（CJK 1.0 em、拉丁 0.52 em），超 15% 报错。
  它是估算，不是排版引擎：段落首行、字距、auto-fit 都会让估算与实际有偏差，**它既会漏报，
  也可能报出实际不溢出的页**。所以 PASS 只代表"没有明显溢出"，图上还要自己看。
- 页码与来源行用 `objectName`（`pageno` / `provenance`）标出来，`check_deck.py` 按这个名字豁免数字检查，
  所以来源行里写片长不会误报；`caveat` 那个框照常检查，别把论断塞进去。
- `build_deck.js` 给每种版式设了条目上限（compare 两栏各 4 条，其余版式 5 条），超了直接报错：
  挤进同一页的行会互相压住，而越界检查看不出来。

版式字段见 `references/deck.md`。

## 中文字形与跨平台

- 画布与 pptx 都用 `Microsoft YaHei`；Georgia 只用于数字与拉丁标签。
- `document.fonts.ready` 之后再置 `__ready`，否则测量出的换行与渲染结果不一致。
- Windows 控制台是 GBK：跑 Python 前设 `PYTHONIOENCODING=utf-8` 与 `PYTHONUTF8=1`。
- Python：`edge-tts faster-whisper numpy imageio-ffmpeg pillow python-pptx`。
- Node：`playwright`（含 Chromium）与 `pptxgenjs`，全局或项目内都要能被 `require.resolve` 找到。
- 系统命令：`ffmpeg`、`ffprobe`、`curl`。`imageio-ffmpeg` 只带 ffmpeg 不带 ffprobe，所以 `video` 与
  `verify` 两个阶段要求 PATH 里有 ffprobe；缺了会明确报错，不会跑到一半才炸。`fetch_bili.py` 用 curl 取流，`pipeline.py` 用 ffprobe 核成片。`funasr` 只在 faster-whisper 起不来时装（约 1 GB 模型）。

逐项实测见 `references/verified.md`，三种证据要分开看：一条 8 分 42 秒的片子是完整走完本技能
pipeline 的（223.06 s 成片、6692 帧）；一条 3 分 07 秒的中文无字幕片是换道 `funasr` 与四个闸门的
验证对象，它的成片由项目内脚本拼出，pipeline 在这条上只跑到 asr 与 deck；另有一次 2 段 582 帧的
端到端冒烟，用来证明阶段之间真的接得上。

## 误用的代价

写清楚，是因为这四条都真实发生过：

- 数字写错不会让人立刻发现。口播听起来一样顺，成片也过得去，错的是观众记住的那个数。
  所以 `check_narration.py` 是硬闸门，`--selftest` 必须先过。
- 帧是旧的、音频是新的，成片照样能播，而且看不出问题，直到有人对轴。
  改稿后必须重跑 `tts → timeline → frames → video`，不能只重跑 `video`。
- 课件里没有时间的结论，三个月后没人能核对它出自哪一句。`source` 是必填项，不是装饰。
- 把一次案例写成通用规律，是最贵的一种错：读者会拿它去套别的项目，然后得出“这个方法没用”。
  讲者的成本判断、平台额度、未完成项，交付里一律标成自述。

## 检查器拦不住什么

- `check_narration.py` 比的是数字集合：逐字稿里的 `90 人` 与口播里的 `90%` 都算 90。
  它拦得住编造与误写，拦不住把数字挪到另一个名词上。改数字之后回读那句。
- `check_frames.py` 的空白与尺寸是**抽样**（默认 7 帧，去掉首尾 0.2 秒），中间一帧黑屏可能漏过；
  逐段运动才是全量（每段比首尾）。要全量查空白就逐帧跑，代价是多几十秒。
- `check_frames.py` 只有拿到 `--timeline` 才能逐段比；不传时退化成 25 对隔 2 秒的采样，
  那是另一个问题（“任意两秒里有没有动”），静态排版会被误判。
- `check_deck.py` 的溢出是按字符宽度估算，只会漏报；`--transcript` 的数字检查认不了拉丁词里的数字含义。
- `transcribe_all.py` 判断音源是否变了只看「大小 + 首尾各 1 MB」：中间被换掉、时长与头尾一致的
  文件认不出来。换源就删 `source/transcript/`，别指望哈希替你发现。
- `verify` 校验的是「成片与时间轴一致」和「四个闸门各自通过」，没有把 mp4 的字节和某一版帧序列
  绑在一起。改过帧之后要重跑 video，不能只跑 verify。
- 三个检查器都不判断内容好不好，只判断能不能看、能不能核。

## 已验证的失败

| 现象 | 原因 | 处理 |
|---|---|---|
| 转写是繁体混排、专名全错 | 用了 `small` 或 `base` | 中文用 `large-v3`；`small` 只能用来试跑 |
| faster-whisper 起不来，报 `metadata_errors` | `av` 与 torch 版本不兼容，还没读到音频就崩 | 加 `--engine funasr`，同一份 line 格式，下游闸门不用改；不要为此降级 torch |
| 官方字幕接口返回空数组 | 常态，不是故障 | 直接走 `transcribe_zh.py`，不要等字幕 |
| 同一条命令两个进程一起跑，chunk 互相覆盖 | 后台启动方式重复 | `transcribe_all.py` 会在 `.tmp` 写完后原子替换；先查进程再重跑 |
| 帧全是同一张浅图 | 用了页面截图而不是 canvas 数据 | `render_frames.mjs` 只走 `toDataURL` |
| 预览整页全黑 | 预览页拿到的十六进制颜色没有 `#` | 预览从 pptx 读颜色，不读 theme.json 的裸值 |
| 深底页整页看不见字 | 读字体颜色用了 `fore_color.rgb`，异常被吞后回落成默认深色 | 读 `run.font.color.rgb`，并用一张深底页验证 |
| 课件的箭头、竖线没画出来 | `ShapeType.line` 高为 0 或负数时 pptxgenjs 不报错也不画 | 横线用高 0.02 in 的矩形，竖线用宽 0.02 in 的矩形 |
| 预览与 pptx 版式不一致 | 两套布局代码 | 预览由 pptx 几何生成，不再第二套版式 |
| 引用块变成一个小横杠 | 用 line 形状画竖条，宽度接近 0 | 用 0.055 in 宽、1.7 in 高的矩形 |
| 成片只有几 MB 且 P 帧几乎全跳过 | 帧目录还是旧图 | 先跑 `check_frames.py`，再合成 |
| 换了稿子但画面还是旧的，音画错位 | 以前只按文件大小判断帧可复用 | 帧目录写 `.render_manifest.json`（时间轴与页面的 sha1），哈希变了就清空重渲 |
| 脚本能跑但整个文件变成乱码 | `Path.write_text()` 在 Windows 默认用 cp936，读时用 utf-8 | 写文件一律 `open(..., encoding="utf-8")` 或 `write_text(..., encoding="utf-8")` |
| 改了一句口播，却拿旧语音配新字幕 | `--only` 只按 id 判断复用 | `tts_edge.py` 按 (text, voice, rate) 哈希复用，改一个字段就重合成 |
| 时间轴与稿对不上 | 段数、顺序或文本被改过 | `check_narration.py` 传第三个参数，三项一起核 |

## 边界

- 只处理单支视频。整门多集课程用 `course-repack`；只要下载或逐字稿用下载工具。
- 非中文原片不在本技能的默认路径里：`transcribe_zh.py` 会拒绝非 zh 音频，英文需要另写转写脚本。
- 不做实拍剪辑、不做写实人物生成；画面是代码画的图形与文字。
- 不保证生成模型的输出。本技能交付的是“讲清楚”的课件与成片，不交付视频模型的提示词模板。
- 讲者的成本、额度、平台名一律按自述处理；没有核到的写法不写成事实。

## 交付前

```bash
python scripts/pipeline.py . --stage verify
python scripts/check_package.py .        # 技能包自身：frontmatter、断链、脚本可编译
```

`verify` 会 ffprobe 成片（分辨率、帧率、时长、体积）、重跑 `check_narration.py`、`check_frames.py`
与 `check_deck.py` 三道闸门，零字节的文件算 MISSING 而不是 OK；缺任何一件就非零退出。
它要求逐字稿与 `reel/frames/` 都还在——把它们删了就没法验收，只能加 `--allow-partial-verify`
跳过并在交付说明里写明，不能默默通过。
课件 PNG 与成片的抽帧要自己看一眼：脚本通过不等于画面能看。
