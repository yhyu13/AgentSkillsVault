# 八步流水线

每一步都有可判定的产出。跳过某一步，后面的闸会替你把问题找回来，但那时代价已经付过了。

## 0. 侦察（半小时内做完）

先回答四个问题，写进 `content/content.json` 的 `meta`：

0. **先确认授权**：用户是原课作者、有书面授权，还是只做个人学习用？答案决定后面能不能发布，
   不能等到交付才问。
1. 原课多少节、总时长多少？合集元数据的 `pages` 数组直接给了每节 `duration`。
2. 有没有现成字幕？有就用，省掉 STT 的 40 分钟和识别错误。
3. 讲师自己怎么定义这门课？找第一节的自我介绍，别用平台简介替代。
4. 原片能不能离线？下载后校验每节时长非零；`download.log` 里逐条记 `status/bytes`。

侦察的产出是三行字：来源、节数/时长、可信度。不要在这一步开始写文案。

## 1. 拆集

先定集，再定页。顺序反了会得到六集互相重复的内容。

- 每集一句话主张，必须是**可反驳的判断**，不是话题名。「为什么经营人脉」是话题，
  「人脉不是通讯录」才是判断。
- 集内页数按主张的数量走，一页一个主张。实测 15–20 页对应 2.5–3.5 分钟。
- 集与集之间要能递进：谁先谁后有依赖就排前面，独立模块放后面。
- 每集开头一页 `cover`，结尾一页 `takeaway`，中间用 `chapter` 标出模块边界。

## 2. 写脚本

`content.json` 的结构约束见 `templates/content.schema.json`。每页至少五个字段：

| 字段 | 作用 | 常见错误 |
|---|---|---|
| `head` | 页面主张，观众三秒内读完 | 写成话题名，或一句话塞两个判断 |
| `support` | 一句限定、出处或反例 | 重复 `head`，或写成小作文 |
| `note` | 讲者备注，给翻页的人看 | 复制 `narration`，没有增量信息 |
| `narration` | 口播，按句写 | 书面语、长定语、括号、英文缩写 |
| `hero` | 大数字/大判断，`{value, label}` | 数字没有单位或对照 |

写作纪律：

- 一页一个数字。数字必须有对照系（和什么比、什么时候），否则观众记不住。
- 口播一句一个动作，单句不超过 36 个汉字（两条字幕）。超了就拆句，不要靠加速。
- 专有名词第一次出现给中文，第二次可以只给英文。
- 每集结尾给一个可执行动作，不给总结口号。

## 3. 量几何

```bash
python scripts/fit_text.py "$(jq -r '.episodes[0].slides[2].head' content/content.json)" \
  --w 1318 --h 230 --base 108 --min 36 --json
```

把返回的 `size` 写回该页的 `sizes.head`。九个字段（label/head/support/hero/…）各自收缩。
`min` 是硬地板：低于 36 px（=18 pt）就说明这页该拆，而不是继续缩。

字体：中文 `Microsoft YaHei`，数字 `Arial`。混排时按字符切 run，否则数字会继承雅黑、
PPT 里比视频里宽一档。`SAFETY = 1.04` 是 PowerPoint 与 PIL 的实测度量漂移，别删。

## 4. 转写与配音

**转写**（只在没有字幕时做）：

```bash
python -m pip install -q faster-whisper
# small.en + int8，CPU 16 线程；54 节 418 分钟约 40 分钟跑完
```

用 ffmpeg 解成 16 kHz 单声道再喂给模型，绕开 PyAV 的版本冲突。逐节输出
`work/transcripts/NN.json`（带时间戳的 segments）与 `NN.txt`。已存在的跳过，可断点续跑。

**配音**：

```bash
python -m pip install -q edge-tts
python scripts/make_narration.py content/content.json --out work/narration
python scripts/tts_episode.py work/narration/ep3.txt \
  --map work/narration/ep3.map.json --out work/ep3 --gap 0.35
```

`make_narration.py` 一页的旁白按句号切成多行，并写出「第几行属于第几页」的映射。
`tts_episode.py` 逐句合成（每句一个 wav）、按 `--gap` 插入静音、拼成 `narration.wav`，
同时写出 `timing.json`（每句 start/end/slide 与 total）和 `subtitles.srt`。
合成结果落在 `work/epN/tts/`，加 `--reuse` 可跳过已经合成过的句子，断网重跑不会白费。

- 声音：`zh-CN-YunyangNeural`（男声偏播报）；女声可用 `zh-CN-XiaoxiaoNeural`。
- 一次只合成一集，多集并行会抢带宽并让时间轴错位。
- 合成后立刻把「句子 → 页」的映射写下来。一页可以对应多条字幕，但一条字幕不能跨页。

## 5. 出片

```bash
# 1) 逐帧：固定的 viewport，按 t 精确渲染，不靠等待
python scripts/render_episode.py content/content.json 3 --slug course \
  --fps 24 --width 1280 --height 720

# 2) 编码：静音轨 -> 混音 -> 内嵌字幕
ffmpeg -y -framerate 24 -i work/ep3/frames/%05d.png \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -movflags +faststart work/ep3/silent.mp4
```

关键点：

- 渲染入口是 `window.renderAt(t)`，一帧一个函数调用。**不要**用 CSS 动画加 `wait_for_timeout`
  去等状态，那样同一时间的帧在不同机器上不一样。
- 音频链：`acompressor=threshold=-26dB:ratio=3.5:attack=5:release=150` →
  `loudnorm=I=-14:TP=-3:LRA=11` → `volume=1.28` → `alimiter=limit=0.85:level=disabled`。
  限幅在最后、`level=disabled`，否则真峰值会被自动电平抬回 0 dB。
- 成片输出两份：带字幕版（`mov_text`，标记 `language=chi`）与 `-clean` 版。
- `--slug` 决定文件名前缀（`<slug>-ep3.mp4`）。默认 `episode`，验收脚本默认扫全部 mp4，
  但人看的时候用课程名更清楚。
- 编码完用 `ffmpeg -i` 读回时长与 LUFS，和 `timing.json` 的 `total` 对照，差超过 0.2 秒就是有问题。

## 6. 出 PPTX

```bash
node scripts/build_pptx.js content/content.json out/deck.pptx
```

- `pptxgenjs`，`LAYOUT_WIDE` 13.333×7.5 in。1 in = 144 px，1 px = 0.5 pt。
- 深色页型（cover/chapter/hero/takeaway）与浅色页型（steps/conclusion/try/review）分开处理。
- 每页写入 `note` 到 notesSlide；没有备注的页面在验收时会被判不合格。
- 生成后用 PowerPoint COM 打开并读回每个形状的 `Left/Top/Width/Height`，和 `layout.json` 对照。
  只看 XML 不够，PPT 会自己调整行距。

## 7. 过闸

```bash
python scripts/check_content.py content/content.json
python scripts/check_subtitles.py out --glob "*.srt"
python templates/final_gates.py
```

`templates/final_gates.py` 是骨架：把五条命令的路径换成项目里的脚本，它逐条跑并汇总退出码。
任何一条非零，整批就是没做完，不要逐条解释成「小问题」。
