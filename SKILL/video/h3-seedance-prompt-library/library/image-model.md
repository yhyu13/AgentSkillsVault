---
id: image-model
title: 图像模型提示词（关键帧与参考图）
dimension: 图像模型提示词
applies_to: [Image, H3, Seedance2.5]
model_field: 关键帧生成 / 参考素材制作（H3 侧以 <Picture N> 标签与官方对齐指令句引用）
---

# 图像模型提示词（关键帧与参考图）

> **装配位置**：H3 → 参考素材制作，进入提示词时以 `<Picture N>` 标签 + 官方对齐指令句引用 ｜ Seedance 2.5 → `@Image1` 素材准备
> **一句话用法**：图像模型这一层不负责"讲故事"，只负责给视频模型喂**信息少而准**的锚点图——锁几何、锁身份、锁空间关系；H3 侧再用 `<Picture N>` 标签把这些图接进时间轴。
>
> **注意**：`@ImageN` 是 **Seedance 2.5** 的槽位语法，**不是 H3 语法**；H3 的参考标签是尖括号编号标签 `<Subject N>` / `<Picture N>` / `<Video N>` / `<Audio N>`（见 IMG-21）。

## 片段

### IMG-01 · 关键帧首帧（first frame / start frame）
- **中文片段**：`{画幅比例}电影感关键帧首帧：{人物}处于{场景}，{主体在画面中的位置与朝向}，{动作进行到一半的定格姿态}，{景别}，{光源方向与色温}，{色彩基调}，浅景深，背景干净无杂物。`
- **英文片段**：`{aspect ratio} cinematic first frame: {person} in {scene}, {position and orientation in frame}, frozen mid-{action}, {shot size}, {light direction and color temperature}, {color palette}, shallow depth of field, clean uncluttered background.`
- **适用**：Nano Banana ｜ GPT Image ｜ 即梦图片 ｜ 通用
- **要点**：首帧是视频的"起点契约"，动作要停在**可延续**的姿态（手还没抬起、脚还没落地），定格在动作中段最容易被插值成奇怪中间态。

### IMG-02 · 关键帧尾帧（last frame / end frame）
- **中文片段**：`{画幅比例}电影感关键帧尾帧：与首帧同一场景同一人物，{动作完成后的最终姿态与表情}，{主体在画面中的新位置}，{景别}，{光源方向与色温保持不变}，{与首帧一致的环境陈设}。`
- **英文片段**：`{aspect ratio} cinematic last frame: same scene and same person as the first frame, {final pose and expression after the action}, {new position in frame}, {shot size}, {same light direction and color temperature}, {environment furnishings identical to the first frame}.`
- **适用**：Nano Banana ｜ GPT Image ｜ 即梦图片 ｜ 通用
- **要点**：尾帧要和首帧**只差一件事**（人动了 / 光变了 / 门开了），差两件以上模型会自己脑补中间过程，首尾帧插值就会崩。

### IMG-03 · 角色设定图 · 正侧背三视图（character sheet）
- **中文片段**：`{人物}的角色设定图（character reference sheet）：同一张图内并排三个全身像——正面、四分之三侧面、背面，等高站立、双臂自然下垂、中性表情、同一套服装；纯色浅灰背景，均匀无影棚柔光，画面比例 16:9，各视图之间留白均匀、无任何文字或标注。`
- **英文片段**：`Character reference sheet of {person}: three full-body views in one image — front, three-quarter profile, and back — same height, arms relaxed at sides, neutral expression, identical outfit; plain light-grey background, even shadowless studio light, 16:9 frame, even spacing between views, absolutely no text or labels.`
- **适用**：Nano Banana ｜ GPT Image ｜ 即梦图片
- **要点**：三视图的**均匀光与纯色底**是关键，戏剧光会污染侧面轮廓；必须写"无文字"，模型爱在设定图上加角色名和箭头。

### IMG-04 · 场景概念图（concept art / environment）
- **中文片段**：`{场景}的环境概念图（environment concept art）：{建筑/室内结构}，{材质与年代感}，{主要陈设}，{时间与天气}，{光源}，广角平视、无人物无剪影，用于视频场景参考，画面比例 {画幅比例}，写实电影感。`
- **英文片段**：`Environment concept art of {scene}: {architecture / interior structure}, {materials and era}, {main furnishings}, {time of day and weather}, {light source}, wide-angle eye-level, no people and no silhouettes, for use as a video scene reference, {aspect ratio} frame, photoreal cinematic.`
- **适用**：Nano Banana ｜ GPT Image ｜ 即梦图片 ｜ 通用
- **要点**：概念图里**不要放人**，人会让模型把主体特征混进场景；陈设只写最关键的三五件，其余留空，给后续运镜留余地。

### IMG-05 · 道具/产品三视图（白底，几何一致）
- **中文片段**：`{产品}的产品三视图（product turnaround）：同一张图内正面、侧面、背面三个角度，等比例摆放，纯白无缝背景，均匀无影棚光，无投影干扰，无手持无场景；所有视图的轮廓比例、部件数量、{颜色与材质}完全一致，画面比例 16:9，不含任何文字。`
- **英文片段**：`Product turnaround of {product}: front, side and back views of the same object in one image, drawn to identical scale, on a seamless pure-white background, even shadowless studio light, no hands and no scene; silhouettes, part count, {color and material} are identical across all three views, 16:9 frame, no text whatsoever.`
- **适用**：Nano Banana ｜ GPT Image ｜ 即梦图片
- **要点**：白底是为了下游视频模型做几何对齐；一定要写"三视图比例完全一致、部件数量不变"，否则模型会自作主张加按键或改把手。

### IMG-06 · 产品单张细节图（几何锁定用）
- **中文片段**：`{产品}的正面单体图：{轮廓特征}，{材质与表面处理}，{颜色}，{logo 位置}，纯白背景，正平视角，无透视变形，画面比例 1:1，居中。`
- **英文片段**：`Front-on single shot of {product}: {silhouette}, {material and finish}, {color}, {logo placement}, pure white background, straight-on view with no perspective distortion, 1:1 frame, centered.`
- **适用**：Nano Banana ｜ GPT Image ｜ 即梦图片
- **要点**：Seedance 用 `@Image2` 锁产品几何时最吃**干净单一视角**的这张；三视图反而容易让模型把三个视图揉在一起。

### IMG-07 · 分镜故事板（storyboard grid，9 格）
- **中文片段**：`{故事概述}的分镜故事板（storyboard grid）：3×3 共 9 格，每格一个关键画面，按从左上到右下的顺序编号 1 到 9，格与格之间留白色间隔，每格下沿标注镜号与时长（如 "S03 2s"），线稿式简洁画风，灰阶加淡彩，不追求细节，人物保持同一形象，全图无照片质感。`
- **英文片段**：`Storyboard grid for {story summary}: 3×3, nine panels, one key frame per panel in reading order, numbered 1 to 9, white gutters between panels, each panel captioned below with shot number and duration (e.g. "S03 2s"), clean line-art with light color wash, not detail-focused, same character design in every panel, flat illustration, no photorealism.`
- **适用**：Nano Banana ｜ GPT Image ｜ 即梦图片
- **要点**：9 格是模型最容易稳定输出的排版（4/6 格常见缺格或串号）；若不想让模型写字，就在后期把编号压掉，只留画面。

### IMG-08 · 情绪参考图（emotional reference / mood board）
- **中文片段**：`{情绪关键词，如 压抑、释然、孤独、胜利}的情绪参考图：{人物特写或空镜}，{最能传达该情绪的身体语言}，{光线与色调}，{环境氛围元素}，浅景深，电影感构图，情绪先于信息，画面比例 {画幅比例}。`
- **英文片段**：`Emotional reference image conveying {emotion}: {close-up of a person or an empty shot}, {body language that carries the emotion most strongly}, {lighting and color tone}, {ambient elements}, shallow depth of field, cinematic composition, emotion before information, {aspect ratio}.`
- **适用**：Nano Banana ｜ GPT Image ｜ 即梦图片
- **要点**：情绪图只做"调色板 + 表演方向"用，不要让人物五官太具体，否则下游视频模型会照抄这张脸，破坏主角一致性。

### IMG-09 · 风格锚定图（style anchor）
- **中文片段**：`{风格名，如 90 年代港风胶片、赛博霓虹、清冷纪录片}的风格锚定图：一个无明确人物的{代表物件或局部特写}，用于确立整体影像质感——{胶片颗粒与色彩偏移}、{对比度与黑位}、{色调倾向}，画面比例 {画幅比例}，不加字不加标识。`
- **英文片段**：`Style anchor for {style name}: a {representative object or detail close-up} with no identifiable person, establishing the overall look — {film grain and color shift}, {contrast and black level}, {tonal bias}, {aspect ratio} frame, no text, no logos.`
- **适用**：Nano Banana ｜ GPT Image ｜ 即梦图片
- **要点**：风格锚定图是**唯一**允许"只谈质感不谈内容"的图；一张就够，多张不同风格会把视频模型的调色带偏。

### IMG-10 · 色彩参考（color reference / palette）
- **中文片段**：`{项目}的色彩参考板：{主色}、{辅助色}、{点缀色}、{阴影色}四到五色平铺色块，标注色值，纯色背景，画面比例 16:9，无渐变无文字，用作视频的全局配色基准。`
- **英文片段**：`Color reference board for {project}: {main color}, {supporting color}, {accent color} and {shadow color} laid out as flat swatches with hex values, plain background, 16:9 frame, no gradients, no text, serving as the global palette for the video.`
- **适用**：Nano Banana ｜ GPT Image ｜ 即梦图片
- **要点**：色彩参考与风格锚定图**二选一**即可，同时喂两张会让模型在"颗粒质感"和"平涂色块"之间摇摆。

### IMG-11 · 构图参考（composition reference）
- **中文片段**：`构图参考图：严格复刻{参考照片/电影帧}的取景与主体排布——{主体在画面中的位置与占比}，{地平线高度}，{前景遮挡物}，{景别与镜头焦段感}，仅构图一致，人物身份与场景内容可以不同，无文字。`
- **英文片段**：`Composition reference: strictly reproduce the framing and subject placement of {reference photo / film still} — {subject position and screen coverage}, {horizon height}, {foreground occluder}, {shot size and lens feel}; only the composition must match, identity and scene content may differ, no text.`
- **适用**：Nano Banana ｜ GPT Image ｜ 即梦图片
- **要点**：构图参考只锁"画面怎么摆"，不锁"画面是什么"；若连人物一起复刻，视频模型会连带复制身份，务必替换成主角。

### IMG-12 · 光位参考（lighting reference）
- **中文片段**：`{场景}的光位参考图：主光来自{方向}的{光源类型与色温}，{轮廓光/逆光}从{方向}勾出边缘，{环境补光强度}，{阴影落点与软硬}，{曝光基调}，中景无人物，纯粹展示光位关系，画面比例 {画幅比例}。`
- **英文片段**：`Lighting reference for {scene}: key light from {direction} as {source type and color temperature}, {rim / backlight} from {direction} tracing the edges, {ambient fill level}, {shadow direction and hardness}, {exposure mood}, mid-shot with no people, purely showing the light setup, {aspect ratio}.`
- **适用**：Nano Banana ｜ GPT Image ｜ 即梦图片
- **要点**：光位图必须**写死方向词**（左上 45 度 / 正背逆光 / 侧逆光），只写"唯美光线"模型会随机给；同一项目所有关键帧沿用同一张光位图。

### IMG-13 · 俯视平面布局图（floor plan，锁空间关系）
- **中文片段**：`{场景}的俯视平面布局图（top-down floor plan）：从正上方垂直俯视，标出{房间/区域}的相对位置与连通关系，{门/窗/家具的位置与朝向}，{人物动线用箭头表示}，平涂俯视建筑图风格，白底黑线，画面比例 16:9，仅作空间布局参考，不追求材质细节。`
- **英文片段**：`Top-down floor plan of {scene}: viewed straight from directly above, showing the relative positions and connections of {rooms / zones}, the placement and orientation of {doors, windows and furniture}, {the character's movement path marked with arrows}, flat architectural top-view style, black lines on white, 16:9 frame, for spatial layout reference only, no material detail.`
- **适用**：Nano Banana ｜ GPT Image ｜ 即梦图片
- **要点**：平面图是**空间关系的唯一权威来源**，用来防"人从窗户进来了"这类穿帮；拍摄完成后应把这张图喂给视频模型做方位约束。

### IMG-14 · 转场中间帧（interpolation keyframe）
- **中文片段**：`转场中间帧（interpolation keyframe）：画面处于{首帧场景}与{尾帧场景}之间的过渡状态，{衔接元素，如同一只手/同一束光/同一构图位置}在画面中保持连续，其余元素自然过渡，运动模糊轻微，主体身份、服装与产品几何与首帧完全一致。`
- **英文片段**：`Transition interpolation keyframe: the image sits mid-way between {first-frame scene} and {last-frame scene}, with {the connecting element, e.g. the same hand / the same shaft of light / the same position in frame} held continuous while everything else transitions naturally, slight motion blur, subject identity, outfit and product geometry identical to the first frame.`
- **适用**：Nano Banana ｜ GPT Image ｜ 即梦图片
- **要点**：有中间帧时，首尾帧插值才稳；中间帧里**必须有一处与首帧完全相同的锚点**，否则模型找不到插值起点。

### IMG-15 · 参考图选择策略与进入 H3 的写法
- **中文片段**：`本次生成参考图共 {N} 张，优先级为：第一优先{角色设定图}，锁定人物身份；第二优先{道具三视图}，锁定产品几何；第三优先{场景概念图}，锁定环境与色调；第四优先{风格锚定图}，只作质感参考，不参与构图。全程只引用这 {N} 张图，不再引入新参考。进入 H3 时把它们编成 `<Picture 1>`、`<Picture 2>`…… 并按 IMG-20 的官方对齐指令句接入时间轴；`@ImageN` 是 Seedance 2.5 的写法，不是 H3 的。`
- **英文片段**：`This generation uses {N} reference images, prioritized as: first {character sheet} to lock identity, second {product turnaround} to lock geometry, third {scene concept art} to lock environment and palette, fourth {style anchor} used for texture only and not for composition. Reference only these {N} images throughout and introduce no new references. When they enter an H3 prompt, number them as <Picture 1>, <Picture 2> … and attach them to the timeline with the official alignment sentences in IMG-20; @ImageN is Seedance 2.5 syntax, not H3 syntax.`
- **适用**：Nano Banana ｜ GPT Image ｜ 即梦图片 ｜ 通用 ｜ H3 ｜ Seedance 2.5
- **要点**：建议**最多 3~4 张**（Seedance 2.5 的 `@Image1`~`@Image4` 槽位有限）；官方文件**未说明** H3 的参考数量上限，H3 侧按 Ref2VA 四类标签各自独立编号管理即可，不要当成有硬上限。

### IMG-16 · 人物一致性锁定的写法（逐项点名）
- **中文片段**：`角色一致性锚点：{姓名或代号}，{年龄段}，{性别}，{发型与发色}，{脸型}，{眉眼特征}，{肤色}，{上衣款式与颜色}，{下装款式与颜色}，{鞋}，{固定配饰如眼镜/耳环/疤}，{体型与身高}。以上逐项不增不减、不改色、不变形，脸部比例与发型在任何角度下保持同一辨识度。`
- **英文片段**：`Character consistency anchor: {name or code}, {age range}, {gender}, {hairstyle and hair color}, {face shape}, {brow and eye features}, {skin tone}, {top style and color}, {bottom style and color}, {footwear}, {fixed accessories such as glasses / earrings / scar}, {height and build}. The above items are neither added nor removed, never recolored, never deformed, and the facial proportions and hairstyle stay identically recognizable from every angle.`
- **适用**：Nano Banana ｜ GPT Image ｜ 即梦图片 ｜ 通用
- **要点**：一致性靠"逐项点名"而不是靠"保持一致"这句空话；每个身份锚点都要能对应到生成图里的一个具体可见特征，否则等于没写。

### IMG-17 · 手部与道具的自然姿态
- **中文片段**：`{人物}的{左手/右手}自然{持握/搭放/垂放}{道具}，手指完整可见、关节朝向自然、握持点落在道具{重心/握柄}上；双肩放松、重心居中，身体与道具之间无穿插、无多余手指、无悬浮。`
- **英文片段**：`{person}'s {left / right} hand naturally {holds / rests on / hangs with} the {prop}, with all fingers visible, joints oriented naturally and the grip landing on the {center of gravity / handle}; shoulders relaxed, weight centered, no intersection between body and prop, no extra fingers, no floating.`
- **适用**：Nano Banana ｜ GPT Image ｜ 即梦图片
- **要点**：手部是图像模型最高频的翻车点；用"手指完整可见 + 握持点落在重心上"这种物理描述，比写"手部自然"有效得多。

### IMG-18 · 避免文字生成的写法
- **中文片段**：`画面中不出现任何文字、字母、数字、标语、水印、logo、招牌字样或 UI 界面；如需标识位置，只留一块干净的{空白招牌/无字铭牌/纯色标签}；若必须出现品牌文字，仅在{指定角落}保留一处，其余全部留白。`
- **英文片段**：`No text, letters, numbers, captions, watermarks, logos, signage lettering or UI elements appear anywhere in the image; where a label position is needed, leave only a clean {blank sign / unlettered nameplate / solid-color label}; if brand text is unavoidable, keep a single occurrence in the {designated corner} and leave everything else blank.`
- **适用**：Nano Banana ｜ GPT Image ｜ 即梦图片
- **要点**：图像模型生成的中文与英文几乎都是乱码，所以不要靠"negative prompt"硬压，直接在正向描述里指定"留白区域"更稳；后期加字永远比模型写字干净。

### IMG-19 · 画幅比例与裁切安全区
- **中文片段**：`画面比例 {16:9 / 9:16 / 1:1}，{横向构图/竖向构图}；重要主体位于画面中央 {安全区} 内，四周预留 {N}% 边距，所有关键元素（人物脸、产品标识、动作发生部位）完整落在安全区内，不被画框边缘切断。`
- **英文片段**：`Aspect ratio {16:9 / 9:16 / 1:1}, {horizontal / vertical} composition; key subjects sit within the central {safe area} with {N}% margin on all sides, and every important element (face, product mark, the point of action) stays fully inside the safe area without being cut by the frame edge.`
- **适用**：Nano Banana ｜ GPT Image ｜ 即梦图片 ｜ 通用
- **要点**：**必须显式写出画幅比例**，否则同一段提示词在 16:9 和 9:16 上出图构图完全不同，视频模型再按首帧延展时就会裁切错位；竖屏项目直接写 9:16。

### IMG-20 · H3 参考图的标签与三种对齐指令句
- **中文片段**：`进入 H3 时，参考图用尖括号标签 `<Picture 1>`、`<Picture 2>` 引用，并按模式选用官方固定对齐指令句（放在提示词第一行，其后空一行）：I2VA —— `For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.`；FL2VA —— `How the reference pictures align with the target video — Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot N) aligns with the S.SS-second mark of the target video.`；L2VA —— `How the reference pictures align with the target video — <Picture 1> (from [Shot N]) aligns with the S.SS-second mark of the target video.`（`S.SS` 为有效视频时长，固定两位小数；`N` 为实际最后一镜镜号）。`
- **英文片段**：`When reference images enter an H3 prompt they are cited with the angle-bracket labels <Picture 1>, <Picture 2>, and the official alignment sentence for the mode is placed as the first line of the prompt followed by one blank line. I2VA: For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced. FL2VA: How the reference pictures align with the target video — Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot N) aligns with the S.SS-second mark of the target video. L2VA: How the reference pictures align with the target video — <Picture 1> (from [Shot N]) aligns with the S.SS-second mark of the target video. Here N is the index of the actual final shot, and S.SS is the effective video duration formatted to exactly two decimal places.`
- **适用**：H3
- **要点**：出处为官方 `references_base-en.txt`「### 2.1 Part One Is the Instruction」，三句都是 "always uses" 的固定句，逐字照抄，不要自拟。**`@ImageN` 是 Seedance 2.5 的语法，不是 H3**。

### IMG-21 · H3 全参考模式 Ref2VA 的四类参考标签
- **中文片段**：`H3 全参考模式用四类标签：`<Subject N>`（可复用的可见内容：人物/动物/物体、场景/环境、服装/道具/界面/视觉特效、风格/动作/表情/姿态）、`<Picture N>`（作为具体帧锚点或分镜规划依据的参考图）、`<Video N>`（整片级剪辑/续接/时间结构来源）、`<Audio N>`（音频资产或被启用的同步音轨）。四类**各自独立编号**，编号不表达配对关系；标签一经指派，在 `subject_definitions`、`summary`、`retention_analysis`、`detailed_description` 与两个音频段中含义必须一致；`summary` 段不得引入新标签。`
- **英文片段**：`H3 full-reference mode uses four label types: <Subject N> for visible content that can be reused or modified in the target video (people, animals and objects; scenes and environments; clothing, props, interfaces and visual effects; styles, actions, expressions and poses), <Picture N> for a reference image used as a concrete frame anchor or shot-planning anchor, <Video N> for an editing source, continuation start or whole-video temporal structure, and <Audio N> for an audio signal that is copied or referenced. The four categories are numbered independently and the index encodes no pairing; once assigned, a label keeps the same meaning across subject_definitions, summary, retention_analysis, detailed_description and the two audio sections, and the summary section introduces no new labels.`
- **适用**：H3
- **要点**：出处为官方 `references_ref-en.txt`「## 2. Reference Labels and Definitions」。只用一张图来定义角色/场景/服装/风格时，**不要**单列 `<Picture N>`，而是把该图写进对应的 `<Subject N>` 定义里；普通参考视频不会因为带声音就自动产生 `<Audio N>`。

### IMG-22 · 画面可见文字的官方写法（对照 IMG-18）
- **中文片段**：`画面上真正可见的文字（横幅、招牌、标签、字幕、霓虹字）用英文双引号包裹，原文与标点逐字保留、不翻译：`A red neon sign reading "营业中" glows above the doorway.`
- **英文片段**：`Any banner, sign, label, subtitle or neon text that is actually visible on screen is placed in English double quotation marks, with the original text and punctuation preserved verbatim and without translation: A red neon sign reading "营业中" glows above the doorway.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：出处为官方 `references_base-en.txt`「### 4.5 On-Screen Text」。这与 IMG-18「尽量别让模型写字」并不矛盾：IMG-18 是**出图阶段**的做法（图像模型写字必乱码），IMG-22 是**视频提示词阶段**的写法（画面里已经有字时怎么描述它）。

## 排错提示

- **画面比例和最终视频对不上**：出图时没写 `16:9` / `9:16`，图像模型按默认方图出，视频模型按首帧延展时直接裁掉人物头顶或产品下半截。所有关键帧必须显式写画幅比例与安全区。
- **人物每张图长得不一样**：只写了"同一个角色"，没有逐项点名年龄段、发型、脸型、服装、配饰。改用 IMG-16 的锚点句，并让每张关键帧复用同一串特征词、同一顺序。
- **产品几何在视频里变形**：产品参考图带了环境、阴影或手持，画面信息太杂。改用 IMG-05 的白底三视图 + IMG-06 的单张正面图，并在视频提示词里复述几何特征。
- **参考图喂太多反而更乱**：超过 4 张参考图时模型会互相污染（风格图影响几何、概念图抢走身份）。压缩到 3~4 张，并按 IMG-15 声明优先级，其余需求合并进同一张故事板。
- **H3 里用了 `@Image1`**：这是 Seedance 2.5 的槽位语法。H3 用 `<Picture N>` 标签，并配 IMG-20 的官方固定对齐指令句。
- **H3 自拟了对齐句**：I2VA / FL2VA / L2VA 的对齐指令是官方固定句，逐字照抄；`S.SS` 保留两位小数，`(from [Shot 1])` 的方括号不能漏。
- **H3 参考标签含义前后不一致**：同一个 `<Subject 1>` 在 `subject_definitions` 与 `detailed_description` 里指代不同的东西，模型会混。标签一经指派必须保持同一含义，且 `summary` 不得新增标签。
- **概念图里混进了人物**：场景参考图出现人脸或剪影后，模型会把那个人当成主角。下游视频模型的主体一定要来自角色设定图，概念图只负责空间与色调。
- **设定图上出现乱码文字**：模型爱在角色表、平面图上自动加标签。必须写"不含任何文字"，并且关键信息（镜号、时长、动线）由后期在图像工具里叠加，不交给模型。
- **首尾帧插值出鬼影**：首尾两帧差异超过两件事，或中间没有共同锚点。补一张 IMG-14 中间帧，并把首尾帧的差异压到"只动一样东西"。
