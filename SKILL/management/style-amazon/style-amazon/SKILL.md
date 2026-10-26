---
name: style-amazon
description: "将报告适配 Amazon 叙事文化和 Leadership Principles 框架。Use when writing reports in Amazon style with narrative memos and LP-tagged accomplishments. Triggers on: 'Amazon 风格', 'Amazon style', '亚马逊', 'Leadership Principles', 'LP', '6-pager', 'Forte', '按亚马逊格式写'."
---

# Amazon 汇报风格 (Amazon Reporting Style)

继承 `manage-up-core` 五大原则。本技能将报告适配 Amazon 的叙事写作文化——6-pager 式清晰叙事、Leadership Principles 行为证据、数据先于形容词。

---

## 触发场景

- 用户提到"Amazon 风格"、"亚马逊"、"Amazon style"
- 用户提到"Leadership Principles"、"LP"、"6-pager"、"Forte"
- 用户要求按 Amazon 格式写绩效评估、项目回顾或提案
- 用户背景是 Amazon 或类似 LP 驱动型组织

---

## 必填输入 (Required Inputs)

生成报告前，向用户收集以下信息：

```
To write an Amazon-style report, please provide:

1. **Key accomplishments**: What did you deliver? Be specific about your role.
   e.g., Owned the redesign of the checkout flow, reducing cart abandonment by 12%

2. **Metrics and data**: What are the quantified results?
   e.g., Cart abandonment from 34% to 22%, +$2.3M annualized revenue impact

3. **Leadership Principles demonstrated**: Which LPs did you embody? Give specific situations.
   e.g., Customer Obsession: chose to delay launch by 1 week to fix accessibility issues
   Key LPs: Customer Obsession, Ownership, Invent and Simplify, Bias for Action,
   Dive Deep, Insist on the Highest Standards, Earn Trust, Deliver Results

4. **Challenges and tradeoffs**: What was hard? What tradeoffs did you make?
   e.g., Traded short-term velocity for long-term maintainability — rewrote auth module

5. **Scope and scale**: How big was this? Who was impacted?
   e.g., Affects 50M+ monthly transactions across 3 marketplaces

Skip anything you don't have — I won't fabricate data.
```

---

## 报告模板

### Amazon Accomplishment Block (Forte Review)

```markdown
# [Name] — [Review Period] Accomplishments

## Accomplishment 1: [Name/Title]

**Context**: [Customer/business problem — why this mattered]

**What I did**: [Your specific actions — owned, designed, built, drove, escalated]

**Impact**:
- [Primary metric: from X to Y (Z% improvement)]
- [Secondary metric or business outcome]
- [Scale: N users/transactions/requests affected]

**Leadership Principles**:
- **[LP 1]**: [Specific behavioral evidence from this accomplishment]
- **[LP 2]**: [Specific behavioral evidence]

---

## Accomplishment 2: [Name/Title]

**Context**: [Problem]

**What I did**: [Actions]

**Impact**:
- [Metrics]

**Leadership Principles**:
- **[LP]**: [Evidence]

---

## Accomplishment 3: [Name/Title]

[Same structure]

---

## Growth and Development

**Strengths demonstrated**: [Top 2-3 LPs with evidence pattern]

**Areas for development**: [1-2 LPs to focus on, with specific plan]

**Next period priorities**: [Top goals for the next review cycle]
```

### Amazon Narrative Memo Template (6-pager style)

```markdown
# [Topic/Decision Title]

## Purpose

[One sentence: what decision or alignment this document is seeking]

## Tenets (in order of priority)

1. [Tenet 1 — e.g., "Customer trust over short-term revenue"]
2. [Tenet 2]
3. [Tenet 3]

## Current State

[Factual description of where things stand — data, not opinions]

## Problem / Opportunity

[What's the gap? Why does it matter? Quantify the impact.]

## Proposed Approach

[Clear description of what you recommend and why]

## Alternatives Considered

| Option | Pros | Cons | Why not chosen |
|--------|------|------|---------------|
| [Alt A] | [...] | [...] | [...] |
| [Alt B] | [...] | [...] | [...] |

## Expected Results

[Quantified outcomes if the proposal is adopted]

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| [Risk 1] | [H/M/L] | [description] | [plan] |

## Ask

[What you need from the reader — approval, resources, decision, feedback]

## Appendix

[Supporting data, charts, detailed analysis]
```

---

## 反空话规则 (Anti-Fluff Rules)

Amazon 风格特别禁止以下表达：

| Forbidden | Replace With |
|-----------|-------------|
| Demonstrated strong leadership | Owned [project] end-to-end: scoped, staffed, delivered [result] |
| Customer-focused approach | Chose [action] over [easier alternative] because customer data showed [insight] |
| Collaborated effectively | Drove alignment across [N teams] on [decision], resolved [conflict] by [method] |
| Significant impact | [Metric] improved from X to Y (+Z%), affecting N customers/transactions |
| Drove results | Delivered [specific outcome] by [deadline], [N%] above/below target |
| Took ownership | Identified [problem] proactively, proposed [solution], implemented without being asked |

### Amazon 风格核心要求

1. **Narrative, not bullets**: Amazon values clear prose over slide decks. Write complete sentences that build an argument.
2. **Numbers over adjectives**: "significant" and "substantial" are banned. Use the actual number.
3. **LP-tagged evidence**: Every accomplishment should map to 2-3 LPs with behavioral evidence, not just LP name-drops.
4. **State the ask early**: If you need a decision, say so in the first paragraph. No mystery tours.
5. **Tradeoffs are valued**: Show what you chose NOT to do and why — this demonstrates Ownership and judgment.
6. **Customer backward**: Start from the customer impact and work backward to what you built.
7. **Mechanisms over heroics**: Amazon values repeatable processes. Show the systems you built, not just the fires you fought.

---

## 质量检查

生成后自查：

- [ ] Does each accomplishment have a clear Context → Action → Impact structure?
- [ ] Are all metrics quantified with before/after values?
- [ ] Are Leadership Principles cited with specific behavioral evidence (not just named)?
- [ ] Is the narrative clear, linear, and free of jargon?
- [ ] Are tradeoffs explicitly stated?
- [ ] Is the ask/decision needed stated early and clearly?
- [ ] Does the writing use numbers instead of adjectives?
- [ ] Is there evidence of mechanisms (repeatable processes) vs one-time heroics?
