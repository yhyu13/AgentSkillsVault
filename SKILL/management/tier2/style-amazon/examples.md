# Amazon 风格示例 (Amazon Style Examples)

## Example 1: Software Engineer Forte Accomplishment

### User Input

```
Amazon SDE II, here are my key accomplishments this cycle:
- Redesigned the order processing pipeline for my team's service
- Reduced order processing latency from 850ms P99 to 320ms P99
- Handles 2.3M orders/day across NA and EU marketplaces
- Built a new retry mechanism that reduced failed orders from 0.8% to 0.12%
- Had to convince my manager to invest 3 weeks in tech debt instead of new features
- Customer impact: fewer "order pending" complaints - support tickets dropped 34%
- Also onboarded 2 new SDEs, created onboarding docs that reduced ramp-up from 6 weeks to 3 weeks
- Next cycle: want to extend pipeline improvements to JP marketplace and start working on real-time order tracking
```

### ManageUp Output

```markdown
# Forte Review — H1 2026

## Accomplishment 1: Order Processing Pipeline Redesign

**Context**: The order processing pipeline serving NA and EU marketplaces (2.3M orders/day) had degraded to 850ms P99 latency with a 0.8% failure rate, generating persistent "order pending" customer complaints and elevated support ticket volume.

**What I did**: Owned the end-to-end redesign of the order processing pipeline. Identified three root causes through deep-dive analysis of latency distributions (database connection pooling, synchronous downstream calls, and absence of intelligent retry logic). Proposed and secured investment of 3 sprint cycles for technical debt reduction, presenting data showing that continued feature work on the degraded pipeline would compound operational costs. Designed and implemented an asynchronous processing architecture with graduated retry mechanism.

**Impact**:
- P99 latency reduced from 850ms to 320ms (62% improvement)
- Failed orders reduced from 0.8% to 0.12% (85% reduction)
- Customer support tickets for "order pending" issues dropped 34%
- Serving 2.3M orders/day across NA and EU with zero regression in correctness

**Leadership Principles**:
- **Customer Obsession**: Prioritized pipeline reliability over new feature velocity because customer data (support tickets, order failure rates) showed this was the #1 customer pain point. The 34% support ticket reduction validated this prioritization.
- **Ownership**: Proactively identified the degradation trend 6 weeks before it would have triggered an operational review. Proposed the investment case to my manager rather than waiting to be asked.
- **Dive Deep**: Analyzed 30 days of latency percentile data to isolate three distinct root causes rather than applying a surface-level fix to the most visible symptom.
- **Insist on the Highest Standards**: Rejected an initial proposal to add caching as a band-aid. The retry mechanism I built instead addresses the root cause and is now a reusable component adopted by 2 adjacent teams.

---

## Accomplishment 2: Engineering Onboarding Program

**Context**: New SDEs on the team were taking 6 weeks to reach full productivity. With 2 new hires joining, this represented significant ramp-up cost.

**What I did**: Created structured onboarding documentation covering service architecture, deployment procedures, common debugging workflows, and a graduated series of starter tasks. Personally mentored both new SDEs through their first 3 weeks.

**Impact**:
- Onboarding time reduced from 6 weeks to 3 weeks (50% reduction)
- Both new hires shipped production code by week 3
- Documentation adopted as team standard, now used for all new hires

**Leadership Principles**:
- **Earn Trust**: Invested personal time in mentoring beyond my immediate deliverables. Both new hires cited the structured onboarding as a key factor in their ramp-up speed in their first feedback cycle.
- **Invent and Simplify**: Created a reusable onboarding framework rather than ad-hoc knowledge transfer. The graduated task system (read → debug → fix → build) is now the team template.

---

## Growth and Development

**Strengths demonstrated**: Ownership (proactive problem identification), Dive Deep (data-driven root cause analysis), Customer Obsession (prioritization based on customer impact data).

**Areas for development**: Have Right, Lots — need to practice constructively challenging senior engineers' proposals when I see issues, rather than defaulting to compliance. Plan: commit to providing written feedback on at least 2 design reviews per sprint.

**Next period priorities**: Extend pipeline improvements to JP marketplace (target: same P99 and failure rate); begin scoping real-time order tracking feature (customer request volume: top 3 in Voice of Customer).
```

---

## 示例二：产品经理叙事备忘录

### 用户输入

```
我在亚马逊做PM，要写一个提案给总监，关于优化退货流程：
- 当前退货流程平均需要用户操作8步，耗时约4分钟
- 竞品平均3步，约1分钟
- 退货相关的客诉占总客诉的22%
- 提案：简化为3步退货，预计减少客诉15%，提升NPS 5分
- 需要工程投入：2个SDE 6周
- 风险：简化流程可能增加欺诈退货，预计增加2%
- 可选方案：只优化UI不改流程（效果小），或者加AI退货审核（投入大）
```

### ManageUp 输出

```markdown
# Proposal: Streamlined Return Flow

## Purpose

Requesting approval to invest 2 SDEs for 6 weeks to redesign the customer return flow from 8 steps to 3 steps, targeting a 15% reduction in return-related support contacts.

## Tenets (in order of priority)

1. Customer trust over short-term fraud risk — a frictionless return experience drives long-term retention
2. Simplicity at the interface, sophistication in the backend — customers see fewer steps; fraud detection works behind the scenes
3. Data-driven iteration — launch with monitoring, adjust based on actual fraud signal

## Current State

The return flow currently requires 8 steps and approximately 4 minutes of customer effort. Return-related complaints represent 22% of total support contacts. Competitor benchmarks show an average of 3 steps and ~1 minute.

## Problem / Opportunity

Customers are abandoning legitimate returns (estimated 8% drop-off rate mid-flow) and contacting support instead, driving 22% of total support volume. Each support contact costs approximately $4.50, representing an annualized cost of $2.1M for return-related contacts alone.

## Proposed Approach

Redesign the return flow to 3 steps: (1) select item, (2) choose reason + resolution, (3) confirm and print label. Backend changes include auto-approval for orders under $50 with good customer history, and ML-based fraud scoring for higher-risk returns.

## Alternatives Considered

| Option | Pros | Cons | Why not chosen |
|--------|------|------|---------------|
| UI-only refresh | Low investment (1 SDE, 2 weeks) | Steps remain at 6+, limited impact | Does not address root cause (too many steps) |
| AI-powered review for all returns | Highest fraud prevention | 4 SDEs, 12 weeks; delays launch by 2 months | Disproportionate investment for current fraud levels |

## Expected Results

- Return flow: 8 steps → 3 steps (62% reduction)
- Return-related support contacts: -15% (~$315K annual savings)
- NPS: +5 points (based on competitor benchmarks with similar flow length)
- Time to return: 4 minutes → ~1 minute

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Fraudulent returns increase | Medium | Est. +2% fraud rate | ML fraud scoring on returns >$50; manual review queue for flagged items; kill switch to revert if fraud exceeds 5% |
| Customer confusion during transition | Low | Temporary support spike | In-app guided walkthrough for 2 weeks post-launch |

## Ask

Approve 2 SDE headcount allocation for 6 weeks starting Q2. Decision needed by April 15 to meet Q3 launch target.
```
