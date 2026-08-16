# 向上汇报邮件示例 (Upward Email Examples)

## 示例一：升级阻塞项邮件

### 用户输入

```text
帮我给老板写封邮件：

项目是会员系统重构，整体大概完成 80%。
现在主要卡在第三方支付供应商，退款接口文档已经延迟 4 天了，我们技术这边催了两次。
如果这周五前还拿不到，原定 4/15 上线估计要推迟到 4/22。
我想请老板帮忙推动一下对方商务负责人。
```

### ManageUp 输出

```markdown
主题：需要 3/21 前协助推动支付供应商文档，避免会员系统上线延至 4/22

老板您好，

先同步核心结论：会员系统重构当前完成约 80%，但退款接口文档已被第三方支付供应商延迟 4 天；如果本周五前仍无法拿到，原定 4/15 上线预计将顺延至 4/22。

背景如下：
- 技术侧已向供应商催促 2 次，仍缺少退款接口文档
- 当前阻塞点集中在退款链路联调，其他模块开发已基本就绪
- 如继续等待，联调和回归测试窗口都会被压缩

需要您帮助确认：
- 是否由您或商务负责人直接联系对方商务团队，升级跟进退款接口文档
- 截止时间：希望 3/21 下班前确认推动方式
- 如不处理的影响：会员系统上线时间预计从 4/15 推迟到 4/22

下一步：
- 我会继续准备非支付链路的测试和上线清单，确保文档到位后可立即进入联调

谢谢，
[你的名字]
```

### 为什么有效

- 主题行直接写明请求和影响
- 第一段就把状态、阻塞和后果讲清楚
- 老板能立刻知道自己需要做什么

---

## Example 2: FYI executive follow-up

### User Input

```text
Draft an email to my VP after today's planning review.

Main points:
- Q2 hiring approved for 4 engineers, pending finance confirmation next month
- Platform migration is now phased: core services by end of Q2, remaining services by end of Q3
- I own the revised migration plan and need to send it by March 28
- No decision yet on the new AI feature; feasibility study due April 5

This is mostly an FYI plus clear next steps.
```

### ManageUp Output

```markdown
Subject: Q2 planning follow-up: hiring approved, migration phased, AI study due Apr 5

Hi [VP Name],

Bottom line: today’s planning review resolved Q2 hiring and migration phasing, while the AI feature remains open pending the feasibility study due April 5.

Context:
- Q2 hiring was approved for 4 engineers, pending finance confirmation next month
- Platform migration will be phased: core services by end of Q2, remaining services by end of Q3
- I own the revised migration plan and will send it by March 28
- No decision was made on the AI feature; feasibility study is due April 5

What I need from you:
- No immediate decision needed at this point; sharing for visibility
- If priorities change before March 28, please let me know so I can adjust the migration plan

Next steps:
- I will send the revised migration plan by March 28
- I will share the AI feasibility study by April 5

Thanks,
[Your Name]
```
