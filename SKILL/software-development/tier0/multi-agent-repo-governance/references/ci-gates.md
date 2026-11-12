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

## 闸门自己也会挡路：七个自举陷阱

给仓装上闸门之后，接下来要处理的是「闸门本身」的坑。下面七条都是一次真实落地
（2026-11-11，单管理员仓 + agent 提交 PR）时踩出来的，每条都配了判据。

### 1. PR 作者不能审批自己的 PR → 单管理员仓必然死锁

GitHub 不允许作者 review 自己的 PR。当一个仓只有一个 admin，而 agent 用这个 admin 的
`gh` 登录去开 PR 时，"非作者 approving review"这个条件**永远无法满足**：黄/红级 PR
无限挂起，而且不是冲突、不是检查红，是**没有按钮可点**。

判据：PR 是你自己账号建的 + 仓库只有你一个 admin → 你自己打开 PR 也看不到 Approve。

两种解法，选一种，别选"临时关掉 required checks"：

- **评论授权协议**：约定一条 `ADMIN-APPROVE <head SHA>` 评论，校验评论者有 admin 权限、
  非 bot、SHA 必须等于当前 head（任何新 push 自动失效）。它把"审批"从 GitHub 的作者限制里
  解耦，同时保留时间戳与归因。本仓实现见 `.github/task-grade-policy.json` 同目录的
  `merge-authorization` 脚本。
- **换个身份建 PR**：另开一个有 write 权限的账号（或 GitHub App）建 PR，让 admin 用
  Approve 按钮。前提是那个身份不是你本人。

### 2. required check 被「跳过」= 永久阻塞，所以开关不能做成 job 级 `if:`

想让某个闸门"可开关"时，最直觉的做法是 `if: vars.GATE == 'on'`。这在 required check 上
是错的：被跳过的 job 在 GitHub 上显示 **Expected — waiting for status**，合并按钮永远是灰的。
闸门关掉的那一刻，整个仓都合不进去了。

判据：关掉开关后 PR 页面出现 "Expected — Waiting for status to be reported"。

正解：**检查永远跑，把开关做进检查内部**——读策略文件里的布尔值，关着就直接
`exit 0` 并打印一行"gate disabled by policy (grade recorded)"。空转成本通常只有十几秒，
还顺带成了策略文件格式的校验器。

### 3. `rerun` 重放的是**原来那一版** workflow

闸门代码写错、修好之后想让已经红掉的 check 通过，`gh run rerun --failed` 是没用的：
它重跑的是那个 run 当初用的 workflow 版本，报错一字不差。

判据：重跑后的报错文案和你刚修掉的旧文案完全一致。

### 4. 检查代码取自 PR head，于是「修闸门的 PR 在等闸门放行」

workflow 里常见 `actions/checkout` 配 `ref: ${{ github.event.pull_request.head.sha }}`。
这意味着**校验逻辑本身来自待审分支**。好处是修闸门的 PR 能自己生效；坏处是它同时把
"闸门是不是最新的"和"改动是不是合规的"耦在一起，形成自举悖论：

- 修闸门的 PR，其旧闸门判它红 → 合不进去
- 重跑无效（见上条）→ 只能两件事之一：把主干合进分支（`gh pr update-branch`），
  或开一个全新 PR 让检查用新代码跑

更稳的长期做法：**策略与校验脚本从默认分支取，只审 head 的 diff**。

### 5. 外部扫描器只读**默认分支**的配置

`.gitguardian.yaml`、部分 lint 配置一类的东西，是在默认分支读的。把配置文件放进 PR 里，
对本 PR 的告警**无效**——它会一直红到合并进默认分支为止。

判据：配置明明写了 `ignored-paths`，同一个 PR 的检查还是报同样的文件。

对策：这类检查若不做成 required check 就不阻塞（先确认它在不在 required 列表里）；
真要它立刻生效，只能先把配置单独合进默认分支。

### 6. `enforce_admins: true` 时管理员也没有旁路

开了 "Do not allow bypassing the above settings"，连 admin 都不能忽略 required check。
这是好事，但它意味着**第 1、3、4 条必须被真正解决**，不能指望"实在不行我手动合"。

### 7. 整批搬移会把「只查变更文件」的检查变成历史债务扫描器

任何"只看本次改动文件"的检查（文档死链、格式规范），在一次大规模目录重排后都会
**第一次**覆盖到这批历史文件，于是把几个月前的旧债一次性倒在你面前——它们和本次改动无关，
却会把 PR 卡死。

判据：报错行指向你只是 `git mv` 过的文件，且同一文件在主干旧路径下报同样的错。

对策：
- 让检查按**内容**判定：取 `git diff -M --name-status`，只保留 `A`/`M`/`T` 和
  `R<score!=100>`（改名且改了内容），纯移动（`R100`）跳过
- 债务单独入队修复，别让一次搬移背上全部历史欠账

## 生成物的路径陷阱（manifest 类脚本必看）

凡是"扫树 → 生成清单"的脚本，**过滤条件必须作用在相对路径上**。

真实事故：`build-manifest.ps1` 用绝对路径匹配跳过段（`.cindy-worktrees`、`vendor`、`docs`…）。
当仓库本身位于 `.cindy-worktrees/<name>/` 这类路径下时，**所有**绝对路径都含该段，
于是 246 个 skill 全被跳过，清单从 246 行掉到 10 行。如果照它执行同步，
会按"少了 236 个 skill"的清单去操作真实安装目录。

取证与验收（这条判据比修法本身更重要）：

```powershell
# 在一棵未改动的树上重新生成，应当零 diff
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-manifest.ps1
git diff --stat scripts/install-manifest.txt     # 必须为空
```

同一条思路适用于任何"生成物"：**先证伪再信它**——生成脚本改过、或换了工作目录，
就先在干净状态跑一次看是不是零 diff，再决定要不要提交它的产物。

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
