---
id: color-grading
title: 调色与跨镜一致性
dimension: 调色与跨镜一致性
applies_to: [H3, Seedance2.5]
model_field: Seedance 2.5 第 5 段「光线与色彩」｜ H3 integrated_multimodal_description 的光线与色彩句
---

# 调色与跨镜一致性

> **装配位置**：Seedance 2.5 → 第 5 段 ｜ H3 → 第一字段内的光线与色彩句
> **一句话用法**：调色按「先校正（白平衡+一级）→ 再局部（二级）→ 再风格化（分离色调/曲线）→ 最后跨镜对齐」四层写，每层只给一到两句可执行的色彩动作；同一场戏的每个镜头把 CGR-29 原样粘贴一遍。

## 片段

### CGR-01 · 校正层：白平衡归位与色温定向
- **中文片段**：`先把画面里的中性物体（白墙、灰水泥、白衬衫）校回真正的中性灰，再把整体色温定向为{冷 / 中性 / 暖}，使白墙呈现{冷白 / 中性白 / 奶油白}，高光与阴影处在同一个色温方向上，不允许出现高光偏暖、暗部偏冷的分裂色温。`
- **英文片段**：`Neutralize first: bring the neutral surfaces in frame (white walls, grey concrete, a white shirt) back to true neutral grey, then set the overall white balance to a {cool / neutral / warm} direction so whites read {cool white / neutral white / creamy}; highlights and shadows stay on one colour temperature instead of splitting into warm highlights over cold shadows.`
- **适用**：两者
- **要点**：校色永远排在风格化之前；模型默认「高光暖、暗部冷」，不显式压住就会得到假的电影感。

### CGR-02 · 一级校色：曝光、黑位与整体对比
- **中文片段**：`一级校色：整体曝光定在{主体受光面}仍能读出层次、黑位落到接近纯黑但还留着一点{暗部色偏}的位置，用一条 S 形曲线压出中高光、抬起中间调，形成{硬朗高对比 / 柔和低对比}的整体影调。`
- **英文片段**：`Primary correction: exposure set so the {lit side of the subject} still holds detail while the black point lands just short of pure black with a trace of {shadow tint}; an S-curve compresses the highlights and lifts the midtones, producing a {firm high-contrast / soft low-contrast} overall tonality.`
- **适用**：两者
- **要点**：这一层只动全局亮度与对比，不动颜色；黑白点写清楚后，后面的风格化才有地基。

### CGR-03 · 二级校色：局部提亮与局部压暗
- **中文片段**：`二级校色：只对{主体的面部与双手}做局部提亮并保住其中的皮肤纹理，对{画面四周边缘与背景杂物}做局部压暗形成自然的视线集中，局部与整体之间的亮度差不超过{约一档}，边缘没有可见的抠像光晕。`
- **英文片段**：`Secondary correction: lift only {the subject's face and hands} while preserving the skin texture inside them, and darken only {the frame edges and background clutter} so the eye concentrates naturally; the local-to-global brightness difference stays under {about one stop} and no masking halo is visible along the edges.`
- **适用**：两者
- **要点**：局部调整是 AI 视频最容易翻车的地方，务必写「只对某处」并给一个上限，别让它整体提亮。

### CGR-04 · 风格化：分离色调与 LUT 的文字描述法
- **中文片段**：`风格化用文字描述 LUT 效果而不是文件名：高光偏{青 / 冷蓝}、阴影偏{橙 / 暖褐}、中间调去饱和、对比压平，整体像一层极淡的双色滤镜贴在画面上，而不是把画面整体染成一种颜色。`
- **英文片段**：`Describe the look in words rather than by LUT name: highlights pulled {cyan / cool blue}, shadows pushed {orange / warm brown}, midtones desaturated, contrast flattened, the whole thing reading as a very thin duotone filter laid over the image rather than a wash of colour across it.`
- **适用**：两者
- **要点**：模型不认「某某 LUT」的文件名，只认这种逐带的描述；高光偏色、阴影偏色、中间调去饱和、对比压平四句一起写最稳。

### CGR-05 · 暗部控制：保留细节不死黑
- **中文片段**：`暗部保留细节、不死黑：画面最暗处仍能看出{材质纹理 / 头发与轮廓 / 环境结构的形状}，暗部整体偏{一点冷蓝 / 暖褐 / 青绿}而不是纯黑，暗部饱和度低于亮部，色块与噪点不结成一片。`
- **英文片段**：`Shadows hold detail and never go dead black: in the darkest areas you can still read {material texture / hair and silhouette / the shape of the surroundings}; the darks lean {slightly cool blue / warm brown / green-grey} instead of toward pure black, and shadow saturation sits below highlight saturation so no colour blocks or noise clumps form.`
- **适用**：两者
- **要点**：AI 视频默认把暗部推成纯黑，材质一秒钟变塑料；这一句必写。

### CGR-06 · 中间调控制：柔和过渡
- **中文片段**：`中间调柔和过渡：{人物皮肤与主要物体}的中间调保持柔和平顺、不出现硬跳的色阶断层，中间调整体略偏{暖米 / 冷灰}，饱和度维持在中等偏上，亮暗过渡处没有明显的分界带。`
- **英文片段**：`Midtones transition smoothly: the midtones of {the subject's skin and the principal objects} stay soft and continuous with no hard tonal banding, drift slightly {warm beige / cool grey} as a group, and hold moderate-to-high saturation without a visible boundary between the light and dark halves.`
- **适用**：两者
- **要点**：中间调决定「像不像照片」；补一句「无色阶断层」能压掉模型爱画的假 poster 渐变。

### CGR-07 · 亮部控制：不过曝且柔和滚降
- **中文片段**：`亮部不过曝、带柔和滚降：{窗户、灯泡、金属反光}等最亮处压缩到接近白但轮廓仍在，高光向四周柔和滚降而不是一刀切平，皮肤的高光保留血色、不烧成纯白。`
- **英文片段**：`Highlights never blow out and roll off softly: the brightest areas — {windows, bulbs, metal reflections} — compress to near-white while keeping their shape, the bright areas fall off gradually instead of clipping flat, and skin highlights keep their blood colour rather than burning to pure white.`
- **适用**：两者
- **要点**：硬切白是「视频感」的主要来源；写了滚降还要写「轮廓仍在」，否则模型会整块糊白。

### CGR-08 · 明暗三段式整句
- **中文片段**：`暗部保留细节不死黑，中间调柔和且保留皮肤血色，亮部不过曝并带柔和滚降，三段之间有一条连续的过渡而不是三块分离的色阶。`
- **英文片段**：`Shadows keep detail without going dead black, midtones stay soft and keep the blood colour in skin, highlights never blow out and roll off gently, and the three zones connect through one continuous transition rather than three separate bands of tone.`
- **适用**：两者
- **要点**：这是 AI 视频最常用的兜底句，任何镜头都可以直接粘；单独用这一句就能压掉八成的“AI 曝光感”。

### CGR-09 · 三件套：主色调 + 点缀色 + 中间调压低
- **中文片段**：`整体画面被{主色调，如青蓝}统一笼罩，{画面左下角一块暗红布幔 / 手里一盏橙色纸灯}是画面中唯一被允许的高饱和点缀，其余所有中间调统一压低并向主色调偏移，最终画面里只剩下主色调与点缀色两种颜色关系。`
- **英文片段**：`The whole frame is bathed in one dominant {teal-blue} tone, with {a deep crimson banner at the lower left / an orange paper lantern in the subject's hand} as the only permitted saturated accent; every other midtone is pushed down and pulled toward the dominant hue, so only two colour relations survive in the finished image.`
- **适用**：两者
- **要点**：这是调色视角的版本（区别于 COL-01 的构图视角）；「唯一」和「位置」两个词不能省。

### CGR-10 · 冷峻
- **中文片段**：`冷峻调色：整体欠曝约一档，色温偏冷，高光被压住不放，中间调去饱和并略偏{青灰}，对比偏硬，画面冷而干净，人物皮肤仍保留血色、不变成青绿。`
- **英文片段**：`A cold, severe grade: the image sits about a stop under, the colour temperature leans cool, highlights are held down rather than pushed, midtones desaturate and drift slightly {blue-grey}, contrast is firm, and the frame reads cold and clean while skin keeps its blood colour instead of turning green.`
- **适用**：两者
- **要点**：冷峻靠「欠曝 + 高光压住 + 中间调去饱和」，只写「冷色调」会得到偏蓝的普通照片。

### CGR-11 · 温暖
- **中文片段**：`温暖调色：色温整体偏{琥珀 / 蜂蜜}暖，高光带一点奶白但不发青，阴影里保留{深褐}的暖色而不出现冷蓝，中间调饱和度略提，画面暖而通透。`
- **英文片段**：`A warm grade: the overall colour temperature leans {amber / honey}, highlights carry a touch of creamy white without going cold, shadows keep a {deep brown} warmth instead of turning cold blue, midtone saturation lifts slightly, and the frame reads warm but clear rather than muddy.`
- **适用**：两者
- **要点**：写「阴影保留暖褐不发青蓝」是这一句的关键，模型默认会给冷阴影。

### CGR-12 · 怀旧（褪色低对比）
- **中文片段**：`怀旧褪色调色：所有颜色像被时间洗过一遍，{红、蓝}退成{砖红、土黄、灰蓝}，对比度压平、黑色提亮成{深褐}，整体饱和度降到约三分之二，颜色之间轻微互相渗染，边缘带一点点发黄的旧色偏。`
- **英文片段**：`A faded nostalgic grade: every colour looks washed by time, {reds and blues} fading toward {brick, ochre and dusty blue}, contrast flattened, blacks lifted to {deep brown}, overall saturation down to roughly two thirds, colours bleeding into one another slightly, with a faint yellowed cast toward the edges.`
- **适用**：两者
- **要点**：怀旧不是加棕滤镜，必须写「对比压平 + 黑色提亮 + 饱和度降到三分之二」这三个动作。

### CGR-13 · 惊悚
- **中文片段**：`惊悚调色：环境的暗部压成{冷青 / 病态绿}并保留少量可辨细节，肤色被抽掉部分红润、偏成{灰白 / 蜡黄}，整体饱和度偏低，只有{画面边缘一点血色红}作为不祥的强调。`
- **英文片段**：`A horror grade: the environment's shadows are crushed toward {cold cyan / sickly green} while keeping a little readable detail, skin loses some of its blood colour and shifts to {grey-white / waxy yellow}, overall saturation is low, and only {a single blood-red note at the edge of frame} serves as the ominous accent.`
- **适用**：两者
- **要点**：惊悚靠「环境色吃掉肤色」而不是靠黑；写一句低饱和就已经够狠，别叠更多风格词。

### CGR-14 · 梦幻
- **中文片段**：`梦幻调色：{柔粉、淡紫、雾蓝}的低饱和 pastel 色平铺在画面上，高光柔化成一片发光的雾并带轻微光晕，暗部也提到{浅灰紫}而不死黑，整体对比很低、边缘发软。`
- **英文片段**：`A dreamy grade: low-saturation pastels in {soft pink, pale violet and misty blue} laid across the frame, highlights blooming into a glowing haze with a slight halation, darks lifted to {pale grey-violet} instead of going black, contrast very low and every edge softened.`
- **适用**：两者
- **要点**：梦幻要靠「低对比 + 暗部抬亮 + 高光成雾」，高饱和的梦幻会变成糖果色。

### CGR-15 · 疏离
- **中文片段**：`疏离调色：整体去饱和到接近单色，皮肤保留{灰米 / 冷白}的低血色，环境被压成{青灰 / 冷蓝灰}的扁平色块，明暗对比偏弱，观者与人物之间像隔着一层。`
- **英文片段**：`A detached grade: saturation pulled down until the image is nearly monochrome, skin holding a low-blood {grey-beige / cool white}, the environment compressed into flat blocks of {blue-grey / cool grey-blue}, contrast weak, with the viewer held a layer away from the subject.`
- **适用**：两者
- **要点**：疏离不是黑白色；保留一点残色比抽成黑白更冷。

### CGR-16 · 脏乱
- **中文片段**：`脏乱调色：{阴影、地面、旧墙面}的暗部染上{污绿 / 灰褐}的脏色并带不均匀的色斑，中间调发灰不干净，饱和度低但颜色互相渗染出脏混的绿紫，整体像长期没人收拾的旧场地。`
- **英文片段**：`A grubby grade: the darks in {shadows, the floor and old walls} stained with {filthy green / grey-brown} and blotchy, uneven patches of colour, midtones grey and unclean, saturation low yet colours bleeding into a muddy green-violet, the whole place reading like a neglected site nobody has cleaned for years.`
- **适用**：两者
- **要点**：脏乱不是加噪点滤镜，而是「暗部有色斑、中间调发灰、颜色互相渗染」三件事。

### CGR-17 · 圣洁
- **中文片段**：`圣洁调色：{日光、烛光}的柔暖高光铺满画面，暗部被抬亮成{浅金 / 象牙}的暖灰，中间调几乎去饱和、只留下极淡的{奶白与淡金}，对比轻，光线柔和而无处不在。`
- **英文片段**：`A sanctified grade: soft warm highlights from {daylight or candlelight} spread across the whole frame, shadows lifted to a {pale gold / ivory} warm grey, midtones almost fully desaturated leaving only the faintest {cream and pale gold}, contrast light, the light soft and everywhere.`
- **适用**：两者
- **要点**：圣洁与梦幻的区别是它有明确的光源方向；补一句「{日光/烛光}」比写「神圣感」有效得多。

### CGR-18 · 压抑
- **中文片段**：`压抑调色：整体色温偏{冷绿 / 灰蓝}，高光被压得很少，画面大部分沉在{暗绿灰 / 深蓝灰}的中低明度里，中间调饱和度低、对比僵硬，人物与背景几乎同色，只剩轮廓可辨。`
- **英文片段**：`An oppressive grade: the colour temperature leans {cold green / grey-blue}, highlights are scarce, most of the frame sinks into the low and mid tones of {dark green-grey / deep blue-grey}, midtone saturation low and contrast rigid, the figure almost the same colour as the background so only the outline reads.`
- **适用**：两者
- **要点**：压抑靠「同色 + 少高光」制造；让人物与背景几乎同色是关键那一句。

### CGR-19 · 甜腻
- **中文片段**：`甜腻调色：{粉、奶橘、薄荷绿}的高饱和糖果色大面积平铺，阴影里也保留同色相只是变暗，高光带一层糖霜般的柔光晕，肤色偏{蜜桃粉}且高光泛红。`
- **英文片段**：`A syrupy sweet grade: high-saturation candy colour in {pink, milk orange and mint green} laid over large areas, shadows keeping the same hue but darker, highlights carrying a frosted glow, skin shifted toward {peach pink} with red in the highlights.`
- **适用**：两者
- **要点**：写「阴影里保留同色相」是防止画面变成贴纸式平涂的关键。

### CGR-20 · 纪实
- **中文片段**：`纪实调色：几乎不做风格化，白平衡贴近真实，饱和度保持中性偏低的自然水平，对比柔和但黑位扎实，既不抬黑也不做假高光，暗部保留真实杂色与噪点，肤色不做任何修饰。`
- **英文片段**：`A documentary grade: almost no stylisation, white balance close to true, saturation at a natural neutral-to-low level, contrast soft but the black point solid — no lifted blacks, no fake highlights — shadows keeping real colour noise and grain, and skin left completely untreated.`
- **适用**：两者
- **要点**：纪实调色 = 少即是多；写多了「真实」就消失了，只写白平衡、饱和度、噪点三条。

### CGR-21 · 复古胶片
- **中文片段**：`复古胶片调色：像{柯达 / 富士}彩色负片，高光带柔和的奶白滚降、暗部被抬起并偏{青褐}，红绿色向略偏{暖绿}、蓝黄色向略偏{青蓝}，画面覆一层细腻均匀的胶片颗粒，颜色饱满但不过饱和。`
- **英文片段**：`A vintage film grade, like {Kodak / Fuji} colour negative: highlights carrying a soft creamy roll-off, blacks lifted and pushed toward {cyan-brown}, the red-green axis leaning {warm green} and the blue-yellow axis leaning {cyan-blue}, a fine even film grain over the frame, colours full but never over-saturated.`
- **适用**：两者
- **要点**：复古胶片与怀旧不同：胶片颜色饱满、颗粒细、偏色是「交叉冲印感」，怀旧是褪色低对比。

### CGR-22 · 赛博霓虹
- **中文片段**：`赛博霓虹调色：环境沉进{深靛蓝与紫}的夜色，{洋红、青蓝}的霓虹只出现在发光体与湿地面反光上、占画面很小面积，皮肤保持中性偏冷的真实色而不被霓虹染透，暗部仍有细节不死黑。`
- **英文片段**：`A cyber-neon grade: the environment sunk into a {deep indigo and violet} night, {magenta and cyan} neon appearing only on the light sources themselves and their reflections on wet ground, covering a small fraction of the frame, skin held at a neutral-cool true colour instead of being dyed by the neon, shadows still holding detail.`
- **适用**：两者
- **要点**：霓虹色只允许出现在发光体和反射里；否则整张脸会变成塑料洋红。

### CGR-23 · 黑白
- **中文片段**：`黑白调色：画面中没有任何彩色残留，只有一整套从纯黑到纯白的连续灰阶，{红衣、霓虹招牌、绿植}等彩色物体也完全拍成灰度，依靠明暗与质感而不是颜色区分前后景，高光柔和滚降不刺眼。`
- **英文片段**：`A black-and-white grade with no colour residue whatsoever: one continuous scale from pure black to pure white, with {a red coat, a neon sign, greenery} also rendered fully in greyscale, subject and background separated by tone and texture rather than by hue, and highlights rolling off gently without glaring.`
- **适用**：两者
- **要点**：一定要写「没有任何彩色残留」并点名会被拍成灰度的彩色物体，否则模型会给你低饱和彩色。

### CGR-24 · 胶片曲线与色彩分离
- **中文片段**：`胶片曲线：亮部压成柔和滚降而不是硬切白，暗部被抬起离开纯黑并向{青 / 冷蓝}偏一点，高光向{黄 / 奶白}偏一点，色彩分离表现为{红绿轴向黄绿偏、蓝黄轴向橙偏}，画面仍保有可读的对比。`
- **英文片段**：`A film curve: highlights compressed into a soft roll-off rather than a hard clip, blacks lifted off pure black and pushed slightly {cyan / cool blue}, highlights pushed slightly {yellow / creamy}, the colour separation reading as {the red-green axis leaning yellow-green and the blue-yellow axis leaning orange}, with the image keeping readable contrast.`
- **适用**：两者
- **要点**：另一种分离方向是「青蓝阴影 + 黄暖高光」，更接近交叉冲印；不确定时用这一版，模型执行得更稳。

### CGR-25 · 卤化银感与颗粒分布
- **中文片段**：`胶片颗粒与卤化银感：颗粒细小且分布不均，主要集中在{暗部与中间调}、亮部几乎看不到颗粒，画面亮边有一圈极淡的{红色光晕}（halation）而不是锐利的白色硬边，整体保留化学感而不是数码锐利。`
- **英文片段**：`Film grain and a silver-halide feel: grain fine and unevenly distributed, concentrated in {the shadows and midtones} and almost absent from the highlights, a faint {red halation} ringing the bright edges instead of a crisp white edge, the whole frame keeping a chemical feel rather than digital sharpness.`
- **适用**：两者
- **要点**：写清「颗粒在暗部、亮部没有」比只写「胶片颗粒」有效，模型才不会给全画面糊一层噪点。

### CGR-26 · 邻近色、单色无彩与跳色点缀
- **中文片段**：`配色逻辑三选一：{邻近色——琥珀、橙、褐一组相邻色相构成画面主体层次}；{单色无彩——只保留{青}一种色相，用它的明暗变化构成全部层次}；{跳色点缀——画面右上角一小块{品红}是全场唯一的高饱和点，其余全部压成中性灰}。`
- **英文片段**：`Pick one of three colour logics: {analogous — amber, orange and brown as adjacent hues building the layers of the frame}; {achromatic single hue — only {cyan} survives, with its value changes forming every other layer}; {a single jumping accent — one small {magenta} patch at the upper right is the only saturated colour in the image, everything else pushed to neutral grey}.`
- **适用**：两者
- **要点**：三种是互斥方案，一次只能选一个；跳色方案要写「只有一处」。

### CGR-27 · 互补色对比与分裂补色
- **中文片段**：`互补色对比：{青蓝阴影与暖橙亮部}、{紫罗兰与暖黄}或{深红与青绿}两组相对色相分居画面的暗侧与亮侧、互不混合；分裂补色则在主色之外加入其相邻的两侧色相（{暖肤色主调配青蓝与紫罗兰}），对比更柔和、不显做作。`
- **英文片段**：`Complementary contrast: two opposed hues — {cyan-blue shadows against warm orange highlights}, {violet against warm yellow}, or {deep red against teal} — split across the dark and bright sides of the frame and never blending into each other; split-complementary instead adds the two neighbours of the opposite hue to the base ({a warm skin-tone key with cyan and violet}), giving a softer, less self-conscious contrast.`
- **适用**：两者
- **要点**：互补色必须说清「哪组色在暗侧、哪组在亮侧」；分裂补色适合想要暖肤色主调的场景。

### CGR-28 · 肤色保护
- **中文片段**：`肤色保护：{人物皮肤}的色相始终锁在自然肤色范围内，不因环境光偏绿也不因暖光偏橙，暖光下的皮肤仍然可信、红润可辨，面部高光不烧成纯白，暗部保留血色与纹理、不糊成一团黑。`
- **英文片段**：`Skin protection: {the subject's skin} stays locked inside the natural skin range, shifting neither green under the ambient light nor orange under the warm one, so skin lit warmly still reads believable and blood-coloured; facial highlights never burn to pure white, and the shadows keep their colour and texture instead of clotting into a black mass.`
- **适用**：两者
- **要点**：AI 视频最常见的翻车是绿色皮肤与橙色塑料皮肤，这一句要逐镜粘贴，不能只写在场景说明里。

### CGR-29 · 跨镜色彩一致性
- **中文片段**：`跨镜色彩一致：同一场戏的每个镜头使用同一套色温、同一对比与同一饱和度，整体亮度、饱和度与对比在镜头之间保持一致，不因景别变化而忽明忽暗、忽冷忽暖，切换时只有构图与主体变化，色彩不发生跳变。`
- **英文片段**：`Cross-shot colour consistency: every shot in the same scene uses one identical colour temperature, one contrast and one saturation level, with overall brightness, saturation and contrast held constant from shot to shot so nothing goes suddenly dark, suddenly bright or suddenly cold as the shot size changes; only the framing and the subject change between cuts, never the colour.`
- **适用**：两者
- **要点**：这一句要逐镜原样粘贴，不能改写、不能换词；改写就是色彩漂移的开始。

### CGR-30 · 反 AI 味调色
- **中文片段**：`反 AI 味调色：避免{整体过饱和的糖果色、塑料感的冷蓝、假 HDR 的局部高对比、脏到发灰的阴影、廉价的橙青滤镜、通体均匀而没有明暗层次}，饱和度控制在中等、阴影里的饱和度更低，暗部保留真实杂色与噪点，画面只有一两个区域被明确照亮，其余角落自然沉入暗部。`
- **英文片段**：`Anti-AI grading: avoid {over-saturated candy colour, plastic cold blue, fake-HDR local contrast, muddy grey-brown shadows, cheap orange-and-teal filtering, and an evenly lit frame with no tonal hierarchy}; keep saturation moderate and lower in the shadows, let the darks carry real colour noise and grain, and allow only one or two areas of the frame to be clearly lit while the remaining corners fall naturally into darkness.`
- **适用**：两者
- **要点**：这段可作为负面约束的调色面使用；「只有一两个区域被明确照亮」是压掉广告感的关键。

## 排错提示

- 调色词不是越多越好：一条提示里叠三个以上的风格描述（青橙 + 胶片 + 褪色 + 颗粒），模型会把它们平均成一团米色雾。定一条主风格，其余只作为修饰。
- 顺序错了必翻车：先写风格化再想校正，模型会把偏色当成原始画面；永远是「校色 → 局部 → 风格化 → 跨镜对齐」。
- 局部调整（提亮/压暗）不写清作用对象和上限，模型会整体提亮，画面立刻变成宣传照；写「只对 X」并给「约一档」的差值。
- 只写「电影感调色」「高级色调」模型无从执行，必须换成「高光偏青、阴影偏橙、中间调去饱和、对比压平」这种逐带描述。
- 肤色要单独点名。环境偏色一旦写重（冷青、病态绿），模型会连带把皮肤染成同色；写一句「皮肤锁在自然肤色范围内」比降低环境饱和度更有效。
- 跨镜一致性靠逐镜粘贴同一句，而不是在场景说明里写一次；景别一变模型就会重设曝光，加上「整体亮度、饱和度与对比保持一致」才拉得住。
- 暗部与亮部必须两头写。只压暗部得到的是脏片，只提亮部得到的是假 HDR；「暗部保留细节不死黑 + 亮部柔和滚降」两句要一起出现。
- 颗粒、光晕、bloom 这类质感词别当滤镜下：写清「颗粒集中在暗部、亮部几乎没有」「亮边是淡红光晕而不是白色硬边」，否则模型给的是全画面糊噪点和数码感光晕。
