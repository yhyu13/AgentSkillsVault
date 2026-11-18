# 排错顺序

按这个顺序查，绝大多数问题在第三步之前就能定位。先看报告，再看命令，最后才怀疑代码。

1. **看最近一次 PASS 在哪一关。** `deck/qa/report.json`、`reel/qa/report.json` 里有 `passed` 和逐项数字，先读它，不要重跑一遍整个流水线。
2. **看命令自己打印的那一行。** `check_transcript.py` 会说哪一块空、空档多少秒；`qa_reel.py` 会说哪一段静音、差多少帧。这些数字比「报错了」有用。
3. **复现最小单元。** 转写问题用 `--only 7`；渲染问题用 `--start 0 --duration 4`；课件问题只跑 `build_deck.py`。

## 已经踩过的坑

| 症状 | 真正的原因 | 处理 |
|---|---|---|
| `TypeError: open() got an unexpected keyword argument 'metadata_errors'` | faster-whisper 1.2.x 调用了新版 PyAV 已改名的参数 | 不要降级 PyAV；用 `asr_chunks.py`（`wave` 解码后传数组） |
| `ValueError: '0' is not a valid language code` | 参数顺序写错，把 chunk 序号当成了语言 | `--lang en --jobs 4`，语言在 jobs 之前 |
| `UnicodeDecodeError: 'gbk' codec` | Windows 控制台用 GBK 解 ffmpeg 的 UTF-8 stderr | 所有 `subprocess` 都带 `encoding="utf-8", errors="replace"` |
| `output has 12345 frames, expected 12343; not published` | 渲染器边渲染边混音时用 `-count_packets` 校验，ffmpeg 7.x 会多算 2 个包 | 去 `--audio` 渲染画面，`mux_audio.py` 合成；文件本身的 `nb_frames` 是对的 |
| 字幕把 `SpaceX` 断成 `Spac / eX` | 逐字符换行 | 用 `stage.js` 的 `tokens()`，拉丁词整体换行 |
| 长句字幕被截掉最后一行 | 固定三行、固定字号 | 30→27→24px 自动降字号，仍超就改稿 |
| 课件「看着没问题」但打开后文字出框 | 只看了设计稿，没做同源镜像测量 | `render_deck.py` 必须 PASS；它报告 `dy/dx` 像素 |
| 成片比时间轴短 1–2 秒 | 混音用了旧的 `timings.json`，或手改了 `timeline.js` | 重跑 `build_timeline.py`；`timeline.js` 是生成物 |
| `edge_tts` 429 / 超时 | 网络或服务限流 | 已完成段有缓存，原命令重跑；`--force` 会全部重做 |
| 口播听起来「赶」 | 稿子塞满（>6.8 字/秒） | 删字；不要改 `rate`，变速会改变语气 |

## 不要做的事

- 不要为了「跑通」把 `check_transcript.py` 的阈值放宽。缺口留在稿子里，后面每一页都会继承它。
- 不要在 `timeline.js` 里手改 DUR。它是 `build_timeline.py` 的输出；要改片长就改 `narration.json` 或 `--gap`。
- 不要把镜像渲染的 PNG 说成「PowerPoint 渲染」。交付说明里写清工具，比含糊更可信。
- 不要在 `render_deck.py` 报错时删掉报错继续往下做。溢出的那一页，在成片字幕里也会溢出。
