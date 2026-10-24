# 季度复盘示例 (Quarterly Review Examples)

## 示例一：研发团队季度复盘

### 用户输入

```
2026 Q1 复盘，研发团队

OKR：
1. O1: 提升用户留存 - KR: 30日留存从35%到45%，实际做到42%
2. O2: 上线 v2.0 - KR: 3/31前上线，实际延迟到4/15，因为第三方SSO接口延迟
3. O3: 团队扩编 - KR: 招3个工程师，实际招到2个，第3个offer发了预计4月入职

亮点：
- DAU 从 15K 突破到 22K，历史新高
- 系统可用性达到 99.95%，比上季度的 99.7% 好很多
- 新人小李成长很快，已经能独立负责模块

没做好的：
- v2.0 延期了，主要是低估了第三方集成复杂度
- 有一次 P0 事故，支付相关的，影响了 2000 用户 30 分钟

教训：
- 涉及第三方的项目要提前做技术调研
- 关键链路需要有降级方案

下季度：
- 完成 v2.0 上线
- 留存率达到 45%
- 启动 v3.0 规划
- 推动 CI/CD 自动化
```

### ManageUp 输出

```markdown
# 研发团队 Q1 季度复盘 | 2026

## 季度总评

**一句话总结**：Q1 在用户增长（DAU +47%）和系统稳定性（可用性 99.95%）上表现强劲，但 v2.0 上线延迟约 2 周、留存目标差 3 个百分点未完全达成，根因是第三方集成复杂度被低估。

**OKR 达成率**：1/3 项完全达成，2/3 项部分达成（整体完成度约 80%）

## 目标记分卡

| 目标 | 关键结果 | 目标值 | 实际值 | 达成率 | 评价 |
|------|---------|--------|--------|--------|------|
| O1: 提升用户留存 | 30 日留存率 | 45% | 42% | 93% | 🟡 |
| O2: 上线 v2.0 | 3/31 前上线 | 3/31 | 4/15（延迟 15 天） | 未达成 | 🔴 |
| O3: 团队扩编 | 招 3 名工程师 | 3 人 | 2 人到岗 + 1 人 offer 已发 | 67%（到岗） | 🟡 |

## 重要胜利 (Top Wins)

### 胜利 1：DAU 突破 22K 历史新高（+47%）

DAU 从 Q4 的 15,000 增长至 22,000，季度环比增长 47%，创历史新高。增长主要由两个因素驱动：
- 新用户注册渠道优化（注册转化率从 12% 提升至 18%）
- 核心功能体验改善带来的口碑传播

**业务影响**：用户基数增长为 Q2 商业化和留存优化提供了更大的数据样本和收入基础。

### 胜利 2：系统可用性从 99.7% 提升至 99.95%

通过基础设施升级和监控体系完善，可用性从 Q4 的 99.7% 提升至 99.95%。具体措施：
- 数据库读写分离，消除了 3 个已知的性能瓶颈
- 新增 15 条核心链路监控告警

**业务影响**：换算为季度内仅 22 分钟计划外停机（vs Q4 的 131 分钟），用户体验和信任度显著提升。

### 胜利 3：新人小李快速成长

小李从需要逐行 Review 到独立负责消息模块，上线 2 个功能、零 P0。团队"巴士因子"从 1 人提升至 2 人。

## 未达成项与根因分析

### v2.0 上线延迟 15 天（3/31 → 4/15）

- **目标**：3/31 前完成 v2.0 上线（含 SSO 集成）
- **实际**：开发完成但联调被第三方阻塞，预计 4/15 上线
- **差距**：延迟 15 天
- **根因分析（5 Whys）**：
  1. 为什么延迟？→ 第三方 SSO 接口联调耗时超出预期
  2. 为什么超出预期？→ 供应商接口文档不完整，联调中发现 5 个未文档化的行为
  3. 为什么没有提前发现？→ 技术方案阶段没有做原型验证，直接基于文档评估工期
  4. **根因：涉及第三方集成的项目缺少"技术预研"环节，直接基于文档做工期评估，风险敞口大**
- **教训**：涉及第三方集成的项目，技术方案阶段必须增加 1-2 周原型验证（PoC），验证核心接口的真实行为

### 留存率差 3 个百分点（42% vs 45%）

- **目标**：30 日留存从 35% 提升至 45%
- **实际**：提升至 42%（+7pp），距目标差 3pp
- **差距**：达成目标的 93%
- **根因**：留存优化策略在 2 月才全面上线（比计划晚 3 周），主要受 v2.0 开发资源挤占影响
- **教训**：留存优化应有独立资源保障，不应与大版本开发共用人力

### P0 事故（支付链路中断 30 分钟）

- **事件**：3/12 支付接口因环境变量配置错误中断 30 分钟，影响 2,000 名用户
- **根因**：手动部署流程缺乏环境变量校验，人为失误无防护机制
- **改进措施**：Q2 推动 CI/CD 自动化部署（已立项）

## 关键教训 (Learnings)

1. **第三方集成必须做 PoC**：以后所有涉及第三方 API 的项目，技术方案阶段增加 1-2 周原型验证，验证核心接口真实行为而非只依赖文档
2. **关键链路需要降级方案**：支付、登录等核心链路在设计时就要考虑降级方案（如本地 Token 缓存），而不是事后补
3. **独立资源保障重点项目**：留存优化等持续性目标不应与大版本开发共用全部人力，需保留至少 1 人专注

## 下季度规划 (Q2)

### 目标概览

| 目标 | 关键结果 | 目标值 | 承接自 |
|------|---------|--------|--------|
| O1: 完成 v2.0 上线 | 4/15 前上线 + 首周无 P0 | 4/15 | Q1 延续 |
| O2: 留存率达标 | 30 日留存率 | 45% | Q1 延续 |
| O3: 部署自动化 | CI/CD 全链路自动化 | 部署时间 <15min | 全新 |
| O4: 启动 v3.0 规划 | 完成需求评审 + 技术方案 | 5/31 前完成 | 全新 |

### 关键举措

1. **v2.0 上线冲刺**（4/1-4/15）：SSO 联调 + 全量用户迁移 + 灰度发布
2. **CI/CD 建设**（4/15-5/15）：GitHub Actions + ArgoCD，消除手动部署风险
3. **留存专项**：保留 1 名工程师持续投入，重点优化新用户 D1-D7 体验
4. **v3.0 规划**（5 月）：与产品协同完成需求评审和技术可行性分析

### 需要的支持

- 第 3 名工程师 4 月到岗确认（offer 已发，需 HR 跟进入职流程）
- CI/CD 基础设施预算审批（$500/月）——已提交提案
```

---

## Example 2: Sales Team QBR (English)

### User Input

```
Q1 2026 review for sales team

Goals:
1. Revenue target $2M - we did $1.85M (93%)
2. Close 15 new enterprise deals - closed 12
3. Reduce sales cycle from 45 days to 35 days - got it to 38 days

Wins:
- Closed our biggest deal ever - $350K annual contract with Acme Corp
- Built a new outbound sequence that has 22% response rate vs old 8%
- NPS from customers 78, up from 65

Misses:
- Missed revenue by $150K mainly because 3 deals slipped to Q2
- Enterprise deal count was short - pipeline was good but closing took longer than expected

Learnings:
- Enterprise deals need executive sponsorship earlier in the process
- Our new outbound sequence works much better, should double down

Next quarter:
- Revenue target $2.5M
- Close the 3 slipped deals plus 15 new ones
- Hire 2 more SDRs
```

### ManageUp Output

```markdown
# Sales Team Q1 Business Review | 2026

## Quarter Summary

**Bottom Line**: Revenue hit $1.85M (93% of $2M target) — $150K shortfall due to 3 enterprise deals slipping to Q2. Strong leading indicators: biggest deal in company history ($350K Acme Corp), outbound response rate 2.75x improvement, and NPS up 20%.

**Goal Achievement**: 0/3 fully met, but all within striking distance (average 90% achievement)

## Scorecard

| Objective | Key Result | Target | Actual | Achievement | Rating |
|-----------|-----------|--------|--------|-------------|--------|
| Revenue | Quarterly revenue | $2.0M | $1.85M | 93% | 🟡 |
| New Enterprise Deals | Deals closed | 15 | 12 | 80% | 🟡 |
| Sales Cycle | Average days to close | 35 days | 38 days | 91% | 🟡 |

## Top Wins

### Win 1: Largest Deal in Company History — $350K Acme Corp

Closed a $350K annual contract with Acme Corp, our largest single deal ever. 6-month sales cycle with multi-stakeholder approval. Sets precedent for enterprise-tier pricing and validates our upmarket positioning.

**Business Impact**: Acme deal alone represents 18.9% of Q1 revenue. Case study potential for future enterprise sales.

### Win 2: Outbound Sequence Revamp — 22% Response Rate (+175%)

Redesigned outbound email sequence with personalized pain-point messaging. Response rate increased from 8% to 22% (2.75x improvement). Generated 45 new qualified opportunities in Q1.

**Business Impact**: New pipeline value from outbound: $1.2M (up from $400K in Q4). Scalable — will compound with additional SDR hires.

### Win 3: Customer NPS 78 (Up from 65)

NPS improved 20% quarter-over-quarter (65 → 78), driven by improved onboarding process and faster support response times.

**Business Impact**: Higher NPS correlates with renewal rates. Q1 renewal rate: 94% (vs. 88% in Q4).

## Misses & Root Cause Analysis

### Revenue Miss: $1.85M vs $2.0M Target (-$150K)

- **Target**: $2.0M
- **Actual**: $1.85M
- **Gap**: -$150K (7%)
- **Root Cause**: 3 enterprise deals totaling $180K slipped to Q2. All 3 are in final contract review — delay caused by customer-side legal review taking 2-3 weeks longer than typical
- **Lesson**: Enterprise deals with contract value >$100K should have legal review timeline built into forecast. Add 2-week legal buffer to all large deal forecasts

### Enterprise Deal Count: 12 vs 15 Target

- **Target**: 15 new enterprise deals
- **Actual**: 12 closed, 3 in late stage (slipped to Q2)
- **Gap**: -3 deals (20%)
- **Root Cause**: Pipeline was healthy (22 qualified opportunities), but conversion bottlenecked at the executive sponsorship stage. 5 of 10 lost/delayed deals lacked a champion at VP+ level
- **Lesson**: Require executive sponsor identification by Stage 2 (discovery). No deal advances to Stage 3 without confirmed executive champion

### Sales Cycle: 38 Days vs 35-Day Target

- **Target**: 35 days
- **Actual**: 38 days (down from 45 — a 16% improvement)
- **Gap**: 3 days over target
- **Root Cause**: SMB cycle improved significantly (32 days, on target), but enterprise cycle remained at 52 days, pulling the average up
- **Lesson**: Set separate cycle targets for SMB and enterprise segments

## Key Learnings

1. **Executive sponsorship is the #1 deal accelerator**: Deals with VP+ champion closed 40% faster and had 3x higher win rate. Action: mandate executive sponsor identification by Stage 2
2. **New outbound sequence is a growth lever**: 2.75x response rate improvement is a signal to scale. Action: hire 2 SDRs and train on new playbook in Q2
3. **Segment-specific targets needed**: Blended metrics mask segment performance. Action: set separate KPIs for SMB vs enterprise starting Q2

## Next Quarter Plan (Q2)

### Objectives

| Objective | Key Result | Target | Source |
|-----------|-----------|--------|--------|
| Revenue | Quarterly revenue | $2.5M | Carryover + growth |
| Enterprise Deals | New deals closed | 18 (3 carryover + 15 new) | Carryover + new |
| Sales Cycle (SMB) | Average days to close | 30 days | New (segmented) |
| Sales Cycle (Enterprise) | Average days to close | 45 days | New (segmented) |
| Team | Hire SDRs | 2 new hires | New |

### Key Initiatives

1. **Close Q1 carryover deals** ($180K): 3 deals in legal review, target close by April 15
2. **Scale outbound**: Hire 2 SDRs by mid-April, train on new outbound playbook, target 60+ new qualified opportunities
3. **Executive sponsor mandate**: Update sales process — no deal past Stage 2 without identified VP+ champion
4. **Segmented forecasting**: Implement separate pipeline views and targets for SMB vs enterprise

### Support Needed

- Headcount approval for 2 SDRs (estimated $120K fully loaded for remainder of year)
- Sales enablement: updated enterprise case study deck (need marketing support)
- Legal team fast-track: dedicated legal review slot for enterprise deals >$100K
```
