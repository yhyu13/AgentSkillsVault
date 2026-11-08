# CI 闸门：怎么接、怎么读、怎么排障

## 五道闸门与它们各自抓什么

| job | 判据来源 | 抓什么 | 典型失败 |
|---|---|---|---|
| `commit-lint` | `--check-commit` | 主题格式、`Refs: #N`、禁 `Closes`、≤72 字符 | 同步基线的 merge 提交用了默认 message |
| `ownership-check` | `--check-ownership` | 改了本切片独占范围之外的文件 | 切片表没登记 / 登记格式不是 list 形式 |
| `syntax` | `--check-syntax` | 改动的 `*.sh` 过 `bash -n` | 脚本语法错 |
| `template-check` | `--check-template` | PR 模板小节齐全 + pre-merge 三件套原文 | 少了小节 / 只贴了结论没贴三件套 |
| `refs-check` | `--check-refs` | 文档引用可达：路径 / md 锚点 / `file:line` 越界 | 引用指向不存在的文件、相对路径层级错 |

**共同点：5 个 job 都必须真跑命令。** 不要在 workflow 里另写判据，也不要从 PR 正文里 grep 结论。

> 真实教训：`test_fail` 一度是从 PR 正文里 grep「失败 N 个」得到的——正文可以骗人。
> 结果一处相对路径写错一级（GitHub 上 404）的死链一路放行，是独立评审实跑才发现的。
> `refs-check` 就是为补这个洞而加的第 5 道闸门。

## required checks 与 branch protection

CI 全绿**不等于**可以合并——还要 GitHub 层面强制：

1. 仓库 Settings → Branches → `main` → Add rule → Require status checks to pass
   → 勾选上表 5 个 job（名字要和 CI 里的一致）
2. 同时勾 “Require branches to be up to date before merging”（或按你的合并策略选）
3. 禁 force push

**没有 branch protection 时，R5 的绿级只是靠 agent 自觉**——本仓实测：R5 落地后的 32 个合并 PR 里，
有 13 个是在门禁已红时合的、27 个没有 `GRADE=` 评论也没有批准留痕。
工具能检测违规，但只有 GitHub 层面的 required checks 能**阻止**违规。

## dev 分支同步（可选）

`dev` 是 main 的**下游同步分支**，不是 gitflow 开发分支：

- main 合并后自动同步 dev：能快进就快进，分叉就开 `chore/sync-dev-<sha>` PR 走人工评审
- **特性分支的 PR base 默认仍是 main**，不要把 dev 当开发干线
- dev 收到的提交只有两类：来自 main 的同步、紧急演示修补（≥黄级，需 user 批准）
- 不要强推 main；dev 分叉时优先「dev 重置对齐 main 的方向重新打补丁」

## 排障：CI 全员「红」但不报错

**症状**：所有 job 在 1~2 秒内 `failure`，`steps: []`，check-run 输出为空。

**判据**（一条命令定位）：

```bash
gh api repos/<owner>/<repo>/commits/<sha>/check-runs \
  --jq '.check_runs[] | "\(.name) started=\(.started_at) completed=\(.completed_at)"'
```

`started` 与 `completed` 只差 1~2 秒 → **job 根本没拿到 runner**，不是脚本失败。

**最常见的原因是账号级账单封锁**，注解原文：

> The job was not started because recent account payments have failed or your spending limit
> needs to be increased. Please check the 'Billing & plans' section in your settings

它会同时打掉**所有** workflow（包括 dev-sync），表现是「dev 同步连续失败、dev 落后 main 几十个提交」——
看起来像权限问题，其实是同一个原因。

**排查顺序**：
1. 先看 check-run 注解原文（`gh api .../check-runs/<id>/annotations`）
2. 账单类 → 让 user 去 Settings → Billing and licensing → Budgets and alerts 处理；agent 无权代操作
3. 权限类（token 推不动分支）→ 仓库 Settings → Actions → Workflow permissions → Read and write permissions
4. 别把账单封锁误判成权限问题——两者症状相似（都表现为 workflow 失败），但修法完全不同

## 额度怎么估

- 每个 job 都独立占一个 runner；`ubuntu-latest` 私有仓按分钟计费
- 一个 PR 触发 5 个 job = 5 份消耗；把 job 合成 1 个（多 step）能立刻省 4~5 倍
- `concurrency: cancel-in-progress: true` 能掐掉同一 PR 的旧运行
- 真实用量查：`gh api /users/<user>/settings/billing/actions`（需 `user` scope：
  `gh auth refresh -h github.com -s user`）
