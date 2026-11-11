# 现有提示词库 vs 官方原件 · 差异与修正清单

> 官方原件：`library/intel/minimax-h3-official/`（`SKILL.md`、`references_base-en.txt`、`references_ref-en.txt`、`scenarios/*`）。
> 被比对库文件（5 个）：`library/model-syntax.md`、`library/story-structure.md`、`library/pacing-duration.md`、`library/audio-dialogue-music.md`、`library/image-model.md`。
>
> 严重度定义：
> - **严重** —— 写错了，照此写会导致出片不对 / 模型收到非法结构
> - **偏差** —— 不准确但不致命，或官方文件未说明而库中写了
> - **缺失** —— 官方有、库里没有
>
> 说明：官方文件（`SKILL.md` / `references_base-en.txt` / `references_ref-en.txt`）**未说明**帧率、分辨率档位、提示词字数上限、参考文件数量上限、音频采样率/声道。这些库中已有的说法在本文件中按「偏差（官方文件未说明）」列出，不能当作官方规范继续引用。

---

## 一、总览

- **严重**：11 条
- **偏差**：13 条
- **缺失**：17 条

---

## 二、严重（写错了，会导致出片不对）

### 1. `严重` | model-syntax.md | §1.3「Full-Reference」行：只写「逐个声明每个文件管什么」，**完全没有列出 Ref2VA 的六个段名** | `references_ref-en.txt`「## 1. Overall Structure」：「A complete rewrite output consists of six sections in the following order:」—— `subject_definitions`、`summary`、`retention_analysis`、`detailed_description`、`overall_soundscape`、`non_diegetic_music` | 在 model-syntax.md §1.3 的 Full-Reference 行补上六段名与顺序（原文段名 + 中文译名 + 各自职责），并新增一小节「1.7 H3 全参考模式 Ref2VA 六段结构」 |

### 2. `严重` | model-syntax.md | §1.3「Full-Reference」行把 H3 参考写法写成 `@文件1` 锁身份、`@文件2` 锁产品几何、`@视频1` 继承运镜 | 官方 H3 参考标签是尖括号编号标签：`<Subject N>`（可复用可见内容）、`<Picture N>`（具体帧锚点/分镜板参考）、`<Video N>`（整片级剪辑/续接/时间结构来源）、`<Audio N>`（音频资产或被启用的同步音轨）。`@Image1/@Video1` 是库中 Seedance 2.5 的写法（§2.4），不是 H3 的 | 把 §1.3 Full-Reference 行的 `@文件1/@视频1` 全部替换为 `<Subject 1>` / `<Picture 1>` / `<Video 1>` / `<Audio 1>`，并注明「`@ImageN` 语法仅属于 Seedance 2.5（§2.4）」 |

### 3. `严重` | model-syntax.md | §1.3 I2VA 行：「写"以该图为首帧，{服装、发型、姿态、背景陈设}完全继承"，再写一段延展运动」——中文自拟句 | `references_base-en.txt`「### 2.1 Part One Is the Instruction」：I2VA **always uses**：`For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.` | 改为官方固定句，并补规则：「The instruction must be the first line of the final prompt, followed by one blank line before the core fields.」 |

### 4. `严重` | model-syntax.md | §1.3 FL2VA 行：「写"从{首帧描述}开始…落到{尾帧描述}，中间通过{路径/动作}过渡"」 | `references_base-en.txt`「### 2.1」FL2VA **always uses**：`How the reference pictures align with the target video — Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot N) aligns with the S.SS-second mark of the target video.` | 换成官方固定句；补「`N` is the index of the actual final shot, and `S.SS` is the effective video duration formatted to exactly two decimal places」 |

### 5. `严重` | model-syntax.md | §1.3 L2VA 行：「写"最终落幅与{图片}完全一致，开场形态通过{动作/过程}自然过渡到该状态"」 | `references_base-en.txt`「### 2.1」L2VA **always uses**：`How the reference pictures align with the target video — <Picture 1> (from [Shot N]) aligns with the S.SS-second mark of the target video.` | 换成官方固定句；同时补 L2VA 语义：「`<Picture 1>` is the final frame of the video and belongs to the last `[Shot N]`; it does not inherently belong to Shot 1.」（「### 3.3」）|

### 6. `严重` | model-syntax.md + audio-dialogue-music.md | §1.6「台词一律用引号包住」、§1.2 模板用 `S1（{音色与情绪}）说：「{台词}」`；audio-dialogue-music.md 全部对白片段（AUD-01/02/03/04/05/06/07）同样用引号 | `references_base-en.txt`「### 4.4」：「Inside `<d>`, include only the language tag and the actual user-provided spoken content. Preserve every original word and punctuation mark verbatim; do not translate or rewrite them.」官方格式为 `<d>[English] 台词原文</d>` | 所有 H3 对白/歌词片段改为 `<d>[English] ...</d>`；并在 §1.6 补规则：「说话人身份短语、ID、动作、语气一律放在 `<d>` 外面」 |

### 7. `严重` | model-syntax.md + audio-dialogue-music.md | §1.6「画外音标 **OS**，内心独白标 **VO**」；AUD-04「画外音（OS，成年女声…）」、AUD-05「内心独白（VO，…）」 | 官方没有 OS / VO 标签。`references_base-en.txt`「### 4.4」：「For voiceover, use the exact phrase `says in an off-screen voiceover`. Immediately after every voiceover `<d>` block, state that the corresponding on-screen character's lips remain closed.」官方示例：`The man (S1) says in an off-screen voiceover: <d>[English] I still remember that road.</d> while his lips remain completely closed.` | 删除 OS / VO 标记法；改用官方固定短语 `says in an off-screen voiceover`，并在每个画外音 `<d>` 块之后紧跟一句声明画内人物嘴唇闭合 |

### 8. `严重` | model-syntax.md | §三 差异对照表「语言偏好」行：H3「中英文均可，长提示词里中英混排需谨慎」；§1.2 整段 H3 模板为中文 | `SKILL.md`「## Output Rules」：「Write rewrite sections in English; preserve dialogue, lyrics, and visible scene text in their original language.」`references_ref-en.txt` 开头：「Write all six rewrite sections in English. Preserve the original language only for dialogue and lyrics inside `<d>` and for text visibly present in the scene.」 | 改为：H3 改写段落（三个核心字段 / 六段结构）一律用英文写；只有 `<d>` 内的对白与歌词、以及画面上可见文字保留原语言。§1.2 模板的字段值改为英文 |

### 9. `严重` | model-syntax.md | §1.2 模板与 §1.5：运镜写成堆叠标签 `镜头{唯一主运镜：方向+幅度+速度}`，整段模板为中文；没有官方运镜英文词表 | `references_base-en.txt`「### 4.3」：「Camera motion should be written as a natural English action within the shot, rather than stacked as separate labels at the end of a sentence.」官方示例：`The camera pushes in with small amplitude at slow speed toward the folded letter in her hands.`；官方运镜词表固定 12 组 + 幅度 2 项 + 速度 2 项 | 模板改为官方自然英文动作句式；补入 §1.2 的官方运镜词表（Zoom In/Out、Push In/Out、Pan L/R、Truck L/R、Tilt Up/Down、Pedestal Up/Down、Arc Shot、Tracking Shot、Static Shot、Shake Slightly/Strongly、POV、Roll Clockwise/Counterclockwise；幅度 `with small/large amplitude`；速度 `at slow/fast speed`），并补「medium amplitude and normal speed are usually omitted」 |

### 10. `严重` | story-structure.md | STO-09 三幕式、STO-10 AI 短剧单集结构（每集 60~90 秒）均标注「适用：H3 ｜ Seedance 2.5 ｜ 两者」；STO-01 30 秒四拍也标注适用 H3 | `SKILL.md`「## Tips for Better Results」：「Always match the total duration of the description to the requested video length (4–15 seconds).」H3 单条上限 15 秒，30 秒四拍 / 三幕 / 60–90 秒单集对 H3 不成立 | STO-09 / STO-10 / STO-01 的「适用」列改为 **仅 Seedance 2.5**；H3 侧保留 STO-02（≤15 秒三拍裁切版）并补一句官方口径：「H3 提示词描述的总时长必须落在 4–15 秒，超出必须拆条」 |

### 11. `严重` | model-syntax.md | §1.4 硬性参数：「参考文件数 **≤ 12 个**」，且 §1.3 Full-Reference 触发条件写「最多 12 个参考文件」 | 官方文件未设参考数量上限；Ref2VA 的结构是按 `<Subject N>` / `<Picture N>` / `<Video N>` / `<Audio N>` 四类**分别独立编号**，没有任何总数上限表述（`references_ref-en.txt`「### 2.5」：「`<Video N>` and `<Audio N>` are numbered independently. Each index indicates only the label's order within its own category」）。把 12 写成 H3 硬上限会让使用者主动裁掉可用参考 | 删除「≤ 12 个参考文件」这条硬约束，改为「官方文件未说明参考数量上限；Ref2VA 的四类标签各自独立编号」；把「最多 12 个参考文件」的分配建议（身份锚/产品锚/场景锚/运镜参考）删除或明确降级为「非官方经验建议」 |

---

## 三、偏差（不准确但不致命 / 官方未说明）

### 12. `偏差` | model-syntax.md | §1.1 表：`non_diegetic_music` 写「配乐风格、乐器、节奏、进入/退出点、**情绪走向**」；§1.7 表格同 | `references_base-en.txt`「### 4.7」：「Focus on instrumentation, speed, rhythm, and dynamic changes; **do not use abstract mood words or explain the emotional function of the score**.」 | 删掉「情绪走向」，改为「配乐风格、乐器编制、速度、节奏、动态变化」；并补：「角色能听到的歌唱/乐器/收音机/电视/手机音乐属叙事内事件，必须写在主描述段」 |

### 13. `偏差` | model-syntax.md | §1.1 表：`overall_soundscape` 写「空间底噪（room tone）、物理音效、脚步、衣物摩擦、器械声、环境机械声及其远近与强弱」 | `references_base-en.txt`「### 4.6」要求 **1–4 个英文句、一个连续段落**，且「Use `N/A` only when the user explicitly requests complete silence throughout the video.」 | 补写句数与段落形式约束（1–4 句、单一连续段落、英文）；补 `N/A` 的唯一使用条件（仅用户明确要求全片静默时） |

### 14. `偏差` | model-syntax.md | §1.2 模板在 `integrated_multimodal_description` 末尾加了一整行「{稳定性约束句：保持脸部、服装、产品几何…；不闪烁、不切镜、不自行运镜。}」 | 官方基础模式只规定三个字段（`references_base-en.txt`「## 2.2」），未规定在描述层末尾附加稳定性约束段；`SKILL.md`「## Output Rules」只要求避免剧情梗概、未解析的参考标签与时长不匹配 | 该约束行可保留但必须标注为「非官方附加项（库自加）」；不得把它当作官方结构的一部分 |

### 15. `偏差` | model-syntax.md | §1.6「说话人固定用 **S1 / S2 / S3** 编号」；模板写 `S1（…）说` | 官方写法带括号：`(S1)`、`(S2)`，多人同时发声用复合 ID `(S1,S2)`；且「characters who never vocalize receive no speaker ID」（`references_base-en.txt`「### 4.4」）| 统一改为括号形式；补复合 ID 规则；补「不发声的角色不给说话人 ID」 |

### 16. `偏差` | model-syntax.md | §1.6「三人以上发言要写明"轮流、不重叠"」 | 官方并未禁止多人同时发声，反而给了并行写法 `(S1,S2)`（「The two children (S1,S2) shout together」）；官方只在「### 5.4」规定 `(Sx)` 的分配顺序 | 改为「多人同时发声用复合 ID `(S1,S2)`；若要轮流必须显式指定顺序与不重叠」 |

### 17. `偏差` | model-syntax.md | §1.4「帧率 **24 FPS**，输出 **2K**」 | `SKILL.md` / `references_base-en.txt` / `references_ref-en.txt` 均未写帧率。2K 只在 `scenarios/3d-animation-short-generator/SKILL.cn.md`「分辨率选项卡」里作为场景层的选项出现 | 帧率 24 FPS 标注「官方文件未说明」；2K 标注「来源：官方场景技能 3d-animation-short-generator 的分辨率选项卡，非提示词规范原文」 |

### 18. `偏差` | model-syntax.md | §1.4「提示词长度上限约 **7000 字符**」 | 官方文件未说明任何提示词字数上限 | 标注「官方文件未说明」，或删除 |

### 19. `偏差` | model-syntax.md | §1.4「音频**原生生成**：**32 kHz 立体声**，声音与画面同帧渲染」 | 官方文件未说明采样率与声道数。`references_base-en.txt` 只规定三个字段的分工，未提技术规格 | 标注「官方文件未说明」；保留「声音与画面由模型一并产出」这一可从字段结构推出的结论，但注明来源 |

### 20. `偏差` | pacing-duration.md | PAC-15「总时长 {4~15} 秒，24 FPS，2K 画面，提示词不超过约 7000 字符」 | 4–15 秒有官方依据（`SKILL.md`「## Tips for Better Results」）；24 FPS 与 7000 字符官方文件未说明 | 拆开：4–15 秒标「官方（SKILL.md）」，其余标「官方文件未说明」 |

### 21. `偏差` | pacing-duration.md | PAC-15「`overall_soundscape` 不含对白与音乐，`non_diegetic_music` 没有就写 N/A」 | 与官方一致，但漏了 `overall_soundscape` 的 `N/A` 条件（仅用户明确要求全片静默时）| 补上该条件 |

### 22. `偏差` | pacing-duration.md | PAC-05 只写「`[Shot n] At MM:SS.mmm`，切点时间严格递增且必须小于总时长」 | 官方还规定切镜**短语词表**（`the camera cuts to` / `the shot cuts to` / `the shot transitions to` / `the shot changes to` / `the shot switches to`）与「仅在用户明确要求时才用 cross-dissolve / fade / wipe」（`references_base-en.txt`「### 4.2」）| 在 PAC-05 要点里补切镜短语词表与转场使用限制 |

### 23. `偏差` | story-structure.md | STO-20 分镜表字段：镜号、时长、景别、运镜、画面、台词（对白/OS/VO）、音效、备注（8 项） | 官方 `scenarios/3d-animation-short-generator/SKILL.cn.md`「STEP 5」的六列规格为：镜头编号 & 时长 / 连续性衔接 / 参考锚点（空间+身份）/ Hook 类型 / 镜头描述（每秒指令）/ 音频与对白轨；且台词列写的是 `旁白 / 对白`，无 OS / VO 标记 | STO-20 改为与官方六列一致，或新增一条 STO-20b「官方六列标准镜头信息表」；同时删掉 OS/VO 标记（见第 7 条）|

### 24. `偏差` | image-model.md | 全篇只讲「关键帧 / 参考图」的技术制作，IMG-15「本次生成参考图共 {N} 张，优先级为…」，未提这些图进入 H3 后如何被引用 | 官方基础模式有强制的图像对齐指令（`references_base-en.txt`「### 2.1」）与 `<Picture 1>` 标签体系（I2VA 的 `<Picture 1> (from [Shot 1])`，FL2VA 的 `Picture 1/Picture 2 ... aligns with the 0.00/S.SS-second mark`） | IMG-15 增补：作为 H3 参考图时的标签与对齐指令写法，并注明「H3 侧标签为 `<Picture N>`，不是 `@ImageN`」 |

---

## 四、缺失（官方有、库里没有）

### 25. `缺失` | model-syntax.md | 完全没有 Ref2VA 的 `subject_definitions` 段说明 | `references_ref-en.txt`「## 2. Reference Labels and Definitions」：四类标签的完整定义、`<Subject N>` 的适用范围（人物/动物/物体、场景/背景/环境、服装/道具/界面/视觉特效、风格/动作/表情/姿态）、`<Picture N>` 只在充当首帧/关键帧/尾帧/编辑过的关键帧/构图锚点时才单列（否则写进 `<Subject N>` 定义里）、`<Video N>` 只用于整片级关系、`<Audio N>` 的五种用途与「普通参考视频不会自动产生 `<Audio N>`」 | 新增「1.7 H3 全参考模式 Ref2VA」小节，完整写入四类标签定义与使用规则 |

### 26. `缺失` | model-syntax.md | 没有 `summary` 段的方括号任务类型前缀 | `references_ref-en.txt`「## 3. `summary`」：`[reference generation]`、`[video editing + reference generation + audio reuse]` 等；任务类型词表 `keyframe completion` / `reference generation` / `video editing` / `video continuation` / `audio reuse` / `audio reference`；组合用 ` + ` 且不重复；剪辑任务固定开头 `The target video is an edited version of <Video 1>.` | 补入任务类型词表与前缀写法 |

### 27. `缺失` | model-syntax.md | 没有 `retention_analysis` 段 | `references_ref-en.txt`「## 4. `retention_analysis`」：可见内容标记 `fully_preserved` / `partially_preserved` / `attribute_transfer` / `weak_reference`；音频标记 `fully_copy` / `partially_copy` / `reference` / `weak_reference`；行格式 `<Subject 1> (appears in [Shot 1], [Shot 3]): fully_preserved - ...`、`<Audio 1>: fully_copy - ...`；判定边界「只能在 `subject_definitions` 已定义的角色范围内选择」 | 新增 `retention_analysis` 写法小节与两个标记表 |

### 28. `缺失` | model-syntax.md | 没有 Ref2VA 的 `detailed_description` 与基础模式的差异 | `references_ref-en.txt`「### 5.2 Full-Reference Mode Differences」官方对照表：主字段由 `integrated_multimodal_description` 改为 `detailed_description`；风格开场的**位置不同**（基础模式写在 `[Shot 1]` 之后，Ref2VA 写在 `[Shot 1]` **之前**的一两句）；参考标签插在首次出现处；音频关系要写明是复制还是参考。另「### 5.2」：`detailed_description` 生成类任务通常 350–500 个英文词 | 新增差异对照表小节，并把「风格写在 `[Shot 1]` 之后」这条改成分模式说明 |

### 29. `缺失` | model-syntax.md | 没有「`<Subject N> (Sx)`」写法与 `(Sx)` 分配规则 | `references_ref-en.txt`「### 5.4 Speakers, Audio Sources, and Dialogue」：`<Subject N>` 标识被参考主体、`(Sx)` 标识实际说话人；`(Sx)` 按目标视频中真实发声事件顺序一次性分配并全程复用；`retention_analysis` 里**不得**写 `(Sx)`；纯粹存在于复用 BGM/完整音轨中的口语线索用 `<Audio N>` 作声源，不得额外编造 `(Sx)`；听不清处写 `[unclear]`；标点规范化为 `,` `.` `?` `!`，去掉波浪线/emoji/项目符号 | 补入说话人与标签绑定规则；并在 §1.6 补 `[unclear]` 与标点规范化 |

### 30. `缺失` | model-syntax.md | 没有 `<scenetrans>` / `<cutoff>` 标签 | `references_base-en.txt`「### 4.4」："use `<scenetrans>` at the connecting points in both parts and explicitly state that the audio continues across the cut. Use `<cutoff>` when speech is truncated by the end of the video."；连续性描述句式：`continues seamlessly across the cut` / `continues uninterrupted into the next shot` / `carries over from the previous shot` / `remains audible across the transition` | 补入两个标签与四种连续性描述句式 |

### 31. `缺失` | model-syntax.md | 没有画面文字（on-screen text）的写法规则 | `references_base-en.txt`「### 4.5 On-Screen Text」："Place any banner, sign, label, subtitle, or neon text that is actually visible on screen in English double quotation marks. Preserve the original text and punctuation verbatim, without translation." 官方示例：`A red neon sign reading "营业中" glows above the doorway.` | 补一小节：画面可见文字一律用英文双引号包裹、原文逐字保留不翻译 |

### 32. `缺失` | model-syntax.md | 没有官方切镜短语词表 | `references_base-en.txt`「### 4.2 Shots and Cuts」：`the camera cuts to` / `the shot cuts to` / `the shot transitions to` / `the shot changes to` / `the shot switches to`；cross-dissolve / fade / wipe 仅在用户明确要求时使用 | 在 §1.5「镜头切换规则」下补固定短语清单 |

### 33. `缺失` | model-syntax.md | 没有「运镜写成自然英文动作、不堆标签」的写法要求 | `references_base-en.txt`「### 4.3 Camera Motion」 | 补该规则（与第 9 条一并处理）|

### 34. `缺失` | model-syntax.md | 没有 `SKILL.md`「## Output Rules」的完整约束 | `SKILL.md`：「Describe each shot by composition, subjects, environment, actions, camera, sound, and the exact point where referenced content appears.」「Avoid plot summaries, unresolved reference labels, and timing that does not match the requested duration.」「Prefer concrete visual and audio details over abstract words like "cinematic" or "beautiful".」 | 在 §1 开头补「官方 Output Rules」四条 |

### 35. `缺失` | model-syntax.md | §1.2 模板未包含「图像对齐指令行 + 空一行」的整体版式 | `references_base-en.txt`「### 2.1」："The instruction must be the first line of the final prompt, followed by one blank line before the core fields." | 模板改为「[可选指令行] + 空行 + 三字段」的两段式版式 |

### 36. `缺失` | audio-dialogue-music.md | 全部对白片段（AUD-01 ~ AUD-07）都没有 `<d>[Language] ...</d>` 标签，也没有任何一条说明 H3 的对白标签格式 | `references_base-en.txt`「### 4.4」 | AUD-01/02/03/04/05/06/07 的 H3 版本改写为 `<d>[English] ...</d>`；并新增一条片段讲 `<d>` 规则（`<d>` 内只放语言标签与用户原文；说话人身份短语、ID、动作、语气在 `<d>` 外）|

### 37. `缺失` | audio-dialogue-music.md | 没有画外音的固定短语与「紧跟闭嘴声明」规则 | `references_base-en.txt`「### 4.4」：「use the exact phrase `says in an off-screen voiceover`」「Immediately after every voiceover `<d>` block, state that the corresponding on-screen character's lips remain closed.」 | AUD-04 改写为官方句式，并新增「画外音后必须紧跟一句闭嘴声明」的要点 |

### 38. `缺失` | audio-dialogue-music.md | 排错提示里只有 `non_diegetic_music` 的 N/A 规则，没有 `overall_soundscape` 的 N/A 规则 | `references_base-en.txt`「### 4.6」：「Use `N/A` only when the user explicitly requests complete silence throughout the video.」 | 补一条排错：`overall_soundscape` 只有在用户明确要求全片静默时才写 N/A，其他情况必须写 1–4 句英文描述 |

### 39. `缺失` | audio-dialogue-music.md | 没有「非叙事音乐不得写抽象情绪词 / 不得解释配乐情绪功能」的规则 | `references_base-en.txt`「### 4.7」 | 在 AUD-18 要点里补：「只写乐器编制、速度、节奏、动态变化；不要写抽象情绪词，也不要解释配乐的情绪功能」 |

### 40. `缺失` | story-structure.md | 没有官方的「六列标准镜头信息表」字段规格与「镜头表自检门」六项必检 | `scenarios/3d-animation-short-generator/SKILL.cn.md`「STEP 5」「STEP 5.5」 | 新增 STO-23「官方六列标准镜头信息表」与 STO-24「镜头表自检门六项必检」，并补 `Per-Second Directives` 的 5 个必填要素与 `narrator-mouth-closed: true` |

### 41. `缺失` | image-model.md | 没有 H3 参考图的标签与对齐指令写法（只讲怎么出图，不讲怎么被 H3 引用） | `references_base-en.txt`「### 2.1 / 3.1」 | 在 IMG-15 增补 H3 侧写法：`<Picture 1>` 标签、I2VA / FL2VA / L2VA 的固定对齐指令句、以及「`@ImageN` 是 Seedance 2.5 语法，不是 H3」 |

---

## 五、已核查且与官方一致的项（无需修改，仅备查）

- 三个核心字段名与顺序（`integrated_multimodal_description` → `overall_soundscape` → `non_diegetic_music`）—— 与 `references_base-en.txt`「## 2.2」一致。
- 三层音频分离规则（对白只在主描述段、环境/物理音只在 `overall_soundscape`、配乐只在 `non_diegetic_music`，不重复）—— 与「### 4.6」「### 4.7」一致。
- 第一镜不带时间戳、后续镜 `[Shot n] At MM:SS.mmm`、切点严格递增且落在总时长内 —— 与「### 4.2」一致。
- 切镜只在「新主体 / 新空间 / 新状态 / 新视点 / 新时间点」之一发生时使用，其余变化留在镜内（优先用运镜）—— 与「### 4.2」"A cut should introduce new information about the subject, space, state, viewpoint, or time. If only the distance or a slight angle needs to change, prefer camera motion." 一致。
- H3 时长 4–15 秒、超 15 秒须拆条 —— 与 `SKILL.md`「## Tips for Better Results」一致。
- `non_diegetic_music` 没有时写 `N/A` —— 与「### 4.7」一致。
- 新镜次开头复述主体锚点防漂 —— 与 `references_ref-en.txt`「### 5.3」（"Continue using the same label in later shots without redefining what the label represents."）方向一致。

---

## 六、用户已怀疑的两点的直接回答

**(a) 现有库说 H3 全参考模式用「不同六段结构」但没写段名 —— 官方 Ref2VA 的六段究竟是哪六段？**

官方 Ref2VA 的六段，按固定顺序为（`references_ref-en.txt`「## 1. Overall Structure」原文表格 + `SKILL.md`「## Full-Reference Mode」复述）：

1. `subject_definitions` —— 参考对象定义（定义被参考内容及其参考标签）
2. `summary` —— 摘要（任务类型、目标视频、主要参考关系；以方括号任务类型前缀开头）
3. `retention_analysis` —— 保留度分析（被参考内容如何被保留 / 迁移 / 复用）
4. `detailed_description` —— 详细描述（按播放顺序写画面、动作、镜头、声音、对白）
5. `overall_soundscape` —— 整体声景（环境声与物理音）
6. `non_diegetic_music` —— 非叙事性音乐（只有观众能听到的配乐）

现有库 `model-syntax.md` §1.3 只写了「Full-Reference：最多 12 个参考文件 / 逐个声明每个文件管什么」，**六段段名一个都没有**，因此属于第 1、25、26、27、28 条的缺失，必须补齐。

**(b) 现有库对 H3 参考标签语法的猜测是否正确？官方的确切写法是什么？**

**不正确。** 现有库 §1.3 把 H3 全参考写成 `@文件1` 锁身份、`@文件2` 锁产品几何、`@视频1` 继承运镜，`@Image1/@Video1/@Audio1` 这套是库里 §2.4 标注给 **Seedance 2.5** 的语法，官方 H3 侧不这么写。

官方 H3 的确切写法：

- **基础模式（T2VA / I2VA / FL2VA / L2VA）**：唯一出现的参考标签是 `<Picture N>`（尖括号 + 空格 + 数字）。I2VA 固定首行 `For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.`；FL2VA / L2VA 固定首行 `How the reference pictures align with the target video — ... aligns with the 0.00-second mark / the S.SS-second mark of the target video.`（`S.SS` 保留两位小数）。
- **全参考模式 Ref2VA**：四类标签，各自带中文语义与使用边界：
  - `<Subject N>` —— 从参考素材中抽象出的、**可复用或可修改**的可见内容（人/动物/物体、场景/背景/环境、服装/道具/界面/视觉特效、风格/动作/表情/姿态）。一个主体可由多个素材定义，一个素材可定义多个主体。
  - `<Picture N>` —— 作为**具体帧锚点或分镜规划依据**的参考图（首帧 / 关键帧 / 尾帧 / 编辑后的关键帧 / 构图锚点）。只用来定义角色/场景/服装/风格时**不要单列**，要写进对应的 `<Subject N>` 定义里。
  - `<Video N>` —— 只承担**整片级**关系：剪辑原片、从原片结尾续接、参考原片的运镜/切点/节奏/时间结构。
  - `<Audio N>` —— 独立音频资产，或参考视频中被启用的同步音轨；用途为整段/部分复制、参考 BGM 风格、参考说话人音色与语态、复用原声对白歌词音效、参考节拍与音频连续性。
  - `<Video N>` 与 `<Audio N>` **各自独立编号**，编号不表达配对关系；同一个参考视频可以同时是 `<Video 1>` 和 `<Audio 2>`；普通参考视频不会因为带声音就自动产生 `<Audio N>`。
  - 标签一经指派，在 `subject_definitions`、`summary`、`retention_analysis`、`detailed_description` 及两个音频段中**含义必须保持一致**；`summary` 中不得引入新标签。
  - 说话人绑定写法：`<Audio 1> is the voice-timbre reference for <Subject 1> (S1).`；主体发声时写 `<Subject N> (Sx)`。
