# Microsoft 风格示例 (Microsoft Style Examples)

## Example 1: Software Engineer Connects

### User Input

```
Microsoft SDE2, writing my Connects:
- Led the migration of our team's notification service from on-prem to Azure
- Reduced infra costs by 28% ($340K annual savings)
- Improved reliability from 99.2% to 99.95% uptime
- Service handles 50M notifications/day for Teams and Outlook
- Collaborated with Azure Infra team and Security team to meet zero-trust requirements
- Struggled with the security review process - took 3 weeks longer than planned because I underestimated the compliance requirements
- Learning: need to engage security team at design phase, not after implementation
- Also mentored a new grad who shipped their first feature (notification batching) independently
- Core priority alignment: supports Security priority (zero-trust) and Azure-first strategy
- Next period: migrate 2 more services, start working on AI-powered notification prioritization
- Want coaching from my manager on how to influence cross-org decisions better
```

### ManageUp Output

```markdown
# Connects — H1 2026

## Impact

### Core Priorities Alignment
The notification service migration directly supports two company priorities: **Security** (all services now meet zero-trust requirements) and **Azure-first** (removed on-prem dependency, fully Azure-native).

### Key Contributions

**Notification Service Azure Migration**
- What I delivered: End-to-end migration of the notification service from on-prem infrastructure to Azure, covering architecture redesign, zero-trust compliance, and production cutover with zero customer-facing downtime
- Business impact: $340K annual infra cost reduction (28%); reliability improved from 99.2% to 99.95% uptime; zero-trust compliance achieved ahead of org deadline
- Who benefited: 50M daily notifications for Teams and Outlook users; platform engineering team reduced on-call burden by eliminating legacy infra incidents

**New Grad Mentorship — Notification Batching Feature**
- What I delivered: Structured mentorship for a new grad engineer from design through production ship. Created a phased plan (design review → implementation → testing → launch) with clear checkpoints
- Business impact: Notification batching feature shipped on schedule, reducing notification API calls by 35%; mentee ramped to independent contributor in 8 weeks

## How I Worked

### Collaboration & Inclusion
- Facilitated a joint design review with Azure Infra team (3 engineers) and Security team (2 engineers) to align on zero-trust architecture requirements. Resolved a conflict between performance requirements and security policy by proposing a tiered authentication model that satisfied both teams.
- Actively sought input from the new grad mentee during design discussions, incorporating their suggestion for batch size auto-tuning which improved the final implementation.

### Customer Focus
- Designed the migration cutover plan around peak notification hours (Teams usage data) to ensure zero customer-facing disruption. Monitored customer-facing latency during each rollout phase.

## Growth & Learning

### What I Learned
- Engaging security stakeholders must happen at design phase, not after implementation. Applying this to all future migrations by adding a "Security Design Review" checkpoint to our team's migration playbook.

### Where I Struggled
- The security compliance review took 3 weeks longer than planned. I had underestimated the scope of zero-trust requirements for notification services (data classification, encryption-at-rest audit, network segmentation). My initial timeline assumed a 1-week review, and I had to re-architect the data layer to meet classification requirements I hadn't accounted for. I addressed this by creating a pre-migration compliance checklist with the security team, which is now part of our standard process.

### Development Areas
- **Cross-org influence**: I can drive technical decisions within my team effectively, but struggled to accelerate the security review because I lacked established relationships with the security org. Plan: attend monthly Security Architecture Forum, build relationships with 2-3 security leads, and practice framing proposals in terms of security team priorities.

## Priorities Next Period

### Focus Areas
1. **Migrate 2 additional services to Azure** — using the playbook and compliance checklist from this migration to target 50% faster execution
2. **Scope AI-powered notification prioritization** — partner with ML team to explore using priority models to reduce notification fatigue (customer signal: top 5 UserVoice request)
3. **Continue mentoring** — support mentee's growth toward independent feature ownership

### Support Needed from Manager
- **Coaching on cross-org influence**: I'd appreciate guidance on how to build credibility and navigate decision-making with stakeholders outside our org, particularly when timelines and priorities conflict. A specific example: how to frame migration asks to security leads in a way that gets prioritized.
- **Visibility**: Nomination for the cross-org Architecture Review Board to build relationships and practice cross-org influence.
```

---

## 示例二：产品经理简短 Impact Summary

### 用户输入

```
微软 PM，写个简短的 impact summary：
- 负责 Copilot 在 Excel 中的数据分析功能
- 这个季度上线了自然语言生成图表功能，从 preview 推到了 GA
- MAU 从 12万 到 45万（preview 到 GA 的增长）
- 用户满意度 CSAT 4.2/5（基准线 3.8）
- 和 Excel 工程团队、AI Platform 团队合作
- 学到了如何管理 preview 用户到 GA 的期望差异
- 下季度要做数据分析自动建议功能
- 需要经理帮忙争取 AI Platform 的优先级排期
```

### ManageUp 输出

```markdown
# Impact Summary — Q1 2026

## Headline
Launched Copilot natural language chart generation to GA in Excel, growing MAU from 120K to 450K with CSAT 4.2/5.0 (vs 3.8 baseline). Directly supports AI-everywhere priority.

## Delivered
- **Copilot chart generation GA launch**: Transitioned from preview to GA, 275% MAU growth (120K → 450K)
- **User satisfaction above baseline**: CSAT 4.2/5.0 vs 3.8 baseline (+10.5%), driven by iterative improvements during preview based on user feedback
- **Cross-team alignment**: Coordinated feature readiness across Excel Engineering and AI Platform teams for synchronized GA launch

## How
- Collaboration: Partnered with Excel Engineering (feature integration) and AI Platform (model optimization) teams. Led weekly sync to align on GA readiness criteria, resolving 3 blocking issues in the final 2 weeks before launch.
- Customer insight: Analyzed 2,400 preview user feedback entries; top request (chart type auto-detection) was prioritized for GA, contributing to CSAT improvement.

## Learned
- Managing the expectation gap between preview and GA users requires different communication strategies. Preview users tolerate rough edges; GA users expect polish. Applied this by creating a "GA readiness checklist" covering reliability, error messaging, and edge case handling — adopted by adjacent Copilot PM teams.

## Next
- **Q2 priority**: Data analysis auto-suggestion feature — proactively surface insights from user data in Excel
- **Ask**: Need manager's help to secure AI Platform team priority allocation for model fine-tuning (competing with Word and PowerPoint Copilot features for the same team's bandwidth)
```
