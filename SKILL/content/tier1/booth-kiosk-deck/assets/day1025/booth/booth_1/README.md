# booth_1 · XX客车（客户已脱敏）「全域获客模型」展位短版（能力 01–02）

> 客户名已按要求脱敏：全部画面与口播中「申沃」均替换为「XX客车」。\n\n一个**完全自动播放、循环运行**的展位演示：中文口播（Edge TTS）+ 逐句字幕 + 与口播对齐的画面动作。
演示画面本身**不可操控**（点击 / 键盘全部无效，鼠标正常显示），唯一可操作的是右下角**音频控件**
（声音开关 + 音量条）。

## 声音怎么来

- **直接双击 `slides.html`**：浏览器默认拦截无手势出声 → 演示转静音循环（字幕动作照常），
  右下角控件亮橙框提示「点这里开声音」；**在页面任意处点一下**，即从当前页恢复口播。
- **`start_booth.cmd`**：Edge kiosk 全屏 + 允许无手势出声，开机即带声循环（退出 Alt+F4）。展位机推荐这条。

内容口径来自 `assets/customer_analysis/`（客户调研）：

- 能力 01 · CQ 行业问题库：3 类客群 × 12 个真实提问，逐条对到资料卡 S01–S11 与审核 REV01–05，
  证据三档 = **8 有可用事实 / 3 边界待确认（G2/G5/G6）/ 1 无依据（CQ04，REV05 已判待补依据）**
- 能力 02 · 找客户模型定制：产品词族 = 官网 2026-10-25 实测的 13 个在售型号（不让模型自编），
  缺口照实标（G1 车型智能化能力清单缺，⚠️ 待 Day1 现场确认）
- 企业数、命中量、匹配分布为**演示用模拟数据**；页面右上与页脚均有标注

## 文件

| 文件 | 是什么 |
|---|---|
| `slides.html` | **交互版演示**（自动循环）。直接双击可播；无声时自动转墙钟静音循环，字幕动作照常 |
| `start_booth.cmd` | 展位机一键启动：Edge kiosk 全屏 + 允许无手势出声（退出按 Alt+F4） |
| `renders/booth_1_sunwin_short.mp4` | HyperFrames 渲染的**视频版**（1m44s · 1080p · 带口播），给大屏循环播或备份 |
| `build.py` | 构建脚本：Edge TTS 逐段合成 → 词级时间戳 → 字幕/动作提示点 → 生成 `video/index.html` |
| `video.src.html` | 视频合成源模板（时间用 `{{占位符}}`，build.py 填入实测值后写 `video/index.html`） |
| `video/` | HyperFrames 工程（index.html 为生成物，别手改；assets/ 含口播 mp3 与本地 gsap） |
| `tts/` | 口播 mp3、词边界 `words.json`、字幕与提示点 `timings.json` / `timings.js` |

## 改口播词 / 改画面后怎么重新出片

```powershell
# 1) 改 build.py 里 SLIDES 的 text/cues（cues=动作提示点，值是正文里的关键词）
# 2) 重新合成口播与时间戳，并重生成视频工程
python assets/day1025/booth/booth_1/build.py
#    只改了画面没改词时，可加 --skip-tts 复用已有 mp3
# 3) 出视频（自带 check + ffprobe 时长核对两道闸）
powershell -ExecutionPolicy Bypass -File tools\video\hyperframes\render.ps1 `
    -ProjectDir assets\day1025\booth\booth_1\video `
    -Output assets\day1025\booth\booth_1\renders\booth_1_sunwin_short.mp4
```

同步改画面时，`slides.html` 与 `video.src.html` 是**两份同源手工副本**（deck 用 DOM 交互实现，视频用
GSAP 时间轴实现），改哪边记得把另一边对齐。

## 已验证（2026-10-25）

- `hyperframes check`：error=0（lint/layout/runtime/contrast 全过，仅剩结构类 warning）
- 渲染成品 ffprobe：104.5s == composition 声明 104.496s，1920×1080，3135 帧，音轨峰值 −2.1 dB
- deck 自动循环：有声 / 静音两条路径各跑满一轮回到第 1 页，字幕与动作全部按点触发，
  演示区点击/按键不产生任何状态变化（行不选中、页码不跳），无 console 错误
- 音频控件：被拦状态 → 页面任意处点击恢复口播；音量条 / 静音开关即时生效；鼠标光标正常显示
