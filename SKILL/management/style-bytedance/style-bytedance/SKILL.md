---
name: style-bytedance
description: "将报告适配字节跳动 OKR 驱动的汇报风格。Use when writing reports in ByteDance style, OKR-anchored format. Triggers on: '字节风格', '字节跳动', 'ByteDance', '飞书OKR', 'OKR周报', '字节周报', '按字节格式写', 'ByteDance style'."
---

# 字节跳动汇报风格 (ByteDance Reporting Style)

继承 `manage-up-core` 五大原则。本技能将报告适配字节跳动的 OKR 驱动文化——高透明度、强对齐、数据密度高。

---

## 触发场景

- 用户提到"字节风格"、"字节跳动"、"ByteDance"
- 用户提到"飞书 OKR"、"OKR 周报"、"OKR 对齐"
- 用户要求按字节格式写周报、复盘或绩效
- 用户背景是字节跳动或类似 OKR 驱动型组织

---

## 必填输入 (Required Inputs)

生成报告前，向用户收集以下信息：

```
为了写出符合字节风格的报告，请提供以下信息：

1. **你的 OKR**：本季度 / 双月的 Objective 和 Key Results 是什么？
   例：O: 提升用户留存 → KR1: 7日留存从 35% 提升至 42%; KR2: 完成 3 个关键体验优化上线

2. **承接关系**：你的 OKR 承接谁的？（上级/团队 OKR 对齐点）
   例：承接部门 O2「提升产品核心指标」

3. **本周进展**：每个 KR 的进度如何？用数据说明。
   例：KR1 当前 38%（上周 36%），KR2 已完成 2/3

4. **风险与阻塞**：什么事卡住了？需要什么支持？
   例：AB 实验数据回收延迟，需要数据平台优先排期

5. **下周计划**：最重要的 2-3 件事？
   例：上线第 3 个体验优化、启动 KR1 的新策略实验

没有的信息可以跳过，我不会编造数据。
```

---

## 报告模板

### 字节 OKR 周报模板

```markdown
# [团队/项目] 周报 YYYY.MM.DD

## 核心结论

[一句话总结本周 OKR 整体进展和关键风险]

## OKR 进度

**O: [你的 Objective]**
承接：[上级 OKR 对齐点]

| Key Result | 目标值 | 当前值 | 进度 | 较上周 |
|------------|--------|--------|------|--------|
| KR1: [描述] | [目标] | [当前] | X% | +Y% |
| KR2: [描述] | [目标] | [当前] | X% | +Y% |
| KR3: [描述] | [目标] | [当前] | X% | +Y% |

## 本周关键动作

- **[动作1]**：[具体产出] → 对应 KR[N]，推动进度 [从X到Y]
- **[动作2]**：[具体产出] → 对应 KR[N]，推动进度 [从X到Y]

## 风险与阻塞

- **[风险1]**：[具体描述] → 影响 KR[N]，预计影响 [量化] → 需要：[具体支持]
- **[风险2]**：已协调 [进展]

## 下周计划

| 优先级 | 事项 | 对应 KR | 预计产出 |
|--------|------|---------|---------|
| P0 | [事项] | KR[N] | [预期结果] |
| P1 | [事项] | KR[N] | [预期结果] |

## 复盘（可选）

- **做得好**：[可复用的经验]
- **待改进**：[具体改进点和行动]
```

### ByteDance OKR Weekly (English)

```markdown
# [Team/Project] Weekly Report YYYY-MM-DD

## Bottom Line

[One sentence: OKR progress summary + key risk/ask]

## OKR Progress

**O: [Your Objective]**
Aligned to: [Manager/team OKR]

| Key Result | Target | Current | Progress | WoW |
|------------|--------|---------|----------|-----|
| KR1: [desc] | [target] | [current] | X% | +Y% |
| KR2: [desc] | [target] | [current] | X% | +Y% |

## Key Actions This Week

- **[Action 1]**: [output] → moved KR[N] from X to Y
- **[Action 2]**: [output] → moved KR[N] from X to Y

## Risks & Blockers

- **[Risk 1]**: [description] → impacts KR[N] by [amount] → Need: [specific ask]

## Next Week

| Priority | Item | KR | Expected Outcome |
|----------|------|----|-----------------|
| P0 | [item] | KR[N] | [result] |
| P1 | [item] | KR[N] | [result] |
```

---

## 反空话规则 (Anti-Fluff Rules)

字节风格特别禁止以下表达：

| 禁止 | 替换为 |
|------|-------|
| 持续推进 OKR | KR1 进度从 X% 推进至 Y%，主要动作：[列举] |
| 与XX对齐 | 与XX对齐了[具体事项]，结论是[什么]，下一步[行动] |
| OKR 进展顺利 | 3 个 KR 中 2 个 on track，KR3 滞后原因：[具体] |
| 提升了用户体验 | [指标]从 X 提升至 Y（+Z%），具体优化了[功能点] |
| 积极复盘 | 复盘结论：[根因]，改进措施：[行动]，预计[时间]落地 |
| 做了大量实验 | 完成 N 个 AB 实验，其中 M 个达显著，最佳方案提升 [指标] Z% |

### 字节风格核心要求

1. **每个动作挂钩 KR**：不存在"做了但不知道推动了什么"的事项
2. **进度用百分比 + 绝对值**：不只说"提升了"，要说"从 X 到 Y（+Z%）"
3. **承接关系显式标注**：明确你的 OKR 承接谁的，让上级一眼看到对齐链
4. **高信息密度**：字节文化强调效率，一页纸说完，不要废话
5. **复盘有根因有行动**：不是"下次注意"，是"根因是X，改进方案是Y，Z日期落地"

---

## 质量检查

生成后自查：

- [ ] 每个 KR 是否有明确的目标值、当前值和进度百分比？
- [ ] 每个关键动作是否标注了对应的 KR？
- [ ] 承接关系是否已显式标注（承接谁的哪个 O/KR）？
- [ ] 风险是否量化了对 KR 的影响？
- [ ] 是否有任何没有挂钩 KR 的工作项？（如有，考虑是否值得写）
- [ ] 信息密度是否足够高？（能否在一页内说完）
- [ ] 是否有禁用词表中的模糊表达残留？
