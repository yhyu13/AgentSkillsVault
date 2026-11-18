---
name: bili-talk-showreel
description: 把一支已有逐字稿或可转写的 B 站讲解视频做成中文课件、画布口播网页和 1920×1080 MP4。用户给出 b23.tv、bilibili.com 或 BV 链接，并明确要求画布渲染或 motion showreel 时使用。英文原片用 faster-whisper；中文原片必须已有可靠逐字稿。不用于 bili-talk-repack 的 DOM 成片、bili-video-repack 的 MiniMax 流程、course-repack 的多集课程，或只要下载和逐字稿。
version: "2026.11.14"
license: MIT
metadata:
  version: "2026.11.14"
  category: video
  outputs: pptx, mp4, html
---

# B 站讲解口播片

一支讲解视频变成三件东西：16 页中文课件、可点击播放的画布网页、1920×1080 MP4。

事实只来自逐字稿。口播是压缩重讲，不新增数字。讲者的估计、自述、号召和产品演示必须在同一句里标明口径。

## 三个数字

| 项 | 算法 | 本次实测 |
|---|---|---|
| 原片 | 从 source.meta.json 读取 BV、标题、时长、语言 | 不把某一次的时长写成规则 |
| 口播 | 汉字 ÷ 5.0 字/秒，再与 timings.json 对比 | 偏差超过 20% 先改稿 |
| 成片 | 1.4 秒开场 + 每段间 0.55 秒 + 2.6 秒收尾 | 帧数等于总秒数 × 30 |

偏差超过 20% 先改稿。不加速语音。

## 依赖

Python 需要 `edge-tts faster-whisper numpy imageio-ffmpeg pillow`。Node 需要全局或项目内可解析的 `playwright` 与 `pptxgenjs`，并已安装 Playwright Chromium。缺一个就先安装再继续，不改脚本绕过。

```powershell
pip install edge-tts faster-whisper numpy imageio-ffmpeg pillow
npm install playwright pptxgenjs
npx playwright install chromium
```

## 流程

工作目录是一个新的项目目录。先把本技能的 scripts 整目录复制进去，因为两个生成脚本用自己的位置寻找 reel。复制后仍用这里列出的命令，不改阈值。

原片下载走公开接口。短链先解析 BV，再取播放地址。返回没有 DASH 视频流或音频流时停止，不要猜登录信息。下载后的视频和音频都留在 source。公开接口可能只有四百八十 p；这只限制原片，不限制重绘成片。

转写前把音频切成不超过一百一十五秒的十六千赫兹单声道 mp3。英文一段一个进程，模型固定 small.en，计算类型 int8。每段文本保留秒数，拼接时加上段号乘一百一十五。专名对照上下文校正，并把识别原写法留在口径表。

口播不是逐句翻译。它保留讲者的主张、例子、步骤和限制，删掉重复和产品演示中的操作细节。每段七十到一百二十个汉字。数字只有逐字稿里出现过才能写。Eden、Eve、百万、七位数、十秒和十二个月这些说法，必须在同一句标明讲者、自述、估计、设想、号召、产品或未验证。

语音使用 edge-tts 的 zh-CN-YunyangNeural，不改速度。合成后读取真实时长。总时长比汉字除以五的估算相差超过百分之二十，就改稿，不加速。时间轴固定一点四秒开场、段间零点五五秒、收尾二点六秒。铺底在说话期间降到零点五五，最后按峰值零点九二归一。

画面只从画布输出。普通浏览器截图在本机会重复同一张浅图，所以渲染器读取 canvas 的 PNG 数据。renderAt 每次清空画布，所有位置都由当前秒数决定。每个语音段要有长度、位移、透明度或依次出现中的一种变化。产品功能单独成组，不和可迁移方法混在一张结论里。

帧检查抽五张。缩小到一百九十二乘一百零八后，深色采样少于一百判空白；首尾平均色差低于二判静止。任一条件失败都重新渲染。视频编码使用三十帧、CRF 十八、yuv420p 和一百九十二 kbps AAC。成片时长必须等于时间轴总长。确认可播放后删除帧目录。

课件不超过十六页，宽十三点三三三英寸，高七点五英寸。颜色值不带井号。形状使用 ROUNDED_RECTANGLE、LINE 和 OVAL。每页备注写原片时间与口径。PowerPoint 导出 PNG 后检查卡片、页码、标题和正文，溢出就改坐标，不靠缩小字号硬塞。

1. `python scripts/fetch_bili.py <url> -o source/`。没有 DASH 流就是登录墙，停止。
2. 用 ffmpeg 把音频切成不超过一百一十五秒的单声道 mp3。英文逐段运行 `python scripts/transcribe_chunks.py <chunk.mp3> <chunk.txt>`。它使用 faster-whisper small.en、int8 和单进程。中文原片不要用这个模型；没有现成的可靠逐字稿就停止，不把英文模型的拼音输出当事实。
3. 时间戳加 `段号 × 115`，写入 `source/transcript/transcript_clean.txt`。
4. 写十到十四段口播，每段七十到一百二十个汉字。`reel/narration.json` 必须包含 `voice`、`rate` 和 `segments`。每段包含 `id`、`chapter`、`text`。`voice` 使用 zh-CN-YunyangNeural，`rate` 使用 +0%。然后运行 `python scripts/check_narration.py reel/narration.json source/transcript/transcript_clean.txt`。退出码 1 表示数字不在逐字稿，或敏感说法没有同句口径。
5. `python scripts/tts_edge.py` 用 zh-CN-YunyangNeural 合成，并写入每段真实秒数。再运行 `python scripts/build_audio.py`。它按一点四秒、零点五五秒、二点六秒排列，生成 `timeline.json`、`timeline.js`、`final.wav` 和 `final.mp3`，说话时把铺底压到零点五五。生成后必须再运行 `python scripts/check_narration.py reel/narration.json source/transcript/transcript_clean.txt reel/timeline.json`。第三个参数同时核对段数、顺序和文本；任何一项不同都返回 1。
6. 创建 `reel/index.html`，页面只在 `#stage canvas` 上绘制。字体准备完成后设置 `window.__ready = true`，并暴露 `window.renderAt(t)`。读 `references/canvas-render.md`。不要依赖普通截图。
7. `node scripts/render_canvas_frames.mjs <project>` 按时间轴总帧数逐帧写 PNG。随后运行 `python scripts/check_frames.py reel/frames`。它读取百分之五、三十、五十五、八十、九十五五帧；任一帧缩小后深色采样少于一百，或首尾平均差低于二，就返回 1。
8. 合成：

```powershell
ffmpeg -y -framerate 30 -i reel/frames/f_%05d.png -i reel/audio/final.wav -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest reel/out/final.mp4
```

9. 在项目里写 `ppt/build_deck.js`，用 PptxGenJS 做十六页以内课件。颜色不带井号，版面使用自定义十三点三三三乘七点五。形状名使用 ROUNDED_RECTANGLE、LINE 和 OVAL。每页备注写原片时间和口径。运行 `node ppt/build_deck.js` 后，用 PowerPoint 把每页导出成 PNG，看卡片、页码和正文是否溢出。

## 选择边界

`bili-talk-repack` 用 DOM 和页面截图。`bili-video-repack` 用 MiniMax 语音。`course-repack` 处理整门多集课程。只有用户明确要画布渲染，或页面截图被证明重复时，才用本技能。中文原片没有可靠逐字稿时，三个技能都不继续转写。

## 画面规则

- `renderAt(t)` 幂等，清空整张画布。
- 舞台 1920×1080。外层只做整体缩放。
- 字体只用 Microsoft YaHei 和 Georgia。
- 第一段从 0 秒可见，最后一段延伸到全片结束。
- 产品演示与可迁移方法分开放。

## 交付

```text
<slug>/source/source.mp4
<slug>/source/transcript/transcript_clean.txt
<slug>/reel/index.html
<slug>/reel/out/final.mp4
<slug>/ppt/<name>.pptx
<slug>/01-口播稿与分镜.md
```

报告原片分辨率限制、成片时长和帧率、口播实测字速，以及哪些数字是讲者自述。确认成片后再删除 `reel/frames`。

## 交付前核对

交付前逐项核对文件，不把脚本退出码当成全部验收。source.meta.json 里要有 BV、标题、时长和 UP 主。逐字稿第一段必须是原片语言，英文不能出现成片拼音。口播十二段左右，每段都能在逐字稿里找到对应段落。

timings.json 的每段 seconds 来自音频文件，不来自字数估算。timeline.json 的总长等于最后一段结束时间再加二点六秒。final.wav 能播放，峰值不超过零点九二。抽查开场、中段和结尾三帧：中文完整，卡片不压页脚，红色进度条随时间变长。

MP4 用 ffprobe 核对一百九十二乘一百零八十、三十帧和音轨。时长与 timeline.total 相差不能超过一帧。课件页数不超过十六，备注里能看到口径。最后在口播稿文档列出源分辨率、实测字速和未独立验证的产品说法。

## 验收证据

每次都重新运行两个检查器，不引用过去一次的通过结果。数字检查要同时准备一份正确稿和一份改错稿：正确稿返回 0，改错稿返回 1。帧检查要有一张含画面的样本和一组空白样本。

源视频分辨率、口播字速和帧数写进项目的口播稿，不写进技能。公开接口给出的分辨率只对当前视频有效。

## 失败后怎么查

下载失败时先看接口返回，不改请求头反复撞。没有 DASH 流就停止并说明需要登录。文件小于一百 KB 通常是错误页，删除后重取。

转写结果像拼音时，检查模型名是不是 small.en。进程没有 traceback 却退出，改成一次一段。时间轴重叠时，检查是否忘了加段号乘一百一十五。

口播检查失败时只改指出的那一段。数字不在逐字稿就删除或改回原词；产品句没有口径就补“讲者”或“未验证”，不要换一种肯定句式逃过检查。

语音时长偏差超过百分之二十，先删句子，不改 rate。画布导出报污染，说明把外部图片画进去了，去掉图片只留矢量。渲染二十秒没有第一帧，先看页面是否设置 `window.__ready`。帧检查说空白，先看 PNG 像素，不先合成 MP4。成片只有几 MB 且编码统计几乎全跳过，说明帧目录仍是旧图，清空后重渲。

课件形状报缺参，核对三个大写形状名。PowerPoint 导出失败就保留 pptx，不改称已经目视验收。最后一项失败没有修掉之前，不把技能放进 vault。

## 已验证的失败

| 现象 | 处理 |
|---|---|
| 英文被听成拼音 | 换 small.en |
| 页面截图反复是同一张浅图 | 改用画布 `toDataURL()` |
| MP4 只有几 MB 且 P 帧几乎全跳过 | 先查帧像素，不要交付 |
| 画布 `toDataURL()` 被污染 | 不把外部 SVG 或图片画入画布 |
| pptxgenjs 形状名报缺参 | 使用 `ROUNDED_RECTANGLE`、`LINE`、`OVAL` |
