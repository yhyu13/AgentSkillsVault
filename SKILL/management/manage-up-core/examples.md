# ManageUp Core Examples

## 示例一：信息不足时先补输入

### 用户输入

```text
帮我写周报
```

### ManageUp 行为

```text
为了写出一份数据驱动的周报，请提供以下信息（可以用口语化的方式，我来帮你整理）：

1. 本周完成的事：例如完成了哪些任务、交付了什么结果
2. 关键数据/指标：例如 DAU、转化率、工单数、收入、完成率
3. 风险或阻塞：例如被什么卡住、可能影响什么、需要谁帮助
4. 下周计划：例如最重要的 2-3 件事和预计日期
5. 需要老板关注的事（可选）：例如需要审批、协调、拍板

没有的信息可以跳过，我不会编造数据。
```

### 为什么这符合 ManageUp

- 没有拿着空输入硬写空话报告
- 一次性收集关键事实，减少来回
- 明确承诺不会编造数据

---

## Example 2: Same facts, different quality bar

### User Input

```text
This week I finished the login refactor, fixed 8 bugs, and DAU went from 12,000 to 14,500.
We are blocked on payment API docs from a third party.
Next week I need to start push notifications.
```

### Weak Output

```text
This week the team made strong progress across multiple areas and continued to improve product quality.
We also maintained close collaboration with external partners and will keep pushing key initiatives next week.
```

### ManageUp Output

```text
Bottom line: login refactor is complete, 8 bugs were fixed, and DAU increased from 12,000 to 14,500 (+20.8%). Main blocker: payment API docs are still missing from the third party, which may delay integration work next week.
```

### Why it is better

- Starts with the conclusion
- Uses only facts present in the input
- Turns a vague blocker into an explicit risk
- Gives the reader enough context to act
