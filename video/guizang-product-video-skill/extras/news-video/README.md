# 新闻讲解视频扩展（news-video）

把一份文字简报（早报、周报、资讯整理）做成带配音、字幕、配乐和音效的横屏讲解视频。来源是「AI 早报视频」的实际制作流程，脚本已去掉个人路径、日期和具体新闻，改成命令行参数。

**这是一个可选扩展，不改动 skill 本身。** `SKILL.md`、`scripts/`、`assets/starter/` 保持原样；本目录的脚本只写你指定的工程目录，不会写回 skill。

## 目录

| 文件 | 用途 |
|---|---|
| `tools/apply_overlay.py` | 把 `init_project.py` 生成的空工程改成新闻视频工程：覆盖新闻版式、拷贝 skill 自带音效、下载字体、写入 content.json |
| `tools/tts.py` | 按 content.json 的旁白逐句合成配音（edge-tts），去掉首尾静音、量出每句时长，按内容哈希缓存 |
| `tools/make_timeline.py` | 用实测的配音时长排时间轴，生成 `plan.json`（镜头、字幕、动作节拍、音效 cue）和整条 `assets/voice.wav` |
| `tools/music.py` | 按镜头边界用代码写一段原创新闻垫乐 `assets/music.wav`（numpy，无采样，可复现） |
| `tools/mix_voice.py` | 把配音叠到 skill 的 BGM + 音效母带上，说话时音乐再压低，两遍响度标准化到 -16 LUFS，输出 `assets/final-mix.wav` |
| `overlay/` | 新闻版式：瑞士风格白底 + 安全橙，进度条、字幕条、擦除转场；`render.mjs` 认可 `mix_voice.py` 记录的配音母带；`poster.mjs` 抓首帧海报 |
| `content.example.json` | 最小示例（4 个镜头，约 18 秒），数据是虚构的 |

## 依赖

- skill 本身的依赖：Node 18+、FFmpeg、Playwright Chromium（`scripts/check_environment.py` 会检查）
- Python 3.10+，以及 `pip install edge-tts numpy`
- 联网：edge-tts 合成需要联网；首次运行 `apply_overlay.py` 会从 Google Fonts 仓库下载 Inter、Noto Sans SC、IBM Plex Mono（均为 OFL 许可，约 19 MB）。离线时用 `--fonts-dir` 指向已有字体

## 完整流程

以下命令里 `SKILL` 指 skill 根目录，`FILM` 指工程目录（必须在 skill 目录之外）。

```bash
SKILL=/path/to/guizang-product-video-skill
X=$SKILL/extras/news-video/tools
FILM=~/films/brief-2026-01-01

# 0. 建工程 + 套新闻版式（--example 用示例内容；正式用 --content 你的.json）
python3 $SKILL/scripts/init_project.py --output $FILM --style default
python3 $X/apply_overlay.py --project $FILM --content my-content.json
cd $FILM && npm install && npx playwright install chromium
python3 $SKILL/scripts/check_environment.py --project .

# 1. 配音：每句一个音频，量出时长
python3 $X/tts.py --project . --voice zh-CN-YunxiNeural --rate +20%

# 2. 时间轴：plan.json + assets/voice.wav
python3 $X/make_timeline.py --project .

# 3. 配乐：assets/music.wav
python3 $X/music.py --project .

# 4. skill 原有混音：配乐 + 音效 cue → assets/master.wav、evidence/audio-mix.json
python3 $SKILL/scripts/mix_audio.py plan.json

# 5. 叠配音：assets/final-mix.wav（记录为 audio-mix.json 的 voiceMix）
python3 $X/mix_voice.py --project .

# 6. 渲染：先构建、抓海报帧、再构建，然后逐帧渲染
node build.mjs && node poster.mjs 1.6 && node build.mjs
node render.mjs --audio assets/final-mix.wav --output renders/final.mp4

# 7. 交付检查（skill 原有脚本）
python3 $SKILL/scripts/check_delivery.py plan.json --video renders/final.mp4 --mix-report evidence/audio-mix.json
```

改了旁白就从第 1 步重跑；只改画面数据（数字、标签）从第 2 步重跑即可（时间轴变了，必须重新混音，`render.mjs` 会拒绝过期的混音）。草稿可以用 `node render.mjs --from 0 --to 8 --output renders/draft.mp4` 只渲一段。

正式成片前，照 skill 的要求写好 `DIRECTION.md`（方向、镜头表），并在 `evidence/` 记录事实来源。

## 常用参数

| 脚本 | 参数 | 默认 |
|---|---|---|
| `tts.py` | `--voice`、`--rate`（覆盖 content.json） | `zh-CN-YunxiNeural`、`+0%` |
| `make_timeline.py` | `--fps`、`--width`、`--height`、`--transitions alternate/wipe/slide`、`--style`、`--repo`、`--music-gain` | 30、1920、1080、alternate、沿用 plan.json 或 default、—、0.55 |
| `music.py` | `--bpm`、`--seed`、`--lufs` | 104、7418、-18 |
| `mix_voice.py` | `--duck-db`、`--voice-gain`、`--sfx-gain`、`--music-gain`、`--lufs`、`--tp` | 11、1.15、0.9、1.0、-16、-1.5 |
| `apply_overlay.py` | `--content FILE` 或 `--example`、`--fonts-dir`、`--no-fonts` | — |

版式按 1920×1080 设计；改画幅需要同时改 `src/film.css`。

## content.json 格式

```jsonc
{
  "title": "片名，写进 plan.product",
  "date": "2026-01-01",
  "sourceNote": "简报来源（链接或路径），写进 plan.scope",
  "platforms": ["X / B 站 横屏"],
  "voice": "zh-CN-YunxiNeural", "rate": "+20%",
  "brand": {"name": "左上角刊名", "meta": "刊名右侧的英文小字"},
  "shots": [ /* 按播放顺序 */ ]
}
```

每个镜头的公共字段：

| 字段 | 说明 |
|---|---|
| `id` | 唯一 id，如 `intro`、`n1`、`outro` |
| `kind` | 版式，见下表 |
| `type` | skill 的镜头类型：开场 `title`、条目 `detail`、结尾 `end` |
| `headlineEn` / `headline` | 英文 / 中文标题（`\n` 换行）。skill 要求双语标题 |
| `description` | 一句话说明 |
| `claim` / `source` | 是否陈述事实；为 `true` 时 `source` 必须给出处链接。正式片至少一个 `claim: true` |
| `idx` / `cat` | 条目编号（`"01"`）和分类小标签。带 `idx` 的镜头会出现在顶部进度条里 |
| `handles` / `quote` | 右栏的来源账号，和原文摘录 `{handle, time, text}`（可选） |
| `transition` | 可选，`wipe` 或 `slide`，覆盖默认的交替转场 |
| `narration` | 旁白数组，见下 |

旁白每一句：

```json
{"sub": "屏幕字幕：数字用阿拉伯数字", "tts": "给配音读的文本：数字写成读法", "mark": "price", "sfx": "pop", "action": "这一刻画面发生了什么"}
```

- `sub` 和 `tts` 分开写，字幕好看、配音读得对（如字幕 `4.5`，配音写「四点五」）。
- `mark`（可选）：把画面节拍钉在这句话开始的时刻。版式里的元素按 mark 出场。
- `sfx` + `action`（可选）：在这句话开始时额外加一个动作音效。可用音效：`whoosh sweep ding-dong resolve success error pop click click-alt toggle typing`。

### 版式（kind）和需要的数据

| kind | 画面 | 数据字段 | 必需的 mark |
|---|---|---|---|
| `intro` | 大标题 + 日期 + 数字概览 | `kick`、`titleEn`、`titleZh`、`enSub`、`dateNum`、`dateZh`、`facts: [["7","条要闻"],…]` | — |
| `price` | 价格条形图，`hot` 的条在 mark 时变橙 | `prices: [{k, v, t, hot}]`、`priceNote` | `price`（可选） |
| `rank` | 排行条形图 + 引语 | `bars: [{k, v, hot}]`、`pull: {who, text}` | `bars`、`pull` |
| `money` | 金额数字 + 核实印章 + 条款 | `money: [{to, prefix, unit, label, hot}]`、`moneyNote`、`verified`、`terms: []` | `verified` |
| `status` | 大数字 + 列表 | `stat: {to, unit, label, comma}`、`rows: [{k, v, hot, mark}]` | `rows`（或每行自己的 `mark`） |
| `math` | 大数字 + 两行 + 旁注卡 | `stat`、`rows`（两行）、`aside: {who, text, tag}` | `local`、`verify`、`aside` |
| `agents` | 标签 + 信息卡 + 「未证实」印章 | `chips: []`、`card: {name, by, facts: []}`、`rumorTag`、`rumor` | `card`、`rumor`（`shop` 可选：点亮最后一个标签） |
| `steps` | 分步列表 | `tipTitle`、`steps: []` | `tip`、`s0`、`s1`…（每步一个） |
| `radar` | 数据表（赞/评论/收藏/浏览），每行最高值在 mark 时点亮 | `tableHead`、`table: [{t, like, reply, bm, view, hot}]`、`note`、`snap` | `r0`、`r1`…（每行一个） |
| `outro` | 结尾大字 + 页脚 | `kick`、`big`、`enSub`、`foot: []` | — |

缺少必需的 mark 时，构建后的页面会报 `missing mark …`，渲染会停下来。`make_timeline.py` 会按版式自动生成转场音效和关键动作音效（例如 `price` 的变色、`steps` 每步入场），并把音效的可听峰值对齐到动作上。

完整示例见 `content.example.json`。

## 改样式

- 颜色、字体、边距：`overlay/src/film.css` 顶部的 `:root` 变量（套用到工程后改工程里的 `src/film.css`）。
- 新版式：在 `src/shots/news.jsx` 加一个 `XxxView`，在 `src/shots/index.js` 的 `SHOT_VIEWS` 里登记 `kind`；需要的话在 `make_timeline.py` 的 `KIND_ACTIONS` 里加默认动作音效。

## 许可

`overlay/` 由 `assets/starter/` 改写而来，与起步工程相同，采用 AGPL-3.0（见仓库 `LICENSE` 与 `assets/starter/NOTICE.md`）。音效来自 `assets/audio/sfx/`，其来源见该目录说明。字体为 SIL OFL，运行时下载，不随仓库分发。
