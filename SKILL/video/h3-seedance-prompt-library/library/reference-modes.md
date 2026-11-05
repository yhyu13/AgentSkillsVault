---
id: reference-modes
title: 参考模式（图生视频 / 多参考 / 关键帧 / 白模 / 编辑 / 延长）
dimension: 参考模式
applies_to: [H3, Seedance2.5]
model_field: 素材层（H3 integrated_multimodal_description ｜ Seedance 2.5 【Reference Asset Roles】）
---

# 参考模式（图生视频 / 多参考 / 关键帧 / 白模 / 编辑 / 延长）

> **装配位置**：H3 → 素材引用段 ｜ Seedance 2.5 → 【Reference Asset Roles】与素材映射行
> **一句话用法**：先把每个素材的职责写死（谁的脸、谁的场景、谁的产品、谁的音色、谁的动作），再选一种参考模式（单图 / 多图 / 参考视频 / 关键帧 / 首尾帧 / 白模 / 编辑 / 延长），最后按该模式的固定句式粘贴。

## 片段

### REF-01 · 单图参考 · 形象参考
- **中文片段**：`@Image1 是主角{张三}，锁定其面部特征、发型与服装；全程保持该人物身份一致，画面中只有这一个人，不新增、不替换人物。`
- **英文片段**：`@Image1 is the main character {Zhang San}; lock his facial features, hairstyle, and clothing, keep this identity consistent throughout, and do not add or replace any character.`
- **适用**：Seedance 2.5
- **要点**：官方 Skill 规定「每个素材只能有一个明确职责」（`library/intel/seedance-2-5-official.md` 第三节）；参考图够精准时只做「指代」、减少画面复述（官方提示词指南「参考类（多素材映射）」）。

### REF-02 · 单图参考 · 场景参考
- **中文片段**：`@Image2 是场景参考，只参考其空间布局、陈设位置与光线方向，不带入图中的人物与文字。`
- **英文片段**：`@Image2 is a scene reference: use only its spatial layout, prop placement, and lighting direction, and do not bring in the people or text shown in it.`
- **适用**：Seedance 2.5
- **要点**：场景参考与形象参考必须分给不同素材；一张图同时当「人」和「景」用会互相覆盖。

### REF-03 · 单图参考 · 产品参考
- **中文片段**：`@Image3 是产品参考，保持{产品}的外形、部件数量、材质与 logo 位置完全一致，logo 不镜像、不变形。`
- **英文片段**：`@Image3 is a product reference: keep the product's shape, part count, material, and logo placement exactly as shown, with the logo unmirrored and undeformed.`
- **适用**：Seedance 2.5
- **要点**：产品几何是 Seedance 2.5 的强项，点名「部件数量」与「logo 位置」比写「保持产品一致」有效得多。

### REF-04 · 单图参考 · 风格参考
- **中文片段**：`@Image4 仅作风格参考，参考其光影与滤镜质感，不继承图中的人物、物体与构图。`
- **英文片段**：`@Image4 is a style reference only: follow its lighting and color-grade texture, and inherit none of its characters, objects, or composition.`
- **适用**：Seedance 2.5
- **要点**：官方示例即「参考图片 1 的光影和滤镜」（官方提示词指南「参考类（多素材映射）」）；风格参考必须写明「仅」，否则模型会把图里的人搬进来。

### REF-05 · 单图参考 · 运动参考
- **中文片段**：`@Image5 作为运动参考，只参考其中的身体姿态、发力方式与运动方向，其余内容不参考。`
- **英文片段**：`@Image5 is a motion reference: follow only the body posture, force application, and direction of movement shown in it.`
- **适用**：Seedance 2.5
- **要点**：要参考的其实是「动作」就写动作、要参考的其实是「构图」就写构图，混着写模型会两头都不到位；姿态参考只保方向与体态，不保人物身份。

### REF-06 · 多参考图 · 素材映射行
- **中文片段**：`图 1 是主角{张三}，图片 1 使用音频 1 音色；图 2 是场景参考；图 3 是产品参考；各参考互不覆盖。`
- **英文片段**：`Image 1 is the main character {Zhang San}; Image 1 uses the voice timbre of Audio 1; Image 2 is the scene reference; Image 3 is the product reference; the references do not override each other.`
- **适用**：Seedance 2.5
- **要点**：官方示例原句「图片 1 是主角张三，图片 1 使用音频 1 音色」（官方提示词指南「参考类（多素材映射）」）；映射要写在提示词文本里，不要只在图片上标注名字，否则「容易导致多人混淆或重复角色」。

### REF-07 · 多人多图 · 一一对应
- **中文片段**：`图 1-2 是人物 1（{角色甲}），对应音频 1；图 3-4 是人物 2（{角色乙}），对应音频 2；两组人物互不覆盖，画面中人数始终为 2。`
- **英文片段**：`Images 1-2 are Character 1 ({Role A}) and correspond to Audio 1; Images 3-4 are Character 2 ({Role B}) and correspond to Audio 2; the two groups do not override each other, and the number of people on screen is always 2.`
- **适用**：Seedance 2.5
- **要点**：官方示例原句「img1-2 是人物 1，对应音频 1；img3-4 是人物 2，对应音频 2」；官方 FAQ 补充：按人物**首次出场顺序**上传素材并同步图片与音频编号，可避免角色错位。

### REF-08 · 部分参考 · 写明参考哪一部分
- **中文片段**：`图 1 只参考其{手部特写的构图}；图 2 只参考其{色温与阴影}；除这两项外，不继承图 1、图 2 的任何内容。`
- **英文片段**：`From Image 1, reference only the framing of the {hand close-up}; from Image 2, reference only the {color temperature and shadows}; inherit nothing else from either image.`
- **适用**：Seedance 2.5
- **要点**：官方 Skill 原文「分工要具体到「参考什么」，如果是部分参考，要写明「参考哪一部分」」（`library/intel/seedance-2-5-official.md` 第三节）。

### REF-09 · 参考视频 · 严格对齐动作与运镜
- **中文片段**：`严格参考 @Video1 的动作与运镜，顺序与视频保持一致。`
- **英文片段**：`Strictly follow the actions and camera movement of @Video1, keeping the order identical to the source video.`
- **适用**：Seedance 2.5
- **要点**：官方原话「严格参考视频 1 的动作与运镜，顺序与视频保持一致」（官方提示词指南「参考类（多素材映射）」）；官方同时说明此时**不必**再写「先抬手、再转身、镜头缓慢环绕……」等细节。

### REF-10 · 参考视频 · 分段取用（动作与运镜分家）
- **中文片段**：`参考 @Video1 中{施法}的动作，参考 @Video2 的{环绕式}运镜。`
- **英文片段**：`Reference the {casting} motion in @Video1, and reference the {orbiting} camera movement in @Video2.`
- **适用**：Seedance 2.5
- **要点**：官方示例原句「参考视频 1 中施法的动作，视频 2 的环绕式运镜」；一个视频也可只取其中一项（如只取光影变化），但必须写明取哪一项。

### REF-11 · 参考音频 · 音色绑定
- **中文片段**：`@Audio1 作为{张三}的音色参考，人物说话时沿用该音频的音色、语速与口音；音频 1 不作为背景音乐。`
- **英文片段**：`@Audio1 is the voice-timbre reference for {Zhang San}; the character's speech follows its timbre, speaking rate, and accent. Audio 1 is not used as background music.`
- **适用**：Seedance 2.5
- **要点**：官方示例「图片 1 使用音频 1 音色」；H3 侧的对应官方写法是 `<Audio 1> is the voice-timbre reference for <Subject 1> (S1).`（`library/intel/model-syntax.md` 1.9 节）。

### REF-12 · 参考音频 · BGM 参考
- **中文片段**：`@Audio2 作为背景音乐风格参考，只参考其乐器编配、速度与节奏，不复制原曲；该音乐层人物听不到。`
- **英文片段**：`@Audio2 is a background-music style reference: follow only its instrumentation, tempo, and rhythm without copying the melody; this music layer is inaudible to the characters.`
- **适用**：Seedance 2.5
- **要点**：配乐属于人物听不到的层，别混进对白层；Seedance 2.5 用第 6 段「音频」统一写环境音、音效、音乐与对白，H3 则必须拆到 `overall_soundscape` 与 `non_diegetic_music` 两个字段。

### REF-13 · 首帧 · 两种做法
- **中文片段**：`将 @Image1 用作首帧（Use @Image1 as the first frame.）；首尾帧之外的其他图片只补充人物、服装、道具与材质，不得覆盖首帧构图。`
- **英文片段**：`Use @Image1 as the first frame. The remaining images may only supply characters, clothing, props, and materials, and must not override the first-frame composition.`
- **适用**：Seedance 2.5
- **要点**：官方固定原句「Use @ImageN as the first frame.」（`library/intel/seedance-2-5-official.md` 第八节）；官方优先用**参数**把图片 role 设为 `first_frame`（此法**锁定输出宽高比**，严格对齐首帧图），也可设 `reference_image` 再在 prompt 里指定（**不锁定**宽高比，效果相近但不完全匹配）。

### REF-14 · 尾帧 · 两种做法
- **中文片段**：`将 @Image2 用作尾帧（Use @Image2 as the last frame.）；画面最终落幅锁定为{尾帧描述}。`
- **英文片段**：`Use @Image2 as the last frame. The final frame lands exactly on {description of the last frame}.`
- **适用**：Seedance 2.5
- **要点**：同样优先用参数 role=`last_frame`（锁定宽高比）；尾帧之外的其他图片不得覆盖尾帧构图。

### REF-15 · 首尾帧同时用 · 中间连续过渡
- **中文片段**：`把 @Image1 作为首帧（Use @Image1 as the first frame.），把 @Image2 作为尾帧（Use @Image2 as the last frame.）；{动作}的过程必须连续过渡，从首帧状态自然演变到尾帧状态，中间不硬切、不跳变、不闪切。`
- **英文片段**：`Use @Image1 as the first frame and @Image2 as the last frame. The {action} must develop as one continuous transition from the first-frame state into the last-frame state, with no hard cut, jump, or flash cut in between.`
- **适用**：Seedance 2.5
- **要点**：官方示例「图片 3 为首帧，图片 5 为尾帧」；首尾帧任务属**有锁定**类，宽高比与时长不可自定义；关键是把中间过程写成「渐进变化」，不要把两张图并置。

### REF-16 · 关键帧参考
- **中文片段**：`以图片 1 至图片 7 的顺序作为关键帧，{剧情描述}。`
- **英文片段**：`Use images 1 through 7 in order as keyframes; {plot description}.`
- **适用**：Seedance 2.5
- **要点**：官方原话「prompt 需要在第一句写明「以图片 x 至图片 x 的顺序作为关键帧」」（官方提示词指南「关键帧参考」）；关键帧参考=把分镜拆成**独立参考图按顺序上传**，需要严格对齐分镜时用它而不是宫格图。

### REF-17 · 多宫格分镜 / 故事板参考
- **中文片段**：`参考故事板分镜图（共 {N} 格，15 格以下）的顺序构建完整故事剧情，运镜合理连贯。`
- **英文片段**：`Following the order of the storyboard sheet ({N} panels, fewer than 15), build a complete story with coherent, connected camera movement.`
- **适用**：Seedance 2.5
- **要点**：官方「多宫格目前更适用于 15 个以下分镜，单次输入过多（比如 18 宫格）容易出现静止、顺序错乱等问题」；避免过度锐化、杂乱的 AI 直出分镜图，也不要在分镜图上写过多文字；概念分镜可直接简写为官方示例「按照分镜图的顺序，构建一个完整的故事剧情，运镜合理连贯」。

### REF-18 · 线稿 / 火柴人分镜三步法
- **中文片段**：`图 1 是线稿分镜参考，全片分镜顺序以图 1 为准；{整体故事梗概}；按分镜顺序完整描述每一格的情节内容，至少补齐分镜图中没有的信息：{逐格情节 + 时间戳}。`
- **英文片段**：`Image 1 is the line-art storyboard reference, and the panel order of the whole video follows it; {overall story synopsis}; then describe the content of every panel in order and at minimum add the information the storyboard does not contain: {panel-by-panel plot with timestamps}.`
- **适用**：Seedance 2.5
- **要点**：官方三步法原文——step1 写明参考素材的指代关系；step2 写整体故事梗概；step3 按分镜完整描述情节内容，至少补齐分镜图中没有的信息，可以组合时间戳明确剧情逻辑。

### REF-19 · 白模 · 粗粒度（只继承运动与调度）
- **中文片段**：`参考 @Video1 的运动路径、人物调度、机位、镜头运动、剪辑、灯光变化、声音节奏与空间关系；白模中的人物渲染为{人物外观描述}，物体渲染为{物体外观描述}。`
- **英文片段**：`Reference @Video1 for the motion paths, staging, camera position, camera movement, editing, lighting changes, sound rhythm, and spatial relationships; render the grey-model figure as {appearance}, and the grey-model objects as {appearance}.`
- **适用**：Seedance 2.5
- **要点**：官方粗粒度白模定义即上述八项继承项（`library/intel/seedance-2-5-official.md` 第九节）；官方另提示白模主体建议仅保留躯体，避免【四肢/翅膀】等精细运动元素，已包含时需补全其动作序列，否则渲染出四肢僵化。

### REF-20 · 白模 · 细粒度（保结构换外观）
- **中文片段**：`保留 @Video1 中的主体结构、动作、空间布局、机位、镜头运动与剪辑，只替换外观、材质、颜色、场景与风格。`
- **英文片段**：`Keep the subject structure, action, spatial layout, camera position, camera movement, and editing of @Video1, and replace only the appearance, material, color, scene, and style.`
- **适用**：Seedance 2.5
- **要点**：官方细粒度白模定义（同上）；官方提醒细粒度白模视频须完整清晰，且**不含【轨迹线】【坐标线】【相机 cone】**等干扰信息，否则会泄露到成片里。

### REF-21 · 白模 + 参考图的对应关系
- **中文片段**：`将 @Image1 中穿灰色衣服的男人对应 @Video1 中的红色模型；@Video2 中的红发少女替换 @Video1 中的绿色模型 2。`
- **英文片段**：`Map the man in the grey shirt in @Image1 to the red model in @Video1, and replace the green model 2 in @Video1 with the red-haired girl from @Video2.`
- **适用**：Seedance 2.5
- **要点**：官方示例原句「将 [图片 1] 中穿灰色衣服的男人对应 [视频 1] 中的红色模型、[视频 2] 中的红发少女替换 [视频 1] 中的绿色模型 2」；没有叠加参考图的白模主体，要在提示词里详细描述其外表特征。

### REF-22 · 视频指令编辑（台词 / 动作 / 人物替换）
- **中文片段**：`编辑任务：仅编辑 @Video1 中{男人}的台词，修改为「{你不要过来啊}」，口音调整为{东北口音}；把 @Video1 中 4-6 秒{喝咖啡}的动作改变为{拖地}，从{端起杯子}过渡到{放下拖把}；把 @Video1 中{右侧}的{亚洲女生}改为 @Image1 中的{黑人女生}。除上述三项外，其余可见角色、道具与背景保持不变，原人物不再出现。`
- **英文片段**：`Editing task: edit only the man's line in @Video1 to "{Don't come over}", with a {northeastern} accent; change the action in 4-6 seconds of @Video1 from {drinking coffee} to {mopping the floor}, moving from {raising the cup} to {setting down the mop}; replace the {Asian woman} on the right of @Video1 with the {Black woman} from @Image1. Apart from these three changes, all visible characters, props, and background stay the same, and the replaced character no longer appears.`
- **适用**：Seedance 2.5
- **要点**：官方原句「明确需要修改的范围和内容，可以配合时间戳进行部分编辑，尽可能说明修改内容从 A->B 的过程」；官方 Skill 补充：编辑母版必须是唯一的 `@VideoN`，动态主体替换要继承原主体的出现时机、运动路径、速度与遮挡关系。

### REF-23 · 视频延长（向前 / 向后）
- **中文片段**：`向原视频之后延长：新片段的首帧承接原视频的末帧，{主体}延续{动作与状态}，画面无缝衔接；向原视频之前延长：先描述原视频开始之前发生的事件，新片段的末帧承接原视频的首帧。{主体}全程保持为同一连续实例，道具部件数量与拓扑关系稳定。`
- **英文片段**：`Extending after the source video: the first frame of the new segment continues from the last frame of the source, with {subject} carrying on {action and state} and the picture joining seamlessly. Extending before the source video: first describe what happened before the source video began, and let the last frame of the new segment continue from the first frame of the source. {Subject} stays the same continuous instance throughout, and the prop part count and topology remain stable.`
- **适用**：Seedance 2.5
- **要点**：官方原文「向前延长：新片段首帧承接原视频末帧。向后延长：新片段末帧承接原视频首帧，并先描述原视频开始前的事件」（`library/intel/seedance-2-5-official.md` 第九节；注意官方「向前/向后」指时间轴方向，与「接在原片后面」不是同一说法）；延长任务属**有锁定**类；官方提示用 Seedance 2.5 自身生成的视频做延长，音量变化更小、无缝衔接更好。

### REF-24 · H3 I2VA · 官方固定对齐句
- **中文片段**：`首帧图必须在第一行显式对齐到 0.00 秒：`For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.`
- **英文片段**：`For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.`
- **适用**：H3
- **要点**：这是官方固定句，只能照抄（`library/intel/model-syntax.md` 1.3 节）；它必须**单独成行并与三字段之间空一行**；正文结构按官方推荐 first-frame anchor → action onset → continuous development → result or reaction。

### REF-25 · H3 FL2VA · 官方固定对齐句
- **中文片段**：`首尾两张图必须在第一行显式对齐到 0.00 秒与 S.SS 秒：`How the reference pictures align with the target video — Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot N) aligns with the S.SS-second mark of the target video.`
- **英文片段**：`How the reference pictures align with the target video — Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot N) aligns with the S.SS-second mark of the target video.
the young woman shown in <Picture 1> remains beside the rain-covered train window, preserving her appearance, clothing, seat position, and the carriage layout.`
- **适用**：H3
- **要点**：`N` 是实际最后一镜的镜号、`S.SS` 是有效时长且固定两位小数（例 `8.00`），占位符必须替换成实数（`library/intel/model-syntax.md` 1.3 节）；官方示例锚点句为「the young woman shown in <Picture 1> remains beside the rain-covered train window, preserving her appearance, clothing, seat position, and the carriage layout.」。

### REF-26 · H3 L2VA · 官方固定对齐句
- **中文片段**：`尾帧图必须在第一行显式对齐到 S.SS 秒：`How the reference pictures align with the target video — <Picture 1> (from [Shot N]) aligns with the S.SS-second mark of the target video.`
- **英文片段**：`How the reference pictures align with the target video — <Picture 1> (from [Shot N]) aligns with the S.SS-second mark of the target video.`
- **适用**：H3
- **要点**：官方原文说明 `<Picture 1>` 是视频的最终帧、属于最后一个 `[Shot N]`，「it does not inherently belong to Shot 1」；正文结构按 plausible preceding state → explicit action and transition path → gradual convergence → last-frame landing。

### REF-27 · H3 Ref2VA · 六段结构与四类标签的素材层用法
- **中文片段**：`subject_definitions：<Subject 1> is the young woman in <Picture 1>, with long dark hair, a blue cardigan, and a thin silver necklace. / <Picture 2> is the first frame of [Shot 1], showing a woman seated beside a café window. / <Video 1> is the source clip whose camera movement and cut rhythm are followed. / <Audio 1> is the voice-timbre reference for <Subject 1> (S1).`
- **英文片段**：`subject_definitions: <Subject 1> is the young woman in <Picture 1>, with long dark hair, a blue cardigan, and a thin silver necklace. / <Picture 2> is the first frame of [Shot 1], showing a woman seated beside a café window. / <Video 1> is the source clip whose camera movement and cut rhythm are followed. / <Audio 1> is the voice-timbre reference for <Subject 1> (S1).
summary: [reference generation + audio reference] The target video is generated from the referenced assets with the character identity, scene, camera language, and voice timbre carried over.
retention_analysis: <Subject 1> (appears in [Shot 1], [Shot 3]): fully_preserved - ... / <Audio 1>: reference - ...`
- **适用**：H3
- **要点**：官方六段固定顺序为 `subject_definitions` → `summary` → `retention_analysis` → `detailed_description` → `overall_soundscape` → `non_diegetic_music`；`<Subject N>` 只在素材层定义可复用的可见内容，`<Picture N>` 只在该图充当首帧/关键帧/尾帧/构图锚点时单列（仅定义角色的图要写进 `<Subject N>` 里，不另起条目）；`summary` 段不得引入新标签；`<Video N>` 与 `<Audio N>` 各自独立编号。

### REF-28 · 参考标签对照 · H3 与 Seedance
- **中文片段**：`H3：<Picture 1> 是参考图，<Video 1> 是参考视频，<Audio 1> 是参考音频，<Subject 1> 是参考主体；Seedance 2.5：@Image1 是参考图，@Video1 是参考视频，@Audio1 是参考音频。同一批素材在两个模型里要各自改写一遍标签，不可混用。`
- **英文片段**：`H3: <Picture 1> is the reference image, <Video 1> the reference video, <Audio 1> the reference audio, and <Subject 1> a referenced subject. Seedance 2.5: @Image1 is the reference image, @Video1 the reference video, and @Audio1 the reference audio. Rewrite the labels separately for each model; the two syntaxes are not interchangeable.`
- **适用**：两者
- **要点**：官方 SKILL.md「Output Rules」要求「Keep reference labels consistent (e.g. `<Picture 1>`, `<Video 1>`, `<Audio 1>`) across every section」；`@ImageN/@VideoN/@AudioN` 属于 Seedance 2.5，**不是 H3 语法**，写进 H3 提示词即错。

## 排错提示

- 参考图越多越要先写映射：素材一多，「每个素材只承担一个明确职责」「各参考互不覆盖」两句必须出现在最前面；人物参考图按**首次出场顺序**上传，可显著减少角色错位。
- 只想「指代」就别复述画面：参考素材本身已精准时，重复描述人物外观会挤占动作与运镜的权重，反而让模型画得不像参考图。
- 首尾帧别做硬切：两张图当首尾帧时，中间必须写成渐进演变过程；只写「从 A 到 B」而不写过程，模型会在中间插一个跳变。
- 宫格图不等于严格对齐：宫格分镜图「并不会严格对齐分镜内容」，需要严格照分镜生成就改用**多关键帧参考**；宫格控制在 15 格以内，18 格以上易出现静止与顺序错乱。
- 白模要剔除干扰信息：轨迹线、坐标线、相机视锥、文字标记必须排除，否则会「泄露到生成后的视频中」；白模已有四肢时必须补全动作序列，否则渲染出四肢僵化。
- 编辑任务先划边界：编辑母版必须是唯一的 `@VideoN`；除明确修改对象外，其余可见角色、道具与背景一律保持不变；改写要写清 A→B 过程并配时间戳，否则模型会连带改动其它部分。
- 延长要写承接关系：向后延长先描述原视频开始前的事件、让新片段末帧承接原片首帧；主体必须是同一连续实例，道具部件数量与拓扑关系要稳定。
- H3 与 Seedance 的标签不能互抄：H3 用 `<Picture N>` / `<Subject N>` / `<Video N>` / `<Audio N>` 且改写段一律英文，Seedance 2.5 用 `@ImageN` / `@VideoN` / `@AudioN`；H3 的固定对齐句与 `S.SS` 占位符必须原样替换成实数后再提交。
