# 字节跳动风格示例 (ByteDance Style Examples)

## 示例一：产品经理 OKR 周报

### 用户输入

```
我是字节的产品经理，这周的情况：
- 我的OKR：O 是提升短视频推荐的用户留存，KR1是7日留存从35%到42%，KR2是人均观看时长从22分钟到28分钟，KR3是完成推荐算法V2上线
- 承接部门O2「提升产品核心体验指标」
- KR1 这周做了两个AB实验，一个推荐多样性实验涨了1.2个点到37.8%，另一个个性化封面没效果
- KR2 时长这周到了24.5分钟，主要是上了沉浸式播放模式
- KR3 算法V2在灰度测试中，覆盖了10%用户，效果还在观察
- 卡住的事情：KR3灰度扩量需要算法团队排期，他们说要排到下周
- 下周：扩大KR1多样性实验的覆盖量，KR3灰度扩到30%
```

### ManageUp 输出

```markdown
# 短视频推荐团队周报 2026.03.16

## 核心结论

KR1 留存提升 2.8pp（35%→37.8%），KR2 时长增长 11.4%（22→24.5 min），KR3 算法 V2 灰度中（10%），扩量需算法团队排期协调。

## OKR 进度

**O: 提升短视频推荐的用户留存**
承接：部门 O2「提升产品核心体验指标」

| Key Result | 目标值 | 当前值 | 进度 | 较上周 |
|------------|--------|--------|------|--------|
| KR1: 7 日留存 35%→42% | 42% | 37.8% | 54% | +17pp |
| KR2: 人均时长 22→28 min | 28 min | 24.5 min | 41.7% | +11pp |
| KR3: 推荐算法 V2 上线 | 全量上线 | 灰度 10% | 30% | +30pp |

## 本周关键动作

- **推荐多样性 AB 实验**：实验组 7 日留存 +1.2pp（36.6%→37.8%），统计显著 → 对应 KR1，推动进度从 37% 到 54%
- **个性化封面实验**：未达显著差异，已关闭 → 对应 KR1，结论：封面优化非留存主驱动力
- **沉浸式播放模式上线**：人均时长从 22 min 提升至 24.5 min（+11.4%）→ 对应 KR2，推动进度从 0% 到 41.7%
- **算法 V2 灰度启动**：覆盖 10% 用户，效果观察中 → 对应 KR3

## 风险与阻塞

- **算法 V2 灰度扩量排期**：算法团队排期紧张，扩量到 30% 需等下周 → 影响 KR3 整体上线时间约 5 天 → **需要：是否由您协调算法团队优先级？**

## 下周计划

| 优先级 | 事项 | 对应 KR | 预计产出 |
|--------|------|---------|---------|
| P0 | 多样性实验扩大覆盖量至全量 | KR1 | 预计留存再涨 0.5-1pp |
| P0 | 算法 V2 灰度扩至 30% | KR3 | 确认效果是否支持全量 |
| P1 | 设计新一轮留存实验方案 | KR1 | 储备下一波增长动力 |

## 复盘

- **做得好**：多样性实验快速验证有效，实验周期控制在 5 天
- **待改进**：个性化封面实验假设未充分验证就启动，浪费 1 周实验位。改进：下次先做小流量预验证，3 天内判断方向再决定是否放量
```

---

## Example 2: Engineering Lead OKR Weekly (English)

### User Input

```
ByteDance eng lead, here's my week:
- O: Improve backend system reliability, aligned to CTO's O1 "Platform Stability"
- KR1: P99 latency from 200ms to under 100ms (currently at 145ms)
- KR2: Zero P0 incidents per quarter (0 so far, Q2)
- KR3: Automated test coverage from 60% to 85% (currently 72%)
- This week: migrated 3 core services to new connection pool, reduced P99 from 160ms to 145ms
- Also added integration tests for payment service, coverage up 4% to 72%
- Risk: database team hasn't approved the sharding proposal, blocking further latency optimization
- Next week: continue latency work on search service, push for sharding approval
```

### ManageUp Output

```markdown
# Backend Platform Weekly Report 2026-03-16

## Bottom Line

P99 latency down 9.4% this week (160ms to 145ms); test coverage at 72% (+4pp). Key blocker: database sharding proposal pending approval — blocks next phase of latency optimization.

## OKR Progress

**O: Improve backend system reliability**
Aligned to: CTO O1 "Platform Stability"

| Key Result | Target | Current | Progress | WoW |
|------------|--------|---------|----------|-----|
| KR1: P99 latency <100ms | <100ms | 145ms | 55% | +15pp |
| KR2: Zero P0 incidents/quarter | 0 | 0 | 100% | — |
| KR3: Test coverage 60%→85% | 85% | 72% | 48% | +16pp |

## Key Actions This Week

- **Connection pool migration (3 services)**: P99 latency from 160ms to 145ms (-9.4%) → moved KR1 from 40% to 55%
- **Payment service integration tests**: Coverage from 68% to 72% (+4pp) → moved KR3 from 32% to 48%

## Risks & Blockers

- **Database sharding proposal**: Pending DB team approval for 2 weeks → blocks KR1 progress below 120ms → **Need: escalation to DB team lead or joint review meeting this week**

## Next Week

| Priority | Item | KR | Expected Outcome |
|----------|------|----|-----------------|
| P0 | Search service latency optimization | KR1 | Target P99 from 145ms to 125ms |
| P0 | Push for sharding approval | KR1 | Unblock next optimization phase |
| P1 | Add integration tests for user service | KR3 | Coverage to 76% |
```
