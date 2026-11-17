# 课件：一份 spec，七种版式，预览从 pptx 生成

## 三种文件

| 文件 | 谁写 | 谁读 |
|---|---|---|
| `ppt/deck.json` | 人 / 模型 | `build_deck.js` |
| `ppt/theme.json` | 人 | `build_deck.js`、预览页 |
| `ppt/deck.pptx` | `build_deck.js` | `deck_preview.py`、`check_deck.py` |

`deck.json` 只有文案与版式名。颜色和尺寸在 `theme.json`，pptxgenjs 要裸十六进制（`101318`），
CSS 要带 `#`，所以两边各加一次前缀，不在 spec 里存两种写法。

```json
{
  "title": "…", "author": "…", "footer": "…",
  "slides": [{ "type": "statement", "kicker": "先给结论", "title": "…",
               "body": "…", "stat": { "value": "20 秒", "label": "…" },
               "source": "00:16-00:55", "caveat": "…" }]
}
```

`source` 与 `caveat` 是必填的习惯：它们会进备注，也会以小字打在页面底部。
一页读不到“这句话来自第几分钟”，它就不是课件，是观点。

## 七种版式

| type | 用在哪 | 关键字段 |
|---|---|---|
| `cover` | 封面 | `kicker` / `title` / `subtitle` / `meta` |
| `statement` | 一句结论 + 一个数字 | `title` / `body` / `stat{value,label}` |
| `points` | 三条以内的并列 | `lead` / `items[{head,detail}]` / `aside{label,value,note}` |
| `steps` | 四步以内的流程 | `items[{tag,head,detail}]` / `body` |
| `compare` | 两种做法对照 | `columns[{label,head,items,tone}]` / `body` |
| `quote` | 原话 | `quote` / `attribution` / `body` |
| `closing` | 收束 | `items[]` / `body` |

版式之间要换：连续三页 `points` 会读成甘特图。本片 14 页的排法是
cover → statement → points → steps → statement → quote → points → compare → points →
statement → quote → statement → points → closing。

## 字号与留白

- 标题 25–40 pt，正文 15 pt，页脚与注释 8–9 pt。低于 8 pt 的正文 `check_deck.py` 会报错；
  8 pt 是这条线，因为投影仪上再小就只剩一团灰。
- 一页只放一个主结论，第二层最多三条。
- 卡片不要画得过满：内容只占卡片上半截时，卡片就该变矮，而不是留一块空。

## 预览：从 pptx 生成，不要第二套版式

这台机器没有 PowerPoint，也没有 LibreOffice，`New-Object -ComObject PowerPoint.Application`
会直接失败。所以预览不是“再写一遍排版”，而是读 pptx：

```bash
node scripts/build_deck.js <project>       # deck.json -> deck.pptx
python scripts/deck_preview.py <project>/ppt/deck.pptx
node scripts/shot_preview.mjs <project>    # preview.html -> preview/sNN.png
```

`deck_preview.py` 把每个形状的 `left/top/width/height`、填充、边框和 run 属性搬成绝对定位的 div，
比例是 96 px/in，`shot_preview.mjs` 用 `deviceScaleFactor: 2` 截图，所以 13.33×7.5 in 的页面出图是
2560×1440。pptx 里 3.4 in 的框，预览里就是 3.4 in 的框。

它能证明：文案、顺序、密度、对齐、颜色、文字是否跑出框。
它不能证明：PowerPoint 自己的断行与字体替换。预览还统一按 Microsoft YaHei、行高 1.45 画，
所以 Georgia 数字与自定义行距在预览里会有出入——文字是否**跑出框**可以信，字距细节不必逐像素比。

数字豁免靠形状名，不靠文字长相：`build_deck.js` 给页码与来源行标了 `objectName`
（`pageno` / `provenance`，pptxgenjs 的选项名是 `objectName`，不是 `shapeName`），
`check_deck.py` 只豁免这两个名字；`caveat` 照常检查。手写的课件没有这些名字，就全量检查。

## 溢出怎么判

`check_deck.py` 按字符宽度估：CJK 1.0 em、拉丁 0.52 em，行高 1.45，两边各留 0.08 in。
估算高度超过框高 15% 就报错。这是估算：每段单独估、段落首行按一行算，实际情况会因为它
不知道自动缩字、字距与真实断行而两头都可能偏——所以预览图还是要看，PASS 只说明没有明显溢出。

它同时检查：页数 ≤ 16、每页备注含“原片”与 `mm:ss`、时间码不越界、形状不出画布、正文 ≥ 8 pt、
每页有一个 ≥ 22 pt 的标题级文字。

## 已验证的失败

| 现象 | 原因 | 处理 |
|---|---|---|
| 预览整页全黑 | CSS 拿到的是裸十六进制 | 预览从 pptx 读颜色，带 `#` |
| 深底页整页看不见字 | 读字体颜色用了 `fore_color.rgb`，抛异常后被 `except` 吞掉，回落成 `#111` | 读 `run.font.color.rgb`；每做一版都抽一张深底页看 |
| 箭头、竖线没出现 | `ShapeType.line` 高为 0 或负数，pptxgenjs 静默不画 | 横线 = 高 0.02 in 的矩形，竖线 = 宽 0.02 in 的矩形 |
| 箭头方向反了 | 用负高度表达向下，pptxgenjs 靠 flip 语义，预览读不出 | 不用负高度，改成两根短矩形或直接删掉 |
| 引用块变成一条小横杠 | 用 line 形状画竖条 | 改用 0.055 × 1.7 in 的矩形 |
| 数字徽标压住正文 | 正文框宽度没给数字让位 | 有 `stat` 时正文宽 8.2 in |
| 一张卡片里空一半 | 卡片高度按最多内容写死 | 内容少就压卡片，不填空 |
| 备注缺时间 | 忘了写 `source` | `check_deck.py` 拦下，不靠自觉 |
