# Behavioural trigger sweep

`score_skills.py` scores the shape of a package. This run asked the harness for real choices: one generated user sentence per curated tier-A skill, then read back which skill the model actually invoked.

| verdict | n | share |
| --- | --- | --- |
| PASS | 28 | 39% |
| WRONG | 4 | 6% |
| ABSTAIN | 31 | 44% |
| TIMEOUT | 8 | 11% |
| ERROR | 0 | 0% |

## Every case

| verdict | skill | picked | prompt |
| --- | --- | --- | --- |
| PASS | `agent-eval-loop` | `agent-eval-loop` | 我写的技能老是胡编乱造，怎么给它写个测试，确认它靠谱了再放到云端批量跑 |
| PASS | `aigc-image-control` | `aigc-image-control` | 参考这张海报的感觉，用生图模型再做三张同一系列的新海报，主角长相别变 |
| PASS | `apk-ndk-version-check` | `apk-ndk-version-check` | 这个安卓安装包里的原生库是用哪个版本的编译工具链编出来的？符号表好像被剥掉了 |
| PASS | `arming-thought` | `arming-thought` | 新对话开始前先定个规矩：一切从实际情况出发，查证清楚再下结论，再判断该用哪套方法 |
| PASS | `blender-director` | `blender-director` | 我想在那个开源三维软件里做个能进游戏的机甲角色，从建模到导出帮我规划整条流程 |
| PASS | `blog-to-linkedin-post` | `blog-to-linkedin-post` | 把我这篇技术博客改写成几条适合在领英上发、体现专业观点的职场帖子 |
| PASS | `blog-to-twitter-post` | `blog-to-twitter-post` | 把这篇长博客拆成几条推特短帖，角度要犀利，最好能蹭上最近的热点 |
| PASS | `brand-docx` | `brand-docx` | 把公司这份Word模板的字体、配色和版式记下来，以后都照它出新的报告文档 |
| PASS | `brand-xlsx` | `brand-xlsx` | 财务那份带公司配色的表格模板，抽出它的样式规范，之后按它填出新的工作簿 |
| PASS | `colleague-ue-app-specialist` | `colleague-ue-app-specialist` | 虚幻5.3打包安卓后材质丢了，给我一套能复现、自己也能验证的排查步骤 |
| PASS | `colleague-ue-engine-architect` | `colleague-ue-engine-architect` | 虚幻项目里模块互相引用乱成一团，想重新分层，还得保证主机和手机帧率达标 |
| PASS | `colleague-ue-prod-team-lead` | `colleague-ue-prod-team-lead` | 虚幻项目的规划、架构和应用评估都交上来了，帮我统筹一下，给个有依据的评审结论 |
| PASS | `colleague-ue-tech-planner` | `colleague-ue-tech-planner` | 老板要三个月内用虚幻做出可玩演示版，帮我排个带里程碑和预留余量的排期 |
| PASS | `deliberate-practice` | `deliberate-practice` | 打游戏一直卡在同一个段位，想有方法地练，帮我排一份每天该练什么的安排 |
| PASS | `diagnosing-bugs` | `diagnosing-bugs` | 接口上线后突然慢了三倍，偶尔还会报空指针，帮我一步步查出根因 |
| PASS | `family-edu-gamified-skills` | `family-edu-gamified-skills` | 孩子上三年级总拖作业，帮我设计个打怪升级式的每日学习和奖励方案 |
| PASS | `feishu-kdocs-cli` | `feishu-kdocs-cli` | 金山文档命令行一直报 400001，飞书那边也提示缺权限，帮我重新登录配好 |
| PASS | `hands-on-deck` | `hands-on-deck` | 我这份季度汇报的演示文件第五页图表换一下，再把最后两页顺序调过来 |
| PASS | `manage-up-core` | `manage-up-core` | 模型帮我写的给领导的季度述职材料全是空话套话，帮我改成开门见山、拿数字说话的版本 |
| PASS | `motion-showreel` | `motion-showreel` | 用代码给我做一段八分钟左右的动态文字讲解片，配背景音乐，旁白用我写好的稿子合成语音 |
| PASS | `multi-agent-repo-governance` | `multi-agent-repo-governance` | 好几个AI助手同时往我们的代码仓库提交改动，总是合并打架，想给仓库加几道自动拦截的检查关卡 |
| PASS | `one-on-one-prep` | `one-on-one-prep` | 下周要和直属领导单独聊半小时，想顺便提一下晋升的事，帮我列个谈话要点 |
| PASS | `skill-trigger` | `skill-trigger` | 我写的能力说明放进去后助手根本不调用，开头那段描述该怎么写才会被选上 |
| PASS | `style-bytedance` | `style-bytedance` | 我在抖音母公司，周报得围绕目标和关键结果来对齐，帮我按他们那套改 |
| PASS | `style-google` | `style-google` | 我在搜索引擎巨头那边写年度自评，要按他们的绩效评级体系来讲成果 |
| PASS | `style-microsoft` | `style-microsoft` | 把我这份年度总结改成做视窗系统那家公司的绩效写法，分成以身作则、辅导他人、关怀团队三块 |
| PASS | `style-tencent` | `style-tencent` | 按鹅厂那套汇报习惯改写这份报告，开头先摆日活和留存这些产品指标 |
| PASS | `weekly-report` | `weekly-report` | 帮我把这周做的几件事整理成给老板的例行汇报，先说结果，再拿数字支撑 |
| WRONG | `onetake` | `motion-showreel` | 给我们刚上线的应用做一支十五秒的上新预告短片，拿真实界面当素材，要有运动模糊和音效 |
| WRONG | `opendeck` | `html-ppt` | 想要一套网页版演示稿，每点一下出一步内容还能自己念讲解，最后打包成离线也能放的文件 |
| WRONG | `systematic-debugging` | `diagnosing-bugs` | 单测突然挂了一个，先别急着改代码，帮我一步步排查出真正的根因 |
| WRONG | `xiaoma-studio` | `motion-showreel` | 想用代码做一支短视频平台爆款风格的产品发布动效片，配上音乐，导出成视频文件 |
| ABSTAIN | `agent-browser` | - | 帮我打开这个网站登录后台，把订单列表那一页的数据都抓下来 |
| ABSTAIN | `analysis-to-vault` | - | 这篇讲半导体行业走势的深度长文，帮我理清它的核心论点和证据，整理成学习笔记 |
| ABSTAIN | `bili-video-brief` | - | 这个B站视频到底讲了啥？每条要点都标上原片时间，方便我回去核对 |
| ABSTAIN | `bili-video-repack` | - | 把这个B站视频用中文重讲一遍，给我出幻灯片、能播放的口播网页和导出的成片 |
| ABSTAIN | `book-chapter-to-vault` | - | 我把一本管理书按章节分成了几个文档，帮我每章写个总结，再汇总成一张复习速查卡 |
| ABSTAIN | `brand-pptx` | - | 市场部有套标准幻灯片模板，帮我把它的风格存下来，再按这个样式做季度汇报 |
| ABSTAIN | `contradiction-analysis` | - | 性能、工期、需求变更全搅在一起，我完全不知道该先抓哪一头 |
| ABSTAIN | `cook` | - | 照这几张参考截图用网页3D把场景还原，我出门这一整天你就一直改到几乎看不出差别 |
| ABSTAIN | `course-repack` | - | 这个B站合集有八十多节英文课，帮我整套改成中文讲解课件和配音视频 |
| ABSTAIN | `criticism-self-criticism` | - | 这版方案交付后被客户挑了一堆毛病，帮我老实查查自己哪里做错了并改掉 |
| ABSTAIN | `deliberate-practice-talk` | - | 这个讲怎么靠刻意练习快速进步的视频链接发你了，帮我出个中文要点再配一版讲稿成片 |
| ABSTAIN | `docx` | - | 帮我把这份会议纪要排成带目录和页码的正式文档，存成 Word 格式发给领导 |
| ABSTAIN | `fable52-reproduction` | - | 这个公开网页小游戏的地形生成很有意思，根据它的源码和运行数据帮我做个能跑的最小复刻 |
| ABSTAIN | `film-repack` | - | 这部一个半小时的英文纪录片帮我出带时间码的文字稿、中文精简总结和配截图的课件 |
| ABSTAIN | `gracker-writing` | - | 把我这次排查内存泄漏的经历按我平时的风格写成一篇公众号技术长文 |
| ABSTAIN | `html-ppt` | - | 下周技术分享要用，帮我做一套能在浏览器里用键盘翻页、好看点的幻灯片 |
| ABSTAIN | `investigation-first` | - | 我对这个领域不熟，在决定要不要换供应商之前先帮我把现状和事实摸清楚 |
| ABSTAIN | `meeting-summary` | - | 这是今天需求评审会的录音转写稿，帮我理清会上拍板了哪些事、谁接了什么活、什么时候交 |
| ABSTAIN | `next-token-agent-loop` | - | 我的智能体明明该调工具去读文件，结果直接凭旧印象回答了，想排查到底是哪一步断掉的 |
| ABSTAIN | `pdf` | - | 这几份扫描的合同帮我合并成一个文件，加上内部资料水印，还要让里面的文字能被搜索 |
| ABSTAIN | `pptx` | - | 用公司这个母版模板从头新建一套产品介绍幻灯片，每一页都带上演讲者备注 |
| ABSTAIN | `presentation-skill` | - | 帮我把这篇临床研究结果做成组会汇报幻灯片，图表要对齐、字要看得清、每页别塞太满 |
| ABSTAIN | `process-friction-cut` | - | 改论文这事我已经躲了一周，一点开文档就胸口发紧，完全下不去手该怎么办 |
| ABSTAIN | `process-motivation-design` | - | 健身计划每次撑两周就断，全靠咬牙硬扛，到底是哪里设计错了 |
| ABSTAIN | `process-reward-boost` | - | 背单词我不怕开始，就是背十分钟就腻得要命，怎么让它变得有意思点 |
| ABSTAIN | `project-update` | - | 下周要跟老板讲新系统上线这个项目现在走到哪一步了、卡在哪、有什么风险 |
| ABSTAIN | `pstack-trust-ladder` | - | AI每次交活都说搞定了却拿不出证据，我到底该逐个检查还是抽查就够 |
| ABSTAIN | `stageshow` | - | 官网首页想放一段假的软件界面动画，有个鼠标在上面点来点去演示功能 |
| ABSTAIN | `style-alibaba` | - | 我在淘宝母公司上班，季度总结要把业绩和价值观两块分开写，帮我改一下 |
| ABSTAIN | `video-to-deck-reel` | - | 这支中文讲解视频的B站链接给你，一条命令帮我同时跑出课件和画布渲染的口播成片 |
| ABSTAIN | `webapp-testing` | - | 本地起的前端页面点提交没反应，用自动化浏览器打开截个图，再看看控制台报了什么错 |
| TIMEOUT | `canvas-design` | - | 给我设计一张极简风格的音乐节海报，导出成图片就行 |
| TIMEOUT | `doubaofeishu_industry-analysis` | - | 想投储能赛道，先帮我摸清市场规模、竞争格局和产业链哪段最赚钱，出份深度研究 |
| TIMEOUT | `single-file-html-game` | - | 帮我做个手机浏览器能直接玩的小游戏，全部塞进一个网页文件，不要任何外部依赖 |
| TIMEOUT | `skill-doctor` | - | 翻一下上周的对话记录，找出助手为什么总在同一步出错，再小改一下它用的那份说明 |
| TIMEOUT | `style-amazon` | - | 把这份方案改成贝索斯那家公司的写法，用整段叙述代替要点列表 |
| TIMEOUT | `ue-renderdoc-auto-capture` | - | 虚幻编辑器里阴影显示不对，帮我自动抓一帧显卡画面，看看着色器到底收到了什么数据 |
| TIMEOUT | `visual-explainer` | - | 把这次代码改动画成一个单文件网页，让同事一眼看懂架构哪里变了 |
| TIMEOUT | `xlsx` | - | 下载文件夹里那个表格表头错位还夹着空行，帮我清理干净，再加一列汇总公式 |

## Competing descriptions (WRONG)

- `onetake` 被 `motion-showreel` 抢走：给我们刚上线的应用做一支十五秒的上新预告短片，拿真实界面当素材，要有运动模糊和音效
- `opendeck` 被 `html-ppt` 抢走：想要一套网页版演示稿，每点一下出一步内容还能自己念讲解，最后打包成离线也能放的文件
- `systematic-debugging` 被 `diagnosing-bugs` 抢走：单测突然挂了一个，先别急着改代码，帮我一步步排查出真正的根因
- `xiaoma-studio` 被 `motion-showreel` 抢走：想用代码做一支短视频平台爆款风格的产品发布动效片，配上音乐，导出成视频文件

## Never picked (ABSTAIN)

- `agent-browser`：帮我打开这个网站登录后台，把订单列表那一页的数据都抓下来
- `analysis-to-vault`：这篇讲半导体行业走势的深度长文，帮我理清它的核心论点和证据，整理成学习笔记
- `bili-video-brief`：这个B站视频到底讲了啥？每条要点都标上原片时间，方便我回去核对
- `bili-video-repack`：把这个B站视频用中文重讲一遍，给我出幻灯片、能播放的口播网页和导出的成片
- `book-chapter-to-vault`：我把一本管理书按章节分成了几个文档，帮我每章写个总结，再汇总成一张复习速查卡
- `brand-pptx`：市场部有套标准幻灯片模板，帮我把它的风格存下来，再按这个样式做季度汇报
- `contradiction-analysis`：性能、工期、需求变更全搅在一起，我完全不知道该先抓哪一头
- `cook`：照这几张参考截图用网页3D把场景还原，我出门这一整天你就一直改到几乎看不出差别
- `course-repack`：这个B站合集有八十多节英文课，帮我整套改成中文讲解课件和配音视频
- `criticism-self-criticism`：这版方案交付后被客户挑了一堆毛病，帮我老实查查自己哪里做错了并改掉
- `deliberate-practice-talk`：这个讲怎么靠刻意练习快速进步的视频链接发你了，帮我出个中文要点再配一版讲稿成片
- `docx`：帮我把这份会议纪要排成带目录和页码的正式文档，存成 Word 格式发给领导
- `fable52-reproduction`：这个公开网页小游戏的地形生成很有意思，根据它的源码和运行数据帮我做个能跑的最小复刻
- `film-repack`：这部一个半小时的英文纪录片帮我出带时间码的文字稿、中文精简总结和配截图的课件
- `gracker-writing`：把我这次排查内存泄漏的经历按我平时的风格写成一篇公众号技术长文
- `html-ppt`：下周技术分享要用，帮我做一套能在浏览器里用键盘翻页、好看点的幻灯片
- `investigation-first`：我对这个领域不熟，在决定要不要换供应商之前先帮我把现状和事实摸清楚
- `meeting-summary`：这是今天需求评审会的录音转写稿，帮我理清会上拍板了哪些事、谁接了什么活、什么时候交
- `next-token-agent-loop`：我的智能体明明该调工具去读文件，结果直接凭旧印象回答了，想排查到底是哪一步断掉的
- `pdf`：这几份扫描的合同帮我合并成一个文件，加上内部资料水印，还要让里面的文字能被搜索
- `pptx`：用公司这个母版模板从头新建一套产品介绍幻灯片，每一页都带上演讲者备注
- `presentation-skill`：帮我把这篇临床研究结果做成组会汇报幻灯片，图表要对齐、字要看得清、每页别塞太满
- `process-friction-cut`：改论文这事我已经躲了一周，一点开文档就胸口发紧，完全下不去手该怎么办
- `process-motivation-design`：健身计划每次撑两周就断，全靠咬牙硬扛，到底是哪里设计错了
- `process-reward-boost`：背单词我不怕开始，就是背十分钟就腻得要命，怎么让它变得有意思点
- `project-update`：下周要跟老板讲新系统上线这个项目现在走到哪一步了、卡在哪、有什么风险
- `pstack-trust-ladder`：AI每次交活都说搞定了却拿不出证据，我到底该逐个检查还是抽查就够
- `stageshow`：官网首页想放一段假的软件界面动画，有个鼠标在上面点来点去演示功能
- `style-alibaba`：我在淘宝母公司上班，季度总结要把业绩和价值观两块分开写，帮我改一下
- `video-to-deck-reel`：这支中文讲解视频的B站链接给你，一条命令帮我同时跑出课件和画布渲染的口播成片
- `webapp-testing`：本地起的前端页面点提交没反应，用自动化浏览器打开截个图，再看看控制台报了什么错

## 复跑（同一批非 PASS 用例再跑一次）

| skill | 第一次 | 第二次 | 第二次选中的 |
| --- | --- | --- | --- |
| `ue-renderdoc-auto-capture` | TIMEOUT | PASS | `ue-renderdoc-auto-capture` |
| `xlsx` | TIMEOUT | PASS | `xlsx` |
| `opendeck` | WRONG | WRONG | `html-ppt` |
| `systematic-debugging` | WRONG | ABSTAIN | - |
| `visual-explainer` | TIMEOUT | ABSTAIN | - |
| `canvas-design` | TIMEOUT | TIMEOUT | - |
| `doubaofeishu_industry-analysis` | TIMEOUT | TIMEOUT | - |
| `onetake` | WRONG | TIMEOUT | - |
| `single-file-html-game` | TIMEOUT | TIMEOUT | - |
| `skill-doctor` | TIMEOUT | TIMEOUT | - |
| `style-amazon` | TIMEOUT | TIMEOUT | - |
| `xiaoma-studio` | WRONG | TIMEOUT | - |

两轮之间改判 6 个：`ue-renderdoc-auto-capture`、`xlsx`、`systematic-debugging`、`visual-explainer`、`onetake`、`xiaoma-studio`。**只有复现的 WRONG 才值得动 description**，单轮结果不足以支撑一次改写。

## How to read this

- Prompts were generated from the same descriptions the model reads in its skill listing, so PASS here mostly says "the description is findable", not "a real user would land here".
- WRONG is the load-bearing signal: two neighbours claim the same request, and the description that loses is the one to sharpen.
- ABSTAIN is ambiguous by construction: either the skill never wins the request, or the generated sentence was too vague to be a request at all (many mention a document or link that was never attached, and the model asks for it instead of picking a skill).
- TIMEOUT means the call ran past the budget, not that it failed: two of the eight timeouts passed on a second run with a longer budget.

Reproduce: `python docs/skill-capacity-audit/trigger_sweep.py run --cases docs/skill-capacity-audit/trigger-cases.json --json trigger-results.json --md trigger-report.md`
