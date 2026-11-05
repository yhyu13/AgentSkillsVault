---
id: lighting
title: 光线
dimension: 光线
applies_to: [H3, Seedance2.5]
model_field: H3 → integrated_multimodal_description ｜ Seedance 2.5 → 第 5 段「光线与色彩」
---

# 光线

> **装配位置**：H3 → integrated_multimodal_description ｜ Seedance 2.5 → 第 5 段「光线与色彩」
> **一句话用法**：先定光源在哪、什么色、多硬，再定方向与光比；每写一条光线就问「这束光在画面里有对应的可见来源吗」，没有来源的光一律不写。

## 片段

### LIT-01 · 正午硬光
- **中文片段**：`正午顶光直射（hard overhead sunlight），在{主体}脚下压出短而边缘锐利的深色阴影，白色表面高光过曝，缝隙里全是死黑的阴影。`
- **英文片段**：`Hard overhead midday sun casting short, sharply-edged dark shadows beneath {subject}, blown highlights on white surfaces and dead-black shadow pockets in the creases.`
- **适用**：两者
- **要点**：正午写「顶光 + 硬边短影」这一组就够，别再叠加柔光；想减冲击就换成 LIT-03 阴天柔光。

### LIT-02 · 黄金时刻低角度暖光
- **中文片段**：`黄金时刻的低角度斜阳（golden hour side light）从画面{左/右}后方斜切进来，给{主体}镀上一层金红色轮廓光（warm rim light），暗部仍保留冷蓝色的环境反射光。`
- **英文片段**：`Low golden-hour sun raking in from the {left/right} rear, wrapping {subject} in a warm amber rim light while the shadows hold a cool blue ambient bounce.`
- **适用**：两者
- **要点**：黄金时刻的关键是「暖轮廓光 + 冷环境补光」的冷暖分离，单写“暖光”会拍成一团橙色。

### LIT-03 · 蓝调时刻
- **中文片段**：`蓝调时刻（blue hour）的深冷天光笼罩{场景}，远处天空残留一抹淡青，街灯刚亮成暖黄，冷暖两种光源在{主体}身上形成柔和过渡。`
- **英文片段**：`Deep blue-hour twilight enveloping {scene}, a faint cyan glow left in the distant sky as street lamps just flicker on to warm yellow, warm and cool sources blending softly across {subject}.`
- **适用**：两者
- **要点**：蓝调时刻的画面亮度天然偏低，写提示词时补一句「低对比但主体可辨」，否则模型容易全黑。

### LIT-04 · 阴天漫射柔光
- **中文片段**：`阴天的均匀漫射光（overcast diffuse light）笼罩{主体}，没有明显的投影方向，皮肤和材质上的高光柔和摊开，整体反差偏低、影子浅淡。`
- **英文片段**：`Flat overcast diffuse light bathing {subject}, no directional shadow, highlights spread softly across skin and material, overall low contrast with pale washed-out shadows.`
- **适用**：两者
- **要点**：阴天=柔光+低反差+无硬影；想同时要硬影和大反差就会互相打架。

### LIT-05 · 侧向窗光
- **中文片段**：`一束侧向的窗光（sidelight through a window）从画面左侧斜射进来，在{主体}的{左/右}半边脸形成明确的受光区与阴影区分隔线，另一侧自然沉入暗部。`
- **英文片段**：`A shaft of window sidelight raking in from frame left, splitting {subject}'s face into a lit plane and a shadow plane with a crisp terminator between them.`
- **适用**：两者
- **要点**：窗光要写「有几扇窗/窗的方向」，不写方向模型就会给正面平光。

### LIT-06 · 霓虹招牌光
- **中文片段**：`{颜色}霓虹招牌（neon sign glow）从画面外侧向{主体}打上饱和的彩色边缘光（colored rim light），招牌本体在背景中保持可见并轻微闪烁。`
- **英文片段**：`A {color} neon sign washing {subject} in a saturated colored rim light from off-frame, the sign itself visible in the background with a faint flicker.`
- **适用**：两者
- **要点**：霓虹片段里颜色词必须写具体（洋红、青），泛泛写「霓虹灯」模型通常只给白光边。

### LIT-07 · 实用光源入画
- **中文片段**：`画面内的{台灯/吊灯/路灯/电视}作为实景光源（practical light source）真实发光并在{主体}脸上留下方向明确的小范围高光，周围环境随光源亮度自然衰减为暗调。`
- **英文片段**：`An in-frame {lamp / streetlight / television} acting as a practical light source, glowing for real and laying a small directional highlight on {subject}'s face as the room falls off into darkness around it.`
- **适用**：两者
- **要点**：实景光源（practical）要同时写「发光本体可见」和「它对人物的影响」，缺一不可。

### LIT-08 · 柔光箱影棚光
- **中文片段**：`大型柔光箱（softbox）在镜头左前方 45 度补光，均匀照亮{主体}面部，几乎不产生硬影，背景用纯黑吸光布压成深灰。`
- **英文片段**：`A large softbox at 45 degrees front-left giving even, shadow-free light across {subject}'s face, with the background swallowed to deep grey by a black flag.`
- **适用**：两者
- **要点**：影棚光必写「柔光箱」而不是「柔光」，否则模型可能理解成后期柔化。

### LIT-09 · 烛火与火焰
- **中文片段**：`{蜡烛/篝火/炉火}的暖橙色跳动的火光（flickering warm firelight）作为唯一光源，亮度随火焰起伏缓慢变化，在{主体}脸上投出摇晃的暖影，颜色随距离迅速衰减到近黑。`
- **英文片段**：`A {candle / campfire / furnace} as the sole source, its warm orange flicker rising and falling, throwing wavering warm shadows across {subject}'s face and dying to near-black just a short distance out.`
- **适用**：两者
- **要点**：火光要写「唯一光源」，否则模型会补一盏环境光，火焰的明暗节奏就丢了。

### LIT-10 · 屏幕光
- **中文片段**：`电脑/手机屏幕的冷白屏幕光（screen glow）从下方照亮{主体}的脸，屏幕内容随节奏变化让脸上明暗不断跳动，眼镜片上反射出淡淡的矩形高光。`
- **英文片段**：`Cold bluish screen glow from a laptop/phone lighting {subject}'s face from below, the on-screen content making the brightness pulse, faint rectangular highlights reflected in their eyeglass lenses.`
- **适用**：两者
- **要点**：屏幕光是典型底光，要明确写「从下方」，否则容易被当成正面光。

### LIT-11 · 车灯扫过
- **中文片段**：`远处车灯（headlight sweep）从画面深处扫过来，白色光柱短暂掠过{主体}与地面，扫过后画面重新回到只有环境微光的昏暗。`
- **英文片段**：`A distant headlight sweep raking across {subject} and the ground, a white beam passing briefly before the scene falls back to ambient dusk darkness.`
- **适用**：两者
- **要点**：车灯是「时间性事件光」，要写清楚扫过—消失的顺序，别只写“有车灯”。

### LIT-12 · 逆光与轮廓
- **中文片段**：`强烈的逆光（backlight）从{主体}正后方射来，把{主体}压成一片深色剪影，只留发丝和肩线上一圈发亮的轮廓光（glowing rim），正面靠微弱环境光辨认。`
- **英文片段**：`Strong backlight directly behind {subject}, reducing them to a dark silhouette with a glowing rim along the hair and shoulders, the front readable only by faint ambient fill.`
- **适用**：两者
- **要点**：逆光片必须补一句「正面靠微弱环境光辨认」，否则模型会把人物拍成全黑一块。

### LIT-13 · 侧逆光
- **中文片段**：`侧逆光（rim side light）从{主体}的{左/右}后方约 135 度切入，在脸上一侧勾出细亮边，另一侧大面积落入阴影，形成强烈的面部立体感。`
- **英文片段**：`Rim light entering about 135 degrees from the {left/right} rear, tracing a thin bright edge down one side of the face while the other side falls deep into shadow.`
- **适用**：两者
- **要点**：侧逆光是写「轮廓+阴影面」的成对描述，只写轮廓模型往往补不出暗面。

### LIT-14 · 顶光与底光
- **中文片段**：`{顶光/底光}：光线从{上方/下方}垂直压下，眼窝和{主体}的颧骨下方形成深陷阴影，颧骨和鼻梁顶端被点亮，产生强烈的雕刻感。`
- **英文片段**：`{Top / under} lighting pressing straight {down / up}, hollowing the eye sockets and the underside of the cheekbones while catching the tops of the cheekbones and nose bridge in sharp relief.`
- **适用**：两者
- **要点**：底光是恐怖/悬疑常用，写的时候务必写明「向上照」，模型对方向词敏感。

### LIT-15 · 伦勃朗光
- **中文片段**：`伦勃朗光（Rembrandt lighting）——主光在镜头左上方 45 度，{主体}背光侧脸颊上形成一块倒三角形的亮斑（signature triangle of light），暗侧眼睛仍留一点反光。`
- **英文片段**：`Rembrandt lighting with the key at 45 degrees above camera left, leaving the classic triangle of light on the shadow-side cheek while the shadowed eye still holds a catchlight.`
- **适用**：两者
- **要点**：必须写出「倒三角亮斑」这个几何特征，只写“伦勃朗光”模型可能理解成普通侧光。

### LIT-16 · 影棚三点布光
- **中文片段**：`三点布光（three-point lighting）——主光（key）塑形、补光（fill）压暗面反差到约{1:2}~{1:4}、轮廓光（back/rim）把{主体}从背景中分离出来，背景单独打光形成干净的明度层次。`
- **英文片段**：`Three-point lighting: a shaping key, a fill dropping contrast to roughly {1:2}~{1:4}, and a back light separating {subject} from the background, with the backdrop lit separately to keep clean tonal separation.`
- **适用**：两者
- **要点**：写光比数值是给模型的最强约束之一，比写「反差柔和」有效得多。

### LIT-17 · 体积光与丁达尔
- **中文片段**：`清晨的雾气中穿过缝隙的体积光（volumetric light beams / god rays），一道道明确的光柱在空气中可见，尘埃颗粒在光柱里缓慢漂浮。`
- **英文片段**：`Volumetric god rays cutting through morning haze in distinct visible shafts, dust motes drifting slowly inside the beams.`
- **适用**：两者
- **要点**：体积光需要「空气中有雾/尘」这个前提，写上它，模型才会画出可见光柱而不是普通轮廓光。

### LIT-18 · 湿地面与雨夜反射
- **中文片段**：`雨夜的湿沥青地面（wet asphalt reflections）把{霓虹招牌/路灯/车灯}的倒影拉成长长的彩色光带，雨水表面不断被涟漪打碎，倒影边缘抖动变形。`
- **英文片段**：`Rain-slick asphalt stretching neon and street-lamp reflections into long smeared ribbons of color, the surface continually broken by ripples so the reflections shudder and warp.`
- **适用**：两者
- **要点**：雨夜片要把「反射源」写出来（反射的是谁的灯），否则模型只会给一片灰地。

### LIT-19 · 水面与玻璃反射
- **中文片段**：`{水面/玻璃/镜面}上出现清晰的镜面倒影（mirror reflection），{主体}的倒影与实体同时存在，水面轻微起伏让倒影产生细碎的横向扭曲。`
- **英文片段**：`A mirror reflection on {water / glass / polished floor} with {subject}'s inverted image present alongside the real figure, small surface undulations breaking the reflection into fine lateral distortion.`
- **适用**：两者
- **要点**：写倒影时把倒影与实体同时入画，是给模型“对称构图”的关键提示。

### LIT-20 · 有动机的光
- **中文片段**：`场景中每一束光都必须有画面内可见的来源——{窗户/路灯/霓虹招牌/电视/篝火}在画面中实际可见并正在发光，人物的受光方向与这些光源的相对位置严格一致。`
- **英文片段**：`Every light in the scene must be motivated by a visible in-frame source — a {window / streetlamp / neon sign / screen / fire} that is actually seen and glowing, with the lighting on {subject} strictly consistent with those sources' positions.`
- **适用**：两者
- **要点**：这是本维度的总原则，放在最后一条作为兜底检查；模型对“看不见的光源”会自行编造不一致的方向。

## 排错提示

- 光源方向写「从前面照亮」而不写角度，模型会给正面平光；尽量给「左/右/后、几度、高度」。
- 逆光、剪影不写环境补光，人物会糊成黑块，至少补一句「轮廓光 + 微弱环境光可辨面部」。
- 柔光/硬光只写中文「柔」易被理解成后期高斯模糊，必须点名柔光箱、阴天漫射、烛火跳动等具体来源。
- 同时写「阴天柔光」和「强烈硬边阴影」是自相矛盾的指令，二选一。
- 霓虹、车灯、屏幕光必须绑定颜色和出现顺序，否则会退化成白光或一直亮着不变。
- 影棚布光不给光比数字（1:2、1:4）时，模型默认反差过大，面部容易死黑或死平。
- 体积光、湿反射、玻璃倒影都属于“依赖介质的画面元素”，缺了雾/水/玻璃这些前提条件就会整个消失。
