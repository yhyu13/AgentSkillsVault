# 禁用词表(AI 味词 → 日常话)

`check_explain.py` 直接读这份表,所以**新增词只改这里**,不要散落在别处。

原则:一个词如果**只增加气势、不增加信息**,就删;如果能换成"谁 对 谁 做了 什么",就换。

## 中文

| 禁用 | 换成 |
|------|------|
| 值得注意的是 / 需要指出的是 | 直接说那件事,前面什么都不加 |
| 不仅仅是…而是… | "X 是 A,不是 B" |
| 至关重要 / 核心关键 | "不做就 X"(写出后果) |
| 显著提升 / 极大改善 / 大幅优化 | 给数字:`2.1 秒 → 0.4 秒` |
| 深入 / 全面 / 系统性 / 多维度 | 删掉,或写"看了 3 个地方" |
| 赋能 / 助力 / 打造 / 抓手 / 闭环 / 生态 / 势能 / 组合拳 | "让 X 能做 Y" / "做完一轮再回来改" |
| 底层逻辑 / 顶层设计 / 方法论 / 范式 | "它靠的是…" / "做法是…" |
| 一站式 / 无缝 / 丝滑 / 优雅 / 强大 | 删。要么给实测,要么不说 |
| 颗粒度 / 对齐 / 拉通 / 沉淀 / 复盘 | "细到哪一层" / "先说清同一个词" / "记下来" |
| 让我们 / 我们可以看到 / 你会发现 | 直接陈述 |
| 综上所述 / 总而言之 / 总的来说 | 删;结论只说一次,放最前面 |
| 首先…其次…最后… | 改 1 2 3,或干脆只留 2 条 |
| 某种程度上 / 可以说 / 事实上 / 众所周知 | 删 |
| 丰富的 / 细腻的 / 精美的 / 令人惊叹的 | 删 |

## English

| Banned | Use |
|--------|-----|
| delve into, dive deep | look at, read |
| leverage, utilize | use |
| robust, seamless, cutting-edge, state-of-the-art | say what it does, with a number |
| unlock, elevate, empower, supercharge | let X do Y |
| game-changer, revolutionary | delete |
| it's worth noting, it's important to note | delete |
| moreover, furthermore, additionally | delete (start the sentence) |
| in today's fast-paced world, in the ever-evolving landscape | delete |
| navigate the landscape, testament to, underscores | delete |
| holistic, myriad, plethora, myriad of | "several" / "many" / a number |
| not only … but also | "X, and Y" |
| crucial, pivotal, vital (as filler) | say the consequence |
| comprehensive, nuanced, meticulous | delete or count it |
| rich, elegant, powerful (as praise) | delete |
| Let's … / We can see that … | state it |

## 自查(不用跑脚本也能做)

1. 把每句里的形容词删掉,句意还在吗?在 → 删。
2. 每句能不能回答"谁 对 谁 做了 什么 / 多少"?不能 → 重写或删。
3. 相邻两句能不能合并成一句?能 → 合并。

## 例外

引用原文、引用他人评价、法律/合同措辞时**保留原词**,但在前面标 `引:`。
`check_explain.py` 对 `引:` 开头的行不计命中。
