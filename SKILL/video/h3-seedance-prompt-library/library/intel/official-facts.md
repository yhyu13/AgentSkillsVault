# MiniMax H3 官方提示词规范 · 结构事实

> 本文件只记录从官方原件**读出来的**内容，不做推断。
> 来源文件（均位于 `library/intel/minimax-h3-official/`）：
> - `SKILL.md`（技能入口与 Workflow / Tips）
> - `references_base-en.txt`（T2VA / I2VA / FL2VA / L2VA 基础模式写作指南）
> - `references_ref-en.txt`（全参考模式 Ref2VA 改写输出格式指南）
> - `scenarios/<8 个场景>/SKILL.cn.md` 与 `meta.yaml`（官方中文场景技能）
>
> 凡官方文件未写明的，一律标注「**官方文件未说明**」。
> 引用原文时用「」标明出处（文件名 + 段落标题）。

---

## 一、H3 基础模式（来自 base-en.txt）

### 1.1 三个核心字段

出处：`references_base-en.txt` →「## 2.2 Part Two Contains the Three Core Fields」

字段精确名字与顺序（原文代码块）：

```text
integrated_multimodal_description: [Shot 1] ...

overall_soundscape: ...

non_diegetic_music: ...
```

| 字段名（原文） | 中文 | 官方定义（原文） |
|---|---|---|
| `integrated_multimodal_description` | 多模态整合描述 | "Describes visuals, actions, shots, speakers, dialogue, singing, and diegetic audio along the timeline." |
| `overall_soundscape` | 整体声景 | "Summarizes ambient sound, physical action sounds, and non-verbal human sounds across the entire video." |
| `non_diegetic_music` | 非叙事性音乐 | "Describes background music that the characters cannot hear and only the audience can hear." |

各字段「写什么 / 不写什么」的官方细则：

- `integrated_multimodal_description`（出处：「### 4.1 Develop the Multimodal Description Along the Timeline」）："Every detail should correspond to something visible or audible: visual style, initial composition, subject appearance and position, scene and key props, actions and reactions, shot changes, spoken language, and synchronized diegetic sound."
- `overall_soundscape`（出处：「### 4.6 overall_soundscape」）："Use 1–4 English sentences in one continuous paragraph to summarize the ambient sound, physical action sounds, and non-verbal human sounds across the full video, such as wind, rain, traffic, footsteps, fabric movement, impacts, breathing, laughter, or panting. Dialogue, singing, and diegetic music already belong in the multimodal description and should not be repeated here. Use `N/A` only when the user explicitly requests complete silence throughout the video."
- `non_diegetic_music`（出处：「### 4.7 non_diegetic_music」）："Use 1–3 English sentences to describe background music that the characters cannot hear and only the audience can hear. Focus on instrumentation, speed, rhythm, and dynamic changes; do not use abstract mood words or explain the emotional function of the score. Singing, instruments, radio, television, or phone music audible to the characters are diegetic events and should appear in the multimodal description. Use `N/A` when there is no non-diegetic music."

### 1.2 基础提示词的完整段落顺序

出处：`references_base-en.txt` →「## 2. Final Prompt Structure」，标题分两部分：

**Part One Is the Instruction**（第一部分是指令）
- T2VA："has no image-alignment instruction and begins directly with the three core fields."
- I2VA / FL2VA / L2VA：各自有固定的开场指令句（见 1.3）。
- 硬性位置要求（原文）："The instruction must be the first line of the final prompt, followed by one blank line before the core fields."

**Part Two Contains the Three Core Fields**（第二部分是三个核心字段）
- 顺序固定为：`integrated_multimodal_description` → `overall_soundscape` → `non_diegetic_music`。

因此，完整成品的段落顺序是：

| # | 段落 | 原文标题 | 中文译名 | 适用模式 |
|---|---|---|---|---|
| 1 | 图像对齐指令行（空一行） | Part One Is the Instruction | 第一部分是指令 | I2VA / FL2VA / L2VA（T2VA 无此段） |
| 2 | 主描述字段 | `integrated_multimodal_description` | 多模态整合描述 | 全部 |
| 3 | 整体声景字段 | `overall_soundscape` | 整体声景 | 全部 |
| 4 | 非叙事音乐字段 | `non_diegetic_music` | 非叙事性音乐 | 全部 |

官方指南自身的章节结构（`references_base-en.txt` 目录，逐条）：

1. `## 1. Task Overview` — 任务概览
2. `## 2. Final Prompt Structure` — 最终提示词结构
   - `### 2.1 Part One Is the Instruction` — 第一部分是指令
   - `### 2.2 Part Two Contains the Three Core Fields` — 第二部分包含三个核心字段
3. `## 3. How to Incorporate Keyframes into the Multimodal Description` — 如何把关键帧写进多模态描述
   - `### 3.1 I2VA: Begin from the Image and Develop Forward` — I2VA：从图像开始向前发展
   - `### 3.2 FL2VA: Describe the Path Between the First and Last Frames` — FL2VA：描述首尾帧之间的路径
   - `### 3.3 L2VA: Infer the Opening and Land on the Image at the End` — L2VA：推断开场并落到尾图
4. `## 4. How to Write the Three Shared Core Sections` — 如何写三个共享核心段
   - `### 4.1 Develop the Multimodal Description Along the Timeline` — 沿时间轴展开多模态描述
   - `### 4.2 Shots and Cuts` — 分镜与切点
   - `### 4.3 Camera Motion: Motion Type + Amplitude + Speed` — 运镜：类型 + 幅度 + 速度
   - `### 4.4 Speakers, Dialogue, and Singing` — 说话人、对白与歌唱
   - `### 4.5 On-Screen Text` — 画面文字
   - `### 4.6 overall_soundscape`
   - `### 4.7 non_diegetic_music`
5. `## 5. Cases` — 案例（Case 1 T2VA / Case 2 I2VA / Case 3 FL2VA / Case 4 L2VA）

### 1.3 镜头标记语法

出处：`references_base-en.txt` →「### 4.2 Shots and Cuts」

- 第一镜不带时间戳；后续镜用递增镜号 + 切点时间。
- 原文示例：`[Shot 2] At 00:03.500, the camera cuts to...`
- 原文规则："Do not add a timestamp to the first shot. Use sequential shot numbers for later shots, and begin each one with a strictly increasing cut time that falls within the video duration."
- 切镜短语（原文固定用词）："For ordinary cuts, use `the camera cuts to`, `the shot cuts to`, `the shot transitions to`, `the shot changes to`, or `the shot switches to`. When explicitly requested by the user, cross-dissolve, fade, or wipe may also be used."
- 切镜理由："A cut should introduce new information about the subject, space, state, viewpoint, or time. If only the distance or a slight angle needs to change, prefer camera motion."
- 全参考模式下的同款规则（`references_ref-en.txt` →「### 5.1 Basic Format」）："`[Shot 1]` marks the opening shot and has no timestamp. Later shots use `[Shot N] At MM:SS.mmm, ...` to mark cut times."
- 时间戳格式：`MM:SS.mmm`（例 `00:03.500`、`00:09.000`、`00:05.000`）。

### 1.4 图像对齐行的写法（I2VA / FL2VA / L2VA）

出处：`references_base-en.txt` →「### 2.1 Part One Is the Instruction」

**I2VA**（原文 "always uses"）：

```text
For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.
```

**FL2VA**（原文 "always uses"）：

```text
How the reference pictures align with the target video — Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot N) aligns with the S.SS-second mark of the target video.
```

**L2VA**（原文 "always uses"）：

```text
How the reference pictures align with the target video — <Picture 1> (from [Shot N]) aligns with the S.SS-second mark of the target video.
```

占位符规则（原文）："Here, `N` is the index of the actual final shot, and `S.SS` is the effective video duration formatted to exactly two decimal places. The instruction must be the first line of the final prompt, followed by one blank line before the core fields."

关键帧写法要点（出处：「### 3.1 / 3.2 / 3.3」）：

- I2VA：`<Picture 1>` 是 0.00 秒的实际首帧，属于 `[Shot 1]`。推荐结构：**first-frame anchor → action onset → continuous development → result or reaction**。
- FL2VA：Picture 1 是开场，Picture 2 是结尾。"FL2VA generally favors a single shot so the model can interpolate continuously from the first frame to the last frame. Use multiple shots only when they are explicitly specified. The last frame must be reached by the final `[Shot N]` at the end of the video." 推荐结构：**first-frame state → observable intermediate changes → progressively narrowing differences → last-frame state**。
- L2VA：`<Picture 1>` 是视频的最终帧，属于最后一个 `[Shot N]`，"it does not inherently belong to Shot 1"。推荐结构：**plausible preceding state → explicit action and transition path → gradual convergence in the final shot → last-frame landing**。

### 1.5 参考素材标签语法（基础模式）

出处：`references_base-en.txt` →「### 3.1 / 4.2 / 5.2 Case 2」及 `SKILL.md` →「## Tips for Better Results」

基础模式中出现的标签确切写法：

- `<Picture 1>`（尖括号 + 空格 + 数字）：单张参考图标签。官方示例：
  - `"For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced."`
  - `"the young woman shown in <Picture 1> remains beside the rain-covered train window, preserving her appearance, clothing, seat position, and the carriage layout."`
  - FL2VA 的对齐句里也出现 `Picture 1` / `Picture 2`（**不带尖括号**），而正文锚点句里用 `Picture 1` / `Picture 2`（不带尖括号）或 `<Picture 1>`（带尖括号）两种混用形式，官方原文本身如此。
- `SKILL.md` →「## Tips for Better Results」："Keep reference labels consistent (e.g. `<Picture 1>`, `<Video 1>`, `<Audio 1>`) across every section."

标签使用规则（`SKILL.md` →「## Output Rules」）："Describe each shot by composition, subjects, environment, actions, camera, sound, and the exact point where referenced content appears."、"Avoid plot summaries, unresolved reference labels, and timing that does not match the requested duration."

### 1.6 官方写明的硬约束

| 约束项 | 官方原文 | 出处 |
|---|---|---|
| 时长范围 | "Always match the total duration of the description to the requested video length (4–15 seconds)." | `SKILL.md` →「## Tips for Better Results」 |
| 字段名不得改动 | "Preserve the exact field names, section order, labels, and timing notation from the selected guide." | `SKILL.md` →「## Workflow」第 4 条 |
| 段落顺序 | "Use `integrated_multimodal_description`, `overall_soundscape`, and `non_diegetic_music` in the order shown in `references/base-en.txt`." | `SKILL.md` →「## Base Modes」 |
| 对白/歌词/画面文字的语言规则 | "Write rewrite sections in English; preserve dialogue, lyrics, and visible scene text in their original language." | `SKILL.md` →「## Output Rules」 |
| 改写段语言 | "Write all six rewrite sections in English. Preserve the original language only for dialogue and lyrics inside `<d>` and for text visibly present in the scene." | `references_ref-en.txt` → 开头说明 |
| 镜头时长匹配 | "Always match the total duration of the description to the requested video length (4–15 seconds)." | `SKILL.md` →「## Tips for Better Results」 |
| 对白逐字保留 | "Preserve every original word and punctuation mark verbatim; do not translate or rewrite them." | `references_base-en.txt` →「### 4.4」 |
| 画面文字逐字保留 | "Preserve the original text and punctuation verbatim, without translation." | `references_base-en.txt` →「### 4.5」 |
| 说话人 ID 稳定 | "A speaker keeps the same ID across shots; characters who never vocalize receive no speaker ID." | `references_base-en.txt` →「### 4.4」 |
| 音轨分离 | "Dialogue, singing, and diegetic music already belong in the multimodal description and should not be repeated here." | `references_base-en.txt` →「### 4.6」 |
| 避免抽象词 | "Prefer concrete visual and audio details over abstract words like 'cinematic' or 'beautiful'." | `SKILL.md` →「## Tips for Better Results」 |
| 不得写剧情梗概 | "Avoid plot summaries, unresolved reference labels, and timing that does not match the requested duration." | `SKILL.md` →「## Output Rules」 |

**官方文件未说明**的项目（不得当作官方参数引用）：帧率（FPS）、分辨率档位（2K / 768P 等）、提示词字数上限、参考文件数量上限、音频采样率/声道数、画幅比例枚举、负向提示词字段是否存在。以上在 `SKILL.md`、`references_base-en.txt`、`references_ref-en.txt` 中均无记载。

（`2K`、`768P`、`单片段最长 15s @ 2K` 出现在 `scenarios/3d-animation-short-generator/SKILL.cn.md` 的模型选型卡中，属于场景技能层面的说明，不是提示词规范原文，详见本文件第三部分。）

### 1.7 官方强调的写法偏好（Tips 原文要点，中文转述）

出处：`SKILL.md` →「## Tips for Better Results」（四条原文）

1. 「Always match the total duration of the description to the requested video length (4–15 seconds).」
   → 描述的总时长必须与请求的视频长度一致，写 4–15 秒。
2. 「Keep reference labels consistent (e.g. `<Picture 1>`, `<Video 1>`, `<Audio 1>`) across every section.」
   → 参考标签在所有段落之间保持一致。
3. 「Prefer concrete visual and audio details over abstract words like "cinematic" or "beautiful".」
   → 用具体的视听细节替代「电影感」「漂亮」这类抽象词。
4. 「When using keyframes (I2VA / FL2VA / L2VA), clearly state how the first and/or last frame connects to the timeline.」
   → 用关键帧时，必须说清首帧/尾帧如何接入时间线。

其它散落在正文的写法偏好：

- 运镜要写成句子内的自然动作，不要堆标签：「Camera motion should be written as a natural English action within the shot, rather than stacked as separate labels at the end of a sentence.」（「### 4.3」）
- 幅度与速度只在有意义时才写：「Add amplitude and speed only when they are meaningful; medium amplitude and normal speed are usually omitted.」（「### 4.3」）
- 说话人身份信息（角色类型、年龄、性别、是否在画内、音高、音色、语速、口音）要在首次出场时给足：「provide enough information from the visual and audio context to establish a stable identity」。
- 说话人身份短语、ID、动作、语气一律放在 `<d>` **外面**：「Place the speaker's identifying phrase, ID, action, and delivery outside `<d>`. Inside `<d>`, include only the language tag and the actual user-provided spoken content.」（「### 4.4」）
- 画外音固定短语 + 紧跟闭嘴声明：「For voiceover, use the exact phrase `says in an off-screen voiceover`. Immediately after every voiceover `<d>` block, state that the corresponding on-screen character's lips remain closed.」（「### 4.4」）
- 跨切点对白用 `<scenetrans>` + `<cutoff>`：「When the same line of dialogue or lyrics crosses a cut, use `<scenetrans>` at the connecting points in both parts and explicitly state that the audio continues across the cut. Use `<cutoff>` when speech is truncated by the end of the video.」（「### 4.4」）
- 风格词在 `[Shot 1]` 开头给全：「At the beginning of `[Shot 1]`, state the overall style and initial composition. Common styles include `Cinematic`, `live-action`, `2D-animated`, `3D CG`, `claymation`, `watercolor`, and `vintage film`.」（「### 4.1」）

---

## 二、H3 全参考模式 Ref2VA（来自 ref-en.txt）

### 2.1 六段的精确段名与顺序

出处：`references_ref-en.txt` →「## 1. Overall Structure」

原文："A complete rewrite output consists of six sections in the following order:"

| 序 | 段名（原文） | 中文译名 | 官方职责（原文 Purpose） |
|---|---|---|---|
| 1 | `subject_definitions` | 参考对象定义 | "Defines referenced content and its reference labels" |
| 2 | `summary` | 摘要 | "Summarizes the task type, target video, and main reference relationships" |
| 3 | `retention_analysis` | 保留度分析 | "Describes how referenced content is preserved, transferred, or reused" |
| 4 | `detailed_description` | 详细描述 | "Describes visuals, actions, shots, sound, and dialogue in playback order" |
| 5 | `overall_soundscape` | 整体声景 | "Summarizes ambience and physical sounds" |
| 6 | `non_diegetic_music` | 非叙事性音乐 | "Describes background music audible only to the audience" |

`SKILL.md` →「## Full-Reference Mode」确认同一顺序："Ref2VA rewrites use `subject_definitions`, `summary`, `retention_analysis`, `detailed_description`, `overall_soundscape`, and `non_diegetic_music` in that order. Reference labels stay consistent across all sections."

`references_ref-en.txt` 自身的章节结构：

1. `## 1. Overall Structure` — 总体结构
2. `## 2. Reference Labels and Definitions (subject_definitions)` — 参考标签与定义
   - `### 2.1 <Subject N>`
   - `### 2.2 <Picture N>`
   - `### 2.3 <Video N>`
   - `### 2.4 <Audio N>`
   - `### 2.5 Visual and Audio Tracks from the Same Reference Video`
3. `## 3. summary`
4. `## 4. retention_analysis`
   - `### 4.1 Visible Content`
   - `### 4.2 Audio`
5. `## 5. detailed_description`
   - `### 5.1 Basic Format`
   - `### 5.2 Full-Reference Mode Differences`
   - `### 5.3 Using Reference Labels in Shots`
   - `### 5.4 Speakers, Audio Sources, and Dialogue`
6. `## 6. overall_soundscape and non_diegetic_music`
7. `## 7. Complete Example`

### 2.2 参考标签语法（Ref2VA 确切写法）

出处：`references_ref-en.txt` →「## 2. Reference Labels and Definitions」

原文："Full-reference rewrites use four types of labels to identify the source and role of referenced content:"

| 标签（原文） | 中文 | 官方定义（原文 Meaning） |
|---|---|---|
| `<Subject N>` | 参考主体 | "Visible content abstracted from reference assets that can be reused or modified in the target video" |
| `<Picture N>` | 参考图 | "A reference image used as a concrete target frame or shot-planning anchor" |
| `<Video N>` | 参考视频 | "A reference video that provides an editing source, continuation starting point, or whole-video temporal structure" |
| `<Audio N>` | 参考音频 | "An audio signal that is copied or referenced" |

标签一致性规则（原文）："Once a reference label is assigned to a piece of content, it keeps the same meaning across `subject_definitions`, `summary`, `retention_analysis`, `detailed_description`, and the audio sections."

各标签的用法细则（原文要点）：

- `<Subject N>`：用于可复用的可见内容 —— people, animals, objects；scenes, backgrounds, environments；clothing, props, interfaces, visual effects；styles, actions, expressions, poses。"It represents a content unit that will actually be used in the target video, rather than the source file itself. One subject may be defined by multiple reference assets, and one reference asset may provide multiple subjects."
  - 示例：`<Subject 1> is the young woman in <Picture 1>, with long dark hair, a blue cardigan, and a thin silver necklace.`
  - 多来源示例：`<Subject 1> is the woman whose appearance comes from <Picture 1> and whose walking motion comes from <Video 1>.`
- `<Picture N>`：仅当参考图本身充当某一镜的首帧、关键帧、尾帧、编辑过的关键帧或构图锚点时才单列。"If an image is used only to define a character, scene, costume, or style, do not create a standalone picture entry. Instead, cite the image source inside the corresponding `<Subject N>` definition."
  - 示例：`<Picture 2> is the first frame of [Shot 1], showing a woman seated beside a café window.`
  - 分镜板示例：`<Picture 3> is a storyboard reference for [Shot 1] and [Shot 2], defining their viewpoint, subject placement, and shot order.`
- `<Video N>`：只用于整片级关系 —— editing an original video / continuing from the end of an original video / referencing the original video's camera movement, cuts, rhythm, or temporal structure。"If a person, object, scene, action, or effect from a reference video is reused as visible content, it still belongs under `<Subject N>`."
- `<Audio N>`：独立音频资产，或参考视频中启用的同步音轨。用途：copying all or part of an audio signal / referencing a background-music style / referencing a speaker's voice timbre and delivery / using dialogue, lyrics, or sound effects from the original audio / referencing beat, rhythm, or audio continuity。
  - 绑定说话人："When an `<Audio N>` explicitly corresponds to a target speaker, reuse that speaker's global ID in the definition: write `<Subject N> (Sx)` when the speaker maps to a defined subject, or use a stable voice description followed by `(Sx)` otherwise."
  - 示例：`<Audio 1> is the voice-timbre reference for <Subject 1> (S1).`
- 编号独立（出处「### 2.5」）："`<Video N>` and `<Audio N>` are numbered independently. Each index indicates only the label's order within its own category and does not encode a pairing between the two categories."、"An ordinary reference video does not create `<Audio N>` merely because the file contains sound."

### 2.3 `summary` 段的写法

出处：`references_ref-en.txt` →「## 3. `summary`」

- 结构：一个简短英文段落，**以方括号任务类型前缀开头**。原文示例：
  ```text
  [reference generation] ...
  [video editing + reference generation + audio reuse] ...
  ```
- 任务类型词表（原文）：

| 任务类型（原文） | 中文 | 何时使用（原文 When to use it） |
|---|---|---|
| `keyframe completion` | 关键帧补全 | "An image serves as the target video's first frame, keyframe, last frame, edited keyframe, or another concrete frame anchor" |
| `reference generation` | 参考生成 | "An image, video, or audio asset provides generation guidance ... without serving as a concrete frame or as the source video being edited or continued" |
| `video editing` | 视频剪辑 | "An existing source video is directly modified; editing an image or generating between still keyframes does not belong to this type" |
| `video continuation` | 视频续接 | "New content continues, extends, resumes, or transitions from an existing source video" |
| `audio reuse` | 音频复用 | "The same audio signal is reused in full or in part" |
| `audio reference` | 音频参考 | "The audio signal is not copied directly; only its music style, timbre, dialogue or lyric content, sound-effect texture, beat, or continuity is referenced" |

- 组合规则："When a task satisfies multiple relationships, combine the task types with ` + ` and do not repeat a type."（例：`[video continuation + keyframe completion]`、`[video editing + audio reuse]`）
- 不得凭空新增标签："Do not introduce new reference labels in this section."
- 视频剪辑任务的固定开头：`The target video is an edited version of <Video 1>.`

### 2.4 `retention_analysis` 的判定逻辑

出处：`references_ref-en.txt` →「## 4. `retention_analysis`」

- 基本规则："This section describes how each piece of referenced content is preserved, transferred, copied, or referenced in the target video. Use one line for each reference label and preserve the meaning established in `subject_definitions`."
- **可见内容**（`<Subject N>` / `<Picture N>` / `<Video N>`）的关系标记（原文 "These markers are fixed English values in the output format"）：

| 关系标记（原文） | 中文 | 官方含义 |
|---|---|---|
| `fully_preserved` | 完全保留 | "The defined role of the referenced content is fully preserved" |
| `partially_preserved` | 部分保留 | "The referenced content is still used, but some defined characteristics are changed or only partially retained" |
| `attribute_transfer` | 属性迁移 | "Referenced characteristics are transferred to a different identifiable target subject" |
| `weak_reference` | 弱参考 | "Only broad similarity in style, category, composition, or atmosphere is retained" |

  行格式（原文示例）：
  ```text
  <Subject 1> (appears in [Shot 1], [Shot 3]): fully_preserved - ...
  <Picture 2> ([Shot 1] first frame): fully_preserved - ...
  <Video 1> (cut and pacing structure): weak_reference - ...
  ```
- **音频**（`<Audio N>`）的关系标记：

| 关系标记（原文） | 中文 | 官方含义 |
|---|---|---|
| `fully_copy` | 完全复制 | "The complete source audio serves as the target video's complete final audio track" |
| `partially_copy` | 部分复制 | "Only part of the timeline or selected audio layers are copied, or other sounds are added, removed, or replaced after copying" |
| `reference` | 参考 | "The signal is not copied directly; only timbre, rhythm, music style, dialogue content, or sound texture is referenced" |
| `weak_reference` | 弱参考 | "Only broad similarity in category or atmosphere is retained" |

  行格式（原文示例）：
  ```text
  <Audio 1>: fully_copy - <Audio 1> is reused 1:1 as the target video's complete final audio track.
  <Audio 2>: reference - the target speaker follows <Audio 2>'s voice timbre and measured delivery without copying the original signal.
  ```
- 判定边界："Choose each relationship marker only within the reference role already defined for that label in `subject_definitions`. Do not treat newly added actions, backgrounds, or plot events in the target video as losses of reference fidelity."

### 2.5 一个完整的官方示例（结构标记与标签写法完整保留）

出处：`references_ref-en.txt` →「## 7. Complete Example」（原文代码块，文字精简处已标注）

```text
subject_definitions:
<Subject 1> is the coffee-shop environment in <Picture 1>, featuring an exposed brick wall, an orange tufted sofa with patterned pillows, a neon sign, and a wooden coffee table.
<Subject 2> is the fluffy white Samoyed in <Picture 2>, <Picture 3>, and <Picture 4>, with thick white fur, pointed ears, a dark nose, and a curved tail.
<Subject 3> is the young blonde woman in <Video 1>, with long blonde hair and a light-pink button-down shirt with rolled-up sleeves.
<Subject 4> is the young man in <Video 2>, with short wavy brown hair and a dark-grey hoodie with drawstrings.
<Audio 1> is the voice-timbre reference for <Subject 3> (S1), containing a spoken English vocal layer.

summary:
[reference generation + audio reference] The target video shows <Subject 3> eating a cookie in <Subject 1>. <Subject 4> enters with <Subject 2>, which lunges toward the cookie. The three-shot exchange uses <Audio 1> as the voice-timbre reference for <Subject 3> and ends with a canned audience laugh.

retention_analysis:
<Subject 1> (appears in [Shot 1], [Shot 2], [Shot 3]): fully_preserved - the exposed brick wall, orange tufted sofa, patterned pillows, neon sign, and wooden coffee table are retained.
<Subject 2> (appears in [Shot 1], [Shot 2]): fully_preserved - the Samoyed's thick white fur, pointed ears, dark nose, and curved tail are retained.
<Subject 3> (appears in [Shot 1], [Shot 2], [Shot 3]): fully_preserved - the blonde woman's identity, long hair, and light-pink shirt are retained.
<Subject 4> (appears in [Shot 1], [Shot 2]): fully_preserved - the young man's short wavy brown hair and dark-grey hoodie are retained.
<Audio 1>: reference - its vocal timbre guides the dialogue delivery of <Subject 3> without copying the original signal.

detailed_description:
The target video uses a realistic multi-camera sitcom style with warm indoor lighting.
[Shot 1] A medium shot establishes <Subject 1>, the coffee shop with its exposed brick wall, orange tufted sofa, patterned pillows, neon sign, and wooden coffee table. <Subject 3> (S1), the young woman with long blonde hair and a light-pink button-down shirt with rolled-up sleeves, sits on the sofa holding a chocolate-chip cookie. From the left, <Subject 4>, the young man with short wavy brown hair and a dark-grey hoodie with drawstrings, enters holding the leash of <Subject 2>, the thick-furred white Samoyed with pointed ears, a dark nose, and a curved tail. The dog lunges toward the cookie and pulls the leash taut. <Subject 3> (S1) jerks her hand back and, using the clear youthful voice timbre referenced from <Audio 1>, exclaims with light annoyance, <d>[English] Hey! Watch your dog!</d> She closes her lips and guards the cookie while <Subject 4> pulls the dog back.
[Shot 2] At 00:03.000, the shot cuts to a close-up of <Subject 4> (S2), the young man in the dark-grey hoodie from Shot 1, sitting beside <Subject 3> on the sofa and holding <Subject 2> securely in his arms. <Subject 4> (S2) says in a casual young male voice with a playful tone and an easy conversational pace, <d>[English] He just likes cookies more than me.</d> He closes his mouth into an apologetic smile and strokes the dog's thick white fur.
[Shot 3] At 00:05.000, the shot cuts to a close-up of <Subject 3> (S1), the blonde woman in the light-pink button-down shirt from Shot 1. Her annoyance softens as she looks toward the Samoyed. <Subject 3> (S1) replies in the same clear youthful voice referenced from <Audio 1> with an amused cadence, <d>[English] Well, he has good taste at least.</d> She smiles and raises the cookie in a small toast-like gesture. A classic canned audience laugh begins immediately after the line and continues through the final frame.

overall_soundscape:
Soft indoor coffee-shop room tone continues throughout the scene.

non_diegetic_music:
N/A
```

（说明：原文 `[Shot 3]` 中描述人物为 "the blonde woman in the light-pink button-down shirt from Shot 1"，上引为原文照录。）

### 2.6 Ref2VA 与基础模式的差异清单

出处：`references_ref-en.txt` →「### 5.2 Full-Reference Mode Differences」（官方对照表原文）

| 维度 | T2VA | Full-reference mode（Ref2VA） |
|---|---|---|
| 主字段 | `integrated_multimodal_description` | `detailed_description` |
| 风格开场位置 | "Written after `[Shot 1]`" | "Established in one or two English sentences before `[Shot 1]`" |
| 参考信息 | "Does not use full-reference labels" | "Inserts `<Subject N>`, `<Picture N>`, `<Video N>`, and `<Audio N>` at their first appearance and where their roles apply" |
| 音频关系 | "Describes the target video's own sound" | "Cites `<Audio N>` in the corresponding shot or audio phase and states whether the signal is copied or referenced" |

其它差异（官方正文散点）：

- **段数**：基础模式 3 个核心字段（+ 可选对齐指令行）；Ref2VA 6 段（`subject_definitions` / `summary` / `retention_analysis` / `detailed_description` / `overall_soundscape` / `non_diegetic_music`）。
- **描述段长度**："For generation tasks, `detailed_description` is normally 350-500 English words. Dialogue-dense content prioritizes fitting the complete spoken timeline rather than mechanically reaching a word count. Video-editing descriptions scale with the complexity of the source video and do not have to follow the generation-task range. A single shot does not automatically justify a shorter description."
- **说话人写法**：`references_ref-en.txt` →「### 5.4」："When a referenced subject physically speaks, retain both the visual reference label and the speaker ID" —— 写作 `<Subject N> (Sx)`；"`(Sx)` identifies the actual speaker."；"Assign `(Sx)` once according to the order of actual vocal events in the target video."；"Do not write `(Sx)` in `retention_analysis`."；"When verbal content is only a cue within a directly reused BGM or complete soundtrack ... use `<Audio N>` as the audible source and do not invent an additional `(Sx)`."
- **听不清的台词**："Write `[unclear]` for unintelligible spans instead of guessing or paraphrasing them."
- **标点规范化**："Standardize punctuation to the basic written marks needed to express the sentence, such as `,`, `.`, `?`, and `!`; remove repeated tildes, emoji, bullets, and repeated or decorative punctuation. End complete statements, questions, and exclamations with `.`, `?`, or `!` respectively before `</d>`."
- **音频归属规则**（出处「## 6.」）："state its copy or reference relationship only in the section that matches the audible layer: ambience and sound effects belong in `overall_soundscape`, while audience-only score belongs in `non_diegetic_music`."；"Write complete dialogue and lyrics only inside `<d>` in `detailed_description`; do not repeat them in these two sections."
- **基础模式的镜头/运镜/说话人/普通音效规则被复用**："The basic formats for shots, camera movement, speakers, dialogue, and ordinary sound are shared with the Video Prompt Writing Guide (T2VA / I2VA / FL2VA / L2VA)."

### 2.7 基础模式官方示例（保留结构标记，Case 1–Case 4）

出处：`references_base-en.txt` →「## 5. Cases」

Case 1（T2VA，节选）：

```text
integrated_multimodal_description: [Shot 1] Live-action, cinematic, a medium-wide shot frames a baker opening the shutters of a small street bakery before sunrise. The camera pushes in with small amplitude at slow speed as the middle-aged baker with a calm, slightly raspy voice (S1) places a fresh loaf on the wooden counter and says: <d>[English] First batch of the morning.</d> [Shot 2] At 00:05.000, the camera cuts to a close-up of steam rising from the sliced bread while the baker's final words carry over from the previous shot.

overall_soundscape: Wooden shutters scrape open over a quiet street as trays clink softly inside the bakery. The doorbell rings once, followed by light footsteps and the crisp sound of bread being sliced.

non_diegetic_music: A soft acoustic-guitar pattern at a moderate tempo, joined by sparse upright-bass notes and a gentle fade at the end.
```

Case 2（I2VA）首行 + 首句：

```text
For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.

integrated_multimodal_description: [Shot 1] Live-action, cinematic, the young woman shown in <Picture 1> remains beside the rain-covered train window, preserving her appearance, clothing, seat position, and the carriage layout. The camera trucks right with small amplitude at slow speed as she lifts her gaze from the folded letter toward the passing city lights. ...
```

Case 3（FL2VA，八秒单镜）首行：

```text
How the reference pictures align with the target video — Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot 1) aligns with the 8.00-second mark of the target video.
```

Case 4（L2VA，六秒单镜）首行：

```text
How the reference pictures align with the target video — <Picture 1> (from Shot 1]) aligns with the 6.00-second mark of the target video.
```

（原文为 `from [Shot 1]`。）

---

## 三、官方中文场景 skill 的可复用件（来自 scenarios/*）

> **重要事实**：本地官方原件中，8 个场景目录下**只有 `SKILL.cn.md` 与 `meta.yaml` 两个文件**，没有 `references/` 子目录。
> 因此以下文件在官方原件中**不存在**（标注为「官方文件未说明 / 文件不存在」）：
> - `co-op-game-intro-generator/references/shot-table-spec.md` —— 文件不存在
> - `qc-checklist.md` —— 文件不存在
> - `fallback-policy.md` —— 文件不存在
> - `model-selection.md` —— 文件不存在
> - `co-op-game-intro-generator/references/h3-video-prompt-template.md` —— 文件不存在
> - `co-op-game-intro-generator/references/h3-confirmation-image-template.md` —— 文件不存在
>
> 但**同等内容以正文形式存在于 `SKILL.cn.md` 中**，以下按此整理。

### 3.1 分镜表 / shot table 的字段规格

来源：`scenarios/3d-animation-short-generator/SKILL.cn.md` →「## STEP 5：六列标准镜头信息表」

表头（六列，顺序不可换）：

| 镜头编号 & 时长 | 连续性衔接 | 参考锚点（空间+身份） | Hook 类型 | 镜头描述（每秒指令） | 音频与对白轨 |
|---|---|---|---|---|---|

- **镜头编号 & 时长**："镜头号加计划时长，例如 `S03 / 6s`。"
- **连续性衔接**："本镜如何自然承接上一镜的结束画面、道具位置、眼神、人物姿态、声桥或情绪状态；以及本镜如何为下一镜开篇铺好钩子。这是跨镜连续性主链。"
- **参考锚点（空间+身份）**：四个子字段，全部必填
  - `固定地标` —— "来自场景卡的确切命名地标，及其相对画面的位置（如 `door-frame: 右侧 1/3`、`kitchen-island: 底部居中`）"
  - `人物位置（机位视角）` —— "镜头中每个角色相对画面的位置（左/中/右、上/中/下、前/中/后景）、朝向、初始姿态"
  - `退场人物状态` —— "上一镜有但本镜没有的角色，记录其离屏位置和原因（如 `Mia — 离屏左侧，最后出现于门框旁手持苹果筐`）"
  - `光位基线` —— "从场景卡继承的主光/补光/轮廓光方向，加本镜调整项"
  - 外加身份绑定："已批准的角色卡名（精确）和场景卡名（精确）。"
- **Hook 类型**：受控词表 —— `visual-joke`、`reversal`、`suspense`、`tender`、`chase`、`reveal`、`callback`、`expression-beat`（分镜文档版本另含 `setup`、`climax`）。
- **镜头描述**：景别、镜头运动、荷兰角设计、表演风格、音效、负向提示、**视频模型生成备注**，并强制包含 `Per-Second Directives` 子节。
- **音频与对白轨**：`旁白` / `对白` / `音效` / `表演备注`（"主角离屏旁白时标记 `narrator-mouth-closed: true`"）。

每秒指令（`Per-Second Directives`）必须覆盖的 5 个必填要素（原文序号）：

1. 动作 / 姿态 / 表情（适用时含 squash-and-stretch、anticipation、overshoot、follow-through）
2. 镜头运动（推 / 拉 / 摇 / 倾 / 手持晃动 / 锁定 / 环绕）
3. 空间位置（人物在哪、持有什么、地标在画面哪里）
4. 音频线索（旁白 / 对白 / 音效 / 呼吸 / 沉默 —— 或 `silent` 表示有意静默）
5. 与下一秒或下一镜的交接

表格全局规则（原文要点）：每镜必须通过 `连续性衔接` 列继承上一镜状态并为下一镜铺垫；每秒指令不得用「继续移动」这类模糊描述；景别必须在特写 / 大特写与其他必要景别间交替；荷兰角构图必须为追逐、失衡、惊吓或闹剧节拍设计；含旁白或对白的镜头每一秒都要记录嘴部开合（默认离屏旁白闭、面对白开）；已离屏角色至少记录 1 镜，连续 2 镜明确不在场后再移除。

来源：`scenarios/papercraft-stop-motion-explainer/SKILL.cn.md` →「## STEP 12：为已选时长创建分镜」

分镜表必备列（原文）：`时间` / `知识节拍` / `画面动作` / `纸艺运动` / `运镜 / 转场` / `音效`。
镜头数参考：15 秒通常 4 个镜头；30 秒 5-6 个；60 秒 7-9 个；"每个镜头只解释一个知识节拍"；"表格文字尽量短，不要在单元格里写长段落"。

来源：`scenarios/minimalist-product-ad-generator/SKILL.cn.md` →「## 步骤 7：精确节拍与文字分镜表」

建议表头（原文，11 列）：`时间段` / `镜头` / `镜头目的` / `视觉主导` / `画面 / 运镜` / `款式状态` / `文案内容` / `文字颜色` / `文字效果` / `转场 / 连贯` / `节奏意图`。
节拍数量建议：5 秒 3-4 个；10 秒 5-7 个；15 秒 6-9 个。
节奏意图词表（原文）：铺垫、建立、预备、冲击、制动、稳定。

来源：`scenarios/music-video-subtitle-generator/SKILL.cn.md` →「## STEP 5：Prompt 结构模板」

```text
[Global Aesthetic & Character Lock]: (全局人物与美学锚点 Prompt)

Shot 1 (0.0s - 3.5s)
Vocal Line: "..."
Typography: "..."
Visual & Action: ...
Camera & Motion: ...
Transition Out: Bass-hit 上硬切至 Shot 2 / 同向甩镜
```

### 3.2 QC 检查表要点

来源：`scenarios/3d-animation-short-generator/SKILL.cn.md` →「## STEP 5.5：镜头表自检门（强制）」

六项必检（原文）：

1. **Hook 密度**：每镜都有 `Hook 类型`；每连续 3 镜至少 1 镜使用 `reveal`/`reversal`/`callback`；开场镜和收尾镜各带强 hook。
2. **单镜时长**：任何镜头不超过 15 秒。节拍需要更长就拆镜。
3. **单镜角色数**：任何镜头不超过 3 个重要角色（定义为有画面动作或对白的角色）。
4. **空间锚点继承**：含 2 镜以上的同场景，下一镜的 `固定地标` 和 `光位基线` 必须与上一镜一致或含明确连续性备注。
5. **每秒指令覆盖**：从 `0s` 到镜尾每秒都有 `Per-Second Directives`，每条含 5 个必填要素；允许 `2.0–2.5s` 亚秒节拍但不能留时间空隙。
6. **跨镜连续性**：逐行读 `连续性衔接` 列必须形成连续链；任何翻转眼神、人物位置、道具状态或光位的镜头必须明确标记翻转（如 `HARD CUT — 时间跳 2h`）。

通过后在表格节点顶部加 `shot-table self-check: passed` 戳。

来源：同文件「## STEP 9：最终复盘」检查项（原文）：角色一致性、场景连续性（对照 `参考锚点` 列验证地标落点）、情绪锚点回收、镜头意图清晰度、对白可懂度、音效/动效同步（对照 `音频与对白轨` 列）、BGM 平衡、最终视频无分镜痕迹（无面板边框、铅笔线、箭头、标签、手写备注、时间标记、姿态残影、分镜文字，也无双绑定标签）、缺失或薄弱片段、任何可能需要重做的资产。

来源：`scenarios/music-video-subtitle-generator/SKILL.cn.md` →「## STEP 7：审查清单（Checklist）」

交付前静默检查 8 项：>15 秒是否已采用多镜头拆解结构；是否锁定唯一全局 Master Audio 且切替点对齐拍子；镜头切替是否避开人声唱词中途；相邻镜头是否有明确转场衔接机制；剪辑是否严格纯硬切；三张参考卡（人物/场景/文字）是否角色隔离；文字包装是否作为空间图层且不遮挡眼睛与主要面部表情；全局画质、颗粒感、色彩与光影是否高度一致。

来源：`scenarios/paper-collage-explainer-generator/SKILL.cn.md` →「## STEP 7：质量检查」

11 项（原文）：隐喻无需屏幕文字也能理解；静帧具 16:9 构图、清晰色场、明确物件层级与前中后景深度；物件组数量可读；片段从与静帧一致的色场开始；组装是逐片可见而非整体淡入；运动像定格拼贴；默认保留触感拼贴音效且无多余 BGM/旁白/字幕；纸张质感可控；色调整批一致；最终帧接近已批准静帧；无可读文字、假 UI、字幕、水印或 Logo。

来源：`scenarios/papercraft-stop-motion-explainer/SKILL.cn.md` →「## STEP 19：执行审核清单」

五组审核（原文小标题）：`画风审核`、`角色审核`、`场景审核`、`视频审核`、`音频审核`；"结尾输出审核清单。只标出对用户目标真正重要的问题。"

来源：`scenarios/minimalist-product-ad-generator/SKILL.cn.md` →「## 步骤 10」交付前验证（原文）：视频比例/时长/语言符合简报；商品外观、主推款和多款式出现方式符合锚定图与分镜表；文案可读、单行、不拥挤，同一时间没有两排文字；结尾有稳定的产品与文案收束；音乐不吵也不压得过低；输出已在画布上且多资产输出已编组。

来源：`scenarios/brand-promo-video-generator/SKILL.cn.md` →「## 步骤 9：交付前验证」（原文 6 条）：LOGO 与带身份识别资产来源已验证或授权；产品名称/功能/主张/指标/口号/CTA 与官方来源一致或明确标注为概念文案；视频时长、比例与语言符合简报；文案可读且不过度拥挤；最终 LOGO 未被拉伸裁切重建；动效有清晰视觉主导不遮挡产品；输出已在画布上并已编组。

### 3.3 fallback 策略要点

来源：`scenarios/3d-animation-short-generator/SKILL.cn.md` →「### 各模型失败回退」

H3 失败回退阶梯（原文 4 级）：

1. 第一次重试：用直接引用表格中 `参考锚点` 块的强化 H3 prompt 重渲染。
2. 第二次重试：把该镜缩到 ≤6s，把砍掉的秒拆到 Step 5 的新相邻行，重跑 Step 5.5 自检再重渲。
3. 第三次重试：把失败这一镜切到 Seedance 2.0。
4. 同一镜连续 3 次失败：暂停并用选项卡问用户 —— 单独切到 Seedance 2.0 / 放宽要求 / 跳过该镜并加 `placeholder: missing clip` 标记 / 手动提供参考视频。

Seedance 2.0 失败回退阶梯（原文）：强化 prompt 重渲染 → 去掉参考图纯文本生成 → 缩到 ≤6s → 连续 3 次失败后问用户切回 H3 / 放宽 / 跳过 / 手动参考视频。

同文件「### 分镜生成失败回退（仅可视化模式）」四级：更紧提示重画 → 去掉右下音频/锚点象限文字 → 面板数减 1 → 连续 3 次失败后由用户在「色块分镜 / 只靠单文本分镜文档推进 / 拆为两段更短镜头 / 手动提供参考图」中选择。

来源：`scenarios/paper-collage-explainer-generator/SKILL.cn.md` →「## 故障处理」（原文 11 条，节选要点）：制作方案默认写成无声视频要改回「默认带拼贴音效」；方案里擅自加 BGM/旁白/字幕要移除并改为可选询问；方案太直白回到 Gate 1 把视觉提案物件化；静帧含假文字或 UI 要**重生成静帧**而不是在视频提示词里修；静帧或视频太忙要减少纸层、简化物件数量、恢复留白；缺组装动作要减少物件数量并明确逐步到达顺序；运动像平滑数字图层就围绕「出现 → 轻微回弹 → 压平 → 暂停 → 锁定」重写；纸张太平加撕边/纤维/层叠接缝/软阴影；纸张过旧去掉牛皮纸与做旧；开场颜色与静帧冲突就从一致颜色开始；最终帧偏离静帧太远就加强「已批准静帧是完成最终构图」；需要精确图层控制则改用分层动画或剪辑工作流。

来源：`scenarios/minimalist-product-ad-generator/SKILL.cn.md` →「## 失败处理」（原文 8 条）：产品图太弱→暂停给重拍建议；文案太长→压缩到 3-5 词英文让用户确认；文字锚定错误→先重做文字锚定图不进视频；锚定图无法保真产品→加强保真要求重生成；分镜套模板→回到精确节拍表重写；视频中没有文案→重跑视频提示词；视频文字变形→重做文字锚定图或把文字镜退化为锚定图轻微动效；比例错误→立即重跑；音乐太差→优先 `music-2.6` 重试，不强控时长；合成后后半段没声音→重新分析音乐选连续有声片段，用直接替换音轨方式重做。

来源：`scenarios/brand-promo-video-generator/SKILL.cn.md` →「## 失败恢复」（原文 5 条）：LOGO 错误或近似→移除它并定位官方文件或索要原件；产品/界面看起来虚假→替换为官方/授权素材，不要美化仿制品；好看但通用→加入完整产品交互、已验证主张或真实输出；快但混乱→减少同时动作，指定视觉主导，保持跨镜头匹配运动；顺滑但太慢→缩短停留，重叠转场，只在关键信息处制动；资产不可用→索要授权原件，绝不猜测。

来源：`scenarios/music-video-subtitle-generator/SKILL.cn.md` →「## STEP 6.2 多镜头自然衔接系统（Natural Stitching Protocol）」五大衔接锁（原文小标题）：

- `人声与口型衔接锁（Vocal & Lip Continuity）` —— 切替点必须落在歌词句间停顿或强鼓点上，"严禁在人物发出某个元音或唱词中途进行硬切"。
- `音乐与节奏衔接锁（Rhythm & Beat Matching）` —— 剪辑点精准裁切在 1/4 或 1/8 拍上；用 Speed Ramping 微调使头点拍、手势、眨眼踩在鼓点上。
- `画面美学与色彩衔接锁（Aesthetic & Color Grading）` —— 跨镜头携带相同 Aesthetic Header；最终叠加 35mm Film Grain Overlay 与统一 LUT。
- `空间与转场衔接锁（Transition & Motion Continuity）` —— 长镜头用上一镜末帧作下一镜首帧 + "continuation of action"；镜头切换用动能延续转场或 Match Cut。
- `文字动态衔接锁（Typography Motion Stitching）` —— 前一镜文字在切替瞬间跟随 Bass Hit 破碎/扫出/砸屏，下一镜文字在重音上砸入/展开。

来源：`scenarios/handdrawn-live-video-generator/SKILL.cn.md` →「## Step 5：交付」与「## Step 4」

"用户明确确认 H3 生成前，不生成视频、图片、音频、分镜或中间资产。"；下一步建议固定句式（中文示例原文）：`下一步建议：如果你确认这个 prompt，我可以继续用 H3 模型生成 15 秒 16:9 视频。`

### 3.4 模型选择策略要点

来源：`scenarios/3d-animation-short-generator/SKILL.cn.md` →「### 视频模型选项卡（任何片段渲染前的强制门）」

- **H3（推荐默认）** —— "强项是视觉包装、动效图形、文字/UI 清晰度、多模态上下文理解、性价比（2K 约同类旗舰 1/3 价格，768P 约 1/2）。原生双声道音视频，单片段最长 15s @ 2K。最适合：设计语言强的皮克斯 3D 动画短片、文字 / 字幕 / UI 元素、动效转场、对话驱动且音频就是交付物一部分的镜头。"
- **Seedance 2.0（高强度动画表演的回退）** —— "强项是电影感镜头、复杂运镜、皮克斯弹性表演、动作张力。"
- **逐镜混合（高级）** —— 在镜头表某行的 `镜头描述` 列加 `video_model: H3` 或 `video_model: Seedance2` 字段，"未标记的行默认走 H3"。

同文件「### 分辨率选项卡（视频模型锁定后）」：768P（H3 首推）、2K（H3 默认质量，成本更高）、1080p（Seedance 2.0 推荐）、720p（Seedance 2.0 草稿）、匹配项目 / 自定义。"首条片段渲染前用户必须先确认分辨率。"

同文件「### 模型相关 prompt 形态」：
- **H3 prompt 前缀（默认）**："强调包装关键词、设计语言、动效清晰度、文字/UI 元素（如果相关）、双声道音频意图。H3 强在指令遵循，每秒指令可以几乎原文送入。"追加原文：
  `Pixar-inspired 3D cartoon rendering, C4D + Octane look, stylized Q-version proportions, warm SSS skin, designed-with-detail hair, strong character design language, clean motion, on-brand color palette`
- **Seedance 2.0 prompt 前缀（表演回退）**："强调电影感镜头语言、弹性 squash-and-stretch、anticipation、follow-through、光位戏剧性、镜头选择。"追加原文：
  `cinematic Pixar-quality 3D animation, elastic squash-and-stretch performance, Disney-style anticipation and overshoot, dramatic key lighting, lens-specific depth of field`

来源：`scenarios/minimalist-product-ad-generator/SKILL.cn.md` →「## 运行原则 / 启动前询问」

"默认模型是 MiniMax-H3，因为它通常更容易生成干净的 Apple 感产品近景、留白和高级产品片镜头语言。"；"启动问询时不要让用户选择视频模型；只需在已采用的启动结果中展示'默认模型：MiniMax-H3'。"；"Seedance 只在用户明确想要更强多分镜执行、用户点名 Seedance，或 H3 失败 / 无法满足结构且用户接受兜底时使用。"

来源：`scenarios/paper-collage-explainer-generator/SKILL.cn.md` →「## 默认创作目标」

"默认视频生成模型：`MiniMax-H3`，除非用户明确指定其他模型、该模型不可用，或硬性能力要求排除它"；"默认使用 `MiniMax-H3` 生成视频。除非 `MiniMax-H3` 失败、不可用或无法满足硬性能力需求，不要要求用户选择模型。"

来源：`scenarios/papercraft-stop-motion-explainer/SKILL.cn.md` → 开头段

"当本 Skill 从方案/提示词推进到实际视频生成时，默认使用 MiniMax-H3 作为视频生成模型。除非用户明确选择其他可用模型，或 MiniMax H3 当前不可用，否则都按 MiniMax-H3 执行。"

来源：`scenarios/brand-promo-video-generator/SKILL.cn.md` →「## 步骤 8」第 3-4 条

"品牌短片的默认声音策略：当用户要求 BGM、音乐、配乐、氛围声，或只说要一条完整宣传片而没有要求独立音轨时，优先使用所选视频模型的原生音频，不要默认拆成'无声视频 + 单独音乐'。默认 MiniMax H3 路线应开启原生音频（`generate_audio=true`），并在视频提示词中写入品牌安全的纯音乐 / UI 音效设计。"

来源：`scenarios/music-video-subtitle-generator/SKILL.cn.md` →「## 用途 / 核心原则」

"审查提示词并路由 H3 等视频生成工具"；">15 秒时自动采用'多镜头分镜拆解 + 首尾帧接续 + 鼓点硬切 + 全局主音轨对齐'的标准拼接工作流。"

> 注：以上均为**场景技能层面的模型选择说明**，不是 H3 提示词规范原文。

### 3.5 H3 视频提示词模板（对应 h3-video-prompt-template.md 的位置）

官方原件中无独立模板文件。可复用的 H3 提示词模板出现在：

来源：`scenarios/3d-animation-short-generator/SKILL.cn.md` →「### 单镜头片段渲染」+「### 模型相关 prompt 形态」

- 喂给 H3 的内容 = 单文本分镜文档对应章节（叙述、构图、镜头运动、动作编排、每秒时间、镜头号）+ 角色卡（权威身份源）+ 场景卡（权威环境源）+ H3 prompt 前缀。
- **剥离所有分镜双绑定标签**（`[char:…]`、`[scene:…]`、`[shot:…]`、`[dur:…]`、`[hook:…]`）再渲染视频。
- "渲染片段只能包含干净的皮克斯感全彩 3D 动画内容。不要分镜线稿、不要手绘草图质感、不要标签、不要字幕（除非要求）、不要水印。"
- 保持已批准的画面尺寸 / 比例与已批准的分辨率。

来源：`scenarios/paper-collage-explainer-generator/SKILL.cn.md` →「## STEP 5：规划停格组装」的运动提示词模板（原文整段）：

```text
Paper-collage stop-motion assembly. Start on a clean paper field matching the approved still's background color and tone. Assemble the scene piece by piece with tactile stop-motion timing: foreground, midground, and background paper groups appear in a readable order; each paper object appears, slides or pops in, lightly bounces, presses flat, pauses, and locks into place. Preserve the halftone dots, cream keylines, subtle fibrous torn edges, layered paper seams, soft shadows, paper grain, color field, and approved aspect ratio. End by holding the completed composition matching the approved still frame. Sound design: tactile collage SFX only, synchronized to paper-piece motion: soft paper slide, pop-in, press-flat tap, light rustle, and tiny paper snap where appropriate. Default: do not add BGM, voiceover, dialogue, or subtitles unless the user explicitly requested them. No mismatched kraft-paper opening, no brown/yellowed base unless approved, no fast spinning, no chaotic object flight, no smooth digital layer movement, no scene cuts, no camera move, no zoom, no morphing, no new objects, no text, no logos, no watermark, no UI.
```

来源：`scenarios/minimalist-product-ad-generator/SKILL.cn.md` →「## 步骤 8：视频生成」—— 视频提示词必须包含（原文 9 项）：三张独立锚定照片及每张照片的角色；精确节拍分镜表完整内容（逐镜读完并逐镜转写）；文案原文（逐字写出每句画面英文文案、出现时间段、前半/后半进入时间、颜色与单行行为）；单行文字硬约束；两段式文字动效规则；镜间连贯硬约束；MiniMax-H3 原生音频开关和音乐提示词；禁止传原商品图。

来源：`scenarios/brand-promo-video-generator/SKILL.cn.md` →「## 步骤 8：生产 Hub 资产」—— "每次派发都应自包含：所选模型、画面比例、真实参考路径和用户原始需求。"

来源：`scenarios/music-video-subtitle-generator/SKILL.cn.md` →「## STEP 5：Prompt 结构模板」（见 3.1）+「## STEP 8：画布交付」—— 锁定 prompt 写入画布文本节点 `Complete MV Prompt` 或 `完整MV Prompt`。

### 3.6 关键帧确认图模板（对应 h3-confirmation-image-template.md 的位置）

官方原件中无独立模板文件。相关内容：

来源：`scenarios/co-op-game-intro-generator/SKILL.cn.md` →「## STEP 3：生成 GPT 首图提示词」+「## STEP 4：生成首张确认图」

- 首图提示词采用「**框架固定 + 风格动态填充 + 颜色联动**」的 14 点结构：整体风格 / 色彩设计 / 整体布局 / 背景设计 / 人物风格 / 左侧人物 Character A / 右侧人物 Character B / 灯光表现 Lighting / UI 整体设计 Game UI / UI 排版规则 Layout Rules / 按钮设计 Buttons / 玩家信息卡 Player Cards / 图标设计 Icon System / 字体设计 Typography。
- 固定布局要点：16:9 横版构图、背景铺满、中央 x 位角色、UI 围绕角色不遮挡、左上玩家信息卡、右侧纵向菜单、底部警戒胶带、四角少量涂鸦、Z 字阅读路径、留白充足、层级清晰、视觉重心集中 Continue。
- 色彩联动规则："后续 UI、按钮、图标、字体段落必须与本段色彩保持一致。"
- 排版硬规则："标题单行显示、严禁换行、严禁两行标题、文字水平居中、左右留白一致、垂直间距统一。"
- 流程要求："先只出一张图给用户确认，不要直接进入视频。"

来源：`scenarios/minimalist-product-ad-generator/SKILL.cn.md` →「## 运行原则 1」+「## 步骤 6：生成三张独立产品锚定照片」

- "默认生成三张独立锚定照片，而不是一张四宫格锚定图，因为视频模型可能把宫格版式复制进最终成片。"
- 三张照片角色：照片 1 主视觉 / 刁钻主视角；照片 2 材质 / 功能细节；照片 3 结尾文案构图。
- "每张锚定照片都必须是一张可独立成立的完整产品照片。禁止生成网格、分屏、拼贴板、画框、多面板、产品墙或分镜板。"
- 照片 3 文字规则：必须包含已确认文案；文字单行；字体 `SF Pro Display Semibold`；颜色拆两段（前半黑或白，后半具体商品主色）。

来源：`scenarios/3d-animation-short-generator/SKILL.cn.md` →「## STEP 3：角色卡」/「## STEP 4：场景卡」

- 角色卡必须包含清晰可读的标注：角色名标注、角色定位标注、主 3/4 视角、正 / 侧 / 背三视图、表情、材质 / 服装 / 道具细节、重要道具标注、提示中重复的"身份锁"、简短视觉 ID 备注（年龄段、身材、发型、服饰色、签名道具、不可改特征）。
- 场景卡只展示环境，不出现人物、人群、剪影、手、脸或角色客串。

来源：`scenarios/papercraft-stop-motion-explainer/SKILL.cn.md` →「## STEP 8：规划或生成 1-3 张视觉预览图」

- 推荐预览组合：整体世界预览 / 机制预览 / 情绪或结尾预览；比例默认跟随项目视频比例（默认 16:9）。

### 3.7 各场景 SKILL.cn.md 共通的「先确认什么再生成」流程

| 场景 skill | 确认顺序（原文小标题 / 步骤） |
|---|---|
| `3d-animation-short-generator` | STEP 0 画幅/比例选项卡 → 总时长选项卡 → STEP 1 项目简报选项卡 → STEP 2 故事大纲选项卡 → STEP 3 角色卡选项卡 → STEP 4 场景卡选项卡 → STEP 5 标准镜头表选项卡 → STEP 5.5 镜头表自检门（`shot-table self-check: passed` 戳）→ STEP 6 分镜模式选项卡（仅文本 / 文本+铅笔图）→ STEP 7 视频模型选项卡 → 分辨率选项卡 → 单镜头片段选项卡 → STEP 8 拼接与 BGM 选项卡 → STEP 9 最终复盘。另有「## 用户选项卡纪律」列出 12 个强制选项卡门。 |
| `brand-promo-video-generator` | 步骤 1 上传素材并确认简报（含时长与画幅、活动重点、投放渠道、旁白语言、画面文案语言）→ 步骤 2 品牌事实表 → 步骤 3 来源清单 → 步骤 4 故事脊柱（2-3 个方向选一）→ 步骤 5 精确节拍 → 步骤 6 导演动效语言 → **步骤 7 生成前硬确认**（必须停下，先向用户展示来源摘要、品牌事实表、创意方向、节拍/分镜计划、文案 CTA 旁白声音方案、真实性说明）→ 步骤 8 生产 → 步骤 9 交付前验证 → 步骤 10 交付。 |
| `co-op-game-intro-generator` | STEP 1 询问视觉风格（弹窗式预设 + 自定义）→ STEP 2 收集 PLAYER 1 / PLAYER 2 / 游戏名 + 可选角色图 → STEP 3 生成首图提示词 → **STEP 4 生成首张确认图（先只出一张图）** → **STEP 5 等待用户确认**（"在用户确认首图或提出修改之前，不要生成视频"）→ STEP 6 回填视频 prompt 并用 Minimax H3 生成 → STEP 7 常见失败修正。 |
| `handdrawn-live-video-generator` | Step 1 同语种约束 → Step 2 重新发明创意 → Step 3 必需输出格式（11 段固定顺序）→ Step 4 Prompt 写作规则 → **Step 5 交付**（先给 prompt，再给一句"邀请用户确认后继续用 MiniMax H3 生成"的建议；"用户明确确认 H3 生成前，不生成视频、图片、音频、分镜或中间资产"）。 |
| `minimalist-product-ad-generator` | **启动前询问（强制 Gate）**：商品图与素材 / 单款或多款式 / 目标时长（5、10、15 秒，默认 10）/ 画幅比例 / 苹果风模板 / 画面文案 / 视频模型策略（不询问，只展示"默认模型：MiniMax-H3"）→ 步骤 1 素材检查与产品事实摘要 → 步骤 2 制作简报 → 步骤 3 叙事脊柱 → 步骤 4 动效语言 → 步骤 5 英文文案 → **步骤 6 三张独立锚定照片并等待用户批准** → **步骤 7 精确节拍文字分镜表，用户确认后** → 步骤 8 视频生成 → 步骤 9 音乐 → 步骤 10 交付验证。 |
| `music-video-subtitle-generator` | STEP 1 前期锁定（1.1 视频格式表 / 1.2 目标时长与多镜头拆解架构 / 1.3 音乐窗口 / 1.3.0 歌词锁定与歌词先行补全 / 1.3.1 >15 秒多镜头拼接默认流程）→ STEP 2 Creative Contract → STEP 3 参考图分工与场景采样 → STEP 4 预设语法 → STEP 5 Prompt 结构模板 → STEP 6 BGM 连续性与五大衔接锁 → STEP 7 审查清单 → STEP 8 画布交付（写 `Complete MV Prompt`）→ STEP 9 生成与合成。 |
| `paper-collage-explainer-generator` | STEP 1 解析输入 → **STEP 2 Gate 1 制作方案确认**（Brief / 视觉隐喻 / 脚本-视觉节奏轨 / 分镜；"用户确认前不要生成静帧或视频"）→ STEP 3 建立静帧规格 → **STEP 4 Gate 2 生成并确认静帧**（"展示生成的静帧，并在视频生成前等待用户确认"）→ STEP 5 规划停格组装 → STEP 6 生成带拼贴音效的 B-roll → STEP 7 质量检查 → STEP 8 可选合成与交付。 |
| `papercraft-stop-motion-explainer` | STEP 1 理解输入 → STEP 2 画风基因 → **STEP 3 提出 3-5 个创意方向并同时选择目标视频时长**（"用户选定时长前，不要继续进入详细资产设计"）→ STEP 4 纸艺角色 → STEP 5 纸片场景 → STEP 6 分层纸雕布景 → STEP 7 道具资产库 → **STEP 8 视觉预览图 1-3 张 + 选择卡片暂停确认** → STEP 9-11 单图 / 系列图 / 5 秒图生视频提示词 → STEP 12 分镜 → STEP 13 剪辑节奏 → STEP 14 运镜 → STEP 15 转场 → STEP 16 声音设计 → STEP 17 旁白音频 → STEP 18 反向提示词 → STEP 19 审核清单。另有「## 轻量请求旁路规则」与「## 交互规则：每个阶段之间用选择卡片确认」。 |

共通规律（跨 8 个 skill）：**先用选项卡 / 选择卡确认规格与创意方向 → 再生成图像类中间产物 → 再等一次确认 → 最后生成视频**；每个确认点都用卡片而非纯文本提问；模型默认 H3。

---

## 四、官方术语中英对照表

> 说明：本表只收录官方文件中**实际出现**的术语。帧率、音频采样率、提示词字数上限等在官方文件中未出现。

### 4.1 任务模式（Task modes）

| 原文 | 中文 | 出处 |
|---|---|---|
| T2VA | 纯文本生成音视频 | `references_base-en.txt`「## 1. Task Overview」 |
| I2VA | 首帧图生音视频 | 同上 |
| FL2VA | 首尾帧生成音视频 | 同上 |
| L2VA | 尾帧图生音视频 | 同上 |
| Ref2VA / full-reference mode | 全参考模式 | `SKILL.md`「## Full-Reference Mode」 |
| `keyframe completion` | 关键帧补全 | `references_ref-en.txt`「## 3. summary」 |
| `reference generation` | 参考生成 | 同上 |
| `video editing` | 视频剪辑 | 同上 |
| `video continuation` | 视频续接 | 同上 |
| `audio reuse` | 音频复用 | 同上 |
| `audio reference` | 音频参考 | 同上 |

### 4.2 运镜类型（Camera motion，出自 `references_base-en.txt`「### 4.3」官方表格）

| 原文 | 中文 | 官方说明（原文） |
|---|---|---|
| `Zoom In / Zoom Out` | 变焦推近 / 拉远 | "The focal length changes while the camera body remains stationary" |
| `Push In / Pull Out` | 推 / 拉 | "The camera moves forward / backward" |
| `Pan Left / Pan Right` | 左右摇 | "The camera remains in place while the lens pivots horizontally" |
| `Truck Left / Truck Right` | 左右平移 | "The camera translates horizontally" |
| `Tilt Up / Tilt Down` | 上下摇 | "The camera remains in place while the lens pivots vertically" |
| `Pedestal Up / Pedestal Down` | 升降 | "The entire camera moves upward / downward" |
| `Arc Shot` | 环绕镜头 | "The camera moves in an arc around the subject" |
| `Tracking Shot` | 跟拍 | "The camera follows a moving subject" |
| `Static Shot` | 固定镜头 | "The camera position and lens remain still" |
| `Shake Slightly / Shake Strongly` | 轻微 / 强烈晃动 | "Slight / strong camera shake" |
| `POV` | 主观视角 | "The subject's point of view" |
| `Roll Clockwise / Roll Counterclockwise` | 顺 / 逆时针滚转 | "The camera rolls clockwise / counterclockwise around the lens axis" |
| `with small amplitude` | 小幅度 | "Small-range change" |
| `with large amplitude` | 大幅度 | "Large-range change" |
| `at slow speed` | 慢速 | "Slow movement" |
| `at fast speed` | 快速 | "Fast movement" |

切镜短语：`the camera cuts to` / `the shot cuts to` / `the shot transitions to` / `the shot changes to` / `the shot switches to`（普通切点固定用词）；`cross-dissolve` 叠化 / `fade` 淡出淡入 / `wipe` 划变（仅在用户明确要求时使用）。

风格词（`references_base-en.txt`「### 4.1」列举）：`Cinematic`、`live-action`、`2D-animated`、`3D CG`、`claymation`、`watercolor`、`vintage film`。

### 4.3 声音类型（Sound types）

| 原文 | 中文 | 出处 |
|---|---|---|
| `integrated_multimodal_description` | 多模态整合描述（含对白、歌唱、同期声） | `references_base-en.txt`「### 2.2」 |
| `overall_soundscape` | 整体声景（环境声 / 物理动作声 / 非语言人声） | 同上 |
| `non_diegetic_music` | 非叙事性音乐（角色听不到、只有观众听到） | 同上 |
| diegetic audio | 叙事内声音 | 同上 |
| diegetic music | 叙事内音乐（角色可听到，须写在主描述段） | 「### 4.7」 |
| ambience / ambient sound | 环境声 | 「### 4.6」 |
| non-verbal human sounds | 非语言人声（呼吸、笑、喘） | 「### 4.6」 |
| `says in an off-screen voiceover` | 画外音固定短语 | 「### 4.4」 |
| `<d>[Language] ...</d>` | 对白 / 歌词标签 | 「### 4.4」 |
| `<scenetrans>` | 跨切点对白连接标签 | 「### 4.4」 |
| `<cutoff>` | 被视频结尾截断的台词标签 | 「### 4.4」 |
| `[unclear]` | 听不清的台词占位 | `references_ref-en.txt`「### 5.4」 |
| `fully_preserved` / `partially_preserved` / `attribute_transfer` / `weak_reference` | 完全保留 / 部分保留 / 属性迁移 / 弱参考 | 「### 4.1」 |
| `fully_copy` / `partially_copy` / `reference` | 完全复制 / 部分复制 / 参考 | 「### 4.2」 |

### 4.4 参考标签（Reference labels）

| 原文标签 | 中文 | 出处 |
|---|---|---|
| `<Subject N>` | 参考主体 | `references_ref-en.txt`「## 2.1」 |
| `<Picture N>` | 参考图 | 「## 2.2」；基础模式见 `references_base-en.txt`「### 2.1 / 3.1」 |
| `<Video N>` | 参考视频 | 「## 2.3」 |
| `<Audio N>` | 参考音频 | 「## 2.4」 |
| `(S1)` / `(S2)` | 说话人 ID | `references_base-en.txt`「### 4.4」 |
| `(S1,S2)` | 多说话人复合 ID | 同上 |
| `<Subject N> (Sx)` | 参考主体 + 说话人 ID 合并写法 | `references_ref-en.txt`「### 5.4」 |

### 4.5 时长 / 分辨率 / 画面规格

| 原文 | 中文 | 出处 |
|---|---|---|
| `4–15 seconds` | 4–15 秒（H3 提示词描述须匹配的目标时长） | `SKILL.md`「## Tips for Better Results」 |
| `S.SS` | 有效视频时长，固定两位小数 | `references_base-en.txt`「### 2.1」 |
| `0.00-second mark` | 0.00 秒标记（首帧锚点） | 同上 |
| `00:03.500`（`MM:SS.mmm`） | 切点时间戳格式 | 「### 4.2」 |
| `2K` | 2K 分辨率（H3 默认质量；2K 约同类旗舰 1/3 价格） | `scenarios/3d-animation-short-generator/SKILL.cn.md`「视频模型选项卡 / 分辨率选项卡」 |
| `768P` | 768P（H3 首推性价比档，约 1/2 价格） | 同上 |
| `1080p` / `720p` | Seedance 2.0 推荐 / 草稿档 | 同上 |
| `单片段最长 15s @ 2K` | 单片段最长 15 秒 @ 2K | 同上 |
| `原生双声道音视频` | H3 原生立体声画一体 | 同上 |
| `16:9` | 画幅比例 | `scenarios/minimalist-product-ad-generator` 等 |
| 帧率 / FPS | — | **官方文件未说明** |

### 4.6 其它官方术语

| 原文 | 中文 | 出处 |
|---|---|---|
| `integrated_multimodal_description` | 多模态整合描述（字段名） | `references_base-en.txt`「### 2.2」 |
| `subject_definitions` / `summary` / `retention_analysis` / `detailed_description` | 参考对象定义 / 摘要 / 保留度分析 / 详细描述（段名） | `references_ref-en.txt`「## 1. Overall Structure」 |
| `[Shot N]` | 镜次标记 | `references_base-en.txt`「### 4.2」 |
| `Per-Second Directives` | 每秒指令（分镜表子节名） | `scenarios/3d-animation-short-generator`「STEP 5」 |
| `narrator-mouth-closed: true` | 旁白时闭口标记 | 同上 |
| `fully referenced` | 完全引用（I2VA 对齐句动词） | `references_base-en.txt`「### 2.1」 |
| `continues seamlessly across the cut` 等 | 跨切点连续性描述句式 | `references_base-en.txt`「### 4.4」 |
