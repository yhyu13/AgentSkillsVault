---
id: scene-environment
title: 场景环境
dimension: 场景环境
applies_to: [H3, Seedance2.5]
model_field: H3 → integrated_multimodal_description（场景空间与光线描述）+ overall_soundscape（环境音）；Seedance 2.5 → 第2段「环境」与第5段「光线与色彩」
---

# 场景环境

> **装配位置**：H3 → integrated_multimodal_description + overall_soundscape ｜ Seedance 2.5 → 第2段「环境」+ 第5段「光线与色彩」
> **一句话用法**：把场景写成"地点 + 时段 + 天气 + 关键陈设 + 空间层次"五件套，光线另起一句写方向、强度、色温与质感，H3 再为该环境补一句对应的环境音。

## 片段

### ENV-01 · 城市街道（日间）
- **中文片段**：`场景是{城市名}的{街道名}，{时段}，{天气}，街道两侧是{建筑类型与风格}的{层数}层楼房，路面为{路面材质}，{街道元素}清晰可见，空间纵深沿{方向}延伸。`
- **英文片段**：`The scene is {street} in {city} at {time of day}, {weather}; {building style} buildings of {floors} storeys line both sides, the road surface is {material}, {street elements} are clearly visible, and depth recedes toward {direction}.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：写清纵深方向，模型才知道推近是"往街里"还是"往街外"；楼层数与建筑风格是避免街景穿帮的关键锚点。

### ENV-02 · 室内居所
- **中文片段**：`场景是{住宅类型}的{房间名称}，{面积/开阔度}，{主要陈设}沿{墙面/方位}摆放，{材质细节}清晰可辨，{窗户/门}位于{位置}并透入{光线}，整体空间关系保持稳定。`
- **英文片段**：`The scene is the {room} of a {residence type}, {size}, with {main furnishings} along the {wall / side}, {material details} clearly legible, and a {window / door} on the {position} letting in {light}; the spatial layout stays stable.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：室内片最容易出现家具漂移和"空间变大变小"，务必写门窗位置与一件大型参照物。

### ENV-03 · 办公与商业空间
- **中文片段**：`场景为{写字楼大堂/办公室/咖啡店/零售店}，{装修风格}，{主色与材质}，{柜台/工位/展架}按{布局方式}排列，背景有{可见纵深或玻璃幕墙}，人流稀疏。`
- **英文片段**：`The scene is a {office lobby / office / cafe / retail store} in {interior style}, with {primary colors and materials}, {counters / desks / shelving} arranged {layout}, {visible depth or glass facade} in the background, and light foot traffic.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：写"人流稀疏"可显著减少模型自动添加路人；商业空间还应避开品牌与 logo，因为画面文字会漂移，尽量用无字描述。

### ENV-04 · 自然外景·山野
- **中文片段**：`场景是{山地/草原/森林/海岸/沙漠}，{时间}，{天气}，地貌为{地形特征}，{植被类型}，远处有{山体/海平线/沙丘}作为背景层，地面为{地表材质}。`
- **英文片段**：`The setting is {mountains / grassland / forest / coast / desert} at {time}, {weather}; the terrain is {landform}, with {vegetation}, {ridge line / sea horizon / dunes} as the background layer, and {ground material} underfoot.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：自然场景要分"前景/中景/远景"三层，只写地貌容易拍成空镜；海景必须写明水平线位置，否则会随运镜起伏。

### ENV-05 · 水下与水域
- **中文片段**：`场景位于{水下深度}的{海洋/湖泊/泳池}中，{水体颜色与能见度}，光线从{上方/水面}透入形成{光柱/焦散}，{悬浮物或气泡}随水流飘动，背景为{开阔水域/池底}。`
- **英文片段**：`The scene takes place {underwater} at {depth} in {ocean / lake / pool}; the water is {color and clarity}, light filters from {above / the surface} forming {shafts / caustics}, {particles or bubbles} drift with the current, and the background is {open water / pool floor}.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：水下要写"漂浮方向"（随水流/向上），否则气泡会倒着走；焦散（caustics）是水下质感的关键词。

### ENV-06 · 雨雪天气
- **中文片段**：`场景处于{暴雨/绵雨/暴雪/细雪}中，{降雨强度与方向}，地面{积水反光/积雪覆盖}，{远景}被{雨幕/雪幕}柔化，{空气湿气}感明显。`
- **英文片段**：`The scene is in {heavy rain / steady rain / heavy snow / light snow}, with {intensity and direction}, {wet reflective ground / snow cover}, {background} softened by {rain veil / snowfall}, and a clear sense of {moisture in the air}.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：雨雪片的"雨量"要量化（细雨/倾盆），模型会按字面执行；地面反光与溅点是质感加分项。

### ENV-07 · 时间与时段
- **中文片段**：`时间设定在{黎明/清晨/正午/黄昏/夜晚}，{具体时刻}，整体环境呈现{对应光线特征}，天空颜色为{天色}，地面阴影{方向与长度}。`
- **英文片段**：`The time is {dawn / early morning / noon / golden hour / night}, around {hour}; the environment shows {corresponding light character}, the sky reads {sky color}, and ground shadows fall {direction and length}.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：时段一旦确定，全片的阴影方向和色温都不能变，跨镜时要在每镜重复时间词。

### ENV-08 · 光线方向与主光
- **中文片段**：`主光来自{左/右/前/后}方的{光源名称}，{硬光/柔光}，在{主体}身上形成{明确的明暗交界/柔和过渡}，{轮廓光}从{方向}勾勒出{边缘}。`
- **英文片段**：`The key light comes from the {left / right / front / back} as {light source}, {hard / soft}, creating {a defined terminator / a soft transition} across {subject}, with a {rim light} tracing the {edge} from {direction}.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：Seedance 2.5 第5段写光线；H3 在 integrated_multimodal_description 里写并保证与 overall_soundscape 无矛盾。一镜只设一个主光。

### ENV-09 · 天气与天空
- **中文片段**：`天空为{晴朗/多云/阴天/雨后放晴/黄昏晚霞}，云层{形态与运动方向}，整体环境色温偏{冷/暖}，空气通透度{高/低}，远景对比度{强/弱}。`
- **英文片段**：`The sky is {clear / partly cloudy / overcast / clearing after rain / sunset glow}, with {cloud form and drift direction}; the ambient color temperature leans {cool / warm}, the air is {clear / hazy}, and the background has {strong / weak} contrast.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：天空是画面最大的一块"环境色"，写清云形与色温能避免整片发灰或发橙过头。

### ENV-10 · 城市夜景
- **中文片段**：`场景是{城市区域}的夜景，{建筑}立面亮起{招牌色/窗光色}，{街道}上有{车流灯轨/行人剪影}，{光源}在{湿地面}上形成拉长倒影，整体为{冷蓝/暖橙}色调。`
- **英文片段**：`The scene is {city district} at night, with {facades} lit by {signage colors / window lights}, {light trails / pedestrian silhouettes} on the street, {light sources} stretching reflections across {wet pavement}, and an overall {cool blue / warm amber} palette.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：夜景不写"霓虹"两个字模型就会泛紫，配色点名（冷蓝/暖橙）比堆霓虹词更可控。

### ENV-11 · 体积光与氛围介质
- **中文片段**：`环境中充满{烟雾/蒸汽/粉尘/薄雾/水汽}，光线穿过介质形成{丁达尔光柱/柔和光晕}，能见度随距离衰减，远处{物体}逐渐隐入{介质}中。`
- **英文片段**：`The air is filled with {smoke / steam / dust / mist / vapor}; light passing through it forms {Tyndall shafts / soft halos}, visibility falls off with distance, and distant {objects} dissolve into the {medium}.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：介质词要跟"运动"一起写（缓慢飘动/上升），否则介质会像贴图一样静止不动。

### ENV-12 · 微型场景与微缩感
- **中文片段**：`场景是一个{微缩模型/桌面沙盘/玩具屋}级别的{主题}空间，景深极浅，{主体}与背景之间只有{几厘米}的纵深，边缘可见{手作材质/模型纹理}。`
- **英文片段**：`The scene is a {miniature / diorama / toy-set} scale {theme} space with extremely shallow depth of field, only {a few centimeters} of depth between {subject} and background, and visible {handmade / model} texture at the edges.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：微缩感靠"尺度参照物"（沙盘边缘、积木接缝）来传达，光写"微缩"模型会拍成正常比例。

### ENV-13 · 太空与科幻场景
- **中文片段**：`场景位于{空间站舱内/外星地表/轨道甲板}，{结构材质}呈{工业感}，{照明}来自{舱顶灯带/行星反光/警示灯}，远处可见{舷窗外星云或行星}，{浮尘/失重颗粒}缓慢移动。`
- **英文片段**：`The scene is set in {a station interior / an alien surface / an orbital deck}, with {structural materials} feeling {industrial}, lit by {ceiling strips / planetary bounce / warning lights}, with {a nebula or planet} visible beyond the window and {floating dust} drifting slowly.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：科幻场景的尺度感靠"穿舱行走/扶手高度"给出；失重场景必须写明物体漂浮而非下落。

### ENV-14 · 生态与自然保护地
- **中文片段**：`场景是{热带雨林/高山苔原/湿地/珊瑚礁}，{植被层次：林冠/灌木/地被}完整，{光线透过枝叶形成光斑}，空气中可见{水汽/花粉/飞虫}，环境层次丰富不单调。`
- **英文片段**：`The setting is a {tropical rainforest / alpine tundra / wetland / coral reef} with a full {canopy / shrub / groundcover} layering, {light filtering through foliage} in dappled patches, {vapor / pollen / insects} visible in the air, and rich, non-monotonous depth.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：写"层次"而不是罗列植物名；光斑（dappled light）是森林质感的核心提示。

### ENV-15 · 场景随时间变化（天气/光变化）
- **中文片段**：`场景保持{地点}不变，光线在{时间跨度}内从{状态A}变化到{状态B}，{云层/阴影}随之移动，{环境色温}整体过渡，{地面反射}同步改变，场景结构不变。`
- **英文片段**：`The location stays {place}; over {time span} the light shifts from {state A} to {state B}, {clouds / shadows} move accordingly, the {ambient color temperature} transitions, and {ground reflection} changes with it, while the scene structure stays the same.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：光变要写"从…到…"两点式，写成"光线变化"模型通常只会轻微闪一下；场景结构不变这句用来防背景重绘。

### ENV-16 · 场景中的天气作用与互动
- **中文片段**：`{雨/雪/风}对环境产生可见作用：雨水在地面形成涟漪与湿反光，雪在屋檐与地面堆积，风让{植被/布料/烟雾}朝{方向}偏斜，作用方向全程一致。`
- **英文片段**：`{Rain / snow / wind} visibly acts on the environment: ripples and wet reflections on the ground, accumulation on eaves and ground, and {foliage / fabric / smoke} leaning toward {direction}; the effect direction stays consistent throughout.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：天气必须有可验证的物理痕迹，否则只是背景板；风向要写清，否则草木和布料会朝两个方向倒。

### ENV-17 · 场景转换（新空间）
- **中文片段**：`[Shot 2] 场景切换到{新场景}，与前一镜的{场景}在{人物/道具}上保持一致，仅环境更改为{新场景特征}，时间与光线方向维持连续。`
- **英文片段**：`[Shot 2] The scene changes to {new location}; {person / prop} stay consistent with the previous shot, and only the environment switches to {new location features}, with time of day and light direction remaining continuous.`
- **适用**：H3 ｜ 两者
- **要点**：H3 中换场景属于合法的切镜条件（新空间），但切点时间要严格递增且落在总时长内，人物一致性必须跨镜复述。

### ENV-18 · 环境音与画面配对
- **中文片段**：`环境音为{底噪类型}，{具体声源}在画面{左/右/远处/近处}，{声源随画面动作产生的对应音}，整体声场保持{安静/嘈杂}，不出现音乐与旁白。`
- **英文片段**：`The soundscape is {ambient bed}, with {specific source} coming from the {left / right / distance / foreground}, {source reacting to on-screen action}, overall {quiet / busy} ambience, and no music or voiceover.`
- **适用**：H3
- **要点**：H3 的 overall_soundscape 只放环境音/物理音/非语言音，不含对白与音乐；声源方向要与镜头朝向一致。

## 排错提示

- 场景只写一个词（如"咖啡厅"）：模型会套用最平庸的布景，必须补时段、天气、陈设、材质与纵深方向。
- 光线形容词堆砌（唯美、梦幻、高级感）不可控：改写成光源位置、硬度、色温、阴影方向这类可判定描述。
- 不写天空与色温，整片会发灰：天空颜色与整体色温是环境氛围的最大杠杆，务必在主体描述后单独给一句。
- 天气只写"下雨"没有强度与作用痕迹：模型只加雨帘不湿地表，要补雨量、地面反光、溅点、风向对草木的影响。
- 纵深方向缺失导致运镜方向错：推近是"往里"还是"往外"由背景层次决定，需明确"纵深沿某方向延伸"。
- 室内没有门窗位置与大型参照物：镜头移动时房间会莫名变大或家具换位。
- 多镜之间不重复时段与光线方向：跨镜色温漂移是后期最常见的返工点。
- H3 里把对白或配乐写进 overall_soundscape：该字段只收环境音/物理音/非语言音，配乐写 non_diegetic_music，没有就写 N/A。
- Seedance 2.5 提示词塞满环境描写：官方未设字数上限，但素材已足够精准时应「只做指代、减少画面复述」；环境只留最能定调的几项，其余交给「氛围与光线」段。
