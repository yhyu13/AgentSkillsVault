---
id: subject-consistency
title: 主体与一致性
dimension: 主体与一致性
applies_to: [H3, Seedance2.5]
model_field: H3 → integrated_multimodal_description（主体外观描述 + 分镜内的重复主体锚定）；Seedance 2.5 → 第1段「主体」与第7段「约束」
---

# 主体与一致性

> **装配位置**：H3 → integrated_multimodal_description ｜ Seedance 2.5 → 第1段「主体」+ 第7段「约束」
> **一句话用法**：用一段可复制的"主体锚点句"把人物/产品的身份特征写死（脸、服装、几何、地平线），再在每个新镜次的开头原样重复这段锚点，Seedance 2.5 则把锚点句放第1段、把"保持…"放第7段约束。

## 片段

### SUB-01 · 人物身份锚点（多镜通用）
- **中文片段**：`画面主角是{人物}，{年龄段}{性别}，{发型与发色}，{面部特征}，{服装描述}，{配饰}，全程保持其脸部特征、发型、身形比例与服装细节完全一致。`
- **英文片段**：`The main subject is {person}, a {age} {gender} with {hairstyle}, {facial features}, wearing {outfit} and {accessory}; keep the face, hairstyle, body proportions and costume details exactly consistent throughout.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：一致性要"具体点名"，写清脸型/眉眼/发色/服装款式与颜色，不要只写"保持人物一致"；Seedance 2.5 用 `@Image1` 锁定身份时，第1段仍需复述这串特征。

### SUB-02 · 服装与配饰锁定
- **中文片段**：`{人物}始终穿着{外套/衬衫}搭配{下装}，{鞋}，{帽子/眼镜/包}等配饰在全程不出现增减、换色或变形，服装褶皱与材质纹理保持一致。`
- **英文片段**：`{person} keeps wearing {outerwear} with {bottoms} and {shoes}, with {accessories}; no accessories appear, disappear, change color or deform, and fabric folds and texture stay consistent.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：多镜里最常见的漂移是外套敞开/消失、帽子忽有忽无；明确写"不增减、不换色"能显著抑制。

### SUB-03 · 多人物区分
- **中文片段**：`画面中有两位主体：{人物A}位于{画面左/前景}，{人物B}位于{画面右/后景}，两人在发型、服装与体型上必须明显可区分，不要互换位置或特征。`
- **英文片段**：`Two subjects appear: {person A} on the {left side / foreground} and {person B} on the {right side / background}; their hair, clothing and build must be clearly distinguishable and never swapped.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：Seedance 2.5 可用 `@Image1`/`@Image2` 分别锁定两人；H3 里靠"位置 + 特征差异"来区分，光说"两个人"必然串味。

### SUB-04 · 产品几何与材质锁定
- **中文片段**：`{产品}的外观几何保持不变：{轮廓特征}、{材质与表面处理}、{logo/文字位置}，在全程运动与旋转中不变形、不变色、不增减部件。`
- **英文片段**：`The geometry of {product} stays fixed: {silhouette}, {material and finish}, {logo/text placement}; it does not warp, recolor, or gain or lose parts while moving and rotating.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：Seedance 2.5 用 `@Image2/@Image3` 保持产品几何时仍需写这句；H3 尤其要在产品旋转段落重复，防止把手提包变成双肩包。

### SUB-05 · 首尾帧衔接
- **中文片段**：`视频从{首帧描述}开始，主体{人物}的外观与首帧完全一致，{环境}布局、{道具}位置与光线方向保持连续，最终落幅与{尾帧描述}一致。`
- **英文片段**：`The video starts on {first frame description}; {person} matches the first frame exactly, while {environment} layout, {prop} placement and lighting direction stay continuous, and the final frame matches {last frame description}.`
- **适用**：H3 ｜ 两者
- **要点**：FL2VA 首尾帧任务必写；H3 的 L2VA（单图=尾帧）则改写成"尾帧与{图片}完全一致，开场形态自然过渡"。

### SUB-06 · 单图首帧延展
- **中文片段**：`以{图片}作为首帧，{人物}的服装、发型、姿态与背景陈设完全继承该图，镜头缓慢推进过程中主体不发生任何外观改变。`
- **英文片段**：`Use {image} as the first frame; {person}'s outfit, hairstyle, pose and the background furnishings are inherited from that image, and the subject's appearance does not change during the slow push-in.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：I2VA 模式里"继承"写在主体段，"不变"写在约束段；Seedance 2.5 图生视频按"保持→主运动→镜头…"公式时，把这句放在最前面。

### SUB-07 · 外观随时间不变的连续动作
- **中文片段**：`{人物}在{场景}中持续{动作}，{动作}过程中发型不散乱、{随身物品}不脱手、{衣物}不破损，主体外观从头到尾保持同一状态。`
- **英文片段**：`{person} keeps {action} through {scene}; the hair does not get messy, {item} stays in hand, {garment} does not tear, and the subject's appearance remains in the same state from start to finish.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：连续动作里模型最容易"顺手"改细节，点名易碎/易散的几项即可，不必写十几条。

### SUB-08 · 表情与神态连贯
- **中文片段**：`{人物}的面部表情从{表情A}自然过渡到{表情B}，过渡过程中五官比例、妆容与{疤痕/痣/眼镜}等固定标记保持不变。`
- **英文片段**：`{person}'s expression moves naturally from {expression A} to {expression B}; facial proportions, makeup and fixed marks such as {scar / mole / glasses} remain unchanged in between.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：H3 的"说话人/对白"段落与主体段要互不冲突；脸部漂移常伴随嘴型与对白不同步，一并检查。

### SUB-09 · 群像一致性
- **中文片段**：`{场景}中共有{N}个人物，每人穿{不同色系/款式}的{服装}，身高比例依次为{相对身高描述}，每个人在全程保持各自的面部特征与服装颜色不变。`
- **英文片段**：`There are {N} people in {scene}, each wearing {distinct color / style} {outfit}, with relative heights {relative height description}; each person keeps their own facial features and clothing color throughout.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：人数超过 4 人时，H3 更容易丢人或串脸，建议按"第1位/第2位"逐个点名并配一个显著特征。

### SUB-10 · 动物与宠物一致性
- **中文片段**：`{动物}为{品种}，{毛色与斑纹}，{眼睛颜色}，{项圈/配饰}，全程保持其体型、毛色、斑纹位置与配饰一致，不出现品种变化。`
- **英文片段**：`The {animal} is a {breed} with {coat color and markings}, {eye color} and {collar/accessory}; its body shape, coat, marking placement and accessory stay consistent and the breed never changes.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：斑纹位置是最易漂移项（牛奶猫的斑块会乱跑），必须写明"斑纹位置不变"。

### SUB-11 · 虚拟角色与玩偶一致性
- **中文片段**：`{角色}为{风格}的{材质}角色{名称/型号}，{主色}与{点缀色}比例固定，{标志性特征}始终存在，{关节结构}保持可动但不变形。`
- **英文片段**：`{character} is a {style} {material} figure named {name/model}, with a fixed ratio of {main color} to {accent color}; {signature feature} always exists and the {joint structure} stays articulated without deforming.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：玩具/机器人类主体靠"固定色比 + 标志性特征"比靠外形描述稳定得多。

### SUB-12 · 主体替换与变体（同一模板）
- **中文片段**：`保持{镜头运动}、{环境}与{光线}完全不变，仅将画面主体由{主体A}替换为{主体B}，{主体B}的外观严格依照{参考图/文字描述}呈现。`
- **英文片段**：`Keep the {camera move}, {environment} and {lighting} completely unchanged, and only replace the main subject {subject A} with {subject B}, whose appearance strictly follows {reference image / description}.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：这是"保持什么不变"的最强表达，Seedance 2.5 放第7段约束、H3 放分镜段落开头，两者都靠"仅"字划定唯一变量。

### SUB-13 · 尺度与比例锁定
- **中文片段**：`{物体A}与{物体B}的相对大小保持{恒定/约2比1}，{人物}身高约相当于{参照物}，全程不因透视或运镜产生比例跳变。`
- **英文片段**：`The relative size of {object A} and {object B} stays {constant / about 2 to 1}, {person}'s height is roughly equal to {reference object}, and the proportions never jump due to perspective or camera movement.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：手部/头部比例突变多发生在推近时，写死参照物比写"比例正常"有效。

### SUB-14 · 文本与标识在画面中的稳定
- **中文片段**：`{招牌/屏幕/包装}上的文字{具体字样}始终清晰可读、拼写不变形、不闪烁、不出现乱码，在整个镜头中保持同一位置与朝向。`
- **英文片段**：`The text {exact wording} on {sign / screen / packaging} stays legible and correctly spelled, without flickering, garbling or morphing, and keeps the same position and orientation throughout the shot.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：AI 视频里文字几乎必然漂移，把"可读/拼写不变"写进主体段，可显著降低乱码率；仍需避免依赖画面文字叙事。

### SUB-15 · 镜头切换时的一致性锚定
- **中文片段**：`[Shot 2] 切到{新视点/新景别}，{人物}仍是{简短特征复述}，{服装}与{道具}延续上一镜状态，地平线保持水平，{光线方向}一致。`
- **英文片段**：`[Shot 2] Cut to {new angle / new framing}; {person} is still {brief feature recap}, {outfit} and {prop} continue from the previous shot, the horizon stays level, and the {light direction} remains the same.`
- **适用**：H3 ｜ 两者
- **要点**：H3 切镜只在出现新主体/新空间/新状态/新视点/新时间点时发生，且切点时间必须严格递增；新镜首句就要复述锚点特征。

### SUB-16 · 服装换装节点的一致性
- **中文片段**：`{人物}在{时间点/空间点}换上{新服装}，换装前保持{原服装}完全一致，换装过程在{遮挡方式}内完成，换装后{新服装}的款式与颜色不再改变。`
- **英文片段**：`{person} changes into {new outfit} at {time / place}; {original outfit} stays fully consistent before the change, the change happens within {occlusion}, and {new outfit}'s cut and color do not change afterwards.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：换装必须给出遮蔽手段（转身、走过前景、关门）并明确"换装后不再变"，否则会出现两套衣服同时存在。

### SUB-17 · 风格化/动画角色的一致性
- **中文片段**：`画面为{动画风格}，{角色}的形象严格按{画风参考}呈现：{头身比}、{线条粗细}、{色板}与{阴影方式}统一，全片不出现写实渲染与角色设定漂移。`
- **英文片段**：`The image is in {animation style}; {character} strictly follows {art reference} with {proportions}, {line weight}, {palette} and {shading style} consistent, and the video never slips into photorealism or drifts from the character sheet.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：风格化短片最怕半路转写实，务必点明"不出现写实渲染"；Seedance 2.5 可用 `@Image1` 锁身份、`@Video1` 继承整体风格。

### SUB-18 · 参考素材分工写法
- **中文片段**：`@Image1 用于锁定{人物}的身份与面部特征，@Image2 用于保持{产品}的形状与材质，@Image3 用于参考{场景布局}，@Video1 继承其中的运镜与节奏，四者互不覆盖。`
- **英文片段**：`Use @Image1 to lock {person}'s identity and facial features, @Image2 to preserve {product}'s shape and material, @Image3 as a reference for {scene layout}, and @Video1 for its camera movement and pacing; these references do not override each other.`
- **适用**：Seedance 2.5
- **要点**：Seedance 2.5 的参考分工要写清"各管什么"，并显式声明互不覆盖，否则模型会把产品图里的人物也搬进来。

## 排错提示

- 一致性写成"保持一致"等于没写：必须点名脸部特征、发型、服装款式与颜色、产品几何、地平线水平、光线方向这几类可判定项。
- 只在第1镜写主体锚点、后续镜不复述：切镜后主体极易换脸换装，H3 尤其要求每个 Shot 开头复述关键特征。
- 同时给多个主体却不给区分特征：会串脸串装，人数多时按"第1位/第2位"逐个配一个显著标记。
- 服装/配饰写成"穿着一件外套"：模型会自由换色、换款式甚至让外套消失，需写"款式 + 颜色 + 不增减不换色"。
- 依赖画面文字做叙事：AI 视频中文字必然漂移变形，文字只能作为静态标识出现，不要靠文字传递关键信息。
- 换装、变身、拟人化等状态切换不给遮蔽条件：会出现两套形象同时存在，必须指定转身/遮挡/关门等转换方式。
- 人物比例、手部、眼镜与牙套这类细节不设锚点：推近与环绕时最容易崩，比例要写参照物而不是形容词。
- H3 分镜切点时间不递增或超出总时长：会直接破坏时间线，四个条件（新主体/新空间/新状态/新视点/新时间点）之外不要新增切镜。
