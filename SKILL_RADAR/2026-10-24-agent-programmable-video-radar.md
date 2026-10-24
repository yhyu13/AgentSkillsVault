# SKILL_RADAR · 可编程视频（Agent 方向）Top 20 调研笔记

- 调研日期：2026-10-24
- 主题：能被 coding agent 驱动的"代码出视频"项目 —— Remotion / HTML→视频 / Manim / Motion Canvas 路线，以及带 BGM / TTS / 配音的端到端 agent 视频流水线
- 数据来源：GitHub REST API（`repos` / `search/repositories`）实时拉取 + 各仓库 README 原文关键词统计
- 星标快照：2026-10-24，`★` 为当日实时值 —— 核验方式：`GET /repos/{owner}/{repo}`（`stargazers_count` / `license.spdx_id` / `pushed_at`），榜内排名来自 `GET /search/repositories?q=…&sort=stars`（发现候选），**逐个 repo 端点复核，未使用任何聚合站数据**
- 未核验项（明确标注）：**skill 安装量（installs）本次未取**，本笔记只按 stars 排序，参考 `SKILL_RADAR/README.md` 的提醒 —— "stars follow the kit, installs follow the file"，采纳前应再看安装量与 `pushed_at`
- 姊妹文件：`2026-10-24-agent-programmable-video-radar.csv`（同数据表格版）

---

## 0. 结论先行

1. **"可编程视频"在 2026 年已经分成两条主线**：
   - **渲染层（deterministic render）**：Remotion（React）66.9k★、HyperFrames（HTML+GSAP→headless Chrome）71.2k★、html-video（HTML→MP4 本地）4.7k★、Manim 41.8k★、Motion Canvas 19.5k★。画面由代码逐帧画，agent 只负责写代码。
   - **流水线层（agentic production）**：OpenMontage 71.4k★、MoneyPrinterTurbo 134.7k★、hypit 25.3k★、Toonflow 19.2k★、waoowaoo 14.7k★、OpenCreator 13.9k★、dramaclaw 6.4k★。agent 负责选题→脚本→配音→分镜→成片，渲染层可能只是其中一个可替换模块。
2. **本仓库本地已装 HyperFrames 全家桶**（`C:\Users\24717\.agents\skills\hyperframes`、`hyperframes-cli`、`hyperframes-registry`、`media-use`）。**HyperFrames 是本次调研中唯一"官方出品 + agent-native + Apache-2.0 + 音频链路完整（producer 混音 + /media-use 音乐/配音）"的组合**，无需再引入。
3. **Remotion 是事实标准渲染器，但有 license 陷阱**：`LICENSE.md` 明确是双层 license，个人与小公司免费（含商用），达到规模门槛的营利组织需购买 company license。GitHub API 的 `license.spdx_id` 返回 `NOASSERTION`，**不能用"开源免费"一句带过**。
4. **BGM/TTS 成熟度排序**（README 关键词实测）：OpenMontage（TTS×11 / music×18 / voice×9 / soundtrack×4）≈ claude-code-video-toolkit（voice×45 / music×27 / TTS×11 / dub×7）≈ anything2explainer（TTS×25 / voice×27）> html-video（soundtrack×11，MiniMax 出 BGM+旁白并自动 ducking）> OpenChatCut（audio×13）> video-shotcraft（BGM×6）。**纯渲染器（Remotion / Manim / Motion Canvas）README 里几乎没有音频关键词 —— 音频层必须外接**。
5. **本 vault 已有 21 个视频类 skill**（`video/remotion-*` 12 个、`onetake`、`kinetic-reel`、`painted-animation`、`anidoodle`、`manim-video`、`video-use`、`ai-video-production` 等），渲染与风格层基本齐了。**真正缺的不是第 22 个渲染 skill，而是三块公共件**：① 统一的 BGM/TTS 混音契约（ducking / 响度归一 / 章节化）② 可迁移的 shot recipe 卡片 ③ 跨引擎的 storyboard 单一事实源。这三块生态里都有成品可抄（见 §4、§6）。

---

## 1. 榜单口径

| 维度 | 判定规则 |
|---|---|
| 收录 | ① 画面由代码/结构化数据驱动（Remotion / HTML / Manim / Motion Canvas / 代码渲染模板）；② 或 agent 端到端视频流水线且**可被 coding agent 驱动**（skill / MCP / CLI / headless）；③ 或明确覆盖音频层（BGM / TTS / 配音 / 混音）且与上述两类交叉 |
| 排除 | 纯闭源 SaaS API、纯文生视频模型权重仓库（如 Veo / Kling / Wan 官方仓库）、纯剪辑 GUI（lossless-cut 等）、纯 TTS 推理库（作为**依赖**记录在 §4，不进主榜） |
| 排序 | 纯按 `stargazers_count` 降序（★ 数反映关注度，不等于可用性） |
| 附加字段 | License / 语言 / 最后 push 时间 / 音频层能力 / agent 接入方式 |

---

## 2. Top 20 榜单

| # | 仓库 | ★ | License | 语言 | 最后 push | 渲染/产出方式 | 音频层 | Agent 接入 |
|---|---|---|---|---|---|---|---|---|
| 1 | `harry0703/MoneyPrinterTurbo` | 134,739 | MIT | Python | 2026-10-24 | 素材剪辑式（拼 stock 片段） | TTS×18 / whisper×14 / ElevenLabs×2 / Audio×5 | 脚本化流水线，可当 CLI 调用 |
| 2 | `nexu-io/open-design` | 103,688 | Apache-2.0 | TypeScript | 2026-10-24 | 设计工作台，内嵌 HyperFrames 渲染 | audio×6 / TTS×1 / ElevenLabs×1；Suno v5 / Lyria 2 音频层 | 本地优先 agent 工作台，BYOK proxy |
| 3 | `calesthio/OpenMontage` | 71,373 | AGPL-3.0 | Python | 2026-10-24 | 12 条 production pipeline，100+ 工具 | music×18 / audio×17 / TTS×11 / voice×9 / soundtrack×4 / ElevenLabs×4 / speech×7 / dub×3 / Whisper×1 | 700+ agent skill + 生产知识文件 |
| 4 | `heygen-com/hyperframes` | 71,156 | Apache-2.0 | TypeScript | 2026-10-24 | HTML+CSS+GSAP → headless Chrome → MP4 | audio×5 / music×4 / voice×1；`@hyperframes/producer` 负责 capture/encode/**audio mix** | 原生 agent-native：写 HTML 的 agent |
| 5 | `remotion-dev/remotion` | 66,950 | **Remotion License**（非 OSI） | TypeScript | 2026-10-24 | React 组件 → 帧渲染 | README 无音频关键词（音频走 `@remotion/media` 独立包） | 生态最厚：skill / 模板 / MCP 满天飞 |
| 6 | `ManimCommunity/manim` | 41,819 | MIT | Python | 2026-10-24 | Python 数学动画引擎 | README 无音频关键词（配音靠第三方 addon） | 纯代码，天然适合 agent |
| 7 | `hypit-ai/hypit` | 25,272 | 未声明 | TypeScript | 2026-10-23 | 模板化短视频批量变体 | music×3 / Whisper×3 / voice×1 | 一条命令出 100 个变体，agent 编排 |
| 8 | `motion-canvas/motion-canvas` | 19,455 | MIT | TypeScript | 2026-07-02 | TS 动画引擎（代码画帧） | README 仅 voice×1（可与 voice-over 同步） | 纯代码；**最后 push 2026-07，已 3 个月无更新** |
| 9 | `HBAI-Ltd/Toonflow-app` | 19,208 | MIT | TypeScript | 2026-10-20 | 短剧/漫剧：脚本→分镜→图/视频 | README 无音频关键词 | 无限画布 + AI Agent + MCP + 插件 |
| 10 | `waooAI/waoowaoo` | 14,669 | 未声明 | TypeScript | 2026-09-21 | 影视级全流程 AI 生产 | Music×1 / voice×1 | 工业级 Agent 平台（短剧→真人） |
| 11 | `krillinai/OpenCreator` | 13,891 | Apache-2.0 | TypeScript | 2026-10-24 | 下载→翻译→配音→剪辑→发布 | voice×13 / dub×11 / Whisper×15 / Speech×7 / TTS×5 / audio×7 | Codex 驱动的一体化创作者工作台 |
| 12 | `Vincentwei1021/video-shotcraft` | 13,346 | Apache-2.0 | TypeScript | 2026-10-17 | Remotion 电影感产品视频 | BGM×6 / audio×8 / music×3 / voice×2 | **Claude Code & Codex skill**：152 张 shot recipe + 209 段 motion preview |
| 13 | `dramaclaw/dramaclaw` | 6,429 | 未声明 | Python | 2026-10-24 | 剧本→成片一条流水线 | audio×7 / voice×9 / speech×2 / TTS×1 | 通用 AIGC 视频引擎 |
| 14 | `ArcReel/ArcReel` | 5,699 | AGPL-3.0 | Python | 2026-10-24 | 小说/剧本→资产→分镜→视频→剪映草稿 | TTS×2 | 自托管 agent 视频工作台 |
| 15 | `nexu-io/html-video` | 4,747 | Apache-2.0 | HTML | 2026-06-21 | HTML → 多帧动画 → 本地 MP4（可插拔引擎，可换 Remotion/Motion Canvas） | soundtrack×11 / music×6 / Audio×3 / TTS×1；**MiniMax 生成 BGM+旁白，ffmpeg 自动 ducking + 淡入淡出** | 明列 Claude Code / Codex / Cursor / OpenCode 等 |
| 16 | `darkzOGx/youtube-automation-agent` | 4,572 | MIT | JavaScript | 2026-10-20 | 选题→脚本→旁白→画面→SEO→发布 | ElevenLabs×10 / Voice×6 / tts×5 | 自托管 YouTube 全自动 agent，人工审批后发布 |
| 17 | `FireRedTeam/FireRed-OpenStoryline` | 3,558 | Apache-2.0 | Python | 2026-07-31 | 意图驱动的剪辑 agent | README 无音频关键词 | LLM 规划 + 工具编排 + 人在环 |
| 18 | `Vincentwei1021/anything2explainer` | 2,725 | 未声明 | TypeScript | 2026-09-18 | 主题→黑底动效讲解视频（Remotion 逐帧画） | **TTS×25 / voice×27 / audio×5** | Claude Code / Codex skill，中英双语 |
| 19 | `0xsline/OpenChatCut` | 2,651 | AGPL-3.0 | TypeScript | 2026-10-21 | 对话式剪辑，**Remotion 渲染** | audio×13 / music×7 / soundtrack×1 / speech×3 | 本地优先，Agent Skills + MCP |
| 20 | `digitalsamba/claude-code-video-toolkit` | 2,326 | MIT | Python | 2026-10-21 | AI-native 视频生产工具包 | **voice×45 / music×27 / TTS×11 / audio×13 / dub×7 / ElevenLabs×5** | Claude Code 原生 |

### 榜外但强相关（★ 数不够进榜，能力值得看）

| 仓库 | ★ | 为什么值得看 |
|---|---|---|
| `Vincentwei1021/video-talkcraft` | 1,738 | 词级 voiceover 同步、109 张 motion recipe、反 PPT 感镜头系统（Remotion） |
| `gyoridavid/short-video-maker` | 1,428 | MCP + REST 双入口做 TikTok/Reels/Shorts（music×11 / TTS×3 / Whisper×16） |
| `iart-ai/motion-skills` | 984 | 50 个开源 motion skill（动效、数据可视化、WebGL、Manim），14 个可安装包 |
| `zhuyansen/awesome-claude-video-skills` | 872 | 收录 180 个让 agent 做视频的 repo，按类型分级（含安全评级），中英双语 |
| `haidrrrry/claude-remotion-skill` | 610 | "一句 prompt 出专业动效视频"：AI 剪辑、B-roll、字幕、**sound design** |
| `trustfuture/simon-skills` | 473 | 不露脸视频号 skill：配音字幕、封面、各平台文案 |
| `wshuyi/remotion-video-skill` | 430 | Remotion 程序化视频 Claude Code skill |
| `actionow-ai/vvv` | 303 | 模板一次建、多 agent 复用（Claude Code / Codex / 25+ agent） |
| `norahe0304-art/30x-video` | 64 | 一个 URL 进 → agency 级 launch video 出（Remotion+React，16 条 taste codex） |
| `ali-abassi/remotion-templates` | 42 | 给 agent 的 Remotion 模板集：字幕、可视化、特效、转场 |
| `remotion-dev/template-audiogram` | 274 | 官方播客切片模板（官方模板线仍活跃） |
| `remotion-dev/template-helloworld` | 74 | `npm init video` 起点 |

---

## 3. 关键证据摘录（README 原文）

- **html-video（#15）—— BGM/TTS 契约写得最清楚**：
  > "**AI soundtrack** — Optional background music + narration via MiniMax, mixed into the MP4 at export."
  > "**Background music** — describe a mood (`calm cinematic ambient, slow build`) … **Narration** — type a script; MiniMax reads it (TTS). Both are mixed into the exported MP4 (**music ducked under the voice, optional fade-in/out**) via ffmpeg."
  > 引擎可替换："swapping in Remotion or Motion Canvas later replaces only that box, leaving the storyboard and the agent loop untouched."
- **hyperframes（#4）—— 渲染器 + 混音 + 媒体供给三件套**：
  > "`@hyperframes/producer` | Full rendering pipeline for capture, encode, and **audio mix**"
  > "`/media-use` — Get or make any media for a video — music, sound effects, images, logos, **voiceover**, avatar and generated video … and **mix placed audio**"
  > 模板示例："TikTok karaoke talking-head · 9:16 · **TTS + word-synced captions**"、"30s brand sizzle reel · audio-reactive kinetic type"
- **open-design（#2）—— 把 HyperFrames 当一等公民**：
  > "HyperFrames is HeyGen's open-source, agent-native video framework… The agent writes HTML + CSS + GSAP, and HyperFrames renders it to a deterministic MP4 via headless Chrome + FFmpeg. Pair it with **Seedance 2.0** for cinematic t2v/i2v, **Veo 3 / Sora 2 / Kling 2** for routed model variants, and **Suno v5 / Lyria 2** for the audio layer."
- **Remotion license（#5）—— 不可忽略的商业条款**：
  > "Individuals and small companies are allowed to use Remotion to create videos for free (even commercial), while a **company license is required for for-profit organizations of a certain size**."（`LICENSE.md`，2026-10-24 读取）
- **Remotion 仓库自带 agent 生态目录**：根目录含 `.agents/`、`.claude/`、`.codex/`、`AGENTS.md`、`DESIGN.md` —— 官方自己就在按 agent skill 的方式组织。

---

## 4. 音频层依赖（不进主榜，但做管线要选型）

| 仓库 | ★ | License | 用途 |
|---|---|---|---|
| `myshell-ai/MeloTTS` | 7,681 | MIT | 多语种 TTS 库（中/英/日/韩/西），本地推理；**最后 push 2024-12，已停更** |
| `buxuku/SmartSub` | 5,819 | MIT | 视频转字幕 → 翻译 → AI 配音/声音克隆 → 烧录，桌面端 |
| `travisvn/openai-edge-tts` | 2,133 | GPL-3.0 | OpenAI 兼容的免费高质量 TTS 端点（免 ElevenLabs 费用） |
| `mifi/lossless-cut` | 45,150 | GPL-2.0 | 音频/视频无损处理，可当 ffmpeg 前的胶水 |
| `RayVentura/ShortGPT` | 8,064 | MIT | YouTube Shorts / TikTok 自动化老牌框架 |

**没有 BGM 生成开源自托管仓库进榜**（Suno / Lyria / MiniMax 都是托管 API）。生态里 BGM 的实际做法是三选一：① 托管音乐 API（MiniMax、Suno、Lyria）② 素材库循环 + ducking ③ 手搓 PCM/ffmpeg 混音。**这是生态缺口，不是没找到**。

---

## 5. 生态结构图（谁跟谁重叠）

```
                 ┌─ 渲染层（代码出画）──────────────────────────────┐
   React ──────▶ │ Remotion 66.9k ★(双层 license) │ HyperFrames 71.2k ★(Apache-2.0) │
   HTML/CSS ────▶│ html-video 4.7k ★(Apache-2.0, 本地 MP4) │ Motion Canvas 19.5k ★ │ Manim 41.8k ★ │
                 └───────────────────────────────────────────────────────┘
                                        ▲ 可插拔
   ┌────────────── agent 编排层（选题→脚本→配音→分镜→成片）─────────────────────┐
   │ OpenMontage 71.4k ★ │ open-design 103.7k ★ │ hypit 25.3k ★ │ Toonflow 19.2k ★      │
   │ waoowaoo 14.7k ★ │ OpenCreator 13.9k ★ │ dramaclaw 6.4k ★ │ ArcReel 5.7k ★        │
   │ MoneyPrinterTurbo 134.7k ★ │ youtube-automation-agent 4.6k ★ │ FireRed 3.6k ★       │
   └────────────────────────────────────────────────────────────────────────────┘
                                        ▲ 封装成 skill
   ┌────────────── skill 层（给 coding agent 直接吃）────────────────────────────┐
   │ video-shotcraft 13.3k ★ │ anything2explainer 2.7k ★ │ video-talkcraft 1.7k ★    │
   │ claude-remotion-skill 610 ★ │ remotion-video-skill 430 ★ │ vvv 303 ★             │
   │ motion-skills 984 ★ │ 30x-video 64 ★ │ claude-code-video-toolkit 2.3k ★        │
   │ awesome-claude-video-skills 872 ★（索引）                                    │
   └────────────────────────────────────────────────────────────────────────────┘
```

**判断**：skill 层是"agent 友好度"的真正杠杆；渲染层已经卷完了，差异在音频层与 shot 卡片层。

---

## 6. 盲区与未核实项（gaps）

- ★ 为 2026-10-24 当日快照，未来必然变化；引用请带日期。
- `NOASSERTION` license 的 6 个仓库（remotion / hypit / waoowaoo / dramaclaw / anything2explainer / video-talkcraft）我只逐字读了 Remotion 的 `LICENSE.md`，**其余未逐条核对条款**，落地前需读原文。
- "音频层能力"是我对 README 全文做关键词计数得出的**信号**，不是功能验证。OpenMontage 71k★、MoneyPrinterTurbo 134k★ 这类体量的大仓库，其 README 通常只展示能力轮廓，真实管线深度需实跑。
- **未实测任何一条渲染管线**：没有跑过 HyperFrames / Remotion / html-video 的实际出片，也没有比对成片质量、渲染耗时与 API 成本。
- **未取 skill 安装量（installs）**，本次只按 stars 排序；参考 `SKILL_RADAR/README.md`：installs 与 stars 可能背离，采纳前必须复核。
- BGM 生成侧只覆盖托管 API（Suno / Lyria / MiniMax），**开源自托管音乐生成**（如 AudioCraft 系）本次未纳入榜单范围，属于选型盲区。
- 中文生态（Toonflow、waoowaoo、ArcReel、OpenChatCut）README 音频细节抓取自中英混排文本，关键词计数可能低估其音频能力。
- 榜单按 stars 机械排序，**#1 MoneyPrinterTurbo 并不"可编程"**（素材剪辑式而非代码逐帧渲染），保留是因为它定义了 BGM/TTS 流水线的事实标准。

---

## 7. 对本 Vault 的行动建议（[判断与建议]，非事实）

1. **不再新增渲染类 skill**。本地已有 `video/remotion-*`（12 个）+ `onetake` + `kinetic-reel` + `painted-animation` + `anidoodle` + `manim-video` + `video-use` + `ai-video-production`，以及全局 `hyperframes` / `hyperframes-cli` / `hyperframes-registry` / `media-use`。渲染 + 风格 + 媒体供给三块都有人了。
2. **优先补 `video-audio-contract`（BGM/TTS 混音契约）**——这是生态里最重复造轮子、也最缺统一规范的一块。参数可直接抄 `nexu-io/html-video`（Apache-2.0）：BGM 用 mood 提示词生成、旁白 TTS 分句 + 词级对齐、`music ducked under voice` + fade in/out、ffmpeg 混音与响度归一。再补一个本地 TTS 兜底 `travisvn/openai-edge-tts`（OpenAI 兼容、免密钥）。
3. **引入 shot recipe 卡片**：优先 `Vincentwei1021/video-shotcraft`（152 张 shot + 209 段 motion preview，Apache-2.0），其次 `Vincentwei1021/video-talkcraft`（109 张 + 词级 voiceover 同步 + 反 PPT 感镜头系统）。两者都是 Remotion 语法，迁到 `onetake`/`hyperframes` 需改写构图 —— 建议先抽样 10 张验证迁移成本。
4. **定义 `storyboard.json` 单一事实源**：借鉴 html-video 的 "storyboard 层 / engine 层分离"，engine 侧给 Remotion / HyperFrames / Motion Canvas 三种实现，换渲染器不动 prompt 层与音频层。这是 vault 里 21 个视频 skill 之间目前最大的重复面。
5. **许可证红线**：Remotion 是双层 license（规模以上营利组织需 company license），落库任何 Remotion 模板代码前先确认使用主体；AGPL-3.0 的 OpenMontage / OpenChatCut / ArcReel，抄 skill 描述与参数设计问题不大，**抄实现要评估 copyleft 传染**。
6. **维护风险提示**：`motion-canvas/motion-canvas` 最后 push 2026-07-02（3 个月），`myshell-ai/MeloTTS` 最后 push 2024-12（已停更），`gyoridavid/short-video-maker` 停更于 2025-06 —— 若选它们做依赖需接受停滞，或提前锁定替代品。
7. **可参考的"整链路"范式**：`digitalsamba/claude-code-video-toolkit`（voice×45 / music×27 / TTS×11 / dub×7）与 `anything2explainer`（TTS×25 / voice×27）是把"脚本→配音→字幕→动效"做成单 skill 的两个样本，规模比本 vault 单点 skill 大，可作为"要不要合并成一条端到端 skill"的决策参照。

---

## 8. Sources

| 数据 | 来源 | 等级 |
|---|---|---|
| stars / forks / license / pushed_at / topics | `GET https://api.github.com/repos/{owner}/{repo}`（认证 token，`gh api`），2026-10-24 批量拉取 | 3（官方 API） |
| 候选发现与排序 | `GET https://api.github.com/search/repositories?q=…&sort=stars&order=desc`（10 组关键词：remotion / html to video / programmatic video / react video / text to speech api / ai agent video editor / voice clone api / music generation api / ai video agent / short video automation / remotion skill / remotion claude / remotion mcp / agent skill video production / bgm generator …） | 3（官方 API） |
| 功能描述与音频能力 | 各仓库 `GET /repos/{owner}/{repo}/readme` 原文（关键词计数 + 逐句引用） | 3（官方仓库自述，仅供参考） |
| Remotion 授权条款 | `GET /repos/remotion-dev/remotion/contents/LICENSE.md` 原文 | 1（协议原文） |
| 本地已装技能盘点 | `D:\GitRepo-AI\AgentSkillsVault\video\*` + `C:\Users\24717\.agents\skills\{hyperframes,hyperframes-cli,hyperframes-registry,media-use}` 的 `SKILL.md` frontmatter | 0（本机磁盘） |

> 免责声明：本输出由 AI 辅助生成，仅用于信息整理与研究参考，不构成专业意见或决策依据。
