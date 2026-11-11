---
id: shot-sequencing
title: 镜头组设计与覆盖
dimension: 镜头组设计与覆盖
applies_to: [H3, Seedance2.5]
model_field: 全局（先定镜头组，再逐镜装配）
---

# 镜头组设计与覆盖

> **装配位置**：H3 → integrated_multimodal_description 的多镜结构 ｜ Seedance 2.5 → 【Event Script】的镜头序列
> **一句话用法**：把「{事件}」拆成**一组各司其职的镜头**——先定谁在经历、再定空间给多大、再定观众要看多近、最后定用什么转折切开，再按 {景别链} 逐镜装配，每一镜必须比上一镜多给观众一点新信息。

## 片段

### SEQ-01 · 建立镜（establishing）
- **中文片段**：`【镜1·建立】{景别}（大全景/远景），{焦段}，摄影机置于{环境内的方位}、距{主体}{距离}米，机位高度{高度}米、水平无倾角，静止不动；{主体}在画面中占画面高度约{比例}，{环境特征元素}占满画面{上/下/左/右}部；{光线方向与色温}；{切点}切。`
- **英文片段**：`[Shot 1 · Establishing] {shot size}, {focal length} lens, camera placed {position within the environment}, {distance} metres from {subject}, lens axis level at {height} metres, completely locked off; {subject} occupies about {proportion} of the frame height while {environment elements} fill the {upper/lower/left/right} of frame; {light direction and colour temperature}; cut on {cut point}.`
- **适用**：两者
- **要点**：建立镜只交代「人在哪、多大、什么气氛」，不负责表演；地理已经清楚时再用就是明信片、还会拖垮节奏。远景里人脸容易糊，人物占比不要低于画面高度八分之一。

### SEQ-02 · 反应镜（reaction）
- **中文片段**：`【镜{序号}·反应】{景别}（中景/近景），{焦段}，机位在{被反应对象}的{眼线高度}、水平，画面{左/右}下角留{对象肩线/桌沿/门框}作虚化前景；{反应者}在画面{位置}，脸上按顺序发生三个可见动作（{第一个微表情} → {第二个动作} → {呼吸或吞咽}），全程不说话、身体位移不超过{幅度}；{光线方向}，背景压暗；{切点}切。`
- **英文片段**：`[Shot {n} · Reaction] {shot size}, {focal length}, camera at the reacting person's eye height, level, with {shoulder line / table edge / door frame} as a soft foreground anchor in the {lower-left/lower-right} of frame; {reactor} sits at {frame position} and three visible actions happen in sequence on the face ({first micro-expression} → {second movement} → {breath or swallow}), with no speech and no body displacement beyond {amount}; {light direction}, background held dark; cut on {cut point}.`
- **适用**：两者
- **要点**：反应镜必须给「可见的三个动作序列」，写「他很震惊」等于没写；反应的内容必须和被反应那一镜不同，否则是重复表情、纯死气。

### SEQ-03 · 插入镜（insert / cutaway）
- **中文片段**：`【镜{序号}·插入】{景别}（特写/大特写），{焦段}（85–100mm），机位在{物件}的{方位}、距{物件}{距离}厘米、略向下俯{角度}度，全部合焦于{物件细节}；{物件状态}（指纹/水渍/刻痕/读数/折痕），背景化为不可辨认的{色调}色块；{光源}在{部位}留下一道{硬高光/细反光}；本镜机位不动，只让{画面内微动}（蒸汽、指针跳动、光斑移动、呼吸起伏）；{切点}切。`
- **英文片段**：`[Shot {n} · Insert] {shot size}, {focal length} (85–100mm), camera {position relative to the object}, {distance} centimetres away, tilted down {degrees}, everything in focus on {object detail}; the state of the object ({fingerprint/water mark/scratch/reading/crease}), the background reduced to unreadable blocks of {colour}; {source} leaves a {hard highlight/ thin reflection} on {area}; the camera does not move, only {micro-motion in frame} (steam, a twitching needle, drifting light, a rising breath); cut on {cut point}.`
- **适用**：两者
- **要点**：插入镜必须在前面某一镜里被「种下」——观众得先见过这东西，否则只是 B-roll。AI 最擅长插入镜（无脸、动作小、成功率高），每场至少备 3 个当保险。

### SEQ-04 · 空镜（empty shot / atmosphere）
- **中文片段**：`【镜{序号}·空镜】{景别}（远景/特写），{焦段}，静止机位，画面中只有{无人空间元素}{数量与位置}，没有任何人物；{环境动态}（窗帘轻晃、蒸汽升腾、尘埃在光柱中浮动、雨点打在玻璃上）；{光线方向与强度}，整体{色调}；保持{时长}秒后{切点}切。`
- **英文片段**：`[Shot {n} · Empty shot] {shot size}, {focal length}, camera static, the frame holding only {unoccupied elements} and their {count and position}, with no people in it; {environmental motion} (a curtain shifting, steam rising, dust drifting in the light shaft, rain striking the glass); {light direction and intensity}, overall {colour}; hold for {duration} seconds, then cut on {cut point}.`
- **适用**：两者
- **要点**：空镜是「缺席的证据」，必须和在场的人有关系（她坐过的椅子、他没关的灯）；只拍漂亮风景的空镜会让整段节奏垮掉。

### SEQ-05 · 揭示镜（reveal）
- **中文片段**：`【镜{序号}·揭示】先用{景别A}（局部/空镜）只给{被遮蔽物}的一角（一条门缝、一只手、桌上一角、镜中一角），切到{景别B}（近景/特写）从{角度}绕开遮挡物拍出{此前不可见的信息}；机位高度{高度}、{焦段}；{光源}让新信息被照亮，遮挡物仍留在画面暗部；切点落在{新信息被看清的那一帧}。`
- **英文片段**：`[Shot {n} · Reveal] First {shot size A} (detail / empty) showing only one corner of {the concealed thing} (a gap in the door, a hand, an edge of the table, a corner of the mirror), then cut to {shot size B} (close / insert) angled {direction} around the obstruction to expose {the previously unseen information}; camera at {height}, {focal length}; {source} lights the new information while the obstruction stays in shadow; the cut lands on the frame where the new information becomes readable.`
- **适用**：两者
- **要点**：揭示靠「先遮后露」，信息一旦露过就不能再藏回去；两镜之间不要插入无功能的镜头，否则揭示被稀释。

### SEQ-06 · 强调镜（emphasis）
- **中文片段**：`【镜{序号}·强调】{景别}（特写/大特写），{焦段}（100–135mm 压缩空间），机位在{主体}的{高度}、{正面/略俯}，画面内只有{被强调物件或身体局部}；{背景被压成一片不可辨认的{色调}}；{光源}在{部位}形成{一道硬高光/一点反光}；摄影机{锁定不动/极慢推进{幅度}}；{切点}切。`
- **英文片段**：`[Shot {n} · Emphasis] {shot size}, {focal length} (100–135mm to compress space), camera at {height} on {subject}, {head-on / slightly high}, the frame holding nothing but {the emphasised object or body part}; {background compressed into an unreadable field of {colour}}; {source} puts {a hard highlight / a single reflection} on {area}; the camera is {locked / pushing in a barely perceptible {amount}}; cut on {cut point}.`
- **适用**：两者
- **要点**：强调镜是全场的标点符号，一个事件里最多用一个，用两个就变成了插入镜；长焦压缩背景是把主体从环境里「剪」出来最稳的办法。

### SEQ-07 · 过渡镜（transition）
- **中文片段**：`【镜{序号}·过渡】{景别}，{焦段}，{运镜方式}（匀速横摇/推近/拉远），起幅为{上一场末画面元素}、落幅为{下一场开头元素}，运动方向{方向}、速度恒定、全程无加速无减速；画面亮度在运动中从{亮}渐变到{暗}，{切点}在运动到位后落下。`
- **英文片段**：`[Shot {n} · Transition] {shot size}, {focal length}, {camera move} (steady pan / push-in / pull-back), starting on {the last element of the previous scene} and landing on {the opening element of the next}, moving toward {direction} at a constant speed with no acceleration; the brightness shifts from {bright} to {dark} across the move; the cut falls once the move has arrived.`
- **适用**：两者
- **要点**：过渡镜必须有「矢量」——把 A 的某个形状或光带进 B 的某个形状或光；纯风景转场只是停顿，不是过渡。

### SEQ-08 · 覆盖镜 / 主镜（master）
- **中文片段**：`【镜{序号}·主镜】{景别}（全景/中景），{焦段}（28–35mm），摄影机固定在{方位}、距{主体组}{距离}米、高度{高度}米、水平；{角色A}位于画面{左}、{角色B}位于画面{右}，两人相距{距离}米，中间是{障碍物}；{动作}在镜内完成，结束时{角色A}停在{落幅位置}、{角色B}停在{落幅位置}；{光线方向}；{切点}切。`
- **英文片段**：`[Shot {n} · Master] {shot size}, {focal length} (28–35mm), camera locked at {position}, {distance} metres from the group, level at {height}; {character A} at frame {left}, {character B} at frame {right}, {distance} metres apart with {the obstacle} between them; {the action} completes inside the frame, ending with {character A} settled at {landing position} and {character B} at {landing position}; {light direction}; cut on {cut point}.`
- **适用**：两者
- **要点**：主镜是覆盖的锚，后面每一个单镜都要和它对得上（人物位置、光向、道具状态）；主镜先拍/先生成，其余覆盖镜从同一张关键帧改角度与景别。

### SEQ-09 · 通用拆解模板：事件 → 镜头组
- **中文片段**：`事件：{一句话事件}｜经历者：{谁在经历}（观众从他的知识看）｜空间尺度：{大场景 / 中景空间 / 封闭小空间}，给{多少}环境｜视点距离：{观众要多近}（远＝旁观，近＝共情，特写＝进入内心）｜转折：{用什么把事件切开}（{视线先给后给 / 一次转身 / 一个物件 / 一次进退}）｜镜头组：{镜数}镜，节奏{紧—松—紧}，落幅停在{落幅画面}。`
- **英文片段**：`Event: {one-line event} | Experiencer: {who is experiencing it} (the audience sees through their knowledge) | Spatial scale: {large setting / mid space / enclosed small space}, allowing {how much} environment | Viewing distance: {how close the audience should be} (far = witness, close = empathy, close-up = entering the interior) | Turn: {what splits the event} ({look then reveal / a turn / an object / a step in or out}) | Shot group: {number} shots, rhythm {tight–loose–tight}, landing on {landing frame}.`
- **适用**：两者
- **要点**：这四问没写完就不许动笔写镜头；顺序不能倒——先定谁在经历，再定空间，最后才定景别，顺序一倒就会拍成「一个人在房间里」而不是「某个人在经历什么」。

### SEQ-10 · 示例：她哭了（6 镜）
- **中文片段**：`【镜1·建立】大全景，24mm，摄影机置于病房走廊尽头、距病床 14 米，机位高 1.5 米水平，静止 4 秒；女孩蜷在病床上占画面高度约八分之一，走廊白墙占满画面上方，冷白顶灯自上方压下。【镜2·进入】中景，40mm，机位降到她坐姿视高 1.2 米、水平，从床尾偏右约 40 度围过去，缓慢推进约 15 厘米用 6 秒；她背对镜头、肩膀开始抖，护士的手搭在她肩上。【镜3·特写】近景，85mm，机位在她面部正前方 1.5 米、水平，眼睛落在画面上三分线，浅景深把身后的输液架化成模糊竖条；泪水沿右侧脸颊滑下，下颌先绷紧再松开，呼吸有一次停顿。【镜4·反应】近景，85mm，越过女孩右肩，护士的脸在画面右侧、俯角向下；护士的呼吸变浅，眼睛先眨两次，再把视线移向窗外。【镜5·插入】特写，100mm，机位在两人交握的手上方 0.5 米、略俯 20 度，全部合焦于护士收紧的指节；被单的蓝白条纹在边缘失焦；顶光在指节上留下一道硬高光。【镜6·落幅】与镜1完全相同的机位与景别，但床上已经空了，被子塌陷出一道凹痕，走廊冷白灯照在空床面上；镜头保持 5 秒不动。`
- **英文片段**：`[Shot 1 · Establishing] Extreme wide, 24mm, camera at the far end of a hospital corridor, 14 metres from the bed, level at 1.5 metres, locked for 4 seconds; the girl curled on the bed fills about one eighth of frame height, the white corridor wall fills the top of frame, cold ceiling light pressing down from above. [Shot 2 · Entering] Medium, 40mm, camera dropped to her seated eye height of 1.2 metres, level, swung about 40 degrees around from the foot of the bed, pushing in about 15 centimetres over 6 seconds; she is turned away, her shoulders beginning to shake, the nurse's hand resting on her shoulder. [Shot 3 · Close-up] Close, 85mm, camera 1.5 metres directly in front of her face, level, her eyes on the upper third, shallow focus reducing the IV stand behind her to blurred vertical bars; a tear runs down her right cheek, her jaw tightens then releases, her breath catches once. [Shot 4 · Reaction] Close, 85mm, over the girl's right shoulder, the nurse's face at frame right angled slightly down; the nurse's breathing shallows, her eyes blink twice, then she looks away toward the window. [Shot 5 · Insert] Close, 100mm, camera half a metre above their joined hands, tilted down 20 degrees, everything sharp on the nurse's tightening knuckles; the blue-white stripe of the sheet soft at the edges; a hard highlight across the knuckles from the overhead light. [Shot 6 · Landing] The exact camera and framing of shot 1, but the bed is empty now, the sheet dented where a body lay, cold white corridor light on the bare mattress; the camera holds still for 5 seconds.`
- **适用**：两者
- **要点**：哭不是一个「掉眼泪」的动作，是六镜的功能接力；预算只够三镜就用镜2＋镜3＋镜6。（H3 裁剪版：本示例总长约 25~30 秒，超 H3 官方 15 秒上限；走 H3 时只取「镜 2 + 镜 3 + 镜 6」三镜，合计约 15 秒，删掉建立镜与插入镜；或按拆条方案分两条生成再在剪辑阶段拼接。）

### SEQ-11 · 示例：他推开门走进来（5 镜）
- **中文片段**：`【镜1·插入】大特写，100mm，机位在门缝正前方 0.5 米、水平，焦点锁在那道 3 厘米的暖光线上；门缝的光被一道阴影横切过去，阴影由窄变宽。【镜2·反打】中景，35mm，机位在屋内、位于来者身后约 2 米的过肩位置，高度 1.6 米水平；室内人在画面前景左侧背对镜头，来者推门的手与前臂在画面右缘入画；顶灯从画面外上方斜切进来。【镜3·跟随】中景，40mm，摄影机与来者同速侧向跟拍，从画左向画右移动，他保持在画面右三分之一、身形大小不变，背景门框持续掠过；他在画面中段停住。【镜4·反应】近景，85mm，机位在来者视线高度 1.6 米、水平，室内人位于画面左侧三分之一、略仰，眼里映着门外的暖光；她的嘴唇动了一下，没有出声。【镜5·定格】全景，28mm，摄影机退到房间角落、距两人 3.5 米、高 1.5 米水平，两人分居画面左右、彼此隔着 2 米的空气，谁也不动；门还开着，暖光在地面拉出一道长条。`
- **英文片段**：`[Shot 1 · Insert] Extreme close, 100mm, camera half a metre square-on to the door gap, level, focus locked on the 3-centimetre band of warm light; a shadow crosses the light and widens. [Shot 2 · Reverse] Medium, 35mm, camera inside the room about 2 metres behind the arriving man, level at 1.6 metres; the woman inside is in the near foreground at frame left with her back to us, the man's pushing hand and forearm enter at the right edge; a ceiling light rakes in from off-frame above. [Shot 3 · Tracking] Medium, 40mm, camera tracking laterally at his speed from frame-left toward frame-right, he holding the right third of frame at constant size while doorframes stream past behind him; he stops mid-frame. [Shot 4 · Reaction] Close, 85mm, camera at his eye height of 1.6 metres, level, the woman at the left third of frame slightly low, warm hallway light reflected in her eyes; her lips move once without sound. [Shot 5 · Hold] Wide, 28mm, camera back in the corner of the room, 3.5 metres from them, level at 1.5 metres, the two of them holding the left and right of frame with 2 metres of air between, neither moving; the door still open, warm light drawn out into a long strip across the floor.`
- **适用**：两者
- **要点**：进门必须走「门缝→反打→跟随→反应→定格」五步，不能一镜推门了事——每一步都在回答「谁先看见谁」。

### SEQ-12 · 示例：两个人吵架（6 镜）
- **中文片段**：`【镜1·权力几何】双人中景，35mm，机位在两人轴线正侧方 90 度、距他们 3 米、高度 1.5 米水平；男人站在画左、高出坐着的人约 0.4 米，占画面左半并清晰，女人坐在画右、被他的肩挡住一半；男人的话在镜内说完，他不坐下。【镜2·正反打A】近景，85mm，机位在女人坐姿视高 1.2 米、水平，越过男人右肩，前景是男人虚化的肩；她看向画左外并略仰；光从画右的窗进来，她的左脸亮、右脸暗。【镜3·正反打B】近景，85mm，机位在男人站姿视高 1.6 米、水平，越过女人右肩；他在画右外、看向画右外并略俯，两个前景肩严格镜像；同一束窗光从画右打来。【镜4·失语特写】大特写，100mm，机位在她嘴唇正前方 0.4 米、略俯 10 度，全部合焦在下唇；话在半途停住，嘴角向下 2 毫米，喉部一次吞咽，背景全黑。【镜5·插入】特写，100mm，机位在桌面上方 0.5 米垂直向下，全部合焦在桌角那只倒扣的玻璃杯上；杯壁挂着一道水痕，桌面反光在杯底断掉；窗外光斜切过桌面。【镜6·离开镜】中景，50mm，机位保持不动，她起身走出画右，玻璃杯留在画面左下前景；他没有转身看她，只把目光落向桌面；画面在他一个人的构图上停 3 秒。`
- **英文片段**：`[Shot 1 · Power geometry] Two-shot medium, 35mm, camera 90 degrees to the axis between them, 3 metres away, level at 1.5 metres; the man stands at frame left about 0.4 metres taller than the seated woman, filling the left half of frame in focus, while she sits at frame right half-hidden behind his shoulder; his line finishes inside the shot and he does not sit. [Shot 2 · Reverse A] Close, 85mm, camera at her seated eye height of 1.2 metres, level, over his right shoulder with his blurred shoulder in the foreground; she looks off-screen left and slightly up; window light from frame right puts her left cheek lit and her right cheek dark. [Shot 3 · Reverse B] Close, 85mm, camera at his standing eye height of 1.6 metres, level, over her right shoulder; he is off-screen right, looking off-screen right and slightly down, the two foreground shoulders strictly mirrored; the same window light comes from frame right. [Shot 4 · Close on the lost line] Extreme close, 100mm, camera 0.4 metres in front of her mouth, tilted down 10 degrees, everything sharp on her lower lip; the sentence stops halfway, the corners of her mouth drop 2 millimetres, one swallow moves in her throat, the background black. [Shot 5 · Insert] Close, 100mm, camera half a metre above the table looking straight down, everything sharp on an overturned glass at the corner of the table; a run of water clings to the glass, the table's reflection breaks at its base, window light cuts diagonally across the surface. [Shot 6 · Exit] Medium, 50mm, camera unmoved as she rises and walks out of frame right, the glass left in the lower-left foreground; he does not turn to watch her, only lets his gaze fall to the table; the frame holds on him alone for 3 seconds.`
- **适用**：两者
- **要点**：吵架组的核心是「正反打必须镜像」——前景肩、视线方向、光向三者都要对称，否则观众读不出这两个人在同一个房间里吵架。

### SEQ-13 · 示例：产品出现在桌上（5 镜）
- **中文片段**：`【镜1·环境】全景，35mm，机位在桌对面 2.5 米、高 1.1 米水平，桌面占画面下三分之一，产品只是一枚看不出型号的小方块置于桌心偏右；窗外冷光从画左斜入，桌面右侧留着一块暖反光。【镜2·手放入】特写，85mm，机位在桌面右侧上方 0.4 米、俯 30 度，一只手把产品推入画面中央并松手；手掌占画面左上，手指离开时产品完整露出；焦点始终在产品上。【镜3·材质特写】大特写，100mm，机位水平贴近产品 0.3 米、略高于产品顶面，金属边缘有一道被窗口切出的细长高光，机身弧面上映出模糊的窗形；背景化为不可辨认的暗绿。【镜4·环绕】近景，50mm，摄影机以产品为圆心顺时针绕行约 60 度、半径 0.6 米、匀速，产品反光随视角连续扫过表面，背景桌面纹理横向掠过；结束时产品位于画面中央偏右。【镜5·揭示】全景，35mm，摄影机从桌面高度缓慢升起约 40 厘米用 4 秒，画面由桌面俯视展开成整个空间，产品始终在画面中央下方且越来越小；{货架/厨房/展台}逐层进入画面，光线从冷调转暖调。`
- **英文片段**：`[Shot 1 · Environment] Wide, 35mm, camera across the table 2.5 metres away, level at 1.1 metres, the tabletop filling the lower third, the product nothing but a small unidentifiable block just right of the table's centre; cold window light rakes in from frame left while a warm reflection sits on the right side of the table. [Shot 2 · Hand places it] Close, 85mm, camera 0.4 metres above the right side of the table, tilted down 30 degrees, a hand sliding the product to the centre of frame and letting go; the palm fills the upper left, and the product is fully revealed as the fingers withdraw; focus stays on the product. [Shot 3 · Material] Extreme close, 100mm, camera level 0.3 metres from the product and just above its top plane, a thin hard highlight along the metal edge cut by the window, a blurred window shape reflected in the curve of the body; the background dissolves into an unreadable dark green. [Shot 4 · Orbit] Close, 50mm, camera orbiting clockwise about 60 degrees around the product on a 0.6 metre radius at a constant speed, the reflection sweeping continuously across the surface while the table texture slides laterally behind; the shot ends with the product just right of centre. [Shot 5 · Reveal] Wide, 35mm, camera rising slowly about 40 centimetres from table height over 4 seconds, the frame opening from a tabletop view into the whole space, the product staying low-centre and shrinking; {shelves/kitchen/display stand} enter the frame layer by layer and the light shifts from cool to warm.`
- **适用**：两者
- **要点**：产品组一定要有第 5 镜的揭示，否则观众只看到一件漂亮物件，不知道它属于哪里、值多少。

### SEQ-14 · 示例：孩子第一次看见雪（5 镜）
- **中文片段**：`【镜1·主观】主观视角（POV），28mm，机位在孩子视线高度 1.1 米、水平，画面上方是灰白天空，中景是飞舞的雪粒，前景下方是孩子自己伸出的戴红手套的小手；雪粒扑到镜头上形成短暂的白色斑点。【镜2·反应特写】近景，85mm，机位在孩子面前 1.2 米、略高 20 度，孩子仰头，眼睛睁大，睫毛上有融化的雪水，呼出的白气糊住画面下缘；孩子在画面中央偏左，背景是雪地虚化成一片白。【镜3·主观再看】主观视角，35mm，机位仍在孩子视高 1.1 米，镜头缓慢向前平移约 1 米，落点是雪地上一行陌生的脚印；雪仍在下，脚印边缘已经被新的雪填了一半。【镜4·中景】中景，40mm，机位在孩子侧后方 2 米、高 1.0 米，孩子张开双臂从画面右侧跑向左侧，脚步打起一片雪沫；他的红手套在白画面里是唯一的彩色块。【镜5·全景】远景，28mm，摄影机不动，一个穿红外套的小小身影在雪地中央跑向远处那排黑杉树，人只占画面高度十分之一；天空占画面三分之二，压得很低；落幅停 4 秒。`
- **英文片段**：`[Shot 1 · POV] Point of view, 28mm, camera at the child's eye height of 1.1 metres, level, grey-white sky across the top, snow sweeping through the middle distance, the child's own small red-gloved hand reaching into the lower foreground; flakes strike the lens and bloom into brief white spots. [Shot 2 · Reaction] Close, 85mm, camera 1.2 metres in front of the child, 20 degrees above, the face tilted up, eyes wide, snow melting on the lashes, the child's breath fogging the bottom of frame; the child sits just left of centre against a snowfield blurred to white. [Shot 3 · POV again] Point of view, 35mm, still at the child's 1.1 metre eye height, the frame advancing slowly about 1 metre forward to land on a line of unfamiliar footprints in the snow; the snow is still falling and the prints are already half-filled. [Shot 4 · Medium] Medium, 40mm, camera 2 metres behind and to the side of the child, at 1.0 metre height, the child running from frame right to frame left with arms wide, boots throwing up a burst of snow; the red gloves are the only colour in a white frame. [Shot 5 · Wide] Wide, 28mm, camera locked, a small figure in a red coat running across the centre of the snowfield toward a line of black firs, filling only one tenth of the frame height; the sky takes two thirds of the picture and presses low; the shot holds for 4 seconds.`
- **适用**：两者
- **要点**：POV 必须先给「看的人」（镜2 的仰头特写就是锚），否则主观镜头不知道是谁在看；最后一个远景是把孩子的惊叫换成世界的尺度。

### SEQ-15 · 景别递进：远 → 近
- **中文片段**：`镜头组景别链：{远景/大全景}（交代{环境}）→ {全景}（{主体}全身与位置）→ {中景}（{动作}可读）→ {近景}（{表情}可见）；每一跳同时改变机位角度至少 30 度、景别至少两级；推进方向与光线方向保持一致（光从画左来，机位就从画左绕进）。`
- **英文片段**：`Shot-group size ladder: {wide} (establishing {environment}) → {full shot} (whole body and position) → {medium} (the {action} readable) → {close} (the {expression} visible), every jump changing camera angle by at least 30 degrees and size by at least two rungs, with the camera arc and the key light kept consistent (light from frame-left, so the camera moves in from frame-left).`
- **适用**：两者
- **要点**：远→近＝观众被拉进事件内部，适合「发现／逼近真相」；同轴只收一级会读成跳帧，所以角度必须跟着换。

### SEQ-16 · 景别递进：宽 → 窄（空间被吃掉）
- **中文片段**：`在同一场景内保持{同一焦段 35–50mm}与{同一机位高度}，把景别从{全景}连续收窄到{中景}再到{近景}，主体在画面中逐级变大，背景的{空间元素}被逐级挤出画框；机位不做任何横移，只靠距离变化完成；每收一级留{2–3}秒给{主体}完成一个可见动作。`
- **英文片段**：`Within the same setup, keeping the same {focal length, 35–50mm} and the same camera height, tighten from {wide} to {medium} to {close}, the subject growing in frame while {spatial elements} are pushed out of the edges; the camera does not translate at all — distance alone does the work — and at each step hold {2–3} seconds for {subject} to complete one visible action.`
- **适用**：两者
- **要点**：宽→窄说的是「空间被吃掉」，用于逼近一个人的话；窄→宽是把人抛下，两者情绪相反，不要在同一组里混用。

### SEQ-17 · 景别递进：近 → 远（抽离）
- **中文片段**：`镜头组从{近景}开始（{主体}的{局部细节}），随后{中景}、{全景}、{远景}逐级拉远，每一级机位都后退至少{2}米并升高{0.3}米，最后{主体}在画面中只剩{比例}，{环境}重新占满画面；光线方向不变，主体始终在画面同一侧；最后一镜静止保持{3}秒。`
- **英文片段**：`Begin on {close-up} ({detail} of {subject}), then step back through {medium}, {wide} and {extreme wide}, each level moving the camera at least {2} metres further back and {0.3} metres higher until {subject} is only {proportion} of frame height and {environment} fills the picture again; the light direction never changes and the subject stays on the same side of frame; the final shot holds static for {3} seconds.`
- **适用**：两者
- **要点**：近→远＝把人从事件里拔出来，适合「刚刚发生却已经无关」；它与 SEQ-15 是同一条链的反向用法。

### SEQ-18 · 景别递进：反向递进（近→远→近）
- **中文片段**：`三段式景别链：{近景}（{情绪特写}）→ {全景}（{环境与人的位置}）→ {近景}（比第一镜更近的{细节}），中段是唯一一次后退；第一镜与第三镜的机位高度与光向相同、景别相差{两级}，形成「框」；全链只有中段可动，其余锁定。`
- **英文片段**：`A three-step chain: {close-up} ({emotional detail}) → {wide} ({environment and position}) → {close-up} ({a tighter detail than the first}), the middle being the only retreat; the first and third shots share the same camera height and light direction and differ by {two rungs} in size, forming a frame around the middle; only the middle shot may move, the rest are locked.`
- **适用**：两者
- **要点**：近—远—近是「呼吸」结构，用来包住一个转折或一段回忆；两次近景必须给不同信息，否则第三镜白拍。

### SEQ-19 · 景别递进：跳切景别（跨级）
- **中文片段**：`在两次切镜之间故意跨{两到三级}景别（例：{中景}直接切到{大特写}），机位角度同时改变至少 40 度，使跳切读作「时间或情绪的断裂」而不是失误；被跳过的中间景别由后一镜的一个局部元素补偿（{手/眼/物件}特写承担被跳过的信息）；{切点}落在动作的中途而非动作结束。`
- **英文片段**：`Deliberately jump {two to three rungs} between two cuts (e.g. {medium} straight to {extreme close-up}) while the camera angle also changes by at least 40 degrees, so the jump reads as a break in time or emotion rather than a mistake; the skipped middle is compensated by one local element in the following shot ({hands/eyes/object} in close-up carrying what was skipped); the cut lands mid-action, not at its end.`
- **适用**：两者
- **要点**：跳切只有在「被跳过的信息被补回来」时才成立；跳了又没人补，观众只会觉得漏拍了一镜。

### SEQ-20 · 景别递进：保持同一景别（对比用）
- **中文片段**：`连续{两到三}镜保持完全相同的{景别}、{焦段}与{机位高度}，只改变主体在画面中的{位置/朝向/动作}，用同一把尺子量两个不同的人；第一镜中{主体A}占画面{比例}、{主体B}在{画右/画左}处{状态描述}；第二镜让{主体B}进入该位置，同景同焦段不变；两镜背景与光线方向完全一致。`
- **英文片段**：`Hold {two to three} shots at exactly the same {shot size}, {focal length} and {camera height}, changing only {position/orientation/action} of the subject, using one ruler to measure two different people; in the first shot {subject A} fills {proportion} of frame with {subject B} at {frame side} in {state}; the second puts {subject B} in that position with size, lens and height unchanged; background and light direction identical in both.`
- **适用**：两者
- **要点**：同景别连续两镜＝对照实验，适合「母亲 vs 女儿」「加班的人 vs 偷闲的人」；景别不变而光向变了，对照会失效。

### SEQ-21 · 三级跳（大全景 → 中景 → 特写）
- **中文片段**：`标准三段式覆盖：镜1 {大全景}（{环境}与{主体}的位置，{焦段}，机位距{主体}{距离}米）→ 镜2 {中景}（{动作/对白}的主场，{焦段}，机位换到轴线另一侧约 30 度）→ 镜3 {特写}（{表演}落点，{焦段}，机位高度与镜2 同高、光向不变）；三镜构成一个完整镜头组的最小单元，总时长控制在{6–9}秒。`
- **英文片段**：`The standard three-shot coverage: shot 1 {extreme wide} (the position of {subject} in {environment}, {focal length}, camera {distance} metres away) → shot 2 {medium} (the stage for the {action/dialogue}, {focal length}, camera moved about 30 degrees to the other side of the axis) → shot 3 {close-up} (where the performance lands, {focal length}, same camera height and light direction as shot 2); the three shots form the minimum complete unit of a shot group, {6–9} seconds in total.`
- **适用**：两者
- **要点**：三级跳最省预算也最不容易出错；AI 视频里把三镜拆成三次生成，从同一张关键帧改角度与景别。

### SEQ-22 · 覆盖组合法（主镜 + 反打 + 插入 + 反应 + 空镜）
- **中文片段**：`双人对白的最小覆盖组合（6 个 setup）：①{全景主镜}固定，含两人全身与空间关系；②{单人近景 A}越{对象}肩，{对象}肩在画左下前景；③{单人近景 B}越{A}肩，{A}肩在画右下前景，两镜肩位镜像、视线方向相反；④{插入镜}{道具}特写；⑤{反应镜}{B}听到关键台词后的脸；⑥{空镜}{场景细节}。实际剪辑只用其中{4}镜；单人事件可删去{②③⑤}中的对应项，保留{主镜 + 特写 + 插入 + 空镜}四镜。`
- **英文片段**：`The minimum coverage set for a two-hander (six setups): ① {wide master}, locked, holding both bodies and their spatial relation; ② {close single of A} over {B}'s shoulder with {B}'s shoulder in the lower-left foreground; ③ {close single of B} over {A}'s shoulder with {A}'s shoulder in the lower-right foreground, the two foreground shoulders mirrored and the eyelines opposite; ④ {insert} of {prop}; ⑤ {reaction} — {B}'s face on the key line; ⑥ {empty cutaway} of {scene detail}. You will only cut {4} of them; for a single-subject event drop the matching one of {②③⑤} and keep {master + close-up + insert + empty}.`
- **适用**：两者
- **要点**：覆盖是保险不是必剪；正反打两镜必须同焦段、同光向、机位严格镜像，否则宁可只用一个双人镜。

### SEQ-23 · 什么时候必须补覆盖镜
- **中文片段**：`出现以下任一情况必须补镜：①{角色}的脸承担{关键表演}但组里没有{特写}；②{道具}状态在{剧情}中改变（{破损/移动/消失}）而观众此前没见过它；③{镜头组}结尾需要一个「空掉的位置」来收束；④{前一镜}是{双人镜}而{下一镜}要切到{单人}，必须先用{过肩镜}做过渡；⑤{事件}涉及{视线交换}（看—被看），必须有{一镜主观 + 一镜反应}。补镜优先级：{反应镜} > {插入镜} > {过肩镜} > {空镜} > {主镜}。`
- **英文片段**：`Add coverage whenever: ① {character}'s face carries {key performance} but the group has no {close-up}; ② {prop}'s state changes in the story ({broken/moved/gone}) and the audience has not seen it before; ③ the group needs an emptied position to close on; ④ a {two-shot} is followed by a {single}, requiring an {over-the-shoulder} bridge first; ⑤ the event involves an exchange of looks (look–seen), requiring {one POV shot and one reaction}. Priority order for additions: {reaction} > {insert} > {over-the-shoulder} > {empty} > {master}.`
- **适用**：两者
- **要点**：AI 视频不能「重拍另一个角度」，缺覆盖就是永久缺；先补反应镜，因为它是唯一没法靠后期剪辑救回来的信息。

### SEQ-24 · 每镜一个新信息
- **中文片段**：`镜头组规则：每次切镜都必须引入一个新信息——新的{主体}（谁在画面里）、新的{空间}（我们在哪、看到什么）、新的{状态}（谁的位置/表情/物件变了）、新的{视点}（从谁的眼睛看）、新的{时间}（刚才还是现在）。若切镜后没有新信息，就把两段合回同一镜，改用{推近}{幅度}或{横移}{角度}在镜内完成变化；不允许连续两镜拍同一主体、同一景别、同一机位高度、同一动作。`
- **英文片段**：`Rule for the shot group: every cut must introduce new information — a new {subject} (who is in frame), a new {space} (where we are, what we see), a new {state} (someone's position, expression or prop has changed), a new {viewpoint} (whose eyes we look through), a new {time} (then or now). If a cut adds nothing, merge the two into one shot and make the change with a {push-in} of {amount} or a {lateral move} of {angle} inside the frame; never shoot the same subject, same size, same camera height and same action in two consecutive shots.`
- **适用**：两者
- **要点**：这条是镜头组的节拍阀，它会自动消灭凑数的机位；判断方法只有一句——观众比上一镜多知道了什么，答不上来就删。

### SEQ-25 · 镜头组长度与节奏曲线
- **中文片段**：`镜头组规格：单一事件用{3–5}镜（建立 1 + 主体 1–2 + 反应或插入 1 + 落幅 1），多个连续事件用{5–8}镜；节奏曲线为「紧—松—紧」：起幅{1–2}镜短（每镜 {2–3} 秒，信息密度高），中段{1–2}镜放长（{4–6} 秒，让表演或环境呼吸），收束{1}镜回到短（{2–3} 秒）；{事件类型}配{镜数}镜——{单一动作}{3}镜、{对话回合}{4–5}镜、{情绪转折}{5}镜、{揭示}{6–8}镜。`
- **英文片段**：`Shot-group specification: a single event uses {3–5} shots (1 establishing + 1–2 on the subject + 1 reaction or insert + 1 landing); a run of connected events uses {5–8} shots; the rhythm curve is tight–loose–tight — the opening {1–2} shots short ({2–3} seconds each, dense with information), the middle {1–2} shots long ({4–6} seconds, letting the performance or the environment breathe), the closing shot back to short ({2–3} seconds); {event type} takes {count} shots — {single action} {3}, {dialogue beat} {4–5}, {emotional turn} {5}, {reveal} {6–8}.`
- **适用**：两者
- **要点**：不要每个事件都套 5 镜；同一场戏里镜头组长度要故意不一样，否则节奏听起来像节拍器。（SEQ-10 的 6 镜属长预算特例，按 SEQ-10 要点裁剪为 3 镜；本条说的 3~5 镜是常规预算。）

### SEQ-26 · 调度模式：桌面对立（table opposition）
- **中文片段**：`【调度·桌面对立】两人隔{桌子/柜台}相坐，摄影机放在{近者肩后}、与桌面轴线成 25–35 度，{焦段}（40–50mm），机位高度等于{坐着的人}的眼高（约 1.2 米）、水平；两人身体不发生位移，只有{一方}把{手/文件}放到桌面上，另一方{保持不动}；桌面占画面下三分之一，{顶灯}在桌面形成一块亮区，其余压暗；{切点}切。`
- **英文片段**：`[Blocking · Table opposition] The two sit facing each other across the {table/counter}, the camera behind the nearer shoulder at 25–35 degrees to the table axis, {focal length} (40–50mm) at the seated eye height (about 1.2 metres), level; neither body translates, only {one side} places {a hand/document} on the table while the other {holds still}; the tabletop occupies the lower third with a {practical} pooling light on it and the rest falling dark; cut on {cut point}.`
- **适用**：两者
- **要点**：桌对桌＝有规则的谈判，谁都不能越过桌面；机位不要摆成正对轴线，否则变成平级听证。

### SEQ-27 · 调度模式：逼近（approach）
- **中文片段**：`【调度·逼近】{主体A}从{距离}米外沿直线走到{主体B}身前{0.6}米处，全程{4}秒、约每秒一步；{主体B}保持站立不动、只转头跟随；摄影机固定在与两人连线成 90 度的侧方，{35mm}，高度{1.4}米水平，让画面里两人的间距可见地缩短；{背景光}从后方照出{主体A}的轮廓；{切点}切。`
- **英文片段**：`[Blocking · Approach] {subject A} walks straight from {distance} metres to {0.6} metres in front of {subject B} over {4} seconds, roughly one step per second; {subject B} does not step back and only turns the head to follow; the camera is locked 90 degrees to the side of the line between them, {35mm}, level at {1.4} metres, so the shrinking gap is visible in frame; {backlight} from behind outlines {subject A}; cut on {cut point}.`
- **适用**：两者
- **要点**：机位必须与逼近线成 90 度，否则距离变化在画面里直接消失；先动的那个人是想要东西的人。

### SEQ-28 · 调度模式：后退（retreat）
- **中文片段**：`【调度·后退】{主体A}从{0.6}米处背向后退到{2.0}米，全程{3}秒，身体仍朝向{主体B}、面部不转开；{主体B}原地不动、目光跟随；摄影机固定在侧方 90 度、{35–50mm}、高度{1.5}米水平；随着距离拉开，{主体A}在画面中逐级变小并退入{背景阴影}；{切点}在{主体A}完全站定时落下。`
- **英文片段**：`[Blocking · Retreat] {subject A} backs away from {0.6} metres to {2.0} metres over {3} seconds, the body still turned toward {subject B} and the face not turning away; {subject B} stays put with the gaze following; the camera is locked 90 degrees to the side, {35–50mm}, level at {1.5} metres; as the distance opens, {subject A} shrinks in frame and retreats into {background shadow}; the cut lands the moment {subject A} stops.`
- **适用**：两者
- **要点**：面朝对方的后退是拒绝，转身的后退是害怕，两种写法不能混；后退版比逼近版更适合 AI，因为身体不会互相融合。

### SEQ-29 · 调度模式：并行行走（parallel walk）
- **中文片段**：`【调度·并行行走】两人并肩同向行走，彼此间距{0.8–1.0}米、步幅一致，摄影机以{35–50mm}正面后退跟拍、速度与两人同步，两人在画面中始终同大、左右位置固定；背景持续向画后退去；两人身体不接触、目光直视前方；{光线}从侧面掠过制造明暗交替；{切点}在两人同步迈出一步时落下。`
- **英文片段**：`[Blocking · Parallel walk] The two walk side by side in the same direction, {0.8–1.0} metres apart with matched stride, while the camera retreats in front of them at {35–50mm} at their speed so they stay the same size in frame with fixed left-right positions; the background streams backward behind them; the bodies do not touch and both look ahead; {light} rakes across from the side producing alternating bands of light and shade; the cut falls as they step in unison.`
- **适用**：两者
- **要点**：正面后退跟拍在 AI 里最容易崩，宁可改成「摄影机侧向固定、两人横穿画面」——意思一样，更稳。

### SEQ-30 · 调度模式：环绕（orbit）
- **中文片段**：`【调度·环绕】{主体B}从{主体A}的{9 点钟方向}绕到{1 点钟方向}，半径{1.2}米、{3}秒匀速；{主体A}原地不动、只转动头部跟随，视线全程不断；摄影机固定在{弧线中点方向}、随 B 的移动平移摇摄，{50mm}，高度{1.5}米水平；结束时 B 的脸第一次完整朝向镜头；{切点}在 B 停稳的那一帧。`
- **英文片段**：`[Blocking · Orbit] {subject B} travels from {subject A}'s {9 o'clock} to {1 o'clock} on a {1.2} metre radius over {3} seconds at constant speed; {subject A} stays in place, turning only the head to follow, the eyeline unbroken throughout; the camera pans laterally with B from a fixed position at {the arc's midpoint}, {50mm}, level at {1.5} metres; at the end B's face turns fully to the lens for the first time; cut on the frame where B settles.`
- **适用**：两者
- **要点**：环绕在 AI 里漂移率最高（人体自转＋机位自转），保底写法是分两个静态机位拍起始角与结束角，用切点完成环绕。

### SEQ-31 · 调度模式：楔形（wedge）
- **中文片段**：`【调度·楔形】开场{两人}相距{1.0}米、正面朝向镜头，画面中两者之间留出一块明显空白；{第三人}从背景深处走来、{2.5}秒内走进这块空白、停在与两人各{0.5}米处、正面朝向镜头；摄影机固定在正前方、{35mm}、距三人{3}米、高{1.5}米水平、对称构图；三人各自独立不接触；{切点}落在第三人停稳的一帧。`
- **英文片段**：`[Blocking · Wedge] The shot opens with {two people} {1.0} metres apart, both facing the lens, with a clear gap left between them; {the third person} walks out of the deep background, enters that gap over {2.5} seconds and stops {0.5} metres from each of them, facing the lens; the camera is locked head-on, {35mm}, {3} metres from the three of them, level at {1.5} metres, in a symmetrical composition; nobody touches; cut on the frame where the third person settles.`
- **适用**：两者
- **要点**：楔形的前提是「开场时中间必须有空」；第三人到位的一刻，两人之间那件私事就结束了。

### SEQ-32 · 权力几何三件套（距离即对白 · 机位高低即权力 · 正反打站位）
- **中文片段**：`【权力几何】①距离：写死数字——{A}从{2.4}米走近到{0.6}米用{4}秒，{B}全程不动；谁动了谁在要东西，谁不肯退回去谁握权力。②机位高低：拍坐着的{对象}时把机位放在{站着的人}的眼高（约 1.6 米），画面里{站着的人}的肩线压在画面上方；拍站着的人时把机位降到{坐着的人}的眼高（约 1.2 米），天花板边角进入画面上方。③正反打站位：{A}永远在画左看向画右外，{B}永远在画右看向画左外；两个反打镜机位严格镜像，前景肩分别在画左下与画右下，光从同一侧进入。`
- **英文片段**：`[Power geometry] ① Distance, written as numbers — {A} closes from {2.4} to {0.6} metres over {4} seconds while {B} does not move; whoever moves is the one who wants something, whoever refuses to restore the distance holds the power. ② Camera height: when shooting the seated {subject}, place the camera at the standing person's eye height (about 1.6 m) so the standing shoulder line presses across the top of frame; when shooting the standing person, drop the camera to the seated person's eye height (about 1.2 m) so the ceiling edge enters the top of frame. ③ Shot-reverse-shot staging: {A} always at frame left looking off-screen right, {B} always at frame right looking off-screen left; the two reverse setups are exact mirror images, the foreground shoulders in the lower-left and lower-right respectively, with light entering from the same side.`
- **适用**：两者
- **要点**：观众读的是画面里的高矮与距离，不是台词；机位高度设错，正反打就会变成两个人对着空气说话。

## 排错提示

- **一个事件只写了一个镜头**：说明没走 SEQ-09 的四问。回去补「谁在经历 / 空间给多大 / 看多近 / 什么转折」，缺哪一问就补哪一镜；不要靠加形容词补救。
- **镜头组没有落幅**：最后一镜必须是一个能冻住的构图（SEQ-08 结尾或 SEQ-17 的尾镜），否则情绪无处安放，剪辑会显得像素材被截断。
- **正反打不匹配**：两个单镜的机位没镜像、眼神同向、或前景肩跳了角。按 SEQ-32 的第 ③ 条重写，必要时退回到一个双人镜。
- **全组都在 MS–CU 之间横跳，观众不知道在哪**：缺 SEQ-01 建立镜或 SEQ-04 空镜。补一个地理锚点，比加两个特写有用。
- **跳切之后观众丢失了空间**：用 SEQ-19 的「补偿镜」补回被跳过的信息，或用 SEQ-07 过渡镜把两边的形状对上；两者都补不了就退回一级景别。
- **反应镜拍成了重复表情**：改用 SEQ-02 的「三动作序列」，并保证反应内容与被反应那一镜不同；反应的人如果在画外，就把对方的肩或背留在前景做空间锚点。
- **插入镜像 B-roll**：说明道具没在前文被种下——回到建立镜，让那件东西至少被看到一眼。
- **调度拍不出来 / 模型跑偏**：本文件已给出 table opposition、approach、retreat、parallel walk、orbit、wedge 六种写法；其余六种——wall（背对镜头不给脸）、shrinking two-shot（两人不动、空气被吃光）、reveal-by-turn（转身露脸）、ladder（三人纵深一框）、pin（背贴墙无退路）、pass-through（前景横穿擦镜）——需要时用「拍摄手法与题材技法」「运镜」两个文件的对应片段拼装；生成失败时的降级是：orbit 拆成两个静态机位、wedge 进场改成「肩已在画缘」、approach 与 retreat 拆成两段各自位移。
