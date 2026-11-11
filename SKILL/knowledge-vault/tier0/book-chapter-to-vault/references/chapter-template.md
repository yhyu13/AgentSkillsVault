# Chapter Note Template

> One `.md` file per chapter. Filename: `ch<NN>-<slug>.md`.
> Target length: 4,000-8,000 Chinese characters (1-2 A4 pages printed).
> This template is the "what good output looks like" — see `examples/fde-ai-pm-ch2-4/notes/ch02-mvp-2weeks.md` for a concrete instance.

---

## File header (mandatory)

```markdown
# 第 X 章 · <Title>

> **本章定位**：<one-sentence summary of what this chapter is about in the book's flow>
>
> **本章用时**：<estimated reading + practice time>
>
> **本章目标**：<concrete capability the reader will have after this chapter>
```

## Section 1 — 章节地图 (mandatory)

```markdown
## 📑 章节地图

| 小节 | 主题 | 关键词 |
|------|------|--------|
| 1.1 | <title> | <1-3 keywords> |
| 1.2 | <title> | <1-3 keywords> |
...
```

This is the **table of contents** restated. 4-7 rows. The "关键词" column is the cheat — what the chapter is REALLY about.

## Section 2 — 核心概念 (mandatory, 5-7 concepts)

```markdown
## 🧠 核心概念（N 段）

### 概念 1 · <Concept Name>

> **原文金句**：「<verbatim quote from source>」

**我的理解**：<your own re-statement, 1-3 sentences, in plain language>

**怎么用**：<concrete application — code snippet, command, template, workflow, or checklist>

**复述题**：<one-line self-test question that requires applying the concept>
```

**Quality rules**:
- **原文金句** is **verbatim** from the source, including punctuation and emphasis. Wrap in 「」 Chinese quotes.
- **我的理解** is in **your own words**. If you find yourself copying the source's phrasing, you haven't understood it yet.
- **怎么用** must be **executable** — not "this helps you think" but "use this checklist" / "run this command" / "ask these 3 questions".
- **复述题** is a **question**, not a statement. It should require the reader to APPLY the concept, not just recognize it.

## Section 3 — 反模式 / 常见坑 (mandatory, 5-8 rows)

```markdown
## 🚫 反模式 / 常见坑

| 坑 | 表现 | 危害 | 破解 |
|----|------|------|------|
| <anti-pattern name> | <how it manifests> | <concrete harm> | <one-line fix> |
...
```

**Quality rules**:
- 5-8 rows. Fewer = too thin. More = dumping.
- Each row's "破解" is one executable action, not a paragraph of advice.
- If the source book has explicit anti-patterns, lift them. If not, infer from "do/don't" contrasts in the prose.

## Section 4 — 本周行动清单 (mandatory, 5-7 items)

```markdown
## ✅ 本周行动清单

> **承诺**：读完本章后 7 天内完成以下 N 件事。

- [ ] **D1** <concrete action 1, with artifact>
- [ ] **D2** <concrete action 2, with artifact>
...
```

**Quality rules**:
- Each item starts with `**D<N>**` so it can be cross-referenced from the Kanban.
- Each item has a **clear "done" condition** — what artifact exists when you tick the box.
- "研究 X" is NOT a D-item. "用 Streamlit 搭一个 demo 并部署到 Vercel" IS.
- 5-7 items. If you have more, batch some into "D7: 上述 6 项之外的" or split across two weeks.

## Section 5 — Self-Test (mandatory, 5-8 questions)

```markdown
## 🧪 Self-Test（闭卷）

> **规则**：用大白话回答，不要背原文。答不出就回去重读。

1. <question>
2. <question>
...
```

**Quality rules**:
- 5-8 questions.
- Open-ended application questions, not "what does the book say about X".
- If the reader can answer in 1 sentence, the question is too easy. Force "tell me a scenario where X applies and what you'd do."

## Section 6 — 关键引用 (mandatory, 5-8 quotes)

```markdown
## 📎 关键引用（速记版）

- 「<quote 1>」
- 「<quote 2>」
...
```

**Quality rules**:
- 5-8 quotes. These are the "memorize me" lines — the things that should stick.
- Each should be **memorable** (rhetorical, surprising, or counter-intuitive) and **load-bearing** (captures a key idea, not a side observation).
- Wrap in 「」 Chinese quotes for visual separation.

## Section 7 — 相关章节 / 资源 (optional but recommended)

```markdown
## 🔗 相关章节 / 资源

- → 第 X 章《...》—— <what it covers that this chapter leads into>
- → 配套练习：<exercise from the book> — 见原书 X.Y 节
```

## Tail — What to AVOID in chapter notes

- ❌ Bullet-listing every sub-section verbatim from the source (that's just copy-paste).
- ❌ Padding "我的理解" with restatements of the quote (you'd be writing the same thing twice).
- ❌ Putting code blocks in 怎么用 when the chapter isn't about code (use templates, checklists, decision trees instead).
- ❌ Self-tests that can be answered by skimming (questions like "what is X?" not "when would you use X over Y?").
- ❌ Missing the date stamp — every note should end with a one-line `> Generated: YYYY-MM-DD from <source path>` for traceability.
