---
name: weekly-report
description: "生成数据驱动的周报/月报，结论先行、禁止空话。Use when writing weekly reports, monthly reports, or periodic status updates. Triggers on: '写周报', '周报', '月报', 'weekly report', 'monthly report', 'status report', 'weekly update', '写一下这周的汇报', '帮我写周报', '本周总结'."
---

# 周报 / 月报 (Weekly / Monthly Report)

继承 `manage-up-core` 五大原则。本技能专注于周期性状态汇报——职场中最常写、最容易写成流水账的报告类型。

---

## 触发场景

- 用户要求写周报、月报、双周报
- 用户提到 "weekly report"、"monthly update"、"status report"
- 用户提到 "本周总结"、"这周汇报"、"月度汇报"

---

## 必填输入 (Required Inputs)

生成报告前，向用户收集以下信息。一次性列出，用户可口语化提供：

```
为了写出一份让老板满意的周报，请提供以下信息（口语化就行，我来整理）：

1. **本周完成的事**：做了哪些具体的事？每件事的结果/产出是什么？
   例：完成了用户登录模块开发，通过 QA 测试；处理了 15 个客户工单，平均响应时间 2 小时

2. **关键数据/指标**：有哪些可以量化的成果？
   例：DAU 从 12000 涨到 15000；代码覆盖率从 65% 提升到 78%；处理了 23 个 ticket

3. **遇到的问题/阻塞**：什么事卡住了？原因是什么？需要什么帮助？
   例：支付接口对接延迟，等待第三方 API 文档，预计影响上线时间 3 天

4. **下周计划**：下周最重要的 2-3 件事是什么？
   例：完成支付模块联调；启动 v2.0 需求评审；修复遗留的 5 个 P2 bug

5. **需要老板关注/决策的事**（可选）：有没有需要老板帮忙推动或做决定的事？
   例：需要确认是否引入新的缓存方案，涉及额外 $200/月的基础设施成本

没有的信息可以跳过，我不会编造数据。
```

---

## 报告模板

### 中文模板

```markdown
# [团队/项目名] 周报 YYYY.MM.DD

## 核心结论

[一句话总结本周最重要的状态和需要老板关注的事]

## 关键指标

| 指标 | 上周 | 本周 | 变化 |
|------|-----|------|-----|
| [指标1] | X | Y | +Z% |
| [指标2] | X | Y | -Z% |

## 本周完成

- **[事项1]**：[具体产出和结果]
- **[事项2]**：[具体产出和结果]
- **[事项3]**：[具体产出和结果]

## 风险与阻塞

- **[风险1]**：[具体描述] → 影响：[量化影响] → 需要：[具体请求]
- **[风险2]**：[具体描述] → 已缓解 / 进行中

## 下周计划

| 优先级 | 事项 | 预计完成日 |
|--------|-----|-----------|
| P0 | [最重要的事] | MM/DD |
| P1 | [第二重要] | MM/DD |
| P1 | [第三重要] | MM/DD |

## 需要决策

- [决策事项]：[选项A vs 选项B]，建议 [你的建议]，截止 [日期]
```

### English Template

```markdown
# [Team/Project] Weekly Report YYYY-MM-DD

## Bottom Line

[One sentence: most important status + what the boss needs to know/do]

## Key Metrics

| Metric | Last Week | This Week | Change |
|--------|-----------|-----------|--------|
| [Metric 1] | X | Y | +Z% |
| [Metric 2] | X | Y | -Z% |

## Completed

- **[Item 1]**: [concrete output and result]
- **[Item 2]**: [concrete output and result]

## Risks & Blockers

- **[Risk 1]**: [description] → Impact: [quantified] → Need: [specific ask]

## Next Week

| Priority | Item | Target Date |
|----------|------|-------------|
| P0 | [Most important] | MM/DD |
| P1 | [Second] | MM/DD |

## Decisions Needed

- [Decision]: [Option A vs B], recommend [your pick], deadline [date]
```

---

## 反空话规则 (Anti-Fluff Rules)

以下表达在周报中**禁止使用**，除非附带具体数据：

| 禁止 | 替换为 |
|------|-------|
| 本周持续推进了XX工作 | 本周完成了XX的 [具体里程碑/交付物] |
| 与XX部门积极沟通 | 与XX部门对齐了 [具体事项]，结论是 [什么] |
| 进展顺利 | 完成 N/M 项计划任务，进度 [提前/按时/延迟X天] |
| 做了大量工作 | 完成 N 个 [任务单位]，具体包括 [列举] |
| 有效提升了XX | XX 从 [旧值] 提升至 [新值]（+Z%） |
| optimized performance | reduced latency from Xms to Yms (Z% improvement) |
| worked on feature X | shipped feature X to production, now serving N users |
| had productive discussions | aligned on [decision], next step is [action] by [date] |

---

## 写作规则

1. **结论先行**：第一段 "核心结论" 必须能独立传达本周最重要的信息
2. **完成项用过去式**：强调已经交付的结果，不是正在做的过程
3. **风险必须量化影响**：不是"可能有延迟"，而是"预计延迟 3 天，影响 3/28 上线"
4. **下周计划要有日期**：每个计划项都要有预计完成日
5. **决策项给建议**：不要只抛问题，要给你的建议方案
6. **控制长度**：周报控制在 1 页以内（~500字），月报不超过 2 页
7. **没做的不写**：只写有成果的事，不要为了凑内容写"正在调研"

---

## 质量检查

生成后自查：

- [ ] 核心结论是否一句话说清了本周最重要的事？
- [ ] 每个完成项是否有具体产出（不是"做了XX"，而是"完成/交付了XX"）？
- [ ] 关键指标是否有上周 vs 本周的对比？
- [ ] 风险项是否量化了影响范围和时间？
- [ ] 下周计划是否有优先级和日期？
- [ ] 是否有禁用词表中的模糊表达残留？
- [ ] 全文是否控制在合理长度内？
