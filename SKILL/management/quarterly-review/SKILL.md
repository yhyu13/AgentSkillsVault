---
name: quarterly-review
description: "生成数据驱动的季度复盘报告（QBR），含目标记分卡、根因分析和下季度规划。Use when writing quarterly business reviews, quarterly retrospectives, or OKR reviews. Triggers on: '季度复盘', '季度总结', 'QBR', 'quarterly review', 'quarterly report', 'Q1复盘', 'Q2复盘', 'Q3复盘', 'Q4复盘', 'OKR 复盘', '季度汇报'."
---

# 季度复盘 / QBR (Quarterly Business Review)

继承 `manage-up-core` 五大原则。季度复盘是最复杂的报告类型——既要回顾过去，又要规划未来，还要对未完成的目标给出诚实的根因分析。核心原则：**用数据说话，用根因说服，用计划展示你的前瞻性**。

---

## 触发场景

- 用户要求写季度复盘、季度总结、QBR
- 用户提到 "quarterly review"、"Q1/Q2/Q3/Q4 review"
- 用户提到 "OKR 复盘"、"季度汇报"、"季度述职"

---

## 必填输入 (Required Inputs)

```
为了写出一份有深度的季度复盘报告，请提供以下信息：

1. **哪个季度？**
   例：2026 Q1（1月-3月）

2. **本季度的目标/OKR 是什么？**
   例：
   - O1：提升用户留存率（KR: 30 日留存从 35% 提升到 45%）
   - O2：上线 v2.0（KR: 3/31 前完成上线）
   - O3：团队扩编（KR: 招到 3 名工程师）

3. **每个目标的实际结果？**
   例：
   - O1：30 日留存从 35% 提升到 42%，接近但未达到 45% 目标
   - O2：v2.0 延迟到 4/15，主要原因是第三方接口延迟
   - O3：招到 2 人，第 3 人 offer 已发，预计 4 月入职

4. **本季度的重要胜利/亮点？**（2-3 个最值得说的成果）
   例：DAU 突破 20K 历史新高；拿下了跟 XX 公司的合作

5. **哪些没做好？为什么？**（坦诚分析）
   例：v2.0 延期了——根因是低估了第三方集成的复杂度，技术方案评审不够充分

6. **学到了什么教训？**
   例：以后涉及第三方集成的项目要提前 2 周启动技术调研

7. **下季度的计划/目标？**
   例：完成 v2.0 上线、启动 v3.0 规划、留存率达到 45%

没有的信息可以跳过，我不会编造数据。
```

---

## 报告模板

### 中文模板

```markdown
# [团队/部门] Q[N] 季度复盘 | YYYY

## 季度总评

**一句话总结**：[本季度最核心的结论]

**OKR 达成率**：X/Y 项达成（Z%）

## 目标记分卡

| 目标 | 关键结果 | 目标值 | 实际值 | 达成率 | 评价 |
|------|---------|--------|--------|--------|------|
| O1: [目标] | KR1: [指标] | X | Y | Z% | 🟢/🟡/🔴 |
| O1: [目标] | KR2: [指标] | X | Y | Z% | 🟢/🟡/🔴 |
| O2: [目标] | KR1: [指标] | X | Y | Z% | 🟢/🟡/🔴 |

评价标准：🟢 ≥100% | 🟡 70-99% | 🔴 <70%

## 重要胜利 (Top Wins)

### 胜利 1：[标题]

[具体成果 + 数据 + 业务影响]

### 胜利 2：[标题]

[具体成果 + 数据 + 业务影响]

## 未达成项与根因分析

### [未达成目标]

- **目标**：[原始目标]
- **实际**：[实际结果]
- **差距**：[量化差距]
- **根因**：[为什么没达成——诚实分析，不甩锅]
- **教训**：[下次如何避免]

## 关键教训 (Learnings)

1. **[教训1]**：[具体描述 + 后续如何应用]
2. **[教训2]**：[具体描述 + 后续如何应用]

## 下季度规划

### 目标概览

| 目标 | 关键结果 | 目标值 | 承接自 |
|------|---------|--------|--------|
| O1: [目标] | KR1: [指标] | X | 本季延续/全新 |
| O2: [目标] | KR1: [指标] | X | 本季延续/全新 |

### 关键举措

1. **[举措1]**：[具体做什么 + 预期产出 + 时间线]
2. **[举措2]**：[具体做什么 + 预期产出 + 时间线]

### 需要的支持

- [需要什么资源/决策/跨部门配合]

## 附录：关键指标趋势

| 指标 | Q[N-1] | Q[N] | 环比 | 趋势 |
|------|--------|------|------|------|
| [指标1] | X | Y | +Z% | 📈 |
| [指标2] | X | Y | -Z% | 📉 |
```

### English Template

```markdown
# [Team/Department] Q[N] Business Review | YYYY

## Quarter Summary

**Bottom Line**: [One sentence — most important takeaway from this quarter]

**OKR Achievement**: X of Y goals met (Z%)

## Scorecard

| Objective | Key Result | Target | Actual | Achievement | Rating |
|-----------|-----------|--------|--------|-------------|--------|
| O1: [Obj] | KR1: [Metric] | X | Y | Z% | 🟢/🟡/🔴 |

Rating: 🟢 ≥100% | 🟡 70-99% | 🔴 <70%

## Top Wins

### Win 1: [Title]

[Concrete result + data + business impact]

## Misses & Root Cause Analysis

### [Missed Goal]

- **Target**: [original goal]
- **Actual**: [what happened]
- **Gap**: [quantified difference]
- **Root Cause**: [honest analysis]
- **Lesson**: [how to prevent next time]

## Key Learnings

1. **[Learning 1]**: [description + how it will be applied going forward]

## Next Quarter Plan

### Objectives

| Objective | Key Result | Target | Source |
|-----------|-----------|--------|--------|
| O1: [Obj] | KR1: [Metric] | X | Carryover / New |

### Key Initiatives

1. **[Initiative 1]**: [what + expected output + timeline]

### Support Needed

- [Resources / decisions / cross-team dependencies]
```

---

## 反空话规则 (Anti-Fluff Rules)

| 禁止 | 替换为 |
|------|-------|
| 本季度取得了丰硕成果 | 达成 X/Y 项 OKR（Z%），核心指标 [列出] |
| 团队表现出色 | [具体谁] 在 [具体事] 上达成了 [具体结果] |
| 遇到了一些挑战 | [具体挑战]：根因是 [什么]，导致 [量化影响] |
| 下季度将继续努力 | 下季度 [具体目标]，关键举措：[1, 2, 3] |
| 需要更多支持 | 需要 [具体资源]，否则 [具体影响] |
| had a productive quarter | achieved X of Y OKRs, [specific highlights] |
| faced some headwinds | [specific challenge] caused [quantified impact], root cause: [analysis] |
| will continue to drive growth | Q[N+1] targets: [specific OKRs with numbers] |

---

## 根因分析指南

未达成的目标必须做根因分析，不能只说"没做到"。使用以下框架：

### 五个为什么 (5 Whys)

1. 为什么没达成？→ 因为 X
2. 为什么 X 会发生？→ 因为 Y
3. 为什么 Y 会发生？→ 因为 Z
4. ...直到找到可以改变的根因

### 常见根因分类

| 类别 | 示例 |
|------|------|
| **规划不足** | 低估了工作量、没有 buffer、依赖项识别不充分 |
| **执行问题** | 优先级频繁变化、关键人力中途调走、技术债拖累 |
| **外部因素** | 第三方延迟、市场变化、政策调整 |
| **能力缺口** | 团队缺乏某技术经验、新人上手慢 |

### 根因分析的诚实原则

- **不甩锅**："第三方延迟"是事实，但"我们没有提前做风险预案"才是根因
- **不说空话**："下次会注意"不是教训，"下次第三方集成项目提前 2 周做技术调研"才是
- **区分原因和借口**：原因 = 可以改进的；借口 = 推卸责任的

---

## 写作规则

1. **记分卡是核心**：老板第一眼看记分卡就知道这个季度怎么样
2. **胜利要有数据**：不是"做了XX"，而是"XX 带来了 Y% 的提升"
3. **根因要诚实**：承认失误比甩锅更专业
4. **教训要可操作**：不是"下次注意"，而是"下次做 X 具体的事"
5. **下季度目标要与本季度衔接**：未完成的事要有延续计划
6. **篇幅控制**：3-5 页，不超过。记分卡 + 胜利 + 教训 + 下季度是必写的

---

## 质量检查

- [ ] 记分卡是否完整覆盖了所有 OKR/目标？
- [ ] 每个目标是否有目标值 vs 实际值的对比？
- [ ] 未达成的目标是否有根因分析（不是借口）？
- [ ] 教训是否具体可操作（不是"下次注意"）？
- [ ] 下季度目标是否有量化指标？
- [ ] 重要胜利是否有数据和业务影响说明？
- [ ] 是否有禁用词表中的模糊表达残留？
