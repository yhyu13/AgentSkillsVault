# 画布：一个世界，一次清空，逐帧取值

## 页面契约

```html
<div id="stage"><canvas id="c" width="1920" height="1080"></canvas></div>
<script src="timeline.js"></script>
```

- `window.renderAt(t)`：幂等。每次从 `ctx.clearRect(0,0,W,H)` 开始，所有位置只由 `t` 决定。
  不读上一帧的状态，不依赖 `requestAnimationFrame` 的内部计时。
- `window.__ready = true`：在 `document.fonts.ready` 之后设置。字体没就绪时测出的换行与
  渲染结果不一致，预览与成片会差一行。
- 尺寸取自 `timeline.json` 的 `width` / `height`。`render_frames.mjs` 会核对画布实际尺寸
  与时间轴是否一致，不一致直接报错，不做缩放。

`timeline.js` 由 `build_timeline.py` 生成，内容等于 `timeline.json`：

```js
window.TIMELINE = {
  total: 223.06, fps: 30, width: 1920, height: 1080,
  leadIn: 1.4, gap: 0.55, tail: 2.6,
  segments: [{ id: "s01", chapter: "…", text: "…", start: 1.4, end: 16.98,
               visual: "plan", tags: ["…"], metric: { label: "…", value: "…", note: "…" } }]
};
```

`visual` / `tags` / `metric` 是可选的画面元数据。它们从 `narration.json` 一路传到
`timings.json` 再传到 `timeline.json`，页面只读，不再自己猜这一段该画什么。

## 取帧

```js
const data = await page.evaluate((t) => {
  window.renderAt(t);
  return document.querySelector("#stage canvas").toDataURL("image/png").split(",")[1];
}, t);
```

不要用 `page.screenshot()` 截画布。在本机上，普通截图会让整片变成同一张浅图，
合成出来只有几 MB、P 帧几乎全跳过。这是踩过的坑，不是理论风险。

`render_frames.mjs` 已经处理：playwright 从项目、全局 npm root 与 `$APPDATA/npm` 三处找；
逐帧归档不靠文件大小判断，而靠 `reel/frames/.render_manifest.json` 里的两个 sha1
（`timeline.json` 与 `index.html`）：哈希变了就清空重渲，没变就续跑；帧数少于时间轴期望值时非零退出。

`templates/canvas/index.html` 是这份骨架的可运行版本：复制成 `reel/index.html`，只改 `TITLE` /
`SUBTITLE` 与 `drawSegment()`。切段、进度条、淡入淡出、token-aware 换行已经写在里面。

```bash
node scripts/render_frames.mjs <project>                  # 全片
node scripts/render_frames.mjs <project> --from 0 --to 300
node scripts/render_frames.mjs <project> --stills 6,105,212 --out reel/stills
```

先出静帧看画面，再渲全片。渲 30 秒没出第一帧，先看 `__ready` 有没有置。

## 构图

- 一个持续的世界比十张卡片耐看：本片全程是同一张俯视平面图，镜头沿走廊推进、在门口交接、
  进入房间。换章只换强调层（人物亮起来、视锥亮起来、参考图卡片飞入），不换场景。
- 每段至少一种随时间变化的东西。位移、透明度、依次出现、视锥扫过，任选其一。
- 信息层级三档起步：大标题、正文、注释。全片同一字号会读成幻灯片。
- 底部字幕压一条从透明到背景色的渐变遮罩，字幕最多三行；字幕与图形抢位置时，让图形退。
- 别用紫蓝渐变加发光当默认底色。深色底要有明度差，不然投到大屏上是一片灰。

## 三层运动，缺一层就发死

一张俯视平面图很容易变成“会动的幻灯片”。本片第一版就是这样：`check_frames.py` 报
`median 0.44% changed`——两秒内只有 0.44% 的像素在变，肉眼几乎看不出在动。补了三层之后到 2.4%。

1. **镜头推进**：整张图按 `1 ± 0.018` 的极慢正弦缩放，周期 40–50 秒。
   边缘移动几像素，读起来是“镜头在拍”，不是“图在显示”。
2. **操作员漂移**：视锥方向叠加两个不同周期的正弦（约 9.5 秒和 2.7 秒），
   合计 ±10°。这是唯一能让人感到“有个摄影师”的东西。
3. **扫描扫过**：一条 52 px 宽、透明度 0.16 的竖向渐变，7 秒横穿一次，裁在平面图矩形内。
   它给空白区域提供连续变化，也顺手把“监视器”的感觉做实。

不要用粒子或满屏噪点充数：那会增加像素变化，也会让人立刻觉得廉价。

## 音画同步

画布读的是 `timeline.js`，渲染器与闸门读的是 `timeline.json`。`build_timeline.py` 同时写两份，
`render_frames.mjs` 在出帧前比对 `window.TIMELINE.total/frames` 与 JSON：不一致就拒绝渲染，
否则页面按旧时间轴画、闸门按新时间轴判，两边都对，成品是错的。

画布只认 `timeline.json` 的 `start` / `end`，音频只认同一份文件的同一组值。
改口播稿之后必须重跑 `tts → timeline → frames → video`，不能只重跑 video：
帧是按旧时间轴渲的，会把台词和画面对错位。

## 已验证的失败

| 现象 | 原因 | 处理 |
|---|---|---|
| 整片同一张图 | 页面截图代替 canvas 数据 | 只走 `toDataURL` |
| 文本跑到画布外 | 继承了上一次的 `textAlign` | 每个绘制函数开头显式设置对齐 |
| 字幕压住图形 | 字幕区没有遮罩 | 加渐变遮罩并限制三行 |
| 渲染几十秒没有第一帧 | 字体没就绪就置了 `__ready` | 等 `document.fonts.ready` |
| 改了稿子但画面还是旧的 | 以前按文件大小判帧能否复用 | 看 `.render_manifest.json` 的哈希，变了就清空重渲 |
| 帧数少于时间轴 | 中途退出 | 重跑，哈希没变时已存在的帧会跳过 |
| 成片 P 帧几乎全跳过 | 帧目录残留旧图 | 先 `check_frames.py`，再合成 |
| `check_frames.py` 报 FROZEN | 画面只有字幕在动 | 加镜头推进/视锥漂移/扫描层，不降阈值；静态排版则传 `--timeline` 按段判 |
| 加了缩放后墙体出画 | 缩放中心不在平面图中心 | 以平面图中心做 `translate`，幅度不超过 2% |
