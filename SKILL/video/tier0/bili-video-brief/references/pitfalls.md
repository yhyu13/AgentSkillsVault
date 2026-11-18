# 失败表

只记真正发生过、并且会再发生的。

| 现象 | 原因 | 处理 |
|---|---|---|
| 转写像拼音，读起来像有稿 | 自动语言检测把中文判成英文 | `language="zh"` 钉死 |
| 每块时间戳都从 0 开始 | 分块转写，块内时间 | `merge_transcript.py` 加 `块号 × 115` |
| 合并后时间轴整体偏早 | 音频不是按整 115 秒切的 | 脚本会拒绝；用 `-segment_time 115` 重切 |
| 改写规则突然全部失效 | 换了模型或切块，文本变了 | `apply_corrections.py` 命中 0 次即失败，重写规则 |
| 一条 30 秒的段落卡在中间 | 说话没有停顿，模型吐满一个窗口 | 标精度，或 `refine_segment.py` 单段重转；不要按字数编时间 |
| 转写进程静默退出，无 traceback | 大模型多进程并行内存不足 | `medium` + 单块单进程；`large-v3` 串行 |
| `decode_audio` 抛 `metadata_errors` | `av` 与 faster-whisper 版本不兼容 | ffmpeg 先解成 16 kHz float32 再送模型 |
| 控制台中文全是乱码 | Windows 控制台 GBK | `PYTHONIOENCODING=utf-8`，用读文件工具看结果 |
| Playwright 找不到 cli.js | Python 包的 driver 是空的 | 用全局 npm Playwright，`NODE_PATH=$(npm root -g)` |
| 截图一直等不到 `__ready` | 字体没加载完就置位 | `document.fonts.ready` 之后再 `__ready = true` |
| PPT 右边三分之一不见了 | 只设了 `p.width`，没 `defineLayout` | 先 `defineLayout({name,width,height})` 再 `layout = name` |
| 小标签全堆在左上角 | 只写了 `left/top`，没 `position:absolute` | 文本类原子在 CSS 里统一加 `position:absolute` |
| 深色卡片看着发灰 | 淡入中途与纸色混合，静帧撞在中间 | 淡入压到 0.2 秒内；主角先落位 |
| 卡里的字压到下一张卡 | 嵌套层间距小于标签高度 | 每层留 0.5 英寸，或把标签放层底部 |
| `render(t)` 每帧结果不同 | 用了 `Math.random` / `Date` / rAF | 只允许 t 的函数；随机数改成 `sin(t*k)` |
| 渲染到一半进程消失 | 帧数多、内存峰值高 | `render_video.mjs` 分段跑，已渲帧不重来 |
| 合成后时长对不上 | 用了字数估时 | 只用 `timings.json` 的真实时长排轴 |
| 开头或结尾黑一下 | 第一段没从 0 开始 / 最后一段没收尾 | `check_timeline.py` 校验首尾覆盖 |
| 视频里出现原片声音 | 混音时接了 `source.m4a` | 摘要类视频只用 TTS + 合成铺底 |
| 口径表和正文互相打架 | 正文写完才补口径表 | 先写口径表，再写正文 |
