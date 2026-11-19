# 阶段门：每一步的输入、产出与放行条件

流程是七个门。门的价值不在顺序，而在于**没有通过就不能往下走**：一份缺块的逐字稿会让后面所有数字都不可靠，一页溢出的课件会让成片的字幕也照抄错误。

| 门 | 输入 | 产出 | 放行条件 | 不通过时 |
|---|---|---|---|---|
| G0 环境 | 无 | 依赖清单 | `python -c "import faster_whisper, edge_tts, pptx, playwright"` 与 ffmpeg/ffprobe/yt-dlp/node 都在 | 装依赖；不要用「先跑起来再说」绕过 |
| G1 取源 | 链接或本地文件 | `source/source.mp4`、`source.json` | 时长 ≥60 秒，有音轨，`actual` 尺寸已记录 | 换链接；多 P 改用 course-repack |
| G2 转写 | 音轨 | `transcript.txt`、`asr/*.json` | `check_transcript.py` PASS | 按报错重跑对应 chunk |
| G3 总结 | 逐字稿 | `notes/中文总结.md` | 5 个抽查数字都能找到时间码 | 回读原句，删掉没有出处的数字 |
| G3b 静帧 | 时间码 | `source/stills/*.jpg`、`stills.json` | 每章一帧；整批失败才停 | 查 `source.mp4` 是否可播 |
| G4 课件 | `deck/deck.json` | `.pptx`、`qa/slide-*.png`、`qa/report.json` | `render_deck.py` PASS，`overflow` 全空 | 删字或拆页 |
| G5 口播 | `reel/narration.json` | `timings.json`、`timeline.js`、`final.wav` | 无 `incomplete`；每段字速在带内；DUR ≤1200 秒 | 改稿，不改语速 |
| G6 成片 | 画面 + 混音 | `reel/out/final.mp4` | 时长与 DUR 差 ≤2 帧，有音轨 | 重跑 `mux_audio.py` |
| G7 验收 | 全部产物 | 两份 `report.json` | `qa_reel.py` 与 `selfcheck.py` 都 PASS | 按报告定位到具体 shot/slide |

## 三种常见改需求，各自的最短路径

- **只要总结**：做到 G3 停。不要为了「顺手」生成 PPT 和成片，那是几十分钟的算力。
- **只要成片、不要课件**：G4 可以跳过，但 G3 不能跳——口播稿是总结的口语版，没有总结就会在写稿时现编数字。
- **已经做完了要换一版口播**：只重跑 `tts_segments.py` → `build_timeline.py` → `mux_audio.py`，画面不必重渲。除非章节结构变了，`stage.js` 的 `beats` 也从 `narration.json` 来，改稿即改画面。

## 谁在什么时候看

- G3 之后必须由人读一遍总结：这是唯一能发现「转写把 Neuralink 写成了 Neuralinx」的地方。
- G4 之后必须由人看至少三张 PNG：第一页、内容最多的一页、收束页。
- G7 之后必须由人看 `reel/qa/stills/` 里每一章的静帧：检查字幕有没有压在进度条上、长句有没有被截断。

机器检查能证明的只有「文件符合时间轴」，不能证明「讲得对」。这两件事不要混着说。
