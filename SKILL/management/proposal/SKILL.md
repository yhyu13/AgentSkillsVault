---
name: proposal
description: "生成有说服力的提案和资源申请报告，包含 ROI 分析和不行动的代价。Use when writing proposals, resource requests, budget justifications, or business cases. Triggers on: '提案', '资源申请', '申请预算', '方案建议', 'proposal', 'business case', 'resource request', 'budget request', '审批', '请示', '建议书'."
---

# 提案 / 资源申请 (Proposal & Resource Request)

继承 `manage-up-core` 五大原则。提案的核心目标：**让老板说"Yes"**。关键技巧：不只说你想要什么，还要说不给会怎样。

---

## 触发场景

- 用户要求写提案、资源申请、预算审批材料
- 用户提到 "proposal"、"business case"、"resource request"
- 用户提到 "提案"、"申请"、"建议"、"请示"

---

## 必填输入 (Required Inputs)

```
为了写出一份让老板愿意批准的提案，请提供以下信息：

1. **你想解决什么问题？**
   例：当前部署流程全手动，每次上线需要 4 小时，每月上线 8 次，频繁出错

2. **你提议的解决方案是什么？**
   例：引入 CI/CD 自动化部署，使用 GitHub Actions + ArgoCD

3. **需要什么资源？**（人力、预算、时间、设备等）
   例：需要 2 名工程师投入 3 周；额外基础设施成本 $500/月

4. **预期收益/ROI 是什么？**
   例：每次部署从 4 小时降到 15 分钟；减少人为错误 90%；每月节约 30 小时人力

5. **有没有考虑过其他方案？**（可选）
   例：方案B是用 Jenkins，但社区维护减少，长期风险高

6. **不做的后果是什么？**（可选）
   例：继续手动部署，人为错误风险持续存在，团队每月浪费 32 小时

没有的信息可以跳过，我不会编造数据。
```

---

## 报告模板

### 中文模板

```markdown
# 提案：[提案标题]

**提交人**：[姓名] | **日期**：YYYY.MM.DD | **请求**：[一句话说明需要什么]

## 执行摘要

[3-5 句话：问题是什么 → 建议怎么做 → 需要什么 → 预期收益]

## 问题描述

### 现状

[用数据描述当前的问题]

### 不行动的代价

| 维度 | 影响 |
|------|------|
| 时间成本 | 每月浪费 X 小时 |
| 金钱成本 | 每年损失 ¥X |
| 风险 | [具体风险描述] |
| 团队影响 | [士气/流失/效率] |

## 建议方案

### 方案概述

[你建议怎么做]

### 实施计划

| 阶段 | 时间 | 交付物 |
|------|------|--------|
| 阶段1 | W1-W2 | [交付物] |
| 阶段2 | W3-W4 | [交付物] |

### 所需资源

| 资源 | 数量 | 成本 | 说明 |
|------|------|------|------|
| [资源1] | X | ¥Y | [说明] |
| [资源2] | X | ¥Y | [说明] |
| **合计** | | **¥Z** | |

## ROI 分析

| 项目 | 金额/数量 |
|------|----------|
| 总投入 | ¥X |
| 年度收益 | ¥Y |
| 回收期 | Z 个月 |
| 3年 ROI | X% |

## 方案对比（如有备选）

| 维度 | 方案A（推荐） | 方案B | 不做 |
|------|-------------|------|------|
| 成本 | ¥X | ¥Y | ¥0（但隐性成本 ¥Z） |
| 时间 | X 周 | Y 周 | — |
| 风险 | [低/中/高] | [低/中/高] | [持续恶化] |
| 收益 | [量化] | [量化] | 无 |

## 风险与缓解

| 风险 | 概率 | 缓解措施 |
|------|------|---------|
| [风险1] | 低/中/高 | [措施] |

## 决策请求

- **请求**：[具体要什么——批准预算/增加人力/授权采购]
- **截止**：[何时需要决定]
- **延迟决策影响**：[拖延会导致什么]
```

### English Template

```markdown
# Proposal: [Title]

**Author**: [Name] | **Date**: YYYY-MM-DD | **Ask**: [One-line summary of what you need]

## Executive Summary

[3-5 sentences: Problem → Solution → Cost → Expected ROI]

## Problem Statement

### Current State

[Data-driven description of the problem]

### Cost of Inaction

| Dimension | Impact |
|-----------|--------|
| Time | X hours wasted per month |
| Money | $X annual loss |
| Risk | [Specific risk] |
| Team | [Morale/turnover/efficiency impact] |

## Proposed Solution

### Overview

[What you propose to do]

### Implementation Plan

| Phase | Timeline | Deliverable |
|-------|----------|-------------|
| Phase 1 | W1-W2 | [Deliverable] |
| Phase 2 | W3-W4 | [Deliverable] |

### Resources Required

| Resource | Quantity | Cost | Notes |
|----------|----------|------|-------|
| [Resource 1] | X | $Y | [Notes] |
| **Total** | | **$Z** | |

## ROI Analysis

| Item | Amount |
|------|--------|
| Total Investment | $X |
| Annual Benefit | $Y |
| Payback Period | Z months |
| 3-Year ROI | X% |

## Alternatives Considered

| Dimension | Option A (Recommended) | Option B | Do Nothing |
|-----------|----------------------|----------|------------|
| Cost | $X | $Y | $0 (hidden cost: $Z) |
| Timeline | X weeks | Y weeks | — |
| Risk | Low | Medium | Increasing |

## Risk & Mitigation

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| [Risk 1] | Low/Med/High | [Action] |

## Decision Request

- **Ask**: [Exactly what you need — budget approval / headcount / authorization]
- **Deadline**: [When you need a decision]
- **Cost of delay**: [What happens if delayed]
```

---

## 反空话规则 (Anti-Fluff Rules)

| 禁止 | 替换为 |
|------|-------|
| 将极大地提升效率 | 每月节约 X 小时（从 Y 降至 Z） |
| 有助于团队发展 | [具体提升]，例：新人上手时间从 2 周缩短到 3 天 |
| 投资回报显著 | 投入 ¥X，年收益 ¥Y，Z 个月回收 |
| 存在一定风险 | 风险：[具体描述]，概率 [高/中/低]，缓解措施：[具体] |
| will significantly improve | will reduce [metric] from X to Y (Z% improvement) |
| great ROI | $X investment, $Y annual savings, Z-month payback |
| some risks involved | Risk: [specific], Likelihood: [H/M/L], Mitigation: [action] |

---

## 写作策略

1. **不行动的代价 > 行动的成本**：最有说服力的提案让老板看到"不做比做更贵"
2. **给方案不给问题**：老板不想只听你抱怨，要听你的解决方案
3. **方案对比必须含"不做"**：不做也是一个选项，但要量化它的成本
4. **ROI 要保守计算**：宁可低估收益，高估成本。被批准后超预期交付比反过来好
5. **截止日期明确**：不写截止日期 = 不急 = 可以不批
6. **一页纸原则**：执行摘要必须在 1 页以内。详细分析可以放附件

---

## 质量检查

- [ ] 执行摘要是否在 5 句话内说清了问题 + 方案 + 成本 + 收益？
- [ ] 是否量化了不行动的代价？
- [ ] ROI 数字是否合理、可验证（不是夸大）？
- [ ] 是否对比了至少一个备选方案（含"不做"）？
- [ ] 决策请求是否有明确截止日？
- [ ] 是否有禁用词表中的模糊表达残留？
