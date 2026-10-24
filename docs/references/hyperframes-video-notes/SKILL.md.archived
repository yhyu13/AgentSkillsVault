---
name: hyperframes-video
description: 用 HyperFrames（HeyGen 的 HTML→MP4 引擎）在本仓做视频时调用——写 composition、用 GSAP 编排时间轴、加字幕/配音/音频响应动效、预览、逐帧验收、出片，或把已有的 Remotion / Motion Canvas / Lottie / Three.js / Manim / Blender 素材搬进 HyperFrames。也用于判断"该用 HyperFrames、Remotion，还是本仓现有的 Python+ffmpeg 管线"。若只是改现有 6 支讲解视频的稿子/字幕，不要用这个 skill。
---

# hyperframes-video · 本仓的 HTML→视频路线图

## 何时调

- 要**新做**一支视频（讲解片、产品片、竖屏短片），且想要"HTML 即源码、渲染即确定"
- 要给视频加**字幕/配音/音乐卡点/音频响应动效**
- 要把 **Remotion（或其他引擎）的现有代码**搬进 HyperFrames 并逐帧比对
- 拿不准该用 HyperFrames / Remotion / 本仓现有 `tools/video/pipeline.py`

## 零、先记住本仓的物理事实

| 事实 | 位置 | 影响 |
|---|---|---|
| 本仓**已有**一条能跑的视频管线 | `tools/video/pipeline.py` | 解析稿 md → Edge TTS 逐句 → 真实词级字幕时间戳 → HTML 每场 1920×1080 无头 Edge 截图 → numpy 配乐 → 按语音能量闪避混音 → **音频实测**定时 → 逐帧几何插值 → libass 烧字幕 → 时长/命中/抖动校验 |
| **渲染层已改用 HyperFrames** | `tools/video/hyperframes/`（`template/` 模板 + `render.ps1` 包装 + `README.md`） | 出帧与编码交给 HyperFrames；稿子/TTS/字幕/混音仍在 Python 侧 |
| 6 支讲解视频已跑通 | `videos/`、`docs/拼版/` | 换栈 = 重做渲染层，不是从零；**现有片子不动** |
| 资产红线 | `AGENTS.md` §13.1 | 纯文本可 diff；大二进制不入库 |
| 本机环境已实测 | `references/调研与安装.md` §三、§四 | Node 22.14 ✅ / ffmpeg+ffprobe 9.0.2 ✅ / 浏览器 = **Microsoft Edge 156.0.4314.42** ✅ |
| 上游 7 个 skill | `.kilo/skills/{hyperframes,hyperframes-cli,hyperframes-registry,remotion-to-hyperframes,slideshow}/` 已装；`media-use`、`figma` 未装（原因见 §六） | 装的是"工程契约 + CLI + 组件目录 + Remotion 迁移"四件套 |

## 一、选型：三条路，别混着走

| 场景 | 选谁 | 一句话理由 |
|---|---|---|
| 改现有讲解视频的**稿子/字幕/口播** | 本仓 `tools/video/pipeline.py` | 已经跑通，别为了换栈重做 |
| 新片、且要**动效编排 + 逐帧可验 + 组件复用** | **HyperFrames** | 时间轴是数据不是代码副作用，改一行重渲一行 |
| 已有 **Remotion 工程**要迁过来 | HyperFrames + `remotion-to-hyperframes` | 先 lint 源文件定 blocker，再逐帧 SSIM 比对 |
| 只要 15 秒概念片 | **纯 HTML + Canvas/WebGL 逐帧** | 什么都别装（业内已验证的做法，见调研文档 §二） |

## 二、HyperFrames 的硬契约（违反就渲染不出来）

摘自 `hyperframes/SKILL.md`，**本仓必须遵守的 8 条**：

1. 每个定时元素要有 `class="clip"` + `data-start` + `data-duration`（秒），显示区间是 `[start, start+duration)`
2. 片长 = 根节点的 `data-duration`；超时会被截断，提前结束会停在最后一帧
3. 每个 composition 建一条**暂停的**时间轴，tween 注册后写 `window.__timelines["<data-composition-id>"] = tl`
4. 禁止 `Date.now()`、无种子的 `Math.random()`、网络请求、定时器、`repeat: -1` —— **画面必须是时间轴时间的纯函数**
5. 禁止在 `.clip` 上 tween `display/visibility/autoAlpha`；动子元素
6. 不要用 CSS `transform` 去覆盖 GSAP 要动的元素；动 transform，别动 `left/top/width/height`
7. 媒体不许 `play()/pause()/seek`；`<video>` 要保留声音就 `data-has-audio="true"`，否则 `muted`
8. 资产路径**根相对**（`assets/...`），子 composition 里也一样

**本机实测补充的三条（2026-10-24 渲染时踩到）**：

- **根 composition 也要注册时间轴。** 只给子场景注册、根不注册，`check` 直接报 `Missing window.__timelines registration`。
- **`.clip` 会被引擎移出普通流。** 写成 flex 居中，所有 clip 会叠在一起（第一次渲染标题和副标题压成一团）。给 `.clip` 写 `position: absolute`，坐标自己定；场景根用 `inset: 0`，别写死像素。
- **host 的 id、场景的 `data-composition-id`、时间轴 key 三者必须一致。** 不一致时每个场景会等 45 秒再显示静帧。

## 三、命令阶梯（每一步都有闸）

```powershell
npx.cmd hyperframes init <dir>              # 起项目
npx.cmd hyperframes lint                    # 写完第一遍就 lint
npx.cmd hyperframes check --json            # 闸：lint + runtime + layout + contrast，error 必须清零
npx.cmd hyperframes snapshot                # 看帧（PNG 落在 .hyperframes/artifacts/snapshots/）
npx.cmd hyperframes preview --background    # 浏览器里看，URL 要回 200
npx.cmd hyperframes render --quality looks --output out.mp4   # draft 迭代 / delivery 终版
```

**本仓已封装好一条命令**，会先 check 再 render，最后用 ffprobe 核对时长与分辨率：

```powershell
powershell -ExecutionPolicy Bypass -File tools\video\hyperframes\render.ps1 `
    -ProjectDir work\hyperframes\片名 -Output renders\片名.mp4
```

模板在 `tools/video/hyperframes/template/`，用法见 `tools/video/hyperframes/README.md`。

Windows 注意：

- `npx` 在 PowerShell 被执行策略挡，**用 `npx.cmd`**
- 渲染完必须核 `ffprobe` 时长 == 根 `data-duration`，再抽帧看
- 渲染超过工具超时就设 `HYPERFRAMES_RENDER_DETACHED=1` 放后台等日志，**不要 `pgrep -f`**（会匹配到自己）
- 30 秒片子大约 1–2 分钟，前台跑就行
- **`.ps1` 带中文必须存成 UTF-8 with BOM**，否则 PowerShell 5.1 按 ANSI 读，脚本直接解析失败

## 四、浏览器：已配成 Microsoft Edge

**本仓不用 chrome-headless-shell，用本机的 Edge**：

- **路径：** `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`（版本 156.0.4314.42），已写进用户级环境变量 `HYPERFRAMES_BROWSER_PATH`。
- **代价：** 常规浏览器构建没有 `HeadlessExperimental.beginFrame`，引擎退到**截图采集路径**，慢一些但结果一样确定。走这条路时 `--resolution` 放大到 4K 用不了。
- **实测：** 8 秒 1920×1080 片子，240 帧，4 worker，Edge 上渲了 15 秒。
- **换回快速路径：** `npx.cmd hyperframes browser ensure` 拉固定版本 chrome-headless-shell（约 150 MB）。

其余环境已就绪：Node v22.14.0 ✅ · ffmpeg 9.0.2 ✅ · ffprobe 9.0.2 ✅ · 32 核 / 64 GB / 819 GB 空闲 ✅

**可选**（不装也能出片，只是没有本地能力）：Docker（`render --docker --strict`）、Kokoro TTS（本地配音）、MusicGen（本地配乐）、whisper.cpp（转写）。这些是 Python 侧依赖，别为了"看起来齐全"就装。

**遥测**：`hyperframes telemetry disable` 可关；默认只收匿名用量，**不收文件路径与 composition 内容**。

## 五、要不要 MCP？现状调研结论

**现在没有"HyperFrames MCP server"给你我这种客户端直接连。** 官方口径是"CLI 就是 agent 接口"：flag 驱动、纯文本输出、fail-fast、多数命令带 `--json`——比 MCP 更适合脚本化调用。

真正存在的 MCP 相关物：

| 形态 | 是什么 | 现状 |
|---|---|---|
| **WebMCP**（W3C 规范，Origin Trial 阶段） | 浏览器原生 Model Context Protocol；Studio 往 `document.modelContext` 注册工具，让**浏览器里的** agent 直接操作时间轴 | 规范未稳定，Studio 只注册自己那部分；`packages/studio/src/webmcp/` |
| **Figma MCP** | 把 Figma 设计上下文接进来生成动效 | `hyperframes figma` 命令，需要 Figma 侧 MCP server |
| **外部 CDP attach** | `preview`/`play` 可挂到外部 Chromium 的 CDP 端点，接 Playwright / Puppeteer / browser-MCP | HyperFrames **不**自带 CDP 自动化，只暴露端点 |
| **外部视频模型 MCP**（如 Runway） | 让 Opus 当导演、Runway 出镜头，HyperFrames 只做剪辑包装 | 生态做法，不在本仓默认范围内 |

**判断**：本仓暂不接 MCP。真要接，优先顺序是 ① CLI + `--json`（够用且零成本）→ ② 外部 CDP + Playwright 做自动审片 → ③ WebMCP（等规范稳定）。理由写在 `references/调研与安装.md` §五。

## 六、没装的上游 skill，以及为什么

| skill | 状态 | 理由 |
|---|---|---|
| `media-use`（116 文件 / 1.9 MB） | ❌ 未装 | 含 ~1 MB 的 mp3 音效与 LUT 二进制，与 `AGENTS.md` §13.1（纯文本资产）冲突；且本仓已有 Edge TTS + numpy 配乐 + 混音链路，功能重叠 |
| `figma`（2 文件） | ❌ 未装 | 需要 Figma MCP + 设计上下文，本仓没有 Figma 资产 |
| `hyperframes/assets/frame-presets`（13 套 / ~990 KB） | ❌ 未装 | 按 `hyperframes/references/look.md` §Presets，这些是**幻灯片 deck 外观**，只在明确点名或做 deck 时用，不做兜底；含二进制字体 |
| `nexu-io/open-design` 的 hyperframes 模板 | ❌ 未装 | SKILL.md 与 OpenDesign daemon 强耦合（`$OD_PROJECT_DIR`），且与已装的 `hyperframes` **同名冲突**；它的排版/转场/动效参考值得单独读，见调研文档 §二 |

## 七、什么时候**不**用

- 只是改讲解稿、字幕、口播 → 本仓 `tools/video/pipeline.py`
- 要的是一张动效海报/封面图 → 不是视频，用 `taste-imagegen-*` / `anatomy`
- 要的是演示 web app → `mock-devops-platform` 那套（单文件 HTML），不是视频
- 交付物是"能点的原型"而不是"能播的片子" → 同上

## 八、来源

- 上游：`github.com/heygen-com/hyperframes`（Apache-2.0），已 clone 逐字读；装入 5 个 skill，commit 见 `references/调研与安装.md` §一
- 生态与提示词：`blog.cosine.ren/post/opus-5-5-motion-video-resources`（个人博客，3 级，仅供参考）
- 本仓纪律：`AGENTS.md` §13 硬性红线、§6 闸、§12 必须停下来的事
