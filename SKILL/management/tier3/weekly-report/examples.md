# 周报示例 (Weekly Report Examples)

## 示例一：工程团队周报

### 用户输入（口语化、碎片化）

```
这周做了几件事：
- 把登录模块重构完了，用了新的 JWT 方案，之前是 session 的
- 修了 8 个 bug，其中有个支付相关的 P0 挺紧急的
- DAU 这周涨了，从 12000 到 14500
- 和产品那边开了个会讨论 v2.0 的需求，基本定了方向
- 有个问题是第三方支付接口文档还没给我们，催了两次了
- 下周要开始做消息推送功能，还有继续修 bug
```

### AI 输出（ManageUp 风格）

```markdown
# 后端团队周报 2026.03.16

## 核心结论

本周完成登录模块重构并修复 8 个 bug（含 1 个 P0），DAU 增长 20.8%。主要风险：第三方支付接口文档延迟，可能影响支付模块下周的联调计划。

## 关键指标

| 指标 | 上周 | 本周 | 变化 |
|------|------|------|------|
| DAU | 12,000 | 14,500 | +20.8% |
| Bug 修复 | — | 8 个（含 1 P0） | — |
| 线上事故 | 0 | 0 | 持平 |

## 本周完成

- **登录模块重构**：从 Session 方案迁移至 JWT，已通过测试并上线，Token 刷新逻辑全部覆盖
- **Bug 修复 ×8**：含 1 个 P0（支付金额计算精度问题），7 个 P1/P2，全部已验证上线
- **v2.0 需求对齐**：与产品团队完成方向评审，确认以消息推送和用户分群为核心功能

## 风险与阻塞

- **第三方支付接口文档延迟**：已催促 2 次，对方尚未提供 → 影响：支付模块联调可能延迟 3-5 天 → **需要：是否由老板直接联系对方商务推动？**

## 下周计划

| 优先级 | 事项 | 预计完成日 |
|--------|------|-----------|
| P0 | 消息推送功能——技术方案设计 | 3/19 |
| P1 | 继续修复遗留 bug（剩余 5 个 P2） | 3/21 |
| P1 | 跟进第三方支付接口文档 | 3/18 |

## 需要决策

- **支付接口对接推动方式**：建议由您直接联系对方商务负责人，技术层面催促已不够有效。如本周五前仍无文档，支付模块上线将从 3/28 推迟至 4/2。
```

---

## 示例二：对比——空话周报 vs ManageUp 周报

### 空话版（典型大模型输出）

```markdown
# 本周工作总结

本周团队在多个方面取得了积极进展。在项目开发方面，我们持续推进了核心功能的开发工作，并与相关团队进行了有效的沟通协调。在质量保障方面，团队积极修复了若干已知问题，代码质量有所提升。

主要工作：
1. 持续推进项目核心功能开发
2. 与产品团队进行了多次有效沟通
3. 修复了若干已知 bug，提升了系统稳定性
4. 优化了部分代码结构

下周计划继续推进各项工作，确保项目按计划推进。
```

**问题诊断**：
- "积极进展" — 什么进展？完成了什么？
- "持续推进" — 推到哪了？完成了还是没完成？
- "有效沟通" — 沟通了什么？结论是什么？
- "若干 bug" — 几个？什么级别？
- "有所提升" — 提升了多少？从多少到多少？
- 完全没有数据、日期、影响评估
- 老板看完不知道要做什么

### ManageUp 版（同样的信息）

```markdown
# 研发团队周报 2026.03.16

## 核心结论

用户登录模块重构完成上线（Session → JWT），本周修复 8 个 bug 含 1 个 P0。v2.0 方向已与产品对齐。阻塞项：第三方支付文档延迟，需推动。

## 本周完成

- **登录模块重构上线**：JWT 方案替换 Session，覆盖 Token 刷新全流程
- **Bug 修复 ×8**：1 P0（支付精度）+ 7 P1/P2，全部验证上线
- **v2.0 需求评审**：与产品对齐核心方向——消息推送 + 用户分群

## 风险

- **第三方支付文档延迟**：催促 2 次未果 → 支付联调可能延 3-5 天 → **需要您推动商务对接**

## 下周

| 事项 | 完成日 |
|------|--------|
| 消息推送技术方案 | 3/19 |
| 遗留 P2 bug ×5 | 3/21 |
```

---

## Example 3: Marketing Team Weekly (English)

### User Input

```
This week:
- Launched the spring campaign on social media, got 45K impressions in first 3 days
- Email campaign sent to 12,000 subscribers, open rate 28%, click rate 4.2%
- Blog post published on AI trends, 2,300 views so far
- Waiting on design team for landing page assets, delayed 2 days
- Next week: finalize landing page, start paid ads campaign, prep for Q2 planning meeting
```

### ManageUp Output

```markdown
# Marketing Weekly Report 2026-03-16

## Bottom Line

Spring campaign launched with strong initial traction (45K impressions in 3 days). Email performance above benchmark. Blocker: landing page assets delayed 2 days from design team — paid ads launch depends on this.

## Key Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Social impressions (3 days) | 30K | 45K | +50% above target |
| Email open rate | 25% | 28% | Above benchmark |
| Email click rate | 3.5% | 4.2% | Above benchmark |
| Blog views | — | 2,300 | Tracking |

## Completed

- **Spring social campaign launched**: 45K impressions in first 3 days, 50% above 30K target
- **Email campaign delivered**: Sent to 12,000 subscribers, 28% open rate / 4.2% CTR (both above benchmark)
- **AI trends blog post published**: 2,300 views in first week

## Risks & Blockers

- **Landing page assets delayed**: Design team 2 days behind → Impact: paid ads launch will shift from 3/19 to 3/21 → Need: can you check in with design lead?

## Next Week

| Priority | Item | Target Date |
|----------|------|-------------|
| P0 | Finalize landing page (pending design assets) | 3/19 |
| P0 | Launch paid ads campaign | 3/21 |
| P1 | Prepare Q2 planning deck | 3/21 |

## Decision Needed

- **Paid ads budget**: Recommend increasing from $5K to $8K given strong organic traction. Need approval by 3/19 to lock in ad placements.
```
