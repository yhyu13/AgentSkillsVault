# Cross-Reference Template

> How to link an analytical article to other notes in the vault. The "lattice of knowledge" — analytical articles are most valuable when connected to other things you've read.

---

## Why this matters

A standalone note is a fact. A connected note is a **framework**. The difference is the cross-references.

When you read 5 articles in the same domain, and each one references the others, you start to see:
- Which arguments are **recurring** (probably true)
- Which arguments are **isolated** (probably opinion)
- Which arguments are **contradicting** (the field is unsettled)
- Which arguments are **reinforcing** (build a stronger case together)

## When to add a cross-reference

**Add a cross-reference when:**
- The article's argument **agrees with** something you've already noted (support)
- The article's argument **contradicts** something you've already noted (tension)
- The article's argument **extends** something you've already noted (refinement)
- The article uses a **case study or data point** that you've also seen in another source (convergent evidence)
- The article addresses a **question you raised** in another note's "Open Questions" (closure)

**Don't add a cross-reference when:**
- The article merely **mentions** the same topic (no argumentative link)
- The connection is **superficial** ("both are about AI") — that doesn't help future recall
- The connection would require **inventing a link** that isn't there

## How to format

In the per-article note, add a "与其他材料的呼应" section:

```markdown
## 🔄 与其他材料的呼应

| 本文论点 | 对应章节 / 文章 | 怎么连起来 |
|----------|----------------|------------|
| 论点 2 (55 秒换线) | 第 2 章《快速原型》 | 章节讲"个人 FDE 怎么做"，本文讲"组织 FDE 模式怎么 scale" |
| 论点 6 (Ontology) | 第 3 章《部署的艺术》 | Write-back 回写是部署章节"集成"的最高形态 |
| 论点 8 (AI 解放 FDE) | 第 4 章《与客户并肩作战》 | LLM 接管搬砖后，FDE 核心回到"客户沟通" |
| 论点 3 (Echo+Delta) | 个人学习（kanban Backlog） | 找搭子时先看 Echo 还是 Delta 型 |
```

## The 4 reference types

### 1. Support (支持)
- 本文论点 ↔ 之前的笔记
- 关系：本文强化了之前的论点

Example: "论点 2 (95% 失败率) ↔ 之前看的《AI 产品落地陷阱》笔记 — 同样数据，互相印证"

### 2. Tension (张力)
- 本文论点 ↔ 之前的笔记
- 关系：本文质疑了之前的论点

Example: "论点 7 (滚雪球) ↔ 之前笔记说'AI 工具难复制' — 本文反驳：FDE 模式能复制，但前提是有产品杠杆"

### 3. Extension (延伸)
- 本文论点 ↔ 之前的笔记
- 关系：本文把之前的论点推进了一步

Example: "论点 8 (AI 解放 FDE) ↔ 第 2 章《快速原型》的 MVP 哲学 — MVP 哲学在规模化阶段的延伸"

### 4. Convergent Evidence (共证)
- 本文数据点 ↔ 之前笔记的类似数据点
- 关系：两个独立来源指向同一结论

Example: "本文：上海换线 5 → 300 款/日 ↔ 之前《丰田生产方式》笔记：标准化作业让换线时间从 10 分钟缩到 1 分钟 — 都是规模化精益"

## How to find cross-references (the 5-minute drill)

When you finish the article note, take 5 minutes to:

1. **List the article's 3 most load-bearing arguments** (the ones you'd cite if you were writing about this topic).
2. **For each**, search your existing notes (kanban / mindmap / notes folder) for: "Have I noted something that agrees, disagrees, or extends this?"
3. **For each match**, add a row to the cross-reference table.

If you have NO matches after 5 minutes, that's OK — not every article connects to your existing material. Don't force it.

## What to AVOID

- ❌ Cross-references that are just "both are about X" (no argumentative link)
- ❌ Cross-references that require 3 hops of reasoning to connect
- ❌ Cross-references to articles you haven't fully read (you don't know if the link is real)
- ❌ Cross-references as filler — 0 is better than 3 weak ones
