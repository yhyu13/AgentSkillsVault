---
id: h3-syntax
title: H3（海螺 03）官方书写规范
dimension: H3 官方书写规范
applies_to: [H3]
model_field: 全部三个字段的写法（字段内部）
---

# H3（海螺 03）官方书写规范

> **装配位置**：H3 → integrated_multimodal_description / overall_soundscape / non_diegetic_music
> **一句话用法**：先按官方版式摆好（可选对齐指令行 + 空一行 + 三字段），再在主描述段按 `[Shot N]` 时间轴逐镜写实，把对白套进 `<d>`、把环境物理音放进 `overall_soundscape`、把观众专属配乐放进 `non_diegetic_music`，三处一个声音只写一遍。
>
> **依据**：本文件每条规则取自官方原件 `library/intel/minimax-h3-official/` 下的 `SKILL.md`、`references_base-en.txt`、`references_ref-en.txt`，引文均标注「文件名 → 小节标题」。**装配 H3 时一律取英文片段**（官方 Output Rules 要求改写段用英文）；中文片段只服务人读。

## 片段

### H3S-01 · 三个字段的职责边界
- **中文片段**：`主描述段写视觉与叙事内声音；整体声景写环境声、物理动作声与非语言人声；非叙事配乐只写观众听得到的背景音乐。`
- **英文片段**：`integrated_multimodal_description: {visuals, actions, shots, speakers, dialogue, singing, and diegetic audio along the timeline.} overall_soundscape: {ambient sound, physical action sounds, and non-verbal human sounds across the entire video.} non_diegetic_music: {background music that the characters cannot hear and only the audience can hear.}`
- **适用**：H3
- **要点**：三个字段名与顺序是官方硬规定，出处 `references_base-en.txt` →「### 2.2 Part Two Contains the Three Core Fields」；`SKILL.md` →「## Base Modes」同样要求按该顺序。别把环境音塞进主描述段的总述句里。

### H3S-02 · 三层音频分离与「一个声音只写一遍」
- **中文片段**：`台词、歌唱与叙事内音乐写进主描述段；环境声、物理动作声与非语言人声写进整体声景；观众专属配乐写进非叙事配乐。`
- **英文片段**：`Dialogue, singing, and diegetic music are described in the multimodal description only; ambience, physical action sounds, and non-verbal human sounds are described in overall_soundscape only; audience-only background music is described in non_diegetic_music only.`
- **适用**：H3
- **要点**：官方原文「Dialogue, singing, and diegetic music already belong in the multimodal description and should not be repeated here.」（`references_base-en.txt` →「### 4.6」）。同一个声音在两个字段各写一遍会出人声叠唱与重影。

### H3S-03 · 整体版式（指令行 + 空一行 + 三字段）
- **中文片段**：`图像对齐指令行（仅 I2VA / FL2VA / L2VA）后空一行，再依次写主描述段、整体声景、非叙事配乐。`
- **英文片段**：`{Optional image-alignment instruction line — I2VA / FL2VA / L2VA only}\n\nintegrated_multimodal_description: {…}\n\noverall_soundscape: {…}\n\nnon_diegetic_music: {…}`
- **适用**：H3
- **要点**：官方原文「The instruction must be the first line of the final prompt, followed by one blank line before the core fields.」（`references_base-en.txt` →「### 2.1」）。T2VA 没有对齐指令行，直接从三字段开始。

### H3S-04 · 字段名、段序、标签与时间记法不可改
- **中文片段**：`严格沿用所选指南的字段名、段落顺序、参考标签与时间记法，不得改名、改序、改标签写法。`
- **英文片段**：`Preserve the exact field names, section order, labels, and timing notation from the selected guide.`
- **适用**：H3
- **要点**：出处 `SKILL.md` →「## Workflow」第 4 条。这句是元规则（写给改写流程的约束），不要当成提示词正文丢进模型；它的作用是防止把 `integrated_multimodal_description` 写成 `description`、把 `MM:SS.mmm` 写成 `00:03.5`。

### H3S-05 · Shot 标记格式
- **中文片段**：`第一镜写 `[Shot 1]` 不带时间戳；后续镜写 `[Shot N] At MM:SS.mmm,` 再接本镜内容。`
- **英文片段**：`[Shot 1] {style}, {shot size}, {subject, position, environment, action, camera, sound}. [Shot 2] At 00:03.500, the camera cuts to {…}. [Shot 3] At 00:07.000, the shot cuts to {…}.`
- **适用**：H3
- **要点**：出处 `references_base-en.txt` →「### 4.2 Shots and Cuts」，官方示例 `[Shot 2] At 00:03.500, the camera cuts to...`；Ref2VA 同款规则见 `references_ref-en.txt` →「### 5.1 Basic Format」。时间戳固定三位毫秒。

### H3S-06 · 切点严格递增且落在总时长内
- **中文片段**：`后续每镜以严格递增的切点时间开头，且切点必须落在视频总时长之内。`
- **英文片段**：`[Shot 2] At 00:03.500, … [Shot 3] At 00:07.000, … [Shot 4] At 00:09.000, …`
- **适用**：H3
- **要点**：官方原文「begin each one with a strictly increasing cut time that falls within the video duration」（`references_base-en.txt` →「### 4.2」）。时长写 4~15 秒时，切点不要越过终点，也不要出现两个相同切点。

### H3S-07 · 每镜七要素（写实清单）
- **中文片段**：`每一镜都要写清构图、主体、环境、动作、镜头、声音，以及参考内容首次出现的位置。`
- **英文片段**：`[Shot 1] {composition}, {subject appearance and position}, {environment and key props}, {action and reaction}, {camera movement}, {synchronized sound}, and {the exact point where the referenced content appears}.`
- **适用**：H3
- **要点**：出处 `SKILL.md` →「## Output Rules」与 `references_base-en.txt` →「### 4.1」（"Every detail should correspond to something visible or audible"）。元素写的是看得见听得到的东西，不是剧情梗概。

### H3S-08 · 切镜短语词表与转场限制
- **中文片段**：`普通切点从五个官方短句里选一个；叠化、淡出淡入、划变只在用户明确要求时用。`
- **英文片段**：`[Shot 2] At 00:03.500, the camera cuts to {…}. [Shot 3] At 00:05.500, the shot cuts to {…}. [Shot 4] At 00:07.000, the shot transitions to {…}. [Shot 5] At 00:08.500, the shot changes to {…}. [Shot 6] At 00:09.500, the shot switches to {…}.`
- **适用**：H3
- **要点**：官方原文「For ordinary cuts, use `the camera cuts to`, `the shot cuts to`, `the shot transitions to`, `the shot changes to`, or `the shot switches to`. When explicitly requested by the user, cross-dissolve, fade, or wipe may also be used.」（`references_base-en.txt` →「### 4.2」）。不要自造 `we then see` 这类切镜说法。

### H3S-09 · 什么时候才切镜
- **中文片段**：`切镜要带来主体、空间、状态、视点或时间的新信息；只换距离或轻微角度时改用运镜。`
- **英文片段**：`[Shot 2] At 00:04.000, the camera cuts to a new viewpoint across the room, revealing {new subject / new space / new state / new time}.`
- **适用**：H3
- **要点**：官方原文「A cut should introduce new information about the subject, space, state, viewpoint, or time. If only the distance or a slight angle needs to change, prefer camera motion.」（`references_base-en.txt` →「### 4.2」）。无新信息的切镜会造成碎切与跳轴。

### H3S-10 · 运镜写成自然英文动作句
- **中文片段**：`运镜写成本镜内自然发生的英文动作，不要在句末堆一串标签。`
- **英文片段**：`The camera pushes in with small amplitude at slow speed toward the folded letter in her hands. The camera pans right with large amplitude at fast speed, revealing the open doorway. The camera holds a static shot as the runner exits the frame.`
- **适用**：H3
- **要点**：官方原文「Camera motion should be written as a natural English action within the shot, rather than stacked as separate labels at the end of a sentence.」（`references_base-en.txt` →「### 4.3」，以上三句为该节官方示例）。

### H3S-11 · 官方运镜词表（12 组类型）
- **中文片段**：`运镜类型只从官方词表里取：变焦、推拉、横摇、平移、俯仰、升降、环绕、跟拍、固定、晃动、主观视角、滚转。`
- **英文片段**：`The camera {Zoom In / Zoom Out / Push In / Pull Out / Pan Left / Pan Right / Truck Left / Truck Right / Tilt Up / Tilt Down / Pedestal Up / Pedestal Down / Arc Shot / Tracking Shot / Static Shot / Shake Slightly / Shake Strongly / POV / Roll Clockwise / Roll Counterclockwise} {as the subject moves}.`
- **适用**：H3
- **要点**：出处 `references_base-en.txt` →「### 4.3」官方表格，逐项定义如「Zoom In / Zoom Out — The focal length changes while the camera body remains stationary」「Push In / Pull Out — The camera moves forward / backward」。自造运镜词模型不认。

### H3S-12 · 幅度与速度修饰语
- **中文片段**：`幅度写 `with small amplitude` 或 `with large amplitude`，速度写 `at slow speed` 或 `at fast speed`；中等幅度与正常速度通常省略。`
- **英文片段**：`The camera trucks right with small amplitude at slow speed as she lifts her gaze from the letter. The camera pushes in with large amplitude at fast speed toward the doorway.`
- **适用**：H3
- **要点**：官方原文「Add amplitude and speed only when they are meaningful; medium amplitude and normal speed are usually omitted.」（`references_base-en.txt` →「### 4.3」）。别写 `with medium amplitude` 或 `at normal speed`。

### H3S-13 · 对白标签语法 `<d>[语言] 原文</d>`
- **中文片段**：`对白写进 `<d>[English] 台词原文</d>`，标签内只有语言标签与用户原文，逐字保留不改写不翻译。`
- **英文片段**：`The young woman with a quiet, breathy voice (S1) says: <d>[English] I get off at the next station.</d>`
- **适用**：H3
- **要点**：官方原文「Inside `<d>`, include only the language tag and the actual user-provided spoken content. Preserve every original word and punctuation mark verbatim; do not translate or rewrite them.」（`references_base-en.txt` →「### 4.4」，上句为该节官方示例）。

### H3S-14 · 说话人 ID 规则
- **中文片段**：`说话人用括号式 ID，如 `(S1)`、`(S2)`；多人同时发声用复合 ID `(S1,S2)`；同一说话人跨镜保持同一 ID；从不发声的角色不给 ID。`
- **英文片段**：`The two children (S1,S2) shout together, <d>[English] Wait for us!</d>`
- **适用**：H3
- **要点**：出处 `references_base-en.txt` →「### 4.4」。注意 H3 官方**没有** OS/VO 这类标记；`@ImageN` 槽位语法属 Seedance 2.5，不是 H3。

### H3S-15 · 说话人身份信息一律写在 `<d>` 外面
- **中文片段**：`角色类型、年龄、性别、是否在画内、音高、音色、语速、口音在首次出场给足；身份短语、ID、动作、语气全部写在 `<d>` 外面。`
- **英文片段**：`The young woman with a quiet, breathy voice (S1) says: <d>[English] I get off at the next station.</d> She folds the letter along its existing crease.`
- **适用**：H3
- **要点**：官方原文「Place the speaker's identifying phrase, ID, action, and delivery outside `<d>`.」（`references_base-en.txt` →「### 4.4」）。音色说明写进引号或 `<d>` 内会被模型念出来。

### H3S-16 · 画外音：固定短语 + 闭嘴声明
- **中文片段**：`画外音用官方固定短语 `says in an off-screen voiceover`，紧跟一句画内人物嘴唇闭合的声明。`
- **英文片段**：`The man (S1) says in an off-screen voiceover: <d>[English] I still remember that road.</d> while his lips remain completely closed.`
- **适用**：H3
- **要点**：官方原文「For voiceover, use the exact phrase `says in an off-screen voiceover`. Immediately after every voiceover `<d>` block, state that the corresponding on-screen character's lips remain closed.」（`references_base-en.txt` →「### 4.4」，上句为该节官方示例）。

### H3S-17 · `<scenetrans>` 与 `<cutoff>`
- **中文片段**：`同一句台词或歌词跨切点时，在前后两段的连接点各标一次 `<scenetrans>` 并说明声音跨切点继续；台词被视频结尾截断时用 `<cutoff>`。`
- **英文片段**：`[Shot 1] The man (S1) begins, <d>[English] I still remember that road. <scenetrans> [Shot 2] At 00:04.000, the shot cuts to the empty road while his voice continues across the cut. <scenetrans> [Shot 3] At 00:08.000, the shot cuts to the horizon and his sentence is still unfinished <cutoff> as the video ends.`
- **适用**：H3
- **要点**：出处 `references_base-en.txt` →「### 4.4」：「use `<scenetrans>` at the connecting points in both parts and explicitly state that the audio continues across the cut. Use `<cutoff>` when speech is truncated by the end of the video.」

### H3S-18 · 四种跨切点连续性句式
- **中文片段**：`跨切点的声音连续性用官方四个句式之一表达。`
- **英文片段**：`The line continues seamlessly across the cut. The line continues uninterrupted into the next shot. The line carries over from the previous shot. The line remains audible across the transition.`
- **适用**：H3
- **要点**：官方列举 `continues seamlessly across the cut` / `continues uninterrupted into the next shot` / `carries over from the previous shot` / `remains audible across the transition`（`references_base-en.txt` →「### 4.4」）。这四句与 `<scenetrans>` 配合使用，不是替换关系。

### H3S-19 · 画面可见文字
- **中文片段**：`画面上真正可见的招牌、字幕、标签、霓虹字用英文双引号包裹，原文逐字保留、不翻译。`
- **英文片段**：`A red neon sign reading "营业中" glows above the doorway.`
- **适用**：H3
- **要点**：官方原文「Place any banner, sign, label, subtitle, or neon text that is actually visible on screen in English double quotation marks. Preserve the original text and punctuation verbatim, without translation.」（`references_base-en.txt` →「### 4.5」，上句为该节官方示例）。这里保留中文原文是刻意的——画面上就是中文。

### H3S-20 · `overall_soundscape` 的形式约束
- **中文片段**：`整体声景写 1~4 个英文句、放在同一个连续段落里，只写环境声、物理动作声与非语言人声；只有用户明确要求全片静默才写 `N/A`。`
- **英文片段**：`overall_soundscape: Steady rain taps against the café windows while low room ambience continues underneath. The entrance bell rings once, followed by wet footsteps and the soft scrape of a chair.`
- **适用**：H3
- **要点**：官方原文「Use 1–4 English sentences in one continuous paragraph… Use `N/A` only when the user explicitly requests complete silence throughout the video.」（`references_base-en.txt` →「### 4.6」，上句为该节官方示例）。不要写成多段列表，也不要在这里重复台词。

### H3S-21 · `non_diegetic_music` 的形式约束
- **中文片段**：`非叙事配乐写 1~3 个英文句，只写乐器编制、速度、节奏与动态变化，不写抽象情绪词、不解释配乐的情绪功能；没有配乐写 `N/A`。`
- **英文片段**：`non_diegetic_music: Sparse piano notes at a slow tempo, joined by sustained low strings that gradually increase in volume before fading out.`
- **适用**：H3
- **要点**：官方原文「Use 1–3 English sentences… Focus on instrumentation, speed, rhythm, and dynamic changes; do not use abstract mood words or explain the emotional function of the score. Use `N/A` when there is no non-diegetic music.」（`references_base-en.txt` →「### 4.7」，上句为该节官方示例）。别写 "emotional, melancholic score"。

### H3S-22 · 叙事内音乐的归属
- **中文片段**：`角色听得到的歌唱、乐器、收音机、电视或手机里的音乐是叙事内事件，写在主描述段，不写进非叙事配乐。`
- **英文片段**：`A radio on the counter plays a short pop song, and the young woman (S1) sings along, <d>[English] {verbatim lyric}</d>`
- **适用**：H3
- **要点**：官方原文「Singing, instruments, radio, television, or phone music audible to the characters are diegetic events and should appear in the multimodal description.」（`references_base-en.txt` →「### 4.7」）。写错位置会变成「角色听不到的画外配乐」。

### H3S-23 · T2VA 写法
- **中文片段**：`纯文本生成没有对齐指令行，直接从三字段开始；主体外观、动作与声音全部用文字写全。`
- **英文片段**：`integrated_multimodal_description: [Shot 1] Live-action, cinematic, a medium-wide shot frames a baker opening the shutters of a small street bakery before sunrise. The camera pushes in with small amplitude at slow speed as the middle-aged baker with a calm, slightly raspy voice (S1) places a fresh loaf on the wooden counter and says: <d>[English] First batch of the morning.</d>`
- **适用**：H3
- **要点**：官方原文「T2VA has no image-alignment instruction and begins directly with the three core fields.」（`references_base-en.txt` →「### 2.1」，上方为「## 5. Cases」Case 1 原文）。没有参考图兜底，身份锚点必须写足，否则第一镜就漂。

### H3S-24 · I2VA 固定首行
- **中文片段**：`首帧图生音视频第一行固定写图像对齐指令句，空一行后再写三字段。`
- **英文片段**：`For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.`
- **适用**：H3
- **要点**：官方原文「I2VA always uses:」（`references_base-en.txt` →「### 2.1」，上句为官方固定句）。主描述段按 **first-frame anchor → action onset → continuous development → result or reaction** 展开（该文件「### 3.1」）。

### H3S-25 · FL2VA 固定首行
- **中文片段**：`首尾帧生成音视频第一行写首帧与尾帧的对齐说明，空一行后再写三字段。`
- **英文片段**：`How the reference pictures align with the target video — Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot N) aligns with the S.SS-second mark of the target video.`
- **适用**：H3
- **要点**：出处 `references_base-en.txt` →「### 2.1」官方固定句。FL2VA 优先单镜（"FL2VA generally favors a single shot"），主体写运动路径而不是两张图的静态复述；最后必须由末尾 `[Shot N]` 落到尾帧（该文件「### 3.2」）。

### H3S-26 · L2VA 固定首行
- **中文片段**：`尾帧图生音视频第一行写尾帧与末镜的对齐说明，空一行后再写三字段。`
- **英文片段**：`How the reference pictures align with the target video — <Picture 1> (from Shot N) aligns with the S.SS-second mark of the target video.`
- **适用**：H3
- **要点**：出处 `references_base-en.txt` →「### 2.1」官方固定句。`<Picture 1>` 是最终帧、属于最后一个 `[Shot N]`，「it does not inherently belong to Shot 1」（该文件「### 3.3」）；按 **plausible preceding state → explicit action and transition path → gradual convergence in the final shot → last-frame landing** 展开。

### H3S-27 · `N` 与 `S.SS` 占位符规则
- **中文片段**：`对齐指令里的 `N` 填实际最后一镜的镜号，`S.SS` 填有效视频时长并保留两位小数。`
- **英文片段**：`How the reference pictures align with the target video — <Picture 1> (from [Shot 3]) aligns with the 8.00-second mark of the target video.`
- **适用**：H3
- **要点**：官方原文「Here, `N` is the index of the actual final shot, and `S.SS` is the effective video duration formatted to exactly two decimal places.」（`references_base-en.txt` →「### 2.1」）。写 `8.0` 不行，必须 `8.00`。

### H3S-28 · Ref2VA 六段结构
- **中文片段**：`全参考模式改写成六段，段名与顺序固定：参考对象定义、摘要、保留度分析、详细描述、整体声景、非叙事配乐。`
- **英文片段**：`subject_definitions: {…}\n\nsummary: {…}\n\nretention_analysis: {…}\n\ndetailed_description: {…}\n\noverall_soundscape: {…}\n\nnon_diegetic_music: {…}`
- **适用**：H3
- **要点**：官方原文「A complete rewrite output consists of six sections in the following order:」（`references_ref-en.txt` →「## 1. Overall Structure」）。Ref2VA 的主字段是 `detailed_description`，且风格要在 `[Shot 1]` 之前用一两句英文交代（该文件「### 5.2」）。

### H3S-29 · `summary` 的方括号任务类型前缀
- **中文片段**：`摘要段以方括号任务类型前缀开头，多个关系用 ` + ` 组合且不重复；摘要段不得引入新参考标签。`
- **英文片段**：`summary: [video continuation + keyframe completion] The target video continues from <Video 1> and lands on <Picture 2> as the final frame, with <Subject 1> carrying over from the previous scene.`
- **适用**：H3
- **要点**：任务类型词表：`keyframe completion` / `reference generation` / `video editing` / `video continuation` / `audio reuse` / `audio reference`（`references_ref-en.txt` →「## 3. `summary`」）。视频剪辑任务固定开头 `The target video is an edited version of <Video 1>.`；原文明令「Do not introduce new reference labels in this section.」

### H3S-30 · `retention_analysis` 的两套关系标记
- **中文片段**：`可见内容用 fully_preserved / partially_preserved / attribute_transfer / weak_reference；音频用 fully_copy / partially_copy / reference / weak_reference；每个标签一行。`
- **英文片段**：`retention_analysis:\n<Subject 1> (appears in [Shot 1], [Shot 3]): fully_preserved - the exposed brick wall, orange sofa, and neon sign are retained.\n<Picture 2> ([Shot 1] first frame): fully_preserved - the opening framing is kept.\n<Video 1> (cut and pacing structure): weak_reference - only the rhythm of the cuts is echoed.\n<Audio 1>: fully_copy - <Audio 1> is reused 1:1 as the target video's complete final audio track.`
- **适用**：H3
- **要点**：出处 `references_ref-en.txt` →「## 4. `retention_analysis`」（可见内容见「### 4.1」，音频见「### 4.2」），原文称这些是 "fixed English values in the output format"。判定只能在 `subject_definitions` 已定义的角色范围内选；`retention_analysis` 里不得写 `(Sx)`（该文件「### 5.4」）。

### H3S-31 · 四类参考标签的边界与编号一致性
- **中文片段**：`四类标签各自独立编号、跨段含义一致：主体标签管可复用可见内容，图片标签管具体帧锚点，视频标签管整片级关系，音频标签管被复制或被参考的音频信号。`
- **英文片段**：`subject_definitions:\n<Subject 1> is the young woman in <Picture 1>, with long dark hair, a blue cardigan, and a thin silver necklace.\n<Picture 2> is the first frame of [Shot 1], showing a woman seated beside a café window.\n<Video 1> is the source video for the target video edit.\n<Audio 1> is the voice-timbre reference for <Subject 1> (S1).`
- **适用**：H3
- **要点**：出处 `references_ref-en.txt` →「## 2. Reference Labels and Definitions」（「### 2.1」~「### 2.5」）。边界要点：图只用来定义人物/场景/服装/风格时不单列 `<Picture N>`，只在 `<Subject N>` 里引来源；`"<Video N>" and "<Audio N>" are numbered independently"（### 2.5），同一个参考视频可以是 `<Video 1>` 与 `<Audio 2>`；普通参考视频不会因为带声音就自动产生 `<Audio N>`。

### H3S-32 · 官方 Output Rules 四条
- **中文片段**：`改写段一律英文；逐镜写实不写剧情梗概；参考标签在各段解析干净；写具体不写抽象词。`
- **英文片段**：`Write rewrite sections in English; preserve dialogue, lyrics, and visible scene text in their original language. Describe each shot by composition, subjects, environment, actions, camera, sound, and the exact point where referenced content appears. Avoid plot summaries, unresolved reference labels, and timing that does not match the requested duration. Prefer concrete visual and audio details over abstract words like "cinematic" or "beautiful".`
- **适用**：H3
- **要点**：出处 `SKILL.md` →「## Output Rules」与「## Tips for Better Results」。这四条是改写阶段的检查表，不要整段塞进提示词；它们解释的是「怎么写」而不是「写什么」。

### H3S-33 · 官方未说明的项（不要当硬约束）
- **中文片段**：`帧率、分辨率档位、提示词字数上限、参考素材数量上限，官方文件均未说明，不要写成硬性要求。`
- **英文片段**：`No frame rate, resolution tier, prompt length limit, or reference count limit is specified for this video; the description follows only the requested duration and the three core fields.`
- **适用**：H3
- **要点**：`SKILL.md`、`references_base-en.txt`、`references_ref-en.txt` 三份官方文件均未记载帧率、分辨率档位、字数上限与参考数量上限。2K / 768P 只见于官方场景技能 `3d-animation-short-generator/SKILL.cn.md` 的分辨率选项卡，属场景层说明，不是提示词规范；官方明确的硬约束只有时长 4~15 秒、字段名/段序/标签/时间记法不得改动。

### H3S-34 · Ref2VA 与基础模式的差异
- **中文片段**：`全参考模式用 `detailed_description` 作主字段、风格写在 `[Shot 1]` 之前、镜头内插入参考标签、音轨段注明是复制还是参考。`
- **英文片段**：`The target video is in a cinematic, literary music-video style with soft lighting and a slightly desaturated color palette.\n[Shot 1] A medium shot establishes <Subject 1>, the coffee shop with its exposed brick wall, orange tufted sofa, patterned pillows, neon sign, and wooden coffee table. <Subject 3> (S1) sits on the sofa holding a chocolate-chip cookie.`
- **适用**：H3
- **要点**：官方对照表见 `references_ref-en.txt` →「### 5.2 Full-Reference Mode Differences」。其它差异：生成类任务的 `detailed_description` 通常 350~500 个英文词，对话密集时优先保证完整口语时间线；听不清的台词写 `[unclear]` 而不是猜（该文件「### 5.4」）。

## 排错提示

- **中文改写段**：H3 要求改写段一律英文（`SKILL.md` →「## Output Rules」）。中文只应出现在 `<d>` 内的对白/歌词与画面上真正可见的文字里。
- **用了 `@Image1` / `@Video1` / `@Audio1`**：这是 Seedance 2.5 的槽位语法。H3 用 `<Picture N>`（基础模式）与 `<Subject N>` / `<Picture N>` / `<Video N>` / `<Audio N>`（Ref2VA）。
- **用了 OS / VO 标记**：H3 官方没有这类标记，画外音只用固定短语 `says in an off-screen voiceover`，后面必须紧跟「嘴唇保持闭合」的声明。
- **对白没套 `<d>`**，或把身份/音色说明写进了 `<d>` 内：`<d>` 里只放语言标签与用户原文，身份短语、ID、动作、语气全在外面，否则模型会把音色描述念出来。
- **同一个声音写了两遍**：台词/歌唱/叙事内音乐只在主描述段，环境声/物理音/非语言人声只在 `overall_soundscape`，观众专属配乐只在 `non_diegetic_music`。
- **把现场收音机或电视里的音乐写进 `non_diegetic_music`**：角色听得到的音乐属叙事内事件，写在主描述段。
- **`non_diegetic_music` 里出现抽象情绪词**或解释配乐的情绪功能：官方只允许写乐器编制、速度、节奏、动态变化。
- **`overall_soundscape` 写成多段、或超过 4 句、或不是英文**：官方要求 1~4 句、单一连续段落、英文；`N/A` 只在用户明确要求全片静默时才用。
- **切镜短语自造**（如 `we then see`）：普通切点只用官方五选一；`cross-dissolve` / `fade` / `wipe` 仅在用户明确要求时用。
- **切点时间不递增或越出总时长**：后续镜必须以严格递增、落在视频时长内的切点时间开头。
- **运镜堆标签**（`Push In, small amplitude, slow speed` 逗号挂在句尾）：运镜要写成镜内自然发生的英文动作句；中等幅度与正常速度通常省略，不要写 `with medium amplitude`。
- **`summary` 里出现新标签**：摘要段只能用 `subject_definitions` 已定义过的标签，不得新增。
- **`retention_analysis` 里写了 `(Sx)`**：说话人 ID 只在 `detailed_description` 与 `subject_definitions` 的音频定义里用，保留度分析段不写。
- **`<Subject N>` 与 `<Picture N>` 混用**：图只是用来定义人物/场景/服装/风格时，不单列 `<Picture N>`，只在 `<Subject N>` 定义里引来源；`<Picture N>` 只留给具体帧锚点（首帧/关键帧/尾帧/构图锚点）。
- **把「电影感」「漂亮」当风格词**：官方要求写具体视听细节，风格词用 `Cinematic` / `live-action` / `2D-animated` / `3D CG` / `claymation` / `watercolor` / `vintage film`，其余细节要落到看得见听得到的东西。
- **写整体胶片感而回避逐镜写实**：H3 要逐镜给构图、主体、环境、动作、镜头、声音与参考内容出现位置，不能写成剧情梗概。
- **把 2K / 768P / 帧率 / 字数上限 / 参考数量上限当成硬约束**：这些官方文件均未说明，只能按用户给的时长与三字段来写。
