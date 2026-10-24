# 会议纪要示例 (Meeting Summary Examples)

## 示例一：从原始笔记到结构化纪要

### 用户输入（口语化速记）

```
今天开了个 v2.0 需求评审会

参会：老张（产品总监）、我（研发负责人）、小李（前端）、小王（设计）、Alice（QA）

讨论了几个事情：
1. 新版首页改版方案 - 老张说要做 A/B test，不要一下全换。小王出了 3 个方案，最后选了方案 2，因为改动最小风险低。老张拍板的。
2. 用户反馈模块 - 要加一个应用内的反馈入口。小李说技术上没问题，大概需要 1.5 周。但是小王说设计稿要下周三才能给。
3. 性能问题 - 现在首页加载要 4 秒，太慢了。我说目标是降到 2 秒以内。需要排查一下是前端还是后端的问题。小李先看前端，我看后端。
4. 老张还提了一个想法，说要不要做暗色模式，但是大家觉得这个优先级不高，先放一放。

总结：方案 2 确定了，下周开始干。反馈模块等设计稿。性能问题先各自排查。
```

### ManageUp 输出

```markdown
# 会议纪要：v2.0 需求评审会

**日期**：[待确认] | **时间**：[待确认] | **方式**：[待确认]

**参会人**：老张（产品总监）、我（研发负责人）、小李（前端）、小王（设计）、Alice（QA）

---

## 核心结论

v2.0 首页改版确定采用方案 2（低风险迭代 + A/B Test），下周启动开发。反馈模块待设计稿。首页性能问题（4s → 目标 2s）前后端各自排查。

## 决策事项

| # | 决策内容 | 决策人 |
|---|---------|--------|
| 1 | 首页改版采用方案 2（最小改动方案），通过 A/B Test 验证 | 老张 |
| 2 | 暗色模式优先级降低，本版本不做 | 全体共识 |

## 行动项

| # | 事项 | 负责人 | 截止日 | 状态 |
|---|------|--------|--------|------|
| 1 | 首页方案 2 设计稿终稿 | 小王 | [待确认] | ⏳ 待完成 |
| 2 | 反馈模块设计稿 | 小王 | 下周三前 | ⏳ 待完成 |
| 3 | 首页性能排查——前端部分 | 小李 | [待确认] | ⏳ 待完成 |
| 4 | 首页性能排查——后端部分 | 我 | [待确认] | ⏳ 待完成 |
| 5 | 反馈模块前端开发（设计稿就绪后启动） | 小李 | 设计稿完成后约 1.5 周 | ⏳ 待设计稿 |

## 关键讨论点

### 首页改版方案

- 小王展示了 3 个设计方案
- 方案 1 改动最大（全新布局），风险高
- **方案 2（选中）**：在现有布局上优化关键区域，改动最小，可通过 A/B Test 渐进验证
- 方案 3 折中但设计复杂度高
- 老张要求先用方案 2 做 A/B Test，数据好再考虑更大改动

### 用户反馈模块

- 需求：在应用内增加反馈入口（替代当前的邮件反馈）
- 小李评估：技术可行，前端开发约 1.5 周
- 阻塞：设计稿要到下周三才能完成，开发需等设计

### 首页性能

- 现状：首页加载 4 秒
- 目标：降至 2 秒以内
- 需要定位瓶颈在前端（资源加载/渲染）还是后端（API 响应），前后端各自排查后汇总

## 遗留问题

- **暗色模式**：老张提出探索意向，但团队一致认为优先级低于当前需求，先暂缓

## 下次会议

**时间**：[待确认] | **议题**：性能排查结果汇总 + 反馈模块设计评审
```

---

## Example 2: Executive Meeting Summary (English)

### User Input

```
Quarterly planning meeting with leadership

Attendees: VP of Engineering (Mike), VP of Product (Lisa), CFO (David), me (Director of Eng)

Main discussion:
- Q2 headcount: Mike wants 5 more engineers, David says budget only supports 3. After discussion, agreed on 4 with the condition that we show Q1 revenue targets were met.
- Platform migration: We're moving from AWS to GCP. Timeline was supposed to be end of Q2 but we're behind. Realistic estimate is end of Q3. Mike wasn't happy but accepted if we phase it - core services by end of Q2, everything else by Q3.
- New product initiative: Lisa pitched a new AI feature for the product. Estimated 3 months of work. Mike assigned me to do a technical feasibility study by April 5.
- Budget: David approved the $50K for new monitoring tools (Datadog). 

There was some debate about whether to build the AI feature in-house or use a third-party API. No decision yet - need the feasibility study first.
```

### ManageUp Output

```markdown
# Meeting Summary: Q2 Leadership Planning

**Date**: 2026-03-19 | **Time**: 10:00 - 11:30 | **Format**: In-person

**Attendees**: Mike (VP Engineering), Lisa (VP Product), David (CFO), [Author] (Director of Engineering)

---

## Bottom Line

Q2 headcount approved for 4 engineers (conditional on Q1 revenue targets). Platform migration timeline extended to end of Q3 (phased: core services by Q2, remainder by Q3). $50K Datadog budget approved. AI feature feasibility study assigned.

## Decisions Made

| # | Decision | Decided By |
|---|----------|-----------|
| 1 | Hire 4 engineers in Q2 (conditional on Q1 revenue targets met) | David (CFO) |
| 2 | Platform migration phased: core services → end of Q2, full migration → end of Q3 | Mike (VP Eng) |
| 3 | $50K monitoring tools budget (Datadog) approved | David (CFO) |
| 4 | AI feature: build vs buy decision deferred pending feasibility study | — |

## Action Items

| # | Action | Owner | Due Date | Status |
|---|--------|-------|----------|--------|
| 1 | AI feature technical feasibility study | [Author] | Apr 5 | Pending |
| 2 | Revised platform migration plan (phased approach) | [Author] | Mar 28 | Pending |
| 3 | Q1 revenue report to unlock Q2 headcount | David | Apr 10 | Pending |
| 4 | Initiate Datadog procurement | [Author] | Mar 25 | Pending |
| 5 | Headcount job descriptions for 4 engineering roles | Mike | Apr 1 | Pending |

## Key Discussion Points

### Q2 Headcount

- Mike requested 5 engineers; David countered with 3 (budget constraint)
- Compromise: **4 engineers approved**, conditional on Q1 revenue targets being met (David to confirm by April 10)
- If Q1 revenue falls short, revisit to determine whether 4th hire proceeds

### Platform Migration (AWS → GCP)

- Original target: end of Q2. Current status: behind schedule
- Realistic estimate: full migration by end of Q3
- Agreed on **phased approach**: core services (auth, payments, API gateway) migrated by end of Q2; non-critical services by end of Q3
- Mike accepted with condition that phased plan with milestones is presented by 3/28

### AI Feature Initiative

- Lisa proposed an AI-powered feature (recommendation engine for product)
- Estimated 3 months of engineering work
- Open question: build in-house vs. use third-party API (cost, control, timeline trade-offs)
- Decision deferred — need feasibility study first

### Monitoring Tools Budget

- $50K for Datadog approved by David — no discussion, straightforward approval

## Open Items

- **Build vs. buy for AI feature**: Decision pending feasibility study (due April 5). Study should cover: technical complexity, cost comparison, timeline, data privacy implications
- **4th engineer hire**: Conditional — depends on Q1 revenue actuals

## Next Meeting

**Date**: April 10 | **Agenda**: Q1 revenue review, headcount confirmation, AI feasibility readout
```
