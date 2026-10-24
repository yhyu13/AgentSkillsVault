---
name: style-cn-tech-deep-dive
description: 中文技术深度长文的写作语音包。封装 iTech 博客园《被曝"偷传代码"后,智谱把 ZCode 开源了》提炼出的 10 个语音指纹:戏剧化钩子开场、第 N 层递进披露、"平心而论"公平论反转、逆向工程式精确数字堆、"四条死线"压缩、冒号双行小节标题、明示"证据 vs 解读"的立场标、一句话金句 + 反问 + 实务建议的收尾三段。Use when writing 中文技术深度文(行业爆料 / 争议复盘 / 模型/工具全解析 / 公司产品 deep-dive)且需要这种"既不放过也不冤枉"的中立深度长文风格时。Triggers: 中文深度文、技术爆料文、争议复盘、产品全解析、深度长文、写得中立一点、按 iTech 风格写、按这篇博客园风格写。
metadata:
  category: content
  created_by: agent
  source: iTech @ cnblogs.com/p/23085057 (2026-09-22) — ZCode controversy article
  related_skills: [content-craft, blog-to-linkedin-post, blog-to-twitter-post, tech-design-to-zhihu]
  version: 1.0.0
---

# 中文技术深度长文风格 (style-cn-tech-deep-dive)

一份**风格预设**而非完整写作流程:为中文技术深度长文(行业爆料 / 争议复盘 / 模型与工具全解析 / 公司产品 deep-dive)提供 10 个可复用的语音指纹。风格来自 iTech 在博客园发表的一篇关于智谱 ZCode 偷传代码争议 + 开源复盘的长文。

继承 `content-craft` 的"准确 / 有用 / 易读 / 活人感"基线 — 这个 skill 只管**语音**,不管事实、结构和发布流程。

## 适用场景 vs 不适用

| 适用 | 不适用 |
|------|--------|
| 中文 AI/技术/产品争议复盘(偷传、滥用、安全漏洞) | 英文 long-form |
| 中文工具/模型/产品的 deep-dive 全解析 | 短帖 / 推文 / LinkedIn(用 `blog-to-*` / `long-blog-to-viral-social-posts`) |
| 中文公司事件型叙事(裁员、组织调整、收购) | 知乎专业回答(用 `tech-design-to-zhihu` 或另一种知乎体) |
| 中文逆向工程式技术披露 | 学术论文 / 行业研究报告 |
| 中文行业八卦 + 技术拆解合体 | 营销文案 / 产品 PR 通稿 |
| 需要"既不放过也不冤枉"中立深度的题材 | 单纯正面/负面的口水文 |

## 风格指纹速览(详细定义见 references/voice-fingerprint.md)

| # | 指纹 | 一句话定义 |
|---|------|----------|
| 1 | 戏剧化钩子开场 | 把"事件"包成"瓜",给读者一个明确的服务承诺 |
| 2 | "第 N 层"递进披露 | 行为 → 社区复测 → 官方回应 → 当前状态,层层加深 |
| 3 | "平心而论"公平论反转 | 主张前先承认合理面,再把争议精准收窄到具体条款 |
| 4 | 逆向工程式精确数字 | 包大小、重试次数、抓取频率,像渗透测试报告 |
| 5 | "N 条死线"压缩收口 | 把复杂问题压缩成 N 条可记住的判据 |
| 6 | 冒号双行小节标题 | "主题:一个名词短语的锐评" |
| 7 | 立场标 | "平心而论 / 说到底 / 给几条务实的建议" — 显式分隔证据 vs 解读 |
| 8 | 收尾三段 | 一句金句提炼 + 反问读者 + 实务建议三层 |
| 9 | 圈层身份认同 | 中文 AI 圈黑话自然穿插,不解释(GLM 系 / 飞书机器人 / 国产 AI 厂商) |
| 10 | 信息差诚实声明 | 末尾坦白"用户自配的脚本或第三方组件可能另有行为,不能因通过 X 启动就推定被审核过" |

## 工作流

```
1. 确认题材命中"适用场景"列。
2. 读 references/voice-fingerprint.md,挑出本篇要用的指纹(不必 10 个全用,通常 5-8 个)。
3. 读 references/structural-patterns.md,套用对应的节级模板。
4. 用 references/templates.md 的句式填充开头/小节标题/收尾。
5. 用 references/examples.md 对照 iTech 原文,确认风格没漂移。
6. 走 content-craft 的"源头锚定"铁律(数字 + quote 必须可回溯)。
```

## 引用方式

被其他 skill 调用时:

- `blog-to-*` 系列在写中文原生长文(不是转 LinkedIn/X)时可叠加
- `tech-design-to-zhihu` 想换中性深度长文风格时可叠加(默认是另一种知乎体)
- `content-craft` 做"风格预设"扩展时引用本 skill

单独调用时,用户说出"中文深度文风格""iTech 这种写法""写得中立一点""按这篇博客园风格写"即触发。

## 不写什么(反向边界)

- **不写"行业洞察"式的伪深刻**:不把材料整理写成"反映了 X 时代的 Y 趋势"
- **不写"看似客观实则偏袒"的伪中立**:立场标必须明示证据 vs 解读,不能藏在形容词里
- **不写段子手式短句**:可以口语,但每段至少有一个具体对象 / 具体数字 / 具体动作
- **不写无出处的"业界共识"**:数字、版本、时间、路径,要么有源,要么不写
- **不堆 emoji**:本文没有 emoji,emoji 在这种风格里是噪音

## 引用索引

- `references/source-zcode-article.md` — **原文全文**(iTech 博客园 2026-09-22),所有指纹标注的 ground truth,95 行 Markdown
- `references/voice-fingerprint.md` — 10 个指纹的精确定义 + iTech 原文示例 + 通用化建议
- `references/structural-patterns.md` — 6 种节级结构模板(开场、争议展开、官方回应、技术拆解、立场表态、收尾)
- `references/templates.md` — 可直接套用的句式库(开场变体、小节标题变体、收尾变体)
- `references/examples.md` — iTech ZCode 一文的关键段落标注,展示每个指纹在原文的具体位置

## 来源与更新

来源:iTech @ 博客园《被曝"偷传代码"后,智谱把 ZCode 开源了:GLM-5.3 官方 Harness 全解析》 (2026-09-22)
URL: https://www.cnblogs.com/itech/p/23085057
本地镜像:
- `references/source-zcode-article.md` — 原文全文(95 行)
- `references/examples.md` — 原文关键段落标注 + 指纹位置索引

**风格本身不漂移**:iTech 后续若发新文,对比 `examples.md` 看是否仍命中这 10 个指纹;指纹未变就不必更新 skill,变了则改 `voice-fingerprint.md` 一节,版本号 +0.1。

## 已知局限

- **不是"中文 AI 圈唯一正确风格"**:还有刺猬公社、36Kr 深度、机器之心等多套主流风格,本 skill 只覆盖 iTech 这一脉
- **不替代事实核查**:指纹负责让文字"像人写的",不保证"写得对";事实核验归 `content-craft` 的源头锚定
- **不擅长纯学术腔**:iTech 文体带口语圈层认同;学术综述、行业白皮书请另寻风格
