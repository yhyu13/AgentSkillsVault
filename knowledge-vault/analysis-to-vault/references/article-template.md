# Article Note Template

> One `.md` file per article. Filename: `<slug>.md` (use kebab-case from the article title).
> Target length: 5,000-10,000 Chinese characters (1.5-2.5 A4 pages).
> This template is the "what good output looks like" — see `examples/deep-analysis-fde/notes/deep-analysis-fde.md` for a concrete instance.

---

## File header (mandatory)

```markdown
# <Article Title>

> **本文定位**：<one-sentence summary of what this article argues>
>
> **本文用时**：<estimated reading time>
>
> **本文目标**：<what the user will be able to do/think after reading this note>
```

The header explicitly distinguishes this from a chapter note: "论点 / 长文分析" vs "教材章节"。

## Section 1 — 中心论点 (mandatory, 1 sentence)

```markdown
## 🎯 中心论点（1 句话）

> **<The article's central claim, in one sentence, with claim + subject + implication>**
```

**Quality rules**:
- **One sentence.** Not 2, not a paragraph.
- Must have a **claim** (what's being argued), a **subject** (what the claim is about), and an **implication** (why anyone should care).
- This is the **headline** of the note. If someone reads nothing else, they should remember this.

## Section 2 — 文章地图 (mandatory)

```markdown
## 📑 文章地图（N 节）

| 节 | 主题 | 关键产出 |
|----|------|----------|
| 一 | <section title> | <key takeaway> |
...
```

5-12 rows. The "关键产出" column is the cheat — what does this section actually CONCLUDE, not what does it COVER.

## Section 3 — 核心论点 (mandatory, 6-10 arguments)

```markdown
## 🧠 核心论点（N 个）

### 论点 1 · <Argument name>

> **原文**：「<the actual claim, verbatim from source>」

**我的理解**：<1-3 sentences, in your own words>

**论据 / 数据**：<the evidence — data point, case study, named expert, comparison. If you don't have evidence, downgrade this argument to "decorative" and merge with another>

**呼应论点**：<how it relates to other arguments in this article> (optional)

**Day-job 启示**：<1 sentence on what this means for the user>
```

**Quality rules**:
- 6-10 arguments. Fewer = you may have misidentified the thesis. More = cluster weak ones.
- **Decorative vs load-bearing**: if removing an argument wouldn't change the central thesis, mark it decorative in your draft and either drop it or merge with another argument.
- **原文** is **verbatim**. If the article has no clear single quote for the claim, paraphrase in 5-10 words and use 「」 marks.
- **我的理解** is in your **own words**. If you find yourself copy-pasting the source's phrasing, you haven't understood it.
- **论据 / 数据** must be **attributed** ("MIT 2025 报告", "上海 FDE 案例", "Bloomberry 1000 个职位分析"). Unattributed claims are opinions, not evidence.
- **Day-job 启示** is **specific to the user** (not generic). If you don't know the user's day-job, ask before writing this section.

## Section 4 — 关键数据 / 事实表 (mandatory, 5-15 rows)

```markdown
## 📊 关键数据 / 事实表

| 类别 | 数据 / 事实 | 来源 / 上下文 |
|------|-------------|---------------|
| <category emoji + label> | <the fact> | <attribution> |
...
```

**Quality rules**:
- 5-15 rows. Use **categories** to group: 薪酬 / 风险 / 案例 / 效率 / 人才 / 中国 / 等.
- **Bold** the load-bearing facts (the ones the article's argument depends on).
- Drop decorative facts (mentioned once, no argumentative role).
- The "来源 / 上下文" column is your future-self's friend — when you cite this article later, you need to know where the data came from.

## Section 5 — 与其他材料的呼应 (recommended)

```markdown
## 🔄 与其他材料的呼应

| 本文论点 | 对应章节 / 文章 | 怎么连起来 |
|----------|----------------|------------|
| <argument N> | 第 X 章 / <other article> | <how it connects> |
...
```

This is the **vault-wide linkage** — analytical articles are most valuable when they're connected to other things you've read. This section is your "lattice of knowledge" check.

## Section 6 — 对 Day-Job 的启示 (recommended, but requires user input)

```markdown
## 💡 对 Day-Job 的启示

| Day-Job 任务 | 本文对应论点 | 怎么调整 |
|--------------|------------|----------|
| <user's actual task> | 论点 N | <concrete adjustment> |
...
```

**Quality rules**:
- Requires knowing the user's day-job. If you don't, ask before writing.
- 3-5 rows. Each row is **a specific adjustment** to a real task, not "this article is generally relevant."
- "**不接没有量化目标的客户**" is a good adjustment. "AI 很有用" is not.

## Section 7 — 待探索的问题 (recommended, 3-6 questions)

```markdown
## ❓ 待探索的问题（Open Questions）

读完之后你可能会想：

1. <question the article raised but didn't answer>
2. <question>
...
```

3-6 questions. These become the **"what to read next"** roadmap. They also feed into the next article / paper you should consume.

## Section 8 — Self-Test (mandatory, 5-8 questions)

```markdown
## 🧪 Self-Test（闭卷）

> **规则**：用 30 秒讲清楚，不要背原文。

1. <one-sentence thesis question>
2. <comparison question>
3. <application question>
...
```

5-8 questions. The first one is always the thesis ("用 1 句话说清楚 X 是什么、为什么 Y"). The rest test whether you can apply the article's arguments to new situations.

## Section 9 — 关键金句 (mandatory, 5-8 quotes)

```markdown
## 📎 关键金句（速记版）

- 「<memorable quote 1>」
- 「<memorable quote 2>」
...
```

5-8 quotes. Pick the ones that are **rhetorically sharp** AND **load-bearing**. Drop quotes that are pretty but don't carry an argument.

## Section 10 — 相关章节 / 资源 (recommended)

```markdown
## 🔗 相关章节 / 资源

- → <related chapter in the vault>
- → <external resource mentioned in the article>
- → <MIT 2025 报告 link if available — find it, don't fabricate>
```

## What to AVOID in article notes

- ❌ Treating every sub-section as an "argument" — analytical articles have structural sections (intro / case study / methodology / etc.) that don't all carry distinct claims. **Cluster by argument, not by structure.**
- ❌ Writing a 50-argument "summary" because the article is long. 6-10 load-bearing arguments is the sweet spot.
- ❌ Skipping the "Day-job 启示" or making it generic — that's the section that makes the note actionable.
- ❌ "I learned a lot from this article" as a Self-Test answer. Force specific, testable claims.
- ❌ Forgetting the **source URL or citation** — analytical articles are exactly the kind of content that needs to be citeable later.
