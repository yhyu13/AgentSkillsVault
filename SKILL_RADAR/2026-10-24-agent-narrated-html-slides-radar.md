# SKILL_RADAR · Agent 单文件 HTML 幻灯片（带 TTS 朗读 / 自动播放 / Skill 形态）Top 20 调研笔记

- 调研日期：2026-10-24
- 主题：能被 coding agent（Claude Code / Codex / Cursor / OpenClaw 等）驱动，产出**单文件 HTML 幻灯片**，并带 **TTS 朗读 / 自动播放 / 自动进片** 能力的项目
- 数据来源：GitHub REST API（`GET /repos/{owner}/{repo}` + `GET /search/repositories`）实时拉取 + 各仓库 README 原文关键词命中与逐句摘录
- 星标快照：2026-10-24（`★` 全部为 `GET /repos/{owner}/{repo}` 当日直取值）
- 姊妹文件：`2026-10-24-agent-narrated-html-slides-radar.csv`（同数据表格版）

> **English rephrase.** "Find the twenty most-starred GitHub projects where an AI coding agent builds single-file HTML slide decks that read themselves aloud via text-to-speech and advance automatically, and write the findings into research notes."

---

## 0. 结论先行

1. **星标与"朗读能力"几乎完全脱钩。** 单文件 HTML 幻灯片生态的顶流（`frontend-slides` 31.2k★、`guizang-ppt-skill` 28.6k★、`html-ppt-skill` 8.8k★、`beautiful-html-templates` 4.8k★）**README 里没有任何 TTS / 语音合成关键词**——它们只做"好看的静态稿 + presenter notes"。真正带朗读闭环的是 `huashu-design`（26.1k★，但 TTS 是可选云能力）之后的一串 400★ 以下的小项目。
2. **TTS + 自动播放 + 单 HTML + Skill 四项全中的只有 8 个**（严格子集见 §3）。最高星的是 `glebis/claude-skills` 的 `present` skill（400★，ElevenLabs 配音 + 按 `max(audio+2s, read_time)` 自动进片）。
3. **工程上最成熟的两个实现是 `decklight`（5★）和 `open-deck-org/opendeck`（3★）**：两者都做了"笔记即脚本 → 语音 → 字幕 → 自动进片 → 导出离线单 HTML"的完整闭环，并且明确把 Skill 分发（`skills [agent…]`、`npx skills add`）当产品卖点。**星少不代表弱——它们是这一细分形态里唯一把 contract 写进 SPEC.md 的。**
4. **免费路线已经成熟到不需要 ElevenLabs**：`imjasonh/marptalk`（8★）用浏览器 `SpeechSynthesis` 作兜底；`huseyingayiran/visual-learner`（1★）自动探测 Kokoro → edge-tts → Piper → 静默虚拟时钟四档；`open-deck-org/opendeck` 把 API key 留在浏览器 session、只把生成的音频烘进 HTML。
5. **最大的结构性缺口是"agent 写 HTML 幻灯片"和"agent 出配音视频"两条线没有合流。** 高星一侧（`frontend-slides` 系）没有 TTS；配音一侧（`video-production-skill` 105★、`xiaoma-studio` 17★、`video-claw` 17★）输出的多是 **MP4 而非可交互 HTML**。`visual-explainer`（10.6k★）和 `huashu-design`（26.1k★）是少数两头都沾的项目。
6. **对 vault 的建议**：不要去卷"又一个单文件 HTML 幻灯片 skill"（已有 30+ 个）。真正值得抄的是 **`decklight` 的 notes-as-script 契约 + `opendeck` 的音频烘焙导出 + `visual-learner` 的免费 TTS 引擎探测链**，合成一条 `narrated-deck` skill。

---

## 1. 榜单口径

| 维度 | 判定规则 |
|---|---|
| 收录 | ① 可被 coding agent 驱动（SKILL.md / skill 包 / CLI / MCP / agent 原生仓库）；② 产出 **HTML 幻灯片**（单文件或可 bundle 成单文件）；③ 具备 **TTS 朗读** 或 **自动播放/自动进片** 至少一项 |
| 排除 | 纯 PPTX 路线（除非同时提供 HTML）；纯 GUI 演示软件；纯视频生成模型仓库；纯模板库（无 agent 逻辑）→ 模板库进 §4 参考表 |
| 排序 | 主榜按 `stargazers_count` 降序（★ 反映关注度，不等于功能完备度）；另给"严格四合一"子集（§3）与"高星无朗读"对照表（§4） |
| 附加字段 | License / 最后 push / Skill 形态 / 输出形态 / TTS 引擎 / 自动播放 / 离线单文件 |
| 证据等级 | ★ 与 push 时间为 `GET /repos` API 直取；功能描述为 README 原文关键词命中 + 逐句摘录（**自述，未经实跑验证**） |

---

## 2. Top 20 榜单（按 ★ 降序）

| # | 仓库 | ★ | 最后 push | Skill 形态 | 输出 | TTS / 朗读 | 自动播放 | 关键证据（README 原文） |
|---|---|---|---|---|---|---|---|---|
| 1 | `alchaincyf/huashu-design` | 26,060 | 2026-10-23 | Skill（`npx skills add`），20 种设计哲学 | HTML deck + 可编辑 PPTX + MP4 | ✅ 豆包 TTS 配音（可选云能力） | ▶︎ 导出 MP4 走时间轴 | "核心链路（设计→渲染→MP4/PDF/PPTX导出）100%本地运行…云能力（豆包TTS配音、AI看片评审）全部隔离在 `scripts/cloud/`，完全可选" |
| 2 | `nicobailon/visual-explainer` | 10,614 | 2026-10-20 | Skill（slash 命令 `/generate-video`） | HTML 页 / slide deck → 叙述版 MP4 | ✅ 语音片段（voice clips，`video.md` 契约） | ▶︎ 录制回放 1080p | "`/generate-video` | Generate a narrated MP4 explainer"；"Local renderer (needs ffmpeg, Chrome, and `playwright-core`)" |
| 3 | `arcsin1/oh-my-ppt` | 2,171 | 2026-10-23 | Skill（本地优先，离线） | 单文件 HTML + 本地编辑器 | ❌ 未见朗读功能（TTS 仅出现在赞助商表格） | ✅ 元素级入场动画自动/点击触发 | "在编辑模式中直接选中单个元素…调整自动播放或点击触发、动画时长和进入方向" |
| 4 | `glebis/claude-skills`（`present` 子技能） | 400 | 2026-10-23 | Skill 包（Claude Code / Codex / OpenCode，92 个 skill） | 单 `index.html` + 音频目录，双模式（article / slides） | ✅ ElevenLabs voiceover | ✅ 自动进片 | "`slide_duration = max(audio_duration + 2s, read_time)`…After narration ends, it waits for any remaining read time plus a 2-second buffer, plays a transition sound (1.8s), then advances to the next slide" |
| 5 | `hiyeshu/codeck` | 199 | 2026-08-08 | Skill 房间模型（`/codeck` → outline/design/review/speech/export 五个 channel） | 单个自包含 HTML | ⚠️ speech channel 产出逐字稿（朗读由谁执行未核实） | ❌ 未见 | "Each codeck skill enters that room as a channel: outline, design, review, speech, and export" |
| 6 | `Sven-LI-sankyuu/presentation-skills` | 176 | 2026-07-29 | Skill 集合（Codex CLI 为主） | 可编辑 PPT + 网页 demo 视频 | ✅ 分段配音 + 字幕 | ▶︎ 时间轴合成 | "`web-demo-video-synthesis` produces narrated, subtitled, publishable videos…Splits scripts, segmented voiceover, timeline, browser recording, subtitles" |
| 7 | `speechlab0210/video-production-skill` | 105 | 2026-07-03 | Skill（Claude Code / Codex / Gemini CLI） | gpt-image-2 或 HTML 投影片 → MP4 + 字幕 | ✅ ElevenLabs + Whisper ASR 校验（相似度 ≥0.85） | ▶︎ FFmpeg 组装 | "每一句都經過 Whisper 語音辨識回譯驗證（相似度 ≥0.85 才過關）"；"字幕用原稿文字 + Whisper 詞級時間戳對齊" |
| 8 | `isomoes-video/md2video` | 33 | 2026-10-20 | agent-friendly 工作流（HyperFrames 渲染） | HTML/CSS 场景 JSON → 叙述视频 | ✅ 每页一段 narration MP3（`prompts/tts-prompt.md`） | ▶︎ 出片 | "turning source content into an animated, narrated video with HyperFrames"；"`prompts/tts-prompt.md`: generate one narration MP3 per slide from `script.json`" |
| 9 | `jinnyjiinlee/presenter-mode` | 22 | 2026-07-20 | 单文件组件（无 skill） | HTML 幻灯片 presenter view | ❌ | ✅ autoplay | "PowerPoint-grade presenter view for HTML slide decks — speaker notes, timer, ink, area zoom, break screen. One file, no install, works offline" |
| 10 | `crawfordxx/xiaoma-studio` | 17 | 2026-10-23 | Skill（动效 / 视频 / 幻灯片） | HTML 幻灯片 + 动效视频 | ✅ 多引擎：豆包 TTS / Fish Audio / ElevenLabs / Gemini TTS / MiniMax | ▶︎ 确定性渲染 | "配音：豆包 TTS（中文，支持逐字时间戳）、Fish Audio、ElevenLabs、Gemini TTS、MiniMax" |
| 11 | `amirfish1/video-claw` | 17 | 2026-10-15 | CLI | HTML + slide list → 叙述视频 | ✅ ElevenLabs → Deepgram → 免费 macOS 本地 TTS 兜底 | ▶︎ 烧字幕 | "if you have a key, else Deepgram, else free macOS local TTS — no config, no…"；"optional fal.ai lipsync, burned-in captions" |
| 12 | `imjasonh/marptalk` | 8 | 2026-01-05 | Node CLI（agent 可调） | Marp → 自播 HTML | ✅ Google Cloud TTS；浏览器 `SpeechSynthesis` 兜底 | ✅ ▶ Start 自动播放 | "If an MP3 audio file is missing or fails to load, the browser will synthesize speech from the speaker notes"；"**▶ Start**: Begin automated playback" |
| 13 | `hawkymisc/daida-ai` | 7 | 2026-04-21 | Claude Code Plugin | **PPTX** + 内嵌音频 + 自动播放 | ✅ `edge`（默认）/ `voicevox` | ✅ 自动进片（仅 PowerPoint 桌面端） | "auto-generates narrated slide decks (outline → PPTX → TTS audio → slideshow)"；"Auto-advance…only works in PowerPoint"；"Pronunciation dictionary auto-corrects common TTS misreadings" |
| 14 | `shaharsha/claude-skills` | 5 | 2026-10-20 | Skill 三段式编排 | **PPTX** + 音频 + autoplay | ✅ ElevenLabs（人工先审稿再合成） | ✅ PowerPoint autoplay | "deck (pptx) ──▶ narration (audio + autoplay pptx) ──▶ video (mp4)"；"human approves scripts BEFORE TTS" |
| 15 | `apppplepie/barevid` | 5 | 2026-08-31 | 自托管流水线（页级 Agent、可观测 DAG） | 动画幻灯片 / 分享链接 / MP4 | ✅ TTS voiceover + 字幕 | ✅ 定时播放 | "文稿 → 分镜 → 配音 → 动画 → 字幕 → MP4；可观测 DAG、页级 Agent、版本回滚与失败恢复"；"timed playback with **TTS voiceover**, **subtitles**, and animated slides" |
| 16 | `decklight/decklight` | 5 | 2026-10-24 | Skill（`decklight skills [agent…]`）+ npm CLI + SPEC.md | 单 HTML（`bundle` 可合一文件） | ✅ TTS 读 notes，支持 `[pause]`/`[click]`、ElevenLabs v4 音频标签、字幕 | ✅ auto-advance | "Text-to-speech reads your notes in sync with the builds…Captions and auto-advance come with it"；"`check deck.html` — lint it headlessly: clipped slides…`[click]` beats out of step with the builds" |
| 17 | `open-deck-org/opendeck` | 3 | 2026-10-11 | SKILL.md 标准（Claude / OpenCode / Codex / Antigravity） | 单 HTML（烘音频）+ 可选 `.deck` 包 | ✅ ElevenLabs（浏览器内生成，key 不落盘） | ✅ Auto-play 免手模式 | "Auto-play — Hands-free: reveal a step, play its clip, advance when it ends."；"one self-contained `.html` that narrates offline, anywhere, with no key and no companion files" |
| 18 | `huseyingayiran/visual-learner` | 1 | 2026-07-16 | Claude skill | 单 HTML（双声线 + 字幕 + 术语卡） | ✅ Kokoro / edge-tts / Piper / 静默虚拟时钟 四档探测 | ✅ 虚拟时钟驱动 slides + captions | "auto-detects a free TTS engine, best first…Kokoro (mlx-audio) → edge-tts → Piper → none (silent mode: virtual clock drives slides + captions)" |
| 19 | `MediaPlural/rendermill` | 0 | 2026-10-23 | CLI（MIT fork of video-claw） | HTML slides + TTS → MP4 | ✅ ElevenLabs | ▶︎ hook gates + 时间轴 | "Narrated slide-video renderer: HTML slides + TTS narration → MP4, with hook gates, captions, clip cuts, and a spend-ceiling batch lane" |
| 20 | `gRAYESS123/storyboard-claude` | 0 | 2026-10-05 | Skill（`/storyboard` 四阶段 chain） | 自包含 1920×1080 HTML（可录屏 / 可渲染 MP4） | ✅ ElevenLabs（可选，词级时间戳） | ✅ 音频时钟驱动动画 | "Animations sync to your voice-over by **audio clock**, not by counting frames"；"`/storyboard generate` — opt-in ElevenLabs call that renders the MP3 + word timestamps" |

### 榜外但强相关（★ 数不足、形态略偏，或在本轮 README 核验中确认"无朗读"）

| 仓库 | ★ | 为什么值得看 / 为什么落榜 |
|---|---|---|
| `DotIN13/beatsdeck` | 0 | beat 驱动的 TED 式引擎：每 beat 一段 TTS，Playwright 无头渲染 → 1920×1080@60 mp4 + 字幕 + 章节；**输出是视频不是 HTML 自播**，落榜于形态 |
| `grapeot/presentation_skill` | 4 | HTML 模式"无边框动画画布 + 摄像机"，卡片分裂、数字滚动，copy 精确留在 DOM；**无 TTS** |
| `noskillish/slides` | 72 | 极简单文件 HTML 框架 + 31 组件 + 3 主题 + `?edit` 编辑模式，AI 友好 AGENTS.md；**无 TTS** |
| `zhaodongyu/speaker-slides` | 0 | 中文单文件 HTML 演讲 skill，16:9 固定舞台 + 演讲者模式（双屏同步）；**无 TTS** |
| `carlosfrodrigues/silkscreen` | 21 | 同类"Markdown → 全屏 HTML"轻量 skill；**无 TTS** |
| `humantonylee/future-slide`（原 `bytonylee/future-slide-skill`） | 150 | 图像版 / HTML 版双模式切换（同一 content IR）；**README 的 narrat 命中是 "narrative arc"，无 TTS**，故移出主榜 |
| `rsarver/stella-decks` | 69 | `/design-setup` + `/narrative-review`；**narrat 命中是叙事评审，非朗读**，故移出主榜 |
| `kaisersong/slide-creator` | 53 | IR-first 工作流 + 22 预设 + 内联 SVG；**narrat 命中是 "planning depths / narrative"，无 TTS**，故移出主榜 |
| `prodigeproject/pradaslides` | 16 | 面向受众的沟通型 deck skill；**narrat 命中是 "narrative flow"，无 TTS**，故移出主榜 |

---

## 3. 严格子集：TTS 朗读 + 自动播放 + 单 HTML + Skill 形态，四项全中

只有 8 个仓库同时满足四条（TTS 朗读 + 自动播放 + 单 HTML 交付 + Skill 形态）。这是本主题的"真·Top list"（按 ★ 排序）：

| 仓库 | ★ | TTS 引擎 | 自动进片依据 | 单 HTML 依据 | Skill 分发 |
|---|---|---|---|---|---|
| `glebis/claude-skills`（present） | 400 | ElevenLabs（配合 `elevenlabs-tts` skill） | `slide_duration = max(audio+2s, read_time)` 后自动 advance | 单 `index.html` | Claude Code / Codex / OpenCode |
| `crawfordxx/xiaoma-studio` | 17 | 豆包 / Fish / ElevenLabs / Gemini TTS / MiniMax | 确定性渲染引擎驱动 | HTML 幻灯片 + 动效视频 | 任意 coding agent |
| `imjasonh/marptalk` | 8 | Google Cloud TTS；浏览器 SpeechSynthesis 兜底 | ▶ Start / Space 播放，▶⏸ 暂停 | `dist/index.html` 自播 | Node CLI（agent 可调） |
| `decklight/decklight` | 5 | TTS（ElevenLabs v4 默认，支持音频标签） | captions + auto-advance | `bundle` → 单文件 | `decklight skills [agent…]` + npm |
| `open-deck-org/opendeck` | 3 | ElevenLabs（浏览器内生成，key 不落盘） | Auto-play：step → 播片段 → 结束即进 | "one self-contained `.html` that narrates offline" | SKILL.md 标准，Claude/OpenCode/Codex/Antigravity |
| `huseyingayiran/visual-learner` | 1 | Kokoro / edge-tts / Piper / 静默虚拟时钟 | 虚拟时钟驱动 slides + captions | "one self-contained HTML file" | Claude skill |
| `MediaPlural/rendermill` | 0 | TTS（ElevenLabs） | hook gates + 时间轴 | HTML slides 输入 | MIT fork of video-claw |
| `gRAYESS123/storyboard-claude` | 0 | ElevenLabs（可选，词级时间戳） | 音频时钟驱动，Space 播放 | 自包含 1920×1080 HTML | `/storyboard` 四阶段 chain |

（`DotIN13/beatsdeck` 差一格：TTS + beat 自动推进齐备，但输出是 MP4 而非自播 HTML。）

**读法**：★ 从 400 一路掉到 0，说明"四项全中"是**小众高难度形态**——不是没人做，是愿意把"语音—构建步骤—字幕—进片"对齐到 beat 级的人很少。星少不代表弱，见 §4 对照。

---

## 4. 高星但无朗读能力（对照表，防止被星标误导）

| 仓库 | ★ | 形态 | 为什么没有 TTS |
|---|---|---|---|
| `zarazhangrui/frontend-slides` | 31,186 | Skill（16 主题，"show don't tell" 风格发现） | README 无任何 tts/speech/narrat/voice 关键词 |
| `op7418/guizang-ppt-skill` | 28,565 | Skill（电子杂志 / 瑞士风，WebGL 背景） | 仅命中"字幕"字样，无合成能力 |
| `zarazhangrui/beautiful-html-templates` | 4,849 | 纯模板库（32 套 × 3 张） | 模板库，不含运行时逻辑 |
| `open-slide/open-slide` | 9,389 | React 框架 + 两个 authoring skill | README **二次抓取确认**：命中 presenter mode / speaker notes，但无任何 tts/speech/narrat/voice 关键词 |
| `lewislulu/html-ppt-skill` | 8,815 | Skill（36 主题 / 15 套整 deck 模板 / 31 版式 / 47 动画） | 有 presenter mode + 逐字稿（speaker script），但无合成 |
| `archlizheng/frontend-slides-editable` | 537 | 可编辑 fork（拖拽改版） | 同上 |
| `humantonylee/future-slide` | 150 | Skill（图像版 / HTML 版双模式） | narrat 命中为 "narrative arc"，**非朗读** |
| `daniel-style/magic-slide` | 172 | Skill（FLIP Magic Move） | 命中 speaker notes / presenter window，无朗读 |
| `rsarver/stella-decks` | 69 | Skill（`/design-setup`、`/narrative-review`） | narrat 命中为叙事评审，**非朗读** |
| `kaisersong/slide-creator` | 53 | Skill（IR-first + 22 预设） | narrat 命中为 "planning depths / narrative"，**非朗读** |
| `Kuneosu/make-slide` | 137 | Skill（独立 HTML） | 命中 speaker notes + 演讲脚本，无朗读 |
| `pamelafox/presentation-skills` | 128 | Skill（演讲者/教师向） | 无朗读关键词 |
| `ToseaAI/awesome-html-slide-skills` | 176 | 索引（非实现） | 收录用，可作选型入口 |

**结论**：★ 榜前列几乎全是"**静态稿质量**"竞赛（主题数、版式数、反 AI-slop 检查、导出能力），朗读能力在它们眼里是**另一个维度**。若目标是"会自己讲话的幻灯片"，按星选型会选错。

---

## 5. 生态结构图

```
                       ┌─ 静态稿质量层（高星、无朗读）─────────────────────────┐
   agent 写 HTML ─────▶│ frontend-slides 31.2k ★ │ guizang 28.6k ★ │            │
                       │ html-ppt-skill 8.8k ★ │ beautiful-templates 4.8k ★      │
                       │ open-slide 9.4k ★ │ oh-my-ppt 2.2k ★                    │
                       └───────────────────────────────────────────────────────┘
                                          ▲ 视觉/版式可借鉴
                       ┌─ 朗读闭环层（低星、四项全中）────────────────────────┐
   agent + TTS ──────▶│ glebis/present 400★ │ marptalk 8★ │ decklight 5★        │
                       │ opendeck 3★ │ visual-learner 1★ │ rendermill 0★        │
                       │ storyboard 0★ │ beatsdeck 0★ │ xiaoma-studio 17★       │
                       └───────────────────────────────────────────────────────┘
                                          ▲ 音频工程可借鉴
                       ┌─ 视频产出层（旁白落地为 MP4）─────────────────────────┐
   agent 出片 ────────▶│ huashu-design 26.1k★ │ visual-explainer 10.6k★       │
                       │ video-production-skill 105★ │ video-claw 17★ │ barevid 5★│
                       └───────────────────────────────────────────────────────┘
```

**判断**：三层之间**没有共享契约**。静态稿层的 `data-build` / 步骤模型、朗读层的 beat/narration 时间轴、产出层的 ffmpeg 拼接，三者各写各的。谁先把"**step / beat / build 三者统一成一个可序列化的 slide timeline**"做成 skill，谁就吃掉这三条线的交集。

---

## 6. 盲区与未核实项（gaps）

- ★ 与 `pushed_at` 全部为 2026-10-24 当日 `GET /repos` 直取快照（含 md2video / video-claw / barevid / daida-ai / presenter-mode / xiaoma-studio / rendermill / pradaslides，均已补正为 API 直取值）。
- **README 关键词命中是信号，不是功能验证。** 我未跑过任何一条流水线：没有真的生成音频、听过朗读、看过自动进片是否踩帧。
- `humantonylee/future-slide`、`rsarver/stella-decks`、`kaisersong/slide-creator`、`prodigeproject/pradaslides` 的 narrat 命中**已逐句复核**，全部是"叙事 / 叙事评审"，**没有朗读功能**，故已移出主榜（见 §2 榜外表）。
- `open-slide/open-slide`（9.4k★）的 README 已二次抓取确认**无任何 TTS 关键词**。
- `glebis/claude-skills` 是 92 个 skill 的合集仓库，★ 400 记在**仓库**上而非 `present` 子技能上；`present` 单体星数未单独核（第三方索引站给 390，与仓库级相近）。
- `hiyeshu/codeck` 的 speech channel 是否真调用 TTS 引擎、还是只产出逐字稿，**未核实**。
- `Sven-LI-sankyuu/presentation-skills`（176★）与 `speechlab0210/video-production-skill`（105★）的朗读发生在**视频产出环节**，其 HTML 投影片是中间产物而非最终交付物——与"自播 HTML"形态只部分重叠。
- `shaharsha/claude-skills`（5★）、`hawkymisc/daida-ai`（7★）走的是 **PPTX autoplay** 而非 HTML 自动播放，与本主题的"HTML 自动播放"仅部分重叠。
- `hawkymisc/daida-ai` 明确记录：**LibreOffice Impress 不支持 auto-advance**（Bug 101527），自动播放只保证 PowerPoint 桌面端——这是该形态的现实天花板证据。
- 未取 skill 安装量（installs）。按本 vault README 的教训，**stars 与 installs 会背离**，采纳前必须复核。
- 中文生态项目（xiaoma-studio / rendermill / video-production-skill / daida-ai）README 为中英混排，关键词计数可能低估其音频能力。
- 抓取期间 `api.github.com` 一度返回 EOF（网络抖动），期间的部分 README 抓取失败已用退避重试补齐；未补齐项一律标注"未核实"，没有用推测填空。

---

## 7. 对本 Vault 的行动建议（[判断与建议]，非事实）

1. **别再加"单文件 HTML 幻灯片 skill"**。生态已有 30+ 个（frontend-slides 系 / guizang / html-ppt-skill / oh-my-ppt / open-slide / next-slide / skills-slides…），本 vault 已有 `SKILL_RADAR` 索引。增量在**朗读层**。
2. **优先建一条 `narrated-deck` skill**，契约直接抄三家：
   - 脚本格式与 beat 标记 ← `decklight` 的 `[pause]` / `[long pause]` / `[click]`（**任意拼写都识别**），配 `decklight check` 做 headless lint（"[click] beats out of step with the builds"）。
   - 引擎链与降级 ← `huseyingayiran/visual-learner` 的 Kokoro → edge-tts → Piper → 静默虚拟时钟四档探测；静默档用虚拟时钟驱动字幕与进片，保证无 TTS 时仍然"自播"。
   - 音频烘焙与导出 ← `open-deck-org/opendeck` 的"key 只在浏览器 session、只把 clip 烘进 HTML"；离线单 HTML 是硬要求。
   - 免手自动播放 ← `decklight`（captions + auto-advance）与 `opendeck`（step → 播片段 → 结束即进）二选一即可。
3. **把"时间轴"定义成本 vault 的单一事实源**：参考 `gRAYESS123/storyboard-claude` 的"音频时钟驱动"模型（动画按音频时间戳重绘，而非按帧数）与 `DotIN13/beatsdeck` 的 beat 协议（`goToBeat()` resolve 到动画稳定）。这样同一份 deck 既能 HTML 自播，也能无头渲染成 MP4，**不必写两套**。
4. **验证环节照抄 `speechlab0210/video-production-skill` 的 ASR 回译**：TTS 合成后用 Whisper 反向识别，相似度 ≥0.85 才放行，能直接掐死"念错 API 名/术语"这类翻车。这是目前唯一被实战检验过的朗读质量闸门。
5. **中文优先**：豆包 TTS（支持逐字时间戳）是国内唯一可拿到词级时间戳的免费引擎，`xiaoma-studio` 已把它列为首选。本 vault 若做中文教学视频，词级时间戳优先于 ElevenLabs 的整段音频。
6. **许可证与成本红线**：ElevenLabs 是唯一成熟的商用音色方案但按量收费；全免费路线（edge-tts / Piper / Kokoro / 豆包 / Gemini TTS）质量与稳定性不一，应在 skill 里写明"默认免费链，ElevenLabs 作为可选升级"，避免把 API key 变成硬前置。
7. **不要用星标选型**：本主题最完整的两条实现只有 5★ 和 3★。选型应按"契约清晰度 + 离线单文件 + 免费降级链 + 可 headless 校验"四项打分，而不是 ★。

---

## 8. Sources

| 数据 | 来源 | 等级 |
|---|---|---|
| stars / pushed_at / license / topics | `GET https://api.github.com/repos/{owner}/{repo}`（`gh api`，认证 token），2026-10-24 拉取 | 3（官方 API） |
| 候选发现与补充星标 | `GET https://api.github.com/search/repositories?q=…&sort=stars`（18 组关键词：slides skill / deck skill / html slides / presentation skill / tts slides / narration slides / auto-play slides / voiceover slide deck / slides with voiceover / html slides tts / …）；仅用于**发现候选**，最终星标一律以 `GET /repos` 复核 | 3（官方 API） |
| 生态入口与历史星标 | `ToseaAI/awesome-html-slide-skills` README（2026-06-23 快照），仅用于发现候选，未用作最终星标 | 3（官方仓库自述，仅供参考） |
| 功能描述与朗读能力 | 各仓库 `GET /repos/{owner}/{repo}/readme` 原文（关键词命中 + 逐句引用） | 3（官方仓库自述，仅供参考） |
| Skill 形态与安装方式 | 各仓库 README 的安装段（`npx skills add`、`git clone ~/.claude/skills/`、`decklight skills [agent…]`） | 3（官方仓库自述，仅供参考） |
| 生态分层判断 | 本文件 §5（作者综合，非外部事实） | 0（分析） |

> 免责声明：本输出由 AI 辅助生成，仅用于信息整理与研究参考，不构成专业意见或决策依据。
