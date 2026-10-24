---
name: meeting-summary
description: "将会议笔记或录音转文字整理为结构化会议纪要，聚焦决策和行动项。Use when writing meeting summaries, meeting minutes, or organizing meeting notes. Triggers on: '会议纪要', '会议总结', '整理会议记录', 'meeting summary', 'meeting minutes', 'meeting notes', '开会记录', '会议内容整理', 'summarize this meeting'."
---

# 会议纪要 (Meeting Summary)

继承 `manage-up-core` 五大原则。会议纪要的核心：**老板不想知道你们聊了什么，他想知道决定了什么、谁要做什么、什么时候做完**。

---

## 触发场景

- 用户要求整理会议记录、写会议纪要
- 用户提到 "meeting summary"、"meeting minutes"、"meeting notes"
- 用户贴了一段会议转录文字或原始笔记
- 用户提到 "总结一下刚才的会"、"整理一下会议内容"

---

## 必填输入 (Required Inputs)

```
为了整理出有价值的会议纪要，请提供以下信息：

1. **会议主题**：这个会是讨论什么的？
   例：v2.0 需求评审会 / Q1 复盘会 / 周例会

2. **参会人**：谁参加了？（名字和角色）
   例：张三（产品）、李四（研发）、王五（设计）、赵六（老板）

3. **会议内容**：可以是以下任何形式——
   - 语音转文字的原始记录
   - 你自己的速记笔记
   - 关键讨论点的概要
   例：讨论了 3 个方案，最后选了方案 B；小李的模块要延期一周；老板说预算可以加 5 万

4. **做了哪些决定？**（如果能记得）
   例：决定用方案 B；延期一周上线；下周三前给出技术方案

5. **有哪些待办事项？**（如果能记得）
   例：张三下周一出需求文档；李四周三给技术方案；王五周五给设计稿

没有的信息可以跳过。如果你只有一段转录文字，直接贴过来即可，我帮你整理。
```

---

## 报告模板

### 中文模板

```markdown
# 会议纪要：[会议主题]

**日期**：YYYY.MM.DD | **时间**：HH:MM - HH:MM | **地点/方式**：[线上/线下]

**参会人**：[姓名（角色）, ...]

---

## 核心结论

[一句话：这个会最重要的结论是什么？]

## 决策事项

| # | 决策内容 | 决策人 |
|---|---------|--------|
| 1 | [做了什么决定] | [谁拍板] |
| 2 | [做了什么决定] | [谁拍板] |

## 行动项

| # | 事项 | 负责人 | 截止日 | 状态 |
|---|------|--------|--------|------|
| 1 | [具体任务] | [谁] | MM/DD | ⏳ 待完成 |
| 2 | [具体任务] | [谁] | MM/DD | ⏳ 待完成 |

## 关键讨论点

### [议题 1]

- [讨论要点]
- [不同意见/争论点]
- [结论]

### [议题 2]

- [讨论要点]
- [结论]

## 遗留问题

- [未达成共识的问题] → 下次会议继续讨论 / 由 [谁] 调研后反馈

## 下次会议

**时间**：[日期/时间] | **议题**：[预期讨论内容]
```

### English Template

```markdown
# Meeting Summary: [Topic]

**Date**: YYYY-MM-DD | **Time**: HH:MM - HH:MM | **Format**: [Virtual/In-person]

**Attendees**: [Name (Role), ...]

---

## Bottom Line

[One sentence: the most important outcome of this meeting]

## Decisions Made

| # | Decision | Decided By |
|---|----------|-----------|
| 1 | [What was decided] | [Who made the call] |

## Action Items

| # | Action | Owner | Due Date | Status |
|---|--------|-------|----------|--------|
| 1 | [Specific task] | [Who] | MM/DD | Pending |

## Key Discussion Points

### [Topic 1]

- [Main points discussed]
- [Different opinions]
- [Conclusion]

## Open Items

- [Unresolved question] → To be discussed at next meeting / [Who] to research

## Next Meeting

**Date**: [date] | **Agenda**: [topics]
```

---

## 反空话规则 (Anti-Fluff Rules)

| 禁止 | 替换为 |
|------|-------|
| 与会人员充分讨论了XX | 讨论了 [具体议题]，结论是 [什么] |
| 达成了广泛共识 | 决定 [具体决策]，由 [谁] 拍板 |
| 后续将持续跟进 | [谁] 在 [日期] 前完成 [具体事项] |
| 进行了深入交流 | 讨论了 [N] 个方案，选择了 [方案X]，理由是 [什么] |
| discussed at length | discussed [N] options, decided on [X] because [reason] |
| will follow up | [Owner] to complete [task] by [date] |
| general consensus | decided [specific decision], approved by [who] |

---

## 写作规则

1. **行动项是灵魂**：会议纪要最重要的部分是行动项（谁 + 做什么 + 什么时候完成）
2. **每个行动项必须有 owner + 日期**：没有 owner 的行动项不会被执行
3. **决策和讨论分开**：决策是确定的结论，讨论是过程，不要混在一起
4. **讨论内容只写要点**：不需要逐字记录谁说了什么，只记核心观点和结论
5. **遗留问题显式标出**：没解决的问题也要记录，避免被遗忘
6. **控制篇幅**：30 分钟的会 → 半页纸；1 小时的会 → 1 页纸

---

## 处理原始转录文字

如果用户贴了一段语音转文字的原始记录（通常很长、很乱），按以下步骤处理：

1. **提取决策**：找到所有"确定了"、"就这么定了"、"我同意"等决策信号
2. **提取行动项**：找到所有"你去做"、"下周之前"、"谁负责"等任务分配
3. **识别议题**：按话题分组，每个议题提取核心论点和结论
4. **过滤噪音**：去掉寒暄、重复、跑题内容
5. **补全信息**：如果行动项缺 owner 或日期，标注为 `[待确认]`

---

## 质量检查

- [ ] 每个行动项是否都有 owner 和截止日期？
- [ ] 决策事项是否清晰列出了"决定了什么"和"谁拍板"？
- [ ] 是否有"深入讨论了XX"但没写结论的空话？
- [ ] 遗留问题是否都标注了下一步？
- [ ] 篇幅是否与会议长度匹配（不过长）？
