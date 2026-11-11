# Cheatsheet Extension Template

> How to extend the existing one-page cheatsheet with content from a new analytical article. Hard constraint: the cheatsheet must stay ≤ 4500 chars (one A4 page at 10pt font).

---

## When to add a new section to the cheatsheet

**Yes, add it when:**
- The article introduces a **new central concept** not in the existing cheatsheet
- The article provides a **key data point** that the user will cite later
- The article has a **2-3 step framework** that compresses well into a table
- The article's thesis can be expressed in **1-2 lines** that change how the user thinks

**No, don't add it when:**
- The article merely elaborates on an existing section (demote to the per-article note)
- The article is from a different domain and doesn't connect to the existing cheatsheet's topic (create a separate cheatsheet for it)
- The article would push the cheatsheet over 4500 chars even with aggressive compression

## How to format the new section

```markdown
## 🔵 <Article title — compressed>

### 中心论点
**1-sentence thesis**

### <Sub-section 1>
- bullet
- bullet

### <Sub-section 2>
1. step 1
2. step 2
3. step 3

### 关键数据（速记）
- data 1 · data 2 · data 3
```

**Quality rules**:
- 1 emoji-prefixed H2 (🟢🟡🔴🟣🟠🔵) — pick a new color if all used
- 4-7 sub-sections (中心论点 + 2-4 framework sub-sections + 数据/应用)
- Each sub-section is 1-5 lines. Not paragraphs.
- Use tables for 3+ parallel items. Use bullets for 2-3 items. Use a 1-liner for 1 item.

## What to drop first (compression rules)

If the cheatsheet is over 4500 chars after adding the new section, drop in this order:

1. **Decorative data points** — facts that don't drive any argument
2. **"Day-Job 应用" sub-section** — move to the per-article note
3. **"Open Questions"** — move to the per-article note
4. **Tables → bullets** — bullets compress better
5. **Examples** — drop concrete examples, keep the abstract rule
6. **Sub-section labels** — combine adjacent sub-sections
7. **Aesthetic separators** (---, emojis) — drop

The **non-negotiable core** is: **central thesis + 1 framework + 3-5 key data points**. If you have those, the cheatsheet is useful.

## Worked example

The deep-analysis-fde article was added as the 4th section to the existing FDE cheatsheet. The compression:

**Original article note (in vault):** ~14,000 chars, 10 arguments, 11 data points, 5 day-job implications, 6 open questions, 8 self-test questions, 8 key quotes

**Final cheatsheet section:** ~800 chars:
- 1 central thesis
- 6 framework sub-sections (Echo+Delta, 5天Bootcamp, Ontology, FDE≠咨询, AI 时代, Day-Job)
- 1 data line (6 facts compressed)
- 1 day-job line (4 rules compressed)

What was dropped from the cheatsheet (and lives in the per-article note):
- The 8 key quotes
- The 8 self-test questions
- The 5 open questions
- Most of the per-argument detail
- The cross-reference table

## Final cheatsheet structure

The cheatsheet should have:
- 1 file header
- N sections (one per source — chapter or article)
- 1 "一页纸心法" (one-sentence essence) section at the end

If you have > 5 sections, consider **splitting the cheatsheet** into per-source cheatsheets (e.g. `cheatsheet-fde.md`, `cheatsheet-pm.md`) and a master `cheatsheet-all.md` that just lists the one-sentence essences.
