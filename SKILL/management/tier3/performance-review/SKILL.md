---
name: performance-review
description: "生成数据驱动的绩效自评报告，用量化成果证明你的价值。Use when writing performance self-assessments, annual reviews, or career development summaries. Triggers on: '绩效自评', '绩效', '自评', '年终总结', '述职', 'performance review', 'self-assessment', 'annual review', 'self-evaluation', '考核', '晋升述职'."
---

# 绩效自评 / 述职报告 (Performance Self-Assessment)

继承 `manage-up-core` 五大原则。绩效自评是高风险报告——写得好直接影响评级、奖金、晋升。核心原则：**用可量化的事实证明你的价值，而不是用形容词吹嘘自己**。

---

## 触发场景

- 用户要求写绩效自评、年终总结、述职报告
- 用户提到 "performance review"、"self-assessment"、"annual review"
- 用户提到 "绩效"、"自评"、"述职"、"晋升材料"

---

## 必填输入 (Required Inputs)

```
为了写出一份有说服力的绩效自评，请提供以下信息：

1. **考核周期**：哪个时间段？
   例：2025 年下半年（7月-12月）

2. **你的目标/OKR**：考核开始时定的目标是什么？
   例：
   - 目标1：完成用户中心重构，支持 SSO
   - 目标2：团队 Bug 修复响应时间缩短 30%
   - 目标3：培养 1 名新人能独立负责模块

3. **每个目标的实际成果**：做到了什么程度？有哪些可量化的结果？
   例：
   - 目标1：已上线，覆盖 28,000 用户，SSO 登录成功率 99.2%
   - 目标2：响应时间从 48 小时降到 18 小时（-62.5%）
   - 目标3：小李已独立负责消息模块，上线 2 个功能无 P0

4. **超出目标的额外贡献**（可选）：有没有做了目标之外的有价值的事？
   例：主动推动了 CI/CD 流水线优化，构建时间从 12 分钟降到 4 分钟

5. **成长和不足**（可选）：自己的成长点和待改进的地方？
   例：技术深度有提升（学了 K8s），但跨团队沟通还需要加强

6. **下一周期目标**（可选）：未来想做什么？
   例：希望负责更大的项目，尝试 Tech Lead 角色

没有的信息可以跳过，我不会编造数据。
```

---

## 报告模板

### 中文模板

```markdown
# 绩效自评 — [姓名] | [考核周期]

## 核心总结

[一句话概括这个周期最重要的成果和价值]

## 目标达成情况

### 目标 1：[目标描述]

| 维度 | 内容 |
|------|------|
| 目标 | [原始目标] |
| 结果 | [实际达成] |
| 关键数据 | [量化指标] |
| 评估 | 🟢 超额完成 / 🟡 基本达成 / 🔴 未达成 |

**具体成果**：
- [成果1 + 数据]
- [成果2 + 数据]

**业务影响**：[这件事对团队/公司的价值是什么]

### 目标 2：[目标描述]
（同上结构）

## 额外贡献（超出目标范围）

- **[贡献1]**：[做了什么 + 产生了什么价值]
- **[贡献2]**：[做了什么 + 产生了什么价值]

## 成长与反思

**成长点**：
- [具体技能/能力提升 + 证据]

**待改进**：
- [坦诚的不足 + 改进计划]

## 下一周期目标

1. [目标1]：[可量化的目标描述]
2. [目标2]：[可量化的目标描述]
```

### English Template

```markdown
# Self-Assessment — [Name] | [Review Period]

## Executive Summary

[One sentence: your most significant impact this period]

## Goal Achievement

### Goal 1: [Goal Description]

| Dimension | Detail |
|-----------|--------|
| Target | [Original goal] |
| Result | [Actual outcome] |
| Key Metrics | [Quantified data] |
| Rating | 🟢 Exceeded / 🟡 Met / 🔴 Missed |

**Key Accomplishments**:
- [Result 1 + data]
- [Result 2 + data]

**Business Impact**: [Why this matters to the team/company]

### Goal 2: [Goal Description]
(same structure)

## Above & Beyond

- **[Contribution 1]**: [What you did + measurable impact]

## Growth & Reflection

**Strengths developed**:
- [Skill/capability + evidence]

**Areas for improvement**:
- [Honest gap + action plan]

## Goals for Next Period

1. [Goal 1]: [Measurable target]
2. [Goal 2]: [Measurable target]
```

---

## 反空话规则 (Anti-Fluff Rules)

绩效自评是空话重灾区。以下表达**严格禁止**：

| 禁止 | 替换为 |
|------|-------|
| 工作认真负责 | [具体做了什么] 保证了 [具体结果] |
| 积极配合团队 | 在 [具体项目] 中承担了 [具体角色]，交付了 [具体产出] |
| 不断学习进步 | 学习了 [具体技术]，并应用在 [具体场景]，效果是 [量化结果] |
| 表现出色 | [具体事项] 达成了 [目标的 X%]，超出预期 Y% |
| 为团队做出了贡献 | 在 [项目] 中 [做了什么]，结果是 [量化影响] |
| demonstrated strong leadership | led [specific initiative] with [N] people, delivering [result] |
| consistently exceeded expectations | achieved [X]% of target on [goal], [Y]% above plan |
| passionate about growth | completed [certification/training], applied to [project], resulting in [impact] |
| great team player | collaborated with [team] on [project], my contribution: [specific deliverable] |

---

## 写作策略

1. **STAR-D 法则**：每个成果用 Situation → Task → Action → Result → **Data** 结构。重点在 Result 和 Data
2. **量化一切**：没有数字的成就不是成就。收入、用户数、效率提升、成本节约——至少用一个
3. **与公司目标对齐**：说明你的成果如何支撑了团队/部门/公司的目标
4. **坦诚不足**：写 1-2 个真实的不足（不要写"太追求完美"这种伪缺点），配上改进计划
5. **前瞻性收尾**：用下一周期目标展示你的上进心和规划能力
6. **老板视角写**：每一段问自己——"如果老板只看这一段，他知道我做了什么、做到什么程度吗？"

---

## 质量检查

- [ ] 每个目标是否有"目标 → 结果 → 数据"的完整链条？
- [ ] 是否有至少 3 个可量化的成果数据？
- [ ] 额外贡献是否真的超出了原始目标范围？
- [ ] 不足之处是否真实可信（不是伪缺点）？
- [ ] 下一周期目标是否具体、可量化？
- [ ] 是否有禁用词表中的模糊表达残留？
- [ ] 核心总结是否一句话就传达了你最大的价值？
