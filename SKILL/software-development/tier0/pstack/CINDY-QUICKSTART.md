# Cindy 快速上手：pstack 任务目录与完成检查

> 这是给 Cindy 伙伴和人的最短路径。规则全文在 `RULES.md`，团队角色与门禁在 `TEAM.md`，宿主差异在 `HOST-ADAPTER.md`。

## 0. 先确认三件事

- 技能位置：`~/.agents/skills/pstack/`
- 触发方式：说“pstack mode”“按 pstack 规矩做”“用 pstack 做这个任务”，或直接点 `pstack` 技能。
- 工作目录：你的项目根目录。所有任务写到 `<项目>/.pstack/tasks/<id>/`。

## 1. 五分钟最短路径

```bash
# 1) 建任务
node ~/.agents/skills/pstack/scripts/pstack.mjs new-task fix-login \
  --title "Fix login redirect" --owner @alice --risk yellow --deadline 2026-11-20

# 2) 填 task.md 和 plan.md

# 3) 执行，把证据放进 evidence/

# 4) 填 result.md，状态改为 done

# 5) 跑检查
node ~/.agents/skills/pstack/scripts/pstack.mjs check fix-login
```

看到 `PASS fix-login (status: done, evidence: 1)` 且退出码为 0，才算完成。

## 2. 任务目录长什么样

```text
.pstack/tasks/fix-login/
├── task.md
├── plan.md
├── result.md
├── roles.md
├── evidence/
│   └── login-test.log
└── blocked.md        # 只有阻塞时才需要
```

| 文件 | 必须填什么 | 谁填 |
|---|---|---|
| `task.md` | Goal、Scope、Acceptance、Non-goals、Owner、Risk tier | 人和 agent 确认 |
| `plan.md` | Playbook、Steps、Verification、Risks、Roles | agent |
| `evidence/` | 命令输出、测试日志、截图、测量数据 | agent |
| `result.md` | What changed、Evidence、Verification、Risks/Rollback、Status | agent |
| `roles.md` | 角色分配；没有子代理时写降级说明 | agent |
| `blocked.md` | 缺什么、试过什么、谁能解、下一步 | agent |

## 3. task.md 怎么填

这是任务的合同。没填完不要写代码。

### Goal

一句话，写用户可感知的结果，不写实现方案。

- 好：登录成功后跳转到用户原本要去的页面。
- 差：改 AuthCallback 的 redirect 参数。

### Scope

写清楚动什么、不动什么。非目标单独一节，防止范围膨胀。

### Acceptance

每条都必须可判定。用 `- [ ]` 开头，完成时改成 `- [x]`。

- 好：未登录访问 `/settings` 后登录，落在 `/settings`。
- 好：直接访问 `/login` 登录，落在首页。
- 差：登录体验正常。
- 差：代码质量良好。

### Owner 和 Risk tier

- Owner 写 `@handle`，不要写 `unassigned`。
- 绿：可逆、局部、无共享状态。
- 黄：共享代码或 API、迁移、用户可见变化。
- 红：不可逆、安全、删数据、生产部署、客户消息。

### 完整示例

```markdown
# Task: Fix login redirect

- ID: fix-login
- Owner: @alice
- Risk tier: yellow
- Created: 2026-11-19
- Deadline or review point: 2026-11-20

## Goal
登录成功后跳转到用户原本要去的页面，而不是首页。

## Scope
- In scope: 登录回调重定向
- Out of scope: 登录表单样式

## Acceptance
- [ ] 未登录访问 /settings 后登录，落在 /settings
- [ ] 直接访问 /login 登录，落在首页
- [ ] 现有登录测试全部通过

## Non-goals
- 不改第三方登录
- 不改会话存储

## Constraints
- 不改数据库 schema
- 不引入新依赖

## Open questions
- 无
```

## 4. plan.md 怎么填

### Playbook

写你选中的 playbook 名字和路径。没有匹配的写 `figure-it-out`。

```text
Bug fix, references/upstream/skills/poteto-mode/playbooks/bug-fix.md
```

### Steps

从 playbook 里复制步骤，改成 `- [ ]` 复选框。完成一步勾一步。

### Verification

写命令、预期结果、证据路径。没有验证方式就说明你还没想清楚。

```text
- Command: npm test -- login
- Expected result: 所有登录测试通过
- Evidence path: evidence/login-test.log
```

### Risks

写风险、缓解措施、回滚方式。红色任务必须有回滚方案。

### Roles

写 Driver、Reviewer、Verifier。没有子代理时，在 `roles.md` 里写清楚谁兼了哪个角色。

### 完整示例

```markdown
# Plan: Fix login redirect

## Playbook
Bug fix, references/upstream/skills/poteto-mode/playbooks/bug-fix.md

## Steps
- [ ] 复现问题
- [ ] 修重定向逻辑
- [ ] 跑登录测试

## Verification
- Command: npm test -- login
- Expected result: 全部通过
- Evidence path: evidence/login-test.log

## Risks
- Risk: 重定向循环
- Mitigation: 加回归测试
- Rollback: revert commit

## Roles
- Driver: main
- Reviewer: @bob
- Verifier: @carol
```

## 5. evidence/ 怎么留

证据不是“我跑过了”，是别人能复跑的东西。

### 命名建议

- `login-test.log`：测试输出
- `redirect-check.txt`：命令输出
- `settings-after-login.png`：截图
- `perf-baseline.txt`：测量数据

### 一个证据文件至少包含

1. 完整命令。
2. 退出码。
3. 关键输出。
4. 复现步骤或环境说明。

### 差与好

- 差：`done`。
- 差：`tests passed`。
- 好：`npm test -- login`、退出码 0、12 个用例通过、日志全文。

大文件可以放外部存储，但 `result.md` 必须给出可访问的链接和校验方式。

## 6. result.md 怎么填

### What changed

写用户可感知的变化和改动的文件或系统。

### Evidence

必须链接到 `evidence/` 下的文件，或一个可访问的 URL。检查器会看这一节。

### Verification

写命令、退出码、实际观察到的结果。

### Risks / Rollback

写残余风险和回滚步骤。没有风险也要写“无”。

### Status

只能是 `done` 或 `blocked`。`in-progress` 会检查失败。

### 完整示例

```markdown
# Result: Fix login redirect

## What changed
- 登录回调保留 returnTo 参数

## Evidence
- `evidence/login-test.log` — 登录测试输出，退出码 0

## Verification
- Command: npm test -- login
- Exit code: 0
- Observed: 所有登录测试通过

## Risks / Rollback
- Residual risk: 无
- Rollback steps: revert commit

## Status
done

## Follow-ups
- 无
```

## 7. 阻塞时怎么填

如果缺信息、缺权限、缺环境，不要硬猜。

1. 把 `result.md` 的 `Status` 改成 `blocked`。
2. 建 `blocked.md`，写四节：
   - Missing information
   - What was tried
   - Who can unblock
   - Next action when unblocked
3. 跑检查。阻塞任务可以 `PASS`，但必须解释清楚。

```markdown
# Blocked: Fix login redirect

## Missing information
- 测试环境没有 OAuth 回调地址

## What was tried
- 本地跑 npm test -- login，回调 404

## Who can unblock
- @alice，需要提供测试环境的回调配置

## Next action when unblocked
- 更新 .env.test 后重跑登录测试
```

## 8. 完成检查怎么验

### 跑一个任务

```bash
node ~/.agents/skills/pstack/scripts/pstack.mjs check fix-login
```

通过时输出：

```text
PASS fix-login (status: done, evidence: 1)
  acceptance: 2/2
  plan steps: 3/3
```

退出码为 0。

### 跑全部任务

```bash
node ~/.agents/skills/pstack/scripts/pstack.mjs check --all
```

### 看状态

```bash
node ~/.agents/skills/pstack/scripts/pstack.mjs status
```

### 常见失败与修法

| 输出 | 含义 | 怎么修 |
|---|---|---|
| `task directory does not exist` | 还没建任务 | 先跑 `new-task` |
| `missing task.md` 等 | 文件没建 | 补文件 |
| `missing or empty section "Goal"` | 章节没写或为空 | 补标题和内容 |
| `acceptance checkbox(es) still open` | 验收没做完 | 做完勾选，或改 blocked |
| `plan step(s) still open` | 计划步骤没做完 | 做完勾选，或改 blocked |
| `status is still in-progress` | 还没到 done | 真正完成后改 `done` |
| `evidence/: no evidence files` | 没证据 | 往 `evidence/` 放文件 |
| `Evidence section must link to an evidence/ file or a URL` | 结果页没链证据 | 在 `## Evidence` 加链接 |
| `contains unfilled angle-bracket text` | 模板占位没替换 | 替换 `<...>` |
| `contains an unsubstituted template token` | `{{TOKEN}}` 没替换 | 替换模板变量 |
| `blocked.md: required when status is blocked` | 阻塞但没写原因 | 补 `blocked.md` 四节 |
| `result.md: Status must be "done" or "blocked"` | 状态写错 | 改成 `done` 或 `blocked` |

## 9. Cindy 特定注意事项

### 没有子代理

按角色顺序执行，不假装并行。在 `roles.md` 记录每个角色由谁做、降级影响是什么。`swarm` 变成顺序检查清单，`arena` 变成多方案逐项对比。

### 没有模型选择

用宿主默认模型，在 `result.md` 写“模型由宿主决定，实际为 X”。不要假装用了某个模型，也不要传宿主不认识的 slug。

### 没有 PR 工具

用 `pr.md` 模板写标题、Why、What changed、Scope、Tradeoffs、Blast Radius、Verification。把 diff 和证据路径写清楚。

### 没有 MCP

优先用 shell、HTTP、文件系统。都不行时写 `blocked.md`，说明缺哪个工具、需要谁提供。不要用假数据绕过。

### 技能列表看不到 pstack

检查 `~/.agents/skills/pstack` 是否存在，以及各宿主技能目录是否是指向它的 junction。让宿主重新扫描技能目录。

### 不要运行上游脚本

`references/upstream/**/scripts` 和 `automations/**` 是参考，不是默认执行路径。套件自己的可执行契约只有 `scripts/pstack.mjs` 和 `scripts/build-indexes.mjs`。

### 用户可见变化

如果改了用户能看到的界面、命令或行为，更新功能地图或验证 skill。否则下一个 agent 会重新猜。

## 10. 一页检查清单

- [ ] `task.md` 有 Goal、Scope、Acceptance、Non-goals、Owner、Risk tier。
- [ ] Acceptance 每条可判定，全部勾选。
- [ ] `plan.md` 有 Playbook、Steps、Verification、Risks、Roles。
- [ ] Steps 全部勾选。
- [ ] `evidence/` 至少一个文件，`result.md` 链接到它。
- [ ] `result.md` 有 What changed、Evidence、Verification、Risks/Rollback、Status、Follow-ups。
- [ ] Status 是 `done` 或 `blocked`。
- [ ] 阻塞时有 `blocked.md` 四节。
- [ ] `check` 退出码为 0。
- [ ] 用户可见变化已更新功能地图。

## 11. 完整样例

套件自带一个能通过检查的样例：

```bash
node ~/.agents/skills/pstack/scripts/pstack.mjs check fix-login \
  --root ~/.agents/skills/pstack/examples/sample-task
```

目录在 `examples/sample-task/.pstack/tasks/fix-login/`。可以把它复制到你的项目里改。
