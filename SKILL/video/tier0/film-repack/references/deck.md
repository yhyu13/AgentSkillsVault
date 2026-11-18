# 课件：deck.json 的结构与容量

课件由一份 JSON 生成两样东西：真正的 `.pptx`（`build_deck.py`）和用来验版的 HTML 镜像（`render_deck.py`）。两者共用 `scripts/deckkit.py` 的几何，因此不存在「镜像好看、pptx 溢出」的两套版式。

## 结构

```json
{
  "slug": "musk-work-method",
  "title": "马斯克工作法",
  "source": {"bvid": "BV1HNW26fErj", "url": "https://…", "resolution": "852x480",
             "owner": "上传者名（从 source.json 原样抄，selfcheck 会比对）"},
  "theme": {"paper": "F4EFE6", "ink": "14161A", "accent": "C2410C",
            "card": "FFFBF5", "mute": "5A544C", "line": "D9CFBF"},
  "slides": [
    {"kind": "cover", "kicker": "纪录片压缩重讲", "title": "片名",
     "subtitle": "一句副标题", "meta": "原片信息", "note": "讲者备注"},
    {"kind": "section", "num": "01", "title": "章节", "lede": "一句话",
     "timecode": "00:51–01:36", "note": "备注"},
    {"kind": "content", "kicker": "02 / 第一步", "title": "标题",
     "timecode": "05:27–06:11", "evidence": "这一页依据的原片内容",
     "image": "source/stills/s05.jpg",
     "bullets": [{"head": "小标题", "body": "一句解释"}], "note": "备注"},
    {"kind": "quote", "kicker": "收束", "quote": "一句引文",
     "attribution": "出处", "timecode": "49:09–51:02", "note": "备注"}
  ]
}
```

规则由 `deckkit.validate` 执行，违反就直接退出，不会生成半成品：

- 8–20 页。少于 8 页撑不住一支长片，多于 20 页就变成逐句翻译。
- `content` 每页 2–4 条要点，`head` 与 `body` 都必填。
- `content` / `section` / `quote` 必须有 `timecode`；每页必须有 `note`。
- 有 `source.bvid` 或 `source.url`。没有出处的课件，读者无法核对。

## 容量预算

每个文本框有字符预算（`deckkit.boxes` 里逐页类型写死），超过 1.45 倍就报错。当前值：

| 元素 | 预算 | 元素 | 预算 |
|---|---:|---|---:|
| 封面标题 | 26 | 要点正文 | 56 |
| 内容页标题 | 30 | 内容页 lede | 60 |
| 章节页标题 | 20 | 章节页 lede | 72 |
| 结尾页标题 | 22 | 引文 | 84 |
| 要点标题 | 24 | 依据行 | 96 |
| 封面副标题 | 44 | 引文出处 | 72 |

这不是审美偏好，是字号与框宽的算术结果。

`build_deck.py` 从设计字号开始（封面 54pt、章节 40pt、内容 34pt、结尾 44pt），每次降 3pt，最低 26pt；仍然超预算就报错，让你改文案。`render_deck.py` 再用 Chromium 真实排版量一遍 `scrollHeight`，两关都过才算过。

## 原片静帧

`content` 页可以带 `image`，指向 `source/stills/` 里的一帧。有图时文字宽度自动收窄（要点标题 8.7→7.9 英寸，正文 8.9→8.1），图片固定 2.98×1.68 英寸放在右侧。图和标题不抢位置，是因为宽度是算出来的，不是手调的。

没有图也能生成，只是那一页变成纯文字。别为了凑图放与要点无关的帧——观众会以为那一段在讲画面里的东西。

## 版式怎么选

- 一支片子只有一个论点，`quote` 只放一次，放在收束。
- 章节页每 2–3 页内容出现一次，用来换气，不要每页都换章节。
- 关键数字放在要点正文里，不要单独做成「大字海报」——那会让人记住数字、忘记它为什么重要。
- `evidence` 是给讲者自己看的：写下这一页依据的是哪一段，复盘时不用重看全片。

## 交付时要说明的一句

`render_deck.py` 产出的是镜像渲染，不是 PowerPoint 输出。如果版式里用了特殊字体、表格或图表，要在交付说明里写清「课件未在 PowerPoint 中打开过」，并建议对方先看一眼那三张 PNG。
