---
name: upward-email
description: "生成发给老板、skip-level 或关键利益相关方的向上汇报邮件，聚焦结论、背景、请求与下一步。Use when drafting upward emails, escalation emails, stakeholder updates, or executive follow-ups. Triggers on: '写邮件给老板', '向上汇报邮件', '催老板决策', 'escalation email', 'status email', 'follow-up email', 'email to manager', 'draft an update email', '给领导写邮件'."
---

# 向上汇报邮件 (Upward Email)

继承 `manage-up-core` 五大原则。本技能专注于一个高频但经常写砸的场景：给老板写邮件。核心要求不是“写得礼貌”，而是**让对方 30 秒内知道发生了什么、为什么重要、需要做什么**。

---

## 触发场景

- 用户要求给老板、skip-level、CXO 或关键利益相关方写更新邮件
- 用户需要催决策、升级风险、同步进展或做事后跟进
- 用户提到 "status email"、"follow-up email"、"escalation email"、"email to manager"

---

## 必填输入 (Required Inputs)

```
为了写出一封老板愿意看完并愿意回复的邮件，请提供以下信息：

1. **收件人是谁？** 直属上级 / skip-level / 跨部门负责人 / 客户
   例：研发总监；产品 VP；CEO

2. **这封邮件的核心目的是什么？**
   例：同步进展；升级风险；请求决策；会后跟进

3. **关键事实是什么？**
   例：项目完成 80%；供应商文档延迟 4 天；Q1 收入达成 97%

4. **为什么对对方重要？**
   例：如果本周五前不决策，4/15 上线会推迟到 4/22

5. **你希望对方做什么？**
   例：批准预算；帮忙推动供应商；确认方案 A/B；仅供知悉

6. **截止时间/下一步是什么？**（可选）
   例：希望 3/25 前确认；我会在周三补充详细方案

没有的信息可以跳过，我不会编造数据。
```

---

## 报告模板

### 中文模板

```markdown
主题：[一句话主题：结论 / 风险 / 请求]

[老板称呼]，

先同步核心结论：[一句话写最重要的状态/风险/请求]。

背景如下：
- [事实 1：具体数据 / 日期 / 状态]
- [事实 2：具体影响]
- [事实 3：已采取的动作]

需要您帮助确认：
- [具体请求 / 选项 / 建议方案]
- 截止时间：[日期]
- 如不处理的影响：[量化后果]

下一步：
- [你接下来会做什么]

谢谢，
[你的名字]
```

### English Template

```markdown
Subject: [One-line topic: decision / risk / update]

Hi [Name],

Bottom line: [one sentence with the most important status, risk, or ask].

Context:
- [Fact 1: concrete data / date / status]
- [Fact 2: impact]
- [Fact 3: action already taken]

What I need from you:
- [Specific ask / options / recommendation]
- Deadline: [date]
- Cost of inaction: [quantified consequence]

Next steps:
- [What I will do next]

Thanks,
[Your Name]
```

---

## 反空话规则 (Anti-Fluff Rules)

| 禁止 | 替换为 |
|------|-------|
| 想跟您同步一下相关进展 | 核心结论：[一句话状态] |
| 目前整体还算顺利 | 当前完成 X%，但 [具体风险] 仍未解决 |
| 希望您关注一下 | 需要您在 [日期] 前 [做什么决定] |
| 后续我们会持续推进 | 下一步：我将在 [日期] 前完成 [具体动作] |
| wanted to keep you posted | Bottom line: [specific status] |
| things are generally on track | X% complete, but [specific risk] remains open |
| would appreciate your support | Need your decision on [specific ask] by [date] |

---

## 写作规则

1. **主题行先传达价值**：不要写“项目更新”，要写“需要 3/25 前确认是否增加 1 名前端”
2. **第一句必须自带结论**：老板经常只看主题和前两行
3. **邮件不是周报全文搬运**：只保留和收件人相关的事实
4. **请求必须可执行**：给出选项、建议和截止时间
5. **礼貌不等于冗长**：少寒暄，少铺垫，直接进入事实和请求

---

## 质量检查

- [ ] 主题是否一眼说明邮件目的？
- [ ] 第一段是否直接给出结论或请求？
- [ ] 是否只保留了收件人需要知道的事实？
- [ ] 请求是否具体到人、动作、截止时间？
- [ ] 是否量化了不回复/不决策的后果？
- [ ] 是否有模糊表达残留？
