---
name: h3-seedance-prompt-library
description: >-
  Modular prompt library for MiniMax H3 (海螺 03 / Hailuo 03) and Seedance 2.5, plus a translator
  agent that turns plain-language intent into model-ready prompts. Use when the user wants to write,
  combine, or debug a prompt for H3 or Seedance 2.5, mentions 海螺提示词 / H3 提示词 / 即梦提示词 /
  Seedance 提示词 / 视频提示词, wants to assemble a prompt from reusable fragments, or wants a
  keyframe / reference image prompt to feed a video model. 触发词：提示词库、提示词组合、大白话转
  提示词、H3、Seedance、即梦、海螺、图生视频提示词、分镜提示词。
version: 1.0.0
license: MIT
examples:
  - examples/example-01-rainy-tokyo.md
  - examples/example-02-image-to-video.md
metadata:
  models:
    - MiniMax H3
    - Seedance 2.5
  fragments: 271
  dimensions: 13
  tags: [video, ai-video, prompt, prompt-library, seedance, hailuo, h3, minimax, storyboard, image-to-video]
---

# H3 + Seedance 2.5 提示词库

一个**按镜头要素拆开**的模块化提示词库，配一个翻译 Agent：用户说大白话，Agent 从库里挑零件拼成
MiniMax H3 三字段提示词 + Seedance 2.5 七段提示词。

核心原则：**不是加滤镜，是还原用户脑子里那个画面。**

## 何时使用

- 用户要写 / 改 MiniMax H3（海螺 03）或 Seedance 2.5 的提示词。
- 用户说「我想拍个 XX」这种口语描述，需要变成成品提示词。
- 用户要拿参考图 / 关键帧喂给视频模型，需要配套出图提示词。
- 用户已有提示词但出片不对，要定位问题（脸崩、乱字幕、运镜乱、节奏平）。

不适用：纯图片生成任务（用 visual-skills / image skill）、剪辑时间线规划（用 DirectorSKILL）。

## 目录

```
h3-seedance-prompt-library/
├── SKILL.md                       本文件
├── README.md                      人读的说明
├── agents/
│   ├── h3-seedance-translator.md  翻译 Agent（subagent）定义
│   └── openai.yaml                Agent 界面配置
├── scripts/
│   └── build-index.sh              扫描库文件重建 index.md
└── library/                       提示词库本体
    ├── index.md                   维度索引 + 全部片段 ID 清单
    ├── model-syntax.md            两模型语法速查（先读这个）
    ├── subject-consistency.md     主体与一致性    SUB-01~
    ├── scene-environment.md       场景环境        ENV-01~
    ├── action-beats.md            动作节拍        ACT-01~
    ├── camera-movement.md         运镜            CAM-01~
    ├── lighting.md                光线            LIT-01~
    ├── style-texture.md           风格与质感      STY-01~
    ├── color-tone.md              色调与色彩      COL-01~
    ├── mood-emotion.md            氛围与情绪      MOOD-01~
    ├── audio-dialogue-music.md    音频对白配乐    AUD-01~
    ├── negative-constraints.md    负面约束        NEG-01~
    ├── pacing-duration.md         节奏与时长      PAC-01~
    ├── image-model.md             图像模型提示词  IMG-01~
    ├── story-structure.md         分镜脚本叙事    STO-01~
    ├── seedance-syntax.md        Seedance 官方规则  SD-01~
    ├── reference-modes.md        参考模式（图生视频）REF-01~
    ├── action-imitation.md       动作模仿与驱动  AIM-01~
    ├── director-styles.md        电影大师风格模仿  DIR-01~
    └── shot-techniques.md        拍摄手法与题材技法  TEC-01~
```

每个片段都是**可直接拼装的成品句**，带 `{占位符}`，不是概念解释：

```markdown
### CAM-03 · 缓慢推近
- **中文片段**：`镜头以极缓的速度向前推近（slow push-in），幅度小，速度约每秒推进画面高度的 2%。`
- **英文片段**：`The camera performs a very slow push-in, small in amplitude, advancing about 2% of frame height per second.`
- **适用**：两者
- **要点**：一镜只给一个主运动，不要与 orbit / zoom 混用。
```

## 运行模型

翻译 Agent 跑在 `MiniMax-M3.1-Flash`（provider `minimax`），与主会话同一个模型，不额外占用其它供应商额度。改模型只动 `agents/h3-seedance-translator.md` 的 frontmatter `model:` 那一行；Orca worker 承载时等价参数为 `model: MiniMax-M3.1-Flash` + `provider_id: minimax`。

主模型不可用时按 `agents/fallback-models.json` 的 priority 降级到本地模型（llama.cpp server `:8080` / Ollama `:11434`，均为 OpenAI 兼容端点），由 `scripts/local-llm.sh` 自动执行。降级产出必须显式标注「本次由本地模型 X 生成，未经主模型复核」。

## 自动更新

一条命令：`bash scripts/update.sh`（Windows 可双击 `update.cmd`）。

1. **同步** src/ → `C:\Users\Intel\.claude\skills\h3-seedance-prompt-library`
2. **索引** 重建 `library/index.md`
3. **情报** 抓 MiniMax 官方仓库与火山引擎文档原件，与上次快照比对，产出 `library/intel/CHANGES-<时间戳>.md`

情报只报不自动改写库——变化由人确认后再并入 `library/model-syntax.md`。抓取源在 `scripts/update.sh` 的 `SOURCES` 数组。

## 两模型书写规则速览

完整规则见 `library/model-syntax.md`；以下是最容易写错的几条。

### MiniMax H3（海螺 03）

- **三个字段**：`integrated_multimodal_description` / `overall_soundscape` / `non_diegetic_music`。
- **改写段一律英文**（官方 Output Rules）——只有 `<d>` 内的对白歌词与画面可见文字保留原语言。
- **对白格式**：`<d>[English] 台词原文</d>`，说话人 `(S1)`；画外音用官方固定短语 `says in an off-screen voiceover` + 紧跟闭嘴声明。**没有 OS/VO 标记。**
- **参考标签**：`<Subject N>` / `<Picture N>` / `<Video N>` / `<Audio N>`，四类各自独立编号。
- **首尾帧官方固定句**：`is fully referenced.` / `aligns with the 0.00-second mark` / `Use @ImageN as the first frame.` 属 Seedance 侧，H3 别混。
- **时长 4~15 秒**；分镜 `[Shot 1]` / `[Shot 2] At MM:SS.mmm`。
- 官方文件**未说明**：帧率、分辨率档位、字数上限、参考素材数量上限。

### Seedance 2.5

- **符号规范**：音乐 `()`、音效 `<>`、对白 `{}`、字幕 `【】`。H3 那边是 `<d>[语言]…</d>`，**两套不要混**。
- **官方结构**：基础四行（主体动作环境 → 风格氛围 → 镜头景别位置运动 → 对白环境声音效音乐）；参考生视频五小节（`【Generation Goal】`/`【Reference Asset Roles】`/`【Subjects and Relationships】`/`【Event Script】`/`【Maintain Consistency】`）。库里的七段式是**自加的装配辅助**，不是官方结构。
- **总时长是参数，不写进提示词**。时间结构用区间/时间点/阶段，区间之间不留缺口。
- **锁定语义**：编辑·首尾帧·延长 = 有锁定（宽高比时长不可自定义）；参考·多宫格·关键帧 = 无锁定。
- **参考素材**：`@ImageN`/`@VideoN`/`@AudioN`，每个素材一个明确职责；单次最多 50 个；支持多视图。
- **负向控制分四类**：字幕 / 音效 / BGM / 对白分开写；音频约束开头结尾各一遍。
- **能力表述**：「单段 30 秒视频直出」；宽高比 `[0.4, 2.5]` 任意。
- 官方**未说明**提示词字数上限。

## 组装流水线
1. **抽事实** —— 主体 / 动作 / 环境 / 情绪 / 风格 / 声音 / 时长 / 画幅 / 引擎 / 模式（文生 or 图生）。
2. **定向** —— 只问会改变结果的问题，最多 3 个，一次问完。配色、运镜、配乐、景别自己定。
3. **定结构** —— 单镜一镜到底；多镜用 Seedance 30 秒四拍 / H3 ≤15 秒两三镜。动作预算按用户实际描述，不擅自加。
4. **挑片段** —— 每维度挑 1~2 条，一镜只给一个主运镜。
5. **装配** —— H3 分三字段；Seedance 按七段顺序写完整句子。
6. **补约束** —— 3~6 条负面约束，点名要保持的具体细节。
7. **自检** —— 8 条硬检查，过一遍再输出。

完整流程见 `agents/h3-seedance-translator.md`。

## 两模型硬事实

| | MiniMax H3（海螺 03） | Seedance 2.5 |
| --- | --- | --- |
| 字段 | `integrated_multimodal_description` / `overall_soundscape` / `non_diegetic_music` | 七段：主体 / 环境 / 动作与时间 / 镜头与构图 / 光线与色彩 / 音频 / 约束 |
| 分镜标记 | `[Shot 1]`，后续 `[Shot 2] At MM:SS.mmm` | 写成完整句子 |
| 时长 | 4~15s（官方） | 4~30s |
| 分辨率 / 帧率 | 2K / 24 FPS（官方文件未说明帧率；2K 来自官方场景技能的分辨率选项卡） | 480p·720p·1080p |
| 音频 | 对白/音效/配乐三段分离（官方文件未说明采样率与声道） | 音频单列一段 |
| 参考素材 | 四类标签 `<Subject N>` / `<Picture N>` / `<Video N>` / `<Audio N>`，**各自独立编号，官方未说明数量上限** | `@Image1` `@Image2` `@Video1` `@Audio1` 槽位指令 |
| 提示词长度 | 官方文件未说明字数上限 | 建议 30~80 词 |
| 负面约束 | 无独立字段，写成正向陈述放第一字段末尾 | 放第七段「约束」 |
| 改写语言 | **官方要求改写段一律英文**（对白 `<d>` 内保留原语言） | 中文响应更好 |

> ⚠️ 以上凡标「官方文件未说明」的，是官方规范里真的没写，别再当硬约束引用。

更多差异见 `library/model-syntax.md` 的对照表。

## 十条不许违反

1. 一镜只给**一个**主运镜，不混 pan + orbit + zoom + dolly。
2. 镜头只在出现**新主体 / 新空间 / 新状态 / 新视点 / 新时间点**时切。
3. 动作必须按时间先后写成节拍（先 / 然后 / 接着 / 最后），并给出物理因果。
4. 要保持的东西**逐项点名**（脸、服装、产品几何、地平线），不写「保持一致」。
5. 音画绑定：音效写在具体动作上，不泛泛列清单。
6. 完整句子，不堆关键词。
7. 不写用户没说过的剧情，只补技术性细节。
8. 风格宁克制勿过度，用户要的是「最接近他想法」。
9. 提示词是方向不是保证，稳定性问题如实说明。
10. 用户说「只要提示词」就只给提示词。

## 与其它 skill 的关系

- `DirectorSKILL` —— 导演级的整体调度（分镜表、剪辑、声音设计），本库是它的**提示词执行层**。
- `cinematic-video-prompt-engineer` —— 剧情诊断 + 电影化改写，本库是**零件库**，两者互补。
- `zy-cinematic-realism` —— 造梦师风格库，本库的 `style-texture` / `lighting` 是它的通用化版本。
- `seedance-prompts` —— Seedance 2.0 的剧本与分镜生成，本库覆盖 **2.5** 并提供可组合片段。

需要「先诊断剧情」走 cinematic，需要「直接拿零件拼」走本库。
