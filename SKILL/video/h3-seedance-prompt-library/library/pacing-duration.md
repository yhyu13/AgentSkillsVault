---
id: pacing-duration
title: 节奏与时长
dimension: 节奏与时长
applies_to: [H3, Seedance2.5]
model_field: H3 → integrated_multimodal_description（[Shot n] At MM:SS.mmm 时间轴）｜ Seedance 2.5 → 动作与时间（+ 约束中的时长）
---

# 节奏与时长

> **装配位置**：H3 → integrated_multimodal_description ｜ Seedance 2.5 → 动作与时间
> **一句话用法**：先按目标时长倒推镜头数（4~6s 一镜 / 8~10s 两镜 / 12~15s 三镜 / 20~30s 四拍），再用「[Shot n] At MM:SS.mmm」把切点钉死——H3 官方单条 4~15 秒，超时拆条；Seedance 2.5 上限 30 秒。
>
> **官方口径**：`SKILL.md`「## Tips for Better Results」——"Always match the total duration of the description to the requested video length (4–15 seconds)."

## 片段

### PAC-01 · 4~6 秒单镜（4-6s single shot）
- **中文片段**：`本片总时长{5|6}秒，全片只用一个镜头（single shot），不切分镜头；画面从{起始画面}开始，经过{唯一一次动作或变化}，最后落在{落幅画面}上。`
- **英文片段**：`The clip runs {5|6} seconds in a single shot with no cuts; it opens on {opening frame}, passes through {one action or change}, and lands on {ending frame}.`
- **适用**：两者
- **要点**：6 秒以内只能承载一个动作 + 一次运镜，写两个动作就必然丢一个；单镜的落幅描述要放在提示词最后。

### PAC-02 · 8~10 秒双镜（8-10s two shots）
- **中文片段**：`本片总时长{8|9|10}秒，分为两个镜头：第一个镜头约{4|5}秒呈现{内容A}，第二个镜头约{4|5}秒呈现{内容B}，两镜之间在情绪或视线方向上承接。`
- **英文片段**：`The clip runs {8|9|10} seconds across two shots: the first, about {4|5} seconds, covers {content A}; the second, about {4|5} seconds, covers {content B}, with the cut matched on emotion or eyeline.`
- **适用**：两者
- **要点**：双镜的第二镜必须承接第一镜的视线方向或情绪，否则看起来像两条不相干的素材拼接。

### PAC-03 · 12~15 秒三镜（12-15s three shots）
- **中文片段**：`本片总时长{12|13|14|15}秒，分为三个镜头：第一镜约{4}秒建立{场景}，第二镜约{4|5}秒推进{动作}，第三镜约{4|5}秒收在{结果}，每镜各自有一个独立的主运镜。`
- **英文片段**：`The clip runs {12|13|14|15} seconds across three shots: the first, about {4} seconds, establishes {scene}; the second, about {4|5} seconds, advances {action}; the third, about {4|5} seconds, resolves on {outcome}, each with its own single camera move.`
- **适用**：两者
- **要点**：三镜是 H3 时长上限内最稳的结构；每镜只配一个主运动，别把运镜预算摊到三镜之上再加变焦。15 秒是官方 H3 上限。（15 秒排 4~5 镜仅在「每镜单一动作、无跨空间、景别变化不剧烈」时可行；镜数超 5 必须按拆条方案分次生成再剪，否则模型会漏镜或把切点拍糊。）

### PAC-04 · 20~30 秒四拍结构（20-30s four-act structure）
- **中文片段**：`本片总时长{20~30}秒，分四拍：0 到 4 秒为钩子（hook），以{最强视觉或悬念}立刻抓住注意；4 到 12 秒建立情境，交代{主体}与{环境}；12 到 22 秒进入核心变化，{关键动作或转折}发生；22 到 30 秒收尾定格，画面停在{最终画面}上。`
- **英文片段**：`The clip runs {20~30} seconds in four acts: 0-4s is the hook, opening on {strongest visual or suspense} to grab attention at once; 4-12s establishes the situation, {subject} and {environment}; 12-22s is the core change, where {key action or turn} happens; 22-30s is the closing hold, the frame resting on {final image}.`
- **适用**：Seedance 2.5
- **要点**：这是 30 秒档的标准骨架；Seedance 2.5 可到 30 秒，H3 只有 15 秒上限，做不了四拍。

### PAC-05 · H3 分镜时间戳语法与官方切镜短语（H3 shot syntax）
- **中文片段**：`[Shot 1] {第一镜的画面与运镜描述} [Shot 2] At 00:03.500 {第二镜描述} [Shot 3] At 00:07.000 {第三镜描述}；切镜短语只用官方五选一：the camera cuts to / the shot cuts to / the shot transitions to / the shot changes to / the shot switches to。`
- **英文片段**：`[Shot 1] {description of shot one, visual and camera move} [Shot 2] At 00:03.500 {shot two} [Shot 3] At 00:07.000 {shot three}; ordinary cuts use one of the five official phrases: the camera cuts to / the shot cuts to / the shot transitions to / the shot changes to / the shot switches to.`
- **适用**：H3
- **要点**：第一镜必须写 `[Shot 1]` 且不带时间戳；后续每镜用 `[Shot n] At MM:SS.mmm`，切点时间严格递增且必须小于总时长（官方原文："Do not add a timestamp to the first shot. Use sequential shot numbers for later shots, and begin each one with a strictly increasing cut time that falls within the video duration."）。切镜短语词表出自官方「### 4.2」；`cross-dissolve` / `fade` / `wipe` **仅在用户明确要求时**使用。

### PAC-06 · Seedance 2.5 运动优先公式（motion-first formula）
- **中文片段**：`保持{起始构图与主体状态}，然后{主运动}，镜头{单一运镜}，接着{次运动}，然后{时间节奏描述}，最后{落幅画面}，全程{约束条件}。`
- **英文片段**：`Hold {opening composition and subject state}, then {main action}, with the camera {single camera move}, then {secondary motion}, then {temporal rhythm}, and finally {landing frame}, throughout {constraint}.`
- **适用**：Seedance 2.5
- **要点**：顺序不能打乱——「保持 → 主运动 → 镜头 → 次运动 → 时间节奏 → 落幅 → 约束」是 Seedance 2.5 图生视频的推荐写法，主运动必须排在大动的前面。

### PAC-07 · 动作密度分级（action density）
- **中文片段**：`本镜动作密度为{低|中|高}：{低——只保留眨眼、呼吸与极小幅度的重心微移；中——包含一次完整的行走或交互动作；高——包含连续的复合动作与快速位移}。`
- **英文片段**：`The action density of this shot is {low|medium|high}: {low — only blinks, breathing and a very slight weight shift; medium — one complete walk or interaction; high — continuous compound action and fast displacement}.`
- **适用**：两者
- **要点**：密度与时长成反比：时长越长，单镜密度必须越低；高密度 + 长时长是脸崩与肢体穿模的头号原因。

### PAC-08 · 低预算节拍铺排（low budget）
- **中文片段**：`全片动作保持低预算：在第{1}秒到第{2}秒之间，{主体}只完成{一次微小动作}，其余时间仅保留呼吸起伏与眼球的轻微移动，画面近乎静止。`
- **英文片段**：`The whole clip stays on a low action budget: between second {1} and {2}, {subject} completes only {one tiny motion}, with the rest of the runtime given to breathing and slight eye movement, the frame nearly still.`
- **适用**：两者
- **要点**：低预算适合情绪特写和空镜；把动作限制在明确的时间窗内，模型不会自行加戏。

### PAC-09 · 中预算节拍铺排（medium budget）
- **中文片段**：`本片采用中等动作预算：{主体}先完成{动作一}，随后自然过渡到{动作二}，全程动作连贯不跳跃，每个动作之间留出约{0.5}秒的过渡。`
- **英文片段**：`This clip runs a medium action budget: {subject} first completes {action one}, then transitions naturally into {action two}, the motion continuous without jumps, with about {0.5} seconds of transition between them.`
- **适用**：两者
- **要点**：写清过渡时长能避免「瞬移」式的拼接感；两段动作之间不要塞第三个动作。

### PAC-10 · 高预算节拍铺排（high budget）
- **中文片段**：`本片采用高动作预算：{主体}在镜头前连续完成{冲刺}、{跃起}、{落地缓冲}三个连贯动作，节奏紧凑无停顿，但面部保持清晰稳定不发生形变。`
- **英文片段**：`This clip runs a high action budget: {subject} completes three continuous actions in front of the camera — {sprint}, {leap}, {landing absorption} — in a tight unbroken rhythm, while the face stays sharp and undistorted.`
- **适用**：两者
- **要点**：高预算必须同时写一句「面部保持稳定」作为约束；不要在此时再加环绕或 FPV 运镜。

### PAC-11 · 慢动作节拍（slow-motion pacing）
- **中文片段**：`本镜前 {2} 秒为正常速度，接着 {3} 秒进入慢动作、速度降为四分之一并保持环境细节清晰，然后最后 {1} 秒恢复正常速度并定格在{落幅画面}。`
- **英文片段**：`The first {2} seconds run at normal speed, then {3} seconds ease into slow motion at one quarter speed with the environment still crisp, and finally the last {1} second returns to real speed and holds on {landing frame}.`
- **适用**：两者
- **要点**：慢动作是节奏手段而不是氛围词，必须给出「变慢点」和「恢复点」两个时间锚点。

### PAC-12 · 段落式时间切分（beat timing）
- **中文片段**：`第 0 到 3 秒为{开场状态}，第 3 到 6 秒为{第一次变化}，第 6 到 9 秒为{第二次变化}，第 9 到 {总时长} 秒为{最终状态}，每一段只承担一个明确的信息。`
- **英文片段**：`Seconds 0-3 carry {opening state}, 3-6 carry {first change}, 6-9 carry {second change}, and 9-{total duration} carry {final state}, each segment delivering exactly one piece of information.`
- **适用**：两者
- **要点**：时间段必须首尾相接、不留缝也不重叠；重叠的时间轴是最常见的错切来源。

### PAC-13 · 加速与减速节奏（acceleration / deceleration）
- **中文片段**：`节奏上先慢后快：前 {2} 秒缓慢、动作幅度小，中段提速到{快节奏}并连续完成{动作}，最后 {1} 秒突然减速、动作收住只留轻微余韵。`
- **英文片段**：`The rhythm starts slow and accelerates: the first {2} seconds are slow and small in amplitude, the middle picks up to {fast tempo} through {action}, and the last {1} second decelerates abruptly, the action settling with a faint after-motion.`
- **适用**：两者
- **要点**：「最后 1 秒收住」是节奏落点，缺了它整段会显得没有终点；减速要给「余韵」而不是完全静止。

### PAC-14 · 静默留白（pause / breath）
- **中文片段**：`在{动作}结束后的 {1.5} 秒内画面几乎静止，{主体}保持{姿态}不动，只听到{环境音}，让前一动作的余波落定后再进入下一段。`
- **英文片段**：`For {1.5} seconds after {action} ends, the frame is almost still, {subject} holding {pose} without moving, only {ambient sound} audible, letting the previous action settle before the next section begins.`
- **适用**：两者
- **要点**：留白要同时写画面静止与声音持续，否则会像卡帧；这段空白也是呼吸点，能显著提升高级感。

### PAC-15 · H3 时长与格式上限（H3 limits）
- **中文片段**：`总时长 {4~15} 秒（官方）；帧率、分辨率档位与提示词字数上限官方文件均未说明；超过 15 秒请拆成多条分别生成，再在剪辑阶段拼接。`
- **英文片段**：`Total runtime {4-15} seconds, as the official guide requires; frame rate, resolution tier and prompt length ceiling are not stated in the official files. Anything longer than 15 seconds should be generated as separate clips and joined in the edit.`
- **适用**：H3
- **要点**：4–15 秒有官方依据（`SKILL.md`「## Tips for Better Results」）。**24 FPS、2K、7000 字符上限官方文件均未说明**——2K 只出现在官方场景技能 `3d-animation-short-generator/SKILL.cn.md` 的分辨率选项卡，属场景层说明，不是提示词规范原文。`overall_soundscape` 不含对白与音乐，且只有用户明确要求全片静默时才写 `N/A`；`non_diegetic_music` 没有就写 `N/A`。

### PAC-16 · Seedance 2.5 时长与字数上限（Seedance limits）
- **中文片段**：`总时长 {4~30} 秒，提示词控制在 30 到 80 词，使用完整句子描述而非关键词堆叠；时长较长时优先用「保持 → 主运动 → 镜头 → 次运动 → 时间节奏 → 落幅 → 约束」的顺序压缩信息。`
- **英文片段**：`Total runtime {4~30} seconds, with the prompt kept to 30-80 words written as full sentences rather than keyword lists; for longer durations, compress information using the hold → main action → camera → secondary motion → timing → landing frame → constraint order.`
- **适用**：Seedance 2.5
- **要点**：Seedance 2.5 可直出单段 30 秒，官方**未说明**字数上限（此前流传的「30~80 词」无官方出处，已删）。长时长靠「分段描述」而不是加字数——把一整段戏压进一行反而更糊。

### PAC-17 · 切镜点的选择（cut motivation）
- **中文片段**：`只在出现下列情况时切镜：引入新主体、新空间、新状态、新视点或新的时间点；本次切镜的原因是{新主体/新空间/新状态/新视点/新时间点}，其余时刻保持同一镜头连续。`
- **英文片段**：`Cut only when a new subject, new space, new state, new point of view, or a new point in time is introduced; this cut is motivated by {new subject|new space|new state|new POV|new time}, and everything else stays in one continuous shot.`
- **适用**：两者
- **要点**：官方原文："A cut should introduce new information about the subject, space, state, viewpoint, or time. **If only the distance or a slight angle needs to change, prefer camera motion.**" 没有信息增量的切点是废切；连续同景别同机位的两镜是观感最糟的组合。

### PAC-18 · 收尾定格（closing hold）
- **中文片段**：`最后 {1.5} 秒不做任何运镜、不切换，摄影机保持稳定，{主体}在{最终姿态}上定格，画面停留至结束。`
- **英文片段**：`For the final {1.5} seconds there is no camera move and no cut; the camera holds steady, {subject} freezes in {final pose}, and the frame stays there until the end.`
- **适用**：两者
- **要点**：收尾定格是 AI 视频最容易被省略的一步；不写它，模型常在最后半秒漂移或淡出，写了才有可用的尾帧供你做转场。

### PAC-19 · 官方运镜表达：类型 + 幅度 + 速度
- **中文片段**：`运镜写成句内自然英文动作，不用堆叠标签：{The camera pushes in with small amplitude at slow speed toward the folded letter in her hands.} 类型用官方词表：Zoom In / Zoom Out、Push In / Pull Out、Pan Left / Pan Right、Truck Left / Truck Right、Tilt Up / Tilt Down、Pedestal Up / Pedestal Down、Arc Shot、Tracking Shot、Static Shot、Shake Slightly / Shake Strongly、POV、Roll Clockwise / Roll Counterclockwise；幅度用 with small amplitude / with large amplitude；速度用 at slow speed / at fast speed。`
- **英文片段**：`Camera motion is written as a natural English action inside the shot rather than as stacked labels: {The camera pushes in with small amplitude at slow speed toward the folded letter in her hands.} Type comes from the official list — Zoom In / Zoom Out, Push In / Pull Out, Pan Left / Pan Right, Truck Left / Truck Right, Tilt Up / Tilt Down, Pedestal Up / Pedestal Down, Arc Shot, Tracking Shot, Static Shot, Shake Slightly / Shake Strongly, POV, Roll Clockwise / Roll Counterclockwise; amplitude as with small amplitude / with large amplitude; speed as at slow speed / at fast speed.`
- **适用**：H3 ｜ Seedance 2.5 ｜ 两者
- **要点**：官方原文："Add amplitude and speed only when they are meaningful; **medium amplitude and normal speed are usually omitted**." —— 中等幅度与正常速度通常省略。官方也给出 `The camera holds a static shot as the runner exits the frame.` 这类写法。

### PAC-20 · H3 超 15 秒的拆条与拼接
- **中文片段**：`H3 官方单条上限 15 秒：{30 秒素材} 必须拆成 {12 秒 + 10 秒 + 8 秒} 三条分别生成，每条各自写完整的 `[Shot 1]` 起手与自有落幅，再在剪辑阶段按节拍拼接；不要在一条提示词里写 30 秒的时间轴。`
- **英文片段**：`The official H3 ceiling is 15 seconds per clip: {a 30-second piece} must be split into {12s + 10s + 8s} clips generated separately, each with its own complete [Shot 1] opening and its own landing frame, then joined in the edit on the beat; never write a 30-second timeline inside one prompt.`
- **适用**：H3
- **要点**：官方原文："Always match the total duration of the description to the requested video length (4–15 seconds)." 拆条时每条都要复述主体锚点（外观、服装、场景要素），并把上一条的落幅作为下一条的开场锚点；结尾一条按 PAC-18 收尾定格。

## 排错提示

- **H3 切点时间必须严格递增且落在总时长内**：写成 00:03.500 后又写 00:02.000，或切点超过总时长，会直接被截断或错切。
- **H3 第一镜不能带时间戳**：必须严格是 `[Shot 1] {描述}`，从 `[Shot 2] At MM:SS.mmm` 才开始写时间。
- **Seedance 2.5 超过 30 秒不成立**：官方能力是「单段 30 秒视频直出」；把 60 秒内容塞进去只会得到压缩到失真的版本。要更长就拆成多段再剪。
- **H3 超过 15 秒不成立**：官方上限 15 秒，长内容要拆成多条生成再剪；写 20 秒不会报错但会被截断。
- **把未说明的参数当官方规范**：24 FPS、2K、7000 字符、32 kHz 立体声、参考数量上限，官方提示词规范文件均未说明，写进提示词前先分清「官方要求」与「场景技能选项」。
- **运镜写成标签堆**：官方要求运镜是句内自然英文动作；`镜头{方向+幅度+速度}` 这种堆叠写法在 H3 侧不成立。
- **切镜用了非官方短语或擅自加转场**：普通切点只用官方五句短语；`cross-dissolve` / `fade` / `wipe` 仅在用户明确要求时使用。
- **动作密度与时长不匹配**：8 秒塞 5 个动作、15 秒塞一场打斗，是崩脸与穿模的头号原因；时长越长密度越要往下压。
- **时间段重叠或留缝**：0-3 / 3-6 / 6-9 必须首尾相接，写成 0-3 / 2-5 / 6-9 会出现动作丢拍。
- **Seedance 2.5 用关键词堆砌**：不用完整句子、直接罗列名词，模型很难排出稳定的时间顺序。
- **切点没有动机**：为了「看起来丰富」而切，节奏会碎、观感乱；切镜只应服务于新主体 / 新空间 / 新状态 / 新视点 / 新时间点，距离或轻微角度变化优先用运镜。
- **忘了收尾定格**：不写最后一秒的静止与落幅，画面常在结尾漂移、变形或莫名淡出。
