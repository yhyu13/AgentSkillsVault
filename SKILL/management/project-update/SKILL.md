---
name: project-update
description: "生成结构化的项目进展汇报，含红绿灯状态、里程碑追踪和风险矩阵。Use when writing project status reports, milestone updates, or project reviews. Triggers on: '项目汇报', '项目进展', '项目状态', 'project update', 'project status', 'milestone update', 'project review', '项目报告', '进展汇报'."
---

# 项目进展汇报 (Project Status Report)

继承 `manage-up-core` 五大原则。本技能专注于项目级状态汇报——老板最关心的是"项目还行不行？需不需要我介入？"

---

## 触发场景

- 用户要求写项目进展报告、项目状态汇报
- 用户提到 "project update"、"project status"、"milestone review"
- 用户提到 "项目汇报"、"进展同步"、"项目状态"

---

## 必填输入 (Required Inputs)

```
为了写出一份清晰的项目进展报告，请提供以下信息：

1. **项目名称和目标**：这个项目是做什么的？最终交付物是什么？
   例：用户中心 v2.0 重构，目标是统一登录体系并支持 SSO

2. **总体进度**：整体完成百分比？按计划 / 提前 / 延迟？
   例：整体完成 65%，比计划延迟 1 周

3. **里程碑状态**：各个关键节点完成情况
   例：需求评审 ✅ → 技术方案 ✅ → 开发 60% → 联调 未开始 → 上线 计划4/15

4. **风险和阻塞**：当前有什么问题可能影响交付？
   例：第三方 SSO 供应商接口不稳定，已出现 3 次超时；缺 1 名前端工程师

5. **资源状况**：人力、预算、设备是否充足？
   例：团队 5 人，其中 1 人下周开始休假 2 周

6. **需要老板决策/支持的事**（可选）
   例：是否批准增加 1 名外包前端？预计成本 ¥3 万/月

没有的信息可以跳过，我不会编造数据。
```

---

## 报告模板

### 中文模板

```markdown
# [项目名] 进展报告 YYYY.MM.DD

## 项目状态：🟢 正常 / 🟡 有风险 / 🔴 阻塞

**一句话状态**：[项目当前最重要的状态描述]

## 里程碑追踪

| 里程碑 | 计划完成 | 实际完成 | 状态 |
|--------|---------|---------|------|
| [里程碑1] | MM/DD | MM/DD | ✅ 已完成 |
| [里程碑2] | MM/DD | MM/DD | ✅ 已完成 |
| [里程碑3] | MM/DD | — | 🔄 进行中 (X%) |
| [里程碑4] | MM/DD | — | ⏳ 未开始 |

**总体进度**：X% 完成 | 计划上线日期：MM/DD | 当前预计：MM/DD

## 本阶段完成

- [具体交付物1]
- [具体交付物2]

## 风险矩阵

| 风险 | 概率 | 影响 | 状态 | 应对措施 |
|------|------|------|------|---------|
| [风险1] | 高/中/低 | 延迟 X 天 | 🔴 未解决 | [措施] |
| [风险2] | 高/中/低 | 成本增加 ¥X | 🟡 监控中 | [措施] |

## 资源状况

| 角色 | 需求 | 到位 | 缺口 |
|------|------|------|------|
| [角色1] | N 人 | M 人 | [缺口/充足] |

## 需要决策

1. **[决策事项]**：[选项A vs 选项B]
   - 建议：[你的建议及理由]
   - 截止：[决策截止日]
   - 不决策的后果：[延迟/成本影响]
```

### English Template

```markdown
# [Project] Status Report YYYY-MM-DD

## Status: 🟢 On Track / 🟡 At Risk / 🔴 Blocked

**Summary**: [One sentence — what's the project status and what does the boss need to know?]

## Milestone Tracker

| Milestone | Planned | Actual | Status |
|-----------|---------|--------|--------|
| [Milestone 1] | MM/DD | MM/DD | ✅ Done |
| [Milestone 2] | MM/DD | — | 🔄 In Progress (X%) |
| [Milestone 3] | MM/DD | — | ⏳ Not Started |

**Overall**: X% complete | Target launch: MM/DD | Current forecast: MM/DD

## Completed This Period

- [Deliverable 1]
- [Deliverable 2]

## Risk Matrix

| Risk | Likelihood | Impact | Status | Mitigation |
|------|-----------|--------|--------|------------|
| [Risk 1] | High | X-day delay | 🔴 Open | [Action] |

## Resources

| Role | Need | Have | Gap |
|------|------|------|-----|
| [Role] | N | M | [Gap] |

## Decisions Needed

1. **[Decision]**: [Option A vs B]
   - Recommendation: [your pick + rationale]
   - Deadline: [date]
   - Cost of inaction: [what happens if no decision]
```

---

## 红绿灯状态判定规则

自动根据用户提供的信息判断项目状态：

| 状态 | 条件 |
|------|------|
| 🟢 正常 (On Track) | 进度按计划或提前，无高风险阻塞项 |
| 🟡 有风险 (At Risk) | 存在可能导致延迟的风险，但有应对措施；或延迟在 1 周以内 |
| 🔴 阻塞 (Blocked) | 存在无法自行解决的阻塞项；延迟超过 1 周；关键资源缺失 |

---

## 反空话规则 (Anti-Fluff Rules)

| 禁止 | 替换为 |
|------|-------|
| 项目进展顺利 | 项目完成 X%，[提前/按时/延迟Y天] |
| 团队在积极推进 | 本阶段完成了 [具体交付物列表] |
| 遇到一些挑战 | 具体风险：[描述]，影响：[量化]，应对：[措施] |
| 需要更多资源 | 差 N 名 [角色]，不补充将导致 [具体影响] |
| project is progressing well | X% complete, [ahead/on/behind] schedule by Y days |
| facing some challenges | Risk: [description], Impact: [quantified], Mitigation: [action] |

---

## 写作规则

1. **红绿灯一目了然**：老板扫一眼状态标就知道需不需要关注
2. **里程碑用表格**：不要用大段文字描述进度，表格更清晰
3. **风险必须有应对**：只说有风险不说怎么办等于甩锅
4. **资源缺口要量化**：不是"资源紧张"，而是"差 1 人，延迟 2 周"
5. **计划日期 vs 预计日期**：如果有偏差，两个日期都要写出来

---

## 质量检查

- [ ] 红绿灯状态是否准确反映了实际情况？
- [ ] 每个里程碑是否有计划日期和实际/预计日期？
- [ ] 风险项是否都有影响评估和应对措施？
- [ ] 需要决策的事项是否有截止日和不决策后果？
- [ ] 是否有禁用词表中的模糊表达残留？
