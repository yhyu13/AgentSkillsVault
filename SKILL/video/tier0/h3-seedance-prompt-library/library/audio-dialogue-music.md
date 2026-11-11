---
id: audio-dialogue-music
title: 音频、对白与配乐
dimension: 音频、对白与配乐
applies_to: [H3, Seedance2.5]
model_field: H3 → integrated_multimodal_description（对白/口型/画外音/歌唱/同期叙事内声音）、overall_soundscape（环境声与物理音效）、non_diegetic_music（配乐）；Seedance 2.5 → 第六段「音频」
---

# 音频、对白与配乐

> **装配位置**：H3 → integrated_multimodal_description（对白 / 口型 / 画外音 / 歌唱）、overall_soundscape（环境底噪与物理音）、non_diegetic_music（配乐）｜ Seedance 2.5 → 第六段「音频」
> **一句话用法**：先把「谁在说什么」按官方 `<d>[English] ...</d>` 格式写进对白位，再把「听得到什么环境与物理声」写进环境音位（1~4 句英文、单一连续段落），最后单独决定「有没有配乐」并写进配乐位（只写乐器编制、速度、节奏、动态变化）——三者分栏写、绝不混在一句里。
>
> **H3 官方要求改写段用英文，装配 H3 时取英文片段**；中文片段保留供人类阅读与 Seedance 2.5 使用。H3 对白格式、说话人 ID、画外音短语的官方出处见 `references_base-en.txt`「### 4.4」「### 4.6」「### 4.7」。

## 片段

### AUD-01 · 双人对话与说话人标注
- **中文片段**：`（S1，低沉沙哑的男声）说：<d>[English] 你早就知道了。</d>（S2，清亮的女声，略带迟疑）回答：<d>[English] 是，从上个月起。</d>`
- **英文片段**：`The man with a low, raspy voice (S1) says: <d>[English] You already knew.</d> The woman with a clear, slightly hesitant voice (S2) replies: <d>[English] Yes, since last month.</d>`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：H3 官方格式是 `<d>[语言标签] 台词原文</d>`，说话人 ID 带括号写 `(S1)` / `(S2)`；`<d>` 内**只放**语言标签与用户提供的台词原文，音色、性别、语速、身份短语一律在 `<d>` 外。H3 官方要求改写段用英文，装配 H3 时取英文片段。

### AUD-02 · 单人独白与自述
- **中文片段**：`（S1，中年男性，声音平稳克制）说：<d>[English] 我把最后一封信投进了邮筒，然后开始等。</d>`
- **英文片段**：`The middle-aged man with a steady, restrained voice (S1) says: <d>[English] I dropped the last letter into the mailbox, then I began to wait.</d>`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：独白与出声对话用同一个 `(S1)` 身份体系，**不要另立 OS / VO 标记**（官方没有这套标记法）；若该角色其实在画内，台词后补一句口型同步说明。

### AUD-03 · 口型同步与唇形匹配
- **中文片段**：`（S1）的口型与台词严格同步，逐字吐字清晰，面部不出现多余口型动作；台词结束后嘴唇闭合。`
- **英文片段**：`The lips of (S1) stay perfectly synchronized with the line, each word clearly articulated, with no stray mouth motion, and the lips close as the line ends.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：要说话就写口型同步；要「不开口但有声音」就显式写嘴唇保持闭合——模型默认倾向让人物随口型。官方对画外音的硬要求就是：`</d>` 块之后**紧跟一句**声明画内角色嘴唇闭合。

### AUD-04 · 画外音（官方固定短语）
- **中文片段**：`（S1）用官方固定短语 `says in an off-screen voiceover` 说出画外音：<d>[English] I still remember that road.</d>，紧接一句声明画面中该角色的嘴唇完全闭合。`
- **英文片段**：`The man (S1) says in an off-screen voiceover: <d>[English] I still remember that road.</d> while his lips remain completely closed.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：官方原文要求用**精确短语** `says in an off-screen voiceover`，并且 "Immediately after every voiceover `<d>` block, state that the corresponding on-screen character's lips remain closed"。官方**没有 OS 标记**，也不允许用自造的 OS / VO 标签。

### AUD-05 · 内心独白（同样走官方画外音句式）
- **中文片段**：`内心独白不另立标记：仍由该角色 `(S1)` 用官方固定短语 `says in an off-screen voiceover` 说出：<d>[English] 其实我一直在等这句话。</d>，紧接一句声明画面中该角色的嘴唇保持闭合，只有眼神变化。`
- **英文片段**：`The inner thought is not marked with a separate tag: the same character (S1) says in an off-screen voiceover: <d>[English] Actually, I have been waiting for this line.</d> while his lips remain completely closed, with only his eyes changing.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：官方文件未说明「内心独白」这一类别，也没有 VO 标记；内心独白只能复用画外音的官方短语与闭嘴声明（或写成同一 `(S1)` 的低声自语并明确闭口）。删除旧的 VO 标记法。

### AUD-06 · 歌唱与演唱
- **中文片段**：`（S1）用低声女声演唱：<d>[English] 黄昏把街道染成蜜色。</d>旋律缓慢连贯，演唱自然，不做夸张口型；角色能听见的歌唱写在主描述段。`
- **英文片段**：`The woman with a soft female voice (S1) sings: <d>[English] Dusk turns the street the color of honey.</d> The melody is slow and continuous, the singing natural and without exaggerated mouth shapes, and the song is audible to the character, so it stays in the multimodal description.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：歌唱归入主描述段（`integrated_multimodal_description`），**不要**写进 `overall_soundscape` 或 `non_diegetic_music`；官方明确 "Singing, instruments, radio, television, or phone music audible to the characters are diegetic events and should appear in the multimodal description."

### AUD-07 · 多人对话与同时发声
- **中文片段**：`多人同时发声用复合说话人 ID `(S1,S2)`；要轮流则显式写清顺序与不重叠：先是 `(S1)` <d>[English] 这事儿不能拖。</d>，接着 `(S2)` <d>[English] 那就今晚。</d>，最后 `(S3)` <d>[English] 我来安排。</d>`
- **英文片段**：`When several already-numbered speakers talk at once, use a compound ID such as (S1,S2): The two children (S1,S2) shout together, <d>[English] Wait for us!</d> When they take turns instead, state the order and the non-overlap explicitly: first (S1) <d>[English] We can't drag this out.</d> then (S2) <d>[English] Then tonight.</d> and finally (S3) <d>[English] I'll arrange it.</d>`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：官方并未禁止多人同时发声，反而给了 `(S1,S2)` 复合 ID 写法；官方也没有「三人以上必须轮流」的规定。要轮流必须自己写明顺序与不重叠。说话人 ID 跨镜保持不变；从不发声的角色不给 ID。

### AUD-08 · 环境底噪（room tone）
- **中文片段**：`环境底噪为安静的室内空气声，隐约有冰箱低鸣与远处楼房的交通闷响，音量极低、始终持续，不断也不突变。`
- **英文片段**：`Room tone is a quiet interior air bed, with a faint refrigerator hum and distant muffled city traffic, kept at a very low level and continuous throughout without swells or drops.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：room tone 是铺底用的低电平噪声层，作用是消除「数字真空感」；一定要写「持续、不突变」，否则会出现忽有忽无的呼吸感。H3 侧写进 `overall_soundscape`。

### AUD-09 · 物理音效绑定到具体动作
- **中文片段**：`物理音效逐项绑定动作：脚落地时出现鞋底与地面的接触声，手推开木门时出现门轴吱呀声，手指翻动纸张时出现纸张摩擦声，餐具碰撞时出现清脆瓷器声。`
- **英文片段**：`Physical sounds are bound to specific actions: a shoe-contact thud on each footfall, a door hinge creak as the hand pushes the wooden door, paper rustling as fingers turn the page, and a crisp porcelain clink when the dishes meet.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：不要写「有很多音效」，要写「哪个动作配哪个声」；音效必须和画面动作一一对应，否则音画错位。H3 侧的物理音效写进 `overall_soundscape`，但与画面动作同步的叙事内声音也可写在主描述段。

### AUD-10 · 拟音强调与关键音前置
- **中文片段**：`在关键动作发生时突出单一音效：拉链被拉开的一瞬金属齿链声被放大并置于前景，其余环境音瞬间下沉，形成瞬间的听觉聚焦。`
- **英文片段**：`On the key action, one sound is emphasized: as the zipper opens, the metallic tooth chain is brought to the foreground while all other ambience briefly drops, creating a moment of auditory focus.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：强调 = 前景化 + 其余下沉，两者要一起写；只写「突出」而不写「其余下沉」会造成整体音量被推高。

### AUD-11 · 静默作为音效设计
- **中文片段**：`设计一段刻意的静默：在人物说完最后一句话后，环境音与配乐几乎全部退去，只剩极轻微的呼吸与衣物摩擦，用听觉留白强调转折。`
- **英文片段**：`A deliberate silence is designed: after the last line, ambience and music fall almost entirely away, leaving only faint breathing and clothing rustle, using auditory space to mark the turn.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：静默必须写成「主动设计」并说明退到多低（几乎 / 极轻微），否则模型理解为音量归零，画面会像被剪断。注意这与 `overall_soundscape` 写 `N/A` 是两回事——`N/A` 只用于**全片**静默。

### AUD-12 · 场景环境音：城市雨夜
- **中文片段**：`场景环境音为城市雨夜：密集雨点敲打柏油路面与金属车顶，雨幕中远处有汽车轮胎溅水声和一两声闷雷，整体宽频、无突发尖叫。`
- **英文片段**：`The soundscape is a city on a rainy night: dense rain drumming on asphalt and metal car roofs, distant tires cutting through puddles and one or two muted thunderclaps, overall broadband with no sudden shrill peaks.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：雨夜类高频素材容易产生刺耳高频，追加「无突发尖叫」类限制词能显著降低爆音。H3 侧整段并入 `overall_soundscape` 的同一连续段落。

### AUD-13 · 场景环境音：森林清晨
- **中文片段**：`场景环境音为森林清晨：树叶被风吹动的沙沙声、零星鸟鸣与远处溪流声交织，整体安静开阔，无城市噪音、无机械声。`
- **英文片段**：`The soundscape is a forest at dawn: leaves rustling in the breeze, scattered birdsong woven with a distant stream, overall quiet and open, free of city noise and machinery.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：写「无 X」要具体（无城市噪音、无机械声），比写「自然」更能压住模型默认塞入的交通与嗡鸣。

### AUD-14 · 场景环境音：室内办公室
- **中文片段**：`场景环境音为白天办公室：空调出风的稳定气流声、键盘敲击与鼠标点击的细碎声、远处打印机的短促运转声，整体干净克制，无突发铃声与人声嘈杂。`
- **英文片段**：`The soundscape is a daytime office: steady HVAC airflow, small keystrokes and mouse clicks, and a short printer run in the distance, overall clean and restrained, without sudden phone rings or crowd chatter.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：室内职场场景常用此段；把「无突发来电铃声、无人群嘈杂」补上，可避免自动生成电话铃与谈话声。

### AUD-15 · 场景环境音：地铁车厢
- **中文片段**：`场景环境音为地铁车厢：列车行驶的低频轰鸣与钢轨规律的咔哒声、车厢内空调风声，报站提示音偶发一次，整体有持续的低频包裹感。`
- **英文片段**：`The soundscape is a subway car: a low rolling roar with regular rail clacks, cabin air-conditioning hiss, and one occasional station announcement, giving a sustained low-frequency sense of enclosure.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：交通工具声以低频为主，写「低频轰鸣 + 规律咔哒」比写「地铁声」有效得多。

### AUD-16 · 场景环境音：工厂车间
- **中文片段**：`场景环境音为工厂车间：机械运转的低频嗡鸣、周期性液压冲压的沉闷撞击、金属零件落地的清脆声，空间回响明显，无人声。`
- **英文片段**：`The soundscape is a factory floor: low machinery hum, periodic muffled hydraulic presses, and bright metallic parts hitting the floor, with obvious room reverberation and no voices.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：工业场景要写「回响明显」，否则声场过干；同时写「无人声」防止混入背景对白。

### AUD-17 · 场景环境音：厨房
- **中文片段**：`场景环境音为家中厨房：油在锅中噼啪作响、刀刃切过砧板的节奏声、水龙头短促流水声与碗碟轻碰声，温和有生活感。`
- **英文片段**：`The soundscape is a home kitchen: oil crackling in a pan, the rhythmic sound of a blade on a cutting board, a short run of tap water, and light clinks of bowls and plates — warm and lived-in.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：厨房类素材靠「动作—声音」对最出效果；避免与配乐层的锅碗节奏重叠描述。

### AUD-18 · 配乐描述句式（乐器编制 + 速度 + 节奏 + 动态变化）
- **中文片段**：`配乐为{配乐风格}：{主导乐器与织体}，{速度}，{节奏型}，{动态变化}；音量低于环境音，仅作背景铺底，不覆盖对白；不写抽象情绪词，也不解释配乐的情绪功能。`
- **英文片段**：`The score is {music style}: {lead instruments and texture}, {speed}, {rhythm pattern}, and {dynamic changes}; mixed below the ambience as background underlay and never covering the dialogue, with no abstract mood words and no explanation of the score's emotional function.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：官方原文要求 "Focus on instrumentation, speed, rhythm, and dynamic changes; **do not use abstract mood words or explain the emotional function of the score**"。常见风格直接替换占位符——黑色电影（noir）＝低音大提琴长音 + 稀疏拨弦；轻快 ukulele＝明快拨弦循环；史诗管弦＝弦乐渐强 + 铜管主题 + 定音鼓；lo-fi＝低速 70–80 BPM、轻微磁带噪声与柔和垫底。只写「悬疑音乐」四个字不写乐器，输出会随机化。

### AUD-19 · 音乐与动作同步（鼓点落在剪切点）
- **中文片段**：`音乐与动作同步：鼓点与剪辑点严格对齐，每次切镜正好落在一次鼓点上，配乐在切镜瞬间短暂停顿再续上，形成卡点感。`
- **英文片段**：`Music is synced to action: the drum hits align precisely with the cuts, each edit landing exactly on a beat, with the score briefly stalling on the cut before resuming to create a rhythmic snap.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：需要说明「落在剪切点」时，H3 需在分镜段落与配乐字段同时写明拍数，Seedance 2.5 则在动作与时间段落标注节拍。

### AUD-20 · 音量层级（对白 > 环境音 > 配乐）
- **中文片段**：`音量层级明确：对白最清晰、位于最前；环境音与物理音效居中，作为空间底噪；配乐最低，仅作背景铺底，三者比例保持稳定不互相遮盖。`
- **英文片段**：`The audio hierarchy is explicit: dialogue is clearest and in front, ambience and physical sounds sit in the middle as a spatial bed, and music is lowest as background underlay, with the balance steady and never masking one layer.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：层级要一次写清并注明「比例稳定」；否则低频配乐容易盖住对白齿音，导致台词糊成一团。

### AUD-21 · `<d>` 对白标签的官方规则
- **中文片段**：`对白一律写成 `<d>[语言标签] 台词原文</d>`：说话人身份短语、说话人 ID、动作与语气全部写在 `<d>` 外面；`<d>` 内只有语言标签与用户提供的台词原文，逐字保留原文的每一个词与标点，不翻译、不改写。`
- **英文片段**：`Every line of dialogue is written as <d>[language tag] the user's spoken content</d>: the speaker's identifying phrase, the speaker ID, the action and the delivery all sit outside <d>, and inside <d> there is only the language tag and the user-provided words, preserved verbatim, without translation or rewriting.`
- **适用**：H3
- **要点**：官方原文："Place the speaker's identifying phrase, ID, action, and delivery outside `<d>`. Inside `<d>`, include only the language tag and the actual user-provided spoken content. Preserve every original word and punctuation mark verbatim; do not translate or rewrite them." 官方示例：`The young woman with a quiet, breathy voice (S1) says: <d>[English] I get off at the next station.</d>`

### AUD-22 · 画外音后的闭嘴声明（硬要求）
- **中文片段**：`每个画外音 `<d>` 块之后必须紧跟一句声明画内角色的嘴唇保持闭合，不留空档、不改写成别的说法。`
- **英文片段**：`Immediately after every voiceover <d> block, state that the corresponding on-screen character's lips remain closed, with no gap and no rephrasing.`
- **适用**：H3
- **要点**：官方原文："Immediately after every voiceover `<d>` block, state that the corresponding on-screen character's lips remain closed." 官方示例：`The man (S1) says in an off-screen voiceover: <d>[English] I still remember that road.</d> while his lips remain completely closed.`

### AUD-23 · `overall_soundscape` 的句数与 N/A 条件
- **中文片段**：`整体声景写 1~4 个英文句、放在一个连续段落里；只有用户明确要求全片静默时才写 N/A，其他任何情况都必须写出实际的环境声、物理动作声与非语言人声。`
- **英文片段**：`The overall soundscape uses 1-4 English sentences in one continuous paragraph; write N/A only when the user explicitly requests complete silence throughout the video, and in every other case describe the actual ambience, physical action sounds and non-verbal human sounds.`
- **适用**：H3
- **要点**：官方原文："Use 1–4 English sentences in one continuous paragraph… Use `N/A` only when the user explicitly requests complete silence throughout the video." 分段写、超过 4 句、把对白或音乐塞进来，都是不合规写法。

### AUD-24 · `non_diegetic_music` 的写法边界
- **中文片段**：`非叙事性音乐写 1~3 个英文句，只描述观众听得见、角色听不见的配乐的乐器编制、速度、节奏与动态变化；不写抽象情绪词，不解释配乐的情绪功能；没有这类配乐时写 N/A。`
- **英文片段**：`The non-diegetic music uses 1-3 English sentences describing only what the audience can hear and the characters cannot: instrumentation, speed, rhythm and dynamic changes, with no abstract mood words and no explanation of the score's emotional function; write N/A when there is no non-diegetic music.`
- **适用**：H3
- **要点**：官方原文见「### 4.7」。角色能听到的歌唱、乐器、收音机 / 电视 / 手机音乐属叙事内事件，必须写在主描述段，不能写进 `non_diegetic_music`。

### AUD-25 · 听不清的台词与标点规范化
- **中文片段**：`听不清的台词片段写 `[unclear]`，不猜测也不改述；对白标点规范化为 `,` `.` `?` `!` 等基本书面标点，去掉波浪号、emoji、项目符号与重复装饰性标点，完整陈述句、疑问句、感叹句在 `</d>` 之前分别以 `.` `?` `!` 收束。`
- **英文片段**：`Write [unclear] for unintelligible spans instead of guessing or paraphrasing them, and standardize punctuation to the basic written marks needed to express the sentence, such as , . ? and !, removing repeated tildes, emoji, bullets and decorative punctuation; end complete statements, questions and exclamations with . ? or ! respectively before </d>.`
- **适用**：H3
- **要点**：这两条出自官方 Ref2VA 指南「### 5.4 Speakers, Audio Sources, and Dialogue」，是官方明确写下的写法，不是库的经验判断。

### AUD-26 · 不可辨的争辩声（unintelligible overlapping voices）
- **中文片段**：`两人交叠的喊声持续{时段}，音量起伏明显、词句不可辨、不写出具体台词；若确有台词文本，一律按 <d>[语言标签] 台词原文</d> 写入主描述段。`
- **英文片段**：`Overlapping raised voices run through {the span}, with clear volume movement and no intelligible words; any actual line text must be written into the multimodal description as <d>[language tag] verbatim line</d>.`
- **适用**：两者
- **要点**：先说清「不可辨」这一事实，再给「有台词时的唯一正确去处」，避免模型自行编词或自动生成字幕。

### AUD-27 · Seedance 2.5 的四种符号规范（音乐 / 音效 / 对白 / 字幕）
- **中文片段**：`Seedance 2.5 用四种符号：音乐写进 ()，音效写进 <>，对白写进 {}，字幕写进 【】。音乐：(轻快的电子节拍，鼓点清晰)；音效：<门轴吱呀声>；对白：{小李（男声，平静）：门没锁。}；字幕：【字幕：门没锁】。`
- **英文片段**：`Seedance 2.5 uses four symbols: music in (), sound effects in <>, dialogue in {}, and subtitles in 【】. Music: (upbeat electronic beat with a clear kick drum); Sound effect: <door hinge creak>; Dialogue: {Xiao Li (male, calm): The door isn't locked.}; Subtitle: 【Subtitle: The door isn't locked.】`
- **适用**：Seedance 2.5
- **要点**：出处 `library/intel/seedance-2-5-official.md`「五、符号规范（官方 Skill 明确给出）★」。官方表格：音乐 `()`、音效 `<>`、对白 `{}`、字幕 `【】`。**两边语法不同，绝不能混用**：H3 的对白标签是 `<d>[English] 台词</d>`（尖括号 + `d` 标签），Seedance 2.5 的对白是 `{}`（花括号）——H3 里写 `{}`、Seedance 里写 `<d>` 都会被模型当普通文本。同一模型内部也不要错配：不要用 `()` 括住对白、不要用 `<>` 括住音乐、不要用 `{}` 括住字幕。

### AUD-28 · 对白逐段标注规范（语言 / 说话者 / 语气 / 准确台词）
- **中文片段**：`{安娜（女声，轻声，带一点犹豫）：我们明天再谈。}{陈默（男声，低沉，语速慢）：不是明天。}{多人对白时：非说话者自然闭口，侧耳听讲，嘴唇不动，不发出任何声音。}`
- **英文片段**：`{Anna (female, soft, slightly hesitant): Let's talk about it tomorrow.}{Chen Mo (male, low, slow pace): Not tomorrow.}{When more than one person is present: everyone who is not speaking keeps their mouth naturally closed, listens attentively, does not move their lips, and makes no sound.}`
- **适用**：Seedance 2.5
- **要点**：出处同上「五、符号规范」——官方原文："对白要逐段标明**语言、说话者、语气、准确台词**；多人对白时说明非说话者自然闭口并听讲。" 另："用户没指定语言时，**不得自行推断**普通话、方言或地区口音。" 用户没给语言时，不要自己加"中文/普通话/东北口音"之类标签，也不要替角色编方言；需要指定语言就先问用户，或按参考素材里已有的语言处理。

### AUD-29 · 字幕抑制的加强写法（官方常见问题对策）
- **中文片段**：`不要字幕，不额外加入对白字幕，画面不出现任何字幕条与标题字。台词按「角色台词（情绪）：内容」格式写：{李（愤怒）：你早就知道。}；台词后不追加语气、表情、动作等描述。所用参考视频本身不含字幕。`
- **英文片段**：`No subtitles, no additional dialogue subtitles, and no caption bars or title cards on screen. Write lines in the "character line (emotion): content" format: {Li (angry): You already knew.}; do not append tone, expression or action descriptions after a line. The reference videos used must contain no subtitles themselves.`
- **适用**：Seedance 2.5
- **要点**：出处 `seedance-2-5-official.md`「七、负向控制（官方）」→「官方常见问题里的加强写法」→「字幕约束不生效」三条原文："避免在台词后复述词语并追加语气、表情、动作等描述，此类描述容易诱发字幕生成。"；"需要对台词做差异化要求时，按「**角色台词（情绪）：内容**」的格式拆分描述。"；"确保参考视频本身不含字幕，否则「无字幕」指令可能失效。"

### AUD-30 · 背景音乐抑制的加强写法（官方常见问题对策）
- **中文片段**：`音频仅保留角色人声声源，不产出任何音乐类音轨：不要音乐、不要背景音乐、不要 BGM、不要配乐、不要器乐、不要旋律、不要合成器音效、不要氛围铺底音。无 bgm，只生成环境音和动作音。（音频约束在提示词开头与结尾各写一遍。）`
- **英文片段**：`The audio keeps only the characters' spoken voices as sources and produces no music track of any kind: no music, no background music, no BGM, no score, no instrumental, no melody, no synthesizer texture, no ambient pad. No BGM, only ambience and action sounds. (Write the audio constraint once at the beginning and once again at the end of the prompt.)`
- **适用**：Seedance 2.5
- **要点**：出处 `seedance-2-5-official.md`「七、负向控制（官方）」→「背景音乐约束不生效」原文："明确「音频仅保留角色人声声源」「不产出任何音乐类音轨」，并**一次性穷举音乐类同义词**（音乐、背景音乐、BGM、配乐、器乐、旋律、合成器音效、氛围铺底音等），避免模型替换表述绕过约束。"、"将音频约束在提示词的**开头与结尾各写一遍**，强化模型注意力。" —— 同义词要一次性写全，漏一个模型就会用那个词绕回来。

### AUD-31 · 音效控制的三种写法（单独关音效 / 单独关 BGM / 全部静音）
- **中文片段**：`① 只关音效（保留对白与 BGM）：不要音效，无动作音效、无环境音效。② 只关 BGM（保留环境音与动作音）：无 bgm，只生成环境音和动作音。③ 全部静音：不要任何声音。`
- **英文片段**：`① Turn off sound effects only (keeping dialogue and BGM): no sound effects, no action sounds, no ambient effects. ② Turn off BGM only (keeping ambience and action sounds): no BGM, only ambience and action sounds. ③ Complete silence: no sound of any kind.`
- **适用**：Seedance 2.5
- **要点**：出处 `seedance-2-5-official.md`「七、负向控制（官方）」——官方原文："支持负向控制音频：支持**更细维度的单独控制：音效、背景音乐（bgm）、对白**。" 官方示例：「无 bgm，只生成环境音和动作音」「不要任何声音」。三种写法不要混用：要静音就只写"不要任何声音"，不要再在同一提示词里保留"保留对白"之类的话，否则模型会各取一半。

### AUD-32 · 对白控制（单独关闭对白，保留环境音与音乐）
- **中文片段**：`不要对白，无角色说话，无旁白与画外音；保留环境音与背景音乐。`
- **英文片段**：`No dialogue, no character speech, no narration and no voiceover; keep the ambience and the background music.`
- **适用**：Seedance 2.5
- **要点**：出处 `seedance-2-5-official.md`「七、负向控制（官方）」——对白是官方可单独负向控制的四类之一（字幕 / 音效 / BGM / 对白）。关对白时**不要**写"不要任何声音"，那会连环境音和音乐一起关掉；反过来，要静音才写"不要任何声音"。若同时要"人物自然闭口"，用 AUD-34 的写法补一句。

### AUD-33 · 官方音画问题对策（翻译语种混淆 / 水波纹噪声 / 口型同步）
- **中文片段**：`① 音频翻译语种混淆：所有角色的可辨识人声（含背景里的对白、低语、感叹词）都要翻译成{目标语言}，口型与台词逐字同步；验收标准：画面中所有可辨识人声均为{目标语言}，且每个人物的嘴部动作与所说内容逐字对应，不出现其它语种。② 音频水波纹噪声：移除提示词中所有与水、波浪、回音相关的描述。③ 口型同步：口型与台词严格同步，逐字吐字清晰，面部不出现多余口型动作，台词结束后嘴唇闭合。`
- **英文片段**：`① Confused audio translation: every intelligible human voice (including background dialogue, whispers and interjections) must be translated into {target language}, with the lips synced word for word; acceptance criteria: every intelligible voice on screen is in {target language}, and each character's mouth movement matches the spoken content word for word, with no other language present. ② Audio water-ripple noise: remove every description related to water, waves or echoes from the prompt. ③ Lip sync: the lips stay perfectly synchronized with the line, each word clearly articulated, with no stray mouth motion, and the lips close as the line ends.`
- **适用**：Seedance 2.5
- **要点**：出处 `seedance-2-5-official.md`「十三、官方常见问题速查（写作时直接用）」——「音频翻译语种混淆」官方解法："明确**所有角色**（含背景可辨识对白、低语、感叹词）都要翻译；逐字同步口型；写明验收标准"；「音频水波纹噪声」："移除提示词中与水、波浪、回音相关的描述"；口型同步写法另见 `seedance-2-5-official.md`「五、符号规范」与本库 AUD-03。

### AUD-34 · 无对白任务的四件套声明
- **中文片段**：`画面中的人物自然闭口，不说话；无旁白；仅保留{指定环境声，如：室内空调低鸣与远处车流闷响}；画面无字幕；不出现额外招牌文字。`
- **英文片段**：`The people on screen keep their mouths naturally closed and do not speak; there is no narration; only {the specified ambience, such as a low HVAC hum and distant muffled traffic} is kept; there are no subtitles on screen; no extra signage text appears.`
- **适用**：Seedance 2.5
- **要点**：出处 `seedance-2-5-official.md`「五、符号规范（官方 Skill 明确给出）★」——官方推荐写法原文："无对白任务的官方推荐写法：人物自然闭口 + 无旁白 + 仅保留指定环境声 + 画面无字幕 + 不出现额外招牌文字。" 同处官方另注："不得自动加入字幕、标志、水印、重复主体、稳定包或用户未要求的负向限制。" —— 不要顺手补模型没要求的负向限制。（这四条属于官方推荐的无对白声明，不算官方所指的「用户未要求的额外负向限制」，可放心使用。）

### AUD-35 · 画面文字的拼写规避
- **中文片段**：`{画面文字做法一：把单词拆分为独立字母并要求按顺序出现——画面上的招牌由独立字母按顺序出现：S、T、A、R、T}。{画面文字做法二：把文字制成图片作为参考素材——@Image2 为已渲染好该文字的图片，画面中的招牌使用 @Image2 中的文字，逐字一致，不拼写错误。}`
- **英文片段**：`{Option one for on-screen text: spell the word out as separate letters in order — the sign on screen appears as separate letters in order: S, T, A, R, T}.{Option two for on-screen text: render the text as an image and pass it as a reference asset — @Image2 is an image with the text already rendered, and the sign on screen uses the lettering from @Image2, letter for letter, with no misspelling.}`
- **适用**：Seedance 2.5
- **要点**：出处 `seedance-2-5-official.md`「十三、官方常见问题速查」——「画面文字拼写错误」官方解法："把单词**拆分为独立字母**并要求按顺序出现；或把文字**制成图片**作为参考素材。" 补充：Seedance 2.5 的**字幕**用 `【】`（见 AUD-27），而招牌、霓虹字、标签等**画面上真正可见的文字**属另一类问题——模型直接写字母容易拼错，能交给图片素材就交给图片素材。

## 排错提示

- **三者混写**：H3 里对白必须放 `integrated_multimodal_description`、环境与物理音放 `overall_soundscape`、配乐放 `non_diegetic_music`，三个字段各写各的；塞在同一段里会导致声场层级失控、模型把配乐混进对白。官方原文："Dialogue, singing, and diegetic music already belong in the multimodal description and should not be repeated here."
- **台词用了引号而不是 `<d>`**：H3 的对白标签是 `<d>[English] ...</d>`（官方「### 4.4」），不是引号；引号写法模型不认，且容易把台词当画面文字。
- **台词被念出声音特征**：音色、性别、语速、身份短语必须写在 `<d>` 外；放进 `<d>` 内模型会逐字念出来。
- **画外音还在用 OS / VO 标记**：官方没有 OS / VO 标记法。改用官方固定短语 `says in an off-screen voiceover`，并在 `<d>` 块之后紧跟一句画内角色嘴唇闭合的声明。
- **该闭嘴的人在动嘴**：没写「嘴唇保持闭合 / lips remain closed」时，模型默认给画面人物配上口型，音画立刻错位。
- **`overall_soundscape` 写成 N/A**：只有用户明确要求全片静默时才写 `N/A`；其他情况必须写 1~4 个英文句、一个连续段落的环境声 / 物理动作声 / 非语言人声。
- **配乐写了情绪词**：非叙事配乐里不写「悲伤、悬疑、治愈」这类抽象词，也不解释配乐的情绪功能，只写乐器编制、速度、节奏、动态变化。
- **角色听得到的音乐被写进配乐层**：收音机、电视、现场演奏、角色自己的歌声属叙事内事件，写在主描述段。
- **音效无的放矢**：写「丰富的环境音」而不是绑定具体动作，输出就是一堆与画面无关的通用音；始终写成「动作 → 声音」的对应句。
- **音画不同步**：音效和画面动作写在不同段落且没有先后关系时，模型会错位；把音效紧跟在对应动作之后描述。
- **雨夜/机械场景爆音**：高频环境音容易出现刺耳峰值，追加「无突发尖叫 / 无刺耳高频」类限制。
- **配乐盖住对白**：没有写音量层级时低频铺底最容易压住人声；用 AUD-20 明确「对白 > 环境音 > 配乐」。
- **回声过重**：室内小空间未提示时模型会加长混响；写「混响轻微、贴近现实」把空间感拉回来。
- **Seedance 里把对白写成 `<d>`**：`<d>[English] ...</d>` 是 **H3** 的语法，Seedance 2.5 的对白用 `{}`。用 AUD-27 的四符号写法。
- **Seedance 里把音乐写进 `<>` 或对白写进 `()`**：符号错配，模型会当噪声忽略；音乐 `()`、音效 `<>`、对白 `{}`、字幕 `【】`，一一对应不串位。
- **写了「不要字幕」还是出字幕**：多半是台词后面跟了语气/表情/动作描述诱发的。按 AUD-29 改成「角色台词（情绪）：内容」，并确认参考视频本身无字幕。
- **写了「不要 BGM」还是出音乐**：模型换了同义词绕过去。按 AUD-30 一次性穷举音乐类同义词，并把音频约束在提示词开头与结尾各写一遍。
- **只想关音效却把整个声音关了**：不要写「不要任何声音」——那是全静音（见 AUD-31）；只想关对白就用 AUD-32 的写法并保留环境音与音乐。
- **角色台词语种被模型自己改成方言/普通话**：用户没指定语言时不得自行推断（见 AUD-28），也不要替角色编口音。
- **无对白片里人物在动嘴**：补 AUD-34 的四件套——自然闭口 + 无旁白 + 仅保留指定环境声 + 画面无字幕 + 不出现额外招牌文字。
