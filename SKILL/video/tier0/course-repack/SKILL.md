---
name: course-repack
description: 把一整门多集网课（B 站或 Coursera 搬运课，几十到上百节）重做成可交付的中文课程包：分集演讲版 PPTX、口播成片、内嵌字幕与 SRT，并配机器验收闸。Use when 用户给出一个合集链接或本地课程目录，并要求「做成课件」「拆成几集」「配音成片」「整门课重新讲一遍」「网课转 PPT + 视频」。不适用于单支视频重做（用 bili-video-repack）、只下载音视频、已有成片只做剪辑转码。
version: "2026.11.14"
license: MIT
metadata:
  category: video
  outputs: pptx, mp4, srt, content.json
---

# Course Repack

整门课进来，一套可讲的课出去。它和「把一支视频做成三件套」的区别是**跨集结构**：
先决定整门课切成几集、每集回答什么问题，再逐集落成页面、配音、出片。单集内部的技巧
不是这个 skill 的重点，重点是**54 节原课如何变成 6 集能连着讲的课**，以及**每一页的
字号为什么在 PPT 和视频里一样**。

## 先算三个数字，再动手

开工前把这三个数报给用户。任何一个偏差超过 20%，先商量，不要偷偷加长或加速。

| 项 | 怎么定 | 本次实测 |
|---|---|---|
| 集数 | 原课总时长 ÷ 每集目标时长。讲清楚一个主张需要 2.5–3.5 分钟，低于 2 分钟装不下论证，高于 4 分钟观众开始拖进度条 | 418 分钟原课 → 6 集，成片 17 分 35 秒 |
| 口播字数 | 目标秒数 × 5.0 字/秒（中文女声 speed 1.0 实测 5.08 字/秒） | 3909 汉字 → 约 13 分钟纯语音，其余是留白 |
| 出片成本 | 帧数 × 0.14 秒。1920×1080 设计稿、Playwright 单帧截图，无全屏视频纹理 | 6 集 × 24 fps 约 2.5 万帧，全量重渲约 1 小时 |

留白不是浪费。旁白之间必须留 0.3–0.6 秒，否则字幕换行和画面切换会挤在一起，
观众读不完也来不及看。

## 先确认能不能改

这套流水线处理的对象通常是**别人录的课**。开工前必须确认一件事：用户有没有权利做二次创作。
不是「能不能下载」，是「能不能再发布」。

- 用户自己录的课、公司内部培训、明确授权转写的公开课：可以直接做。
- 搬运的付费课程（Coursera、得到、知识付费平台的录屏）：可以做给个人学习用，
  **但不能公开分发、不能商用、不能去掉原作者的署名**。要发布，先拿到书面授权。
- 用户没提用途、也没提授权：按「不能公开」处理，并在交付时说明这一条。不要替用户默认「可以发」。

这条不是形式主义。整包产出是衍生作品，一旦公开传播，侵权责任落在发布者身上。
任何一个环节都要保留出处：`meta.source` 写原课名、平台、讲师；成片与 PPT 不要删掉来源页。

## 目录与单一事实源

```
<slug>/
  content/content.json     整门课的脚本：集 → 页 → 文案 + 备注 + 旁白
  design/layout.json       几何唯一事实源（设计像素 1920x1080）
  design/design.json       颜色与字体（视频渲染时注入 :root，PPTX 直接读）
  scripts/                 本 skill 的 scripts/ 整目录复制进来（含 common.py）
  src/                     原片（只读，不要再压一遍）
  work/                    转写、配音、帧、QA 截图（成片闸要读 work/epN/timing.json，验收完再清）
  out/                     交付物
```

`layout.json` 同时被视频渲染器和 PPTX 生成器读取，字号写回 `content.json` 的 `sizes`。
**同一段文字在两侧必须是同一个像素值**，否则「PPT 看起来对，视频里溢出」会反复出现。
先读 `references/deck-geometry.md` 再改任何坐标。

## 流水线

八步，每步都有可判定的产出。详细命令与失败处理见 `references/pipeline.md`。

1. **侦察**：确认原课节数、总时长、是否有现成字幕。没有字幕就走 STT，别手打。
2. **拆集**：先写每集的一句话主张，再分页。一页一个主张，一页一个数字。
3. **写脚本**：每页五个字段：`head`、`support`、`note`（讲者备注）、`narration`（口播）、`hero`（可选大数字）。
4. **量几何**：用真实字体测量，收缩到框内，把结果写回 `sizes`。
5. **配音**：`make_narration.py` 切句 → `tts_episode.py` 逐句合成并写 `timing.json` 与 `subtitles.srt`。
6. **出片**：Playwright 逐帧截图 → ffmpeg 编码 → 混音 → 内嵌字幕。
7. **出 PPTX**：同一份 `sizes` 生成宽屏 deck，每页写讲者备注。
8. **过闸**：内容闸在写完脚本后立刻跑（0.2 秒，错了后面全白跑）；字幕、可见性、PPTX、成片在出片后跑。五类都以退出码为准。

```bash
# 0) 把模板复制到项目里：templates/scene/template.html -> scene/template.html
#    templates/design/layout.json 与 design.json -> design/
# 1) 内容、几何、字幕三闸（纯 Python + Pillow，无需浏览器）
python scripts/check_content.py content/content.json
python scripts/fit_text.py "一页只讲一个主张" --w 1318 --h 230 --base 120 --min 36
python scripts/check_subtitles.py out --glob "*.srt"
```

```bash
# 出片：先渲帧，再编码，最后混音（示例顺序，参数按 references/pipeline.md 调整）
python scripts/render_episode.py content/content.json 3 --slug course --fps 24 --width 1280 --height 720
ffmpeg -i work/ep3/silent.mp4 -i work/ep3/narration_norm.wav \
  -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart out/ep3.mp4
```

## 验收：退出码，不是感觉

五类闸，任何一类非零就是没做完。把 `templates/final_gates.py` 复制进 `tools/`，
它默认调用 `scripts/` 里的五个脚本，一条命令跑完全部。

| 闸 | 抓什么 | 通过判据 |
|---|---|---|
| 内容 | 缺旁白、缺备注、单句过长、集号不连续 | 0 条问题 |
| 字幕 | 一行 >18 汉字、>2 行、单条 <1.2 秒、重叠 | 0 条问题 |
| 可见性 | 文字溢出框、元素出画、淡入没走完、文字互相压 | 每页 0 溢出、0 重叠 |
| PPTX | COM 实测版面、备注与脚本一致、字体缺失 | 每页元素在框内，备注 100% 覆盖 |
| 成片 | 时长对不上、无音轨、响度/真峰值越界、黑帧、缺字幕流 | −14 LUFS ±1，TP ≤ −1 dB，无黑帧 |

**不要把「脚本跑通了」当成「交付合格」。** 闸只证明可测量的部分；画面好不好、
节奏对不对，仍要人看。这句话是本 skill 从一次真实交付里换来的：6 集全部过闸之后，
仍然在抽帧目视时发现字幕压到了画面底部文案上。

## 一页只回答一个问题

判断一页该不该存在，用一个问句：把 `head` 念给没看过原课的人听，他能不能立刻说出这页在主张什么？
不能，就说明它还是话题，不是判断。三个常见替换：

- 话题 → 判断：「什么是领导力」换成「领导力是让人愿意跟你走，不是你有权」。
- 清单 → 取舍：「人脉的三个好处」换成「人脉只解决一件事，让你的判断多一个来源」。
- 总结 → 动作：「本集回顾」换成「下次见面，先问对方一个他愿意回答的问题」。

一页出现第二个判断时，观众的注意力会分叉。不要用缩小字号、加两栏、加项目符号去收纳它，
拆成两页。多一页过渡，比一页两个焦点便宜。

## 集与集之间的接缝

每集结尾的 `takeaway` 必须是下一集的开场前提。六集写完之后，把六个 `takeaway` 连起来读：
连起来能独立成为一段摘要，接缝就是对的；如果每集都在重新自我介绍，说明这六集是拼的，不是拆的。

拆集时先画依赖：A 集的结论是 B 集的前提，就 A 前 B 后；两集互不依赖，就按观众的理解成本排，
先具体的后抽象的。这个顺序定下来之后再写页面，返工量会少一半。


## 什么时候停下来问

三种情况不要自己决定：原课超过 20 小时（集数会超过 10，先确认观众能连看几集）；用户要求逐字保留原片口播（那是字幕翻译，不是 repack）；交付要求竖屏（这套几何是 16:9，竖屏要重排坐标，不能等比缩放，压缩后字号会掉到地板以下）。


## 常见翻车（都发生过）

- **单遍 loudnorm 到不了 −14 LUFS**：短片实测只有 −15.4。补一级 `volume=1.28` 增益。
  但增益必须放在限幅**之前**、限幅必须放在最后，且 `alimiter` 要写 `level=disabled`
  ——它的默认自动电平会把峰值重新抬回 0 dB。实测旧顺序（限幅在前、增益在后）
  交付的 6 集成片真峰值全在 −0.6～0 dB，属于越界；改成
  `loudnorm → volume=1.28 → alimiter=limit=0.85:level=disabled` 后为 −1.4 dBTP。
- **字幕按整页切**：一页两句就变成一条长字幕。按句切，一句一条，再映射回页。
- **PPTX 字号靠猜**：照搬视频字号会超框。必须用 `fit_text.py` 实测，PPT 侧
  1 px = 0.5 pt、1 in = 144 px，两侧同源。
- **内容和字幕用两套断句规则**：内容闸按句号切，配音会再把短于 8 个字符的碎片并到下一句。
  两边不一致时，一个 38 字的句子能过内容闸，却在配音后被字幕闸判 3 行。两边现在共用
  `scripts/sentences.py`，改动断句只改这一处。
- **中文 Windows 控制台 GBK**：脚本里的 `✓`/emoji 会让 Python 崩在「已经写完配置之后」。
  跑之前设 `PYTHONIOENCODING=utf-8` 和 `PYTHONUTF8=1`。
- **一页塞三个要点**：观众在 3 秒内只能读一行。拆页比缩小字号便宜。

## 交付清单

- `out/<slug>-ep<N>.mp4`（内嵌字幕）与 `-clean.mp4`（无字幕，便于二次配字幕）
- `out/<slug>-ep<N>.srt`
- `out/deck.pptx`（交付时可改名），宽屏 13.333×7.5，每页带讲者备注
- `content/content.json`（可复算、可续跑的唯一事实源）
- 一份来源与授权说明：原课名、平台、讲师、用户的使用范围。没有这份说明的交付不算完成。

细节按需读：

- `references/pipeline.md` —— 八步的具体命令、参数、每步产物
- `references/deck-geometry.md` —— 设计像素/磅换算、八种页型、字号收缩规则
- `references/narration-and-subtitles.md` —— TTS 契约、断句、时间轴、SRT 规范
- `references/qa-gates.md` —— 每道闸的实现与误报处理
- `templates/design/layout.json` —— 可直接改的几何模板
- `templates/design/design.json` —— 颜色与字体（字号不在这里，见 `fit_text.py` 写回的 `sizes`）
- `templates/scene/template.html` —— 视频场景渲染器（把 content + timing 注入后逐帧渲染）
- `templates/content.schema.json` —— content.json 的结构约束
- `templates/final_gates.py` —— 五闸汇总脚本
- `templates/content.example.json` —— 可直接改的脚本样例（能过内容闸）
- `templates/requirements.txt` / `templates/package.json` —— Python 与 Node 依赖清单
