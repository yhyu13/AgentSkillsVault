# 讲解视频规范(字幕可开关 / 音量拉满 / 背景动起来)

三条硬指标,少一条就是交付缺陷。

## 1. 字幕:必须能开关,且默认开

只在画面上烧死字幕 = 没法关;**只给干净版** = 默认没字幕。两种都不合格。

正确做法(三件套一起给):

| 产物 | 内容 | 作用 |
|------|------|------|
| `xxx.mp4` | 视频 + **软字幕轨**(mov_text),`default` + `disposition:default=1` | 播放器里能一键关;默认开 |
| `xxx.srt` | 同一条字幕,UTF-8 | 任何播放器/剪辑软件能挂 |
| `xxx-clean.mp4` | 无字幕轨的同源成片 | 播放器不支持软轨时的兜底 |

合成命令(`out.srt` 先按旁白小句切好):

```bash
# 1. 先出无字幕成片
ffmpeg -y -i silent.mp4 -i voice.wav -c:v copy -c:a aac -b:a 192k -shortest clean.mp4

# 2. 挂软字幕轨,标记为默认
ffmpeg -y -i clean.mp4 -i out.srt -c copy -c:s mov_text \
  -metadata:s:s:0 language=chi -metadata:s:s:0 title="中文" \
  -disposition:s:0 default out.mp4
```

字幕本身:
- 每行 ≤ 16 个汉字(竖屏 ≤ 12),最多两行
- 单条显示 ≥ 1.2s;按句子切,不按字数切
- 位置在安全区内(底部 12% 以上),描边 2px,不用半透明大色块

网页内嵌时必须能关:

```html
<video id="v" src="x.mp4" controls playsinline></video>
<button id="cc" aria-pressed="true">字幕 开</button>
<script>
  v.querySelectorAll('track')[0].mode = 'showing';   // 默认开
  cc.onclick = () => {
    const t = v.querySelectorAll('track')[0];
    t.mode = t.mode === 'showing' ? 'hidden' : 'showing';
    cc.textContent = '字幕 ' + (t.mode === 'showing' ? '开' : '关');
    cc.setAttribute('aria-pressed', t.mode === 'showing');
  };
</script>
```

## 2. 音量:默认拉到平台上限

**"最大"不是"把增益拧爆",是"到平台标准响度、峰值不削顶"。**

```bash
ffmpeg -i in.mp4 -af "loudnorm=I=-14:TP=-1.0:LRA=11" -c:v copy out.mp4
```

- 目标 `I=-14 LUFS`(YouTube/抖音/B 站的实际回放电平),`TP=-1.0 dBTP`
- 交付前实测:`ffmpeg -i out.mp4 -af loudnorm=print_format=summary -f null -`
  读 **Input Integrated** 必须在 `-15 … -13 LUFS`
- 实测过 -23.4 LUFS 的成片:手机上要开满格才勉强听清 → 就是这条没做
- HTML 内嵌:`video.volume = 1.0`;自动播放必须 `muted`(浏览器策略),但**首次点击后立即 `muted=false`**

## 3. 背景:有背景就必须动

静态底图 = 视频变成 PPT。用 canvas 画背景,`t` 是纯函数:

```js
function bg(t){                       // t 秒，帧号/ fps
  for (const p of pts){
    const y = p.y + Math.sin(t*0.6 + p.ph) * 6;      // 慢浮
    const a = 0.06 + 0.04*Math.sin(t*0.9 + p.ph);    // 呼吸
    dot(p.x, y, p.r, a);
  }
}
```

硬约束:
- 背景只做**低频运动**(周期 ≥ 3s);文字不做位移,只做 0.4s 淡入
- 背景亮度对比 ≤ 8%,不许亮过正文
- 允许的"假动效":镜头极缓推镜(<=1.04× 全程)、噪点呼吸、扫描线
- 禁止:粒子爆炸、弹跳、闪烁、颜色循环

## 4. 渲染:优先 HTML 逐帧,其次框架

`Remotion` / `HyperFrames` 都能用,但它们要求把画面用它们的组件体系重写一遍。
本 skill 的默认路线是 **DIY:同一份 HTML → 逐帧截图 → ffmpeg 合流**,原因:

- 海报和视频共用一套设计变量,不会出现"网页和视频两个风格"
- 不依赖 npm 安装/授权,断网也能跑
- 校验简单:帧就是文件,能逐张看

**已经把这套做成两个可直接跑的脚本**(`references/scripts/`),不用重写:

```bash
# 1. 旁白 → 逐句时长 → 整轨 + timing.js + srt
python tts_timeline.py narration.txt --out work/

# 2. 场景 → 逐帧截图 → MP4（软字幕默认开 + 无字幕兜底 + 响度达标）
python webvideo.py scene.html --work work/ --out out.mp4
```

`tts_timeline.py` 按音频实测时间轴放置每一句(`adelay`,不是顺序拼接,gap 不会累积),
并同时产出 `timing.js`(`window.TIMING`)与 `subtitles.srt`。
`webvideo.py` 默认 1.5 倍截图(1920×1080)、24fps、CRF 18,内部做完两件事:
`acompressor → alimiter → loudnorm`(语音峰均比高,直接归一化会撞 0 dBTP),
以及挂 `mov_text` 软字幕轨。

`scene.html` 必须实现 `window.renderAt(t)`:同一 `t` 必须画出同一帧
(不许 `Math.random()`、不许 `Date.now()`、不许"自走"的 `setTimeout`)。
时间轴从 `timing.js` 或 `window.TIMING` 读,脚本会把它注入到页面脚本之前。

**成本参考(实测)**:1920×1080 / 1.5 倍截图 ≈ 0.27 s/帧(有全屏渐变时),1280×720 ≈ 0.09 s/帧。
48 秒的片子 = 1160 帧 ≈ 5 分钟。先用 8fps 跑通再出全帧。

## 5. 交付前机检

```bash
python references/scripts/check_explain.py out.mp4
```

查:字幕轨存在 + 默认开、响度范围、时长、逐帧差分(证明背景真的在动)。

补充人工项:
- [ ] 播放器里点一下字幕按钮,字幕真的消失/出现
- [ ] 手机音量 50% 能听清
- [ ] 每段中点抽帧,和分镜表对得上
- [ ] `moov` 在 `mdat` 前(`-movflags +faststart`),能拖进度条
