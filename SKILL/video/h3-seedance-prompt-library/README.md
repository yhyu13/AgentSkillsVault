# H3 + Seedance 2.5 提示词库

一个按**镜头要素**拆开的模块化提示词库，配一个翻译 Agent：你说大白话，它挑零件拼成成品提示词。

覆盖 MiniMax H3（海螺 03 / Hailuo 03）与 Seedance 2.5，含视频、关键帧出图、分镜脚本、原生音频四类。

---

## 快速开始

### 方式 A · 说大白话（推荐）

在对话里直接说：

> 一个人在下雨的东京街头跑过便利店门口，霓虹灯打在他身上，很孤独的感觉

Agent 会：

1. 复述它理解的画面，标出它替你补的默认设定
2. 输出 **H3 三字段版**（`integrated_multimodal_description` / `overall_soundscape` / `non_diegetic_music`）
3. 输出 **Seedance 2.5 七段版**
4. 给出最可能翻车的点

### 方式 B · 指定维度组合

> 用 SUB-03 + CAM-05 + LIT-07 拼一条，5 秒

Agent 直接从库里抽这几块零件装配。

### 方式 C · 只要提示词

> 只要提示词，别分析了

只输出成品，不做复述和自检。

---

## 库结构

| 文件 | 维度 | ID 段 |
| --- | --- | --- |
| `model-syntax.md` | 两模型语法速查 + 差异表 + 错误速查 | — |
| `subject-consistency.md` | 主体与一致性 | `SUB-` |
| `scene-environment.md` | 场景环境 | `ENV-` |
| `action-beats.md` | 动作节拍 | `ACT-` |
| `camera-movement.md` | 运镜 | `CAM-` |
| `lighting.md` | 光线 | `LIT-` |
| `style-texture.md` | 风格与质感 | `STY-` |
| `color-tone.md` | 色调与色彩 | `COL-` |
| `mood-emotion.md` | 氛围与情绪 | `MOOD-` |
| `audio-dialogue-music.md` | 音频对白配乐 | `AUD-` |
| `negative-constraints.md` | 负面约束与稳定性锚点 | `NEG-` |
| `pacing-duration.md` | 节奏与时长 | `PAC-` |
| `image-model.md` | 图像模型提示词（关键帧 / 参考图） | `IMG-` |
| `story-structure.md` | 分镜脚本与叙事结构 | `STO-` |
| `seedance-syntax.md` | Seedance 2.5 官方书写规则（符号/结构/时间戳/负向控制/锁定） | `SD-` |
| `reference-modes.md` | 参考模式（首帧/尾帧/首尾帧/多参考/关键帧/白模/多宫格/编辑/延长） | `REF-` |
| `action-imitation.md` | 动作模仿与驱动（即梦 Action Imitation 接口 + 动作参考 + 编辑延长） | `AIM-` |
| `director-styles.md` | 电影大师风格模仿（38 位导演逐位 + 流派/类型/特殊风格） | `DIR-` |
| `shot-techniques.md` | 拍摄手法与题材技法（热门运镜/摄影技法/转场/体裁/构图） | `TEC-` |

每个片段长这样：

```markdown
### CAM-03 · 缓慢推近
- **中文片段**：`镜头以极缓的速度向前推近（slow push-in），幅度小，速度约每秒推进画面高度的 2%。`
- **英文片段**：`The camera performs a very slow push-in, small in amplitude...`
- **适用**：两者
- **要点**：一镜只给一个主运动，不要与 orbit / zoom 混用。
```

`{占位符}` 标出需要替换的部分，中文片段可直接粘贴，英文片段用于换引擎时快速迁移。

---

## 模型与自动更新

### 模型路由

| 层级 | 模型 | 说明 |
| --- | --- | --- |
| 主 | `MiniMax-M3.1-Flash`（provider `minimax`） | 与主会话同一个模型 |
| 备 1 | `llama.cpp:arex-2` @ `:8080` | 实测最快，支持 `enable_thinking=false` 干净出字 |
| 备 2 | `ollama:qwen2.5:14b` | 11s，速度质量平衡档 |
| 备 3 | `ollama:qwen3:8b` | 8s，最快档，只适合精简模式单镜 |
| 备 4 | `ollama:qwen38-27b-q3km` | 20s，本地质量最强可用档 |
| 备 5 | `ollama:qwen3.5:27b` | 69s，质量优先时选它 |
| 备 6 | `ollama:qwen2.5vl:7b` | 带视觉，处理参考图 |

路由表：`agents/fallback-models.json`。主模型挂了就按 priority 挨个试本地。

```bash
bash scripts/local-llm.sh --prompt-file 提问.md          # 自动走降级链
bash scripts/local-llm.sh --prompt-file 提问.md --model ollama:qwen3.5:27b   # 指定某一个
bash scripts/doctor.sh --probe                          # 体检本地服务并实探能否出字
bash scripts/doctor.sh --refresh                        # 探测到新模型后并入路由表
```

### 一条命令做完全部自动更新

```bash
bash scripts/update.sh          # 或双击 update.cmd
```

三件事一起做：

1. **同步** —— 把 src/ 镜像到 `C:\Users\Intel\.claude\skills\h3-seedance-prompt-library`（Cindy 实际加载的目录）
2. **索引** —— 重建 `library/index.md`
3. **情报** —— 抓 MiniMax 官方仓库与火山引擎文档原件，跟上次快照比对，产出 `library/intel/CHANGES-<时间戳>.md`

抓取源在 `scripts/update.sh` 的 `SOURCES` 数组里，加一行就能多跟一个官方源。

**情报只报不自动改写。**模型擅自改你的提示词库风险太大，所以变化只进报告，等人看过再并进 `model-syntax.md`。这正是这套机制第一次运行时抓出 11 处严重错误的原因——第三方教程站和官方原件对不上的地方不少。

### Agent 跑着跑着自动扩库

翻译 Agent 碰到库里没有的类型时，会按同样格式写一条新片段并**直接回写到源库**（`agents/h3-seedance-translator.md` 的「库文件没覆盖时」一节）。下次直接命中，不再重造。

## 示例

`examples/` 目录里有两个完整走查：

- `example-01-rainy-tokyo.md` —— 大白话 → 翻译 Agent 补齐的默认值 → H3 三字段版 + Seedance 七段版 + 自检与风险
- `example-02-image-to-video.md` —— 图生视频全流程：先出参考图 → Seedance 运动优先公式 → H3 官方对齐指令句

新装后先读这两个，比读 README 快。

---

## 翻译 Agent

定义在 `agents/h3-seedance-translator.md`，Claude Code 的 subagent 格式。

**运行模型**：`MiniMax-M3.1-Flash`（provider `minimax`）——与主会话同一个模型，不额外占用其它供应商额度。frontmatter 里写死了 `model: MiniMax-M3.1-Flash`；若某个宿主不认这个别名，它会回落到会话默认模型，也就是同一个。

改模型只动 frontmatter 那一行。若改用 Orca worker 承载，等价参数是：

```
model: MiniMax-M3.1-Flash
provider_id: minimax
```

安装到某个项目：

```bash
cp agents/h3-seedance-translator.md <项目>/.claude/agents/
```

Agent 的七步流水线：

1. **抽事实** —— 主体 / 动作 / 环境 / 情绪 / 风格 / 声音 / 时长 / 画幅 / 引擎 / 模式
2. **定向** —— 最多问 3 个会改变结果的问题，一次问完
3. **定结构** —— 单镜 or 多镜（Seedance 30 秒四拍 / H3 ≤15 秒两三镜）
4. **挑片段** —— 每维度 1~2 条，一镜只给一个主运镜
5. **装配** —— H3 三字段 / Seedance 七段
6. **补约束** —— 3~6 条负面约束，点名要保持的细节
7. **自检** —— 8 条硬检查

---

## 十条铁律

1. 一镜只给一个主运镜
2. 只在出现新主体 / 新空间 / 新状态 / 新视点 / 新时间点时切镜
3. 动作按时间先后写成节拍，并给物理因果
4. 要保持的东西逐项点名，不写「保持一致」
5. 音画绑定，音效写在具体动作上
6. 完整句子，不堆关键词
7. 不写用户没说过的剧情
8. 风格克制，用户要「最接近想法」不是「最炫」
9. 提示词是方向不是保证
10. 说「只要提示词」就只给提示词

---

## 扩展库

库缺片段时，Agent 会按同样格式补写并提示同步。手动加片段的格式：

```markdown
### <维度前缀>-<两位数字> · <中文小标题>
- **中文片段**：`<含 {占位符} 的成品句>`
- **英文片段**：`<对应英文>`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：<坑>
```

加完更新 `library/index.md` 的片段清单。

---

## 与其它 skill 的关系

- `DirectorSKILL` —— 导演级整体调度，本库是它的提示词执行层
- `cinematic-video-prompt-engineer` —— 剧情诊断 + 电影化改写，本库是可组合零件
- `zy-cinematic-realism` —— 造梦师风格库，本库的 `style-texture` / `lighting` 是通用化版本
- `seedance-prompts` —— Seedance 2.0 剧本分镜，本库覆盖 2.5
