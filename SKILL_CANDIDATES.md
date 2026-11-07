# 沉淀候选队列

> **规则**：Agent 在任务中发现的**可复用**经验，先写进这里，**不要顺手改 skill**。
> 用户批量审核后，才按条目改 skill（改时才 bump `version:` + 更新 `INSTRUCTION.md` 的 provenance 表）。
> 判断标准：能不能被**下一个任务复用**；一次性的项目细节不要进队列。
>
> 状态：`待审` / `已采纳` / `已否决` / `已落地`（写明落到哪）

## 队列

| # | 候选（一句话） | 证据（哪次实测） | 建议落位 | 状态 |
| --- | --- | --- | --- | --- |
| 1 | **单文件交互演示的「迭代与验证」方法**：先能跑 → 再好看 → 再对；每轮用真实浏览器驱动 + 状态钩子 + 截图验证 | 做 AI Tutor World demo 时迭代 4 轮才修掉「云被画进世界坐标系 / 房子是纯色方块 / 生成时镜头没跟上 / 自动化驱动点不动」 | `karpathy-explain-better/references/modes.md` 形式 3 补「怎么迭代验证」 | 待审 |
| 2 | **把成片发布成可访问链接**（部署 + 公网自检） | Cloudflare quick tunnel（无账号凭据时唯一可行）；必须 curl 验到公网 200 与 206；quick tunnel 域名随机、随进程/机器失效 | `karpathy-explain-better/references/form4-video-delivery.md` 新增「发布」一节 | 待审 |
| 3 | **支持 Range 的最小静态服务** | `python -m http.server` 不支持 Range → 28MB 视频传到 10MB 断流；自写 40 行 `serve.py` 后本地/公网都返回 206 | `karpathy-explain-better/references/scripts/serve_range.py`（新脚本） | 待审 |
| 4 | **开工前的「考古式侦察」清单** | 先摸已有研究/资产/工具/凭据，本次靠它发现：父目录已有 `AI_Tutor-前1%研究`、`cloudflared` 在但无凭据（只能用 quick tunnel）、Bloom 调研与 issue #92 已存在不必重做 | `karpathy-explain-better` 默认工作流加「第 0 步：侦察」，或独立 skill | 待审 |
| 5 | **给 Agent 写的文档格式**：编号 + 路径 + 命令 + 判据 + 阈值；保留错误记录与自我更正；结尾给「起手式 prompt」 | issue #92 附录按这个格式写；用户反馈「要对 Agent 友好，因为 manager 会用另一个 Agent 来学习」 | `writing/` 新 skill，或作为 `karpathy-explain-better` 形式 1 的补充 | 待审 |
| 6 | **搜索插件的限流与「只给 URL」应对** | 并行 6 条 search_web 只成功 1 条（插件限流）→ 改 2 条一批；返回结果 snippet 多为空 → 用 `curl` + HTMLParser 抓正文核事实；每条结论标「已核/未核」 | 新 skill（research-with-plugins）或并入 `karpathy-explain-better/references/` | 待审 |
| 7 | **多会话并行冲突治理**：改 skill/共享目录前先 pull；同一 skill 一次只允许一个会话改 | 2026-10-07 两个会话同改 `karpathy-explain-better`，靠提交时撞在一起合并；2026-10-10 `AI_Tutor-World/build`、`tools/` 是另一会话产物 | 已写入 `INSTRUCTION.md` §沉淀流程 | **已落地** |
| 8 | **Windows 上别照抄 `curl ... \| sh` 装 MCP**：`install.sh` 只支持 macOS/Linux，Windows 走 `install.ps1` 或 `uvx <pkg> setup`；`bash.exe` 是 WSL 桩，会"成功"装进另一个 `$HOME` | `mcp-for-blender.com/install.sh` 头注释 `# ... for macOS and Linux`；本机 `sh` MISSING、`bash` = `C:\Windows\system32\bash.exe`；`install.ps1` 返回 200 | 新 skill `windows-agent-toolchain`（software-development/） | 待审 |
| 9 | **中文 Windows 的 GBK 控制台会让 Python CLI 崩在 `✓`/emoji 上，且崩在"写完配置之后"**：加 `PYTHONIOENCODING=utf-8` + `PYTHONUTF8=1`；看到 traceback 先确认副作用是否已经发生 | `blender_mcp/setup_cli.py:801` → `UnicodeEncodeError: 'gbk' codec can't encode character '\u2713'`，但同一次运行 `%APPDATA%\Code\User\mcp.json` 已写入；二次运行显示 "VS Code already set up" | 同 #8 | 待审 |
| 10 | **Blender 5.x 启用 legacy 单文件插件的正确姿势**：prefs 恢复会报 `No module named '<addon>'`；解法是 startup 脚本先 `sys.path.append(scripts/addons)` 再 `addon_utils.enable()`；startup 脚本**必须**有 `register()`；`importlib` 按路径加载会触发 reload 的 `spec not found`；`--addons` 仅当次有效不持久 | Blender 5.2.2 + `blender_mcp.py`：冷启动 `CHECK: (False, False)`；`--addons blender_mcp` 得 `(True, True)` 但下次普通启动又丢；warning `has no register function, this is now a requirement` | 新 skill `blender-mcp`（game-dev/ 或 video/） | 待审 |
| 11 | **npm/npx 在 Windows 有两道墙**：执行策略禁 `npm.ps1`（改用 `npm.cmd`）；`~/.npmrc` 里的死代理导致 npm `ECONNREFUSED` 而 `curl` 正常（两套代理来源）；无损绕过用临时 `NPM_CONFIG_USERCONFIG` 指向干净 npmrc | 本机 `npm error ECONNREFUSED 127.0.0.1:8889`，同时 env `HTTP_PROXY=127.0.0.1:7892` 且 `curl https://registry.npmjs.org/` 返回 200 | 同 #8 | 待审 |
| 12 | **`npx skills add --agent kilo` 会把 skill 落到 `.kilocode/skills`，而本 harness 只读 `.kilo/`**：装完必须挪；`skills-lock.json` 只记 source/skillPath/hash 不含目录，所以挪动安全 | 12 个 remotion skill 实测落到 `.kilocode\skills\`；`Move-Item` 到 `.kilo\skills` 后 lockfile 仍可用 | `skill-auto-improve-mirror` 新增"安装落点校验"一节 | 待审 |
| 13 | **Remotion 渲染前必须显式指定可用浏览器**：`chrome-headless-shell` 下载会长时间挂住并留下 `download.lock`；一行 `Config.setBrowserExecutable(本机 Edge/Chrome)` 解决；验证命令 `remotion compositions`（会真起浏览器） | `npx remotion compositions` 卡 480s；`.remotion/chrome-headless-shell/chrome-headless-shell-win64.zip` 停在 15MB + `download.lock`；改 config 后 894ms 列出 2 个 composition | 新 skill `remotion-video` | 待审 |
| 14 | **`@remotion/non-pure-animation` 会对 `transition: "none"` 误报**：该值是默认的空操作，但规则只看属性名；真正的判据是"任何走墙钟的属性都会逐帧闪烁" | `src/Pipeline.tsx:70` warning；删除该行后 `eslint src && tsc` 零告警，且带 config 渲 still 成功 | 新 skill `remotion-video` | 待审 |
| 15 | **AI 视频的收敛流程比工具重要**：参考片定调 → 分镜 → 每场景静帧 → 确认后动画 → 对抗审片（节奏 / 质感 / 文字·安全区·合规 三路各审一类）→ 自验收；一句话够做概念短片，静帧流程用于产品片与长片；核心工作方式是"模型渲完回头审自己渲出来的帧再改" | 余弦 2026-09-27 博客（二手经验）+ 本项目用 `remotion still` 抽帧目视可复现该回路 | 新 skill `ai-video-production`（content/ 或 video/） | 待审 |
| 16 | **程序化视频框架选型的三个"别用"**：① Remotion 官方 MCP **已废弃**（改用 `npx remotion skills add` + `/remotion-docs`，托管服务"不早于 2026-08-31 关停"）；② Revideo 团队已转向 Midrender，**开源仓库不再 upstream**；③ Motion Canvas 明确声明"不是给你当库用的" | Remotion 文档 `/docs/ai/mcp` 原文 deprecation notice；`re.video` 首页 "recent changes have not yet been upstreamed to the open-source repository"；docs.re.video 原文 "maintainers don't intend for it to be used as a library" | 新 skill `programmatic-video-routing`（video/），含 Remotion / HyperFrames / Revideo-Midrender / Motion Canvas 四条路的判据 | 待审 |
| 17 | **Remotion 官方字幕路径是 `@remotion/whisper-webgpu`，不是 whisper.cpp**：Node 侧配 `@huggingface/transformers` + `mediabunny` + `@mediabunny/server`；输出 `Caption[]` 交给 `@remotion/captions` 的 `createTikTokStyleCaptions`；**需 GPU**，且"不支持自动语种检测"，中文必须显式传 `language` | Remotion v4.0.518 release notes（"@remotion/whisper-webgpu: New package!"）；npm 上 4.0.535/536 与项目 4.0.536 对齐；官方 skill `transcribe-captions.md` 原文 | `remotion-video` 的"字幕"一节 | 待审 |
| 18 | **视频审片可工具化的部分**：`ffmpeg tile` / `remotion still` 抽帧拼联系表（每 10 帧一格）；AE 侧 MCP 已实现 "comp snapshots and diffs + contact sheets" 可借鉴其判据；Remotion Studio 的 WebMCP 能读元素轮廓/几何与 error overlay，但**当前只有 ChatGPT Codex 支持 WebMCP**，Kilo 用不了 | `@remotion/studio` v4.0.518 "Add WebMCP tools"；`remotion.dev/docs/ai/webmcp` 原文 "Out of the major harnesses, only ChatGPT Codex supports WebMCP"；`github.com/Engine-Room-Games/after-effects-mcp` README | `ai-video-production`（审片清单）+ `remotion-video`（抽帧命令） | 待审 |
| 19 | **git push 被死代理劫持**：env `HTTP_PROXY=127.0.0.1:8889` 指向的代理对 GitHub 返回 **403**（隧道拒绝），但**直连**是通的 → 推送前清空 `HTTP_PROXY/HTTPS_PROXY` 或设 `NO_PROXY=*`；排查判据：`curl -x http://127.0.0.1:8889 https://api.github.com` = 403，而 `curl --noproxy '*' https://api.github.com` = 200 | 2026-10-24 本机实测：带代理 `git push` 连续 4 次 `SSL_ERROR_SYSCALL` 失败，清代理后同一条 push 一次成功；`curl https://www.baidu.com` 也 000 → 先分清「整体断网」还是「代理单点坏」（只测一个域名会误判） | `software-development/` 新 skill `windows-agent-toolchain`（与候选 #8/#11 同一坑簇） | 待审 |
| 20 | **BGM/TTS 混音契约**：旁白分句合成 + 词级对齐；音乐在语音下 ducking；fade in/out；ffmpeg 混音 + 响度归一 | 2026-10-24 雷达采纳批次：`vendor/html-video`（Apache-2.0）的 audio 层参数（本批只 vendor 不装） | 新 skill `video/video-audio-contract`（video/）——这是 21 个视频 skill 之间目前最大的重复面 | 待审 |
| 21 | **朗读质量闸**：TTS 合成后用 ASR 反向识别，相似度 ≥0.85 才放行（能掐死「念错 API 名 / 术语」这类翻车） | 2026-10-24：`vendor/video-production-skill`（已装进 `design/video-production`）是该闸的唯一公开实战实现 | 把这条闸从 `design/video-production` 提到 vault 级通用规则（`writing/` 或 `video/ai-video-production` 的交付清单） | 待审 |
| 22 | **beat 协议**：脚本里写 `[pause]` / `[long pause]` / `[click]` 标记，配 headless lint 检查「beat 与 build 不同步」 | 2026-10-24：`vendor/…` 生态里 `decklight`（仓库无 SKILL.md，未装）提供该契约 | 新 skill `design/narrated-deck`（朗读层增量，不做第 4 套 HTML 幻灯片生成器） | 待审 |
| 23 | **证据纪律**：来源分级 + 验证门 + 对抗式复核，作为通用方法而非独立 skill | 2026-10-24：`vendor/market-intel`（MIT，已装 `content/market-intel`）与 `vendor/…structflow`（无 license，仅参考）的来源分级做法 | 沉淀进 `software-development/truth-seeking-research` 的证据层（不新增 skill） | 待审 |
| 24 | **蒸馏产物要带来源边与置信度半衰期**：`derived_from` 边 + 置信度随时间衰减 | 2026-10-24：`vendor/company-brain`（MIT，仅 vendor）的图结构设计 | 沉淀进 `software-development/skill-distill`（工作产物模板加来源边字段） | 待审 |
| 25 | **战略框架层缺口**：26 个 canonical 战略/咨询框架（波特五力、OKR、BLM…）目前 vault 只有 `mgmt-discipline`/`mgmt-individual`/`mgmt-org`，缺「框架方法」这一层 | 2026-10-24 MBA 雷达：`M-MMahmood/business-frameworks-agent-skills` 无 license → 只能**按框架名重写**，不能复制 | 新 skill `management/mgmt-strategy`（按 mgmt-* 三件套的结构写） | 待审 |
| 26 | **装第三方 skill 之前先过安全扫描**（注入 / 外泄 / 供应链） | 2026-10-24：本批装入 137 个第三方 skill，此前只有 `vendor/skillspector`（NVIDIA SkillSpector）可用，现已装成 `software-development/skill-inspector` | 写进 `INSTRUCTION.md` 的「Add-a-new-skill checklist」，作为硬性第 0 步 | 待审 |
| 27 | **兄弟 skill 的 description 第一行必须能互相区分**：先写「是哪个格式 / 平台 / 后端 / 领域」，再写「不适用于谁」——因为预算不够时 harness 会先砍 description，只剩名字 | 2026-10-25：`skill_pressure_analysis.py` 实测 16 对 Jaccard ≥ 0.30（`brand-docx/pptx/xlsx` 0.659–0.714 最高），arXiv:2605.24050 实测 skill shadowing 是 202 规模下 pass-rate 掉 21% 的主因 | 改 `design/brand-docx` `design/brand-pptx` `design/brand-xlsx` 的 frontmatter 首行（各写清 Word 文档 / PowerPoint 演示 / Excel 工作簿 + 「不适用于 X」） | 已落地 |
| 28 | **router 型 skill 的 description 不能包含兄弟的触发词**：`style-report` 只在用户点名「某公司风格」时用 | 同上实测 `style-report`↔`style-google` 0.300、`style-*` 互配 0.316–0.333 | 改 `management/style-report` 首行：加「仅当用户点名公司风格时用；其他情况不要用」 | 已落地 |
| 29 | **公司风格类 skill 首行直接写公司名** | 同上实测 6 个 `style-*` 互配 0.316–0.333 | 改 `management/style-alibaba` `style-bytedance` `style-google` `style-microsoft` `style-tencent` 首行（阿里/字节/Google/微软/腾讯双轨制） | 已落地 |
| 30 | **平台类 skill 首行写平台名**（LinkedIn / Twitter） | 同上实测 `blog-to-linkedin-post`↔`blog-to-twitter-post` 0.548 | 改 `content/blog-to-linkedin-post` `content/blog-to-twitter-post` 首行 | 已落地 |
| 31 | **周期类 skill 用「节奏」当触发词**：一次性的状态报告 vs 每周固定 vs 季度复盘 | 同上实测 `project-update`↔`weekly-report` 0.429 | 改 `management/project-update`（一次性项目状态汇报）、`management/weekly-report`（每周固定节奏）首行 | 已落地 |
| 32 | **素材源类 skill 首行点名来源**：Aura Assets vs Unsplash | 同上实测 `aura-asset-images`↔`unsplash-asset-images` 0.419 | 改 `content/aura-asset-images` `content/unsplash-asset-images` 首行 | 已落地 |
| 33 | **后端类 skill 首行点名后端**（Loki vs Prometheus） | 同上实测 `grafana-loki-label-analyzer`↔`grafana-prometheus-label-strategy` 0.377 | 改 `devops/grafana-loki-label-analyzer` `devops/grafana-prometheus-label-strategy` 首行 | 已落地 |
| 34 | **同名领域循环的 skill 首行写领域**：game-dev-loop vs software-dev-loop | 同上实测 0.375 | 改 `game-dev/game-dev-loop` `software-development/software-dev-loop` 首行（游戏 / 通用软件） | 已落地 |
| 35 | **同族 skill 用「产出物」区分**：grill-me 只出追问，grill-with-docs 追问 + ADR/术语表 | 同上实测 `grill-me`↔`grill-with-docs` 0.556 | 改 `software-development/grill-me` `software-development/grill-with-docs` 首行 | 已落地 |
| 36 | **「改现有」与「新建」要分开**：`hands-on-deck` 改 pptx，`pptx` 新建 | 同上实测 `hands-on-deck`↔`pptx` 0.362 | 改 `content/hands-on-deck`（修改已有 .pptx）、`vendor/anthropics-skills/skills/pptx`（新建）首行；vendor 副本不手改，改为在 vault 内建 curated 副本 | 已落地 |
| 37 | **mattpocock 引擎族依赖一个已退役的 setup skill**：`code-review` `to-spec` `to-tickets` `triage` `wayfinder` `ask-matt` 都要求先跑 `/setup-matt-pocock-skills` 生成 `docs/agents/issue-tracker.md`，而该 skill 2026-10-25 已退役（E 类），本机也没有这个文件 → 要么修好上游再装回 setup，要么把「无 tracker 时退回本地 `.scratch/` 文件」写进这 6 个 skill | 2026-10-26 双审交叉：两份报告都标出；`Test-Path docs/agents/issue-tracker.md` = False；`REMOVED-SKILLS.md` 有 `setup-matt-pocock-skills` 行 | `vendor/mattpocock-skills/skills/engineering/setup-matt-pocock-skills` 修复后重新 promote，或改上述 6 个 skill 的「Tracker」段 | 待审 |
| 38 | **`game-dev-loop` 路由到 6 个已退役 skill**：`kimi3-game-gen` `three-pbr-workflow` `render-quality-loop` `playwright-testing` `intro-scene-until-perfect` `guide-from-probes` → 换成现存的 `three-procedural-scenes` / `webapp-testing` / `3d-wood-lighting-scorecard` 或删掉对应步骤；2026-10-26 已降到 tier B | 双审交叉；`SKILL.md` 第 35–41、62 行 | `game-dev/game-dev-loop` 路由表 | 待审 |
| 39 | **`hyperframes` 指向 4 个已退役伴生 skill**（`/media-use` `/remotion-to-hyperframes` `hyperframes-cli` `hyperframes-registry`）；`opus-video-prompts` 也链 `remotion-to-hyperframes` | 双审交叉；`hyperframes/SKILL.md` 第 30、74 行 | 改两处指针为「用 `npx hyperframes <cmd> --help`」，或从 `vendor/` 修好后重装伴生 skill | 待审 |
| 40 | **`brainstorming` 终点调用 `superpowers:writing-plans`（已退役）**；2026-10-26 已降到 tier B | `brainstorming/SKILL.md` 第 32、260 行 | 终点改为 `to-spec` 或 `source-anchored-design` | 待审 |
| 41 | **小的死指针**：`management-loop` → `god-leader-advisor`；`prd` → `/code-to-prd`；`ai-3d-scene-pipeline` → `three-pbr-workflow` 与 `tripo-3d-generation`（后者 2026-10-26 退役）；`software-dev-loop` 第 47 行 → `debugger-persona`（2026-10-26 退役）；`taste-director` → `taste-frontend`（10-25 退役）与 `taste-output`（10-26 退役） | 2026-10-26 退役后对保留 skill 做反向引用扫描 | 各 skill 的路由表删掉死名 | 待审 |
| 42 | **`skill-distill` 是为另一个仓库写的**（`.claude/skills/`、`v04-delivery`、`dev-server`、每条沉淀一个 PR），与本 vault 的「先进 `SKILL_CANDIDATES.md`、批量审核再改」相冲突；2026-10-26 已降到 tier B | `skill-distill/SKILL.md` 第 15、38 行与 §三、§六 | 改写成本 vault 的流程，或明确标成「通用模板」并去掉仓库特有路径 | 待审 |
| 43 | **Kilo 没有隐藏机制，tier B 在 Kilo 里不生效**；Claude Code 侧也要跑 `scripts/apply-tiers.ps1` 才写 `skillOverrides`（本机 `~/.claude/settings.json` 无此键）；mattpocock 的 `disable-model-invocation: true` 又会把 tier A 的 `grill-me`/`implement` 从模型视野里拿掉 | 两份报告的可见性测量不同（281 全可见 vs 270 可见、54 带描述）；`Select-String skillOverrides ~/.claude/settings.json` = 0 | `AGENTS.md` 加一节「tier 在各 harness 的真实效果」；新机器上跑 `apply-tiers.ps1` | 待审 |
| 44 | **`learn` / `cindy-skill-creator` 是 Cindy 宿主装的系统 skill**（`~/.agents/skills/*` → junction 到 `%APPDATA%\Cindy\shared-system-skills\.active\`），vault 不该删也不该收录，但审计脚本会把它们算进来 | `Get-Item ~/.agents/skills/learn` = ReparsePoint → Cindy；两份报告都把 `learn` 评为最低分 | `defect_audit.py` / `score_skills.py` 跳过 target 不在 `~/.claude/skills` 的 junction；`INSTRUCTION.md` 加一行「宿主自带，不归 vault 管」 | 待审 |

| 45 | **「看起来像 3D」≠「能进数据驱动的 PCG 管线」** —— 一座岛的生成**不消费**「一件物品的表面质感」层与「一个镜头的效果」层
2026-11-01 对 219 个 skill 做关键词粗筛（59）→ 人工评分池（28）→ 逐个读原文打 R/A/E 分：`mengto` 的 19 个 3D skill 里 **9 个**只解决「表面质感 / 单个镜头」层（wood / metal / cloth / paper material、sky-rays、underwater-god-rays、orbit-inspect、ai-3d-character）⇒ A 分 ≤ 1；真正能进的是 `procedural-3d-scenes` / `three-procedural-scenes` / `three-clay-scenes`（10/10/9）
评分口径固化：**R 相关性 0–4 / A 可迁用性 0–3 / E 证据强度 0–3，每分必须带原文锚点**；落地写进 `AI_Tutor-LearnerTown` 的 `AGENTS.md` §23.1b | 待审 |
| 46 | **3D 主线 skill 的元数据指向 vault 里不存在的路径**（`source-of-truth: .claude/skills/<name>`）
2026-11-01 实测：本 vault 的真实布局是 `SKILL/<分类>/<名>/SKILL.md`，而 `game-dev/procedural-3d-scenes` / `three-procedural-scenes` / `three-clay-scenes` 的 frontmatter `source-of-truth` 仍写 `.claude/skills/<name>` ⇒ 按它去找一定找不到
三个 3D 主线 skill 的 frontmatter `source-of-truth` 改成 `SKILL/<分类>/<名>` | 待审 |
| 47 | **断链引用：3D skill 指向 vault 里根本不存在的 skill** ⇒ 拿它们当先例是错的
2026-11-01 实测：`game-dev/ai-3d-scene-pipeline` 引用 `tripo-3d-generation` 与 `three-pbr-workflow`（两者在 vault 里**不存在**，其中 `tripo-3d-generation` 已于 2026-10-26 退役）；`game-dev/game-dev-loop` 指向的 7 个 skill 全部缺失
删掉这些指针，或换成现存的 `three-procedural-scenes` / `webapp-testing` / `3d-wood-lighting-scorecard` | 待审 |
| 48 | **与「自包含单 HTML / 零外部资源 / 不装依赖」三条工程红线正面冲突的 3D skill 段**
2026-11-01 实测：`video/mengto/3d-high-resolution-textures` 写 "Keep assets external and cacheable"；三个 material skill 的 `PROMPT.md` 要求从 unpkg 用 import map 装 three + 引 Google Fonts；`video/mengto/3d-wood-lighting-scorecard` 要求 `npm i playwright-core`
在这三个 skill 里加一节「**本仓变体**」：外部资产改成离线烘焙；依赖改成用已有的无头浏览器 | 待审 |
| 49 | **写死坐标 / 硬编码参考实现** —— 与「自由文本不得驱动世界」直接冲突
2026-11-01 实测：`3d-metal-material` 写死亮卡位置与辐射度；`3d-falling-leaves` 自述参考实现用 "hardcoded roof rectangles"
两个 skill 各加一条「**参数化替代表**」：把写死值改成从场景描述读 | 待审 |
| 50 | **判据不可执行：验收标准里没有阈值** ⇒ 「过了」和「看着对」长得一模一样
2026-11-01 实测：`three-clay-scenes` 的 Definition of done 是 "recognizably complete"（无阈值）；`3d-wood-lighting-scorecard` 自己写明 "Scoring a different scene means writing that function, not changing the metrics" ⇒ **换岛必须重写，不是改参数**
两个 skill 的验收表各补一条「**可执行判据**」（带具体数字 + 退出码） | 待审 |
| 51 | ★ **skill 自己写明的负面结论，最该记住**：`procedural-3d-scenes` 的 Clay 部分是**新建的目标工作流**，不是已验证的既有能力
2026-11-01 读原文：`game-dev/procedural-3d-scenes/references/project-evidence.md` 写 "Critical negative finding: the repository has **no general clay/white-model/no-surface-texture mode**"，且审计注明 "did **not** rerun builds, browser tests, benchmarks"
引用该 skill 时**必须带上这句负面结论** —— 不得当成「已跑通的先例」；可在它的 `SKILL.md` 顶部加一条引用者须知 | 待审 |
| 52 | **h3-seedance-prompt-library 的片段计数三处不一致**：frontmatter `fragments: 271`、`library/index.md` 头部写 637、实际 `### PREFIX-NN ·` 标题共 603 条 | 2026-11-05 导入时用 `Select-String '^### [A-Z]{2,4}-\d{2} ·'` 逐文件统计，22 个维度文件求和 603 | 该 skill 的 `SKILL.md` frontmatter 与 `library/index.md` 头部改成同一数字，或在两处都删掉具体数量 | 待审 |
| 53 | **h3-seedance-prompt-library 的可执行路径写死在别人的机器上**：`scripts/update.sh` 的同步目标默认 `C:/Users/Intel/.claude/skills`；`agents/h3-seedance-translator.md` 回写源库指向 `D:\AI训练\AI导演技能库-src\...` | 2026-11-05 `Test-Path` 实测两者均为 `False` | `update.sh` 默认改 `$HOME/.claude/skills`（`CINDY_SKILLS_DIR` 覆盖机制已存在）；translator 的回写路径改为相对库根 | 待审 |
| 54 | **h3-seedance-prompt-library 的引用层有死链**：`SKILL.md` 目录树漏列实际存在的 5 个库文件（`h3-syntax.md` / `color-grading.md` / `coverage-editing.md` / `shot-sequencing.md` / `vfx-design.md`）；「与其它 skill 的关系」点名的 `DirectorSKILL`、`cinematic-video-prompt-engineer`、`zy-cinematic-realism`、`seedance-prompts`、`visual-skills` 本机一个都没有 | 2026-11-05 目录清点 + 三个 skill store 逐个 `Get-ChildItem -Filter`，命中数均为 0 | 补全目录树；「与其它 skill 的关系」改成「可选：装有这些 skill 时如何配合」，不写成依赖 | 待审 |
| 55 | ★ **把「给 DSH 派活」从 GUI 打字升级成文件握手**：Cindy 往 `.dsh-listen/inbox/<hash>.md` 写任务，DSH 往 `.dsh-listen/receipts/<hash>.json` 写回执（含 hash + 版本号 + 证据路径），监听轮询回执目录。稳态不需要抢前台焦点，也不受「DSH 窗口是否开着」约束 | 2026-11-04 已实测 GUI 半段（剪贴板 + `Ctrl+V` 中文无损；`type_text` 单次只吃 400 字符；`Enter` 回执 `no_change` 是假阴性）；文件握手半段**未实现** | `dispatch-to-dsh` 的「通道阶梯」新增第 0 档 | 待审 |
| 56 | **Blender 4.2+ 的 legacy 单文件 addon 装在 `scripts\addons\`，不在 `extensions\`** —— 查错目录会直接误判「没装」 | 2026-11-07 探针：`%APPDATA%\Blender Foundation\Blender\5.2\scripts\addons` = `['__pycache__','dsh_blender_bridge.py']`（<u>257,340 bytes</u>），`bpy.context.preferences.addons` 含 `dsh_blender_bridge`；而同级 `extensions\` 只有 `.cache`。候选 #10 只讲「怎么启用」，没讲「装在哪、怎么确认装没装」 | 新 skill `blender-mcp`（game-dev/）；并给候选 #10 补一句「Blender 5.x 先查 `scripts\addons` 再下结论」 | 待审 |
| 57 | ★ **DSH Blender Bridge addon 与上游 `ahujasid/mcp-for-blender` 线协议互通 ⇒ 只需一个 addon，DSH 与任意 MCP 客户端可共用同一个 Blender** | 2026-11-07 实测：用上游线格式 `{"type":"get_scene_info","params":{}}` 打 `127.0.0.1:9876`，DSH addon 回 `{"status":"success","result":{...}}`（真实场景 Cube/Light/Camera）；再起 `uvx mcp-for-blender`（PyPI <u>2.2.7</u> / serverInfo <u>1.30.0</u>）走完 MCP stdio 全握手，`tools/list` <u>9</u> 个、`tools/call get_scene_info` 成功。上游 `server.py:242` 只把 `status=="error"` 判为失败，`success` 被接受 | 新 skill `blender-mcp` | 待审 |
| 58 | **「Blender MCP addon 独占 9876」不是硬约束：三处端口都可改** | DSH addon `bpy.types.Scene.dshbb_port = IntProperty(default=9876)`（`addon/dsh_blender_bridge.py:5936`）；后端 `dsh-blender.config.json` 有 `addonHost/addonPort/httpPort`；上游有 `BLENDER_PORT` 环境变量与 `--port` 参数（README 环境变量表） | 新 skill `blender-mcp`（与 #57 合并成一节更合适） | 待审 |
| 59 | **代理 / GitHub 可达性是时段性的，历史结论不能固化：判定必须现场双测** | 2026-10-24 候选 #19 记「代理对 GitHub 返回 403」；2026-11-07 本轮实测 `api.github.com` / `raw.githubusercontent.com` / `github.com` 三个域名「带代理 = <u>200</u>、直连 = <u>200</u>」，而同一小时更早时 `raw.githubusercontent.com` 直连曾 <u>30 秒</u>超时 ⇒ 同机同小时内直连时好时坏 | `software-development/windows-agent-toolchain`（候选 #8/#11/#19 同坑簇）——把 #19 的结论从「清代理」改成「每次现场测两条路径（带代理 × 直连 × ≥2 个域名）」 | 待审 |

| 60 | **会自带 npm 依赖的 skill 会破坏「vault ↔ store 逐字节一致」这条不变量**：`motion-showreel/scripts/setup.sh` 优先把 `node_modules/`（playwright + tone）装进 skill 自身目录，而 `sync-skills.ps1` / `verify-install.ps1` / `compare-skill.ps1` 都没有排除 `node_modules` ⇒ 首次渲染后会多出几百 MB 的「多出文件」，`verify-install` 报 MISMATCH | 2026-11-07 装 `video/motion-showreel` 时读 `scripts/setup.sh` 第 14–20 行判定分支（`[ -w "$HERE" ]` → 装进 `$HERE`）；三个脚本 `grep -i node_modules` 全部零命中 | `scripts/*.ps1` 统一加排除（`node_modules` / `.cache` / `out/`）；或给 manifest 加「运行时目录」列，这类路径不进哈希 | 待审 |

| 61 | **`removed-skills.txt` 里的名字不等于「可以无脑删」**：`hyperframes-cli` / `hyperframes-registry` / `media-use` 在 retired 表里，同时又以**真身目录**存在于 6 个 hyperframes 店（cursor/copilot/kiro/lingma/qoder-cn/codebuddy），是 hyperframes 安装器装的，不归 vault | 2026-11-08 铺开 10 个 store 前逐店比对 retired 表，命中 18 处，全部是 `LinkType` 为空的真身目录 | retired 清理只删 vault 自己建的 junction；外来真身保留并在 sync 输出里点名（已写进 `sync-skills.ps1` 的 ownership rule） | **已落地** |

> 注：`dispatch-to-dsh` skill 是 2026-11-04 依用户明确要求（「应该把它内化成一个 skill」）**直接创建**的，未走本队列审核；如需回退或改写，改 `C:\Users\yuhang\.claude\skills\dispatch-to-dsh\SKILL.md`（2026-11-06 起四个 store 的唯一真身；`.kilo` / `.codex` / `.agents` 均为指向它的 junction）。

## 已采纳并落地的（供追溯）

| 经验 | 落位 | 证据 |
| --- | --- | --- |
| 时长只有一个事实来源（音频实测，估算只做备胎） | `references/form4-video-delivery.md` §1 | 分镜估算 290s vs 旁白实测 177.8s（差 39%），后半段音画全错 |
| 静帧推镜必须逐帧亚像素渲染（别用 `zoompan` 整数裁剪） | 同上 §2 + `references/scripts/render_pipe.py` | 冻结帧 15/39、抖动残差 0.161 → 逐帧渲染后 1/39、0.002 |
| 交付前跑抽帧最近邻校验 + 抖动量化（含阈值） | 同上 §3 + `references/scripts/verify_video.py` | 阈值标定表在 `references/scripts/README.md` |
| 字体失败即报错，绝不静默回退；图标不用 emoji | 同上 §5 + `SKILL.md` 常见坑 | `ImageFont.load_default()` 回退 = 10px 位图字体，中文豆腐块、字号全失效 |
| 体积不是质量指标（变小可能是卡顿症状） | `SKILL.md` 常见坑 | 卡顿版 16.7MB < 平滑版 28.8MB（重复帧白拿压缩率） |
