# 中文转写与校正

## 为什么不用自动语言检测

一段全是产品名（Codex、Claude Code、OpenCode）的音频，语言检测会翻成英文；翻过去之后中文被写成拼音，看起来像有稿，其实不能用。`transcribe_zh.py` 把 `language="zh"` 写死，就是为了避免这种「静默失败」。

## 切块与续跑

- 115 秒一块。一块一个进程，中断后已完成的块不用重跑。
- 块边界要落在真实时长的整数倍上：`merge_transcript.py` 会检查每块结尾是否接近 115 秒，不接近就报错——说明音频不是按固定长度切的，偏移会错。
- 这台机器的 faster-whisper 与 `av` 版本不兼容时 `decode_audio` 会崩，所以统一用 ffmpeg 解成 16 kHz float32 数组再送模型。

```bash
ffmpeg -i source/source.mp4 -vn -ac 1 -ar 16000 -c:a pcm_s16le source/audio.wav
ffmpeg -i source/audio.wav -f segment -segment_time 115 -c copy source/transcript/chunk_%02d.wav
python scripts/transcribe_zh.py source/transcript/chunk_03.wav source/transcript/chunk_03.txt --threads 7
```

5 块并行、`medium` int8、7 线程一块，实测每块约 3 分钟。`large-v3` 并行会把进程直接杀掉且没有 traceback，除非内存充足，否则不要一次开多块。

## 专名提示

`initial_prompt` 里放这一集的关键词，比事后校正便宜：

```
以下是一段关于 AI 编程的中文技术讲解。术语：Coding Agent、多 Agent、Herdr、tmux、
Zellij、cmux、PTY、SSH、Codex、Claude Code、Socket API、Session Manifest、Session ID。
```

提示只是提示，不能当事实来源。模型会把提示里的词硬塞进听不清的地方。

## 中文 ASR 的高频错误

| 类型 | 例子 | 处理 |
|---|---|---|
| 同音名词 | 会话 → 绘画，伪终端 → 尾中端，Pane → Pain，遥测 → 摇测 | 全局规则，多数出现 ≥2 次 |
| 产品名截断 | Herdr → Herder / Header / Herd | 用词界正则，别把已有的 Herdr 改坏 |
| 中英混写 | TMUX、Cloud Code、Open Code | 统一成 tmux、Claude Code、OpenCode |
| 数字与单位 | sleep30、编号级 | 补空格，改成 `sleep 30`、`编号几` |
| 口语拟声 | 坑吃坑吃 → 吭哧吭哧 | 可保留，但正文引用时改对 |
| 断句丢失 | 一句 30 秒不断 | 见下面的长段处理 |

## 校正表的写法

```json
[
  {"from": "持久化绘画", "to": "持久化会话", "why": "session，不是画面"},
  {"from": "Pain", "to": "Pane", "why": "终端窗格"},
  {"from": "(?<![A-Za-z])Herd(?![a-z])", "to": "Herdr", "why": "产品名截断"}
]
```

规则顺序有讲究：先长后短，先具体后一般。`Herder → Herdr` 必须在 `Herd → Herdr` 之前，否则 `Herdr` 会被改成 `Herdrr`。拉丁词用 `(?<![A-Za-z])` 和 `(?![a-z])` 保护词界。

`apply_corrections.py` 的契约：**任何一条规则命中 0 次就整体失败**。规则过期说明稿件变了（换了模型、换了切块），这时候需要人重新读一遍，而不是让旧规则静默失效。

## 长段落

模型在没有停顿的段落上会吐出整整 30 秒一条。这对读摘要没影响，对逐帧对齐是灾难。

三种处理，按代价排序：

1. **接受并标注**：摘要里写「时间戳为段落级」，不假装精确。
2. **只重转那一段**：`scripts/refine_segment.py` 会对那 30 秒单独跑一次 `word_timestamps=True`，按标点切句。
3. **人工听**：打开音频，按语义切，手写时间戳。

不要用「字数比例 × 段落时长」去编时间戳——那是最像真的假数据。

## 校验

```bash
python scripts/check_transcript.py source/transcript/transcript_clean.txt --duration 562
```

查：格式、时间单调、重叠、空行、覆盖到片尾 3 秒内、相邻重复、中文占比。默认把超过 15 秒的段落记为警告；加 `--strict` 变成错误，做逐帧对齐时必须加。

## 编码与终端

- Windows 控制台是 GBK，中文在 CLI 里是乱码。设 `PYTHONIOENCODING=utf-8` 和 `PYTHONUTF8=1`，并且**读文件用读工具，不要相信控制台输出**。
- `print` 里带 emoji 会让 Python CLI 直接崩，脚本里不要用。
- 校验结果的退出码比文字重要：0 通过、1 缺陷、2 缺文件。自动化只认退出码。
