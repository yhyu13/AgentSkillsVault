# 腾讯风格示例 (Tencent Style Examples)

## 示例一：社交产品周报

### 用户输入

```
我是腾讯社交产品的PM，这周情况：
- DAU 1250万（上周1210万），次日留存45.2%（上周45.8%）
- 7日留存28.3%（上周28.1%）
- 周三DAU掉了一下，后来查到是推送策略灰度导致的，已经回滚了
- 重点项目：群聊消息体验优化，已经完成开发和code review，下周开始灰度
- 另一个项目：消息已读回执，设计稿已确认，开始开发，预计4月初灰度
- 有个风险是消息已读回执需要基础架构组的长连接升级配合，他们说排到了4月第二周
- 下周：群聊优化灰度5%先看数据，继续推进已读回执开发
```

### ManageUp 输出

```markdown
# 社交产品周报 2026.03.16

## 核心结论

DAU 1250 万（周环比 +3.3%），次留小幅下滑 0.6pp 需关注。群聊消息体验优化下周启动灰度。已读回执依赖基础架构组长连接升级，对方排期 4 月第二周，可能影响全量时间。

## 指标模块

### 核心数据

| 指标 | 本周 | 上周 | 周环比 | 目标 | 达标 |
|------|------|------|--------|------|------|
| DAU | 1250 万 | 1210 万 | +3.3% | 1300 万 | ⚠️ |
| 次日留存 | 45.2% | 45.8% | -0.6pp | 46% | ⚠️ |
| 7 日留存 | 28.3% | 28.1% | +0.2pp | 28% | ✅ |

### 数据异动分析

- **DAU 周三下跌**：推送策略灰度实验导致部分用户未收到唤醒推送 → 影响约 30 万 DAU → 已于当天回滚推送策略，周四 DAU 恢复正常
- **次留下滑 0.6pp**：初步判断与周三推送异动相关，需观察回滚后下周数据是否回升

## 项目模块

### 重点项目

**群聊消息体验优化**
- 当前阶段：开发完成，已通过 code review
- 本周节点：完成全部开发 + 代码评审
- 下一步：下周灰度 5%
- 预计全量：4/05（视灰度数据）
- 风险：无

**消息已读回执**
- 当前阶段：开发中
- 本周节点：设计稿确认，开始开发
- 预计灰度：4 月初
- 预计全量：4 月中下旬
- 风险：依赖基础架构组长连接升级（见下方风险表）

## 风险与依赖

| 风险/依赖 | 影响 | 依赖方 | 预计解决 | 状态 |
|-----------|------|--------|---------|------|
| 长连接升级排期 | 已读回执灰度延迟约 1 周 | 基础架构组 | 4/14 | 🟡 |

## 下周计划

| 优先级 | 事项 | 预期产出 | 完成日 |
|--------|------|---------|--------|
| P0 | 群聊优化灰度 5% | 灰度数据（消息打开率、互动率） | 3/22 |
| P0 | 已读回执开发推进 | 完成核心逻辑开发 | 3/21 |
| P1 | 次留下滑持续监控 | 确认是否回升至 45.5%+ | 3/21 |
```

---

## Example 2: Game Team Monthly Report (English)

### User Input

```
Tencent gaming team, monthly report:
- Game DAU: 5.8M (last month 5.5M), MAU 18.2M (last month 17.6M)
- Revenue: 42M RMB (target 45M, 93.3%)
- New season pass launched mid-month, conversion rate 12.5% (target 15%)
- Player retention D7: 38.2% (last month 37.8%)
- Major bug: matchmaking latency spike on day 12, peak at 8 seconds (normal 2s), fixed within 6 hours
- New map development: art assets 80% complete, gameplay testing starts next week
- Risk: server capacity for new season event needs cloud team to add 200 nodes by month-end
- Next month: new map launch, season event, optimize season pass conversion
```

### ManageUp Output

```markdown
# Gaming Product Monthly Report 2026-03

## Bottom Line

DAU +5.5% to 5.8M, revenue at 93.3% of target (42M/45M RMB). Season pass conversion 12.5% underperforming target by 2.5pp — optimization planned. New map on track for next month launch. Server capacity expansion needed for season event.

## Metrics Dashboard

| Metric | This Month | Last Month | MoM | Target | Status |
|--------|-----------|-----------|-----|--------|--------|
| DAU | 5.8M | 5.5M | +5.5% | 6M | ⚠️ |
| MAU | 18.2M | 17.6M | +3.4% | 18M | ✅ |
| Revenue | 42M | — | — | 45M | ⚠️ (93.3%) |
| Season pass conv. | 12.5% | — | — | 15% | ⚠️ |
| D7 retention | 38.2% | 37.8% | +0.4pp | 38% | ✅ |

### Anomaly Analysis

- **Matchmaking latency spike (Day 12)**: Peak latency hit 8s (normal 2s) due to session routing misconfiguration after hotfix deployment → fixed within 6 hours → post-mortem: added automated latency alerting at 3s threshold

## Project Updates

**New Map**
- Stage: Art 80% complete, entering gameplay testing
- This month: Art asset completion from 50% to 80%
- Expected launch: Next month
- Risk: None currently

**Season Pass Optimization**
- Stage: Analysis
- Finding: Conversion 12.5% vs 15% target — pricing and reward visibility identified as gap areas
- Next step: A/B test with adjusted reward preview UI

## Dependencies & Risks

| Item | Impact | Owner | ETA | Status |
|------|--------|-------|-----|--------|
| Server capacity +200 nodes | Season event may lag without capacity | Cloud infrastructure team | Month-end | 🟡 |

## Next Month

| Priority | Item | Expected Outcome | Due |
|----------|------|-----------------|-----|
| P0 | New map launch | Target DAU +8% from new content | Mid-month |
| P0 | Season event | Target revenue +20% during event | Month-end |
| P1 | Season pass conversion optimization | A/B test targeting 15% conversion | Ongoing |
```
