---
name: analysis-to-vault
description: Convert a long-form analytical article (行业分析/深度解析/editorial/essay) delivered as .docx (or already extracted .md) into a structured learning note + compressed cheatsheet + Kanban task injection + mindmap extension. Use when the user says "把这篇行业长文做成学习笔记", "分析报告拆解", "深度解析 + 笔记", "做一份 X 文章的论点地图", or names this skill directly. Also use for: 行业研究 / 趋势分析 / 公司研究 / 人物长文 / 任何 thesis-driven 文本. Do NOT use for: book chapters (use `book-chapter-to-vault`), research papers (use a paper-reader skill), short blog posts (just write the note directly), WeChat articles (use `wechat-article-pack`).
version: 1.0.0
platforms: [linux, macos, windows]
environments: [claude-code, hermes]
metadata:
  hermes:
    tags: [learning, knowledge-management, docx, analysis, essay, argument-map]
    related_skills: [book-chapter-to-vault]
---

# Analysis Article → Vault

> One long-form analytical article in, four artifacts out: **thesis-and-arguments note** + **compressed cheatsheet** + **Kanban task injection** + **mindmap extension**. Designed for 行业长文 / 深度解析 / editorial / 公司研究 that argues a thesis rather than teaching procedures.

## When to use this skill (and when NOT to)

### Use this skill when the source is:

- **行业分析长文** (e.g. "深度解析 FDE 数据特种兵") — argues a thesis with multiple supporting sections
- **Editorial / opinion piece** — has a clear stance, not neutral reporting
- **Company deep-dive** — Palantir / OpenAI / Anthropic-style essays
- **Person profile / founder story** — argues "this person is interesting because X"
- **Trend analysis** — argues "AI/产业 is shifting in direction Y"
- **Research summary** — not a paper, but a journalist's synthesis of multiple findings

### Do NOT use this skill when:

- The source is a **book chapter** (use `book-chapter-to-vault` — that skill assumes "金句 → 复述题" structure)
- The source is a **research paper** (use a paper skill)
- The source is a **short blog post / Twitter thread** (just write the note directly)
- The user wants a **public-facing summary** (use `wechat-article-pack` for WeChat, or just write the summary)
- The source is **purely descriptive** with no thesis (e.g. a how-to tutorial — that's a chapter, use the other skill)

## How this skill differs from `book-chapter-to-vault`

| Aspect | book-chapter-to-vault | analysis-to-vault |
|--------|----------------------|-------------------|
| Source shape | Structured chapter with sub-sections | Long essay with 1 thesis + N arguments |
| Decomposition unit | "Concept" (5-7 per chapter) | "Argument" (1 thesis + 6-10 supporting) |
| Per-unit template | 金句 → 我的理解 → 怎么用 → 复述题 | 原文 → 我的解读 → 论据 / 数据 → 与 day-job 关联 |
| End-of-note section | "Self-Test" questions | "Open Questions" + "Day-Job Implications" |
| Cross-reference style | "→ 第 X 章《...》" | "呼应论点 2 / 3 / 7 of the article" |
| Cheatsheet tone | Tables + command lines | Tables + key data points + the 1 central thesis |
| Action items | Operational D-items (do this week) | Strategic D-items (this quarter's direction) |

The two skills share the same philosophy (active recall, scannable, kanban/mindmap integration) but have different decomposition templates because chapters and essays have different information shapes.

## Inputs

Before starting, confirm with the user:

1. **Source path** — `.docx` or already-extracted `.md`
2. **Output directory** — the personal learning vault
3. **Existing artifacts to extend** — kanban + mindmap paths (optional)
4. **Day-job context** (CRITICAL) — unlike a generic book chapter, analytical articles need a "what does this mean for YOU" pass. Ask the user: "What's your main work focus? I'll tailor the day-job implications section to that."

## Outputs

For a single article, the skill produces:

```
<vault>/
├── notes/
│   ├── <slug>.md              # per-article thesis-and-arguments note
│   └── cheatsheet-all.md      # regenerated, one A4 page
├── kanban/kanban.md           # extended with new sub-section in Backlog
└── mindmap/技能树.md          # extended with new branch
```

## The 6-step playbook

### Step 1 — Extract

Use the same `extract_docx.py` from `FDE/book-chapter-to-vault/scripts/`. Long essays usually have fewer headings than chapters, so headings may be sparse — that's OK, you'll be decomposing by **argument**, not by sub-section.

### Step 2 — Read once for the central thesis

Read the whole thing once (or skim 3 randomly-chosen sections) and write down **one sentence** that captures the article's central thesis. If you can't, the article probably doesn't have a clear thesis — either ask the user "what's the takeaway you want me to extract?" or downgrade the source to a "summary" rather than a "thesis-driven note."

A good central thesis has:
- A **claim** (not a topic)
- A **subject** (the entity being claimed about)
- An **implication** (why the claim matters)

Examples:
- ❌ "This article is about FDE" (topic, not thesis)
- ✅ "FDE exists because 95% of AI projects fail at the integration step, and FDE is the role that fills that gap" (claim + subject + implication)

### Step 3 — Build the argument map (6-10 arguments)

For each main section, identify:

- **What claim does this section make?** (1 sentence)
- **What evidence supports it?** (data, case study, quote from expert, comparison)
- **Is this argument load-bearing or decorative?** (load-bearing = removing it would break the thesis; decorative = nice to have but the thesis stands without it)

If the article has < 6 load-bearing arguments, you may have misidentified the thesis. If > 10, look for clusters — 3 arguments that all support the same super-claim should be one argument with sub-points.

For each argument, write to your draft:

```
论点 N · <Argument name>
> 原文：「<the actual claim, in the source's words>」
我的理解：<1-3 sentences in your own words>
论据 / 数据：<the evidence, with attribution>
呼应论点：<how it relates to other arguments in this article>  (optional)
Day-job 启示：<1 sentence on what this means for the user>
```

### Step 4 — Extract key data points

Make a single table of **all data points, names, and concrete facts** mentioned in the article. This is the "citation index" — the user will use it later when citing the article in their own work.

Format:

| 类别 | 数据 / 事实 | 来源 / 上下文 |
|------|-------------|---------------|
| 💰 薪酬 | +25-40% 溢价 | Bloomberry 1000 个美国职位分析 |
| ⚠️ 风险 | 95% AI 项目失败 | MIT 2025 报告 |
| 🏭 案例 | 换线 5 款/日 → 300 款/日 | 上海 FDE 案例 |

5-15 rows. If a fact is decorative, drop it. If a fact is load-bearing (the argument falls apart without it), keep it and **bold it**.

### Step 5 — Write the per-article note

Use `references/article-template.md` as the template. Structure:

```markdown
# <Article Title>

> 中心论点（1 句话）

## 📑 文章地图
| 节 | 主题 | 关键产出 |

## 🧠 核心论点（N 个）
### 论点 1 · <Name>
> 原文
我的理解
论据 / 数据
Day-job 启示

## 📊 关键数据 / 事实表

## 🔄 与其他材料的呼应

## 💡 对 Day-Job 的启示

## ❓ 待探索的问题（Open Questions）

## 🧪 Self-Test

## 📎 关键金句

## 🔗 相关章节 / 资源
```

### Step 6 — Inject into cheatsheet / kanban / mindmap

**Cheatsheet**: extend with a new section. Use the **compressed** version — not the full note. If the cheatsheet is already 4000+ chars, demote less critical points to the per-article note.

**Kanban**: add a new sub-section `🆕 <article title> 衍生（<date> 增）` with 3-5 D-items. D-items for analytical articles are **strategic** (this quarter) not **operational** (this week). E.g.:
- "Find the MIT 2025 95% report and read it"
- "Build a minimal Ontology layer for current POC"
- "Audit my last 3 POCs against the 'quantified metric' rule"

**Mindmap**: extend the existing branch with a new sub-branch. For FDE-related content, the branch goes under `📘 FDE 实战圣经` (or create a new top-level if the article is from a different tradition).

## Quality bar (acceptance criteria)

- [ ] The central thesis is **one sentence** with a clear claim + subject + implication.
- [ ] The argument map has 6-10 load-bearing arguments (not all sub-sections — cluster weak ones).
- [ ] Each argument has evidence attribution (which source/quote/data supports it).
- [ ] The data table has 5-15 entries with category + fact + source.
- [ ] The "Day-job implications" section is **specific to the user** (not generic advice).
- [ ] The "Open Questions" section lists 3-6 things the article raised but didn't answer.
- [ ] The cheatsheet fits in one A4 page (≤ 4000-4500 chars).
- [ ] The kanban D-items are **strategic** (not operational — those are chapter-style).
- [ ] The mindmap branch is in the right place (matches the article's domain).
- [ ] The note's "我的理解" / "Day-job 启示" is in **your own words**, not paraphrased.

## Reusability — what makes this skill portable

- **The article template is domain-agnostic.** Works for tech industry analysis, business essays, founder profiles, trend pieces.
- **The thesis-extraction discipline is the most valuable habit** — once you force yourself to write the central thesis in one sentence, the rest of the analysis organizes itself.
- **The argument map generalizes** — any "X is happening because Y" essay maps to the same template.
- **The data table is a citation index** — use it for any future writing that cites this article.

## Known limitations

- **Opinion-heavy articles** (e.g. "Why X is the future") may have thin evidence — the data table will be sparse. That's OK, note it and downgrade the "Day-job 启示" to "this is a strong opinion, treat as a hypothesis."
- **Multi-author articles or panel-style essays** may not have a single thesis — fall back to a "summary of positions" structure instead of a thesis-and-arguments structure.
- **Articles in a foreign language with domain jargon** (e.g. "Transformer 的涌现能力") may need a glossary in the note. Add a 5-10 row "术语表" if needed.
- **The day-job section requires user input.** Unlike chapters, where day-job 启示 can be generic, analytical articles need a specific user context to be useful. Always ask before writing this section.

## Worked example

See `examples/deep-analysis-fde/` for the actual output of running this skill on the article "深度解析 FDE：年薪百万的'数据特种兵'如何打通 AI 落地最后一公里". This is the canonical reference for "what good output looks like."

The example demonstrates:
- A clear 1-sentence central thesis (95% AI 项目失败 → 缺翻译的人 → FDE 存在)
- 10 arguments mapped to the article's 10 sections (with some clustering where appropriate)
- 11-row data table (薪酬/风险/案例/效率/人才/中国)
- Day-job implications section tailored to the user's "LLM-on-Mac" day-job context

## Reference index

- `references/article-template.md` — the per-article note template
- `references/argument-map-template.md` — the thesis + argument decomposition template
- `references/cross-reference-template.md` — how to link this article to other notes in the vault
- `references/cheatsheet-extension.md` — how to extend the existing cheatsheet
- `examples/deep-analysis-fde/notes/` — the actual output of running this skill

## Dependency

- Reuses `../book-chapter-to-vault/scripts/extract_docx.py` for the .docx → .md extraction. No additional scripts needed.
