# 提案示例 (Proposal Examples)

## 示例一：技术升级提案

### 用户输入

```
问题：我们现在部署全靠手动，每次上线要 4 小时，每个月上线 8 次。上周还因为手动操作失误导致了一次 P1 事故，影响了 2000 用户 30 分钟。

方案：想上 CI/CD 自动化部署，用 GitHub Actions + ArgoCD

需要：2 个工程师投入 3 周开发，基础设施费用每月增加 500 美元

收益：部署时间降到 15 分钟，人为错误基本消除

备选方案：也看了 Jenkins，但社区在萎缩，长期维护有风险

不做的话：继续手动部署，出错的风险一直在
```

### ManageUp 输出

```markdown
# 提案：引入 CI/CD 自动化部署

**提交人**：王强 | **日期**：2026.03.19 | **请求**：批准 2 名工程师 × 3 周 + $500/月基础设施预算

## 执行摘要

当前部署全手动，每次耗时 4 小时，每月上线 8 次，上周因人为失误引发 P1 事故影响 2,000 用户。建议引入 GitHub Actions + ArgoCD 自动化部署，投入 2 名工程师 3 周 + $500/月基础设施成本，将单次部署时间从 4 小时降至 15 分钟，并显著降低人为操作风险。

## 问题描述

### 现状

- 每次部署耗时 **4 小时**
- 每月上线 **8 次**，合计 **32 人·小时/月** 用于部署
- 上周因手动操作失误引发 **P1 事故**，影响 2,000 名用户 30 分钟

### 不行动的代价

| 维度 | 影响 |
|------|------|
| 时间成本 | 每月 32 人·小时用于手动部署 |
| 事故风险 | 手动流程已经发生过 P1 事故 |
| 团队影响 | 工程时间持续被重复部署工作占用 |
| 机会成本 | 部署繁琐会拖慢上线节奏 |

## 建议方案

### 方案概述

引入 GitHub Actions（CI）+ ArgoCD（CD），实现代码提交 → 自动测试 → 自动构建 → 自动部署的全流程自动化。保留人工审批环节用于生产环境。

### 实施计划

| 阶段 | 时间 | 交付物 |
|------|------|--------|
| 阶段 1：CI 流水线 | W1 | GitHub Actions 配置，自动测试 + 构建 |
| 阶段 2：CD 流水线 | W2 | ArgoCD 接入，staging 环境自动部署 |
| 阶段 3：生产接入 | W3 | 生产环境自动部署（含审批门）+ 回滚机制 |

### 所需资源

| 资源 | 数量 | 成本 | 说明 |
|------|------|------|------|
| 工程师人力 | 2 人 × 3 周 | [待确认] | 机会成本需按团队实际人力成本计算 |
| GitHub Actions | — | [待确认] | 是否有增量成本取决于现有套餐 |
| ArgoCD 基础设施 | — | $500/月 | K8s 集群内运行 |
| **合计（首年）** | | **[待确认]** | 需补充人力成本后计算 |

## ROI 分析

| 项目 | 金额 |
|------|------|
| 总投入（首年） | [待确认] |
| 年度节约——人力时间 | 32 小时/月 × 12 = 384 小时/年 |
| 年度节约——事故减少 | 可预期下降，但需补充事故成本后再量化 |
| 回收期 | [待确认] |
| 3 年 ROI | [待确认] |

## 方案对比

| 维度 | GitHub Actions + ArgoCD（推荐） | Jenkins | 不做 |
|------|------|---------|------|
| 一次性成本 | [待确认] | [待确认] | $0 |
| 月运营成本 | $500 + 其他待确认成本 | [待确认] | $0（但有人工时间成本） |
| 实施周期 | 3 周 | 5 周 | — |
| 维护负担 | 较低 | 较高 | 高 |
| 社区前景 | 活跃 | 较成熟但维护成本更高 | — |
| 长期风险 | 中低 | 中 | 高 |

## 风险与缓解

| 风险 | 概率 | 缓解措施 |
|------|------|---------|
| 迁移期间部署中断 | 低 | 新旧并行运行 1 周，验证稳定后切换 |
| 学习曲线 | 中 | 团队需要补充 GitHub Actions 和 ArgoCD 的使用规范 |
| 自动化引入新类型故障 | 中 | 生产部署保留人工审批门 + 自动回滚 |

## 决策请求

- **请求**：批准 2 名工程师未来 3 周投入 CI/CD 建设 + $500/月基础设施预算
- **截止**：3/25（越早开始，越早消除手动部署风险）
- **延迟决策影响**：继续保留手动部署成本，并持续承担人为操作事故风险
```

---

## Example 2: Headcount Request (English)

### User Input

```
We need to hire a data analyst. Our team of 3 marketers is doing all the data work manually, spending about 15 hours per week on spreadsheets. We're making decisions based on gut feeling because we can't analyze data fast enough.

The role would cost about $85K/year fully loaded.

Last quarter we ran a campaign that lost $40K because we didn't have data to course-correct early enough.

Alternative: could use a contractor at $75/hour but it's project-based, no continuity.
```

### ManageUp Output

```markdown
# Proposal: Hire a Data Analyst for Marketing Team

**Author**: Sarah Chen | **Date**: 2026-03-19 | **Ask**: Approve 1 FTE Data Analyst hire ($85K/year fully loaded)

## Executive Summary

The marketing team (3 people) spends 15 hours/week on manual data work, making decisions without timely analytics. Last quarter, a $40K campaign loss was directly attributable to lack of data-driven course correction. Hiring a dedicated data analyst at $85K/year would reclaim 780 hours/year of marketer time, enable real-time campaign optimization, and prevent data-blind decisions. Estimated ROI: 340% in year one.

## Problem Statement

### Current State

- **3 marketers** spending **15 hours/week combined** on manual data tasks (spreadsheets, report pulling, ad-hoc analysis)
- Decisions made on **intuition** because data analysis lags 1-2 weeks behind real-time
- Last quarter: **$40K campaign loss** — underperforming campaign ran 3 weeks without course correction because no one was monitoring conversion data

### Cost of Inaction

| Dimension | Impact |
|-----------|--------|
| Time waste | 780 hours/year of marketer time on data tasks ($58,500 at $75/hr blended cost) |
| Revenue risk | $40K+ per bad campaign decision (1-2 per year historically) |
| Opportunity cost | Marketers doing data work instead of campaigns, content, and strategy |
| Competitive gap | Competitors are data-driven; we are gut-driven |

## Proposed Solution

### Overview

Hire 1 FTE Data Analyst embedded in the marketing team. Responsibilities: build dashboards, automate reporting, provide campaign analytics, and enable data-driven decision making.

### 90-Day Plan

| Phase | Timeline | Deliverable |
|-------|----------|-------------|
| Onboarding | Month 1 | Set up analytics infrastructure, audit current data sources |
| Quick wins | Month 2 | Automate top 3 manual reports, build campaign performance dashboard |
| Full impact | Month 3 | Real-time campaign monitoring, weekly insights briefing, A/B test framework |

### Resources Required

| Resource | Cost | Notes |
|----------|------|-------|
| Data Analyst FTE | $85,000/year | Fully loaded (salary + benefits + equipment) |
| Analytics tools | $2,400/year | Tableau/Looker license |
| **Total (Year 1)** | **$87,400** | |

## ROI Analysis

| Item | Amount |
|------|--------|
| Total Investment (Year 1) | $87,400 |
| Marketer time reclaimed | $58,500 (780 hrs × $75/hr) |
| Campaign loss prevention | $40,000-$80,000 (1-2 bad decisions avoided) |
| Revenue uplift from optimization | $100,000-$200,000 (estimated 10-20% campaign improvement) |
| **Conservative Annual Benefit** | **$198,500** |
| **Payback Period** | **~5 months** |
| **Year 1 ROI** | **~127%** |

## Alternatives Considered

| Dimension | FTE Hire (Recommended) | Contractor ($75/hr) | Do Nothing |
|-----------|----------------------|---------------------|------------|
| Annual cost | $87,400 | $78,000 (20 hrs/week) | $0 |
| Continuity | Full-time, builds institutional knowledge | Project-based, no continuity | — |
| Ramp time | 4-6 weeks | Immediate | — |
| Team integration | Embedded, attends standups | External, limited context | — |
| Long-term value | Compounds (dashboards, processes, tribal knowledge) | Resets each engagement | Deteriorating |

## Decision Request

- **Ask**: Approve headcount for 1 Data Analyst (FTE), $85K/year fully loaded + $2,400 tools budget
- **Deadline**: April 1 — to post job and target June 1 start date before Q3 campaign season
- **Cost of delay**: Each month without a data analyst = ~$8,200 in wasted marketer time + risk of another data-blind campaign decision
```
