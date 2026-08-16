# Google 风格示例 (Google Style Examples)

## Example 1: Software Engineer Self-Review

### User Input

```
Google SWE L5, here's my half:
- O: Improve Ads serving reliability
- KR1: Reduce serving errors from 0.5% to 0.1% (got to 0.15%)
- KR2: Achieve 99.95% uptime (achieved 99.97%)
- KR3: Migrate 3 legacy services to new framework (migrated 2 of 3)
- Main accomplishment: redesigned the error handling pipeline, reduced cascading failures by 85%
- Worked with SRE team and Ads frontend team, 12 engineers total across 3 teams
- Challenge: the 3rd service migration was blocked by an undocumented dependency on a deprecated API, spent 3 weeks figuring it out
- Learning: should have done dependency audit upfront
- Next half: finish 3rd migration, start latency optimization project targeting P99 under 50ms
```

### ManageUp Output

```markdown
# Self-Review — Q1-Q2 2026

## Impact Summary

Redesigned the Ads serving error handling pipeline, reducing cascading failures by 85% and serving errors from 0.5% to 0.15%. Achieved 99.97% uptime (exceeding 99.95% target). Led cross-functional effort with SRE and Ads frontend teams (12 engineers, 3 teams).

## OKR Scorecard

**O: Improve Ads serving reliability**

| Key Result | Target | Actual | Score |
|------------|--------|--------|-------|
| KR1: Reduce serving errors 0.5% → 0.1% | 0.1% | 0.15% | 0.7 |
| KR2: Achieve 99.95% uptime | 99.95% | 99.97% | 1.0 |
| KR3: Migrate 3 legacy services | 3 | 2 | 0.6 |

## Key Accomplishments

### Error Handling Pipeline Redesign
- **Scope**: End-to-end redesign of Ads serving error handling, covering 3 serving clusters and 15M+ QPS
- **What I did**: Designed and implemented new circuit-breaker pattern with graduated fallbacks; led design review with SRE team; drove rollout across all clusters
- **Impact**: Cascading failures reduced by 85%; serving errors from 0.5% to 0.15% (70% reduction); contributed to uptime exceeding target at 99.97%
- **Collaboration**: Partnered with SRE team (4 engineers) on monitoring integration and Ads frontend team (3 engineers) on client-side fallback behavior

### Legacy Service Migration (2 of 3)
- **Scope**: Migrating 3 legacy Ads serving services from deprecated framework to new service mesh
- **What I did**: Completed migration of 2 services (user targeting, bid optimization); established migration playbook for the team
- **Impact**: 2 migrated services show 23% lower latency and 40% reduction in operational toil
- **Collaboration**: Created migration playbook adopted by 2 adjacent teams for their own migrations

## Challenges and Growth

- **Undocumented dependency on deprecated API**: The 3rd service (creative selection) had a hidden dependency on a deprecated internal API. Spent 3 weeks tracing call graphs and negotiating with the owning team. **Learning**: Should have conducted a comprehensive dependency audit before committing to the migration timeline. Will apply this as step 1 in the migration playbook going forward.
- **KR1 at 0.7 instead of 1.0**: The remaining 0.05pp gap comes from a long-tail of edge cases in non-primary markets. Decided to prioritize uptime (KR2) over chasing diminishing returns. Will address in H2 with market-specific error handling.

## Looking Ahead

- **Next half focus**: Complete 3rd service migration (Q3); launch latency optimization targeting P99 <50ms (currently 72ms)
- **Growth areas**: Systems design at scale — seeking opportunities to lead larger cross-org initiatives
- **Support needed**: Staffing for latency project (need 1 additional SWE); design review slot with infrastructure leads
```

---

## 示例二：产品经理 OKR 评分

### 用户输入

```
我在 Google 做 PM，这个季度的 OKR 情况：
- O1: 提升 Google Maps 商家搜索体验
  - KR1: 商家搜索点击率从 18% 提升到 24%，实际做到 22.5%
  - KR2: 搜索结果页跳出率从 35% 降到 28%，实际降到 29.2%
  - KR3: 上线商家评分排序优化，目标全量上线，实际灰度到 60%
- 主要做了：重新设计了搜索结果卡片，增加了评分、距离、营业状态等信息
- 和 UX 团队、Search infra、Local Ads 团队合作
- 挑战：Local Ads 团队担心新排序影响广告收入，谈判了 3 周才对齐方案
- 下季度：全量上线排序优化，启动 Maps 商家推荐功能
```

### ManageUp 输出

```markdown
# OKR Review — Q1 2026

## Objective 1: 提升 Google Maps 商家搜索体验

| Key Result | Target | Actual | Score |
|------------|--------|--------|-------|
| KR1: 商家搜索点击率 18%→24% | 24% | 22.5% | 0.75 |
| KR2: 搜索结果跳出率 35%→28% | 28% | 29.2% | 0.83 |
| KR3: 商家评分排序优化全量上线 | 100% | 60% (灰度) | 0.6 |

**Summary**: 搜索结果卡片重新设计带动点击率 +4.5pp 和跳出率 -5.8pp，符合 stretch 目标预期进度。排序优化因广告收入影响协调延迟 3 周，灰度至 60%。核心 learning：跨团队利益冲突应在 OKR 制定阶段就拉齐，而非执行中再谈判。

## Key Accomplishment: 搜索结果卡片重设计

- **Scope**: Google Maps 商家搜索结果展示重构，影响日均 2 亿+ 搜索请求
- **What I did**: 主导产品方案设计（新增评分、距离、营业状态），协调 UX 团队完成 3 轮用户测试，与 Search infra 对齐技术方案
- **Impact**: 点击率 +4.5pp（18%→22.5%），跳出率 -5.8pp（35%→29.2%）
- **Collaboration**: UX 团队（设计 + 用研），Search infra（索引更新），Local Ads 团队（广告收入影响评估）

## Challenges and Growth

- **Local Ads 利益协调**：新排序方案可能影响广告展示位，Local Ads 团队担心收入下降。经过 3 周谈判，最终达成折中方案：灰度期间并行 A/B 测试广告收入影响。**Learning**: 下次在 OKR 制定阶段就邀请相关利益方参与 KR 设计，避免执行中的阻塞。

## Looking Ahead

- **Q2 focus**: 排序优化全量上线（解决广告影响后）；启动 Maps 商家推荐功能 PRD
- **Growth areas**: 跨 PA 利益协调能力——希望承担更多需要多 PA 对齐的项目
```
