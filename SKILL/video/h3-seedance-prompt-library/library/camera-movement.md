---
id: camera-movement
title: 运镜
dimension: 运镜
applies_to: [H3, Seedance2.5]
model_field: H3 → integrated_multimodal_description ｜ Seedance 2.5 → 镜头与构图
---

# 运镜

> **装配位置**：H3 → integrated_multimodal_description ｜ Seedance 2.5 → 镜头与构图
> **一句话用法**：一镜只给**一个**主运动，写成「方向 + 幅度 + 速度」三要素（例：缓慢推近 30 厘米，匀速 2 秒完成），其余机位参数写进「禁改」约束里。

## 片段

### CAM-01 · 缓慢推近（slow push-in）
- **中文片段**：`镜头从{景别}开始，以缓慢的速度沿光轴向前推近约{幅度}，全程匀速、无晃动，最后停在{目标景别}上。`
- **英文片段**：`The camera begins at {shot size} and slowly pushes forward along the optical axis by about {amount} at a constant, steady pace, with no shake, and finally settles at {ending shot size}.`
- **适用**：两者
- **要点**：推近是「机位前移 + 焦距不变」，不要同时写 zoom；推近要给出终点景别，否则模型会一路推到底。

### CAM-02 · 拉远（pull-out / pull-back）
- **中文片段**：`镜头从{起始景别}缓慢向后拉出约{幅度}，速度均匀地减速，最后完整交代{环境}的全貌。`
- **英文片段**：`The camera slowly pulls back from {starting shot size} by about {amount}, decelerating smoothly and evenly, and finally reveals the full extent of {environment}.`
- **适用**：两者
- **要点**：拉远常被模型做成 zoom out；明确「机位后移」并给出结束要交代的空间。

### CAM-03 · 左摇 / 右摇（pan left / right）
- **中文片段**：`镜头以固定机位向左水平摇动{角度}度，速度缓慢平稳，摇过{中间物}后停在{新主体}上。`
- **英文片段**：`With a locked position, the camera pans left by {degrees} degrees at a slow, even rate, sweeping past {passing element} before settling on {new subject}.`
- **适用**：两者
- **要点**：pan 只转朝向、不移动机位；必须写清左还是右，模型对左右方向敏感，写错就是镜像。

### CAM-04 · 上摇 / 下摇（tilt up / down）
- **中文片段**：`镜头从{主体}的脚部起幅，缓慢向上摇起约{角度}度，速度均匀，最后停在{目标}的{部位}上。`
- **英文片段**：`The camera starts on the {subject}'s feet and slowly tilts up by {degrees} degrees at an even speed, finally resting on the {part} of {target}.`
- **适用**：两者
- **要点**：tilt 与 pan 不可混用；上下摇要写起幅与落幅的具体对象，否则会摇到空处。

### CAM-05 · 跟拍（tracking shot）
- **中文片段**：`摄影机以稳定的侧向速度与{主体}保持{距离}同向跟拍，主体在画面中位置不变，背景持续向{方向}掠过。`
- **英文片段**：`The camera tracks at a steady lateral speed, staying {distance} from {subject} and moving in the same direction, keeping the subject in the same position in frame while the background slides past toward {direction}.`
- **适用**：两者
- **要点**：跟拍写「主体在画面中的位置」，比写「跟随」更可控；不要同时给推近或变焦。

### CAM-06 · 环绕（orbit / arc shot）
- **中文片段**：`镜头以{主体}为圆心做{方向}环绕移动约{角度}度，半径保持{距离}不变，匀速绕行，最后停在{结束角度}的侧后方。`
- **英文片段**：`The camera orbits {direction} around {subject} by about {degrees} degrees on a constant radius of {distance}, moving at a uniform speed, and finally stops at a {ending angle} rear three-quarter view.`
- **适用**：两者
- **要点**：环绕必须写圆心、半径、角度、方向四要素；环绕时若主体还在做复杂动作，脸极易崩坏。

### CAM-07 · 升镜 / 降镜（crane up / crane down）
- **中文片段**：`摄影机从{低处高度}垂直升起约{幅度}，速度缓慢并伴随轻微俯角变化，最后在{高度}停住俯瞰{场景}。`
- **英文片段**：`The camera cranes vertically upward from {low height} by about {amount}, rising slowly as the downward angle opens slightly, and finally halts at {height} looking down over {scene}.`
- **适用**：两者
- **要点**：升降是机位垂直移动，不要和 tilt 混用；高度变化要给出终值，不然会升出画面。

### CAM-08 · 轨道车推轨（dolly in / dolly out）
- **中文片段**：`摄影机安装在轨道滑车上，沿{方向}水平直线平移约{距离}，速度恒定、机身完全水平不摇晃，最后停在{标记点}。`
- **英文片段**：`Mounted on a dolly track, the camera translates horizontally along {direction} by about {distance} at a constant speed, perfectly level and free of shake, and finally stops at {marker}.`
- **适用**：两者
- **要点**：dolly 是机位平移、视角不变，与 pan 的区别就在「画面里透视关系是否改变」；写「机身高、透视变化」可排除误判。

### CAM-09 · 第一人称视角（FPV / POV）
- **中文片段**：`以{主体}的第一人称视角拍摄，摄影机随{头部或身体}的转向与呼吸轻微起伏，前景的{物体}从视野边缘快速掠过。`
- **英文片段**：`Shot from {subject}'s first-person point of view, the camera sways subtly with the turn of the head and the rise of breathing, while {foreground objects} sweep quickly past the edge of the frame.`
- **适用**：两者
- **要点**：FPV 必须点名是「谁在看」；不要在同一镜再给环绕或变焦，视角会打架。

### CAM-10 · 手持（handheld）
- **中文片段**：`摄影机以手持方式跟随{主体}，带有轻微不规则晃动和自然的呼吸频率，节奏偏快但不失焦，方向始终朝向{主体}。`
- **英文片段**：`The camera is handheld and follows {subject} with light, irregular shake at a natural breathing frequency, slightly fast but always in focus, and always oriented toward {subject}.`
- **适用**：两者
- **要点**：手持要写「轻微」并给出「不失焦」，否则画面抖到无法辨识主体；与跟拍可以共存，但不要再叠别的机械运动。

### CAM-11 · 升降环绕组合（crane + orbit）
- **中文片段**：`摄影机一边绕{主体}顺时针上升约{角度}度，一边把高度从{起始高度}抬到{结束高度}，速度缓慢连续，形成一道向下的弧线轨迹。`
- **英文片段**：`The camera rises from {starting height} to {ending height} while orbiting {subject} clockwise by about {degrees} degrees, moving slowly and continuously along a descending arc.`
- **适用**：两者
- **要点**：这是本文件里唯一允许的双运动组合，因为它是同一根摇臂上的复合轨迹；除此之外任何一镜只允许一个主运动。

### CAM-12 · 变焦点（rack focus）
- **中文片段**：`焦点先落在{前景物体}上保持清晰，随后在后半段平缓转移到{背景主体}，转移过程匀速、无呼吸感，前景随之逐渐虚化。`
- **英文片段**：`Focus begins on {foreground element} and holds, then in the latter half shifts smoothly and evenly onto {background subject}, with no pulsing, as the foreground falls out of focus.`
- **适用**：两者
- **要点**：rack focus 是焦点变化不是镜头移动；必须写清起止两个焦点，否则模型会让整幅画面糊掉。

### CAM-13 · 固定镜头（locked-off / static）
- **中文片段**：`摄影机完全固定不动，构图保持不变，无摇、无移、无变焦，画面中只有{主体}在固定画框内进行{动作}。`
- **英文片段**：`The camera is completely locked off with a fixed composition — no pan, no translation, no zoom — and only {subject} moves within the locked frame performing {action}.`
- **适用**：两者
- **要点**：固定镜头是「用画面内运动替代运镜」的省预算写法；写明「无摇无移无变焦」可防止模型偷偷加推近。

### CAM-14 · 变焦（zoom）
- **中文片段**：`机位保持不动，通过变焦将焦距从{起始焦段}推到{结束焦段}，画面随之放大约{倍数}，最后停住不晃。`
- **英文片段**：`With the camera position unchanged, the lens zooms from {starting focal length} to {ending focal length}, enlarging the image by about {factor}, and finally holds steady.`
- **适用**：两者
- **要点**：zoom 与 push-in 的画面效果相近但透视不同；同一镜绝不能同时写 zoom 和推近，否则画面会「双倍放大」。

### CAM-15 · 甩镜（whip pan）
- **中文片段**：`镜头以极快速度向左甩动约{角度}度，甩动过程中画面严重拖影、主体不可辨，最后在高速移动中稳住于{新主体}。`
- **英文片段**：`The camera whip-pans left by about {degrees} degrees at very high speed, producing heavy motion blur that obscures the subject, and finally snaps to rest on {new subject}.`
- **适用**：两者
- **要点**：甩镜要写清方向与「在运动中稳住」的落幅，否则结尾会飘；甩镜是切镜的廉价替代，可省一个切点。

### CAM-16 · 穿越镜头（pass-by / through）
- **中文片段**：`镜头从{遮挡物}的一侧快速穿过，{前景物}贴近画面边缘掠过形成强烈视差，穿出后直接显出{新主体}。`
- **英文片段**：`The camera passes quickly through from one side of {occluder}, with {foreground element} sweeping close past the edge of frame and creating strong parallax, and emerging directly onto {new subject}.`
- **适用**：两者
- **要点**：穿越镜头本身既是运镜也是一次视觉转场；穿越后不要再叠一个推近，否则会互相抵消。

### CAM-17 · 滚转（roll / dutch）
- **中文片段**：`摄影机沿自身光轴顺时针滚转约{角度}度，速度缓慢均匀，地平线随之倾斜，最终停留在{目标角度}的倾斜构图上。`
- **英文片段**：`The camera rolls clockwise about its optical axis by {degrees} degrees at a slow, even rate, tilting the horizon as it goes, and finally rests on a canted composition of {target angle}.`
- **适用**：两者
- **要点**：roll 与 tilt 是两回事，roll 改变的是画面自身的旋转；倾斜构图一般不超过 15~20 度，超过会像失误。

### CAM-18 · 落幅与构图终点（end frame / landing composition）
- **中文片段**：`本镜结束时，摄影机停在{落幅景别}，画面中心为{主体}，{主体}位于{画面位置}，背景为{环境元素}，构图保持到最后一帧。`
- **英文片段**：`By the end of the shot, the camera has settled at {ending shot size}, with {subject} centered and positioned at {frame position} against {background element}, and the composition holds through the final frame.`
- **适用**：两者
- **要点**：给不给落幅是「切得下去」的关键；Seedance 2.5 的运动公式最后一环就是落幅画面，缺了它镜头会漫无目的地漂。

## 排错提示

- **一镜只给一个主运动**：最常见失败是同一镜里同时写 pan + orbit + zoom + dolly，结果是画面乱飘。写不下就拆成两个切点。
- 混用「推近」与「变焦」：两者视觉都像放大，合写会导致画面二次放大或透视扭曲，必须二选一。
- 混用「pan/tilt」与「dolly/crane」：前者只转朝向、后者改机位，合写会让模型随机切换，破坏空间连续性。
- 运镜只写名词不写幅度与速度：模型会给出难以预测的急推或急停，务必补「约 X 度 / 匀速 / 缓慢」。
- 方向必须写死：左/右、上/下、顺/逆时针含糊，模型经常镜像，左摇变右摇。
- 环绕（orbit）一定要写圆心、半径、角度、方向，缺任一项就退化成 dolly 或 pan。
- 手持不要写成剧烈抖动：写「轻微不规则晃动 + 始终对焦 + 始终朝向主体」三要素才稳。
- 切镜头只在引入**新主体 / 新空间 / 新状态 / 新视点 / 新时间点**时发生；没有新信息的切点一律删掉，否则节奏碎、观感乱。
- 甩镜（whip pan）可以替代一次硬切，但甩完必须「稳在新主体上」，不写落幅就会甩丢。
