---
name: style-google
description: "将报告适配 Google OKR 和 GRAD 绩效评估风格。Use when writing reports in Google style with outcome-based OKRs and impact narratives. Triggers on: 'Google 风格', 'Google style', 'Google OKR', 'GRAD', 'Google 绩效', 'Google self-review', '按谷歌格式写'."
---

# Google 汇报风格 (Google Reporting Style)

继承 `manage-up-core` 五大原则。本技能将报告适配 Google 的 OKR 体系和 GRAD 绩效框架——强调 outcome-based KRs、stretch goals 和 impact 叙事。

---

## 触发场景

- 用户提到"Google 风格"、"Google style"、"谷歌"
- 用户提到"Google OKR"、"GRAD"、"peer feedback"
- 用户要求按 Google 格式写 OKR、self-review 或 impact narrative
- 用户背景是 Google 或类似 OKR 驱动的外企

---

## 必填输入 (Required Inputs)

生成报告前，向用户收集以下信息：

```
To write a Google-style report, please provide:

1. **Your OKRs**: What are your quarterly Objectives and Key Results?
   e.g., O: Improve search relevance → KR1: Increase click-through rate from 32% to 38%

2. **Scope and impact**: What did you ship? What was the measurable impact?
   e.g., Launched new ranking model, CTR improved from 32% to 36.5% across all markets

3. **Collaboration and stakeholders**: Who did you work with? Cross-functional impact?
   e.g., Partnered with ML infra team and 3 product teams across Search and Ads

4. **Challenges and learnings**: What didn't go well? What did you learn?
   e.g., Initial model had latency regression, iterated 3 times before production-ready

5. **Next quarter priorities**: What's the plan?
   e.g., Scale model to 5 more surfaces, target CTR 38%

Skip anything you don't have — I won't fabricate data.
```

---

## 报告模板

### Google Quarterly OKR Template

```markdown
# [Team/Individual] OKRs — Q[N] YYYY

## Objective 1: [Outcome-oriented objective]

| Key Result | Target | Actual | Score (0-1.0) |
|------------|--------|--------|---------------|
| KR1: [Measurable outcome] | [target] | [actual] | [0.X] |
| KR2: [Measurable outcome] | [target] | [actual] | [0.X] |
| KR3: [Measurable outcome] | [target] | [actual] | [0.X] |

**Summary**: [1-2 sentences on what drove the results and key learnings]

## Objective 2: [Outcome-oriented objective]

| Key Result | Target | Actual | Score (0-1.0) |
|------------|--------|--------|---------------|
| KR1: [Measurable outcome] | [target] | [actual] | [0.X] |
| KR2: [Measurable outcome] | [target] | [actual] | [0.X] |

**Summary**: [1-2 sentences]

## Overall Reflection

- **What worked**: [replicable patterns]
- **What to improve**: [specific adjustments for next quarter]
- **Stretch assessment**: [Were goals ambitious enough? Too safe?]
```

### Google Self-Review / Impact Narrative Template

```markdown
# Self-Review — [Name] — [Review Period]

## Impact Summary

[2-3 sentences: highest-impact work, scope, and measurable outcome]

## Key Accomplishments

### [Accomplishment 1: Project/Initiative Name]
- **Scope**: [What it covered, who was involved]
- **What I did**: [Your specific contribution — owned, led, designed, built]
- **Impact**: [Measurable outcome — metrics, users, revenue, reliability]
- **Collaboration**: [Cross-functional partners, stakeholders influenced]

### [Accomplishment 2: Project/Initiative Name]
- **Scope**: [Coverage]
- **What I did**: [Contribution]
- **Impact**: [Outcome]

### [Accomplishment 3]
- **Scope / What I did / Impact**: [...]

## Challenges and Growth

- **[Challenge 1]**: [What happened, what I learned, how I adjusted]
- **[Challenge 2]**: [What happened, what I learned]

## Looking Ahead

- **Next quarter focus**: [Top 2-3 priorities]
- **Growth areas**: [Skills or scope I want to develop]
- **Support needed**: [Mentorship, resources, opportunities]
```

---

## 反空话规则 (Anti-Fluff Rules)

Google 风格特别禁止以下表达：

| Forbidden | Replace With |
|-----------|-------------|
| Worked on X | Shipped X to production, serving N users/requests |
| Improved performance | Reduced P99 latency from Xms to Yms (Z% improvement) |
| Collaborated with teams | Partnered with [teams] to deliver [outcome], unblocking [what] |
| Made progress on OKRs | KR1 at 0.7 (target: increase metric from X to Y, currently at Z) |
| Strong quarter overall | Delivered [top impact], scoring [0.X] on stretch KR[N] |
| Helped the team | Mentored N engineers on [topic], resulting in [measurable outcome] |

### Google 风格核心要求

1. **Outcome KRs, not activity KRs**: "Ship feature X" is weak; "Increase metric from A to B via feature X" is strong
2. **0.0-1.0 scoring**: 0.7 is typically a good score for stretch goals; consistently hitting 1.0 suggests sandbagging
3. **Impact over effort**: Google values what changed, not how hard you worked
4. **Scope and ambition**: Show that your goals were ambitious and your scope was appropriate for your level
5. **Cross-functional leverage**: Highlight how you amplified impact beyond your immediate team
6. **Learnings from misses**: Low KR scores are fine if you explain what you learned and how you'll adjust

---

## 质量检查

生成后自查：

- [ ] Are all KRs outcome-based (not activity-based)?
- [ ] Does each KR have a target value, actual value, and 0-1.0 score?
- [ ] Is the impact summary concrete and measurable?
- [ ] Are accomplishments described with scope, contribution, and impact?
- [ ] Are challenges framed as learnings (not excuses)?
- [ ] Is there evidence of cross-functional collaboration?
- [ ] Are stretch goals appropriately ambitious (not sandbagged)?
- [ ] Is the narrative free of vague filler language?
