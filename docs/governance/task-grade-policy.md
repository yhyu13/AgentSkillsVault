# 绿 / 黄 / 红任务边界

本文件是 AgentSkillsVault 的人机协作授权边界。机器可读配置在
[`.github/task-grade-policy.json`](../../.github/task-grade-policy.json)。

目标不是增加人工审批，而是把低风险、可验证、可回滚的任务交还给自动化；
把人的注意力留给证据不足、共享正本和治理面变更。

## 判定顺序

先判红，再判黄，最后才允许绿。任何红级条件命中，就不能降级为绿。

| 等级 | 含义 | 谁批准 | 谁执行合并 |
|---|---|---|---|
| 红 | 关键治理、权限、发布、冲突、越权或不可回滚风险 | admin | 仅 admin；Agent 不得自行合并 |
| 黄 | 不满足红，但证据、影响范围或共享正本风险不足以绿 | user 一次批准 | user 或 Agent 在批准引用下代执行 |
| 绿 | 非红非黄，自动化验收完整，同版本/同平台验证通过 | 不需要人工批准 | Agent 可在 required checks 全绿后合并 |

## 红级触发器

红级包括但不限于：

- 修改治理面：`AGENTS.md`、`CLAUDE.md`、`.github/**`、`CODEOWNERS`、
  `.agent-gate.conf`、策略/授权脚本、安装清单、同步/验证脚本、退役清单、
  Agent 注册表、submodule 指针。
- 与 `main` 或目标 PR 存在未解决合并冲突。
- 所有权冲突：两个切片同时写同一独占范围，或改了未登记给自己的路径。
- force-push `main`、删除正本、修改凭据/权限、发布/部署、未解决的阻塞评审。

红级不是“Agent 更努力一点就能变成绿”。它需要 admin 明确授权。

## 黄级触发器

黄级包括但不限于：

- 不满足红级，但缺少同版本/同平台验证证据。
- 自动化验收不完整，或验收命令不能复现。
- 修改共享正本：`INSTRUCTION.md`、`README.md`、`KNOWLEDGE.md`、`JOURNEY.md`、
  `docs/**`、skill 的 `references/**` 或 `templates/**`。
- 跨模块行为变化、需要人工目验、reviewer 有非阻塞但需人判断的意见。

黄级只需要一次人工批准，不要求人逐步盯着 Agent 执行。

## 绿级必要条件

绿级必须同时满足：

1. 不命中任何红级或黄级条件。
2. 没有与 base 分支的合并冲突。
3. 所有 required checks 通过。
4. 有完整自动化验收：每个验收标准都有可运行命令，且结果为通过。
5. 有同版本、同平台验证证据。

### 同版本 / 同平台验证

平台验证必须覆盖本次修改影响的平台：

- iPad / iOS：同 iPadOS 版本、同设备类型或可复现模拟器；硬件相关问题必须真机。
- Android：同 Android 版本、同设备类型或可复现模拟器；硬件相关问题必须真机。
- PC：同操作系统和架构，真机或等价 CI runner；不能用移动端结果代替 PC。
- Web：同浏览器引擎和版本，关键视口/交互路径已验证；不能用移动端 WebView 代替桌面浏览器。
- 纯文档/非运行时变更：可声明 `not-applicable`，但必须给出理由，并通过文档/引用类自动检查。

验证记录必须绑定当前 PR head SHA。head 变化后，旧验证不能继续用于绿级。

## PR 中的平台验证块

绿级 PR 必须在正文包含一个 `platform-verification` 代码块：

```platform-verification
{
  "head_sha": "<current-pr-head-sha>",
  "affected_platforms": ["ipados"],
  "automated_tests": [
    {
      "command": "python -m unittest discover -s tests",
      "result": "pass",
      "evidence": "<ci-run-or-log-url>"
    }
  ],
  "platform_checks": [
    {
      "platform": "ipados",
      "version": "18.x",
      "device_or_browser": "iPad real device",
      "method": "real-device",
      "result": "pass",
      "evidence": "<screenshot-video-or-log-url>"
    }
  ]
}
```

机器只验证结构、SHA、必填字段和结果声明；它不能证明截图或日志真实。
如果证据真实性需要判断，该任务至少是黄级，不能自动绿。

## Required checks

当前仓库的 required checks 由 `.github/workflows/pr-gate.yml` 产生：

- `policy-grade`
- `manifest-consistency`
- `skill-refs`
- `governance-selftest`
- `merge-authorization`

`merge-authorization` 的规则：

- 绿级：不需要人工批准。
- 黄级：需要非作者、非 bot 的人工 approving review。
- 红级：需要 admin 的 approving review。

批准必须对应当前 head SHA；self-approval 不算。

### ADMIN-APPROVE 评论协议（单管理员仓库的破锁通道）

GitHub 不允许作者审批自己的 PR。当 PR 由 Agent 挂在唯一管理员账号名下创建时，
"非作者 approving review"永远无法出现，黄/红级会形成死锁（2026-11-11 PR #24 首次暴露）。
因此 `merge-authorization` 额外接受评论授权：

- 在目标 PR 下评论 `ADMIN-APPROVE <head完整SHA或前7位>`（大小写敏感，精确匹配）。
- 评论者必须具有 admin 协作者权限，且不是 bot；*允许 PR 作者本人*评论。
- 授权与 head SHA 绑定：任何新 push 使旧授权自动失效；需重新评论。
- 其他人对当前 head 的 CHANGES_REQUESTED review 仍然一票否决。
- 评论是公开、带时间戳的显式人类动作，保留完整审计与归因痕迹。

## 黄红拦截开关（authorization_gate）

`merge-authorization` 的黄/红拦截是*可开关的*，开关在
[`.github/task-grade-policy.json`](../../.github/task-grade-policy.json) 的 `authorization_gate.enabled`：

| 状态 | 行为 |
|---|---|
| `false`（当前默认） | 检查照跑但直接放行：Agent 黄/红也自动合并；等级照常计算并写进 grade.json，事后可审计 |
| `true` | 黄需人批、红需 admin 授权（approving review 或 `ADMIN-APPROVE` 评论），即前文的完整拦截行为 |
| 字段缺失/畸形 | 视为 `true`（fail closed，保持旧行为） |

设计理由：*执行永远在，拦截看开关*。不用 job 级条件跳过——required check 被跳过会显示
永久等待并阻塞合并（2026-11-11 死锁的近亲）；空转一次约 20 秒，同时兼任策略文件格式校验。

Agent 的询问规则：diff 命中 red 路径清单而开关为关时，Agent 应停下来问用户
「这个任务要不要开黄红闸？」；其余情况按默认走，不问。开启/关闭都是改一个布尔的 PR。

## 降低人工介入的升级方向

升级不是增加审批节点，而是减少每任务人工分钟：

- 绿级任务应自动完成验证和合并。
- 黄级任务只消耗一次批准，不消耗过程盯防。
- 红级任务保留 admin 控制，但必须留下授权引用。
- 如果人工分钟下降但越界、回滚、返工上升，不算治理升级。
