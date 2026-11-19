# 五道闸

验收的规则只有一条：**退出码，不是形容词**。非零就是没做完，不要把它解释成
「可以后续优化」。但反过来也成立：全过不代表好看，闸只覆盖可测量的部分。

## 1. 内容闸

```bash
python scripts/check_content.py content/content.json
```

抓：JSON 语法（报行号列号）、`meta` 缺失、集号不连续、页型未知、缺 `note`、缺 `narration`、
单句超过 36 汉字。

为什么先跑它：这一步 0.2 秒，后面每一步都是分钟级。内容错了，后面全是白跑。

## 2. 字幕闸

```bash
python scripts/check_subtitles.py out --glob "*.srt"
```

抓：行内汉字 >18、行数 >2、单条 <1.2 秒、时间戳倒序或重叠、文件缺失。

误报处理：英文术语和数字不算汉字宽度，`Coursera` 只按 8 个字符算宽度，比 8 个汉字窄。
如果一行因为大量英文被误判行数，先改 `--max-cjk`，不要改字幕内容。

## 3. 可见性闸

`scripts/check_visibility.py` 用 Playwright 真渲染场景，在每页时间段的末尾断言：

- 每个子元素 opacity == 1（错峰淡入真的走完了，而不是停在半透明）；
- 文字行的真实包围盒不超出自己的框：容差取 `max(8px, 字号 × 0.25)`，
  这是行高取整留下的视觉余量；超过四分之一行才算溢出；
- 不超出 1920×1080 画布；
- 任意两块文字不重叠（重叠宽度/高度 > 3 px 即判失败）。

它比「出完片再抽帧看」便宜两个数量级，而且能定位到具体页、具体字段。
代价是需要 `playwright install chromium`；没有浏览器时它会直接报错，
不要把它当成通过。

## 4. PPTX 闸

三段，缺一不可：

```bash
python scripts/check_pptx_layout.py out/deck.pptx --content content/content.json
```

1. **文件有效**：PowerPoint COM 打开（`ReadOnly`、不显示窗口），能读出形状树。
2. **版面对得上**：COM 读每个 shape 的 `Left/Top/Width/Height` 与
   `TextFrame2.TextRange.BoundWidth/BoundHeight`，**单位是磅不是 EMU**（EMU 是 OOXML 层），
   和形状框比，容差 1.5 pt；同时检查任意两块文字的重叠面积。
3. **备注覆盖**：每页都有 notes；给 `--content` 时，还要求每条备注能在
   `content.json` 的 `note` 里找到（允许生成器在备注后追加 `【讲稿】` 段）。

COM 需要目标机器装了 PowerPoint。没有 PowerPoint 或没有 `pywin32` 时，
`check_pptx_layout.py` 以**退出码 2** 结束并打印「未测量」——2 不是通过，验收时要当成未完成。

## 5. 成片闸

对每个 mp4：

```bash
ffmpeg -i out/ep3.mp4
ffprobe -v error -show_entries format=duration -of csv=p=0 out/ep3.mp4
```

- 时长与 `timing.json` 的 `total` 差 ≤ 0.2 秒；
- 有音轨，且响度 −14 ±1 LUFS、TP ≤ −1 dB；
- 画面非黑：在 5% / 50% / 95% 三处抽一帧，`signalstats` 的 YAVG 必须 > 17（纯黑帧实测恰好 16）；
- 内嵌字幕存在（`-clean` 版除外），且流语言标记为 `chi`/`zho`；标记缺失或为 `und` 都算失败。

`scripts/check_videos.py` 把这五项做成一次遍历，任何一项测不到都算失败而不是跳过。

## 汇总

`templates/final_gates.py` 是骨架：五道闸逐条跑，打印尾部输出，最后汇总失败项并返回 1。
把它复制进 `tools/`，需要时只改 `GATES` 里的路径与文件名。

```python
GATES = [
    ("内容", [PY, "scripts/check_content.py", "content/content.json"]),
    ("字幕", [PY, "scripts/check_subtitles.py", "out"]),
    ("可见性", [PY, "scripts/check_visibility.py", "content/content.json"]),
    ("PPTX 版面", [PY, "scripts/check_pptx_layout.py", "out/deck.pptx", "--content", "content/content.json"]),
    ("成片", [PY, "scripts/check_videos.py", "out"]),
]
```

## 闸之外

每次交付前，从成片里抽 6–8 帧拼一张联系表，人眼看三件事：

1. 有没有元素压字、出画、被裁；
2. 一页是不是只有一个视觉焦点；
3. 深色页和浅色页的节奏是否交替出现。

这一步花 3 分钟，是唯一能抓住「字全在框内但画面难看」的检查。
