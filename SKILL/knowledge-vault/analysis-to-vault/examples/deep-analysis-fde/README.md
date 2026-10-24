# Worked Example · Deep Analysis of FDE

> This folder is the **canonical reference** for what good output of the
> `analysis-to-vault` skill looks like. It contains the actual artifacts
> produced by running the skill on the long-form analytical article:
>
> - 《深度解析 FDE：年薪百万的「数据特种兵」如何打通 AI 落地最后一公里》
> - Source: `深度解析+FDE：年薪百万的「数据特种兵」如何打通+AI+落地最后一公里.docx`
> - Generated on 2026-08-08 from
>   `C:\Users\yuhang\Downloads\AIDev\FDE_AI时代前沿部署工程师\`

## Files in this example

| File | What it shows |
|------|---------------|
| `notes/deep-analysis-fde.md` | Thesis + 10 arguments + 11 data points + day-job implications + open questions |
| `_raw/深度解析FDE.md` | Scratch file produced by `extract_docx.py` (Step 1 of the playbook) |

The cheatsheet / kanban / mindmap updates live in the user's vault
(`FDEAI产品经理学习/notes/`, `kanban/`, `mindmap/`) and are described in
the "How this integrates with the existing vault" section below.

## How this example was produced (the 6-step playbook)

1. **Extract** — `python ../book-chapter-to-vault/scripts/extract_docx.py <src> _raw/`
2. **Read once for the central thesis** — wrote: "AI 落地的失败率高达 95%（MIT 2025），不是因为模型不够强，而是因为缺少'能把模型能力嵌入真实业务流程的人'。FDE 就是这个角色。"
3. **Build the argument map** — 10 load-bearing arguments, 2 decorative (dropped)
4. **Extract key data points** — 11-row table (薪酬 / 风险 / 案例 / 效率 / 人才 / 中国)
5. **Write the per-article note** — used `references/article-template.md` as scaffold
6. **Inject into cheatsheet / kanban / mindmap** — used `references/cheatsheet-extension.md`

## How this example differs from the book-chapter example

| Aspect | book-chapter-to-vault example (ch2-4) | analysis-to-vault example (this one) |
|--------|--------------------------------------|--------------------------------------|
| Source shape | 3 textbook chapters with sub-sections | 1 long essay with 1 thesis + 10 sections |
| Decomposition unit | 5-7 "concepts" per chapter | 1 central thesis + 10 "arguments" |
| Per-unit template | 金句 → 我的理解 → 怎么用 → 复述题 | 原文 → 我的解读 → 论据/数据 → Day-job 启示 |
| Cheatsheet | 3 chapter sections (🟢🟡🔴) | 1 article section (🔵) |
| Kanban D-items | 5-6 per chapter (operational) | 5 per article (strategic) |
| Day-job section | Generic pointers | Specific to user's LLM-on-Mac day-job |

## How this integrates with the existing vault

After running the skill on this article, the following changes were made to `FDEAI产品经理学习/`:

- **`notes/cheatsheet-all.md`**: added a 4th section (🔵 深度解析) + updated the 一页纸心法 to 4 sentences
- **`kanban/kanban.md`**: added a "🆕 深度解析《FDE 数据特种兵》衍生" sub-section to Backlog with 5 D-items + 1 new Done entry
- **`mindmap/技能树.md`**: extended the "📘 FDE 实战圣经" branch with a new sub-branch containing the article's 10 arguments as leaf nodes

## How to reproduce

```bash
# 1. Extract
python ../book-chapter-to-vault/scripts/extract_docx.py <src> _raw/

# 2-5. (Manual, using the reference templates)
# - Read once for central thesis (references/argument-map-template.md)
# - Build argument map (load-bearing vs decorative)
# - Extract data points into a table
# - Write the per-article note (references/article-template.md)

# 6. (Manual, using the reference templates)
# - Extend cheatsheet (references/cheatsheet-extension.md)
# - Extend kanban (use book-chapter-to-vault's kanban-injection-template as a starting point)
# - Extend mindmap (use book-chapter-to-vault's mindmap-extension-template as a starting point)
```

## What this example teaches about the skill

- **The 10-argument sweet spot** — long essays can produce more arguments than chapters. 10 is the upper limit; beyond that, cluster weak ones.
- **The data table is a citation index** — the 11-row table is what the user will reference when citing the article later, not just a one-time read artifact.
- **The day-job section is what makes the note actionable** — the "对 Day-Job 的启示" section ties 5 of the article's arguments to the user's actual LLM-on-Mac work. Without this, the note is a summary; with it, it's a working document.
- **Open Questions are the next-reading list** — the 6 questions in "待探索的问题" became a reading roadmap (e.g. find the MIT 2025 report, compare Ontology to Data Mesh).
- **The "↔ other notes" section prevents isolated knowledge** — by linking to ch2/3/4, the article becomes part of a lattice, not a standalone summary.

## When NOT to copy this example

- The article is in a different domain (e.g. PM trends, not FDE) — the 4 cross-references to ch2/3/4 won't apply. Use the templates in `references/` instead.
- The article has no clear thesis (e.g. a pure survey or listicle) — the central-thesis discipline won't work. Downgrade to a "summary" structure.
- The user has no specific day-job — the "对 Day-Job 的启示" section will be generic. Either ask for context or skip the section.
