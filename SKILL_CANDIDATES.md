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
| 27 | **兄弟 skill 的 description 第一行必须能互相区分**：先写「是哪个格式 / 平台 / 后端 / 领域」，再写「不适用于谁」——因为预算不够时 harness 会先砍 description，只剩名字 | 2026-10-25：`skill_pressure_analysis.py` 实测 16 对 Jaccard ≥ 0.30（`brand-docx/pptx/xlsx` 0.659–0.714 最高），arXiv:2605.24050 实测 skill shadowing 是 202 规模下 pass-rate 掉 21% 的主因 | 改 `design/brand-docx` `design/brand-pptx` `design/brand-xlsx` 的 frontmatter 首行（各写清 Word 文档 / PowerPoint 演示 / Excel 工作簿 + 「不适用于 X」） | 待审 |
| 28 | **router 型 skill 的 description 不能包含兄弟的触发词**：`style-report` 只在用户点名「某公司风格」时用 | 同上实测 `style-report`↔`style-google` 0.300、`style-*` 互配 0.316–0.333 | 改 `management/style-report` 首行：加「仅当用户点名公司风格时用；其他情况不要用」 | 待审 |
| 29 | **公司风格类 skill 首行直接写公司名** | 同上实测 6 个 `style-*` 互配 0.316–0.333 | 改 `management/style-alibaba` `style-bytedance` `style-google` `style-microsoft` `style-tencent` 首行（阿里/字节/Google/微软/腾讯双轨制） | 待审 |
| 30 | **平台类 skill 首行写平台名**（LinkedIn / Twitter） | 同上实测 `blog-to-linkedin-post`↔`blog-to-twitter-post` 0.548 | 改 `content/blog-to-linkedin-post` `content/blog-to-twitter-post` 首行 | 待审 |
| 31 | **周期类 skill 用「节奏」当触发词**：一次性的状态报告 vs 每周固定 vs 季度复盘 | 同上实测 `project-update`↔`weekly-report` 0.429 | 改 `management/project-update`（一次性项目状态汇报）、`management/weekly-report`（每周固定节奏）首行 | 待审 |
| 32 | **素材源类 skill 首行点名来源**：Aura Assets vs Unsplash | 同上实测 `aura-asset-images`↔`unsplash-asset-images` 0.419 | 改 `content/aura-asset-images` `content/unsplash-asset-images` 首行 | 待审 |
| 33 | **后端类 skill 首行点名后端**（Loki vs Prometheus） | 同上实测 `grafana-loki-label-analyzer`↔`grafana-prometheus-label-strategy` 0.377 | 改 `devops/grafana-loki-label-analyzer` `devops/grafana-prometheus-label-strategy` 首行 | 待审 |
| 34 | **同名领域循环的 skill 首行写领域**：game-dev-loop vs software-dev-loop | 同上实测 0.375 | 改 `game-dev/game-dev-loop` `software-development/software-dev-loop` 首行（游戏 / 通用软件） | 待审 |
| 35 | **同族 skill 用「产出物」区分**：grill-me 只出追问，grill-with-docs 追问 + ADR/术语表 | 同上实测 `grill-me`↔`grill-with-docs` 0.556 | 改 `software-development/grill-me` `software-development/grill-with-docs` 首行 | 待审 |
| 36 | **「改现有」与「新建」要分开**：`hands-on-deck` 改 pptx，`pptx` 新建 | 同上实测 `hands-on-deck`↔`pptx` 0.362 | 改 `content/hands-on-deck`（修改已有 .pptx）、`vendor/anthropics-skills/skills/pptx`（新建）首行；vendor 副本不手改，改为在 vault 内建 curated 副本 | 待审 |

## 已采纳并落地的（供追溯）

| 经验 | 落位 | 证据 |
| --- | --- | --- |
| 时长只有一个事实来源（音频实测，估算只做备胎） | `references/form4-video-delivery.md` §1 | 分镜估算 290s vs 旁白实测 177.8s（差 39%），后半段音画全错 |
| 静帧推镜必须逐帧亚像素渲染（别用 `zoompan` 整数裁剪） | 同上 §2 + `references/scripts/render_pipe.py` | 冻结帧 15/39、抖动残差 0.161 → 逐帧渲染后 1/39、0.002 |
| 交付前跑抽帧最近邻校验 + 抖动量化（含阈值） | 同上 §3 + `references/scripts/verify_video.py` | 阈值标定表在 `references/scripts/README.md` |
| 字体失败即报错，绝不静默回退；图标不用 emoji | 同上 §5 + `SKILL.md` 常见坑 | `ImageFont.load_default()` 回退 = 10px 位图字体，中文豆腐块、字号全失效 |
| 体积不是质量指标（变小可能是卡顿症状） | `SKILL.md` 常见坑 | 卡顿版 16.7MB < 平滑版 28.8MB（重复帧白拿压缩率） |
