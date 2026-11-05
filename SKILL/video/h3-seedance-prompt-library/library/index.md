---
id: library-index
title: 提示词库索引
dimension: 索引
applies_to: [H3, Seedance2.5]
model_field: 全局
---

# 提示词库索引

> **用法**：先在这里定位维度，再读对应的维度文件挑片段。不要一次性读完整个库。
> **生成**：`bash scripts/build-index.sh`（改完片段跑一次，索引自动更新）

## 维度总览

| 文件 | 维度 | 片段数 | ID 段 | 装配位置 |
| --- | --- | --- | --- | --- |
| `action-beats.md` | 动作节拍 | 19 | `ACT` | H3 → integrated_multimodal_description ｜ Seedance 2.5 → 动作与时间 |
| `action-imitation.md` | 动作模仿与驱动 | 25 | `AIM` | H3 → integrated_multimodal_description 的动作段 ｜ Seedance 2.5 → 【Reference Asset Roles】+【Event Script】 |
| `audio-dialogue-music.md` | 音频、对白与配乐 | 35 | `AUD` | H3 → integrated_multimodal_description（对白 / 口型 / 画外音 / 歌唱）、overall_soundscape（环境底噪与物理音）、non_diegetic_music（配乐）｜ Seedance 2.5 → 第六段「音频」 |
| `camera-movement.md` | 运镜 | 18 | `CAM` | H3 → integrated_multimodal_description ｜ Seedance 2.5 → 镜头与构图 |
| `color-grading.md` | 调色与跨镜一致性 | 30 | `CGR` | Seedance 2.5 → 第 5 段 ｜ H3 → 第一字段内的光线与色彩句 |
| `color-tone.md` | 色调与色彩 | 20 | `COL` | H3 → integrated_multimodal_description ｜ Seedance 2.5 → 第 5 段「光线与色彩」 |
| `coverage-editing.md` | 覆盖几何与剪辑装配 | 32 | `COV` | H3 → 多镜之间的连续性 ｜ Seedance 2.5 → 【Event Script】的镜头序列与时间切点 |
| `director-styles.md` | 电影大师风格模仿 | 81 | `DIR` | Seedance 2.5 → 第 5 段与开头风格行 ｜ H3 → `[Shot 1]` 之后的风格开场句 |
| `h3-syntax.md` | H3 官方书写规范 | 34 | `H3S` | H3 → integrated_multimodal_description / overall_soundscape / non_diegetic_music |
| `image-model.md` | 图像模型提示词 | 22 | `IMG` | H3 → 参考素材制作，进入提示词时以 `<Picture N>` 标签 + 官方对齐指令句引用 ｜ Seedance 2.5 → `@Image1` 素材准备 |
| `lighting.md` | 光线 | 20 | `LIT` | H3 → integrated_multimodal_description ｜ Seedance 2.5 → 第 5 段「光线与色彩」 |
| `mood-emotion.md` | 氛围与情绪 | 21 | `MOOD` | H3 → integrated_multimodal_description（整体氛围描述）｜ Seedance 2.5 → 第 1 段「主体」与第 5 段「光线与色彩」配合使用 |
| `negative-constraints.md` | 负面约束与稳定性锚点 | 22 | `NEG` | H3 → integrated_multimodal_description 末尾 ｜ Seedance 2.5 → 第 7 段「约束」 |
| `pacing-duration.md` | 节奏与时长 | 20 | `PAC` | H3 → integrated_multimodal_description ｜ Seedance 2.5 → 动作与时间 |
| `reference-modes.md` | 参考模式 | 28 | `REF` | H3 → 素材引用段 ｜ Seedance 2.5 → 【Reference Asset Roles】与素材映射行 |
| `scene-environment.md` | 场景环境 | 18 | `ENV` | H3 → integrated_multimodal_description + overall_soundscape ｜ Seedance 2.5 → 第2段「环境」+ 第5段「光线与色彩」 |
| `seedance-syntax.md` | Seedance 2.5 官方书写规则 | 27 | `SD` | Seedance 2.5 → 全部任务的共同前置（符号、结构、时间、负向控制） |
| `shot-sequencing.md` | 镜头组设计与覆盖 | 32 | `SEQ` | H3 → integrated_multimodal_description 的多镜结构 ｜ Seedance 2.5 → 【Event Script】的镜头序列 |
| `shot-techniques.md` | 拍摄手法与题材技法 | 35 | `TEC` | Seedance 2.5 → 第 5 段与【镜头与构图】段 ｜ H3 → `[Shot 1]` 风格开场与镜头描述 |
| `story-structure.md` | 分镜脚本与叙事结构 | 24 | `STO` | H3 → 全局（先定结构再填字段） ｜ Seedance 2.5 → 全局（先定结构再填七段） |
| `style-texture.md` | 风格与质感 | 26 | `STY` | H3 → integrated_multimodal_description ｜ Seedance 2.5 → 第 5 段「光线与色彩」（风格质感部分） |
| `subject-consistency.md` | 主体与一致性 | 18 | `SUB` | H3 → integrated_multimodal_description ｜ Seedance 2.5 → 第1段「主体」+ 第7段「约束」 |
| `vfx-design.md` | 视觉特效与物理特效 | 30 | `VFX` | Seedance 2.5 → 【动作与时间】与第 5 段 ｜ H3 → 第一字段的动作与光线句 |

**片段总数：637**

## 维度文件说明

### `action-beats.md`

- ACT-01 · 走（walking）
- ACT-02 · 跑（running）
- ACT-03 · 转身（turning）
- ACT-04 · 坐下（sitting down）
- ACT-05 · 起身与站起（standing up）
- ACT-06 · 开门与开合（opening and closing）
- ACT-07 · 拿起（picking up）
- ACT-08 · 放下（putting down）
- ACT-09 · 双手交互（two-handed interaction）
- ACT-10 · 与他人交互（interaction with another subject）
- ACT-11 · 物理因果链：踩水（physical causality - stepping in water）
- ACT-12 · 物理因果链：推倒（physical causality - toppling）
- ACT-13 · 面部微表情（micro-expression）
- ACT-14 · 手部细节与重心平衡（hand detail and balance）
- ACT-15 · 机械与物体运动（mechanical and object motion）
- ACT-16 · 群体与背景运动（crowd and background motion）
- ACT-17 · 慢动作（slow motion）
- ACT-18 · 动作预算分档（action budget）
- ACT-19 · 抓握与挣脱（grip and pull-away）

### `action-imitation.md`

- AIM-01 · 动作模仿能力定义（1 图 + 1 驱动视频）
- AIM-02 · 动作模仿接口提交与查询
- AIM-03 · 输入图片：image_urls 与 binary_data_base64 二选一
- AIM-04 · 输入视频与首秒裁切开关
- AIM-05 · 输出规格与结果有效期
- AIM-06 · 接口没有 motion_strength
- AIM-07 · 驱动视频的选片要求
- AIM-08 · 提示词写法：素材职责分工
- AIM-09 · 动作模仿的常见失败与修复
- AIM-10 · 严格参考动作与运镜（官方原句）
- AIM-11 · 素材已够精准时只做指代
- AIM-12 · 概括性动作描述（舞蹈 / 武术 / 运动）
- AIM-13 · 动作与运镜分离引用
- AIM-14 · 身体局部驱动
- AIM-15 · 参考素材的职责绑定写法
- AIM-16 · 编辑：母版唯一与范围闭合
- AIM-17 · 编辑：写清 A->B 的过程
- AIM-18 · 编辑：台词与口音（官方示例）
- AIM-19 · 编辑：时间戳局部动作（官方示例）
- AIM-20 · 编辑：动态主体替换
- AIM-21 · 视频音频编辑
- AIM-22 · 视频延长（向前）
- AIM-23 · 视频延长（向后）
- AIM-24 · 延长的连续性要求
- AIM-25 · 已知问题：编辑前后时长差约 0.33 秒

### `audio-dialogue-music.md`

- AUD-01 · 双人对话与说话人标注
- AUD-02 · 单人独白与自述
- AUD-03 · 口型同步与唇形匹配
- AUD-04 · 画外音（官方固定短语）
- AUD-05 · 内心独白（同样走官方画外音句式）
- AUD-06 · 歌唱与演唱
- AUD-07 · 多人对话与同时发声
- AUD-08 · 环境底噪（room tone）
- AUD-09 · 物理音效绑定到具体动作
- AUD-10 · 拟音强调与关键音前置
- AUD-11 · 静默作为音效设计
- AUD-12 · 场景环境音：城市雨夜
- AUD-13 · 场景环境音：森林清晨
- AUD-14 · 场景环境音：室内办公室
- AUD-15 · 场景环境音：地铁车厢
- AUD-16 · 场景环境音：工厂车间
- AUD-17 · 场景环境音：厨房
- AUD-18 · 配乐描述句式（乐器编制 + 速度 + 节奏 + 动态变化）
- AUD-19 · 音乐与动作同步（鼓点落在剪切点）
- AUD-20 · 音量层级（对白 > 环境音 > 配乐）
- AUD-21 · `<d>` 对白标签的官方规则
- AUD-22 · 画外音后的闭嘴声明（硬要求）
- AUD-23 · `overall_soundscape` 的句数与 N/A 条件
- AUD-24 · `non_diegetic_music` 的写法边界
- AUD-25 · 听不清的台词与标点规范化
- AUD-26 · 不可辨的争辩声（unintelligible overlapping voices）
- AUD-27 · Seedance 2.5 的四种符号规范（音乐 / 音效 / 对白 / 字幕）
- AUD-28 · 对白逐段标注规范（语言 / 说话者 / 语气 / 准确台词）
- AUD-29 · 字幕抑制的加强写法（官方常见问题对策）
- AUD-30 · 背景音乐抑制的加强写法（官方常见问题对策）
- AUD-31 · 音效控制的三种写法（单独关音效 / 单独关 BGM / 全部静音）
- AUD-32 · 对白控制（单独关闭对白，保留环境音与音乐）
- AUD-33 · 官方音画问题对策（翻译语种混淆 / 水波纹噪声 / 口型同步）
- AUD-34 · 无对白任务的四件套声明
- AUD-35 · 画面文字的拼写规避

### `camera-movement.md`

- CAM-01 · 缓慢推近（slow push-in）
- CAM-02 · 拉远（pull-out / pull-back）
- CAM-03 · 左摇 / 右摇（pan left / right）
- CAM-04 · 上摇 / 下摇（tilt up / down）
- CAM-05 · 跟拍（tracking shot）
- CAM-06 · 环绕（orbit / arc shot）
- CAM-07 · 升镜 / 降镜（crane up / crane down）
- CAM-08 · 轨道车推轨（dolly in / dolly out）
- CAM-09 · 第一人称视角（FPV / POV）
- CAM-10 · 手持（handheld）
- CAM-11 · 升降环绕组合（crane + orbit）
- CAM-12 · 变焦点（rack focus）
- CAM-13 · 固定镜头（locked-off / static）
- CAM-14 · 变焦（zoom）
- CAM-15 · 甩镜（whip pan）
- CAM-16 · 穿越镜头（pass-by / through）
- CAM-17 · 滚转（roll / dutch）
- CAM-18 · 落幅与构图终点（end frame / landing composition）

### `color-grading.md`

- CGR-01 · 校正层：白平衡归位与色温定向
- CGR-02 · 一级校色：曝光、黑位与整体对比
- CGR-03 · 二级校色：局部提亮与局部压暗
- CGR-04 · 风格化：分离色调与 LUT 的文字描述法
- CGR-05 · 暗部控制：保留细节不死黑
- CGR-06 · 中间调控制：柔和过渡
- CGR-07 · 亮部控制：不过曝且柔和滚降
- CGR-08 · 明暗三段式整句
- CGR-09 · 三件套：主色调 + 点缀色 + 中间调压低
- CGR-10 · 冷峻
- CGR-11 · 温暖
- CGR-12 · 怀旧（褪色低对比）
- CGR-13 · 惊悚
- CGR-14 · 梦幻
- CGR-15 · 疏离
- CGR-16 · 脏乱
- CGR-17 · 圣洁
- CGR-18 · 压抑
- CGR-19 · 甜腻
- CGR-20 · 纪实
- CGR-21 · 复古胶片
- CGR-22 · 赛博霓虹
- CGR-23 · 黑白
- CGR-24 · 胶片曲线与色彩分离
- CGR-25 · 卤化银感与颗粒分布
- CGR-26 · 邻近色、单色无彩与跳色点缀
- CGR-27 · 互补色对比与分裂补色
- CGR-28 · 肤色保护
- CGR-29 · 跨镜色彩一致性
- CGR-30 · 反 AI 味调色

### `color-tone.md`

- COL-01 · 三件套结构化写法（主色调 + 点缀色 + 中间调压低）
- COL-02 · 冷暖对比（cool vs warm）
- COL-03 · 青橙电影蓝橙（teal & orange）
- COL-04 · 莫兰迪低饱和（Morandi muted）
- COL-05 · 高饱和糖果色（candy color）
- COL-06 · 黑白单色（monochrome）
- COL-07 · 暖阳暖黄（warm sun yellow）
- COL-08 · 阴冷青蓝（cold overcast blue）
- COL-09 · 日落橘粉（sunset orange-pink）
- COL-10 · 莫迪粉紫（moody mauve）
- COL-11 · 赛博霓虹紫蓝（cyberpunk neon）
- COL-12 · 单色调同色系（single hue palette）
- COL-13 · 低饱和高调（high key）
- COL-14 · 暗调低调（low key）
- COL-15 · 复古褪色（faded vintage）
- COL-16 · 黑白红三色（red, white and black）
- COL-17 · 霓虹渐变（neon gradient）
- COL-18 · 雨夜青绿（rainy night teal-green）
- COL-19 · 地铁荧光黄绿（subway fluorescent yellow-green）
- COL-20 · 烛光暖褐（candlelight warm brown）

### `coverage-editing.md`

- COV-01 · 180 度轴线：一条必须守住的隐形连线
- COV-02 · 防越轴的写死句（把抽象术语换成可见事实）
- COV-03 · 同一侧的四组合法机位
- COV-04 · 合法过轴的五种手法
- COV-05 · 30 度规则
- COV-06 · 视线匹配的三要素
- COV-07 · 视线匹配的成对写法
- COV-08 · 屏幕方向：行进方向跨镜一致
- COV-09 · 出画侧 → 下一镜入画侧的接续
- COV-10 · 正反打的覆盖规格
- COV-11 · 正反打的可粘贴写法
- COV-12 · 切点动机：动作切（cut on action）
- COV-13 · 切点动机：视线切（cut on look）
- COV-14 · 切点动机：声音切（cut on sound）
- COV-15 · 切点动机：形状切（cut on shape）
- COV-16 · 切点动机：运动切（cut on motion）
- COV-17 · 切点动机：色彩切（cut on colour）
- COV-18 · 切点动机：情绪/观念切（cut on idea）
- COV-19 · 切点动机：视线引导切（gaze-led cut）
- COV-20 · 匹配剪辑：动作匹配（match on action）
- COV-21 · 匹配剪辑：形状匹配（match on shape）
- COV-22 · 匹配剪辑：方向匹配与色彩匹配
- COV-23 · 构造一个匹配剪辑的步骤
- COV-24 · J-cut：声先入画
- COV-25 · L-cut：画先出声
- COV-26 · 交叉剪辑：两条线并行
- COV-27 · 蒙太奇：把一段时间压成几个短镜
- COV-28 · 时间流逝蒙太奇
- COV-29 · 节奏数学：从目标时长倒推镜头数
- COV-30 · 把手预算：生成的要比剪出的长
- COV-31 · 节奏曲线：紧张、情绪与留白
- COV-32 · 生成与剪辑的分工

### `director-styles.md`

- DIR-01 · 张艺谋（主色块 · 仪式对称）
- DIR-02 · 贾樟柯（粗粝现光 · 街头长焦）
- DIR-03 · 毕赣（湿热实光 · 穿行长镜头）
- DIR-04 · 娄烨（失序手持 · 城市欲望）
- DIR-05 · 刁亦男（孤立方光 · 冷调城市夜）
- DIR-06 · 姜文（硬光爆发 · 权力三角）
- DIR-07 · 胡金铨（门槛调度 · 可读的武侠地理）
- DIR-08 · 王家卫（混杂实用光 · 压缩与拖影）
- DIR-09 · 侯孝贤（中远景长镜 · 时间留在画面里）
- DIR-10 · 杨德昌（通透中景 · 建筑里的关系网）
- DIR-11 · 蔡明亮（死光固定 · 空洞中的身体）
- DIR-12 · 岩井俊二（季节柔光 · 青春余像）
- DIR-13 · 黑泽明（硬天光 · 多层动作轴）
- DIR-14 · 小津安二郎（低位锁定 · 家居空位）
- DIR-15 · 是枝裕和（平视观察 · 家的重叠）
- DIR-16 · 黑泽清（平淡日光 · 因果缺口）
- DIR-17 · 奉俊昊（功能光 · 阶层与反转）
- DIR-18 · 朴赞郁（雕琢光 · 器物与欲望）
- DIR-19 · 李沧东（平实日光 · 道德钝痛）
- DIR-20 · 阿彼察邦（热带湿光 · 不解释的未知）
- DIR-21 · 安德烈·塔可夫斯基（元素实光 · 时间与门槛）
- DIR-22 · 斯坦利·库布里克（形式秩序 · 精确几何）
- DIR-23 · 希区柯克（受控悬念光 · 有限知情）
- DIR-24 · 伯格曼（面部实光 · 沉默的关系）
- DIR-25 · 大卫·芬奇（低照度精确 · 证据链）
- DIR-26 · 大卫·林奇（心理实光 · 现实裂缝）
- DIR-27 · 马丁·斯科塞斯（躁动实用光 · 表演破裂）
- DIR-28 · 弗朗西斯·福特·科波拉（致密动机光 · 权力层级）
- DIR-29 · 布莱恩·德·帕尔玛（剧场式对比 · 分裂注意）
- DIR-30 · 迈克尔·曼（城市基础设施光 · 夜间职业）
- DIR-31 · 保罗·托马斯·安德森（丰盈自然光 · 权力协商）
- DIR-32 · 韦斯·安德森（柔和图形光 · 手作秩序）
- DIR-33 · 罗伯特·艾格斯（无源之光的年代 · 元素压迫）
- DIR-34 · 克里斯托弗·诺兰（实用硬光 · 机制与时限）
- DIR-35 · 丹尼斯·维伦纽瓦（沉重广对比 · 环境压倒人）
- DIR-36 · 泰伦斯·马力克（贴身近地光 · 感官中断）
- DIR-37 · 阿方索·卡隆（连续实光路线 · 社会同框）
- DIR-38 · 赵婷（开阔天光 · 工作与社区）
- DIR-39 · 德国表现主义（1919—1924）
- DIR-40 · 意大利新现实主义（1945—1955）
- DIR-41 · 法国新浪潮（1958—1972）
- DIR-42 · 日本新浪潮与水槽社（1950s—1970s）
- DIR-43 · 小津安二郎一系（1950s 日本家庭剧）
- DIR-44 · 伊朗新现实主义（1990s—）
- DIR-45 · 香港新浪潮（1980s）
- DIR-46 · 印度平行电影（1970s—）
- DIR-47 · 苏联蒙太奇学派（1920s—1930s）
- DIR-48 · 手持呼吸感（呼吸机位）
- DIR-49 · 希区柯克变焦（dolly zoom）
- DIR-50 · 库布里克式对称几何
- DIR-51 · 慢动作与升格美学
- DIR-52 · 跳切与手持剪辑节奏
- DIR-53 · Steadicam 稳定器长镜头
- DIR-54 · 黑色电影（film noir）
- DIR-55 · 公路片（road movie）
- DIR-56 · 恐怖片（horror）
- DIR-57 · 惊悚片（thriller）
- DIR-58 · 爱情片（romance）
- DIR-59 · 史诗（epic）
- DIR-60 · 青春片（youth film）
- DIR-61 · 犯罪片（crime）
- DIR-62 · 动作片（action）
- DIR-63 · 纪录片（documentary）
- DIR-64 · 伪纪录片（mockumentary）
- DIR-65 · 黑色喜剧（black comedy）
- DIR-66 · 歌舞片（musical）
- DIR-67 · 赛博朋克
- DIR-68 · 蒸汽波
- DIR-69 · 故障艺术（glitch）
- DIR-70 · 极简工业
- DIR-71 · 胶片拼贴与拼接（photomontage）
- DIR-72 · 油画感（oil painting）
- DIR-73 · 水墨国风
- DIR-74 · 浮世绘
- DIR-75 · 版画与木刻
- DIR-76 · 黏土定格动画
- DIR-77 · 纸雕立体书（paper sculpture）
- DIR-78 · 像素与 8-bit 复古游戏
- DIR-79 · 赛璐璐动画（2D 手绘）
- DIR-80 · 羊毛毡手作（felt / wool）
- DIR-81 · 「像 XXX 一样」的风险与改写（风险提示）

### `h3-syntax.md`

- H3S-01 · 三个字段的职责边界
- H3S-02 · 三层音频分离与「一个声音只写一遍」
- H3S-03 · 整体版式（指令行 + 空一行 + 三字段）
- H3S-04 · 字段名、段序、标签与时间记法不可改
- H3S-05 · Shot 标记格式
- H3S-06 · 切点严格递增且落在总时长内
- H3S-07 · 每镜七要素（写实清单）
- H3S-08 · 切镜短语词表与转场限制
- H3S-09 · 什么时候才切镜
- H3S-10 · 运镜写成自然英文动作句
- H3S-11 · 官方运镜词表（12 组类型）
- H3S-12 · 幅度与速度修饰语
- H3S-13 · 对白标签语法 `<d>[语言] 原文</d>`
- H3S-14 · 说话人 ID 规则
- H3S-15 · 说话人身份信息一律写在 `<d>` 外面
- H3S-16 · 画外音：固定短语 + 闭嘴声明
- H3S-17 · `<scenetrans>` 与 `<cutoff>`
- H3S-18 · 四种跨切点连续性句式
- H3S-19 · 画面可见文字
- H3S-20 · `overall_soundscape` 的形式约束
- H3S-21 · `non_diegetic_music` 的形式约束
- H3S-22 · 叙事内音乐的归属
- H3S-23 · T2VA 写法
- H3S-24 · I2VA 固定首行
- H3S-25 · FL2VA 固定首行
- H3S-26 · L2VA 固定首行
- H3S-27 · `N` 与 `S.SS` 占位符规则
- H3S-28 · Ref2VA 六段结构
- H3S-29 · `summary` 的方括号任务类型前缀
- H3S-30 · `retention_analysis` 的两套关系标记
- H3S-31 · 四类参考标签的边界与编号一致性
- H3S-32 · 官方 Output Rules 四条
- H3S-33 · 官方未说明的项（不要当硬约束）
- H3S-34 · Ref2VA 与基础模式的差异

### `image-model.md`

- IMG-01 · 关键帧首帧（first frame / start frame）
- IMG-02 · 关键帧尾帧（last frame / end frame）
- IMG-03 · 角色设定图 · 正侧背三视图（character sheet）
- IMG-04 · 场景概念图（concept art / environment）
- IMG-05 · 道具/产品三视图（白底，几何一致）
- IMG-06 · 产品单张细节图（几何锁定用）
- IMG-07 · 分镜故事板（storyboard grid，9 格）
- IMG-08 · 情绪参考图（emotional reference / mood board）
- IMG-09 · 风格锚定图（style anchor）
- IMG-10 · 色彩参考（color reference / palette）
- IMG-11 · 构图参考（composition reference）
- IMG-12 · 光位参考（lighting reference）
- IMG-13 · 俯视平面布局图（floor plan，锁空间关系）
- IMG-14 · 转场中间帧（interpolation keyframe）
- IMG-15 · 参考图选择策略与进入 H3 的写法
- IMG-16 · 人物一致性锁定的写法（逐项点名）
- IMG-17 · 手部与道具的自然姿态
- IMG-18 · 避免文字生成的写法
- IMG-19 · 画幅比例与裁切安全区
- IMG-20 · H3 参考图的标签与三种对齐指令句
- IMG-21 · H3 全参考模式 Ref2VA 的四类参考标签
- IMG-22 · 画面可见文字的官方写法（对照 IMG-18）

### `lighting.md`

- LIT-01 · 正午硬光
- LIT-02 · 黄金时刻低角度暖光
- LIT-03 · 蓝调时刻
- LIT-04 · 阴天漫射柔光
- LIT-05 · 侧向窗光
- LIT-06 · 霓虹招牌光
- LIT-07 · 实用光源入画
- LIT-08 · 柔光箱影棚光
- LIT-09 · 烛火与火焰
- LIT-10 · 屏幕光
- LIT-11 · 车灯扫过
- LIT-12 · 逆光与轮廓
- LIT-13 · 侧逆光
- LIT-14 · 顶光与底光
- LIT-15 · 伦勃朗光
- LIT-16 · 影棚三点布光
- LIT-17 · 体积光与丁达尔
- LIT-18 · 湿地面与雨夜反射
- LIT-19 · 水面与玻璃反射
- LIT-20 · 有动机的光

### `mood-emotion.md`

- MOOD-01 · 温暖治愈（warm & healing）
- MOOD-02 · 孤独冷清（lonely & cold）
- MOOD-03 · 紧张压迫（tense & oppressive）
- MOOD-04 · 悬疑不安（suspenseful & uneasy）
- MOOD-05 · 浪漫心动（romantic & fluttering）
- MOOD-06 · 庄重仪式（ceremonial & solemn ritual）
- MOOD-07 · 荒诞幽默（absurd & absurd comedy）
- MOOD-08 · 史诗宏大（epic & grand）
- MOOD-09 · 破败衰败（decayed & dilapidated）
- MOOD-10 · 禅意空灵（zen & ethereal）
- MOOD-11 · 怀旧（nostalgic）
- MOOD-12 · 危险警示（danger warning）
- MOOD-13 · 庄严肃穆（solemn & dignified）
- MOOD-14 · 梦幻朦胧（dreamy & hazy）
- MOOD-15 · 慵懒惬意（lazy & cozy）
- MOOD-16 · 离别感（farewell & separation）
- MOOD-17 · 克制的紧张（restrained tension）
- MOOD-18 · 阴郁低落（gloomy & melancholic）
- MOOD-19 · 童真奇趣（whimsical & playful）
- MOOD-20 · 氛围总原则（可见化原则）
- MOOD-21 · 哀痛（grief / sorrow）

### `negative-constraints.md`

- NEG-01 · 不出现多余人物（no extra people）
- NEG-02 · 不生成字幕、水印、文字条与额外标识
- NEG-03 · 保持脸部一致（face consistency）
- NEG-04 · 保持服装与配饰一致（costume consistency）
- NEG-05 · 保持产品几何与 logo
- NEG-06 · 保持建筑结构与地平线水平
- NEG-07 · 手部解剖正确（五指）
- NEG-08 · 不出现多余肢体
- NEG-09 · 面部与身体不扭曲（no deformation）
- NEG-10 · 不闪烁、抖动、撕裂与跳帧
- NEG-11 · 镜头不自行运动（no camera drift）
- NEG-12 · 不自行切镜（no cuts）
- NEG-13 · 风格不漂移（style consistency）
- NEG-14 · 速度不突变（no speed jump）
- NEG-15 · 不穿模（no clipping / interpenetration）
- NEG-16 · 文字不乱码、不镜像（no garbled text）
- NEG-17 · 皮肤自然、不塑料感、不过度锐化
- NEG-18 · 不出现重复或凭空出现的物体
- NEG-19 · 人物不看镜头（no eye contact）
- NEG-20 · 镜头与画面不变形（no lens distortion）
- NEG-21 · 稳定性锚点（逐项点名保持）
- NEG-22 · 锁定句式（逐镜复述模板）

### `pacing-duration.md`

- PAC-01 · 4~6 秒单镜（4-6s single shot）
- PAC-02 · 8~10 秒双镜（8-10s two shots）
- PAC-03 · 12~15 秒三镜（12-15s three shots）
- PAC-04 · 20~30 秒四拍结构（20-30s four-act structure）
- PAC-05 · H3 分镜时间戳语法与官方切镜短语（H3 shot syntax）
- PAC-06 · Seedance 2.5 运动优先公式（motion-first formula）
- PAC-07 · 动作密度分级（action density）
- PAC-08 · 低预算节拍铺排（low budget）
- PAC-09 · 中预算节拍铺排（medium budget）
- PAC-10 · 高预算节拍铺排（high budget）
- PAC-11 · 慢动作节拍（slow-motion pacing）
- PAC-12 · 段落式时间切分（beat timing）
- PAC-13 · 加速与减速节奏（acceleration / deceleration）
- PAC-14 · 静默留白（pause / breath）
- PAC-15 · H3 时长与格式上限（H3 limits）
- PAC-16 · Seedance 2.5 时长与字数上限（Seedance limits）
- PAC-17 · 切镜点的选择（cut motivation）
- PAC-18 · 收尾定格（closing hold）
- PAC-19 · 官方运镜表达：类型 + 幅度 + 速度
- PAC-20 · H3 超 15 秒的拆条与拼接

### `reference-modes.md`

- REF-01 · 单图参考 · 形象参考
- REF-02 · 单图参考 · 场景参考
- REF-03 · 单图参考 · 产品参考
- REF-04 · 单图参考 · 风格参考
- REF-05 · 单图参考 · 运动参考
- REF-06 · 多参考图 · 素材映射行
- REF-07 · 多人多图 · 一一对应
- REF-08 · 部分参考 · 写明参考哪一部分
- REF-09 · 参考视频 · 严格对齐动作与运镜
- REF-10 · 参考视频 · 分段取用（动作与运镜分家）
- REF-11 · 参考音频 · 音色绑定
- REF-12 · 参考音频 · BGM 参考
- REF-13 · 首帧 · 两种做法
- REF-14 · 尾帧 · 两种做法
- REF-15 · 首尾帧同时用 · 中间连续过渡
- REF-16 · 关键帧参考
- REF-17 · 多宫格分镜 / 故事板参考
- REF-18 · 线稿 / 火柴人分镜三步法
- REF-19 · 白模 · 粗粒度（只继承运动与调度）
- REF-20 · 白模 · 细粒度（保结构换外观）
- REF-21 · 白模 + 参考图的对应关系
- REF-22 · 视频指令编辑（台词 / 动作 / 人物替换）
- REF-23 · 视频延长（向前 / 向后）
- REF-24 · H3 I2VA · 官方固定对齐句
- REF-25 · H3 FL2VA · 官方固定对齐句
- REF-26 · H3 L2VA · 官方固定对齐句
- REF-27 · H3 Ref2VA · 六段结构与四类标签的素材层用法
- REF-28 · 参考标签对照 · H3 与 Seedance

### `scene-environment.md`

- ENV-01 · 城市街道（日间）
- ENV-02 · 室内居所
- ENV-03 · 办公与商业空间
- ENV-04 · 自然外景·山野
- ENV-05 · 水下与水域
- ENV-06 · 雨雪天气
- ENV-07 · 时间与时段
- ENV-08 · 光线方向与主光
- ENV-09 · 天气与天空
- ENV-10 · 城市夜景
- ENV-11 · 体积光与氛围介质
- ENV-12 · 微型场景与微缩感
- ENV-13 · 太空与科幻场景
- ENV-14 · 生态与自然保护地
- ENV-15 · 场景随时间变化（天气/光变化）
- ENV-16 · 场景中的天气作用与互动
- ENV-17 · 场景转换（新空间）
- ENV-18 · 环境音与画面配对

### `seedance-syntax.md`

- SD-01 · 音乐符号 `()`
- SD-02 · 音效符号 `<>`
- SD-03 · 对白符号 `{}`
- SD-04 · 字幕符号 `【】`
- SD-05 · 无对白任务的四件套声明
- SD-06 · 素材编号与指代
- SD-07 · 一素材一职责与多图同主体
- SD-08 · 文本绑定与指代优先
- SD-09 · 基础四行结构（文本生视频）
- SD-10 · 参考生视频五小节
- SD-11 · 时间戳：区间、时间点、相对时间
- SD-12 · 时间戳的官方约束
- SD-13 · 负向控制：字幕
- SD-14 · 负向控制：音效
- SD-15 · 负向控制：BGM（穷举同义词 + 首尾各一遍）
- SD-16 · 负向控制：对白与台词情绪格式
- SD-17 · 锁定 vs 不锁定
- SD-18 · 首尾帧：role = first_frame / last_frame
- SD-19 · 首尾帧：role = reference_image + 提示词指定
- SD-20 · 视频编辑
- SD-21 · 视频延长
- SD-22 · 动作与表情的写法
- SD-23 · 运镜与转场的写法
- SD-24 · 白模参考与渲染
- SD-25 · 多宫格分镜与线稿分镜
- SD-26 · 关键帧参考
- SD-27 · 参考素材数量上限与多视图

### `shot-sequencing.md`

- SEQ-01 · 建立镜（establishing）
- SEQ-02 · 反应镜（reaction）
- SEQ-03 · 插入镜（insert / cutaway）
- SEQ-04 · 空镜（empty shot / atmosphere）
- SEQ-05 · 揭示镜（reveal）
- SEQ-06 · 强调镜（emphasis）
- SEQ-07 · 过渡镜（transition）
- SEQ-08 · 覆盖镜 / 主镜（master）
- SEQ-09 · 通用拆解模板：事件 → 镜头组
- SEQ-10 · 示例：她哭了（6 镜）
- SEQ-11 · 示例：他推开门走进来（5 镜）
- SEQ-12 · 示例：两个人吵架（6 镜）
- SEQ-13 · 示例：产品出现在桌上（5 镜）
- SEQ-14 · 示例：孩子第一次看见雪（5 镜）
- SEQ-15 · 景别递进：远 → 近
- SEQ-16 · 景别递进：宽 → 窄（空间被吃掉）
- SEQ-17 · 景别递进：近 → 远（抽离）
- SEQ-18 · 景别递进：反向递进（近→远→近）
- SEQ-19 · 景别递进：跳切景别（跨级）
- SEQ-20 · 景别递进：保持同一景别（对比用）
- SEQ-21 · 三级跳（大全景 → 中景 → 特写）
- SEQ-22 · 覆盖组合法（主镜 + 反打 + 插入 + 反应 + 空镜）
- SEQ-23 · 什么时候必须补覆盖镜
- SEQ-24 · 每镜一个新信息
- SEQ-25 · 镜头组长度与节奏曲线
- SEQ-26 · 调度模式：桌面对立（table opposition）
- SEQ-27 · 调度模式：逼近（approach）
- SEQ-28 · 调度模式：后退（retreat）
- SEQ-29 · 调度模式：并行行走（parallel walk）
- SEQ-30 · 调度模式：环绕（orbit）
- SEQ-31 · 调度模式：楔形（wedge）
- SEQ-32 · 权力几何三件套（距离即对白 · 机位高低即权力 · 正反打站位）

### `shot-techniques.md`

- TEC-01 · 一镜到底（single continuous take）
- TEC-02 · 希区柯克变焦（dolly zoom）
- TEC-03 · 航拍视角（aerial / drone）
- TEC-04 · FPV 第一人称视角（FPV）
- TEC-05 · 子弹时间（bullet time）
- TEC-06 · 手持镜头（handheld）
- TEC-07 · 回弹变速（speed ramp with rebound）
- TEC-08 · 移焦 / 变焦点（rack focus）｜官方"名词 + 描述"范式
- TEC-09 · 子弹时间（名词 + 描述性解释）
- TEC-10 · 回弹变速（名词 + 描述性解释）
- TEC-11 · 跳切（jump cut）
- TEC-12 · 甩镜（whip pan）｜名词 + 描述
- TEC-13 · 希区柯克变焦（名词 + 描述性解释）
- TEC-14 · 变速三件套（升格慢放 / 抽帧快放 / 缓推急停）
- TEC-15 · 微距 / 超微距与浅景深虚化
- TEC-16 · 移轴微缩与反射 / 折射构图
- TEC-17 · 焦段三件套（长焦压缩 / 广角畸变 / 鱼眼）
- TEC-18 · 机位与画框角度（地面贴地 / 荷兰角 / 顶拍俯视）
- TEC-19 · 过肩视角与主观 POV
- TEC-20 · 稳定器长镜头（斯坦尼康）与手持变焦
- TEC-21 · 监控录像质感（动物园笼式构图 / 时间码叠加 / 偷拍感）
- TEC-22 · 穿越镜头与前景遮挡擦除
- TEC-23 · 匹配剪辑、动作接与视线接
- TEC-24 · 声音桥接
- TEC-25 · 官方转场示例：横移擦除 + 自然叠化
- TEC-26 · 白闪、黑场与相似形状转场
- TEC-27 · 产品广告与口播
- TEC-28 · 剧情短片与纪录 / 伪纪录
- TEC-29 · 访谈、纪录片式访谈与美食
- TEC-30 · 旅行 vlog、时装秀、健身与赛事
- TEC-31 · 宠物与音乐 MV（含歌词同步）
- TEC-32 · 动画分镜、灾难现场、新闻报道与黑白默片
- TEC-33 · 对称构图、三分法与黄金分割
- TEC-34 · 负空间、框中框与引导线
- TEC-35 · 前景遮挡、纵深层次与顶视平面布局

### `story-structure.md`

- STO-01 · 30 秒四拍结构总纲
- STO-02 · H3 ≤15 秒三拍裁切版
- STO-03 · Seedance 2.5 ≤30 秒四拍落位
- STO-04 · 前 3 秒钩子：悬念型
- STO-05 · 前 3 秒钩子：反常识型
- STO-06 · 前 3 秒钩子：强视觉型
- STO-07 · 前 3 秒钩子：提问型
- STO-08 · 故事骨架：起承转合
- STO-09 · 三幕式结构
- STO-10 · AI 短剧单集结构
- STO-11 · 连载结构：开场冲突—升级—反转—悬念留钩
- STO-12 · 旁白叙事线
- STO-13 · 口播脚本结构：钩子—痛点—方案—行动号召
- STO-14 · 产品广告结构：痛点—特写—场景—对比—落板
- STO-15 · 情绪曲线排布
- STO-16 · 镜头节奏与故事节拍对齐
- STO-17 · 字幕与花字节奏点
- STO-18 · 场景转场方式
- STO-19 · 角色出场与退场
- STO-20 · 分镜表工作稿字段说明
- STO-21 · 关键帧清单（先出图再出片）
- STO-22 · 多镜叙事时 H3 与 Seedance 2.5 的分工
- STO-23 · 官方六列标准镜头信息表
- STO-24 · 镜头表自检门六项必检

### `style-texture.md`

- STY-01 · 电影感
- STY-02 · 纪实抓拍
- STY-03 · 纪录片手持
- STY-04 · 35mm 胶片
- STY-05 · 16mm 家用 DV
- STY-06 · IMAX 大画幅
- STY-07 · 赛博朋克
- STY-08 · 故障风
- STY-09 · 蒸汽波
- STY-10 · 极简工业
- STY-11 · 日系动画
- STY-12 · 欧美动画
- STY-13 · 3D 皮克斯风
- STY-14 · 水墨国风
- STY-15 · 油画
- STY-16 · 水彩
- STY-17 · 赛璐璐动画
- STY-18 · 像素与 8-bit 复古游戏
- STY-19 · 黑白银盐
- STY-20 · 高对比时尚大片
- STY-21 · 社媒竖屏短视频
- STY-22 · 3D 产品渲染
- STY-23 · 黏土定格
- STY-24 · 羊毛毡手作
- STY-25 · 胶片特效四件套
- STY-26 · 真实皮肤与去塑料感

### `subject-consistency.md`

- SUB-01 · 人物身份锚点（多镜通用）
- SUB-02 · 服装与配饰锁定
- SUB-03 · 多人物区分
- SUB-04 · 产品几何与材质锁定
- SUB-05 · 首尾帧衔接
- SUB-06 · 单图首帧延展
- SUB-07 · 外观随时间不变的连续动作
- SUB-08 · 表情与神态连贯
- SUB-09 · 群像一致性
- SUB-10 · 动物与宠物一致性
- SUB-11 · 虚拟角色与玩偶一致性
- SUB-12 · 主体替换与变体（同一模板）
- SUB-13 · 尺度与比例锁定
- SUB-14 · 文本与标识在画面中的稳定
- SUB-15 · 镜头切换时的一致性锚定
- SUB-16 · 服装换装节点的一致性
- SUB-17 · 风格化/动画角色的一致性
- SUB-18 · 参考素材分工写法

### `vfx-design.md`

- VFX-01 · 镜头光晕与彩虹炫光边缘
- VFX-02 · 体积光柱、树影光斑与光束中的灰尘
- VFX-03 · 逆光轮廓光与缝隙漏光
- VFX-04 · 霓虹闪烁与探照灯扫过
- VFX-05 · 屏幕蓝光扫脸
- VFX-06 · 烛火摇曳与火焰光
- VFX-07 · 飘雪与地面积雪
- VFX-08 · 雨丝与镜头前雨滴
- VFX-09 · 低空雾与炊烟（严格区分）
- VFX-10 · 萤火虫与夜间浮游微光
- VFX-11 · 大雨打湿地面与积水倒影
- VFX-12 · 中雨与细雨的雨量分级
- VFX-13 · 雷暴闪电与离屏爆闪
- VFX-14 · 沙尘暴与台风狂风
- VFX-15 · 火苗舔舐与烛泪下淌
- VFX-16 · 余烬、火星四溅与爆燃浓烟柱
- VFX-17 · 物体坠落与碎裂
- VFX-18 · 液体飞溅与水珠挂镜
- VFX-19 · 玻璃碎裂
- VFX-20 · 布料飘动与头发被风吹起
- VFX-21 · 纸张翻飞、纸屑与落叶划过镜头
- VFX-22 · 屏幕亮起与界面反光
- VFX-23 · 监控叠印与字幕条
- VFX-24 · 超现实反射与镜中异界
- VFX-25 · 双重曝光与鬼影重影
- VFX-26 · 复古胶片质感
- VFX-27 · 风格化渲染
- VFX-28 · 特效出现时机、给足画面时间与音乐同步
- VFX-29 · 遮蔽合成接特效
- VFX-30 · 通用特效负向约束包

### `model-syntax.md`（参考文档，非片段库）

- 两模型语法速查（H3 / Seedance 2.5）
- 一、MiniMax H3 输出骨架
- 1.0 官方 Output Rules（先读这四条）
- 1.1 三个字段的确切名字与职责
- 1.2 H3 完整提示词模板
- 1.3 五种任务模式
- 1.4 硬性参数
- 1.5 镜头切换规则
- 1.6 运镜：官方词表（类型 + 幅度 + 速度）
- 1.7 对话语法
- 1.8 画面文字（on-screen text）
- 1.9 H3 全参考模式 Ref2VA（六段结构 + 四类标签）
- 1.10 对白与配乐分离规则
- 二、Seedance 2.5 输出骨架
- 2.1 官方提示词结构（**权威，优先于本库任何自加结构**）
- 2.2 库自加「七段式」组织辅助（⚠️ **非官方结构**）
- 2.3 符号规范（官方 Skill 明确给出）
- 2.4 参考素材指令语法（**Seedance 2.5 专用，不是 H3**）
- 2.5 时间戳（官方，与 2.0 的差异）
- 2.6 负向控制（官方，四类分开）
- 2.7 锁定 vs 不锁定，以及首尾帧的两种做法
- 2.8 硬性参数
- 三、两模型差异对照表
- 四、常见错误速查

## 装配优先级（翻译 Agent 用）

1. `model-syntax.md` —— 先确定用哪个模型的骨架
2. `story-structure.md` —— 再决定单镜还是多镜结构
3. `subject-consistency` / `scene-environment` —— 主体与场景
4. `action-beats` / `pacing-duration` —— 动作节拍与节奏
5. `camera-movement` —— 一镜只给一个主运镜
6. `lighting` / `style-texture` / `color-tone` / `mood-emotion` —— 视觉与情绪
7. `audio-dialogue-music` —— 音画绑定
8. `negative-constraints` —— 收尾补约束
9. `image-model` —— 需要图生视频时再出关键帧
