---
name: style-microsoft
description: "将报告适配 Microsoft Connects 和 Model/Coach/Care 框架。Use when writing reports in Microsoft style with impact narratives and growth mindset. Triggers on: 'Microsoft 风格', 'Microsoft style', '微软', 'Connects', 'Model Coach Care', '微软绩效', '按微软格式写'."
---

# Microsoft 汇报风格 (Microsoft Reporting Style)

继承 `manage-up-core` 五大原则。本技能将报告适配 Microsoft 的 Connects 框架——强调 impact、growth mindset、balanced reflection（成就与成长并重）。

---

## 触发场景

- 用户提到"Microsoft 风格"、"微软"、"Microsoft style"
- 用户提到"Connects"、"Perspectives"、"Model Coach Care"
- 用户要求按 Microsoft 格式写绩效、Connects 或 impact summary
- 用户背景是 Microsoft 或类似 growth-mindset 文化的组织

---

## 必填输入 (Required Inputs)

生成报告前，向用户收集以下信息：

```
To write a Microsoft-style report, please provide:

1. **Impact this period**: What did you deliver? What changed because of your work?
   e.g., Led migration of 3 services to Azure, reducing infra costs by 28%

2. **How you worked**: Collaboration, inclusion, customer focus — specific examples
   e.g., Facilitated cross-team design review with 4 teams, resolved conflicting requirements

3. **Growth and learnings**: What did you learn? Where did you struggle and improve?
   e.g., First time leading a cross-org project; learned to manage stakeholder expectations earlier

4. **Core priorities alignment**: How does your work connect to team/org priorities?
   e.g., Supports Security priority — all migrated services now meet zero-trust requirements

5. **Next period priorities**: What will you focus on? What support do you need?
   e.g., Extend migration to remaining 5 services; need PM support for prioritization

Skip anything you don't have — I won't fabricate data.
```

---

## 报告模板

### Microsoft Connects Template

```markdown
# Connects — [Name] — [Period]

## Impact

### Core Priorities Alignment
[1-2 sentences: how your work connects to team/org/company priorities]

### Key Contributions

**[Contribution 1: Project/Initiative]**
- What I delivered: [specific outcome]
- Business impact: [metrics, customers affected, cost savings]
- Who benefited: [team, org, customers]

**[Contribution 2: Project/Initiative]**
- What I delivered: [specific outcome]
- Business impact: [metrics]

**[Contribution 3]**
- What I delivered / Business impact: [...]

## How I Worked

### Collaboration & Inclusion
- [Specific example of cross-team collaboration and outcome]
- [Example of inclusive behavior or diverse perspective integration]

### Customer Focus
- [How you incorporated customer needs into your work]

### Modeling Values
- [Specific example of living Microsoft culture — growth mindset, learn-it-all, etc.]

## Growth & Learning

### What I Learned
- [Key learning from this period — skill, insight, or mindset shift]
- [How you applied the learning]

### Where I Struggled
- [Honest reflection on a challenge or miss]
- [What you tried, what worked/didn't, what you'll do differently]

### Development Areas
- [Skill or competency you're actively developing]
- [Concrete plan: courses, mentorship, stretch assignments]

## Priorities Next Period

### Focus Areas
1. [Top priority — what and why]
2. [Second priority]
3. [Third priority]

### Support Needed from Manager
- [Specific request: coaching, resources, visibility, sponsorship]
- [Context for why this support matters]
```

### Microsoft Impact Summary Template (shorter format)

```markdown
# Impact Summary — [Name] — [Period]

## Headline
[One sentence: biggest impact + connection to priorities]

## Delivered
- **[Result 1]**: [What] → [Measurable impact]
- **[Result 2]**: [What] → [Measurable impact]
- **[Result 3]**: [What] → [Measurable impact]

## How
- Collaboration: [With whom, on what, outcome]
- Customer insight: [What you learned, how you applied it]

## Learned
- [Top learning + how it changed your approach]

## Next
- [Top 2-3 priorities for next period]
- Ask: [What you need from your manager]
```

---

## 反空话规则 (Anti-Fluff Rules)

Microsoft 风格特别禁止以下表达：

| Forbidden | Replace With |
|-----------|-------------|
| Demonstrated growth mindset | Faced [challenge], initially tried [approach], learned [insight], adjusted to [new approach], result: [outcome] |
| Collaborated across teams | Facilitated [process] with [N teams], resolved [conflict/gap], delivered [outcome] |
| Made an impact | [Specific deliverable] resulted in [metric change], benefiting [who] |
| Aligned with priorities | Work on [project] directly supports [named priority] by [mechanism] |
| Focused on customers | Incorporated [specific customer signal/data] into [decision], resulting in [outcome] |
| Growing in this area | Identified [gap] in [skill]; taking [specific action — course, mentor, project]; progress so far: [evidence] |

### Microsoft 风格核心要求

1. **Impact over activity**: Describe what changed, not what you did. "Delivered X" beats "worked on X."
2. **Balanced reflection**: Winners share failures. Show genuine struggles and what you learned — this is not weakness, it's growth mindset.
3. **Core priorities connection**: Microsoft has company-wide priorities (Security, AI, etc.). Explicitly link your work to them.
4. **Coaching-friendly tone**: Write as if inviting your manager's coaching. "I'd appreciate guidance on X" is strong, not weak.
5. **Inclusive language**: Show how you brought in diverse perspectives or made space for others.
6. **Forward-looking**: Always end with next-period priorities and specific asks for support.
7. **Model/Coach/Care lens**: If you manage people, show how you modeled behaviors, coached growth, and cared for wellbeing.

---

## 质量检查

生成后自查：

- [ ] Is each contribution described in terms of impact (what changed), not just activity?
- [ ] Is there explicit connection to team/org core priorities?
- [ ] Does "Growth & Learning" include genuine struggle, not just humble-brag?
- [ ] Is there at least one specific collaboration example with outcome?
- [ ] Are development areas honest and accompanied by a concrete plan?
- [ ] Does the report end with clear next-period priorities?
- [ ] Is there a specific, actionable ask for manager support?
- [ ] Is the tone coaching-friendly (inviting dialogue, not defensive)?
