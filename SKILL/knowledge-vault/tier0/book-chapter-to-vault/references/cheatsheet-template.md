# Cheatsheet Template

> One file per book (or per learning track): `notes/cheatsheet-all.md`.
> **Hard constraint**: must fit on one A4 page printed (3,000-4,000 Chinese characters).
> **Regenerate** (not append) after each new chapter. If a chapter adds too much, demote the less critical items to the per-chapter note.

---

## File header

```markdown
# <Book Name> 学习速查卡 · <Subtitle>

> **用法**：<where to put it — printed A4 / phone memo / desktop sticky>
>
> **来源**：<full book title + edition>
>
> **覆盖章节**：Ch X-Y（共 N 章）
```

## Per-chapter section

```markdown
## 🟢 第 X 章 · <Chapter Title>

### 黄金法则
- <3-5 load-bearing principles from this chapter>

### <Sub-topic 1>
- <key terms or commands or templates>

### <Sub-topic 2>
- <key terms or commands or templates>
```

**Quality rules**:
- 1 emoji-prefixed H2 per chapter (🟢🟡🔴 for ch1-3, 🟣🟠🔵 for ch4-6, etc — pick a scheme and stick to it).
- Each chapter section should be 200-400 characters. If longer, you're dumping the note, not summarizing.
- **Tables** (1-2 per chapter) are OK if they compress content. Long prose is NOT OK.
- The cheatsheet's job is to **trigger recall**, not to teach. If the reader needs to re-read the note, the cheatsheet did its job.

## Tail — 一页纸心法 (mandatory)

```markdown
## 🎯 一页纸心法（<Book> 终极三句话）

> **第 X 章**：<one-sentence essence>
>
> **第 Y 章**：<one-sentence essence>
>
> **第 Z 章**：<one-sentence essence>
```

This is the **last line of defense** — if the reader reads nothing else, they read this.

## What to AVOID

- ❌ Exceeding 4,000 characters. If you do, the cheatsheet is no longer a cheatsheet.
- ❌ Including code blocks longer than 5 lines. If you need that, link to the per-chapter note.
- ❌ Quoting entire paragraphs from the source. 1-2 lines max per quote.
- ❌ Mixing languages mid-sentence. Cheatsheets are for fast scanning — code-switching kills scannability.
- ❌ Forgetting the date stamp at the bottom:
  ```markdown
  ---
  > Generated: 2026-08-08 from <source path>
  > Last updated: 2026-08-08 (added ch3 + ch4)
  ```
