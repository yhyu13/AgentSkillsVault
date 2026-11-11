---
id: style-texture
title: 风格与质感
dimension: 风格与质感
applies_to: [H3, Seedance2.5]
model_field: H3 → integrated_multimodal_description ｜ Seedance 2.5 → 第 5 段「光线与色彩」（风格质感部分）
---

# 风格与质感

> **装配位置**：H3 → integrated_multimodal_description ｜ Seedance 2.5 → 第 5 段「光线与色彩」（风格质感部分）
> **一句话用法**：先定一种「影像质地」当底色，再叠加 1~2 条质感特效（颗粒/光晕/虚化/运动模糊/皮肤纹理），最多不要超过三种风格标签，否则互相打架。

## 片段

### STY-01 · 电影感
- **中文片段**：`电影感（cinematic）的画面：宽银幕比例的构图、柔和自然肤色、浅景深（shallow depth of field）让{背景}化为柔和虚化、整体色彩克制不艳俗。`
- **英文片段**：`Cinematic framing with a widescreen composition, soft natural skin tones, shallow depth of field dissolving {background} into soft blur, and a restrained, never garish palette.`
- **适用**：两者
- **要点**：「电影感」本身是空泛标签，必须拆成构图比例 + 肤色 + 虚化 + 色彩克制四个可执行项。

### STY-02 · 纪实抓拍
- **中文片段**：`纪实风格（documentary realism）的画面：不打光的自然现场光、未经摆布的抓拍瞬间、构图略微随意偏斜，保留真实的空间杂乱感。`
- **英文片段**：`Documentary realism: available natural light, an unstaged caught moment, slightly off-balance casual framing, and the genuine clutter of the real space left untouched.`
- **适用**：两者
- **要点**：纪实要求“别把一切弄整齐”，可以补一句「不摆拍、不追求对称」，否则模型会自动构图化。

### STY-03 · 纪录片手持
- **中文片段**：`手持纪录片质感（handheld documentary camera）：轻微而持续的画面晃动（handheld micro-shake）、随呼吸的缓慢浮动、对焦偶尔轻微失焦再拉回，整体像跟拍。`
- **英文片段**：`Handheld documentary camera feel: constant low-level sway, slow breathing float, focus that briefly slips and then recovers, the whole thing reading as a following shot.`
- **适用**：两者
- **要点**：写「轻微」很关键；写“剧烈晃动”模型会给出灾难片式甩镜。

### STY-04 · 35mm 胶片
- **中文片段**：`35mm 电影胶片质感（35mm film stock）：细腻均匀的胶片颗粒（film grain）分布在暗部与中间调，肤色饱满不塑料，高光柔化滚降，带极轻微的卤化银质感。`
- **英文片段**：`35mm film stock texture: fine even film grain sitting in the shadows and midtones, rich non-plastic skin tones, gently rolled-off highlights with a faint silver-halide texture.`
- **适用**：两者
- **要点**：写颗粒要指定分布位置（暗部和中间调），颗粒铺满全画面反而像数字噪点。

### STY-05 · 16mm 家用 DV
- **中文片段**：`16mm 家用 DV 画质（home video / camcorder look）：偏软的低对比画面、可见的粗大颗粒、轻微色偏与拖影，边缘画质下降，暗部有CCD式的偏色噪点。`
- **英文片段**：`Home-video 16mm camcorder look: soft low-contrast rendering, coarse visible grain, a slight color cast and smear, edge detail falling off and CCD-style chroma noise in the shadows.`
- **适用**：两者
- **要点**：写“16mm”时模型常给专业 16mm 电影感；补“家用 DV/CCD 噪点/边缘变软”才是真的业余感。

### STY-06 · IMAX 大画幅
- **中文片段**：`IMAX 大画幅影像（large-format IMAX look）：极高细节密度、几乎察觉不到噪点的干净画面、极浅景深配合宽银幕，加上宏大的空间尺度感。`
- **英文片段**：`Large-format IMAX look: very high detail density, a clean image with almost no visible noise, extremely shallow depth of field on a wide screen, and a palpable sense of monumental scale.`
- **适用**：两者
- **要点**：大画幅片应同时给“细节密度高”和“景深极浅”，两者是配套的。

### STY-07 · 赛博朋克
- **中文片段**：`赛博朋克（cyberpunk）美学：密集的全息广告牌与霓虹灯管、湿漉漉的反光街道、层层叠叠的巨型企业招牌，画面信息繁复但主体清晰可辨。`
- **英文片段**：`Cyberpunk aesthetic: dense holographic billboards and neon tubes, rain-wet reflective streets, stacked megacorporate signage, an information-dense frame that still keeps the subject clearly readable.`
- **适用**：两者
- **要点**：赛博朋克靠“密度”成立，写完装饰物要补一句主体清晰，否则模型会让画面糊成一团光。

### STY-08 · 故障风
- **中文片段**：`故障风（glitch aesthetic）：画面出现水平撕裂条带、RGB 色差分离、局部色块压缩失真与信号跳帧，像损坏的数字传输画面。`
- **英文片段**：`Glitch aesthetic: horizontal tearing bands, separated RGB channels, localized block compression artifacts and dropped frames, like a corrupted digital transmission.`
- **适用**：两者
- **要点**：故障风只适合局部或短促出现，写成“整段画面都在坏”会让人无法看清内容。

### STY-09 · 蒸汽波
- **中文片段**：`蒸汽波（vaporwave）美学：粉紫与薄荷绿的柔和渐变、复古Windows 界面元素、栅格化的透视网格地平线、慢速漂浮的希腊雕塑与 VHS 失真感。`
- **英文片段**：`Vaporwave aesthetic: soft pink-purple and mint-green gradients, retro desktop UI elements, a gridded perspective horizon, slowly drifting classical busts, and VHS-style analog distortion.`
- **适用**：两者
- **要点**：蒸汽波的标志是“渐变+网格地平线+石膏像”，三者写全才不会跑成普通复古。

### STY-10 · 极简工业
- **中文片段**：`极简工业风（minimal industrial）：裸露的混凝土与哑光金属结构、大面积留白、单一主光源造出清晰的几何阴影，没有任何装饰性杂物。`
- **英文片段**：`Minimal industrial: bare concrete and matte metal structure, large expanses of negative space, one key light carving clean geometric shadows, zero decorative clutter.`
- **适用**：两者
- **要点**：极简靠“减少”成立，务必写出「大面积留白」和「无装饰」，否则模型会塞满道具。

### STY-11 · 日系动画
- **中文片段**：`日系动画质感（Japanese anime style）：干净的赛璐璐上色、明确的深色描边、简化的背景层次与柔和渐变天空，角色眼睛清澈高亮。`
- **英文片段**：`Japanese anime style: clean cel shading with crisp dark linework, simplified layered backgrounds and soft gradient skies, luminous clear anime eyes.`
- **适用**：两者
- **要点**：写成「日系动画」时务必带“描边/赛璐璐”，否则模型可能给 3D 渲染的日式风格。

### STY-12 · 欧美动画
- **中文片段**：`欧美动画质感（Western animation style）：夸张的造型比例、饱和厚涂上色、富有弹性的动作节奏与表演，画面线条粗犷有力。`
- **英文片段**：`Western animation style: exaggerated shapes and proportions, rich saturated painterly coloring, elastic pacing and expressive character acting, bold confident line work.`
- **适用**：两者
- **要点**：欧美动画的辨识度在“造型夸张 + 厚涂”，写“皮克斯风”模型会直接走 3D，两者别混。

### STY-13 · 3D 皮克斯风
- **中文片段**：`3D 动画渲染质感（stylized 3D animated look）：圆润的次表面散射皮肤、柔和全局光照与色彩渐变的间接光、毛发与布料用真实物理模拟，整体呈温暖家庭电影的观感。`
- **英文片段**：`Stylized 3D animated render: rounded subsurface-scattering skin, soft global illumination with color-graded bounce light, physically simulated hair and cloth, reading as a warm family-film look.`
- **适用**：两者
- **要点**：想区分“皮克斯”与“写实 3D 渲染”，就加“次表面散射 + 夸张头身比”。

### STY-14 · 水墨国风
- **中文片段**：`水墨国风（Chinese ink wash painting）质感：宣纸底色的留白、浓淡干湿变化的墨色晕染、飞白与枯笔的飞白肌理，远山以淡墨层层退远，整体气韵生动。`
- **英文片段**：`Chinese ink-wash aesthetic: negative space on raw rice-paper ground, ink tones shifting from dense to dry and wet, flying-white dry-brush texture, distant mountains receding in progressively paler ink.`
- **适用**：两者
- **要点**：水墨风的灵魂是留白与墨色层次，不要同时写“厚涂写实”，会互相抵消。

### STY-15 · 油画
- **中文片段**：`油画质感（oil painting）：可见的厚涂颜料堆积与笔触走向、亚麻画布的织物纹理透出、边缘因颜料厚薄产生的自然融合，颜色深沉浓郁。`
- **英文片段**：`Oil painting texture: visible impasto build-up and directional brushwork, the woven linen canvas showing through, edges softly merging where paint thins, colors deep and rich.`
- **适用**：两者
- **要点**：油画要写“画布尺寸 + 笔触方向”，例如“横向笔触的风景油画”，否则容易变数字插画。

### STY-16 · 水彩
- **中文片段**：`水彩质感（watercolor）：纸纹清晰可见、颜料边缘自然晕开形成水痕（blooms）、颜色透明叠色而底层仍透出，整体明亮轻盈。`
- **英文片段**：`Watercolor texture: clearly visible paper grain, pigment edges blooming into soft tide marks, transparent layered washes letting the layer beneath show through, overall light and airy.`
- **适用**：两者
- **要点**：水彩与水墨都靠“透”，区别在水彩有水痕与纸纹、油墨有厚涂，特征要写对。

### STY-17 · 赛璐璐动画
- **中文片段**：`赛璐璐动画质感（cel animation）：硬边平涂色块、二值化的明暗交界线、明确的高光色块与阴影色块，画面像逐帧手绘上色的动画。`
- **英文片段**：`Cel-animated look: flat hard-edged color areas, a binary terminator between light and shadow, distinct highlight and shadow blocks, as if hand-painted frame by frame.`
- **适用**：两者
- **要点**：赛璐璐与手绘水彩风的差别在“硬边平涂”，一定要强调没有渐变过渡。

### STY-18 · 像素与 8-bit 复古游戏
- **中文片段**：`8-bit 像素游戏画面（8-bit pixel art retro game）：严格的低分辨率像素网格、有限调色板、每帧逐格绘制、无抗锯齿，角色行走时呈逐格跳动的定格动画感。`
- **英文片段**：`8-bit pixel-art retro game visuals: a strict low-resolution pixel grid, a limited palette, every frame drawn cell by cell with no anti-aliasing, motion reading as chunky sprite stepping.`
- **适用**：两者
- **要点**：像素风要写“无抗锯齿”，模型默认会做平滑，反而失去像素感。

### STY-19 · 黑白银盐
- **中文片段**：`黑白银盐胶片（black and white silver-halide film）：纯粹的单色影调、丰富的灰阶层次、细腻颗粒在中间调最明显，高光柔化不死白，阴影保留细节。`
- **英文片段**：`Black-and-white silver-halide film: a purely monochrome tonal scale, rich gradation, fine grain most visible in the midtones, gently rolled highlights and detail retained in the shadows.`
- **适用**：两者
- **要点**：黑白片不要只写“黑白”，给“灰阶层次丰富、中间调有颗粒”，否则会变成生硬的高反差黑白。

### STY-20 · 高对比时尚大片
- **中文片段**：`高对比时尚大片质感（high-contrast editorial fashion）：硬光打出强烈明暗块面、背景纯净、造型与材质细节锐利、整体像杂志大片（editorial magazine）版面。`
- **英文片段**：`High-contrast editorial fashion: hard light carving bold blocks of light and shadow, a clean background, razor-sharp styling and material detail, reading like a magazine spread.`
- **适用**：两者
- **要点**：时尚大片靠“硬光 + 纯净背景 + 锐利细节”，加上比例与姿态描述会更像版面。

### STY-21 · 社媒竖屏短视频
- **中文片段**：`社媒竖屏短视频质感（vertical social media clip）：9:16 竖构图、节奏轻快、色彩明亮讨喜、轻微的镜头手持感与快速变焦，整体像手机随手拍发布的内容。`
- **英文片段**：`Vertical social-media clip: a 9:16 frame, quick pacing, bright crowd-pleasing color, a touch of handheld sway and fast digital zooms, reading as phone-shot content ready to post.`
- **适用**：两者
- **要点**：竖屏片一定要在片段里写明 9:16，否则模型可能仍按横屏构图。

### STY-22 · 3D 产品渲染
- **中文片段**：`3D 产品渲染质感（CGI product render）：干净精确的表面反射与各向异性高光、亚光与镜面材质对比、完美的边缘倒角、无噪点的中性影棚环境与柔和接触阴影。`
- **英文片段**：`CGI product render: crisp accurate surface reflections and anisotropic highlights, a contrast between matte and mirror finishes, perfect edge bevels, a noise-free neutral studio environment with soft contact shadows.`
- **适用**：两者
- **要点**：产品渲染强调“边缘倒角 + 接触阴影”，这两点决定质感可信度。

### STY-23 · 黏土定格
- **中文片段**：`黏土定格动画质感（claymation stop-motion）：可见指纹与捏塑痕迹的软陶表面、逐格跳动的动作节奏、微缩布景的浅景深、略过饱和的实拍材质感。`
- **英文片段**：`Claymation stop-motion: soft modeling-clay surfaces showing fingerprints and press marks, movement advancing in discrete increments, shallow focus across a miniature set, slightly oversaturated real-material texture.`
- **适用**：两者
- **要点**：黏土风的关键是“手工痕迹 + 逐格跳动”，加上这两点才不会被渲染成普通 3D。

### STY-24 · 羊毛毡手作
- **中文片段**：`羊毛毡手作质感（needle-felted wool craft）：毛毡纤维清晰可见的绒面表面、手工缝制的粗糙针脚、柔和无锐边的圆润造型，像定格动画中的手作场景。`
- **英文片段**：`Needle-felted wool craft: a fuzzy nap with individual fibers clearly readable, chunky hand-stitched seams, soft rounded forms with no sharp edges, like a handmade set in a stop-motion film.`
- **适用**：两者
- **要点**：羊毛毡与黏土要区分：毡是纤维绒面、黏土是压塑痕迹，写混了质感就错。

### STY-25 · 胶片特效四件套
- **中文片段**：`叠加胶片特效：细密胶片颗粒（film grain）、强光穿过镜头产生的镜头光晕（lens flare）、画面边缘的轻微色差（chromatic aberration）、高速运动留下的运动模糊（motion blur）。`
- **英文片段**：`Overlaid film artifacts: fine film grain, lens flare blooming through the optics, slight chromatic aberration at the frame edges, and motion blur trailing fast movement.`
- **适用**：两者
- **要点**：这四项是 AI 视频最常缺的真实感来源，但一次最多叠三项，全上会显脏。

### STY-26 · 真实皮肤与去塑料感
- **中文片段**：`真实皮肤质感（natural skin texture）：保留毛孔、汗毛与细微肤色不均，皮肤随运动有自然的拉伸与回弹，避免磨皮与塑料感（no plastic skin）。`
- **英文片段**：`Natural skin texture: pores, fine vellus hair and subtle unevenness in tone, skin that stretches and rebounds naturally with movement, no retouched plastic skin.`
- **适用**：两者
- **要点**：这几乎适用于所有写实镜头，AI 视频默认皮肤偏塑料，加这一句收益极高。

## 排错提示

- 「电影感」「高级感」这类词本身不产生画面，必须拆成比例、肤色、虚化、颗粒等可执行描述。
- 一次塞三种以上风格标签（如“赛博朋克 + 水墨 + 8-bit”）几乎必然互相抵消，要么拆成多镜头，要么只留一个。
- 颗粒、色差、光晕、运动模糊属于叠加层，写得过多会让画面显脏、显旧、丢失清晰度。
- “胶片感”不写胶片类型（35mm / 16mm / 120）时，模型默认给现代数码的伪胶片滤镜。
- 动画风格必须区分 2D 手绘赛璐璐与 3D 渲染，两者对光影、描边、材质的描述完全不通用。
- 想抹掉 AI 味，最有效的一条是加“真实皮肤纹理 + no plastic skin”，其次是给运动加“运动模糊”，别一味加滤镜。
- 镜头光晕（lens flare）需与强光源同框才成立，写在柔光散景场景里会出现违和的假光斑。
