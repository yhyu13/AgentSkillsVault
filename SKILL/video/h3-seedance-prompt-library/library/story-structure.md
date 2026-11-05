---
id: story-structure
title: 分镜脚本与叙事结构
dimension: 分镜脚本与叙事结构
applies_to: [H3, Seedance2.5]
model_field: 全局结构（先于各维度装配）
---

# 分镜脚本与叙事结构

> **装配位置**：H3 → 全局（先定结构再填字段） ｜ Seedance 2.5 → 全局（先定结构再填七段）
> **一句话用法**：先按目标时长倒推镜头数与节拍——H3 走 4~15 秒（超 15 秒必须拆条），Seedance 2.5 走 ≤30 秒四拍——再把每一拍翻译成"一句话一个镜头"的分镜脚本，最后按官方 `Per-Second Directives` 与镜头表自检门逐项核对。
>
> **官方口径**：`SKILL.md`「## Tips for Better Results」——"Always match the total duration of the description to the requested video length (4–15 seconds)." 因此 30 秒四拍、三幕式、60~90 秒单集都**只适用于 Seedance 2.5**；H3 侧一律走 ≤15 秒三拍裁切版。

## 片段

### STO-01 · 30 秒四拍结构总纲
- **中文片段**：`全片 30 秒分四拍：0-4 秒钩子（{视觉钩子}），4-12 秒建立情境（{人物/地点/处境}），12-22 秒核心变化（{冲突/转折事件}），22-30 秒收尾定格（{结果与落板画面}）；每一拍只承担一个叙事功能，不叠加。`
- **英文片段**：`The 30-second piece follows four beats: 0-4s hook ({visual hook}), 4-12s setup ({character / place / situation}), 12-22s core turn ({conflict or turning event}), 22-30s closing freeze ({outcome and end frame}); each beat carries one narrative function only, with no stacking.`
- **适用**：Seedance 2.5
- **要点**：四拍是节拍表（beat sheet）不是时间轴模板。**不适用于 H3**——官方 H3 单条上限 15 秒；要做 30 秒必须拆成多条分别生成再拼接。

### STO-02 · H3 ≤15 秒三拍裁切版
- **中文片段**：`本条 {8|10|12|15} 秒：0-{3} 秒直接给出{钩子画面}，{3}-{9} 秒{人物完成一个明确动作/事件}，{9}-{总时长} 秒镜头{推进或定格}收在{结果画面}上，无铺垫、无第二情节。`
- **英文片段**：`This {8|10|12|15}-second clip: seconds 0-{3} open directly on {hook image}, {3}-{9} {character completes one clear action or event}, and {9}-{total duration} the camera {pushes in or holds} and settles on {result image}; no setup, no second plot.`
- **适用**：H3
- **要点**：官方口径「Always match the total duration of the description to the requested video length (4–15 seconds)」——H3 提示词描述的总时长必须落在 4~15 秒，**超出 15 秒必须拆条**。15 秒塞三段戏必然崩：只允许一个动作、一条情绪线、一次镜头转折。

### STO-03 · Seedance 2.5 ≤30 秒四拍落位
- **中文片段**：`30 秒结构：钩子占 0-4 秒，情境铺垫占 4-12 秒，核心变化占 12-22 秒，结尾定格占 22-30 秒；镜头在第 4、12、22 秒这三个节点切换景别或机位，其余时间保持单镜头连续。`
- **英文片段**：`30-second structure: hook at 0-4s, setup at 4-12s, core turn at 12-22s, closing freeze at 22-30s; the shot changes framing or camera position at the 4s, 12s and 22s marks only, remaining continuous within each beat.`
- **适用**：Seedance 2.5
- **要点**：Seedance 2.5 官方未设字数上限，但四拍信息仍要压成节拍标签而非叙事解释；时间轴用区间/时间点/阶段表达，区间之间不留缺口，目标总时长属参数不写进提示词。

### STO-04 · 前 3 秒钩子：悬念型
- **中文片段**：`第 1 秒画面是{反常/未完成状态的特写}，画面中不出现解释性信息，第 3 秒前不给答案，只让观众确认"有件事不对劲"。`
- **英文片段**：`The first second is a close-up of {an abnormal or unfinished state} with no explanatory information; no answer arrives before the third second, so the viewer only registers that something is wrong.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：悬念钩子必须给到具体视觉信息，不能靠标题字幕或旁白提问撑着；空镜加一行字是弱钩子，容易被划走。

### STO-05 · 前 3 秒钩子：反常识型
- **中文片段**：`开场呈现{违反日常经验的画面}，例如{细节描述}；镜头保持稳定不解释反常原因，把判断权交给观众。`
- **英文片段**：`Open on {a scene that violates everyday logic}, such as {detail description}; the camera stays stable and does not explain the anomaly, leaving the judgment to the viewer.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：反常识必须在第一帧就成立；用 0.5 秒闪一下再接回正常画面，模型往往会把它"理解"成画面损坏或转场。

### STO-06 · 前 3 秒钩子：强视觉型
- **中文片段**：`前 3 秒是全片最强的一帧画面：{高对比主体动作 / 极端尺度对比 / 突发物理事件}，景别为{特写或大远景}，画面一眼可辨、无字幕遮挡。`
- **英文片段**：`The first 3 seconds are the strongest frame of the piece: {high-contrast action / extreme scale contrast / sudden physical event}, framed as {close-up or extreme long shot}, instantly readable with no text overlay.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：强视觉钩子靠构图和物理奇观，不靠台词；把最有价值的一帧放最后是常见错误——钩子必须消耗在第一秒。

### STO-07 · 前 3 秒钩子：提问型
- **中文片段**：`开头 3 秒内由{人物}看向镜头并提出{一个问题}，问题指向画面中已存在的{可见线索}，第 4 秒画面给出该线索的第一个局部答案。`
- **英文片段**：`Within the first 3 seconds {character} looks into the lens and asks {a question}; the question points at {visible clue} already in frame, and by the 4th second the frame gives the first partial answer.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：H3 侧提问靠对白段落实现，台词必须写成官方格式 `<d>[English] ...</d>`；若改用画外音承担提问，用官方固定短语 `says in an off-screen voiceover` 并紧跟一句闭嘴声明。无论哪种，都必须补足视觉线索。

### STO-08 · 故事骨架：起承转合
- **中文片段**：`故事按起承转合推进：起（{建立人物与欲望}）→ 承（{障碍与试探}）→ 转（{意外信息/背叛/发现}）→ 合（{人物做出选择并承担结果}）；四段各占一个镜头单元，转折点必须落在第 12 秒之后。`
- **英文片段**：`The story runs setup → development → turn → resolution: setup ({character and desire}) → development ({obstacle and probing}) → turn ({unexpected information / betrayal / discovery}) → resolution ({the character chooses and bears the outcome}); each stage gets one shot unit, and the turn must land after the 12th second.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：起承转合是内容骨架，四拍是时间骨架；把"转"塞进前 4 秒会让全片失去铺垫，但"转"缺失则是流水账。

### STO-09 · 三幕式结构
- **中文片段**：`采用三幕式：第一幕（0-12 秒）交代{人物、目标与阻碍}并埋下{钩子线索}；第二幕（12-22 秒）对抗{阻力}，中点处出现{新信息}；第三幕（22-30 秒）{主角做出不可逆选择}并以{定格画面}收束。`
- **英文片段**：`Use a three-act structure: Act I (0-12s) establishes {character, goal and obstacle} and plants {hook clue}; Act II (12-22s) fights {the resistance}, with {new information} at the midpoint; Act III (22-30s) has {the protagonist make an irreversible choice} and closes on {a held frame}.`
- **适用**：Seedance 2.5
- **要点**：三幕在 30 秒里每幕只有几秒，幕与幕之间不能有明显"幕布"感；用因果连缀（因为→所以）代替省略号式的跳跃。**不适用于 H3**（官方 H3 单条上限 15 秒）。

### STO-10 · AI 短剧单集结构
- **中文片段**：`单集结构（每集 60~90 秒）：冷开场 3 秒接前集悬念 → 30 秒内交代本集目标 → 中段一次反转或信息揭露 → 结尾留一个未解答的问题与一个未完成的动作，供下一集接续。`
- **英文片段**：`Episode structure (60-90s each): a 3-second cold open picking up the previous cliffhanger → the episode's goal stated within 30s → one reversal or information reveal in the middle → the episode ends on an unanswered question and an unfinished action for the next episode.`
- **适用**：Seedance 2.5
- **要点**：单集只允许一个主要矛盾和一次反转；AI 短剧最常见的塌房是每集都想讲完整故事，导致每集都没有钩子可留。**不适用于 H3 单条生成**——H3 侧要把单集拆成多条 4~15 秒片段分别生成再拼接。

### STO-11 · 连载结构：开场冲突—升级—反转—悬念留钩
- **中文片段**：`本集叙事线：开场直接进入冲突（{冲突事件}）→ 冲突升级（{压力加大/代价提高}）→ 反转（{信息或立场翻转}）→ 悬念留钩（{结尾定格在一个未解释的异常画面或半句台词上}）。`
- **英文片段**：`This episode's line: open directly on conflict ({conflicting event}) → escalation ({rising pressure or higher stakes}) → reversal ({information or stance flip}) → cliffhanger ({the ending holds on an unexplained anomaly or a half-spoken line}).`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：留钩子必须落在"画面未解释"上，而不是靠"下集预告"字幕；把最后 1.5 秒留作悬念定格，别让收尾动作在片尾被剪断。H3 侧这条结构只在一段 4~15 秒的片段内成立，整集仍需拆条拼接。

### STO-12 · 旁白叙事线
- **中文片段**：`旁白是故事叙述者，与画面信息分工：旁白负责交代{时间跨度/背景/人物动机}，画面负责呈现{当下动作与可见证据}；两者不重复同一信息。H3 侧旁白用官方固定短语 `says in an off-screen voiceover` 写出，并在 `<d>` 块之后紧跟一句声明画内角色嘴唇保持闭合。`
- **英文片段**：`Voice-over narration is the story's narrator, split from the image: the narration carries {time span, context and character motivation} while the picture shows {present action and visible evidence}; the two never repeat the same information. On H3 the narration uses the exact phrase says in an off-screen voiceover, immediately followed by a statement that the on-screen character's lips remain closed.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：旁白最好只写一句并给出明确的信息增量；旁白与画面各说各话时观众会同时关字幕和关声音，结果两条都丢。官方文件**没有 OS / VO 标记法**，旁白一律走官方画外音短语。

### STO-13 · 口播脚本结构：钩子—痛点—方案—行动号召
- **中文片段**：`口播分四段：钩子（0-5 秒，用{提问或反常识断言}开场）→ 痛点（5-20 秒，描述{用户困境}并给出具体场景）→ 方案（20-45 秒，展示{产品如何解决该痛点}）→ 行动号召（45-60 秒，{一句话指令 + 明确收益}）。`
- **英文片段**：`The spoken script has four parts: hook (0-5s, opening with {a question or counterintuitive claim}) → pain point (5-20s, describing {the user's predicament} in a concrete scene) → solution (20-45s, showing {how the product solves it}) → call to action (45-60s, {one instruction plus a clear benefit}).`
- **适用**：Seedance 2.5
- **要点**：口播稿要写成"能念出口的句子"，不是提示词；一段口播只放一个卖点，多个卖点会互相稀释。60 秒口播超出 H3 单条上限，须拆条。

### STO-14 · 产品广告结构：痛点—特写—场景—对比—落板
- **中文片段**：`广告结构：痛点画面（{使用前的困扰}）→ 产品特写（{产品的关键细节/材质/机构}，占画面主体）→ 使用场景（{真实环境中的应用}）→ 对比（{使用前/使用后同框对比}）→ 品牌落板（{产品定格 + 品牌标识}）。`
- **英文片段**：`Ad structure: pain ({the trouble before use}) → product close-up ({key detail, material or mechanism}, dominating the frame) → usage scene ({the product in a real environment}) → comparison ({before and after side by side}) → brand end board ({product hold plus brand mark}).`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：Seedance 2.5 用 `@Image1/@Image2` 时，产品特写段建议单独成一条以保证几何稳定；落板段 2 秒足够，不要把片尾拉长。

### STO-15 · 情绪曲线排布
- **中文片段**：`情绪强度沿时间起伏：0-4 秒紧张度 {高/中低}，4-12 秒回落到 {低}，12-18 秒逐步爬升，18-22 秒到达峰值 {最高紧张度}，22-30 秒回落到 {释放/余韵}；镜头切换频率与紧张度同向变化。`
- **英文片段**：`Emotional intensity rises and falls over time: 0-4s tension {high / low}, 4-12s falls back to {low}, 12-18s builds steadily, 18-22s peaks at {maximum tension}, 22-30s settles into {release / aftertaste}; cut frequency moves with the tension curve.`
- **适用**：Seedance 2.5
- **要点**：最常见的失败是全程高强度——没有低点就没有峰值；峰值前必须留一段平的低谷，否则收尾的释放感出不来。H3 侧须把曲线整体压缩到 4~15 秒（如 0-3 钩子 / 3-9 主体 / 9-15 收尾）。

### STO-16 · 镜头节奏与故事节拍对齐
- **中文片段**：`镜头时长服从节拍：钩子段平均镜长 {1.5-2.5 秒}，情境段 {3-4 秒}，核心变化段 {2-3 秒}，收尾段 {4-6 秒}定格；节拍切换处必须换镜，节拍内部不换镜。`
- **英文片段**：`Shot length follows the beats: hook section averages {1.5-2.5s} per shot, setup {3-4s}, core turn {2-3s}, closing {4-6s} held; a beat boundary always cuts, and no cut happens inside a beat.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：平均镜长只能当校验基线，不要写进提示词；真正要写进提示词的是"第几秒切、切到景别/机位"，让模型知道切点。

### STO-17 · 字幕与花字节奏点
- **中文片段**：`字幕/花字只在{节拍转折点}出现，全片共 {N} 处，每处停留 {2-3 秒}：{花字1} 在第 {X} 秒、{花字2} 在第 {Y} 秒；花字贴在画面留白区，不遮挡主体与关键动作。`
- **英文片段**：`Text overlays appear only at {beat turning points}, {N} times in total, each held for {2-3s}: {overlay 1} at second {X}, {overlay 2} at second {Y}; each overlay sits in negative space and never covers the subject or the key action.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：AI 视频里的画面文字会漂移，尽量用后期加字幕；一定要生成在画面里时，写"静态不闪烁、拼写不变"并放在留白区。H3 侧画面上真正可见的文字按官方规则用英文双引号包裹并逐字保留原文。

### STO-18 · 场景转场方式
- **中文片段**：`从{场景A}转到{场景B}使用{转场方式}：匹配剪辑（{同形状/同色块衔接}）／动作接（{同一动作方向跨越}）／视线接（{角色看向画外后接对方视角}）／声音桥接（{声音先于画面到达}）／遮挡转场（{前景物体扫过画面遮断视线}）。H3 侧普通切点只用官方五句之一：the camera cuts to / the shot cuts to / the shot transitions to / the shot changes to / the shot switches to。`
- **英文片段**：`Move from {location A} to {location B} with a {transition type}: match cut ({same shape or color block}), action match ({one action carried across}), eyeline match ({character looks off-screen, then the reverse view}), sound bridge ({audio arrives before the picture}), or occlusion wipe ({a foreground object sweeps across and blocks the view}). On H3 an ordinary cut uses one of the five official phrases: the camera cuts to / the shot cuts to / the shot transitions to / the shot changes to / the shot switches to.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：H3 官方规定 `cross-dissolve` / `fade` / `wipe` **仅在用户明确要求时**可用（"When explicitly requested by the user…"）。遮挡转场对 AI 视频最稳；匹配剪辑需要模型理解图形对应关系，成功率低，慎用。

### STO-19 · 角色出场与退场
- **英文片段**：`{character} enters at second {X} via {entrance route}, {entrance direction}; {character} exits at second {Y} via {exit route}, {exit direction}; after exiting, {character} does not reappear, and the entry/exit direction stays consistent with the room layout.`
- **中文片段**：`{人物}在第 {X} 秒经由{入场路径/方向}出场，在第 {Y} 秒经由{退场路径/方向}离场；离场后不再出现，出入方向与{空间布局}保持一致，不在同一画面里同时出现于两个位置。`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：H3 的分镜语法里新角色出现即构成合法的切镜条件；写清入场方向可以避免模型把人从画框外瞬移进来。

### STO-20 · 分镜表工作稿字段说明
- **中文片段**：`分镜工作稿字段：镜号（Shot 1/2/3）、时长（秒）、景别（远/全/中/近/特）、运镜（固定/推拉/摇移/跟）、画面（可见动作与构图）、台词（旁白 / 对白）、音效（环境声与动效）、备注（转场方式/花字/衔接点）。`
- **英文片段**：`Working shot-list fields: shot number, duration in seconds, shot size (long / full / medium / close / extreme close), camera move (static / push / pull / pan / track), picture (visible action and composition), dialogue (narration / spoken line), sound effects and ambience, and notes (transition type, text overlay, cut point).`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：这是工作稿记法，不是官方表规格。台词列只有「旁白 / 对白」两类，**没有 OS / VO 标记**（官方无此标记）。正式交付请改用 STO-23 的官方六列标准镜头信息表。

### STO-21 · 关键帧清单（先出图再出片）
- **中文片段**：`关键帧清单：{镜号1}（{画面要点}，需出首帧图）、{镜号2}（{画面要点}，需出首帧图）、{镜号3}（{画面要点}，仅需尾帧图）；其余镜头用文字描述直接生成。`
- **英文片段**：`Keyframe list: {shot 1} ({frame content}, first-frame image needed), {shot 2} ({frame content}, first-frame image needed), {shot 3} ({frame content}, last-frame image only); the remaining shots are generated from text alone.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：只给真正需要锁定的镜头出图——人物首次出场、产品特写、关键动作首帧；全片都出图反而会打断模型对运动的连续理解。H3 侧这些图进入提示词时要标成 `<Picture 1>` / `<Picture 2>` 并配官方对齐指令句。

### STO-22 · 多镜叙事时 H3 与 Seedance 2.5 的分工
- **中文片段**：`多镜叙事分工：H3 负责 ≤15 秒的{单场景连续多镜}，用 `[Shot 1]` 起头、`[Shot 2] At MM:SS.mmm` 递进，每镜只做一次动作；Seedance 2.5 负责 ≤30 秒的{带节拍的段落}，用七段式写主体/场景/动作/运镜/音效/风格/约束，并在约束段声明"镜头在第 4、12、22 秒切换"。`
- **英文片段**：`Division of labor for multi-shot narratives: H3 handles {one-scene continuous multi-shot} up to 15s, starting with [Shot 1] and advancing with [Shot 2] At MM:SS.mmm, one action per shot; Seedance 2.5 handles {a beat-structured passage} up to 30s using its seven sections — subject, scene, action, camera, sound, style, constraints — and states in the constraint section that "the shot cuts at 4s, 12s and 22s".`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：不要把 H3 的分镜时间戳语法塞进 Seedance 2.5，也不要把 Seedance 的七段硬塞进 H3 的三字段；两者的装配位置不同，结构先定、字段后填。

### STO-23 · 官方六列标准镜头信息表
- **中文片段**：`标准镜头信息表严格按以下六列排序：镜头编号 & 时长（`S03 / 6s`）｜ 连续性衔接｜ 参考锚点（空间+身份）｜ Hook 类型｜ 镜头描述（每秒指令）｜ 音频与对白轨。`
- **英文片段**：`The standard shot table keeps exactly six columns in this order: Shot number & duration (S03 / 6s) | Continuity handoff | Reference anchors (space + identity) | Hook type | Shot description (per-second directives) | Audio & dialogue track.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：出处为官方场景技能 `3d-animation-short-generator/SKILL.cn.md`「## STEP 5：六列标准镜头信息表」。`参考锚点` 含四个必填子字段：`固定地景`（如 `door-frame: 右侧 1/3`）、`人物位置（机位视角）`、`退场人物状态`、`光位基线`；`Hook 类型` 取受控词表 `visual-joke` / `reversal` / `suspense` / `tender` / `chase` / `reveal` / `callback` / `expression-beat`。`镜头描述` 必须含 `Per-Second Directives` 子节，按秒拆成 `0–1s`、`1–2s`、`2–3s`，亚秒节拍用 `2.0–2.5s`，且每条覆盖五个必填要素：动作/姿态/表情、镜头运动、空间位置、音频线索（旁白/对白/音效/呼吸/沉默，或 `silent`）、与下一秒或下一镜的交接。`音频与对白轨` 含 `旁白` / `对白` / `音效` / `表演备注`，主角离屏旁白时标 `narrator-mouth-closed: true`（面对白秒标 `mouth-open: speaker`）。

### STO-24 · 镜头表自检门六项必检
- **中文片段**：`镜头表自检门六项必检：① Hook 密度（每镜都有 Hook 类型，每连续 3 镜至少 1 镜用 `reveal`/`reversal`/`callback`，开场镜与收尾镜各带强 hook）；② 单镜时长不超过 15 秒，需要更长就拆镜；③ 单镜不超过 3 个重要角色；④ 空间锚点继承（下一镜的固定地标与光位基线与上一镜一致或含连续性备注）；⑤ 每秒指令覆盖（从 0s 到镜尾每秒都有 `Per-Second Directives`，每条含五个必填要素，不留时间空隙）；⑥ 跨镜连续性（逐行读连续性衔接列必须形成连续链，翻转眼神/人物位置/道具状态/光位的镜头必须明确标记翻转，如 `HARD CUT — 时间跳 2h`）。六项全过后在表格节点顶部加 `shot-table self-check: passed` 戳。`
- **英文片段**：`The shot-table self-check gate has six mandatory items: 1) hook density (every shot has a hook type, at least one of every three consecutive shots uses reveal / reversal / callback, and the opening and closing shots each carry a strong hook); 2) no shot exceeds 15 seconds — split it if the beat needs longer; 3) no shot has more than 3 important characters; 4) spatial anchor inheritance (the next shot's fixed landmark and light baseline match the previous shot or carry an explicit continuity note); 5) per-second directive coverage (every second from 0s to the end of the shot has Per-Second Directives with all five required elements, leaving no time gaps); 6) cross-shot continuity (reading the continuity column line by line must form one continuous chain, and any shot that flips gaze, character position, prop state or light baseline must mark the flip explicitly, e.g. HARD CUT — time jumps 2h). When all six pass, stamp the table node with shot-table self-check: passed.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：出处为官方场景技能 `3d-animation-short-generator/SKILL.cn.md`「## STEP 5.5：镜头表自检门（强制）」。这是场景技能层面的施工门，不是 H3 提示词规范原文；单镜 ≤15 秒这一项与官方 H3 时长上限 4–15 秒方向一致。

## 排错提示

- 结构没定就写画面：先排好节拍与镜号，再填景别、运镜、材质、灯光；顺序反过来会导致每镜都想塞满信息，最后必然超时超字数。
- 用 30 秒四拍去写 H3：官方 H3 单条 4–15 秒，30 秒四拍 / 三幕式 / 60–90 秒单集只属于 Seedance 2.5；H3 侧一律走 ≤15 秒三拍裁切版，超 15 秒拆条。
- 钩子靠标题字幕撑着：前 3 秒必须在画面里给出具体视觉信息（反常、动作、奇观、疑问线索），一行标题不算钩子。
- 15 秒模型塞三段戏：H3 上限 15 秒，超过两三个镜头就会节奏崩坏，人物与道具开始漂移；砍内容而不是加镜头。
- 情绪全程高强度：没有低谷就没有峰值，收尾的释放感出不来；峰值前必须安排一段平的低谷。
- 分镜里写抽象心理：提示词里只写"看得见、听得到"的；动机、情绪、时间跨度放到旁白或台词，不要让模型去演心理活动。
- 台词列里还挂着 OS / VO：官方没有这两个标记。H3 侧画外音用固定短语 `says in an off-screen voiceover` + 闭嘴声明；工作稿台词列只保留「旁白 / 对白」。
- 转场一律写"硬切"或依赖匹配剪辑：H3 普通切点只用官方五句短语；叠化/淡出/划变仅在用户明确要求时用。AI 视频更稳的是遮挡转场与动作接。
- 景别/机位变化过密：每一处切换都要付出动作连续性的代价，一拍之内换一个景别即可，切两次以上就该合并成一次运镜。
- 旁白与画面信息重复：旁白和画面说同一件事，观众会同时关掉字幕和声音，两条信息一起损失；旁白必须提供画面无法给出的增量信息。
- 多镜时忘记复述主体锚点：H3 每个 `[Shot N]` 开头都要复述关键人物特征与场景要素，Seedance 2.5 则要在第 1 段写一次、第 7 段再约束一次。
- 片尾留钩被剪断：把最后 1.5 秒完整留给悬念定格，不要让收尾动作被截断；钩子靠画面未解释，而不是靠"下集预告"。
- 镜头表交出去没过自检门：六项必检（STO-24）任一不过都要先改表再重跑，通过后才进渲染；`Per-Second Directives` 里出现"继续移动"这类模糊描述即视为未覆盖。
