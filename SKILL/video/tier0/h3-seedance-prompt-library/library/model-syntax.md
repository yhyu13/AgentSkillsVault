# 两模型语法速查（H3 / Seedance 2.5）

> 本文件是**结构说明**，不是片段库。给翻译 Agent 查语法用：先确认目标模型 → 确认任务模式 → 套对应模板 → 按硬性参数裁剪。
> 术语对照：提示词（prompt）、分镜（shot list）、首帧（first frame）、尾帧（last frame）、运镜（camera movement）、参考素材（reference assets）、约束（constraint）。
> **H3 侧的每一条句式、标签、词表都取自官方原件**（`library/intel/minimax-h3-official/` 下的 `SKILL.md`、`references_base-en.txt`、`references_ref-en.txt`），引用时标注小节标题；官方文件未写明的，一律显式标注「官方文件未说明」。

---

## 一、MiniMax H3 输出骨架

### 1.0 官方 Output Rules（先读这四条）

出处：`SKILL.md` →「## Output Rules」与「## Tips for Better Results」。

1. **改写段一律用英文写**："Write rewrite sections in English; preserve dialogue, lyrics, and visible scene text in their original language." —— 只有 `<d>` 里的对白/歌词、以及画面上真正可见的文字保留原语言。
2. **逐镜写实，不写剧情梗概**："Describe each shot by composition, subjects, environment, actions, camera, sound, and the exact point where referenced content appears." / "Avoid plot summaries, unresolved reference labels, and timing that does not match the requested duration."
3. **标签要解析干净**："Keep reference labels consistent (e.g. `<Picture 1>`, `<Video 1>`, `<Audio 1>`) across every section." —— 不得留下悬空未定义的参考标签。
4. **写具体，不写抽象词**："Prefer concrete visual and audio details over abstract words like 'cinematic' or 'beautiful'."

> 本库为了让中文读者好读，会保留「中文片段」列；但 **H3 官方要求改写段用英文，装配 H3 时一律取英文片段**。中文片段只服务人类阅读与 Seedance 2.5（Seedance 中文响应更好）。

### 1.1 三个字段的确切名字与职责

出处：`references_base-en.txt` →「### 2.2 Part Two Contains the Three Core Fields」。

| 字段名（原文） | 官方定义（原文） | 中文 | 写什么 | 不写什么 |
|---|---|---|---|---|
| `integrated_multimodal_description` | "Describes visuals, actions, shots, speakers, dialogue, singing, and diegetic audio along the timeline." | 多模态整合描述 | 视觉风格、初始构图、主体外观与位置、场景与关键道具、动作与反应、切镜、口语与歌唱、同期叙事内声音 | 环境底噪的音量描述、非叙事配乐 |
| `overall_soundscape` | "Summarizes ambient sound, physical action sounds, and non-verbal human sounds across the entire video." | 整体声景 | 环境声、物理动作声、非语言人声（呼吸/笑/喘） | 对白、歌唱、叙事内音乐（这些已在主描述段） |
| `non_diegetic_music` | "Describes background music that the characters cannot hear and only the audience can hear." | 非叙事性音乐 | 乐器编制、速度、节奏、动态变化 | 环境音、对白、抽象情绪词、配乐的情绪功能解释 |

**三条分离规则**（`references_base-en.txt`「### 4.6」原文："Dialogue, singing, and diegetic music already belong in the multimodal description and should not be repeated here."）：台词与歌唱只进 `integrated_multimodal_description`；画内声只进 `overall_soundscape`；配乐只进 `non_diegetic_music`。同一个声音不要在两个字段里各写一遍，否则会出现重影与人声叠唱。

**`overall_soundscape` 的形式约束**（「### 4.6」原文）："Use 1–4 English sentences in one continuous paragraph…"；"Use `N/A` only when the user explicitly requests complete silence throughout the video." —— 1~4 个英文句、**一个连续段落**、必须英文；只有用户明确要求全片静默时才写 `N/A`。

**`non_diegetic_music` 的形式约束**（「### 4.7」原文）："Use 1–3 English sentences… Focus on instrumentation, speed, rhythm, and dynamic changes; do not use abstract mood words or explain the emotional function of the score."；"Singing, instruments, radio, television, or phone music audible to the characters are diegetic events and should appear in the multimodal description."；"Use `N/A` when there is no non-diegetic music."

### 1.2 H3 完整提示词模板

版式出处：`references_base-en.txt` →「### 2.1」原文："The instruction must be the first line of the final prompt, followed by one blank line before the core fields."

```text
[可选 · 仅 I2VA / FL2VA / L2VA] 图像对齐指令行（官方固定句，见 1.3），其后空一行

integrated_multimodal_description: [Shot 1] {style}, {shot size} frames {subject} {position in frame}, {scene and key props}, {light direction and color temperature}, {identity anchor: age, hair, face, outfit, accessories}. The camera {camera motion written as a natural English action} as {action}. {Speaker description} (S1) says: <d>[English] {verbatim user-provided line}</d> {lip-sync note}. [Shot 2] At 00:03.500, the camera cuts to {new subject / space / state / viewpoint / time}, {shot size}, {subject restated}, {action}. [Shot 3] At 00:07.000, the shot changes to {landing image}, {outcome or aftertaste}.

overall_soundscape: {1-4 English sentences in one continuous paragraph: ambient sound, physical action sounds, non-verbal human sounds}.

non_diegetic_music: {1-3 English sentences: instrumentation, speed, rhythm, dynamic changes}.
```

**要点**：

- 风格与初始构图写在 `[Shot 1]` 开头（「### 4.1」原文："At the beginning of `[Shot 1]`, state the overall style and initial composition."）；官方列举的常见风格词为 `Cinematic`、`live-action`、`2D-animated`、`3D CG`、`claymation`、`watercolor`、`vintage film`。
- 运镜写成句子里的自然英文动作，不要在句末堆标签（「### 4.3」原文："Camera motion should be written as a natural English action within the shot, rather than stacked as separate labels at the end of a sentence."）。官方示例：`The camera pushes in with small amplitude at slow speed toward the folded letter in her hands.`
- **「稳定性约束句」不是官方结构**。官方基础模式只规定三个字段（「### 2.2」），`SKILL.md`「## Output Rules」也未要求附加约束段。本库末尾那行「保持脸部、服装、产品几何……不闪烁、不切镜、不自行运镜」属于**库自加的非官方附加项**，不得当作官方字段；需要时加，但要自己知道它是加的。
- 官方要求「每条细节都要对应看得见或听得见的东西」（「### 4.1」原文："Every detail should correspond to something visible or audible"）。

### 1.3 五种任务模式

| 模式 | 全称 | 触发条件 | 官方写法（逐字引用） | 主要风险 |
|---|---|---|---|---|
| **T2VA** | 纯文本生成音视频 | 无任何参考文件 | 无图像对齐指令，"begins directly with the three core fields"（「### 2.1」） | 主体外观必须用文字写全（年龄/发型/脸型/服装/配饰），否则第一镜就漂 |
| **I2VA** | 首帧图生音视频 | 1 张图片作首帧 | 固定首行：`For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.`（「### 2.1」） | 首帧与文字描述冲突导致开篇跳变 |
| **FL2VA** | 首尾帧生成音视频 | 2 张图，首帧 + 尾帧 | 固定首行：`How the reference pictures align with the target video — Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot N) aligns with the S.SS-second mark of the target video.`（「### 2.1」） | 中间过程漂移，落幅对不上尾帧 |
| **L2VA** | 尾帧图生音视频 | 1 张图片作尾帧 | 固定首行：`How the reference pictures align with the target video — <Picture 1> (from [Shot N]) aligns with the S.SS-second mark of the target video.`（「### 2.1」） | 开场形态凭空生成，与尾帧没有因果链 |
| **Ref2VA** | 全参考模式 | 多参考素材（官方未设数量上限） | 六段改写：`subject_definitions` → `summary` → `retention_analysis` → `detailed_description` → `overall_soundscape` → `non_diegetic_music`（`SKILL.md`「## Full-Reference Mode」） | 标签含义在段间漂移，或 summary 里凭空新增标签 |

**占位符规则**（「### 2.1」原文）："Here, `N` is the index of the actual final shot, and `S.SS` is the effective video duration formatted to exactly two decimal places." —— `S.SS` 固定两位小数（例 `8.00`、`6.00`），`N` 是实际最后一镜的镜号。

**关键帧语义**：

- I2VA：「### 3.1」原文 —— `<Picture 1>` 是视频 0.00 秒的实际首帧，属于 `[Shot 1]`；推荐结构 **first-frame anchor → action onset → continuous development → result or reaction**。
- FL2VA：「### 3.2」原文 —— Picture 1 是开场，Picture 2 是结尾；"FL2VA generally favors a single shot… The last frame must be reached by the final `[Shot N]` at the end of the video."；推荐结构 **first-frame state → observable intermediate changes → progressively narrowing differences → last-frame state**。
- L2VA：「### 3.3」原文 —— `<Picture 1>` 是视频最终帧、属于最后一个 `[Shot N]`，"it does not inherently belong to Shot 1"；推荐结构 **plausible preceding state → explicit action and transition path → gradual convergence in the final shot → last-frame landing**。

> **参考数量**：官方文件**未说明**参考素材的数量上限。原库写的「≤ 12 个参考文件」是伪硬上限，已删除。Ref2VA 的四类标签是**各自独立编号**的（见 1.9）。
> `@Image1/@Video1/@Audio1` 这套槽位语法属于 **Seedance 2.5**（见 2.4），**不是 H3 语法**。

### 1.4 硬性参数

| 项 | 口径 | 出处 |
|---|---|---|
| 时长 **4~15 秒** | **官方**。超出必须拆成多条分别生成，再在剪辑阶段拼接 | `SKILL.md`「## Tips for Better Results」："Always match the total duration of the description to the requested video length (4–15 seconds)." |
| 字段名 / 段序 / 标签 / 时间记法 | **官方**。不得改动 | `SKILL.md`「## Workflow」第 4 条："Preserve the exact field names, section order, labels, and timing notation from the selected guide." |
| 三字段顺序 | **官方**：`integrated_multimodal_description` → `overall_soundscape` → `non_diegetic_music` | `SKILL.md`「## Base Modes」 |
| 帧率 | **官方文件未说明**（24 FPS 无出处） | — |
| 分辨率 2K / 768P | **非提示词规范原文**。2K 见于官方场景技能 `3d-animation-short-generator/SKILL.cn.md` 的「视频模型选项卡 / 分辨率选项卡」；提示词规范三份文件均未规定分辨率 | — |
| 提示词字数上限（7000 字符） | **官方文件未说明** | — |
| 音频采样率 / 声道（32 kHz 立体声） | **官方文件未说明**。官方只规定三个字段的分工 | — |
| 参考素材数量上限 | **官方文件未说明** | — |
| 画幅比例枚举 / 负向提示词字段 | **官方文件未说明**（H3 没有独立 negative 字段） | — |

「声音与画面由模型一并产出、不单独外挂音轨」这一结论，可由官方三字段结构推出（音频写在提示词的三个字段里），但采样率与声道数官方文件未说明。

### 1.5 镜头切换规则

出处：`references_base-en.txt` →「### 4.2 Shots and Cuts」。

1. 第一镜不带时间戳；后续镜用递增镜号 + 严格递增且落在时长内的切点时间（原文："Do not add a timestamp to the first shot. Use sequential shot numbers for later shots, and begin each one with a strictly increasing cut time that falls within the video duration."）。
2. 格式：`[Shot 2] At 00:03.500, the camera cuts to...`（时间戳 `MM:SS.mmm`）。
3. **官方切镜短语词表**（原文："For ordinary cuts, use `the camera cuts to`, `the shot cuts to`, `the shot transitions to`, `the shot changes to`, or `the shot switches to`."）——普通切点只用这五句之一。
4. **转场限制**（原文："When explicitly requested by the user, cross-dissolve, fade, or wipe may also be used."）—— `cross-dissolve` / `fade` / `wipe` **仅在用户明确要求时**使用。
5. 切镜动机（原文："A cut should introduce new information about the subject, space, state, viewpoint, or time. If only the distance or a slight angle needs to change, prefer camera motion."）——只换距离或轻微角度时，用运镜而不是切镜。

### 1.6 运镜：官方词表（类型 + 幅度 + 速度）

出处：`references_base-en.txt` →「### 4.3 Camera Motion: Motion Type + Amplitude + Speed」。

| 维度 | 官方表达（原文） | 官方说明（原文） |
|---|---|---|
| 运动类型 | `Zoom In / Zoom Out` | "The focal length changes while the camera body remains stationary" |
| 运动类型 | `Push In / Pull Out` | "The camera moves forward / backward" |
| 运动类型 | `Pan Left / Pan Right` | "The camera remains in place while the lens pivots horizontally" |
| 运动类型 | `Truck Left / Truck Right` | "The camera translates horizontally" |
| 运动类型 | `Tilt Up / Tilt Down` | "The camera remains in place while the lens pivots vertically" |
| 运动类型 | `Pedestal Up / Pedestal Down` | "The entire camera moves upward / downward" |
| 运动类型 | `Arc Shot` | "The camera moves in an arc around the subject" |
| 运动类型 | `Tracking Shot` | "The camera follows a moving subject" |
| 运动类型 | `Static Shot` | "The camera position and lens remain still" |
| 运动类型 | `Shake Slightly / Shake Strongly` | "Slight / strong camera shake" |
| 运动类型 | `POV` | "The subject's point of view" |
| 运动类型 | `Roll Clockwise / Roll Counterclockwise` | "The camera rolls clockwise / counterclockwise around the lens axis" |
| 幅度 | `with small amplitude` | "Small-range change" |
| 幅度 | `with large amplitude` | "Large-range change" |
| 速度 | `at slow speed` | "Slow movement" |
| 速度 | `at fast speed` | "Fast movement" |

- 官方原文："Add amplitude and speed only when they are meaningful; **medium amplitude and normal speed are usually omitted**." —— 中等幅度与正常速度通常省略。
- 官方原文："Camera motion should be written as a natural English action within the shot, rather than stacked as separate labels at the end of a sentence." —— 写成自然英文动作句，不堆标签。
- 官方示例：`The camera pushes in with small amplitude at slow speed toward the folded letter in her hands.` / `The camera pans right with large amplitude at fast speed, revealing the open doorway.` / `The camera holds a static shot as the runner exits the frame.`

### 1.7 对话语法

出处：`references_base-en.txt` →「### 4.4 Speakers, Dialogue, and Singing」。

- **说话人 ID 带括号**：`(S1)`、`(S2)`；多人同时发声用复合 ID `(S1,S2)`（原文："When multiple already-numbered speakers speak or sing together, use a compound ID such as `(S1,S2)`."）。
- **同一说话人跨镜保持同一 ID**；**从不发声的角色不给 ID**（原文："A speaker keeps the same ID across shots; characters who never vocalize receive no speaker ID."）。
- **首次出场给足身份信息**：character type, age, gender, whether the person is on-screen, pitch, timbre, speaking rate, or accent（原文："provide enough information from the visual and audio context to establish a stable identity"）。
- **对白标签格式**：`<d>[English] 台词原文</d>`。原文："Place the speaker's identifying phrase, ID, action, and delivery outside `<d>`. Inside `<d>`, include only the language tag and the actual user-provided spoken content. Preserve every original word and punctuation mark verbatim; do not translate or rewrite them."
  - 官方示例：`The young woman with a quiet, breathy voice (S1) says: <d>[English] I get off at the next station.</d>`
  - 官方示例（多人同时）：`The two children (S1,S2) shout together, <d>[English] Wait for us!</d>`
- **画外音**：官方**没有 OS / VO 这类标记**。原文："For voiceover, use the exact phrase `says in an off-screen voiceover`. Immediately after every voiceover `<d>` block, state that the corresponding on-screen character's lips remain closed."
  - 官方示例：`The man (S1) says in an off-screen voiceover: <d>[English] I still remember that road.</d> while his lips remain completely closed.`
- **跨切点的台词 / 歌词**：用 `<scenetrans>` 在两段的连接点各标一次，并明说音频跨切点继续（原文："use `<scenetrans>` at the connecting points in both parts and explicitly state that the audio continues across the cut."）；被视频结尾截断的台词用 `<cutoff>`（原文："Use `<cutoff>` when speech is truncated by the end of the video."）。
- **官方四种连续性描述句式**（原文列举）：`continues seamlessly across the cut` / `continues uninterrupted into the next shot` / `carries over from the previous shot` / `remains audible across the transition`。
- **不要发明"轮流不重叠"**：官方并未禁止多人同时发声，反而给了 `(S1,S2)` 并行写法；要轮流必须自己显式写清顺序与不重叠。

### 1.8 画面文字（on-screen text）

出处：`references_base-en.txt` →「### 4.5 On-Screen Text」。

- 原文："Place any banner, sign, label, subtitle, or neon text that is actually visible on screen in **English double quotation marks**. Preserve the original text and punctuation **verbatim, without translation**."
- 官方示例：`A red neon sign reading "营业中" glows above the doorway.`
- 也就是说：画面上真正可见的文字用英文双引号包裹，**原文逐字保留、不翻译**（可保留中文原文，因为画面里就是中文）。

### 1.9 H3 全参考模式 Ref2VA（六段结构 + 四类标签）

出处：`references_ref-en.txt` →「## 1. Overall Structure」「## 2. Reference Labels and Definitions」「## 3. `summary`」「## 4. `retention_analysis`」；`SKILL.md`「## Full-Reference Mode」。

**六段固定顺序与段名**（原文："A complete rewrite output consists of six sections in the following order:"）：

| 序 | 段名（原文） | 中文 | 官方职责（原文 Purpose） |
|---|---|---|---|
| 1 | `subject_definitions` | 参考对象定义 | "Defines referenced content and its reference labels" |
| 2 | `summary` | 摘要 | "Summarizes the task type, target video, and main reference relationships" |
| 3 | `retention_analysis` | 保留度分析 | "Describes how referenced content is preserved, transferred, or reused" |
| 4 | `detailed_description` | 详细描述 | "Describes visuals, actions, shots, sound, and dialogue in playback order" |
| 5 | `overall_soundscape` | 整体声景 | "Summarizes ambience and physical sounds" |
| 6 | `non_diegetic_music` | 非叙事性音乐 | "Describes background music audible only to the audience" |

**四类参考标签**（原文："Full-reference rewrites use four types of labels…"）：

| 标签 | 官方 Meaning（原文） | 使用边界 |
|---|---|---|
| `<Subject N>` | "Visible content abstracted from reference assets that can be reused or modified in the target video" | 可复用的可见内容：人物/动物/物体、场景/背景/环境、服装/道具/界面/视觉特效、风格/动作/表情/姿态。原文："It represents a content unit that will actually be used in the target video, rather than the source file itself." 一个主体可由多个素材定义，一个素材也可定义多个主体。示例：`<Subject 1> is the young woman in <Picture 1>, with long dark hair, a blue cardigan, and a thin silver necklace.` |
| `<Picture N>` | "A reference image used as a concrete target frame or shot-planning anchor" | **仅当**该图充当首帧/关键帧/尾帧/编辑后的关键帧/构图锚点时才单列。原文："If an image is used only to define a character, scene, costume, or style, do not create a standalone picture entry. Instead, cite the image source inside the corresponding `<Subject N>` definition." 示例：`<Picture 2> is the first frame of [Shot 1], showing a woman seated beside a café window.` |
| `<Video N>` | "A reference video that provides an editing source, continuation starting point, or whole-video temporal structure" | 只承担整片级关系：剪辑原片 / 从原片结尾续接 / 参考原片运镜、切点、节奏、时间结构。原文："If a person, object, scene, action, or effect from a reference video is reused as visible content, it still belongs under `<Subject N>`." |
| `<Audio N>` | "An audio signal that is copied or referenced" | 独立音频资产，或参考视频中被启用的同步音轨。五种用途：整段/部分复制音频信号、参考 BGM 风格、参考说话人音色与语态、复用原声对白/歌词/音效、参考节拍与音频连续性。绑定说话人写法：`<Audio 1> is the voice-timbre reference for <Subject 1> (S1).` |

**编号与一致性规则**：

- 原文："`<Video N>` and `<Audio N>` are numbered independently. Each index indicates only the label's order within its own category and does not encode a pairing between the two categories."；"An ordinary reference video does not create `<Audio N>` merely because the file contains sound."
- 原文："Once a reference label is assigned to a piece of content, it keeps the same meaning across `subject_definitions`, `summary`, `retention_analysis`, `detailed_description`, and the audio sections."
- `summary` 段**不得引入新标签**（原文："Do not introduce new reference labels in this section."）。

**`summary` 的任务类型前缀**（原文 §3）：`keyframe completion` / `reference generation` / `video editing` / `video continuation` / `audio reuse` / `audio reference`；组合用 ` + ` 且不重复（原文："combine the task types with ` + ` and do not repeat a type."）。官方示例前缀：`[reference generation]`、`[video editing + reference generation + audio reuse]`。视频剪辑任务的固定开头：`The target video is an edited version of <Video 1>.`

**`retention_analysis` 的关系标记**（原文 §4，"These markers are fixed English values in the output format"）：

| 可见内容（`<Subject N>` / `<Picture N>` / `<Video N>`） | 音频（`<Audio N>`） |
|---|---|
| `fully_preserved` —— "The defined role of the referenced content is fully preserved" | `fully_copy` —— "The complete source audio serves as the target video's complete final audio track" |
| `partially_preserved` —— "The referenced content is still used, but some defined characteristics are changed or only partially retained" | `partially_copy` —— "Only part of the timeline or selected audio layers are copied, or other sounds are added, removed, or replaced after copying" |
| `attribute_transfer` —— "Referenced characteristics are transferred to a different identifiable target subject" | `reference` —— "The signal is not copied directly; only timbre, rhythm, music style, dialogue content, or sound texture is referenced" |
| `weak_reference` —— "Only broad similarity in style, category, composition, or atmosphere is retained" | `weak_reference` —— "Only broad similarity in category or atmosphere is retained" |

行格式示例（官方原文）：`<Subject 1> (appears in [Shot 1], [Shot 3]): fully_preserved - ...` / `<Audio 1>: fully_copy - ...`。判定边界（原文）："Choose each relationship marker only within the reference role already defined for that label in `subject_definitions`."

**Ref2VA 与基础模式的差异**（官方对照表「### 5.2」原文）：

| 维度 | T2VA | Full-reference mode（Ref2VA） |
|---|---|---|
| 主字段 | `integrated_multimodal_description` | `detailed_description` |
| 风格开场位置 | "Written after `[Shot 1]`" | "Established in one or two English sentences before `[Shot 1]`" |
| 参考信息 | "Does not use full-reference labels" | "Inserts `<Subject N>`, `<Picture N>`, `<Video N>`, and `<Audio N>` at their first appearance and where their roles apply" |
| 音频关系 | "Describes the target video's own sound" | "Cites `<Audio N>` in the corresponding shot or audio phase and states whether the signal is copied or referenced" |

其它 Ref2VA 细则：「### 5.2」—— 生成类任务的 `detailed_description` 通常 350–500 个英文词；对话密集的内容优先保证完整口语时间线，不机械凑字数。「### 5.4」—— 主体发声时写 `<Subject N> (Sx)`，`(Sx)` 按目标视频中真实发声事件顺序一次性分配并全程复用；**`retention_analysis` 里不得写 `(Sx)`**；只存在于复用 BGM/完整音轨里的口语线索用 `<Audio N>` 作声源，不得另造 `(Sx)`；听不清处写 `[unclear]`（原文："Write `[unclear]` for unintelligible spans instead of guessing or paraphrasing them."）；标点规范化为 `,` `.` `?` `!`，去掉波浪号、emoji、项目符号与重复装饰性标点，并在 `</d>` 前用 `.` `?` `!` 收句。

### 1.10 对白与配乐分离规则

| 内容 | 去向 | 官方英文例句 |
|---|---|---|
| 角色台词、歌唱、画外音、同期叙事内声音 | `integrated_multimodal_description` | `The young woman with a quiet, breathy voice (S1) says: <d>[English] I get off at the next station.</d>` |
| 环境声、物理动作声、非语言人声 | `overall_soundscape` | `The train wheels produce a steady metallic rhythm beneath a low ventilation hum. Rain ticks against the window while paper rustles softly in her hands.` |
| 观众能听见、角色听不见的配乐 | `non_diegetic_music` | `Sustained cello notes at a slow tempo with widely spaced piano tones, gradually decreasing in volume.` |

**禁止**（依据「### 4.6」「### 4.7」原文）：在 `non_diegetic_music` 里写角色说话；在 `overall_soundscape` 里写乐器或重复对白；在 `non_diegetic_music` 里写抽象情绪词或解释配乐的情绪功能；把角色能听到的收音机/电视/现场音乐写进 `non_diegetic_music`。

---

## 二、Seedance 2.5 输出骨架

> 本节「官方」内容的一手来源：`library/intel/seedance-2-5-official.md`（字节官方提示词指南 + 官方 Skill `sd25-pe` 规则摘要）。凡官方文件未写明的一律显式标注「官方未说明」。

### 2.1 官方提示词结构（**权威，优先于本库任何自加结构**）

出处：`seedance-2-5-official.md` →「四、提示词结构（官方 Skill）」。

**基础文本生视频：四行表达**（官方 Skill 原文的四行）

| 行 | 官方内容 | 写什么 |
|---|---|---|
| 第 1 行 | 主体、动作及环境 | 谁 / 是什么，在哪，做什么 |
| 第 2 行 | 视觉风格或氛围 | 画面风格与整体气氛 |
| 第 3 行 | 镜头景别、位置、运动或切换 | 景别、机位、运镜、切镜方式 |
| 第 4 行 | 对白、环境声、音效或音乐 | 声音层的全部内容 |

模板：

```text
{主体、动作及环境}
{视觉风格或氛围}
{镜头景别、位置、运动或切换}
{对白、环境声、音效或音乐}
```

**参考生视频：五个小节**（官方 Skill 原文的五节名）

| 小节 | 中文 | 写什么 |
|---|---|---|
| `【Generation Goal】` | 生成目标 | 本次生成要达成什么 |
| `【Reference Asset Roles】` | 素材职责 | 每个参考素材各自负责什么（对应本库 2.4 的槽位指代） |
| `【Subjects and Relationships】` | 主体与关系 | 主体身份、数量、外观锚点、彼此关系 |
| `【Event Script】` | 事件脚本 | 按顺序发生的事件与动作 |
| `【Maintain Consistency】` | 一致性维持 | 需要跨事件保持不变的锚点 |

模板：

```text
【Generation Goal】{本片要达成什么}
【Reference Asset Roles】@Image1 负责{人物身份与面部}；@Image2 负责{场景与陈设}；@Video1 负责{运动与节奏}。
【Subjects and Relationships】{主体数量}，{各自可区分特征}，{彼此关系}
【Event Script】{事件一} → {事件二} → {事件三}
【Maintain Consistency】{需要保持一致的锚点}
```

**官方 Skill 的内部流程**（出处同上「官方 Skill 的内部流程」）：解析目标建立「故事契约」→ 长文/小说做影视化压缩 → 素材可读时先盘点再深入检查 → 建立人物/群组/道具/场景映射（每个素材只有一个明确职责）→ 必要时只提**一次**合并后的澄清问题 → 在生成/编辑/延长中选一个主任务 → 选模板并替换占位 → 最终检查。

> 官方明确：最终检查后**只输出可提交的提示词正文**，不附分析、版本记录、参数说明或修改理由。

### 2.2 库自加「七段式」组织辅助（⚠️ **非官方结构**）

⚠️ 下表的七段划分是**本库为拼装方便自加的组织辅助，不是官方结构**。官方结构是 2.1 的**四行**（基础文本生视频）与**五个小节**（参考生视频）。保留七段式的唯一理由：拆维度拼装方便、可与 `audio-dialogue-music.md` 等片段库逐段对齐。两者冲突时**一律以官方为准**。

| 段 | 名称 | 写什么 | 常见漏写 | 落到官方四行的哪一行 |
|---|---|---|---|---|
| 1 | **主体** | 人物/产品的身份、外观、材质、服装、初始状态与位置 | 只写"一个人"，不点名区分特征 | 第 1 行 |
| 2 | **环境** | 场景类型、空间关系、陈设、天气、时间、光源方向 | 背景空泛，导致后段主体漂移 | 第 1 行 |
| 3 | **动作与时间** | 主体做什么、按什么先后顺序、多久完成 | 只有动作没有节拍与时长 | 第 1 行（时间戳见 2.5） |
| 4 | **镜头与构图** | 景别、机位、唯一主运镜、构图 | 一镜写两种以上运动 | 第 3 行 |
| 5 | **光线与色彩** | 光源、方向、色温、明暗关系、主色调 | 风格词全部堆在这里且太弱 | 第 2 行 |
| 6 | **音频** | 环境音、音效、音乐、对白、节奏 | 不写就出不了想要的音画关系 | 第 4 行 |
| 7 | **约束** | 保持项、禁止项、稳定性锚点 | 漏写约束，模型自由发挥 | **官方无独立约束段**；约束写在提示词正文内（负向控制的官方写法见 2.6） |

**本库自加的七段式模板 · 文生视频**

```text
【主体】{人物}，{年龄段}{性别}，{发型与发色}，{面部特征}，{穿着{外套/下装/鞋}}，佩戴{配饰}，位于{画面位置}。
【环境】{场景类型}，{空间与陈设}，{时间与天气}。
【动作与时间】0~{X}秒{动作一}；{X}~{Y}秒{动作二}；全程{节奏基调}，动作速度均匀。
【镜头与构图】{景别}，机位{高度与角度}，{唯一主运镜：方向+幅度+速度}，{构图方式}。
【光线与色彩】{主光源方向与色温}，{明暗关系}，{主色调}，{整体影调}。
【音频】{环境底噪}；{与动作对应的音效}；{配乐风格与乐器}；{对白或无对白}。
【约束】保持{人物外观}与{产品几何}一致，地平线水平；不出现多余人物、字幕、水印与画面文字；不闪烁、不切镜、不自行运镜。
```

**本库自加的七段式模板 · 图生视频**（运动优先公式：**保持 → 主运动 → 镜头 → 次运动 → 时间节奏 → 落幅画面 → 约束**）

```text
【主体】{人物/产品}的外观完全保持{图片}所示：{身份、服装、配饰或产品几何与 logo 位置}。
【环境】保持{图片}中的{场景布局、陈设位置与光线方向}不变。
【动作与时间】
保持：以{图片}为起始状态，{主体}执行{唯一主运动：方向/幅度/速度}；{次运动：手部或衣摆等局部运动}；动作分{两三个先后节拍}完成，{如：先…再…最后…}。
【镜头与构图】{景别}，{唯一主运镜：方向+幅度+速度}。
【光线与色彩】{光线方向与色温}，{色调}。
【音频】{环境音与动作对应音效}，{音乐}。
【落幅画面】最终停在{主体状态与构图}，{产品/人物在画面中的位置与朝向}。
【约束】保持{人物/产品}外观与几何完全一致，{场景布局与地平线}不变；不出现多余人物、字幕、水印与画面文字；不闪烁、不切镜、不自行运镜。
```

### 2.3 符号规范（官方 Skill 明确给出）

出处：`seedance-2-5-official.md` →「五、符号规范（官方 Skill 明确给出）★」。

| 用途 | 符号 |
|---|---|
| 音乐 | `()` |
| 音效 | `<>` |
| 对白 | `{}` |
| 字幕 | `【】` |

- **对白要逐段标明**：语言、说话者、语气、准确台词。
- **多人对白时**要说明非说话者自然闭口并听讲。
- **用户没指定语言时，不得自行推断**普通话、方言或地区口音。
- 官方 Skill 另注明："不得自动加入字幕、标志、水印、重复主体、稳定包或用户未要求的负向限制。"

> ⚠️ **不要与 H3 混用**：H3 的对白语法是 `<d>[语言] 台词</d>`（尖括号 + `d` 标签），Seedance 2.5 是 `{}`（花括号）。详见 `audio-dialogue-music.md` AUD-27。

### 2.4 参考素材指令语法（**Seedance 2.5 专用，不是 H3**）

出处：`seedance-2-5-official.md` →「三、素材指代与绑定（官方 Skill 规则）」。

**基础槽位**（按上传顺序编号）：

| 指令 | 作用 | 用法要点 |
|---|---|---|
| `@Image1` | **锁定人物身份** | 写"@Image1 锁定{人物}的身份与面部特征"，同时在【主体】段复述关键特征，否则身份会漂 |
| `@Image2` / `@Image3` | **保持产品几何** | 写"@Image2 保持{产品}的外形、材质与 logo 位置"，逐个说明各图管什么，不写"参考图" |
| `@Video1` | **继承运镜** | 写"@Video1 继承其中的机位、运镜方式与节奏"，只继承运镜，不要让它覆盖人物身份 |
| `@Audio1` | **控制节奏** | 写"@Audio1 作为节奏基准，动作节拍与音乐节拍对齐" |
| 多个参考 | 分配不重叠 | 显式补一句"各参考互不覆盖"，否则模型会把参考图中的人/物一并搬入 |

**官方更完整的绑定规则**（逐条照做）：

1. **每个素材只能有一个明确职责**；一个素材在提示词里**每行只定义一个人物、群组、道具或场景**。
2. **多个角色原则上用各自独立素材**；不能用一张单人图同时定义两个同时出现的人物（易生成重复角色）。
3. **多图同主体要声明"共同代表同一实体"**：说明每张图贡献哪一部分属性，并写明它们**共同代表同一实体**、不得生成多个副本。
4. **部分参考要写明"参考哪一部分"**。官方原文："分工要具体到「参考什么」，如果是部分参考，要写明「**参考哪一部分**」。"
5. **映射优先级**（官方给定）：用户明确指定 ＞ 原提示词描述 ＞ 素材内容 ＞ 文件名及元数据 ＞ 上传顺序。
6. **按上传顺序对应编号，每个素材做文本绑定**。官方 Skill 原文："按照上传素材的顺序对应编号（图 1 / 视频 1 / 音频 1），每个素材进行文本绑定，**不建议只在图片里呈现映射信息**……容易导致多人混淆或重复角色。"
7. **素材足够精准时只做"指代"、减少画面复述**。官方原文："当参考素材本身已足够精准时，建议只做「指代」、**减少画面复述**。"
8. **保持用户原有标签**：用户已有的 `@ImageN` 标签必须保持原编号、原语法，不得删除、重编号或虚构。
9. **角色对应错误的修法**：按人物**首次出场顺序**上传参考素材，并同步调整提示词中的图片、音频编号（官方常见问题速查）。

> **H3 侧不要用 `@ImageN`**。H3 的标签是尖括号编号标签 `<Subject N>` / `<Picture N>` / `<Video N>` / `<Audio N>`（见 1.9），基础模式的参考图标签是 `<Picture N>`（见 1.3）。

### 2.5 时间戳（官方，与 2.0 的差异）

出处：`seedance-2-5-official.md` →「六、时间戳（官方，与 2.0 的差异）」。

> 官方原文："Seedance 2.0 不响应时间戳只响应镜头序号，而 **Seedance 2.5 响应整数秒的时间戳**。"
> 官方原文：时间戳以「**1 秒**」为单位。

**四种写法**：

| 类型 | 官方示例 |
|---|---|
| 明确的时间区间 | 「0-3 秒……3-7 秒……7-15 秒」／「[1s-4s]....[4s-8s]....[8s-12s]」 |
| 时间点控制 | 「第 5s 快速向左横移转场」／「第 2 秒一道金雷能量自画面顶部破空直落」 |
| 相对时间控制 | 「张三呆滞地站在原地，**3 秒后**周围的人纷纷摇头」／「主角按下快门后画面定格 1 秒」 |
| 阶段（长视频优先） | 官方 Skill 补充：长视频优先用「阶段」而不是凭空生成大量时间戳 |

**官方约束**：

- 响应**整数秒**的时间戳，以 1 秒为单位。
- **注意时间轴连续性**，避免「0-3 秒…5-6 秒…」这种有缺口的表达。
- **不建议用时间戳控制频率/频次**（如「一秒摇头 3 次」）。
- 指定时间段内剧情太少 → 模型会自由发挥；太多 → 过度剪切或剧情遗漏。
- 官方 Skill 补充：**目标总时长属于参数，不应直接写入普通生成提示词**；用户给的时间段若与目标时长冲突且非硬约束，优先保持事件顺序与相对节奏，改用无编号阶段。

### 2.6 负向控制（官方，四类分开）

出处：`seedance-2-5-official.md` →「七、负向控制（官方）」。

> 官方原文："支持负向控制字幕。" —— 示例：「不额外加入对白字幕」「不要字幕」。
> 官方原文："支持负向控制音频：支持**更细维度的单独控制：音效、背景音乐（bgm）、对白**。" —— 示例：「无 bgm，只生成环境音和动作音」「不要任何声音」。

| 控制对象 | 官方示例写法 | 单独关闭时保留什么 |
|---|---|---|
| **字幕** | 「不额外加入对白字幕」「不要字幕」 | 其余一切 |
| **音效** | 「不要音效」 | 对白、环境音、BGM |
| **背景音乐（BGM）** | 「无 bgm，只生成环境音和动作音」 | 环境音与动作音 |
| **对白** | 「不要对白」 | 环境音与音乐 |

**官方加强写法（约束不生效时）**：

- **字幕约束不生效**：官方原文——"避免在台词后复述词语并追加语气、表情、动作等描述，此类描述容易诱发字幕生成。"；"需要对台词做差异化要求时，按「**角色台词（情绪）：内容**」的格式拆分描述。"；"确保参考视频本身不含字幕，否则「无字幕」指令可能失效。"
- **背景音乐约束不生效**：官方原文——明确「音频仅保留角色人声声源」「不产出任何音乐类音轨」，并**一次性穷举音乐类同义词**（音乐、背景音乐、BGM、配乐、器乐、旋律、合成器音效、氛围铺底音等），避免模型替换表述绕过约束；"将音频约束在提示词的**开头与结尾各写一遍**，强化模型注意力。"

> 展开版写法见 `audio-dialogue-music.md` AUD-30 ~ AUD-33。

### 2.7 锁定 vs 不锁定，以及首尾帧的两种做法

出处：`seedance-2-5-official.md` →「二、两类任务：锁定 vs 不锁定（2.0 没有这个区分）」与「八、首尾帧（官方）」。

| 类别 | 任务 | 参数能否自定义 |
|---|---|---|
| **有锁定** | 编辑 / 首尾帧 / 延长 | 不支持用户自定义（会锁定输出视频的宽高比、甚至时长） |
| **无锁定** | 参考任务 / 多宫格分镜 / 关键帧 | 可指定宽高比与时长 |

> 官方原文："有锁定：素材会严格成为输出视频时间轴上的一段，是模型输出去适应传入的素材，因此会锁定输出视频的宽高比、甚至时长。"
> 官方原文："无锁定：仅对素材进行语义上的参考，因此用户可以指定输出视频的宽高/时长属性。"

**首尾帧两种做法**（官方原文）：

| 做法 | 官方原文要点 | 效果 |
|---|---|---|
| `role=first_frame` / `role=last_frame` | "优先使用参数设置图片的 role 为：**first_frame / last_frame**；注意此方式会**锁定输出视频的宽高比**，严格对齐用户输入视频的首帧图。" | **锁定**宽高比，严格对齐 |
| `role=reference_image` + 在 prompt 中指定 | "也支持设置 role 为 **reference_image**，在 prompt 中指定具体图片为首帧&尾帧。注意此方式**不会锁定**输出视频的宽高比，视频效果与首帧&尾帧参考图相近，但**不完全匹配**。" | **不锁定**宽高比，效果相近但不完全匹配 |

官方 Skill 的固定原句（逐字使用）：

> "Use @ImageN as the first frame."
> "Use @ImageN as the last frame."

> 官方补充：首尾帧之外的其他图片只能补充人物、服装、道具、材质等，**不得覆盖首尾帧构图**。

### 2.8 硬性参数

| 项 | 口径 | 出处 |
|---|---|---|
| 时长 | **单段 30 秒视频直出**（官方）。**目标总时长属于参数，不应写进普通生成提示词** | `seedance-2-5-official.md`「一、能力总览（官方原文）」+「六、时间戳」 |
| 分辨率 | **480p / 720p / 1080p**（官方参数）；1080p 下指纹状纹理问题概率低于 720p | 「十二、Seedance 2.5 相对 2.0 的差异（官方）」 |
| 画幅 / 宽高比 | **支持 [0.4, 2.5] 之间的任意宽高比**（Seedance 2.0 只有固定的 6 档）；宽高长度 [300, 6000] px；总像素 [407696, 8295044] | 同上 |
| 参考素材上限 | **单次最多 50 个参考素材** | 「一、能力总览（官方原文）」 |
| 多视图 | **Seedance 2.5 支持多视图作为主体参考**（2.0 不建议使用） | 「十二、Seedance 2.5 相对 2.0 的差异（官方）」 |
| 提示词字数上限 | **官方未说明**。（此前库内写的「30~80 词」是本库经验值，无官方出处；官方指南没有任何字数限制的说法） | — |
| 模型 id | `doubao-seedance-2-5-260628` | 「一、能力总览（官方原文）」 |
| 语言 | 原生支持生成 10 余种语言 | 同上 |

---

## 三、两模型差异对照表

| 维度 | MiniMax H3 | Seedance 2.5 |
|---|---|---|
| **官方提示词结构** | 基础模式三字段：`integrated_multimodal_description` → `overall_soundscape` → `non_diegetic_music`；Ref2VA 六段 | **基础文本生视频四行**（主体动作环境 / 风格氛围 / 镜头景别位置运动切换 / 对白环境声音效音乐）；**参考生视频五小节**（`【Generation Goal】`/`【Reference Asset Roles】`/`【Subjects and Relationships】`/`【Event Script】`/`【Maintain Consistency】`）。本库另有**自加的七段式组织辅助**（非官方） |
| **提示词长度** | 官方文件**未说明**字数上限（此前流传的「7000 字符」无出处） | **官方未说明字数上限**（此前库内「30~80 词」为本库经验值，无官方出处，已删除） |
| **时长范围** | **4~15 秒（官方）**，超时须拆条再拼 | **单段 30 秒直出（官方）**；**目标总时长属于参数，不应写进普通生成提示词** |
| **时间轴写法** | 镜号 + `MM:SS.mmm` 切点时间，严格递增 | **响应整数秒的时间戳**，以 **1 秒**为单位；支持明确区间／时间点／相对时间／阶段四种写法；须**不留缺口**；**不建议用时间戳控频次** |
| **改写语言** | **改写段一律英文**（官方 Output Rules）；只有 `<d>` 内的对白/歌词与画面可见文字保留原语言 | 中文表现更稳，指令词（保持/主运动/镜头）建议用中文原词；官方未限定语言 |
| **音频能力** | 三个独立字段：描述层 / 画内声层 / 配乐层；`overall_soundscape` 限 1~4 句英文单段，`non_diegetic_music` 限 1~3 句英文且禁抽象情绪词 | **符号规范**：音乐 `()`、音效 `<>`、对白 `{}`、字幕 `【】`；**负向控制可单独关闭字幕 / 音效 / BGM / 对白**四类 |
| **分镜标记语法** | `[Shot 1]` 起手无时间戳，后续 `[Shot n] At MM:SS.mmm`，切点严格递增 | 无 `[Shot n]` 镜号标记；用官方四行／五小节 + 时间戳表达 |
| **切镜短语** | 官方五选一：`the camera cuts to` / `the shot cuts to` / `the shot transitions to` / `the shot changes to` / `the shot switches to`；叠化/淡出/划变仅用户明确要求时用 | 写转场方式（匹配剪辑/动作接/视线接/声音桥/遮挡）与触发点；转场时间、方式都写明 |
| **运镜写法** | 官方词表 12 组类型 + `with small/large amplitude` + `at slow/fast speed`；写成句内自然英文动作，中幅度与常速通常省略 | 官方四行第 3 行为「镜头景别、位置、运动或切换」；本库自加七段式的「方向+幅度+速度」写法可用但**非官方措辞**；小众术语要转成「名词 + 描述性解释」 |
| **参考素材写法** | Ref2VA 用 `<Subject N>`/`<Picture N>`/`<Video N>`/`<Audio N>` 四类标签，**各自独立编号，官方未说明数量上限**；基础模式用 `<Picture N>` | `@ImageN`/`@VideoN`/`@AudioN`，**每个素材一个明确职责**、多角色用独立素材、多图同主体须声明共同代表同一实体、映射优先级（用户指定＞原提示词＞素材内容＞文件名元数据＞上传顺序）、素材够精准时只指代少复述；**上限 50 个**，**支持多视图** |
| **锁定语义** | 无此区分 | **有锁定**：编辑 / 首尾帧 / 延长（宽高比与时长不可自定义）；**无锁定**：参考 / 多宫格 / 关键帧（可指定宽高比与时长） |
| **首尾帧** | 固定首行指令（`For the target video, at 0.00 seconds…` / `How the reference pictures align with the target video…`） | 两种做法：`role=first_frame`/`last_frame`（**锁定**宽高比、严格对齐，固定句 `Use @ImageN as the first frame.` / `Use @ImageN as the last frame.`）；`role=reference_image` + prompt 指定（**不锁定**，效果相近但不完全匹配） |
| **负面约束写法** | 无独立 negative 字段；只能写成"保持 X，不出现 Y"（属库自加用法，官方未规定附加约束段） | 官方支持**负向控制字幕 / 音效 / BGM / 对白**四类单独；**无独立的"约束段"字段**，约束写在提示词正文内 |
| **说话人写法** | `(S1)` / `(S2)` / `(S1,S2)` 括号式；台词写 `<d>[English] ...</d>`；画外音用官方短语 `says in an off-screen voiceover` + 紧跟闭嘴声明；**没有 OS/VO 标记** | 台词写进 `{}`；**逐段标明语言、说话者、语气、准确台词**；多人对白时说明非说话者自然闭口并听讲；**用户未指定语言时不得自行推断**普通话/方言/口音 |
| **画面文字** | 官方：可见文字用英文双引号包裹，原文逐字保留不翻译 | 字幕用 `【】`；画面文字拼写规避：拆成独立字母按顺序出现，或把文字制成图片作参考素材 |
| **多主体/群像** | 需按"第 1 位/第 2 位"逐个点名区分特征 | 多角色用各自独立素材；用 `@Image1`/`@Image2` 分别锁定，特征仍要复述 |
| **产品/商业片** | 长描述有利于锁定几何与 logo 位置 | 建议 `@Image2`+`@Image3` 锁几何，约束里点名 logo |
| **产物** | 帧率与采样率**官方文件未说明**；2K 来自官方场景技能 `3d-animation-short-generator` 的分辨率选项卡，非提示词规范原文 | 480p/720p/1080p；**任意宽高比 [0.4, 2.5]**（非固定 16:9 / 9:16）；支持 MOV 输出 |

---

## 四、常见错误速查

> 本表「改法」一栏里出现的「第 N 段」指**本库自加的七段式组织辅助**（见 2.2，非官方结构）；官方结构是 2.1 的四行 / 五小节。写 Seedance 2.5 时，按 2.1 的官方结构落位即可，本表只是给出该强调什么。

| # | 症状 | 原因 | 改法 |
|---|---|---|---|
| 1 | **脸崩 / 换脸** | 动作预算过高（一镜塞多动作），或参考图过多互相污染 | 一镜减到一个主动作；参考图压到 3~4 张；每个新镜次开头复述锚点 |
| 2 | **乱字幕 / 自发标题条** | 没写"不要生成字幕"，模型把电影感当成要加片头字幕 | 第 7 段写"不出现任何字幕、标题条、水印、台标" |
| 3 | **运镜乱 / 镜头乱飞** | 一镜里混了两种以上运镜（推 + 摇 + 环绕） | 一镜只留一个主运动，第二种运动用切镜实现 |
| 4 | **节奏平 / 没有推进感** | 缺时间先后节拍词，只写"然后…"没有时序与时长 | 在第 3 段写"先…（0~3 秒）再…（3~6 秒）最后…" |
| 5 | **产品变形 / logo 漂移** | 未点名要保持的具体几何与 logo 位置 | 第 7 段点名"外形、部件数量、材质、logo 位置不变"；配 `@Image2/@Image3` |
| 6 | **切太碎 / 跳切** | 切点条件滥用（无新视点也切），或切点时间不递增 | 切镜只在五条件之一满足时使用；时间戳严格递增 |
| 7 | **音画不同步** | 音效没绑在具体动作上，模型自由铺环境音 | 把每条音效绑到动作："脚步落地时响起鞋跟声"、"合上盖子时一声轻响" |
| 8 | **风格跑偏** | 风格词写在末尾且过弱，前面已被写实描述占位 | 风格词提到第 1~5 段前部并给足描述，末尾补一句"全片不切换画风" |
| 9 | **手部畸形** | 给了手部动作特写，手指在运动中丢失 | 不给手部特写；或写"手保持放松握持、不做精细操作" |
| 10 | **闪烁 / 抖动** | 多个"保持"条款互相冲突（既高速又绝对静止） | 先做取舍，一个镜头只保留一套速度与稳定性要求 |
| 11 | **多余人物 / 路人入画** | 只写"画面里有两个人"，没锁人数 | 写"画面中只有 N 个人物，人数始终为 N；不出现背景群众" |
| 12 | **画面文字乱码** | 依赖画面文字传递信息，AI 视频文字必然漂移 | 文字只作静态标识，叙事靠动作与对白；需要可读就写"拼写准确、不镜像" |
| 13 | **漂浮物 / 物体复制** | 动作没交代受力与来源，物体凭空出现 | 写清"由谁拿、放哪里、与其他物体的支撑关系" |
| 14 | **比例跳变 / 头大手小** | 未写尺度参照，透视变化时比例失守 | 写参照物："身高约与{门框/栏杆}等高，全程比例不变" |
| 15 | **地平线歪 / 建筑扭曲** | 大动作 + 广角，地平线没被锚定 | 约束段单写一句"地平线保持水平、垂直线保持竖直"，镜头改用中焦 |
| 16 | **人物直视镜头** | 模型默认爱看镜头，且没给替代视线 | 写"始终看向{视线目标}"，需要破第四面墙时单独写例外 |
| 17 | **对白串声 / 两人同时说话** | 没用括号式说话人 ID，也没区分同时与轮流 | 用 `(S1)` / `(S2)`；同时发声写复合 ID `(S1,S2)`；要轮流就显式写顺序与不重叠 |
| 18 | **穿模 / 手插进桌面** | 接触动作缺距离说明 | 写"手在桌面上方划过不接触"、"接触点有自然受压与阴影" |
| 19 | **落幅对不上尾帧** | FL2VA 只写过程不写落幅 | 模板末句必须写"最终停在{尾帧描述}"，落幅写在动作之后 |
| 20 | **参考图互相覆盖** | 只写"参考这些图"，没分配职责 | 逐条声明"@Image1 锁身份、@Image2 保几何"，并写"互不覆盖"（H3 侧用 `<Subject N>` / `<Picture N>` 分工） |
| 21 | **塑料感皮肤 / 过度锐化** | 提示词里出现"极致细节、8k 超清、高对比" | 删掉这些词，换成"保留毛孔与细纹的自然皮肤质感" |
| 22 | **静镜被推成推近** | 没写"镜头不自行运动" | 约束段写"除{唯一主运镜}外机位与焦段保持不变，不自行推拉摇移" |
| 23 | **H3 台词被当成旁白念出来 / 声音特征被念出来** | 把音色说明写进了引号或 `<d>` 内 | 用 `<d>[English] ...</d>`，`<d>` 内只放语言标签与用户原文，音色与 ID 全写在外面 |
| 24 | **H3 画外音但画内人物在动嘴** | 没写官方固定短语与闭嘴声明 | 用 `says in an off-screen voiceover`，并在其后紧跟"the character's lips remain closed" |
| 25 | **H3 改写段写成中文** | 把中文模板直接喂给 H3 | H3 改写段一律英文；只有 `<d>` 内对白/歌词与画面可见文字保留原语言 |
| 26 | **H3 参考标签写成 `@Image1`** | 混用了 Seedance 2.5 的槽位语法 | H3 用 `<Subject N>` / `<Picture N>` / `<Video N>` / `<Audio N>`；`@ImageN` 只属 Seedance 2.5 |
| 27 | **H3 出现未解析的参考标签** | 标签提了但没在 `subject_definitions` 里定义 | 每个标签都要在 `subject_definitions` 有定义，并在各段保持同一含义；`summary` 不得新增标签 |
