---
id: action-imitation
title: 动作模仿与驱动（action imitation / motion reference）
dimension: 动作模仿与驱动
applies_to: [H3, Seedance2.5]
model_field: 素材层（驱动视频）+ 动作描述段
---

# 动作模仿与驱动（action imitation / motion reference）

> **装配位置**：H3 → integrated_multimodal_description 的动作段 ｜ Seedance 2.5 → 【Reference Asset Roles】+【Event Script】
> **一句话用法**：把「人物身份与服装」交给图片、把「动作与节奏」交给驱动视频，提示词只做素材职责分工与指代；编辑与延长则闭合范围、写清 A→B 与承接帧。

## 片段

### AIM-01 · 动作模仿能力定义（1 图 + 1 驱动视频）
- **中文片段**：`用图片 1 的人物作为身份与造型来源，用视频 1 作为驱动视频，让图片 1 中的{人物}执行视频 1 中的动作，输出单段视频。`
- **英文片段**：`Use the person in Image 1 as the source of identity and styling, and use Video 1 as the driving video, so that {the person} in Image 1 performs the action shown in Video 1; the result is a single video segment.`
- **适用**：Seedance 2.5
- **要点**：动作模仿是即梦 Action Imitation 2.0 的能力形态——输入 1 张图 + 1 段驱动视频，模型让人物执行驱动视频里的动作；它是「素材层」能力，不是提示词里写动作词就能替代的。

### AIM-02 · 动作模仿接口提交与查询
- **中文片段**：`提交动作模仿任务：POST https://visual.volcengineapi.com?Action=CVSync2AsyncSubmitTask&Version=2022-08-31，Header 带 Region: cn-north-1 与 Service: cv，Body 为 JSON，req_key 写 jimeng_dreamactor_m20_gen_video（旧版 jimeng_dream_actor_m1_gen_video）；再用同一接口加 Action=CVSync2AsyncGetResult 查询结果，状态依次为 in_queue / processing / generating / done。`
- **英文片段**：`Submit the action-imitation task with POST https://visual.volcengineapi.com?Action=CVSync2AsyncSubmitTask&Version=2022-08-31, with headers Region: cn-north-1 and Service: cv, a JSON body whose req_key is jimeng_dreamactor_m20_gen_video (legacy: jimeng_dream_actor_m1_gen_video); then query the same endpoint with Action=CVSync2AsyncGetResult, watching for in_queue / processing / generating / done.`
- **适用**：Seedance 2.5
- **要点**：这是接口参数事实，不进提示词；`req_key` 只有两个值可用，旧版是 m1、新版是 m20，混写会直接报错。

### AIM-03 · 输入图片：image_urls 与 binary_data_base64 二选一
- **中文片段**：`输入图片只传一张：外网可访问的公网地址用 image_urls，需要加密传输时用 binary_data_base64；两者同时传以 base64 为准。`
- **英文片段**：`Pass exactly one input image: use image_urls for a publicly reachable URL, or binary_data_base64 for encrypted transfer; if both are provided, the base64 value takes precedence.`
- **适用**：Seedance 2.5
- **要点**：官方原文标注「二选一」，同时传时优先 base64；只能给 1 张图，人物身份、服装、脸部特征全靠它。

### AIM-04 · 输入视频与首秒裁切开关
- **中文片段**：`驱动视频用 video_url 传公网可访问地址，必选；可选参数 cut_result_first_second_switch 保持默认 true，即结果视频会裁掉开头 1 秒的过渡段。`
- **英文片段**：`The driving video is passed as video_url pointing to a publicly reachable file and is required; the optional cut_result_first_second_switch stays at its default of true, so the output drops the first second of transition footage.`
- **适用**：Seedance 2.5
- **要点**：`video_url` 没有替代项，缺了任务跑不起来；开头 1 秒是模型拼接出来的过渡，裁掉后才是干净的驱动结果。

### AIM-05 · 输出规格与结果有效期
- **中文片段**：`动作模仿输出为 mp4 格式、720P 分辨率、25fps；查询接口返回的结果 URL 只有 1 小时有效期，拿到后立即转存到自有存储。`
- **英文片段**：`The action-imitation output is an mp4 at 720P and 25 fps; the result URL returned by the query endpoint expires after 1 hour, so transfer it to your own storage immediately.`
- **适用**：Seedance 2.5
- **要点**：1 小时过期是硬约束，脚本化跑批时必须先落盘再离线用；720P/25fps 也是固定的，不要按输出分辨率写提示词假设。

### AIM-06 · 接口没有 motion_strength
- **中文片段**：`动作的幅度、速度与节奏完全由驱动视频本身决定，不传任何运动强度参数；网页端那个 0~10 的「运动强度」滑块不是接口入参，不要写进请求体。`
- **英文片段**：`The amplitude, speed, and rhythm of the motion are determined entirely by the driving video; no motion-strength parameter is passed. The 0-10 motion-strength slider belongs to the web UI only and must not be written into the API request.`
- **适用**：Seedance 2.5
- **要点**：官方明写「接口没有 motion_strength 参数」；想改幅度只能换一条驱动视频，不要在提示词里堆力度词去硬凑。

### AIM-07 · 驱动视频的选片要求
- **中文片段**：`选一条{时长}秒的驱动视频：全片单镜头、无剪辑与转场、只有 1 位与输入图片一致的人物、动作完整清晰、画幅比例尽量贴近输出尺寸。`
- **英文片段**：`Choose a driving video of {duration} seconds: one continuous shot with no cuts or transitions, a single person matching the subject in the input image, a clear and complete action, and a frame ratio close to the output size.`
- **适用**：Seedance 2.5
- **要点**：官方与实战共识都是这五条；驱动视频一旦多镜头，人物动作就会在切点处断裂，这是最常见的翻车原因。

### AIM-08 · 提示词写法：素材职责分工
- **中文片段**：`@Image1 提供{人物}的身份、面部、服装与配饰；@Video1 只负责动作与节奏。{人物}的身份与服装完全来自图片 1，动作轨迹、速度与停顿完全跟随视频 1，两者各管各的、互不覆盖。`
- **英文片段**：`@Image1 provides {the person}'s identity, face, clothing, and accessories; @Video1 is responsible only for the action and its rhythm. {The person}'s identity and wardrobe come entirely from Image 1, while the motion path, speed, and pauses follow Video 1 exactly; the two assets each own their own role and do not override each other.`
- **适用**：两者
- **要点**：官方 Skill 的硬规则是「每个素材只有一个明确职责」；不分工就会把驱动视频的背景、构图也一起搬进结果。

### AIM-09 · 动作模仿的常见失败与修复
- **中文片段**：`如果驱动视频是多镜头导致动作断裂，改为单镜头重拍；如果是四肢僵化，换成不含精细肢体动作的驱动视频，或在提示词中补全该动作序列；如果人物数量对不上，驱动视频里只保留 1 人；如果是手部穿模，说明手与物体的接触点与距离。`
- **英文片段**：`If the driving video contains multiple shots and the motion breaks at the cut, re-shoot it as a single shot; if the limbs look stiff, use a driving video without fine limb articulation, or spell out the full motion sequence in the prompt; if the character count mismatches, keep only one person in the driving video; if hands clip through objects, state the contact point and the distance between the hand and the surface.`
- **适用**：Seedance 2.5
- **要点**：官方在白模一节的同款警告——「白模视频主体建议仅保留躯体，避免包含【四肢/翅膀】等涉及精细运动的元素；如已包含，需补全其动作序列，以防止渲染结果出现四肢僵化」。

### AIM-10 · 严格参考动作与运镜（官方原句）
- **中文片段**：`严格参考视频 1 的动作与运镜，顺序与视频保持一致。`
- **英文片段**：`Strictly follow the action and camera movement of Video 1, keeping the order identical to the video.`
- **适用**：Seedance 2.5
- **要点**：这是官方提示词指南给出的原句，用在 Seedance 的【Reference Asset Roles】或【Event Script】里即可；H3 侧对应写法是把动作写进 `integrated_multimodal_description` 的动作段。

### AIM-11 · 素材已够精准时只做指代
- **中文片段**：`@Video1 的动作已足够清晰，提示词中只做指代，不再复述「先抬手、再转身、镜头缓慢环绕」这类具体细节。`
- **英文片段**：`The action in @Video1 is already clear enough, so the prompt only refers to it and does not restate details such as raising the hand first, then turning, then a slow camera orbit.`
- **适用**：Seedance 2.5
- **要点**：官方原文——「当参考素材本身已足够精准时，建议只做『指代』、减少画面复述」；官方并明确「不需要在 prompt 中写『先抬手、再转身、镜头缓慢环绕……』等等具体细节」。

### AIM-12 · 概括性动作描述（舞蹈 / 武术 / 运动）
- **中文片段**：`{人物}连续做了几组{高抬腿、空翻}，随后{双方}展开{近身搏斗}，只在{某一个有记忆点的动作}上写明细节。`
- **英文片段**：`{The person} performs several sets of {high knee lifts and flips}, followed by {the two performers} engaging in {close-quarters combat}, with concrete detail written only for {the one memorable move}.`
- **适用**：两者
- **要点**：官方原文——「动作：优先用概括性描述（如『连续做了几组高抬腿和空翻』『双方展开近身搏斗』），只在少数有记忆点的动作上写出具体细节，不建议重复写相同的动作」。

### AIM-13 · 动作与运镜分离引用
- **中文片段**：`只参考视频 1 的动作，不参考它的运镜；运镜由提示词另行指定。`
- **英文片段**：`Reference only the action from Video 1 and do not reference its camera movement; the camera movement is specified separately in the prompt.`
- **适用**：两者
- **要点**：官方示例句式是「参考视频 1 中施法的动作，视频 2 的环绕式运镜」——把动作源与运镜源分成两个素材各管一头，是分离引用的标准写法。

### AIM-14 · 身体局部驱动
- **中文片段**：`只参考视频 1 中{手部翻腕、头部转向、脚步步法}的部分动作，人物的其余动作、表情与机位按提示词执行。`
- **英文片段**：`Reference only the {wrist rotation, head turn, or footwork} portion of the motion in Video 1; all other body motion, expression, and framing follow the prompt.`
- **适用**：两者
- **要点**：局部参考必须写明「参考哪一部分」（官方 Skill 原文），否则模型会把整段视频的动作都搬过来。

### AIM-15 · 参考素材的职责绑定写法
- **中文片段**：`@Image1 是{人物}的形象参考，@Video1 只提供{施法的动作}，@Video2 只提供{环绕式运镜}，@Audio1 是{人物}的音色参考，各素材互不覆盖。`
- **英文片段**：`@Image1 is the appearance reference for {the person}, @Video1 provides only {the spell-casting action}, @Video2 provides only {the orbit camera move}, and @Audio1 is the voice-timbre reference for {the person}; the assets do not override one another.`
- **适用**：Seedance 2.5
- **要点**：官方 Skill 要求每个素材只承担一个明确职责；多人多素材时按人物首次出场顺序上传并同步编号，可避免角色串位。

### AIM-16 · 编辑：母版唯一与范围闭合
- **中文片段**：`编辑任务：以@Video1为唯一母版，仅修改{具体对象}；除{被修改对象}之外，其余可见角色、道具与背景一律保持不变。`
- **英文片段**：`Editing task: use @Video1 as the single master source and modify only {the specific target}; apart from {the modified target}, every other visible character, prop, and background stays unchanged.`
- **适用**：Seedance 2.5
- **要点**：官方 Skill 原文——「编辑母版必须是唯一的 `@VideoN`；除明确修改对象外，其余可见角色、道具与背景保持不变」；不闭合范围模型就会顺手重画。

### AIM-17 · 编辑：写清 A->B 的过程
- **中文片段**：`把{人物}的{原状态A}改为{目标状态B}，画面要完整呈现从A到B的连续变化过程，而不是直接跳到B。`
- **英文片段**：`Change {the subject}'s {original state A} into {target state B}, showing the full continuous transition from A to B rather than jumping straight to B.`
- **适用**：两者
- **要点**：官方原文——「明确需要修改的范围和内容，可以配合时间戳进行部分编辑，尽可能说明修改内容从 A->B 的过程」。

### AIM-18 · 编辑：台词与口音（官方示例）
- **中文片段**：`仅编辑视频 1 中{男人}的台词，修改为「{新台词}」，口音调整为{东北口音}，其余内容不要变化。`
- **英文片段**：`Edit only the line spoken by {the man} in Video 1, replacing it with "{the new line}" and shifting his accent to {a Northeastern Chinese accent}; nothing else in the video changes.`
- **适用**：Seedance 2.5
- **要点**：官方示例一逐字为「仅编辑视频 1 中男人的台词，修改为『你不要过来啊』，口音调整为东北口音…」；对白用引号内原文、逐字保留，不要替用户润色。

### AIM-19 · 编辑：时间戳局部动作（官方示例）
- **中文片段**：`把视频 1 中{4-6 秒}{男人喝咖啡}的动作改变为{拖地}，其余内容不要变化。`
- **英文片段**：`Change the action in Video 1 between {4 and 6 seconds}, where {the man drinks coffee}, into {mopping the floor}; leave everything else unchanged.`
- **适用**：Seedance 2.5
- **要点**：官方示例二逐字为「把视频 1 中 4-6 秒男人喝咖啡的动作改变为拖地，其余内容不要变化」；Seedance 2.5 响应整数秒时间戳，区间要闭合、不留缺口。

### AIM-20 · 编辑：动态主体替换
- **中文片段**：`编辑任务：把视频 1 中{右侧的亚洲女生}替换为图片 1 中的{黑人女生}；新主体继承原主体的出现时机、运动路径、速度与遮挡关系，原主体不再出现，其余画面保持不变。`
- **英文片段**：`Editing task: replace {the Asian woman on the right} in Video 1 with {the Black woman} in Image 1. The new subject takes over the original subject's entrance timing, motion path, speed, and occlusion relationships; the original subject no longer appears, and everything else in the frame stays the same.`
- **适用**：Seedance 2.5
- **要点**：官方示例三逐字为「编辑任务：把视频 1 中右侧的亚洲女生改为图片 1 中的黑人女生」；官方 Skill 另补：动态主体替换必须继承出现时机、运动路径、速度与遮挡关系，并声明原主体不再出现。

### AIM-21 · 视频音频编辑
- **中文片段**：`音频编辑：把{视频 1 中{男人的台词}}改为{新台词}并保留原口型同步；{环境声与画面音效保持不变}，{剪辑节奏不变}，全片不出现字幕。`
- **英文片段**：`Audio edit: replace {the man's line} in Video 1 with {the new line} while keeping the original lip sync; {the ambient sound and the visual sound effects remain unchanged}, {the cutting rhythm is unchanged}, and no subtitles appear anywhere in the video.`
- **适用**：Seedance 2.5
- **要点**：官方把「视频音频编辑」单列为编辑能力之一；改声源时必须分别说明「改哪个声源、变成什么、时间范围」，并显式保留对白口型、环境声、音效与画面剪辑节奏。

### AIM-22 · 视频延长（向前）
- **中文片段**：`向前延长视频 1：新片段的首帧承接原视频的末帧，{人物}延续末帧的姿态与朝向，从{末帧中正在进行的动作}继续往下演，其余画面、灯光与声音状态保持一致。`
- **英文片段**：`Extend Video 1 forward: the first frame of the new segment continues from the last frame of the original video, with {the person} keeping the final-frame pose and facing direction and carrying on from {the action already in progress}; the rest of the imagery, lighting, and sound state stay consistent.`
- **适用**：两者
- **要点**：官方原文——「向前延长：新片段首帧承接原视频末帧」；延长类任务属于「有锁定」，输出宽高比与时长会被输入素材锁死，不要在提示词里写死目标时长。

### AIM-23 · 视频延长（向后）
- **中文片段**：`向后延长视频 1：新片段的末帧承接原视频的首帧，先描述原视频开始之前发生的事件——{事件}，再自然接入原视频的{开场画面}。`
- **英文片段**：`Extend Video 1 backward: the last frame of the new segment continues from the first frame of the original video. First describe what happened before the original video began — {the event} — and then flow naturally into the original opening shot, {the opening image}.`
- **适用**：两者
- **要点**：官方原文——「向后延长：新片段末帧承接原视频首帧，并先描述原视频开始前的事件」；顺序不能反，先铺垫前史再接原片。

### AIM-24 · 延长的连续性要求
- **中文片段**：`{人物}必须保持为与原视频同一连续实例，不复制、不拆分；{杯子、伞等道具}的部件数量与拓扑关系保持稳定；人物姿态、朝向、道具、场景、构图、灯光与声音状态延续原视频末帧的趋势。`
- **英文片段**：`{The person} must remain the same continuous instance as in the original video, never duplicated or split; the part count and topology of {props such as the cup or the umbrella} stay stable; pose, facing direction, props, setting, composition, lighting, and sound state all continue the trajectory of the original video's last frame.`
- **适用**：两者
- **要点**：官方原文——「主体必须保持为同一连续实例；道具部件数量与拓扑关系稳定」；另外官方提示延长任务「生成视频的音量较输入视频可能发生轻微变化」，用 Seedance 2.5 自身产出的视频做延长衔接更好。

### AIM-25 · 已知问题：编辑前后时长差约 0.33 秒
- **中文片段**：`若编辑结果与原视频时长相差约 0.33 秒，改为参考生成模式并显式指定输出时长；或把输入帧数调整为 8n+1 后重新提交。`
- **英文片段**：`If the edited result differs from the original video length by roughly 0.33 seconds, switch to reference generation mode and specify the output duration explicitly; alternatively, adjust the input frame count to 8n+1 and resubmit.`
- **适用**：Seedance 2.5
- **要点**：官方常见问题表逐字给出的两条解法；另注——通过编辑改变宽高比效果差时，也改用参考生成任务并强调逐帧逐镜的时序对应。

## 排错提示

- 动作模仿的驱动视频有多镜头 → 动作在切点处断裂；重拍成单镜头，选片标准见 AIM-07。
- 提示词里写了「运动强度」「力度加大」却没效果 → 接口没有 `motion_strength` 参数，动作只由驱动视频决定（AIM-06）；想加强度只能换驱动视频。
- 驱动视频里有 2 个人，结果画面多出一个人 → 驱动视频人物数量必须与输入图片一致（AIM-07）。
- 四肢僵化、动作像白模 → 驱动/白模素材避免精细肢体动作，或在提示词中补全动作序列（AIM-09）。
- 手插进桌面、道具穿模 → 动作模仿模式下写清接触点与距离（AIM-09）；这是通用手部穿模问题的正解。
- 用 `@Video1` 做动作参考却把运镜也继承了 → 想要哪个就写哪个，动作与运镜分素材、分句声明（AIM-13、AIM-15）。
- 提示词越写越长动作反而不对 → 素材已够精准时只做指代，别复述细节（AIM-11）。
- 编辑后画面整体被重画 → 没写「除修改对象外其余不变」，也没声明母版唯一（AIM-16）。
- 编辑只想要一段，结果整条都变了 → 用时间戳圈定区间并补「其余内容不要变化」（AIM-19）。
- 替换主体后新人物动作对不上原轨迹 → 补齐出现时机、运动路径、速度与遮挡关系，并声明原主体不再出现（AIM-20）。
- 延长后接缝处姿态或光线跳变 → 明确承接帧与连续性清单，AIM-22 / AIM-23 / AIM-24 合并使用。
- 延长后道具数量变了、人物像被复制 → 同一连续实例、部件数量与拓扑稳定，逐条写死（AIM-24）。
- 编辑后长度莫名差 0.33 秒 → 切参考生成模式并指定时长，或把输入帧数调成 8n+1（AIM-25）。
- 延长后音量有轻微变化 → 官方已知现象；用 Seedance 2.5 自身生成的视频做延长，衔接更稳（AIM-24 要点）。
