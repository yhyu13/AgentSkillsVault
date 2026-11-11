---
id: seedance-syntax
title: Seedance 2.5 官方书写规则
dimension: Seedance 2.5 官方书写规则
applies_to: [Seedance2.5]
model_field: 全局（先定符号与结构，再填内容）
---

# Seedance 2.5 官方书写规则

> **装配位置**：Seedance 2.5 → 全部任务的共同前置（符号、结构、时间、负向控制）
> **一句话用法**：先按官方符号把音乐/音效/对白/字幕隔开，再按四行结构（参考任务走五小节）铺内容，用整数秒时间戳或阶段切分节奏，最后用四条独立的负向约束把字幕、音效、BGM、对白分别关掉。
>
> **依据**：本文件的每条规则都来自 `library/intel/seedance-2-5-official.md`（官方提示词指南 + 官方 Skill `sd25-pe` + 官方接口文档的规则摘要）与 `library/intel/volcengine/seedance-2-5-prompt-guide.txt`（官方原文抓取件），引文均标出处小节。**官方指南没有字数限制的表述**，不要引入第三方教程的「30~80 词」类说法；官方能力表述是「单段 30 秒视频直出」，不是「4~30 秒」。

## 片段

### SD-01 · 音乐符号 `()`
- **中文片段**：`背景音乐为（低沉电子节拍，128 BPM，带轻微混响），全片持续铺底，结尾自然收束。`
- **英文片段**：`Background music is (low electronic beat, 128 BPM, with slight reverb), running under the whole clip and resolving naturally at the end.`
- **适用**：Seedance 2.5
- **要点**：官方 Skill 符号表规定音乐用 `()`（出处：`seedance-2-5-official.md`「五、符号规范」）。括号内只写音乐本身（器乐、速度、节奏、动态），不要把动作声或对白塞进音乐括号。

### SD-02 · 音效符号 `<>`
- **中文片段**：`环境音保留脚步踩在碎石的沙沙声 <脚步踩碎石> 与树枝折断的脆响 <树枝折断>，音效与画面动作一一对应。`
- **英文片段**：`Keep the crunch of footsteps on gravel <footsteps crunching on gravel> and the sharp snap of a breaking branch <branch snapping> in the ambient audio, with every sound effect matched one-to-one to a visible action.`
- **适用**：Seedance 2.5
- **要点**：官方 Skill 符号表规定音效用 `<>`（出处：`seedance-2-5-official.md`「五、符号规范」）。音效要绑动作，不要笼统写「有很多音效」。

### SD-03 · 对白符号 `{}`
- **中文片段**：`{旁白用中文说：“三月的最后一场雪，落在我没说完的那句话上。”} {林岚用中文说：“我等了很久。”} 其余人物自然闭口听讲。`
- **英文片段**：`{The narrator says in Mandarin: "The last snow of March fell on the sentence I never finished."} {Lin Lan says in Mandarin: "I have waited a long time."} The remaining characters keep their mouths naturally closed and listen.`
- **适用**：Seedance 2.5
- **要点**：对白用 `{}`，并逐段标明语言、说话者、语气、准确台词；多人对白要写明非说话者自然闭口（出处：`seedance-2-5-official.md`「五、符号规范」）。用户没指定语言时**不得自行推断**普通话、方言或地区口音。

### SD-04 · 字幕符号 `【】`
- **中文片段**：`画面中仅出现指定字幕【三月的最后一场雪】，不出现其它任何文字。`
- **英文片段**：`The only on-screen text is the subtitle ["The last snow of March"], and no other text appears anywhere in the frame.`
- **适用**：Seedance 2.5
- **要点**：字幕用 `【】`（出处：`seedance-2-5-official.md`「五、符号规范」）。要的是「不要字幕」就走负向控制（见 SD-13），不要用 `【】` 写一个空字幕句。

### SD-05 · 无对白任务的四件套声明
- **中文片段**：`人物自然闭口，无旁白；仅保留指定环境声（雨声与远处车流）；画面无字幕；不出现额外招牌文字。`
- **英文片段**：`The characters keep their mouths naturally closed and there is no narration; only the specified ambient sound is kept (rain and distant traffic); there are no subtitles; no additional signage text appears.`
- **适用**：Seedance 2.5
- **要点**：这是官方推荐的无对白写法（出处：`seedance-2-5-official.md`「五、符号规范」）。同时记住官方禁止自动加入字幕、标志、水印、重复主体，或用户未要求的负向限制。

### SD-06 · 素材编号与指代
- **中文片段**：`@Image1 为主角形象参考，@Image2 为场景参考，@Video1 提供动作参考，@Audio1 为该角色说话音色。`
- **英文片段**：`@Image1 is the main character's look reference, @Image2 is the location reference, @Video1 provides the motion reference, and @Audio1 provides this character's speaking voice.`
- **适用**：Seedance 2.5
- **要点**：素材按**上传顺序**编号为 `@ImageN` / `@VideoN` / `@AudioN`（出处：`seedance-2-5-official.md`「三、素材指代与绑定」）。用户已有的 `@ImageN` 标签必须保持原编号、原语法，不得删除、重编号或虚构。

### SD-07 · 一素材一职责与多图同主体
- **中文片段**：`@Image1 是人物“林岚”的外观参考；@Image2 是场景“旧书店”的环境参考；@Image3 与 @Image4 共同代表同一实体“那把红伞”，仅用于伞的外观参考，不得生成两把伞或生成副本。`
- **英文片段**：`@Image1 is the appearance reference of the character "Lin Lan"; @Image2 is the environment reference of the "old bookshop"; @Image3 and @Image4 jointly represent the same entity, "the red umbrella", used only as a reference for its appearance, and must not be rendered as two umbrellas or as duplicated copies.`
- **适用**：Seedance 2.5
- **要点**：官方规则：每个素材只能有一个明确职责；一个素材在提示词里每行只定义一个主体；多张图共同定义同一主体时要说明各自贡献的属性并声明**共同代表同一实体、不得生成副本**；多个角色原则上用各自独立素材，不能用一张单人图同时定义两个同时出现的人物（出处：`seedance-2-5-official.md`「三、素材指代与绑定」）。

### SD-08 · 文本绑定与指代优先
- **中文片段**：`@Image1 对应人物“林岚”（衬衫与发型沿用图中一致），@Audio1 对应“林岚”的说话音色，所有指代以本段文字绑定为准；严格参考 @Video1 的动作与运镜，顺序与视频保持一致。`
- **英文片段**：`@Image1 corresponds to the character "Lin Lan" (shirt and hairstyle as shown in the image), @Audio1 corresponds to Lin Lan's speaking voice, and all references are bound by this text; strictly follow the action and camera movement of @Video1, keeping the same order as the video.`
- **适用**：Seedance 2.5
- **要点**：官方原文「不建议只在图片里呈现映射信息，比如主角图片上写‘张三’，然后 Prompt 中直接写‘张三在学校里…’，容易导致多人混淆或重复角色」（出处：`seedance-2-5-prompt-guide.txt`「参考类（多素材映射）」）。映射优先级：用户明确指定 ＞ 原提示词描述 ＞ 素材内容 ＞ 文件名及元数据 ＞ 上传顺序；素材已足够精准时只做指代、减少画面复述（同文件「当参考素材本身已足够精准时」）。

### SD-09 · 基础四行结构（文本生视频）
- **中文片段**：`[主体·动作·环境] 一名穿灰色风衣的男子在雨夜的旧书店门口停下，抬头看向橱窗；[视觉风格·氛围] 写实电影感，冷蓝主光，湿地面反光，高对比低照度；[景别·机位·运动] 中景，低角度略仰，缓慢推近至半身，轻微手持晃动；[对白·环境声·音效·音乐] 仅保留雨声与远处车流，无对白，无字幕。`
- **英文片段**：`[Subject, action, environment] A man in a grey coat stops outside an old bookshop on a rainy night and looks up at the display window; [Visual style and mood] Realistic cinematic look, cool blue key light, reflections on the wet ground, high contrast and low exposure; [Shot size, camera position, movement] Medium shot, slightly low angle, a slow push in to a medium close-up, with subtle handheld shake; [Dialogue, ambient sound, sound effects, music] Only rain and distant traffic are kept, no dialogue, no subtitles.`
- **适用**：Seedance 2.5
- **要点**：官方 Skill 的基础文本生视频为四行表达——主体/动作/环境 → 风格氛围 → 镜头景别位置运动 → 对白/环境声/音效/音乐（出处：`seedance-2-5-official.md`「四、提示词结构」）。四行顺序固定，缺行比乱序更糟。

### SD-10 · 参考生视频五小节
- **中文片段**：`【Generation Goal】生成一段写实风格的雪夜独行短片，情绪由压抑转向释然。`【Reference Asset Roles】@Image1 为人物外观参考，@Image2 为场景参考，@Audio1 为人物音色。`【Subjects and Relationships】主角林岚（@Image1）在旧书店橱窗前独行，与店主隔窗对视。`【Event Script】起步时停步 → 抬头 → 店主递出一杯热饮 → 主角接过并微笑。`【Maintain Consistency】人物面貌与服装全程不变，橱窗灯光与雪量一致，@Audio1 音色全程统一。`
- **英文片段**：`[Generation Goal] Produce a realistic short film of a solitary walk on a snowy night, with the emotion shifting from repression to relief. [Reference Asset Roles] @Image1 is the character appearance reference, @Image2 is the location reference, @Audio1 is the character voice. [Subjects and Relationships] The protagonist Lin Lan (@Image1) walks alone in front of the old bookshop window and meets the shopkeeper's eyes through the glass. [Event Script] She stops, looks up, the shopkeeper hands out a warm drink, she takes it and smiles. [Maintain Consistency] The character's face and clothing stay unchanged, the window light and the snow amount stay consistent, and the @Audio1 timbre remains uniform throughout.`
- **适用**：Seedance 2.5
- **要点**：官方 Skill 规定的五小节为 `【Generation Goal】`／`【Reference Asset Roles】`／`【Subjects and Relationships】`／`【Event Script】`／`【Maintain Consistency】`（出处：`seedance-2-5-official.md`「四、提示词结构」）。小节标题用【】与字幕符号同形，别改写；未启用的素材列入内部账本 `【Unused Assets】` 并排除其用途，该账本不出现在最终输出。

### SD-11 · 时间戳：区间、时间点、相对时间
- **中文片段**：`0-3 秒：主角在雪地里快步走，呼出白气；3-7 秒：她在旧书店橱窗前停步；7-15 秒：隔着玻璃与店主对视，暖光落在脸上。第 5s 快速向左横移转场（向左擦除＋自然叠化）。张三呆滞地站在原地，3 秒后周围的人纷纷摇头。主角按下快门后画面定格 1 秒。`
- **英文片段**：`0-3 seconds: the woman strides through the snow, her breath visible; 3-7 seconds: she stops in front of the old bookshop window; 7-15 seconds: she meets the shopkeeper's eyes through the glass, warm light falling on her face. At 5s a fast leftward lateral wipe transition (left wipe plus natural cross dissolve). Zhang San stands still in a daze, and 3 seconds later the people around him shake their heads one after another. After the protagonist presses the shutter the frame holds for 1 second.`
- **适用**：Seedance 2.5
- **要点**：官方三种时间控制写法为「明确的时间区间」「时间点控制」「相对时间控制」（出处：`seedance-2-5-prompt-guide.txt`「时间戳」）。Seedance 2.5 响应**整数秒**时间戳（2.0 只响应镜头序号），因此用「秒 / s」，不要写 00:03.5 这类小数。

### SD-12 · 时间戳的官方约束
- **中文片段**：`按三个阶段推进：第一阶段建立人物与雪夜环境；第二阶段人物走到旧书店橱窗前停步并抬头；第三阶段与店主隔窗对视，情绪收束。`
- **英文片段**：`Advance in three stages: the first stage establishes the character and the snowy-night environment; the second stage carries the character to the old bookshop window, where she stops and looks up; the third stage has her meet the shopkeeper's eyes through the glass, resolving the emotion.`
- **适用**：Seedance 2.5
- **要点**：官方四条约束——时间轴要**连续**，避免「0-3 秒…5-6 秒…」这类有缺口的表达；**不建议用时间戳控制频率/频次**（如「一秒摇头 3 次」）；**目标总时长属于参数，不应写进普通生成提示词**；长视频优先用「阶段」而不是凭空生成大量时间戳（出处：`seedance-2-5-official.md`「六、时间戳」）。区间内剧情太少模型会自由发挥，太多会过度剪切或剧情遗漏。

### SD-13 · 负向控制：字幕
- **中文片段**：`不额外加入对白字幕，不要字幕，画面中不出现任何字幕条与浮层文字。`
- **英文片段**：`Do not add dialogue subtitles, no subtitles, and no subtitle bars or overlay text appear in the frame.`
- **适用**：Seedance 2.5
- **要点**：官方支持负向控制字幕，示例即「不额外加入对白字幕」「不要字幕」（出处：`seedance-2-5-prompt-guide.txt`「负向控制」）。字幕仍可能复现——先排查是不是台词后追加了语气/表情/动作描述。

### SD-14 · 负向控制：音效
- **中文片段**：`不添加与画面动作无关的音效（撞击、爆炸、翻页、脚步等一律不要），仅保留与画面同步的物理动作声。`
- **英文片段**：`Do not add sound effects that do not correspond to on-screen actions (no impacts, explosions, page turns or footsteps of any kind); keep only the physical sounds synchronized with the visible action.`
- **适用**：Seedance 2.5
- **要点**：官方支持更细维度的单独控制：音效、背景音乐（bgm）、对白（出处：`seedance-2-5-prompt-guide.txt`「负向控制」）。**音效**与**BGM**要分开约束，不要用一句「不要任何声音」一刀切，除非确实要求全片无声。

### SD-15 · 负向控制：BGM（穷举同义词 + 首尾各一遍）
- **中文片段**：`音频仅保留角色人声声源，不产出任何音乐类音轨：音乐、背景音乐、BGM、配乐、器乐、旋律、合成器音效、氛围铺底音一概不要。本片无音乐、无背景音乐、无配乐、无器乐、无旋律、无合成器音效、无氛围铺底音。`
- **英文片段**：`The audio keeps only the character voices and produces no music track of any kind: no music, no background music, no BGM, no score, no instrumental, no melody, no synthesizer sting, no ambient bed. This clip has no music, no background music, no score, no instrumental, no melody, no synthesizer sting and no ambient bed.`
- **适用**：Seedance 2.5
- **要点**：官方方案一：「一次性穷举音乐类同义词（音乐、背景音乐、BGM、配乐、器乐、旋律、合成器音效、氛围铺底音等），避免模型替换表述绕过约束」，并「将音频约束在提示词的开头与结尾各写一遍，强化模型注意力」（出处：`seedance-2-5-prompt-guide.txt`「背景音乐约束不生效」）。方案二是后期分离人声移除非人声部分（会同时移除音效）。

### SD-16 · 负向控制：对白与台词情绪格式
- **中文片段**：`不添加任何额外对白、旁白或内心独白。林岚台词（难以置信）：“像……太像了。” 周女士台词（声音发颤）：“太像了。”`
- **英文片段**：`Do not add any extra dialogue, narration or inner monologue. Lin Lan's line (incredulous): "It's like... it's so alike." Ms. Zhou's line (voice trembling): "It's so alike."`
- **适用**：Seedance 2.5
- **要点**：对白要与音效、BGM、字幕**分开**约束。官方防字幕写法：避免在台词后复述词语并追加语气/表情/动作描述，此类描述容易诱发字幕；需要差异化时按「角色台词（情绪）：内容」拆分描述（出处：`seedance-2-5-prompt-guide.txt`「字幕约束不生效」）。

### SD-17 · 锁定 vs 不锁定
- **中文片段**：`本次为参考生成任务（无锁定）：输出宽高比与时长由参数指定，提示词中不写死比例与总时长，画面按语义参考素材自由发挥。`
- **英文片段**：`This is a reference generation task (no locking): the output aspect ratio and duration are set by parameters and are not fixed in the prompt, and the imagery develops freely from the semantic reference assets.`
- **适用**：Seedance 2.5
- **要点**：官方区分两类任务——**有锁定**：编辑／首尾帧／延长，素材严格成为输出时间轴上的一段，锁定宽高比甚至时长，**不支持用户自定义**；**无锁定**：参考任务／多宫格分镜／关键帧，仅语义参考，用户可指定宽高比与时长（出处：`seedance-2-5-official.md`「二、两类任务」）。

### SD-18 · 首尾帧：role = first_frame / last_frame
- **中文片段**：`Use @Image1 as the first frame. Use @Image2 as the last frame. 人物面貌、服装与场景材质全程保持一致，其余参考图片仅用于补充人物、服装、道具与材质细节，不得覆盖首尾帧构图。`
- **英文片段**：`Use @Image1 as the first frame. Use @Image2 as the last frame. The character's face, clothing and the scene materials stay consistent throughout; the remaining reference images only add character, clothing, prop and material details, and must not override the first-frame or last-frame composition.`
- **适用**：Seedance 2.5
- **要点**：官方固定原句就是 `Use @ImageN as the first frame.` 与 `Use @ImageN as the last frame.`（出处：`seedance-2-5-official.md`「八、首尾帧」）。该方式**锁定输出视频的宽高比**，严格对齐输入首帧图；首尾帧之外的其他图片不得覆盖首尾帧构图。

### SD-19 · 首尾帧：role = reference_image + 提示词指定
- **中文片段**：`Use @Image3 as the first frame and @Image5 as the last frame. 首帧是雨夜街口，尾帧是亮着灯的旧书店门口；人物身份与服装沿用 @Image1 的形象。`
- **英文片段**：`Use @Image3 as the first frame and @Image5 as the last frame. The first frame is a rainy street corner and the last frame is the lit doorway of the old bookshop; the character's identity and clothing follow the appearance of @Image1.`
- **适用**：Seedance 2.5
- **要点**：此方式**不锁定**输出视频的宽高比，视频效果与首尾帧参考图相近但**不完全匹配**（出处：`seedance-2-5-official.md`「八、首尾帧」）。官方示例句式为「图片 1 为首帧」「图片 3 为首帧，图片 5 为尾帧」。

### SD-20 · 视频编辑
- **中文片段**：`仅编辑 @Video1 中男人的台词，修改为“你不要过来啊”，口音调整为东北口音；把 @Video1 中 4-6 秒男人喝咖啡的动作改变为拖地；其余画面、动作、背景与声音保持不变。`
- **英文片段**：`Only edit the man's line in @Video1, changing it to "Don't come over," with a Northeastern Mandarin accent; change the action of the man drinking coffee at 4-6 seconds in @Video1 into mopping the floor; everything else in the picture, the action, the background and the sound stays unchanged.`
- **适用**：Seedance 2.5
- **要点**：官方要求「明确需要修改的范围和内容，可以配合时间戳进行部分编辑，尽可能说明修改内容从 A->B 的过程」（出处：`seedance-2-5-prompt-guide.txt`「编辑类」）。编辑母版必须**唯一**（唯一的 `@VideoN`）；除明确修改对象外，其余可见角色、道具与背景保持不变；动态主体替换要继承原主体的出现时机、运动路径、速度与遮挡关系，并声明原主体不再出现。

### SD-21 · 视频延长
- **中文片段**：`向前延长：新片段首帧承接原视频末帧，延续结束瞬间的余势动作。向后延长：新片段末帧承接原视频首帧，先描述原视频开始前的事件。主体为同一连续实例，人物面貌、服装与手中道具的部件数量、拓扑关系保持稳定。`
- **英文片段**：`For a forward extension: the first frame of the new clip continues from the last frame of the original video, carrying over the residual motion of the final moment. For a backward extension: the last frame of the new clip connects to the first frame of the original, and the events before the original begins are described first. The subject remains the same continuous instance, with the character's face, clothing, and the part count and topology of the prop in hand kept stable.`
- **适用**：Seedance 2.5
- **要点**：官方原文「向前延长：新片段首帧承接原视频末帧。向后延长：新片段末帧承接原视频首帧，并先描述原视频开始前的事件」；主体必须保持为同一连续实例，道具部件数量与拓扑关系稳定（出处：`seedance-2-5-official.md`「九、参考生视频 / 编辑 / 延长」）。延长属**有锁定**类。

### SD-22 · 动作与表情的写法
- **中文片段**：`主角连续做了几组高抬腿和空翻，双方展开近身搏斗；只对最后一个记忆点动作写细节：右脚先触地，膝盖弯曲缓冲，左手顺势撑地。表情写描述性语句：脸上带着满足的笑容，大口地吃饭。`
- **英文片段**：`The protagonist performs several consecutive high-knee lifts and flips while the two sides engage in close-quarters combat; write out the detail only for the final memorable action: the right foot touches down first, the knee bends to absorb the impact, and the left hand braces against the ground. Write expressions as descriptive statements: a satisfied smile spreads across the face while eating big bites of food.`
- **适用**：Seedance 2.5
- **要点**：官方规则——动作优先用概括性描述（如「连续做了几组高抬腿和空翻」「双方展开近身搏斗」），只在少数有记忆点的动作上写具体细节，**不建议重复写相同的动作**；表情写描述性语句、减少成语（「津津有味地吃饭」→「脸上带着满足的笑容，大口地吃饭」）（出处：`seedance-2-5-prompt-guide.txt`「动作/表情描述」）。

### SD-23 · 运镜与转场的写法
- **中文片段**：`一镜到底穿过整个客厅，途中经过希区柯克变焦与航拍视角；第 5s 快速向左横移转场（向左擦除＋自然叠化）。移焦，画面焦点发生平滑转变，原本在前景清晰的树木变模糊，背景中的人物由模糊逐渐变得清晰。`
- **英文片段**：`A single continuous take crosses the whole living room, passing through a dolly zoom and an aerial viewpoint; at 5s a fast leftward lateral wipe transition (left wipe plus natural cross dissolve). A focus pull, the plane of focus shifting smoothly so that the tree sharp in the foreground goes soft while the person in the background sharpens gradually.`
- **适用**：Seedance 2.5
- **要点**：热门运镜可直接写——一镜到底、希区柯克变焦、航拍视角、FPV、子弹时间、手持镜头、回弹变速；过于小众专业的名词要转成「**名词 + 描述性解释**」；转场镜头写清**触发点与方式**，尽可能把转场时间、方式都写明（出处：`seedance-2-5-prompt-guide.txt`「镜头语言」）。

### SD-24 · 白模参考与渲染
- **中文片段**：`参考 @Video1 的运镜、动作与光照变化，将 @Image1 中穿灰色衣服的男人对应 @Video1 中的红色模型；画面中不出现轨迹线、坐标轴、控制器、相机视锥与任何文字标记。`
- **英文片段**：`Reference the camera movement, action and lighting changes of @Video1, and map the man in the grey coat from @Image1 onto the red model in @Video1; no trajectory lines, coordinate axes, controllers, camera cones or any text markings appear in the frame.`
- **适用**：Seedance 2.5
- **要点**：粗粒度白模只继承运动路径、人物调度、机位、镜头运动、剪辑、灯光变化、声音节奏与空间关系；细粒度白模保留主体结构、动作、空间布局、机位、镜头运动与剪辑，只替换外观、材质、颜色、场景与风格。轨迹线、坐标轴、控制器、相机视锥及文字标记**必须排除**，否则会泄露进成片；白模主体建议仅保留躯体，避免【四肢/翅膀】等精细运动元素，若已包含需补全其动作序列，防止渲染后四肢僵化（出处：`seedance-2-5-official.md`「九、参考生视频 / 编辑 / 延长」）。

### SD-25 · 多宫格分镜与线稿分镜
- **中文片段**：`@Image1 至 @Image9 是同一组线稿分镜，共 9 格，按宫格顺序播放：第 1 格她在雪地停步，第 2 格抬头，第 3 格推开书店门……每格补齐分镜图中没有的信息：光线方向、天气、人物视线与手持道具。`
- **英文片段**：`@Image1 through @Image9 are one set of 9 line-art storyboard panels, played in panel order: in panel 1 she stops in the snow, in panel 2 she looks up, in panel 3 she pushes open the bookshop door... fill in for each panel the information missing from the drawing: light direction, weather, the character's gaze and the prop in hand.`
- **适用**：Seedance 2.5
- **要点**：官方限制——多宫格更适合 **15 个以下分镜**，单次输入过多（如 18 宫格）容易出现静止、顺序错乱；避免过度锐化、杂乱的 AI 直出分镜图，不推荐在分镜图上写过多文字；宫格图并不会严格对齐分镜内容，需严格对齐时改用多关键帧。线稿/火柴人分镜三步法：**step1 写明参考素材的指代关系 → step2 写整体故事梗概 → step3 按分镜完整描述情节内容，至少补齐分镜图中没有的信息**（出处：`seedance-2-5-prompt-guide.txt`「多宫格分镜/故事板」）。

### SD-26 · 关键帧参考
- **中文片段**：`以图片 1 至图片 7 的顺序作为关键帧，在云海群山间，蓝粉长尾灵鱼凌空遨游，镜头缓缓推向依山而建的古镇，聚焦山顶古塔；画面一转进入雅致中式厅堂，灵鱼穿窗飞入，落入厅堂中央圆池悠然游动；最终视角切至幽暗古寺，白须老僧背对而立，静静凝望巨幅画框。`
- **英文片段**：`Use images 1 through 7 in order as keyframes: amid a sea of clouds and mountains, a blue-pink long-tailed spirit fish swims through the air, and the camera slowly pushes toward a mountain-side ancient town, focusing on the pagoda at the summit; the image turns into an elegant Chinese hall, the spirit fish flies through the window and lands in the round pool at the center of the hall, gliding serenely; the final angle cuts to a dim ancient temple, where a white-bearded old monk stands with his back to us, gazing silently at a huge framed painting.`
- **适用**：Seedance 2.5
- **要点**：视频需要严格按照分镜图生成时用关键帧参考，**prompt 第一句必须写明「以图片 x 至图片 x 的顺序作为关键帧」**（出处：`seedance-2-5-prompt-guide.txt`「关键帧参考」）。概念分镜可直接简写：「按照分镜图的顺序，构建一个完整的故事剧情，运镜合理连贯」。

### SD-27 · 参考素材数量上限与多视图
- **中文片段**：`本次共输入 {数量} 个参考素材（图片 {图数量} 张、视频 {视频数量} 段、音频 {音频数量} 条），每个素材只承担一项明确职责：{素材1} 负责 {职责1}，{素材2} 负责 {职责2}，{素材3} 负责 {职责3}。`
- **英文片段**：`This run takes {count} reference assets in total ({image_count} images, {video_count} videos, {audio_count} audio tracks), each carrying exactly one defined role: {asset 1} supplies {role 1}, {asset 2} supplies {role 2}, and {asset 3} supplies {role 3}.`
- **适用**：Seedance 2.5
- **要点**：官方原文「单次可输入图像/音频/视频最多 50 个参考素材」，且 Seedance 2.5 支持把多个视图作为同一主体的参考（2.0 不建议）。素材超过 50 个不是问题，但**每个素材的职责仍要逐个绑定**——数量上限不是可以偷懒不绑的理由。

## 排错提示

- **情绪过度响应（瞳孔发光）**：在提示词中以**最高优先级**明确约束“人物为正常人眼、不发光”，并限制环境光仅作用于面部轮廓；把“狂热”“极度震惊”等强烈情绪词改成“惊叹”等常规描述（出处：`seedance-2-5-prompt-guide.txt`「情绪过度响应（眼睛发光）」）。
- **角色对应错误**：按人物**首次出场顺序**上传参考素材，并同步调整提示词中的图片、音频编号，确保每个角色与参考素材一一对应（同文件「角色对应错误」）。
- **画面文字拼写错误**：把单词**拆分为独立字母**并要求按顺序依次出现，降低模型联想与简化字形；或把需要准确展示的文字**制成图片**作为参考素材（同文件「文字拼写错误」）。
- **字幕约束不生效**：避免在台词后复述词语并追加语气、表情、动作描述；差异化台词按「角色台词（情绪）：内容」写；并确认**参考视频本身不含字幕**，否则“无字幕”指令可能失效（同文件「字幕约束不生效」）。
- **BGM 约束不生效**：提示词中明确“音频仅保留角色人声声源”“不产出任何音乐类音轨”，一次性穷举音乐类同义词，并把该约束在**开头与结尾各写一遍**；必要时后期分离人声移除非人声部分（注意会同时移除音效）（同文件「背景音乐约束不生效」）。
- **音频翻译语种混淆 / 音频水波纹噪声**：翻译时明确**所有角色**（含背景中可辨识的对白、低语、感叹词与语气词）都要翻译为目标语言，按角色提供完整台词与时间轴，要求逐字同步口型并写明验收标准（全片无可辨识原语言残留、无字幕、口型精准同步，其余画面与声音不变）；音频出现冒泡、回音或啸叫时，移除提示词中与水、波浪、回音相关的描述（同文件「音频翻译语种混淆」「音频出现水波纹噪声」）。
- **编辑前后时长差 0.33 秒 / 编辑改宽高比效果差**：前者切换为**参考生成模式**并指定输出时长，或把输入视频帧数调整为 **8n+1**（n 为正整数）；后者同样改用参考生成任务，并在提示词中补充具体剧情描述，强调逐帧、逐镜头的时序对应与画面内容完整性（同文件「编辑前后时长不一致」「编辑宽高比效果差」）。
- **复杂任务不稳定 / 画面指纹状纹理**：复杂任务拆解为多个简单任务，分多次生成或编辑完成再后期整合（例如第 1 步用参考任务生成轨迹动画、第 2 步用编辑任务把它加进原视频）；指纹状纹理则调整输入图片大小、使其不超过输出视频分辨率，输出 1080p 时出现概率低于 720p（同文件「复杂任务效果不稳定」「画面出现指纹状纹理」）。
