---
id: action-beats
title: 动作节拍
dimension: 动作节拍
applies_to: [H3, Seedance2.5]
model_field: H3 → integrated_multimodal_description ｜ Seedance 2.5 → 动作与时间
---

# 动作节拍

> **装配位置**：H3 → integrated_multimodal_description ｜ Seedance 2.5 → 动作与时间
> **一句话用法**：把每个动作拆成「先 / 然后 / 接着 / 最后」的时序节拍，一镜只排 1~3 个节拍，动作预算越低（低=眨眼呼吸微推、中=行走交互、高=环绕FPV打斗）排得越少。

## 片段

### ACT-01 · 走（walking）
- **中文片段**：`{主体}先在{地点}向前行走，脚步节奏平稳，然后肩膀随步幅轻微起伏，最后在{位置}停下并自然站定。`
- **英文片段**：`{Subject} first walks forward across {location} with a steady stride, then the shoulders rise and fall slightly with each step, and finally stops at {position} and stands naturally.`
- **适用**：两者
- **要点**：走要写清步频与落点，「先…然后…最后」三段刚好压在 6~8 秒内；不要同时再叠「奔跑」。

### ACT-02 · 跑（running）
- **中文片段**：`{主体}先压低重心起跑，手臂前后摆动，然后加速冲向{目标}，接着在最后一步蹬地减速，最后停在{位置}。`
- **英文片段**：`{Subject} first drops into a low crouch to sprint, arms pumping, then accelerates toward {target}, then plants the final stride to decelerate, and finally halts at {position}.`
- **适用**：两者
- **要点**：跑步是「加速—减速」两段式，只写「跑向 X」模型会给出匀速滑行；起跑姿态要显式写出。

### ACT-03 · 转身（turning）
- **中文片段**：`{主体}先在原地停住，然后向左转身约{角度}度，接着目光先于身体转向{方向}，最后重心跟过，双脚重新站定。`
- **英文片段**：`{Subject} first halts in place, then turns about {degrees} degrees to the left, then the gaze turns toward {direction} before the body, and finally the weight follows and the feet re-plant.`
- **适用**：两者
- **要点**：转身的关键是「眼→肩→脚」的顺序，写全了身体才不像滑行转身；转身一次只给一个方向。

### ACT-04 · 坐下（sitting down）
- **中文片段**：`{主体}先走到{位置}，然后在{物体}边缘转身面向{方向}，接着屈膝下蹲并把重心落到座面，最后双手自然搭在膝上。`
- **英文片段**：`{Subject} first walks to {position}, then turns to sit on the edge of {object} facing {direction}, then bends the knees and lowers the weight onto the seat, and finally rests both hands on the knees.`
- **适用**：两者
- **要点**：坐姿最容易出现悬空或穿透，要显式写「重心落到座面」；坐下后不要再叠第二个动作。

### ACT-05 · 起身与站起（standing up）
- **中文片段**：`{主体}先双手撑住{物体}边缘，然后上身前倾、髋部先起，接着双脚蹬地把身体推到直立，最后顺手把衣摆理平。`
- **英文片段**：`{Subject} first plants both hands on the edge of {object}, then leans the torso forward with the hips rising first, then pushes off the ground to reach an upright stance, and finally smooths down the hem.`
- **适用**：两者
- **要点**：「髋部先起」这一句能显著降低「上半身先起来」的怪异感，是坐起/起身类必写细节。

### ACT-06 · 开门与开合（opening and closing）
- **中文片段**：`{主体}先伸手握住{物体的}把手，然后向内拉开，{光线或气流}随之涌入，接着侧身让出通道，最后松手让{物体}在阻尼下缓缓合上。`
- **英文片段**：`{Subject} first reaches for the handle of {object}, then pulls it open as {light or airflow} spills in, then steps aside to clear the way, and finally lets go so the {object} swings shut under damping.`
- **适用**：两者
- **要点**：开合要写「施力点 + 随动物（光/风/尘）」，画面才有因果；不要写「门自动关上」。

### ACT-07 · 拿起（picking up）
- **中文片段**：`{主体}先低头看向{物体}，然后俯身、拇指与食指捏住{物体的边缘}，接着把它平稳拿起并保持在胸前高度，最后视线随之抬起。`
- **英文片段**：`{Subject} first looks down at {object}, then leans down and pinches the edge of {object} between thumb and forefinger, then lifts it steadily to chest height, and finally raises the gaze to follow.`
- **适用**：两者
- **要点**：手部特写一定要写「哪几根手指、捏哪个部位」，否则会变成糊成一团的爪子；手部动作按预算最多给 2 个节拍。

### ACT-08 · 放下（putting down）
- **中文片段**：`{主体}先握着{物体}走到{位置}，然后屈肘下沉，最后把{物体}轻放在{表面}上，确认放稳后才松开手指。`
- **英文片段**：`{Subject} first carries {object} to {position}, then bends the elbow and lowers the hand, and finally sets {object} gently on {surface}, releasing the fingers only after it is stable.`
- **适用**：两者
- **要点**：写「松手」是硬要求，不写模型常让物体悬空或穿模；放下的节拍比拿起更适合收尾。

### ACT-09 · 双手交互（two-handed interaction）
- **中文片段**：`{主体}先用双手托住{物体}，然后拇指沿{边缘}向内推合，接着双臂收紧把{物体}压实，最后保持住这个姿势。`
- **英文片段**：`{Subject} first cradles {object} in both hands, then pushes the edges inward with the thumbs, then tightens the forearms to press {object} closed, and finally holds that posture.`
- **适用**：两者
- **要点**：双手动作按顺序点名（先左手后右手，或先拇指后掌根），模型才不会两只手做同一件事。

### ACT-10 · 与他人交互（interaction with another subject）
- **中文片段**：`{主体A}先向{主体B}伸出手，接着{主体B}迟疑半拍后握住，最后两人同时收力，手臂形成一条稳定的连接。`
- **英文片段**：`{Subject A} first extends a hand toward {Subject B}, then {Subject B} hesitates for half a beat before taking it, and finally both grip at once, arms forming a steady connection.`
- **适用**：两者
- **要点**：双人互动必须给「一先一后」或「同时」的时序，否则两人会互相穿插；动作预算高时双人+环绕会直接崩脸。

### ACT-11 · 物理因果链：踩水（physical causality - stepping in water）
- **中文片段**：`{主体}先踩进{水面}，然后脚掌压出一圈涟漪向外扩散，接着水花从脚踝两侧外溅起，最后水滴回落、在{表面}上留下湿痕。`
- **英文片段**：`{Subject} first steps into {water}, then the sole compresses and a ring of ripples spreads outward, then spray bursts sideways from both ankles, and finally the droplets fall back, leaving wet marks on {surface}.`
- **适用**：两者
- **要点**：因果链必须写全「施力→形变→飞溅→回落」，只写「踩水」模型不会给水花；这是低预算场景里最出效果的一招。

### ACT-12 · 物理因果链：推倒（physical causality - toppling）
- **中文片段**：`{主体}先伸手轻推{物体}的上端，然后{物体}绕底部支点倾倒，接着桌面上的杯子被带得滑动，最后杯中液体泼洒在{表面}。`
- **英文片段**：`{Subject} first pushes the top of {object} lightly, then {object} topples about its base, then the cup on the table is pushed into a slide, and finally the liquid splashes across {surface}.`
- **适用**：两者
- **要点**：链式因果不要超过两级，超过就会丢因果顺序；写「绕支点倾倒」比写「倒下」更稳。

### ACT-13 · 面部微表情（micro-expression）
- **中文片段**：`{主体}先是目光短暂落在{物体}上，然后眼睑微微收紧，接着嘴角向下压了半分，最后视线移开、表情重新恢复平静。`
- **英文片段**：`{Subject} first lets the gaze fall briefly on {object}, then the eyelids narrow slightly, then the corners of the mouth press down a fraction, and finally the eyes turn away as the expression returns to stillness.`
- **适用**：两者
- **要点**：微表情属于低动作预算，镜头必须是近景或特写；不要在全景里写「嘴角下压」，画面根本看不见。

### ACT-14 · 手部细节与重心平衡（hand detail and balance）
- **中文片段**：`{主体}先以左手扶住{物体}保持平衡，然后右手完成{动作}，接着重心从左脚缓缓移到右脚，最后站定后手才完全松开。`
- **英文片段**：`{Subject} first steadies {object} with the left hand to keep balance, then completes {action} with the right hand, then the weight shifts slowly from the left foot to the right, and finally the hands release once the stance settles.`
- **适用**：两者
- **要点**：任何涉及单手用力的动作都要配一句重心转移，否则人会像漂浮；顺序固定为「支撑→操作→重心→松手」。

### ACT-15 · 机械与物体运动（mechanical and object motion）
- **中文片段**：`{机器}先在{位置}低速启动，机身轻微抖动并逐渐提速，然后沿{路径}匀速移动，接着在到达{标记点}时减速停稳，最后指示灯由红转绿。`
- **英文片段**：`{Machine} first starts at low speed at {position}, vibrating faintly and accelerating, then travels at a constant speed along {path}, then decelerates and settles at {marker}, and finally the indicator light turns from red to green.`
- **适用**：两者
- **要点**：机械运动要写「启动—匀速—减速—停止」四段，缺减速就会冲出场；指示灯变色是低成本的状态提示。

### ACT-16 · 群体与背景运动（crowd and background motion）
- **中文片段**：`{前景主体}先在{场景}中静止站立，然后背景中的{人群}开始缓慢横向流动，接着远处{物体}受风摆动，最后前景主体才转身面向流动的方向。`
- **英文片段**：`{Foreground subject} first stands still in {scene}, then the {crowd} in the background begins to drift laterally, then {objects} in the distance sway in the wind, and finally the foreground subject turns toward the moving flow.`
- **适用**：两者
- **要点**：背景运动属于「次运动」，一镜里只能有一条主线；顺序上背景先动、前景后动，层次才成立。

### ACT-17 · 慢动作（slow motion）
- **中文片段**：`{主体}先做出{动作}的起势，然后动作过程转为慢动作、速度降至约四分之一，接着{物体或粒子}在空中悬停片刻，最后以正常速度收尾定格。`
- **英文片段**：`{Subject} first initiates the wind-up of {action}, then the motion eases into slow motion at about one quarter speed, then {object or particles} hang suspended in the air for a moment, and finally it snaps back to real time and holds.`
- **适用**：两者
- **要点**：慢动作要写清「转慢的时机」与「恢复正常的时机」，否则整段都是慢放、缺少落点。

### ACT-18 · 动作预算分档（action budget）
- **中文片段**：`{主体}在本镜中只做{数量}个动作：{动作1}，然后{动作2}，最后{动作3}，其余时间仅保留呼吸与轻微的视线移动。`
- **英文片段**：`{Subject} performs only {count} actions in this shot: {action 1}, then {action 2}, and finally {action 3}, with the remaining time reserved for breathing and small eye movements only.`
- **适用**：两者
- **要点**：低预算=眨眼、呼吸、微推（1~2 个节拍）；中=行走、交互（2~3 个）；高=环绕+FPV+打斗（3 个以上）——动得越多越容易崩脸，预算必须显式写死。

### ACT-19 · 抓握与挣脱（grip and pull-away）
- **中文片段**：`{主体A}先伸手抓住{主体B}的{手腕/上臂}，五指收拢、掌心贴住皮肤、接触点有轻微受压与褶皱；接着{主体B}先僵住不动、重心后移，然后猛地向反方向抽动手腕，最后两人手臂完全分开、接触点解除。`
- **英文片段**：`{Subject A} first grabs {Subject B} by the {wrist / forearm}, the five fingers closing with the palm against the skin and slight compression creasing the fabric; then {Subject B} freezes, the weight shifting back, before jerking the wrist away in the opposite direction, and finally the arms separate completely with the contact released.`
- **适用**：两者
- **要点**：抓握必须写「五指收拢 + 接触点受压」，否则手会糊成一团；挣脱要写「僵住 → 重心后移 → 抽离」三段，否则模型会直接瞬移分开。

## 排错提示

- 把动作写成关键词堆砌（"跳、跑、转身、挥手"）而不是时序句子，模型会压缩成不可控的一团；必须用「先/然后/接着/最后」排成节拍。
- 一个镜头塞了 5 个以上动作节拍，模型通常只做前两个，后面的被跳过——先减到 3 个再试。
- 动作链超过两级因果（水花→水滴→湿痕→蒸发）必然丢序，控制在「施力→形变→飞溅」三段内。
- 手部动作忘了写手指与握持部位，人物会把手糊成一团或穿模；特写前先补上「哪只手、捏哪里」。
- 面部微表情写在大全景里，等于没写；微表情必须配近景镜头。
- 多主体互动没写时序（谁先伸手、谁后握住），两人会互相穿插；同时加环绕或 FPV 则必崩脸。
- 慢动作没有写「恢复正常速度」的时刻，结尾没有落幅，输出会一路软下去。
