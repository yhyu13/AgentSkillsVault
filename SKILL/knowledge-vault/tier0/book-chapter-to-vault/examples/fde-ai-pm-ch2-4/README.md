# Worked Example · FDE × AI PM Book · Chapters 2-4

> This folder is the **canonical reference** for what good output of the
> `book-chapter-to-vault` skill looks like. It contains the actual artifacts
> produced by running the skill on:
>
> - 《FDE · AI 时代前沿部署工程师》第二章：快速原型——两周交付 MVP
> - 第三章：最后一公里——部署的艺术
> - 第四章：与客户并肩作战
>
> Generated on 2026-08-08 from `C:\Users\yuhang\Downloads\AIDev\FDE_AI时代前沿部署工程师\`.

## Files in this example

| File | What it shows |
|------|---------------|
| `notes/ch02-mvp-2weeks.md` | 5 concepts · 5 anti-patterns · 5 D-items · 5 self-tests · 5 key quotes |
| `notes/ch03-deployment-last-mile.md` | 6 concepts · 8 anti-patterns · 6 D-items · 6 self-tests · 5 key quotes |
| `notes/ch04-customer-engagement.md` | 7 concepts · 8 anti-patterns · 6 D-items · 8 self-tests · 8 key quotes |
| `notes/cheatsheet-all.md` | One A4 page, all 3 chapters compressed into scannable form |
| `kanban.md` | The Logseq kanban extended with 3 new sub-sections in Backlog, 1 in In Progress, 1 in Done, 1 quarterly goal |
| `技能树.md` | The Markmap source extended with 3 new `🆕` sub-branches + 1 new top-level `📘 FDE 实战圣经` branch |
| `_raw/*.md` | Scratch files produced by `scripts/extract_docx.py` (Step 1 of the playbook) — kept here so the full pipeline is reproducible |

## How this example was produced (the 6-step playbook)

1. **Extract** — `python scripts/extract_docx.py <src> .reference/_raw/` — produced 3 .md scratch files
2. **Read** — identified 5-7 core concepts per chapter
3. **Anti-patterns** — pulled explicit anti-patterns from the source + inferred "do/don't" contrasts
4. **Action items** — generated 5-7 `D1...DN` items per chapter
5. **Notes** — wrote per-chapter notes using `references/chapter-template.md`
6. **Inject** — extended kanban + mindmap using the corresponding reference templates

## How to reproduce

The source directory had 19+ `.docx` files (multiple FDE-book editions). For this
worked example, we processed only the **3 files the user asked for** (FDE book
ch2-4). To reproduce, narrow the source to those files first.

```bash
# 1. Create a sub-folder with just the 3 chapters
mkdir ch2-4 && cp "C:/Users/.../第二章：快速原型——两周交付MVP.docx" ch2-4/ && \
  cp "C:/Users/.../第三章：最后一公里——部署的艺术.docx" ch2-4/ && \
  cp "C:/Users/.../第四章：与客户并肩作战.docx" ch2-4/

# 2. Extract chapter text
python scripts/extract_docx.py ch2-4 _raw/

# 3. Read the .md files, identify 5-7 core concepts per chapter (manual)
# 4. Pull anti-patterns from the source (manual)
# 5. Generate action items (manual)

# 6. Write per-chapter notes (manual, using the template)
# Output → notes/ch<NN>-<slug>.md

# 7. Extend kanban + mindmap (manual, using the templates)
# Output → kanban.md, 技能树.md

# Optional: render the cheatsheet to A4 PDF
python scripts/render_cheatsheet.py notes/cheatsheet-all.md
# → notes/cheatsheet-all.print.html
# → notes/cheatsheet-all.pdf  (if weasyprint or pdfkit is installed)
```

## What this example teaches about the skill

- **The 5-7 concept count is the sweet spot** — ch4 has 7 (it's a wide chapter), ch2 has 5 (it's a focused one). Both feel right.
- **D-items are the bridge** — every D-item in the note appears as a `- [ ]` in the kanban. If the note has 6 D-items, the kanban gets 6 new entries.
- **The cheatsheet regenerates** — don't append, overwrite. If a chapter adds too much, demote to the per-chapter note.
- **The mindmap gets a new branch per distinct book** — the FDE book is distinct from generic PM books, so it got its own `📘 FDE 实战圣经` top-level branch.

## When NOT to copy this example

- The book is not the FDE book — the FDE-specific sections in the cheatsheet won't apply. Use the templates in `references/` instead.
- The user wants a different output structure (e.g. Anki cards, Obsidian Canvas) — that's a different skill.
- The user wants to publish the summary publicly — use `wechat-article-pack` instead.
