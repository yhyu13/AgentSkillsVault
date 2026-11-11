# 素材、字幕与音效

> 专业整理：素材字幕与音效工程师。基线：Remotion `4.0.532` 本地技术分册；未读取上游源码、未运行示例。

**核心结论：字幕以毫秒保存、按 fps 换算帧；ASR 先按离线/联网与硬件选路线；远程音效、模型、GIF 分别处理就绪与缓存。**

## 1. 适用与不适用

适用：SRT 解析/导出、逐词高亮、音频字幕对齐、ASR 路线选择、TTS 素材接入、音效、GIF、媒体元信息和预加载。

不适用：仅凭库名保证中文分词、识别精度、离线可用或音画同步；`@remotion/brand`、`@remotion/design` 是资料中的内部参考目录，不是面向用户的 API。

## 2. 输入、处理与输出

- 输入：视频/音频/GIF、SRT 或词级时间戳、fps、字幕样式、音效清单。
- 处理：探测元信息 → 素材准备 → 字幕解析/识别 → 时间对齐 → 渲染就绪 → 音画验收。
- 输出：合成与字幕数据、可离线素材清单、最终视频及同步检查结果。

## 3. 可执行步骤

1. 用 `media-utils` 探测时长、尺寸及音频数据；用 `media-parser` 读取媒体信息。
2. 用 `captions` 的 `parseSrt`、`serializeSrt` 处理字幕；`createTikTokStyleCaptions` 生成逐词效果，`ensureMaxCharactersPerLine` 控制断行。
3. 统一毫秒与帧号；确认时间戳是绝对时间还是相对片段，避免重复加偏移。
4. 根据下表选择 ASR；首次模型加载需纳入素材就绪流程。
5. 音效用 `@remotion/sfx` 的托管 URL；离线时下载有使用权的副本并通过 `staticFile()` 引用，同时处理字体与字幕素材。
6. GIF 通过 `<Gif>`、`useCurrentGifIndex` 接入；检查 `QuickLRU`、`volatileGifCache` 的缓存行为与循环控制。
7. 用 `preload` 提前加载浏览器素材；检查首帧、末帧、词高亮、音效峰值、GIF 循环与导出时长。

## 4. ASR 选型与平台边界

| 路线 | 资料记载机制 | 选择边界 |
|---|---|---|
| `whisper-web` | 浏览器内 WASM/Whisper | 适合离线、隐私优先；模型下载、兼容性与性能需实测 |
| `whisper-webgpu` | 浏览器 WebGPU | 需硬件/浏览器支持；失败可回退 `whisper-web` |
| `install-whisper-cpp` | 本地 whisper.cpp/CPU | 安装、模型、CPU 与内存成本需评估 |
| `openai-whisper` | 上传音频到 API | 需凭据、联网与费用；先确认数据授权 |
| `@remotion/elevenlabs` | TTS 集成 | 是语音合成，不替代 ASR |

资料中的“更快”“最高精度”不是通用实测结论；模型、语言、硬件、服务版本会改变结果。首次模型加载可使用 `delayRender()` 管理就绪，但不能在视频每一帧重新发起转写。

## 5. 常见陷阱与检查清单

- **单位混用**：`startMs/endMs/timestampMs` 是毫秒，不是帧号。
- **中文断行**：字符数限制不等于中文语义分词；需检查断句、可读性与标点。
- **远程依赖**：内置音效是 URL；模型、字幕、字体也须检查网络与离线方案。
- **预加载语义**：`preload` 面向浏览器；headless 渲染资源管理是另一条路径，不能仅凭预加载成功判定可渲染。
- **解码成本**：长 GIF 可能成为性能瓶颈，循环控制不能替代缓存测试。

检查项：时间基准一致、偏移仅处理一次、中文断行合理、模型就绪、音效授权、离线素材齐全、首尾无空白、音画同步、GIF 循环正确、导出时长符合目标。

## 6. 输入与输出示例

这是转换口径示例，不是完整可运行代码。假设两条词字幕以同一音频起点为零：

| 词 | `startMs` | `endMs` | `timestampMs` | 30fps 下换算的帧区间 |
|---|---:|---:|---:|---|
| Hello | 0 | 120 | 0 | `[0,4)`，4 帧 |
| world | 120 | 400 | 120 | `[4,12)`，8 帧 |

输出字幕轨、素材清单及 12 帧/0.4 秒的时间轴；验收相邻词边界、音轨起点与最后一帧。毫秒换算使用 `frame = ms * fps / 1000`，实际显示还需明确取整、半开区间与越界策略；不要直接以小数帧调用 seek。

## 7. 来源映射

- `references/09-assets-captions-sfx.md`：§1 字幕、§2 音效、§3 ASR/TTS、§4 GIF、§5 预加载、§6 元信息、§8 内部目录边界、§9 陷阱。
- `references/02-core-authoring.md`：§1 帧模型、§3 Sequence、§4 interpolate、§8 静态资源与渲染就绪。
- `references/12-faq-troubleshooting.md`：§A、§H、报错字典。

资料引用的上游位置包括 `packages/captions`、`packages/sfx`、`packages/whisper-web`、`packages/whisper-webgpu`、`packages/install-whisper-cpp`、`packages/openai-whisper`、`packages/elevenlabs`、`packages/gif`、`packages/preload`、`packages/media-utils`、`packages/core/src/delay-render.ts`。这些路径来自分册，并非本次源码复核结果。
