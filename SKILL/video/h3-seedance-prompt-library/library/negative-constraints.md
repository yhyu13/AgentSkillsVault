---
id: negative-constraints
title: 负面约束与稳定性锚点
dimension: 负面约束与稳定性锚点
applies_to: [H3, Seedance2.5]
model_field: 约束段 / 稳定性锚点（末尾）
---

# 负面约束与稳定性锚点

> **装配位置**：H3 → integrated_multimodal_description 末尾 ｜ Seedance 2.5 → 第 7 段「约束」
> **一句话用法**：把所有「不要出现什么」改写成可判定的正向陈述（"保持 X 不变，不出现 Y"），统一挂在提示词的最后一段——Seedance 2.5 直接放进第 7 段「约束」，H3 没有独立 negative 字段，只能以正向句式写在 integrated_multimodal_description 的末尾。

## 片段

### NEG-01 · 不出现多余人物（no extra people）
- **中文片段**：`画面中只有{人物A}与{人物B}两个人物，不出现任何路人、背景群众、旁人、镜像中的人或突然进入画面的其他人物，人数始终为 2。`
- **英文片段**：`Only {person A} and {person B} appear in frame; no passers-by, background crowd, bystanders, reflections of extra people, or anyone entering the shot; the headcount stays at two throughout.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：这是最高频的失败项。写"人数固定为 N"比写"不要多余人物"更有效；玻璃、镜子、电视屏幕里的"第二个人"也要一并点名禁止。

### NEG-02 · 不生成字幕、水印、文字条与额外标识
- **中文片段**：`画面中不出现任何字幕、标题条、片头片尾文字、弹幕、水印、台标、界面按钮、边框特效与额外 logo，不叠加任何后期图形元素。`
- **英文片段**：`No subtitles, title bars, opening or closing text, scrolling comments, watermarks, channel logos, UI buttons, frame borders, or additional logos appear anywhere in frame; no post-produced graphic overlays are added.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：模型默认会"自发加字幕"或加半透明水印条来像电影质感；负面约束在 Seedance 2.5 必须放最后一段（"约束"），H3 则写在 integrated_multimodal_description 末尾。

### NEG-03 · 保持脸部一致（face consistency）
- **中文片段**：`{人物}的脸部在全片保持同一身份：{年龄段}、{脸型}、{眉眼}、{发型与发色}、{妆容}均不改变，不换脸、不串脸、不在切镜后变成另一张脸。`
- **英文片段**：`{person}'s face remains the same identity throughout: {age}, {face shape}, {brows and eyes}, {hairstyle and hair color} and {makeup} never change; the face does not swap, cross-contaminate, or become a different person after a cut.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：H3 没有独立的 negative 字段，这类约束只能写成正向陈述放在末尾；Seedance 2.5 建议配合 `@Image1` 锁身份，光写"不换脸"效果有限。

### NEG-04 · 保持服装与配饰一致（costume consistency）
- **中文片段**：`{人物}全程穿着{外套}搭配{下装}与{鞋}，{帽子/眼镜/包/首饰}等配饰不出现增减、换色、换款或变形，服装的材质、纹理与褶皱保持一致。`
- **英文片段**：`{person} keeps wearing {outerwear} with {bottoms} and {shoes}; {accessories such as hat, glasses, bag or jewelry} never appear, vanish, change color, change style, or deform, and the fabric, texture and folds stay consistent.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：配饰"忽有忽无"通常发生在切镜与转身后；写"不增减不换色"比写"服装一致"更可控。

### NEG-05 · 保持产品几何与 logo
- **中文片段**：`{产品}的外形几何、部件数量、材质与表面处理、{logo/文字位置}在全程保持不变，运动与旋转中不变形、不变色、不增减部件、不出现多余 logo。`
- **英文片段**：`{product}'s silhouette, part count, material, finish and {logo/text placement} stay fixed throughout; it does not warp, recolor, gain or lose parts, or sprout extra logos while moving and rotating.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：产品广告里 logo 一旦漂移到别的位置最致命；Seedance 2.5 用 `@Image2/@Image3` 保持几何时仍要在约束段点名 logo 位置。

### NEG-06 · 保持建筑结构与地平线水平
- **中文片段**：`{建筑/场景}的{结构特征：柱列、门窗数量与位置、屋顶轮廓、墙面材质}保持不变，地平线始终水平，垂直线保持竖直，画面不出现建筑结构的增删或错位。`
- **英文片段**：`{architecture}'s {structural features: colonnade, number and placement of doors and windows, roofline, wall material} remain unchanged; the horizon stays level, verticals stay vertical, and no architectural element appears, vanishes, or shifts out of place.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：倾斜镜头或大动作时最容易"歪"地平线；地平线水平要作为独立约束项单独写一句。

### NEG-07 · 手部解剖正确（五指）
- **中文片段**：`{人物}的双手结构解剖正确：每只手恰好五根手指、关节数量与比例正常、指节清晰、手掌完整，手指不融合、不粘连、不增生也不缺损。`
- **英文片段**：`{person}'s hands are anatomically correct: exactly five fingers per hand, with normal joint count and proportions, clear knuckles, and complete palms; fingers never fuse, stick together, multiply, or go missing.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：手部特写是畸形率最高的画面；手离镜头越近越容易崩，宁可让手保持在中等景别或被遮挡。

### NEG-08 · 不出现多余肢体
- **中文片段**：`画面中{人物}始终只有两条手臂、两条腿与一个头部，不长出额外的手臂、腿、翅膀或触肢，不出现断肢、多余关节或从背景延伸出的多余肢体。`
- **英文片段**：`{person} always has exactly two arms, two legs and one head; no extra arms, legs, wings, or tentacles grow, and no severed limbs, extra joints, or limbs protruding from the background appear.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：多人同框时更容易长出第三个人的手臂；写"恰好两条手臂两条腿"比写"不要多余肢体"更好判定。

### NEG-09 · 面部与身体不扭曲（no deformation）
- **中文片段**：`{人物}的{面部}与{身体}比例保持自然：五官不挤压拉伸，头身比不变，颈部与肩线连贯，躯干与四肢不发生橡皮化形变，动作过程中肢体不变形。`
- **英文片段**：`{person}'s {face} and {body} keep natural proportions: features are neither squeezed nor stretched, head-to-body ratio is fixed, the neck connects smoothly to the shoulders, and the torso and limbs never warp or rubberize during the action.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：形变多与"动作预算"有关：一个镜头里塞进太多动作，身体就会被拉伸；减少动作数量比加约束更有效。

### NEG-10 · 不闪烁、抖动、撕裂与跳帧
- **中文片段**：`画面在整个镜头内保持稳定：不闪烁、不抖动、不出现帧跳或重复帧，不出现撕裂的压缩块、色带、马赛克条纹，画面元素不出现忽有忽无的跳变。`
- **英文片段**：`The frame stays stable throughout: no flicker, no shake, no dropped or duplicated frames, no torn compression blocks, no color banding or mosaic streaks, and no elements popping in and out of existence.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：闪烁常常源自多个"保持"条款互相冲突（例如既要求高速运动又要求绝对静止）；先消除冲突，再加约束。

### NEG-11 · 镜头不自行运动（no camera drift）
- **中文片段**：`镜头严格按{唯一主运镜}运动，除此之外机位、高度、角度与焦段保持不变，不自行平移、旋转、晃动、漂移或变焦，运镜起止都在描述范围内。`
- **英文片段**：`The camera follows only the specified {single camera move}; the position, height, angle and focal length otherwise stay fixed, with no self-initiated pan, tilt, rotation, shake, drift, or zoom beyond the stated move.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：模型喜欢"补一个漂亮的运镜"，一镜只允许一个主运动；不写这一条时静态镜头几乎必然被推成推近。

### NEG-12 · 不自行切镜（no cuts）
- **中文片段**：`本片为一个不间断的连续镜头（single continuous shot），全程不切分镜头、不插入特写、不跳剪、不叠化转场，画面视点与主体位置始终连续。`
- **英文片段**：`The clip is one uninterrupted continuous shot; it never cuts, inserts a close-up, jump-cuts, cross-dissolves, or uses any transition, and the viewpoint and subject placement stay continuous.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：需要切镜时用 H3 的 `[Shot n] At MM:SS.mmm` 显式指定；不写"不切镜"就可能被模型自顾自切。**本片段只适用于单镜任务——多镜任务改用 PAC-05 的时间戳与切镜动机，绝不能写「不切镜」，否则与多镜结构直接冲突。**

### NEG-13 · 风格不漂移（style consistency）
- **中文片段**：`全片保持{风格名称}的画面语言：{色板}、{光线质感}、{颗粒/纹理}、{镜头语言}与{美术风格}始终统一，不在镜头中途切换为其他画风，也不混入写实渲染。`
- **英文片段**：`The clip maintains {style} throughout: {palette}, {light quality}, {grain and texture}, {lens language} and {art direction} stay unified; it never switches style mid-clip or slips into photorealism.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：风格词必须在前半段早早出现并给足描述，末尾再补一句"不漂移"做保险；只写风格名词容易被稀释。

### NEG-14 · 速度不突变（no speed jump）
- **中文片段**：`动作速度在全片保持均匀：{动作}从开始到结束速度一致，不突然加速、不突然减速或定格，动作与运镜的节奏连续无跳变。`
- **英文片段**：`The motion speed stays even from beginning to end: {action} proceeds at a constant rate, with no sudden acceleration, sudden slowdown, or freeze, and the rhythm of action and camera remains continuous.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：加速/减速要写进"动作与时间"段并给时长，别只写在约束段；只写约束不给时间预算，模型会自己安排突变。

### NEG-15 · 不穿模（no clipping / interpenetration）
- **中文片段**：`{人物}与{道具/墙面/家具}之间保持正确的前后遮挡关系：身体与物体表面不相互穿插、不穿透，手不插进桌面，物体不穿过彼此，接触处有自然受压与阴影。`
- **英文片段**：`{person} and {prop / wall / furniture} maintain correct depth ordering: surfaces never interpenetrate or pass through each other, hands do not sink into the table, and contact points show natural compression and shadow.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：穿模常发生在"手扶桌面""贴墙走过"这类接触动作上；把接触点写得具体（手在桌面上方几厘米划过）比加约束更有效。

### NEG-16 · 文字不乱码、不镜像（no garbled text）
- **中文片段**：`画面中的文字{具体字样}拼写准确、笔画完整、清晰可读，不出现乱码字符、不缺笔画、不镜像翻转、不做无意义的字形变形，在全程保持同一位置与朝向。`
- **英文片段**：`The text {exact wording} on screen is spelled correctly with complete strokes and stays legible; it never garbles, loses strokes, appears mirrored, or morphs into meaningless glyphs, and keeps the same position and orientation throughout.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：AI 视频里的文字几乎必然漂移，能修的是"少依赖文字叙事"；镜像错误常因左右写反或模型误读，需在镜头方向上写"镜头由右向左摇"。

### NEG-17 · 皮肤自然、不塑料感、不过度锐化
- **中文片段**：`人物皮肤呈现真实质感：保留毛孔、细纹与自然油光，皮肤不过度平滑、不呈塑料感或蜡像感；画面不过度锐化，无明显锐化光环、边缘白边或噪点放大。`
- **英文片段**：`Skin looks real: pores, fine lines and natural sheen are preserved, without plastic or waxy smoothing; the image is not over-sharpened, with no obvious halos, edge fringing, or amplified noise.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：塑料感皮肤多半来自"皮肤细节极致/8k 超清"这类词，删掉它们比加约束更有效；过度锐化常与"高对比、极致细节"同源。

### NEG-18 · 不出现重复或凭空出现的物体
- **中文片段**：`画面中不出现{道具/家具}的重复复制品，不多出任何物体，也不凭空出现漂浮的物件、悬空的道具或无来源的粒子，所有物体的位置与数量都与场景设定一致。`
- **英文片段**：`No duplicated {prop / furniture} appears, no extra objects materialize, and no items float unnaturally or hover without support; every object's presence, count and placement match the scene setup.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：漂浮物与重复物是"物理因果"缺失的表现，根因通常是动作描述没交代受力关系（谁推的杯子、放在哪的椅子）。

### NEG-19 · 人物不看镜头（no eye contact）
- **中文片段**：`{人物}始终看向{视线目标}，目光不转向镜头、不与观众对视，眼球不乱瞟；除非剧情明确要求，否则画面中的人物不出现直视镜头的镜头。`
- **英文片段**：`{person} always looks toward {eye-line target}; the gaze never turns to the lens or addresses the viewer, and the eyes do not wander; unless the story explicitly requires it, no character looks straight into the camera.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：写"不要看镜头"必须同时给出替代视线目标，否则模型容易眼神失焦；需要破第四面墙时在约束句里写明"唯一例外是 X 时刻直视镜头"。

### NEG-20 · 镜头与画面不变形（no lens distortion）
- **中文片段**：`画面保持自然的透视：{建筑与直线物体}不出现桶形畸变或鱼眼弯曲，{人物}的头部与四肢不被拉长，画面四角不拉伸变形，镜头焦段全程不变。`
- **英文片段**：`Perspective stays natural: {architecture and straight lines} show no barrel distortion or fisheye curvature, {person}'s head and limbs are not elongated, the frame corners are not stretched, and the focal length never changes.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：广角 + 贴近人物的组合最容易拉长脸部与鼻梁；要么改用中焦，要么在约束里点名"人物不变形"。

### NEG-21 · 稳定性锚点（逐项点名保持）
- **中文片段**：`全程保持以下细节完全一致：{人物}的{年龄段、发型、脸型、服装、配饰}、{产品}的{几何与 logo}、{场景}的{建筑结构与陈设布局}、地平线水平与{光线方向}。`
- **英文片段**：`Keep all of the following exactly consistent throughout: {person}'s {age, hairstyle, face shape, outfit and accessories}, {product}'s {geometry and logo}, {scene}'s {architecture and prop layout}, the level horizon, and the {light direction}.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：这是正向写法的"锚点段"，Seedance 2.5 放第 7 段「约束」；H3 没有 negative 字段，必须把它作为正向陈述放在 integrated_multimodal_description 末尾。

### NEG-22 · 锁定句式（逐镜复述模板）
- **中文片段**：`锁定：{人物}保持{年龄段、发型、脸型、服装与配饰}；{产品}保持{几何与 logo}；{场景}保持{建筑结构与陈设布局}，地平线保持水平，{光线方向}不变。`
- **英文片段**：`Lock: {person} keeps {age, hairstyle, face shape, outfit and accessories}; {product} keeps {geometry and logo}; {scene} keeps {architecture and prop layout}; the horizon stays level and the {light direction} is unchanged.`
- **适用**：H3 ｜ 两者
- **要点**：H3 的每个新镜次开头都应复述这条锁定句，作为切镜后的复位锚；Seedance 2.5 已有 `@Image1` 等参考锚定，一般只在第 7 段写一次即可。

## 排错提示

- 把负面约束当硬保证：提示词只是方向（direction），不是保证；负面提示词（negative prompt）与种子（seed）都不构成硬约束，能做的是"减少发生概率"，最终仍需人工检查与重生成。
- 找错位置：Seedance 2.5 的负面约束必须写在最后一段「约束」；H3 没有独立的 negative 字段，只能改写成"保持 X，不出现 Y"的正向陈述，放在 integrated_multimodal_description 的末尾，夹在段落中间基本无效。
- 用抽象词而非可判定项：写"不要乱"、"要自然"、"不要奇怪"等于没写，必须点名"恰好五根手指""地平线保持水平""logo 位置不变"这类能被画面检验的项。
- 一个镜头塞进多套互相打架的约束：既要求高速运动又要求绝对静止、既要求特写又要求全景，必然产生闪烁与跳帧；先做取舍再写约束。
- 用约束代替设计：与其写十条"不要变形"，不如减少一个动作、缩短一个镜头、让手部远离镜头；动作预算越低，几何越稳。
- 一律禁止而不给替代：写"不要看镜头""不要出现手"却不说"手放在口袋/看向窗外"，模型会用更糟的方式补位（眼神失焦、手凭空消失），每条禁止都要配一个可执行的替代状态。
- 混淆"不要字幕"与"不要画面文字"：前者禁止后期叠加的字幕条与水印，后者针对场景内真实存在的招牌与包装；混写会连招牌一起删掉，破坏场景信息。
- 误把"稳定"理解成"静止"：约束段要锁的是"外观与几何"，不是"取消所有运动"；镜头必须运动时，把运镜写在主体段、稳定性写在约束段，两者分工不同。
