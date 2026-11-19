# 一次真实交付的实测记录

这一页是证据，不是教程。数字来自 2026-11-17 的一条真实交付，换片子要重测。

## 源

| 项 | 值 |
|---|---|
| 视频 | `BV1VNes61EvX`《AI复杂运镜怎么做？Codex × Blender，从白模预演到生成的实战拆解》 |
| UP 主 | T7丨第七变量 |
| 时长 | 522 秒（8:42） |
| 公开接口给的流 | video id 32 / audio 30280，852×480，22.0 MB mp4 |
| 简介里的自述限制 | 换弹与门内开火未实现；4K 是增强与后期，不是原生生成 |

## 转写

| 项 | 值 |
|---|---|
| 模型 | faster-whisper `large-v3`，int8，CPU，一次一段 |
| 分段 | 115 秒 × 5，最后一段 62 秒 |
| 语言门 | 不指定语言，由模型判定；结果 zh，`p=1.000` |
| 产出 | 206 行，2897 字 |
| 耗时 | 单段约 2–3 分钟（32 核机器，单进程） |

`small` 试跑过一次：把 Seedance 听成 Cdance、GPT-6 Astra 听成 GBT6 extra，混进繁体字。
所以默认 `large-v3`，`small` 只能用来判断“这段有没有人声”。

### FunASR 备选路径（2026-11-17 实测）

同一支片子用 `--engine funasr`（paraformer-zh + fsmn-vad + ct-punc，CPU）重跑：

| 项 | large-v3 | funasr |
|---|---|---|
| 耗时 | 约 25 分钟 | 3 分 18 秒（RTF 0.056） |
| 行数 / 字数 | 206 / 2897 | 232 / 3135（带标点） |
| 首句 | `这段一镜到底的视频是使用 Seedance 2.5 720p 一次性生成的` | `这段移镜到底的视频是使用 c dance 二点五七二零 p 一次性生成的` |

funasr 快 7 倍、自带标点，但专名和数字会塌（`白魔`、`移镜`、`c dance`）。
结论写进 SKILL.md：funasr 出草稿，large-v3 出交付。英文音频会被 funasr 写成中文，
脚本按 CJK 占比 < 50% 拒绝，已用一段英文 TTS 验证（exit 1）。

## 口播与成片

| 项 | 值 |
|---|---|
| 稿 | 12 段，929 个汉字 |
| 语音 | `zh-CN-YunyangNeural`，rate `+0%` |
| 实测 | 213.01 秒，4.36 字/秒 |
| 估算 | 929 ÷ 5.0 = 186 秒，偏差 +15%（在 20% 阈值内） |
| 时间轴 | 1.4 + 213.01 + 0.55×11 + 2.6 = 223.06 秒 |
| 成片 | 1920×1080 / 30 fps / 6692 帧 / 19.7 MB / h264 crf 18 + aac 192k |

渲染速度：6692 帧约 6 分钟，单帧约 0.05 秒（这张画布只有矢量图形，没有全屏位图）。
带全屏纹理层的页面会慢一个数量级，估算成本时按 0.14 秒/帧留余量。

## 闸门的实际输出

```text
$ python scripts/check_narration.py --selftest
good      -> PASS
bad num   -> ['s01 数字 99 不在逐字稿：…']
bad absol -> ['s01 绝对化判断没有口径：…']
bad dec   -> ['s01 数字 21000 不在逐字稿：…']
bad time  -> ['时间轴与稿不一致：s01 vs s01']
parse     -> PASS
bad trans -> ['逐字稿只有 0 行带时间码（至少 3 行）：…']
SELFTEST PASS

$ python scripts/check_frames.py reel/frames --expected 6692 --width 1920 --height 1080
frames=6692 sampled=[0, 1115, 2230, 3346, 4461, 5576, 6691]
stddev=[12.9, 20.01, 20.21, 25.8, 24.99, 14.76, 23.44]
consecutive diff=[4.91, 3.51, 6.81, 6.49, 7.18, 6.61]
changed% (stride=60 frames) median=1.653 min=0.012 max=11.472 still=1/25
PASS

$ python scripts/check_deck.py ppt/deck.pptx
PASS slides=14 size=13.33x7.50 in

$ python scripts/pipeline.py . --stage video
video OK 223.06s 1920x1080 30/1 19.7 MB

$ python scripts/pipeline.py . --stage verify
source  BV1VNes61EvX  AI复杂运镜怎么做？…  522s  852x480
reel    223.06s  12 段  30 fps  6692 帧
narration 929 字  4.36 字/秒
verify PASS
```

`still=1/25` 的那一对落在参考图卡片已经全部出现、平面图被压暗到 0.16 的段落里：
两秒内只有扫描线经过。它低于 0.02% 的“静止”线，但只占 1/25，在允许范围内。

## 这次踩到的坑

1. 同一条转写命令被启动了两次（后台写法重复），两个进程同时写 `chunk_02.txt`，
   内存翻倍、日志混在一起。`transcribe_all.py` 用 `.tmp` + 原子替换保证文件不半写，
   但“先查进程”仍要人做。
2. `transcribe_all.py` 一开始用 `ffmpeg -f null -` 的输出解析时长，这个输出在某些构建里
   是 `time=N/A`，直接崩。改成读容器头的 `Duration:`。
3. 课件预览一开始是第二套 HTML 版式，第一次跑就整页全黑（颜色常量没有 `#`），
   修好之后又与 pptx 版式不一致。最后改成从 pptx 真实几何生成，两个问题一起消失。
4. `ffprobe -show_entries format=duration,size` 在部分构建里不返回 `size`，
   成片大小改用 `os.path.getsize`。
5. 第一版成片几乎不动：两秒内只有 0.44% 的像素在变，肉眼像配了音的信息图。
   检查器先报 FROZEN（当时用的是 0.5 秒间隔的均值差，方向对、指标错）。补了三层运动
   ——±1.8% 的极慢推镜、视锥 ±10° 漂移、7 秒一次的扫描线——到 1.65%。
   同时把指标从“均值差”换成“变化像素占比”，因为平面图上一个小点移动，均值只有 0.03，
   占比却有 2%。

## 未验证

- 英文原片的转写路径（本技能只带中文脚本）。
- 没用 PowerPoint 打开过 `deck.pptx`：这台机器上没有 PowerPoint / LibreOffice，
  预览是对真实几何的近似，字体替换与断行未验证。
- 没有把成片放给第三方看片；画面判断来自逐帧抽检。

## 只做过一次

- 这份记录只覆盖一次完整交付。第二条片子没有跑过，所以“换个题材也能一次跑通”没有证据。
- `--engine funasr` 只在 Windows / CPU / torch 2.13 上跑过；GPU 与 macOS 未试。
- 课件只经 `deck_preview.py` 近似渲染核对，仍未用 PowerPoint 打开过。
