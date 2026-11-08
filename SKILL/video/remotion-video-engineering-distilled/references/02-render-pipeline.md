# 渲染与编码

> 专业整理：媒体渲染管线工程师。基线：本地资料中的 Remotion `4.0.532`。本次仅提炼资料，未运行渲染或重新核验上游源码。

**先按打包、浏览器、捕获、编码、封装分环定位，再对照 CRF 18 与 20、默认并发与 1；透明编码组合须在实际版本复验。**

## 1. 适用与不适用

适用于 React 合成导出视频/静帧、离线渲染排障、媒体探测与浏览器转码。不把云端分片策略、预览卡顿与离线渲染耗时混为一谈；浏览器转码能力也不等于 Node 渲染能力。

## 2. 输入、处理与输出

- 输入：入口、composition ID、props、尺寸/帧率/时长、素材、质量/体积/耗时目标及运行环境。
- 处理：配置 → 打包 → 服务 → 浏览器 → 选片 → 捕获 → 写盘 → 编码/音频 → 封装。
- 输出：媒体、元数据、阶段日志与验收记录。

## 3. 操作步骤

1. 固定版本，核对 composition ID、尺寸与时长，选择短段建立基线。
2. Node 侧 `bundle()` 选择 webpack/rspack，检查转译、资源解析及冷/热缓存。`browser-bundler` 用于 Studio 浏览器内打包，勿混淆。
3. `ensureBrowser` / `openBrowser` 处理浏览器缓存与 CDP 启动，检查 serve URL、可执行文件和 GL。容器先查沙箱；`--no-sandbox` 仅限受控环境，不常规关闭 Web 安全。
4. `parseMedia` 探测媒体；SeekingHints 和惰性索引可减少扫描，HLS 分片由 reader 提供。解析成功不代表可解码。
5. 用 `delayRender` 等待素材，检查 `premountFor` 预挂载；`renderFrames` 先验帧，核对 seek、首帧、同帧一致性与磁盘空间。
6. 完成编码、音频合并/变速及 mux，核验落盘。FastStart 前移 moov 改善起播，不加速编码；资料记载 ffmpeg/ffprobe 随 compositor 平台包分发。
7. `convertMedia` / `extractFrames` 前查询容器、codec 及 copy/re-encode 能力；同 codec 且容器兼容时优先 copy，否则明确接受重编码损失。

资料中的 WebCodecs 矩阵为 MP4（H264/H265/AAC）、WebM（VP8/VP9/Opus）、WAV，不能套用 Node Codec 全集。完整签名、浏览器支持与默认行为须查目标版本。

## 4. 关键参数与平台边界

非默认值仅为实验建议，不是通用最优值。

| 参数 | 分册默认 | 实验对照与来源 |
|---|---|---|
| codec | `h264` | 保持基线；03 §2 |
| H.264 CRF | `18`，范围 1—51 | 对照 `20`，检查画质/体积，耗时不保证；03 §3 |
| pixelFormat | `yuv420p` | 保持；03 §4 |
| 中间帧/静帧格式 | `jpeg` / `png` | 保持；03 §5 |
| concurrency | `round(min(8,max(1,C/2)))` | 另测 `1`；03 §6 |
| 其他 | 资料未完整给出默认 | JPEG 质量、色彩空间、GL、Chrome 版本待查 |

C 为资料中 `os.availableParallelism()` 与 `nproc` 的最小值；百分比并发用 `floor(C×p/100)`。原生件须匹配平台/架构及 Linux glibc/musl；GL 依平台和 Chrome。

## 5. 故障定位与检查清单

按渲染链路定位：配置/转译 → 服务/启动/GL → 选片 → 素材就绪/捕获/写盘 → 编码/音轨/mux。超核数可能出现 `Maximum for --concurrency is N`。

| 特征 | 优先检查 |
|---|---|
| `VideoUndecodableError` / `AudioUndecodableError` | 解码与浏览器支持 |
| `ProResDecoderNotEnabledError` | 对应解码选项是否启用 |
| `IsAnUnsupportedFileTypeError` | 容器/文件类型支持 |
| SharedArrayBuffer 不可用 | 多线程转码所需 COOP/COEP 与跨源隔离 |
| Safari 转码失败 | 当前浏览器实际 codec 能力及降级路径 |
| Windows `ENAMETOOLONG` | 路径深度与文件名长度 |

检查清单：入口/ID/版本明确；素材就绪；短段可捕获；磁盘可写；平台二进制正确；编码与容器兼容；音画/时长/首帧通过；输出可访问。

## 6. 资料冲突与待确认

- 03 §4 写 VP8/VP9 不支持 `yuva420p`，§11 却列入透明视频组合。**本包不采纳该冲突组合，也不宣称 VP8/VP9 支持该像素格式。** alpha 与 PNG 中间帧的校验有资料依据，完整 codec 组合待查实际源码/类型定义并试渲染。
- 04 §2 将 `CREATE_WEBM_TIME_SCALE = 1_000_000` 称为“纳秒级，1e6”，单位表述错误。不得据此断言实际单位就是毫秒；具体单位、时间戳换算及容器约定未能确认。
- 12 步链路用于概念分诊，不把某阶段的导出清单当作已核实的导入路径。

## 7. 具体实验示例

配置片段，非完整命令：`{codec:'h264',crf:18,pixelFormat:'yuv420p'}`，其余沿用项目基线。同一短段运行 3 次取耗时中位数；仅改 CRF 为 20 复跑，再恢复 18、单独测试 `concurrency:1`。记录字节数、墙钟时间、峰值内存，核对时长/音轨/首帧，不预设节省比例。

## 8. 来源映射

- `03-render-pipeline.md`《03 · 渲染管线与编码》：§2 → `packages/renderer/src/codec.ts`；§3 → `packages/renderer/src/crf.ts`；§6 → `packages/renderer/src/get-concurrency.ts`；§8 → `packages/bundler/src/bundle.ts`；§10 → `packages/renderer/src/finalize-fast-start.ts`。
- `04-media-webcodecs.md`《04 · 媒体解析与浏览器内转码》：§1 → `packages/media-parser/src/state/`；§2 → `packages/webcodecs/src/create/timescale.ts`；§5 → `packages/webcodecs/src/undecodable-error.ts`。
- `01-architecture.md` §4：渲染主流程。

以上路径均来自本地分册，非本次上游源码核验。
