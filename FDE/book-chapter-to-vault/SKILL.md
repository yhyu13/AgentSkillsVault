---
name: book-chapter-to-vault
description: Convert a book chapter delivered as .docx (one chapter per file) into a personal learning vault — one chapter-summary note per chapter, one consolidated cheatsheet, and (optionally) updates to an existing Kanban board and mindmap. Use when the user says "读 .docx 章节做学习笔记", "把书拆成学习材料", "做一份 X 章的速查卡", "把这几章做成可复习的笔记", or names this skill directly. Also use when the user wants to digest a personal-development book (FDE / PM / engineering-leadership / sales / career) into actionable structure. Do NOT use for: converting books to ePub/PDF (use `pdf` or `docx`), drafting a single Markdown note from prose (use the user's preferred writing skill), summarizing a paper (use a paper skill), or building a study system around a non-textbook source (videos, podcasts).
version: 1.0.0
platforms: [linux, macos, windows]
environments: [claude-code, hermes]
metadata:
  hermes:
    tags: [learning, knowledge-management, docx, notes, cheatsheet]
    related_skills: [kanban-orchestrator, source-tracker]
---

# Book Chapter → Vault

> One chapter in, four artifacts out: **per-chapter learning note** + **consolidated cheatsheet** + **Kanban task injection** + **mindmap extension**. Designed for personal-development books (FDE / PM / career / engineering-leadership) delivered as `.docx`.

## When to use this skill

Load this skill when the user wants to:

- Read a book delivered as multiple `.docx` files and turn each chapter into a **structured learning note** (concepts, anti-patterns, action items, self-test).
- Produce a **one-page cheatsheet** that compresses the whole book into a printable A4 / phone-friendly reference.
- Push **backlog tasks** into an existing Kanban board (e.g. Logseq / Obsidian / GitHub Projects format) derived from the chapter's action items.
- Extend an existing **skill tree / mindmap** with new branches sourced from the chapter content.
- Repeat the workflow for multiple books in the same series (the FDE book has 13 chapters — this skill handles any subset).

## When NOT to use this skill

- The source is a **PDF / EPUB / web article** — convert first, or use a different skill.
- The user wants a **single Markdown note from prose** with no structure (just write the note).
- The user wants to **summarize a research paper** (use a paper-reader skill).
- The user wants **book club discussion** rather than personal-study artifacts.
- The user wants to **publish the summary publicly** as a WeChat article or blog post (use `wechat-article-pack`).

## Inputs

Before starting, confirm with the user (or infer from the file layout):

1. **Source directory** containing one or more `.docx` files, one per chapter.
2. **Output directory** (a personal "learning vault" folder). If not specified, use the user's working vault (e.g. `~/Documents/LearningVault/<book-name>/`).
3. **Existing artifacts to extend** (optional):
   - Kanban file path (e.g. `kanban/kanban.md` in Logseq format).
   - Mindmap file path (e.g. `mindmap/技能树.md` in Markmap format).
4. **Scope** — is it one chapter, several, or the whole book? Default: all `.docx` files in the source directory.
5. **Output naming convention** — e.g. `ch02-mvp-2weeks.md`. Default: `ch<NN>-<slugified-title>.md`.

## Outputs

For a single chapter the skill produces:

```
<vault>/
├── notes/
│   ├── ch<NN>-<slug>.md            # per-chapter learning note
│   └── cheatsheet-all.md           # consolidated cheatsheet (re-generated each chapter)
├── kanban/
│   └── kanban.md                   # extended with new tasks (if user has one)
└── mindmap/
    └── 技能树.md                    # extended with new branches (if user has one)
```

Each artifact has a fixed structure — see the reference templates in `references/`.

## The 6-step playbook

### Step 1 — Extract chapter text

Run `scripts/extract_docx.py` (or your existing docx extractor) to convert each `.docx` to a plain `.md` scratch file under `.reference/_raw/`. Keep these for traceability.

If `python-docx` isn't available, the script falls back to reading `word/document.xml` from the `.docx` ZIP. See `scripts/extract_docx.py` for the implementation.

**Validation**: each scratch file should have H1 = chapter title, H2/H3 = section headings, body = paragraphs. Drop empty paragraphs. Preserve code blocks (the `python-docx` default may not; the fallback XML parser does).

### Step 2 — Read the chapter, identify 5-7 core concepts

For each chapter, find the **5-7 most important concepts** (not all sub-sections — just the load-bearing ones). For each, write:

1. **原文金句** — the verbatim quote that captures the idea.
2. **我的理解** — your own re-statement in plain language.
3. **怎么用** — concrete application (code snippet, template, command, or workflow).
4. **复述题** — a one-line self-test question (the "Feynman test").

If the chapter has ≤ 4 sub-sections, merge adjacent ones. If it has ≥ 8, cluster into ≤ 7 concepts.

### Step 3 — Identify anti-patterns (5-8 rows)

Every chapter should have a table of **anti-patterns / 常见坑** with columns: 坑 | 表现 | 危害 | 破解.

This is the **"what NOT to do" half** of the note — equally important to the concepts.

### Step 4 — Generate action items (5-7 per chapter)

For each chapter, write a **本周行动清单** (this week's action list) with 5-7 concrete, executable items prefixed with `D1`...`D7`. Each item must be:

- **Concrete** — not "study X" but "write a Dockerfile using the python:3.11-slim template".
- **Time-bounded** — "this week" not "eventually".
- **Verifiable** — has a clear "done" condition.

These action items are exactly what gets injected into the Kanban in Step 6.

### Step 5 — Write the per-chapter note

Use `references/chapter-template.md` as the template. Structure:

```markdown
# 第 X 章 · <Title>

> 章节目录 + 用时 + 目标（一段话）

## 📑 章节地图
| 小节 | 主题 | 关键词 |

## 🧠 核心概念（5-7 段）
### 概念 1 · <Name>
> 原文金句
**我的理解**：...
**怎么用**：...
**复述题**：...

## 🚫 反模式 / 常见坑
| 坑 | 表现 | 危害 | 破解 |

## ✅ 本周行动清单
- [ ] D1 ...
- [ ] D2 ...

## 🧪 Self-Test（闭卷）
1. ...
2. ...

## 📎 关键引用（速记版）
- 「...」
- 「...」

## 🔗 相关章节 / 资源
- → ...
```

### Step 6 — Inject into Kanban + mindmap (if existing)

**Kanban injection** (`references/kanban-injection-template.md`):
- For each chapter, add a new sub-section under **Backlog** named `🆕 第 X 章《...》衍生（<date> 增）`.
- Move the D1 from the action list to **In Progress** if the user is starting it now.
- Add an entry to **Done**: `读完第 X 章，生成结构化学习笔记 + 速查卡` (on the day the user finishes reading).

**Mindmap extension** (`references/mindmap-extension-template.md`):
- Find the top-level branch that matches the chapter's domain (e.g. "客户交付" for FDE chapter 4).
- Add a new `🆕 <sub-topic>` sub-branch with the chapter's key concepts as leaf nodes.
- If the book is from a distinct tradition (e.g. FDE book is distinct from generic PM books), add a new top-level branch `📘 <Book Name>` with one sub-node per chapter.

### Step 7 — Maintain the cheatsheet

After processing each chapter, **regenerate** `notes/cheatsheet-all.md` from scratch. Don't append — the cheatsheet is meant to be a single A4 page. If a chapter adds too much new content, demote less critical items to the per-chapter note.

Use `references/cheatsheet-template.md` for the format.

## Quality bar (acceptance criteria)

Before declaring the work done, verify:

- [ ] Every chapter has its own `.md` file under `notes/`.
- [ ] Each note has 5-7 core concepts with all 4 parts (quote / understand / apply / test).
- [ ] Each note has 5-8 anti-patterns in the table.
- [ ] Each note has 5-7 action items prefixed `D1`...`D7`.
- [ ] Each note has 5-8 self-test questions.
- [ ] The consolidated cheatsheet fits in one A4 page (~3,000-4,000 Chinese characters).
- [ ] The Kanban has new `🆕` subsections matching each processed chapter.
- [ ] The mindmap has either a new sub-branch or a new top-level branch reflecting the chapter's domain.
- [ ] The note's "我的理解" section is in **your own words**, not paraphrased copy of the source.
- [ ] All "原文金句" are verbatim quotes from the source (with quote marks).

## Reusability — what makes this skill portable

- **The chapter template is domain-agnostic.** It works for FDE, PM, engineering-leadership, sales, career books. The "5-7 core concepts" pattern is from active-recall pedagogy.
- **The extract_docx script is reusable** for any .docx source — just point it at a new directory.
- **The cheatsheet template scales**: 3 chapters fit on one A4, 13 chapters need a "cheatsheet-all" + per-chapter cheatsheets.
- **The Kanban injection pattern is format-agnostic** — Logseq Kanban, Obsidian Kanban, GitHub Projects all support the same `[ ]` checkbox syntax.

## Known limitations

- **Code blocks in .docx** are sometimes lost by `python-docx`'s default paragraph iterator. The skill's script falls back to the XML parser, but image-embedded code won't be recovered.
- **Tables in .docx** (like the 4-row environment table in FDE ch3) get converted to indented text — manual cleanup may be needed.
- **Headings beyond H3** are flattened to bold text. If the source uses H4+ heavily, post-process manually.
- **The "FDE 实战圣经" branch in the mindmap** is specific to one book. For a different book, use the book name in the branch title.

## Worked example

See `examples/fde-ai-pm-ch2-4/` for the actual output of running this skill on the FDE book chapters 2-4. Three notes, one cheatsheet, an updated Kanban, and an extended mindmap. This is the canonical reference for "what good output looks like."

## Reference index

- `references/chapter-template.md` — per-chapter note template
- `references/cheatsheet-template.md` — consolidated cheatsheet format
- `references/kanban-injection-template.md` — how to extend an existing Logseq/Obsidian Kanban
- `references/mindmap-extension-template.md` — how to extend an existing Markmap mindmap
- `scripts/extract_docx.py` — the .docx → .md extractor (python-docx + XML fallback)
- `scripts/render_cheatsheet.py` — optional: render the cheatsheet to A4 PDF or HTML
- `examples/fde-ai-pm-ch2-4/notes/` — the actual output of running this skill on FDE ch2-4
