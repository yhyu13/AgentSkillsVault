# 形式 4（讲解视频）的交付细则

这份文件回答一件事:**怎么让「讲解视频」真的能交付、而不是交出一份看起来完整的方案。**

适用前提:视频已经决定要做(见 SKILL.md「何时不使用」——用户没明确要,不要默默交付)。

**总原则:退出码和 HTTP 200 都不算证据。** 两个方向都踩过:

- `exit 1` 但产物其实是好的:合成脚本最后一句 `print("✓ 视频已生成…")` 在 GBK 控制台抛
  `UnicodeEncodeError`,而视频早已写完——看起来失败,其实成功
- `exit 0` 但产物是坏的:合成"成功"退出,视频却只有 **0.98 秒**

判定必须落在**产物本身**——时长、帧、像素、响应头。

---

## 1. 时间轴:时长只有一个事实来源

**场景时长以旁白音频的实测长度为准。** 分镜里写的秒数只是估算/备胎。

> 实测事故:分镜估算合计 290 秒,旁白实际 177.8 秒(差 39%)。
> 按估算切帧,第 6 个场景之后画面与旁白越错越远,最多差 112 秒。

三条配套规则:

- 音频读不到时才退回估算,并且**必须打警告**,不能静默
- 改旁白文案后,必须重跑「生成音频 → 规划时间轴 → 渲染」整条链
- **转场不改变总时长**:淡入淡出作用在每个片段自身(首尾各几十毫秒),
  不要用「两段重叠」的转场——重叠会让视频比音频短 `(段数-1)×重叠时长`,且逐段累积

### 帧对齐:用「累计取整再求差」

```
每步结束帧号 = round(累计时间 × fps)
该步帧数     = 本次结束帧号 − 上次结束帧号
```

不要「逐步 `round(时长×fps)` 再相加」——那样每步的舍入误差会累积,几十段下来能漂到半秒。

### 分步揭示:时长按旁白小句分配

一屏把所有内容铺满,观众来不及读。把每个场景拆成若干**揭示步**(新内容逐步出现),
每步停留多久 = 该步对应的旁白小句字数占比。

- 先按句末标点**和逗号**把旁白切成小句(中文旁白里逗号分句很密,分细一点节奏才跟得上)
- 小句数 > 步数:按比例合并成若干组;小句数 < 步数:把最后一句拆成多份
- 权重给个下限(如 12 字符),否则某步会短到一闪而过

读出音频实测时长的最小实现(只用 ffmpeg,**不依赖 ffprobe**):

```python
import re, subprocess

def probe(path):
    out = subprocess.run(["ffmpeg", "-hide_banner", "-i", path, "-f", "null", "-"],
                         stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                         text=True, errors="replace").stdout
    h, m, s = re.search(r"Duration: (\d+):(\d{2}):(\d{2}\.\d+)", out).groups()
    return int(h) * 3600 + int(m) * 60 + float(s)

durs = [probe(f"audio/{i:02d}.mp3") for i in range(1, 16)]
starts, t = [], 0.0
for d in durs:
    starts.append(t)
    t += d
print(starts)          # 章节起点，和画面切换严丝合缝
```

顺带:这份 `starts` 就是网页播放页「点缩略图跳到对应镜头」的锚点,**一份数据两处用**。

---

## 2. 动效:静帧推镜必须逐帧亚像素渲染

**不要用 ffmpeg `zoompan` 做静帧推镜。**

原因:`zoompan` 的裁剪窗口只能取**整数像素**,而每帧缩放变化通常远小于 1px
(例如 `(1.04-1)/171 ≈ 0.45px/帧`)。结果是画面「冻住一帧 → 跳一格」,
在 24fps 下肉眼就是持续抖动。预放大源图只能缓解,消不掉。

改法:用 Pillow 按**浮点裁切框**逐帧渲染,再通过管道喂给 ffmpeg:

```python
box = (left, top, left + crop_w * supersample, top + crop_h * supersample)  # 全小数
frame = source.resize((W, H), Image.LANCZOS, box=box)   # box 支持小数 → 亚像素
```

要点:

- 缩放随「**场景内**帧序号」连续变化,跨分步画面不重置,否则每步会重新跳一下
- 淡入淡出也放在这一层(`Image.blend` 到黑),比滤镜更可控
- **超采样通常没必要**:这条路只会放大裁切框(z ≥ 1),不存在缩小混叠。
  实测 `ss=1 + LANCZOS` 比 `ss=2/3` 又快又锐(25ms/帧 vs 66ms/帧)
- 代价:每帧都不再重复,x264 失去「重复帧」压缩红利,**体积会明显变大**

> **反直觉的一条:体积小可能是 bug 的症状。**
> 同一段内容,抖动版 16.7MB、平滑版 28.8MB。别拿体积当质量指标;
> 抖动时的「小」正是因为大量帧完全一样(等于卡住)。

ffmpeg 滤镜路径(`zoompan`)可以留作**快速预览**(约 50 秒出片 vs 逐帧约 3 分钟),
但要在文档里写清它只用于预览。

---

## 3. 交付即校验:把「能不能播」变成可判定的检查

人眼核一遍不可复用,下次还得再核。三项自动检查(任一失败退出码非 0):

| 检查 | 判据 | 为什么 |
| --- | --- | --- |
| **时长对齐** | 视频时长 vs 旁白实测,偏差 ≤ 0.5s | 证明没有丢帧、没有被转场吃时间 |
| **画面命中** | 每段中点抽一帧,与所有段画面做最近邻比对(缩略图 MAE),必须命中自己 | 一次覆盖全部时间点,替代「看一遍」 |
| **抖动量化** | 段内连续抽帧算逐帧 MAE 序列:冻结帧 ≤ 5%、残差 RMS ≤ 0.02 | 「看着不对」变成可测的数字 |

抖动指标的含义:

- **冻结帧**:相邻两帧 MAE < 0.01,说明画面完全没动 → 出现就是「冻住-跳格」
- **残差 RMS**:逐帧 MAE 序列减 3 帧滑动中位数后的波动 → 平滑推镜应接近常数

现成脚本见 `scripts/`(README 里有完整流程与阈值标定表)。

**校验窗口必须完全落在同一个分步画面内**——跨段会带上「新内容出现」的大 MAE,
把指标污染成假失败。这个坑踩过一次。

### 3.1 「画面命中」的最小实现

按各段中点抽帧,与全部原图算 MAE,取最小者——**命中的必须是"期望的那张"**:

```python
# starts / durs 来自第 1 节
for i in (0, 1, 5, 11):
    t = starts[i] + durs[i] / 2
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", str(t),
                    "-i", "out.mp4", "-frames:v", "1", "probe.png"], check=True)
    print(i, nearest_by_mae("probe.png", refs))
```

实测 6 个抽样点全部命中(MAE 1.33–2.00,而不该命中的那张是 8.67)。
这个方法能分辨出**一个镜头级别的错位**,比「看着挺对」可靠得多。

### 3.2 播放侧:证明「真的解码出画面」

元数据对(有 `duration`、`readyState=4`)**不等于**能解码出像素。
把 seek 后的帧画进 canvas 数亮度与颜色数:全黑 / 全白 / 单一色 = 没解码出内容。

```js
const c = document.createElement('canvas');
c.getContext('2d').drawImage(v, 0, 0);
const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
// 统计平均亮度与颜色数
```

实测输出 `meanLuma=37.5, distinctColors=151`——有内容,不是黑屏。

### 3.3 静态判据之外:布局类 bug 只有看图才发现

HTTP 200、截图"成功"、脚本无报错,**都不能说明版面是对的**。

实测踩法:`.body { flex-direction: column }` 之后 `.row` 没有把方向覆盖回 `row`,
两栏内容被竖着堆起来——所有自动化信号都是绿的。

做法:**渲染完必须看图**。做一张缩略拼版,一次看完 15 张,不要只看日志。

配套技巧:**需要定位素材时不要手写坐标,用程序找。**
实测用「饱和色连通域 + 取最大块」自动定位吉祥物,5/5 命中;
而手写坐标的版本把浅色卡片背景一起框了进去。

---

## 4. 发布出来还要能拖能播:faststart 与 Range

前两节保证「文件是对的」,这一节保证「别人在浏览器里能正常看」。

### 4.1 `moov` 必须前置(faststart)

`moov` 在文件末尾时,浏览器要几乎下完整个文件才能起播。

判定:读顶层 atom 顺序。

```python
import os, struct

order, pos = [], 0
size_total = os.path.getsize("out.mp4")
with open("out.mp4", "rb") as f:
    while pos < size_total:
        f.seek(pos)
        hdr = f.read(8)
        if len(hdr) < 8:
            break
        size, typ = struct.unpack(">I4s", hdr)
        order.append(typ.decode("latin1"))
        if size == 0:
            break
        pos += size

print(order)                                     # 修前: ftyp free mdat moov
print(order.index("moov") < order.index("mdat")) # 修后: ftyp moov free mdat → True
```

修法(不重编码,几秒):

```bash
ffmpeg -i in.mp4 -c copy -movflags +faststart out.mp4
```

顺手把 `-movflags +faststart` 写进合成脚本,以后每次产出都是 web-ready。

### 4.2 提供方要支持 Range / 206

不支持 Range 时**视频拖不动进度条**——播放器 seek 需要 `206 Partial Content`。

`python -m http.server` 就不支持:对 `Range: bytes=0-1023` 它返回 `HTTP/1.0 200`
加**整个文件**。

判定(不要只看 200):

```bash
curl -I https://host/video.mp4                              # 要有 Accept-Ranges: bytes
curl -D - -H "Range: bytes=0-2047" https://host/video.mp4    # 要 206 + Content-Range
```

另外两条容易漏的:

- 静态服务器要能正确给出 `Content-Type: video/mp4`(Windows 上有些环境认不出 mp4)
- 页面要消掉 `favicon.ico` 之类的 404 噪声:加 `<link rel="icon" href="data:,">`,让 console 干净
- 播放器 seek 时出现的 `net::ERR_ABORTED` 是它主动中断旧的 Range 请求,**属正常现象**,不是错误

---

## 5. 跨平台清单(这些会让交付直接失败)

| 项 | 要求 | 不这么做的后果 |
| --- | --- | --- |
| **字体** | 按平台显式解析(Windows 微软雅黑/黑体、macOS 苹方、Linux 思源黑体),**找不到就报错** | `ImageFont.load_default()` 回退拿到的是 **10px 位图字体**:中文变豆腐块、所有字号参数失效、emoji 消失,而脚本「看起来成功」 |
| **图标** | 用矢量线段/多边形画 ✓ ✗ ! ,不要用 emoji | emoji 依赖系统彩色字体(Windows `seguiemj.ttf`),换平台退化成方块 |
| **工具探测** | 探测能力,不假设能力 | 很多 Windows 环境只有 `ffmpeg.exe`、没有 `ffprobe.exe`,链路会断在最后一步 |
| **控制台编码** | 输出 ASCII 或显式设 UTF-8 | Windows 控制台默认 GBK,`print` 里带 `✓`/emoji 会抛 `UnicodeEncodeError`,导致「视频已生成但脚本报失败」 |
| **子进程** | `capture_output=True` 不能再传 `stderr` | Python 直接 `ValueError`,与业务无关的崩溃 |

一句话原则:**静默降级是最危险的失败**——它产出「看起来成功的错东西」。
宁可报错,也不要回退到一个看起来还能跑的实现。

### 5.1 上表的字体/图标两行,先选定渲染路径再套用

**两条路径的规则不一样:**

- **自绘路线**(PIL 等逐帧绘制):字体必须显式解析、失败即报错;图标只能用矢量画,**不能用 emoji**
- **浏览器路线**(HTML/CSS + 无头 Chromium 截图):字体回退与彩色 emoji **都由浏览器负责**,
  `✓ ⚠ ⭐ 🎉` 全部正常(实测过),`U+FE0F` 变体选择符也不会变成两个框;
  顺带能复用已有设计系统(字体栈、颜色变量)与真实截图,同一套 HTML 还能兼作网页版交付。
  **代价**是必须补验第 4 节的两条(faststart、Range)

判定「当前路径下符号有没有坏」的通用手法:把可疑字符与**肯定不存在的私用区字符 `U+E123`**
比位图 md5,**相同即缺字形**。

```python
from PIL import ImageFont
import hashlib

f = ImageFont.truetype("msyh.ttc", 40)
sig = lambda ch: hashlib.md5(bytes(f.getmask(ch))).hexdigest()
base = sig("\uE123")                       # .notdef 基准

for ch in ["✓", "⚠", "⭐", "🌤", "🎉"]:
    print(ch, sig(ch) == base)             # True = 缺字形，画出来是豆腐块
```

实测这 5 个字符连同基准渲染出的 md5 全是同一个值(`6365d18ed477`)——
七个不同码点得到完全相同的位图,只可能是缺字形。

**附带坑**:`U+FE0F`(变体选择符)也各画一个方块。`🌤️ = U+1F324 + U+FE0F`,
所以一处设计会出现 **4 个框而不是 3 个**。

---

## 6. 版本留档(改之前先存)

改动前归档:成片 + 分步清单 + md5 + 已知症状清单。

- 才能做 A/B 对比(「这版是不是真的更好了」要有同口径数字)
- 才能回滚
- 才能在文档里写清「哪版修了什么问题」,而不是靠记忆

归档目录写一个 `README.md`,逐版记录:时间、规格、md5、修了什么、遗留什么。

---

## 7. 自检清单(交付前逐条过)

- [ ] 时长来自音频实测,不是分镜估算;改动后重跑了整条链
- [ ] 转场不改变总时长;帧对齐用累计取整
- [ ] 推镜是逐帧亚像素渲染(不是 `zoompan`),或已明确说明这是预览版
- [ ] 校验三件套跑过且通过(时长 / 画面命中 / 抖动量化)
- [ ] 播放侧验过:seek 后画进 canvas,不是黑屏、不是只有元数据
- [ ] **逐张看过图**(缩略拼版),不是只看日志和退出码
- [ ] 中文渲染字体显式指定并失败即报错;或用浏览器渲染并确认符号没有豆腐块
- [ ] 成片 `moov` 在 `mdat` 之前;给别人看的链接支持 Range(能拖进度条)
- [ ] 交付物**能播**(用播放器打开过),不是一份方案
- [ ] 上一版已归档(成片 + md5 + 症状清单)
- [ ] 已知取舍写清(体积/码率、场景顺序与旁白语义的近似程度等)
