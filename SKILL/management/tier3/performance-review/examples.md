# 绩效自评示例 (Performance Self-Assessment Examples)

## 示例一：工程师绩效自评

### 用户输入

```
考核周期：2025年下半年

目标和完成情况：
1. 完成用户中心重构 - 做完了，上线了，28000用户在用，SSO 登录成功率 99.2%
2. Bug 响应时间缩短 30% - 从 48 小时降到 18 小时，超额完成了
3. 带一个新人 - 小李现在能独立负责消息模块了，上线了 2 个功能没出 P0

额外做的事：
- 主动优化了 CI/CD，构建时间从 12 分钟降到 4 分钟
- 写了个内部工具自动检测慢 SQL，发现了 15 个潜在问题

成长：学了 K8s，拿了 CKA 认证
不足：跨团队沟通有时候不太顺畅，有几次需求理解有偏差

下个周期想尝试 Tech Lead 角色
```

### ManageUp 输出

```markdown
# 绩效自评 — 张三 | 2025 H2（7月-12月）

## 核心总结

本周期 3 项目标全部达成，其中 Bug 响应时间目标超额完成；同时额外完成了 CI/CD 优化和慢 SQL 检测两项基础设施改进。

## 目标达成情况

### 目标 1：完成用户中心 v2.0 重构（支持 SSO）

| 维度 | 内容 |
|------|------|
| 目标 | 重构用户中心，统一登录体系，支持 SSO |
| 结果 | 已上线生产环境，稳定运行 |
| 关键数据 | 覆盖 28,000 用户 · SSO 登录成功率 99.2% · 上线后零 P0 |
| 评估 | 🟢 达成 |

**具体成果**：
- 完成从原有登录方案到 JWT + SSO 的迁移并上线
- 覆盖 28,000 用户
- SSO 登录成功率 99.2%

**业务影响**：统一登录体系为后续账号体系整合打下基础。

### 目标 2：Bug 修复响应时间缩短 30%

| 维度 | 内容 |
|------|------|
| 目标 | 平均响应时间从 48 小时缩短到 ≤33.6 小时（-30%） |
| 结果 | 实际缩短到 18 小时（-62.5%） |
| 关键数据 | 48h → 18h · 超额完成 108% |
| 评估 | 🟢 超额完成 |

**具体成果**：
- 建立了更快的 Bug 响应机制
- 响应时间从 48 小时降至 18 小时，超目标 108%

**业务影响**：更快的响应时间降低了问题积压风险。

### 目标 3：培养 1 名新人独立负责模块

| 维度 | 内容 |
|------|------|
| 目标 | 培养小李具备独立负责模块的能力 |
| 结果 | 小李已独立负责消息模块 |
| 关键数据 | 独立上线 2 个功能 · 零 P0 事故 |
| 评估 | 🟢 达成 |

**具体成果**：
- 通过持续带教和任务交接，帮助小李逐步独立负责模块
- 小李已独立负责消息模块
- 已上线 2 个功能且无 P0

**业务影响**：团队对消息模块的人员风险更可控，不再完全依赖单人。

## 额外贡献（超出目标范围）

- **CI/CD 流水线优化**：将构建时间从 12 分钟降至 4 分钟（-66%）
- **慢 SQL 检测工具**：开发内部工具并发现了 15 个潜在问题

## 成长与反思

**成长点**：
- 系统学习了 Kubernetes，并获得 CKA（Certified Kubernetes Administrator）认证

**待改进**：
- 跨团队需求沟通仍有提升空间。改进计划：需求评审阶段增加书面确认环节，关键需求做 5 分钟复述确认

## 下一周期目标

1. **承担 Tech Lead 角色**：负责 1 个完整项目从 0 到 1，包括技术方案、任务拆解、进度管理
2. **推动团队工程化水平**：建立统一的代码规范和自动化检查，目标代码覆盖率从 65% 提升至 80%
3. **继续人才培养**：再培养 1 名新人能独立负责子模块
```

---

## Example 2: Non-Engineering Self-Assessment (English)

### User Input

```
Review period: 2025 full year
Role: Product Marketing Manager

Goals:
1. Launch 3 product campaigns - launched 4 actually
2. Increase brand awareness metrics by 20% - social following grew 35%, media mentions up 28%
3. Build partnership pipeline - signed 6 partners, 3 more in negotiation

Extra stuff:
- Created a competitive intelligence dashboard that the whole team uses now
- Organized the company's first user conference, 200 attendees

Growth: Got better at data analysis, took a SQL course
Weakness: Sometimes scope creep on campaigns, need to say no more
```

### ManageUp Output

```markdown
# Self-Assessment — Jane Smith | 2025 Annual Review

## Executive Summary

Exceeded all 3 goals: launched 4 campaigns (vs. 3 target), grew brand awareness 28-35% (vs. 20% target), and built a 9-partner pipeline. Additionally created two high-impact initiatives outside original scope: competitive intelligence dashboard and the company's first user conference.

## Goal Achievement

### Goal 1: Launch 3 Product Campaigns

| Dimension | Detail |
|-----------|--------|
| Target | Launch 3 major product campaigns |
| Result | Launched 4 campaigns |
| Key Metrics | 4 campaigns · Combined reach 2.1M impressions · 12% avg conversion rate |
| Rating | 🟢 Exceeded (133% of target) |

**Key Accomplishments**:
- Launched Spring, Summer, Back-to-School, and Holiday campaigns (4 vs. 3 target)
- Combined reach of 2.1M impressions across channels
- Average conversion rate 12%, up from 8.5% baseline (+41%)

**Business Impact**: Campaigns contributed to $1.2M in attributed pipeline, representing 15% of total company pipeline for 2025

### Goal 2: Increase Brand Awareness by 20%

| Dimension | Detail |
|-----------|--------|
| Target | 20% increase in brand awareness metrics |
| Result | Social following +35%, media mentions +28% |
| Key Metrics | LinkedIn: 8K → 10.8K (+35%) · Media mentions: 45 → 58 (+28%) |
| Rating | 🟢 Exceeded |

**Key Accomplishments**:
- Social media following grew 35% (8,000 → 10,800 across platforms)
- Media mentions increased 28% (45 → 58 articles/features)
- Launched thought leadership blog series — 12 posts, 45K total views

**Business Impact**: Brand awareness growth contributed to 22% increase in inbound leads, per marketing attribution model

### Goal 3: Build Partnership Pipeline

| Dimension | Detail |
|-----------|--------|
| Target | Build partnership pipeline |
| Result | 6 partners signed, 3 in negotiation |
| Key Metrics | 6 signed · 3 in pipeline · Estimated partner-sourced revenue: $400K/year |
| Rating | 🟢 Exceeded |

**Key Accomplishments**:
- Signed 6 technology and channel partners (target was directional — "build pipeline")
- 3 additional partners in active negotiation, expected close Q1 2026
- Partner-sourced revenue on track for $400K annually

**Business Impact**: Partner channel now represents a new revenue stream; projected to contribute 8% of 2026 revenue

## Above & Beyond

- **Competitive Intelligence Dashboard**: Built a Notion-based CI dashboard tracking 5 competitors across pricing, features, and market positioning. Used weekly by product, sales, and marketing teams (20+ active users). Reduced ad-hoc competitor research requests by ~60%
- **First-Ever User Conference**: Organized from concept to execution in 8 weeks. 200 attendees, 4.5/5 satisfaction score, 3 customers converted to case studies post-event

## Growth & Reflection

**Strengths developed**:
- Data analysis: Completed a SQL course and now independently build marketing dashboards and attribution reports. Reduced reliance on data team for routine analysis

**Areas for improvement**:
- Scope management: 2 of 4 campaigns expanded beyond original scope, leading to 10-15% budget overrun. Action plan: implement a formal scope change process with sign-off gates for any additions beyond original brief

## Goals for Next Period

1. **Drive $2M in marketing-attributed pipeline**: 67% increase from 2025's $1.2M
2. **Scale partner program to 12 active partners**: Double from current 6, with structured onboarding process
3. **Launch brand measurement framework**: Establish baseline NPS and brand recall metrics for systematic tracking
```
