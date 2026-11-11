# AGENTS.md — 多 Agent 协作仓库的治理文件（通用模板）

> 本文件是**模板**：复制到你的仓根后按项目改写。`{占位符}` 处必填。
> 配套脚本在 `scripts/`，配置在 `.agent-gate.conf`，闸门在 `.github/workflows/`。
> 全文只有 5 条硬规则 + 提交格式 + 命名约定 + 文档引用检查归属。

## 0. 治理

### 0.1 优先级

本文件优先级高于仓内其他惯例、README 说明与 agent 的通用工作流习惯。
冲突时以本文件为准；只有 user 在对话中逐条点名某条规则并给出相反指示时才允许偏离，
且必须把偏离连同规则编号写进回复与 issue 进度评论（留痕可查）。

### 0.2 适用范围

适用：所有在本仓执行写操作的 AI agent，以及由 agent 生成、由人执行的脚本。
不适用：纯只读的检索与阅读。

### 0.3 判定留痕

agent 每次执行 R1~R5 涉及的动作，必须在回复与 issue 评论里写明 4 项事实：
当前 checkout 的分支、当前 worktree 绝对路径、本次依据的规则编号、本次检查结论。
未写全即视为该规则未完成。

## 1. 五条硬规则

### R1 合并前的主线冲突检查

任何 PR 合并进主线前（脚本、网页界面、人工代执行都算），按顺序完成 4 步，缺一不可：

1. **主线脏检查**：`git -C <main-worktree> status --porcelain`，staged / unstaged / untracked 三类分别计数。
   脏文件 ≥ 1 个即判 `BLOCKED`——`merge-tree` 只能比较已提交的树，看不见未提交改动，
   所以「主线有未提交改动」不能被「试算无冲突」抵消。
2. **非破坏性冲突试算**：`git merge-tree --write-tree --messages <base> <pr-branch>`。
3. **基线包含检查**：`git merge-base --is-ancestor <base> <pr-branch>`。
4. **本地与远端同步检查**：`git fetch` 后比对本地 main 与 origin/main。

四项全过、冲突 0 处、脏文件 0 个 → 记 `SAFE_TO_MERGE`；任一不满足 → 记 `BLOCKED` 并停止合并。

**明确禁止**：`--no-verify`；`git checkout --` / `git restore .` / `git reset --hard`；
`git stash` / `git clean`；强推（`--force` / `--force-with-lease`）；先合再补检查；
丢弃或回滚任何未提交改动。

可执行检查：`bash scripts/pre-merge-check.sh <pr-branch> [base]`（只读；退出码 0 = SAFE_TO_MERGE）。

#### R1.1 结论的时效性与真实性

`SAFE_TO_MERGE` 是**某一时刻的快照**，不是长期通行证：

- 结论 MUST 使用脚本标准输出原文，不得手工转录或凭记忆粘贴，不得把 `BLOCKED` 改写成 `SAFE_TO_MERGE`。
- 脚本 MUST 同时输出 `CHECK_TIMESTAMP`（ISO 8601 UTC）与 `MAIN_HEAD`（`git rev-parse <base>` 的完整 SHA），两者同源。
- **TTL = 10 分钟**：由调用方按 `CHECK_TIMESTAMP` 与当前时间之差判定，超过即失效并重跑完整检查。
- 合并前 MUST 再核对一次 `git status --porcelain` 与 `git rev-parse <base>` 是否与检查时一致，不一致即停止。
- 以下任一事件发生，结论**立即失效**并须重跑：主线出现新提交、工作树变脏、PR 有新 push、远端 main 有新提交、超过 TTL。
- 若用 GitHub 网页界面合并，点击前 MUST 用本地脚本重新验证一次；界面显示的「No conflicts」不替代 R1。

违反 R1.1 等同违反 R1，按 `BLOCKED` 处理。

### R2 默认分支与停止条件

开始写任何文件之前，MUST 执行 `git branch --show-current` 与 `git rev-parse --show-toplevel` 取得当前分支与 worktree。

**停止条件**（同时成立时 MUST 立即停止一切写操作）：当前 checkout 不是 `{默认分支}`；且 user 本次请求没有明确指出 branch 或 worktree。
命中时唯一允许动作：停止写操作，向 user 说明当前分支、worktree 路径、命中 R2 的判定、并请 user 补充目标。
不得自行切换分支，不得「先写着回头再改」。

### R3 Issue 纪律

**关闭 issue**：MUST NOT 自行关闭，除非 user 在当前对话中明确给出关闭许可。
「目标达成」「PR 已合并」不构成关闭理由。需要关闭时，先发 1 条 issue 评论请求许可。

**进度更新**：以下 5 类事件每触发 1 类，至少发 1 条 issue 进度评论，不得攒到最后一次性发：

1. 开工（目标、切片拆分、worktree 与分支已建立）
2. 每完成 1 个可验证切片（交付内容、验证命令、验证结论）
3. 遇到阻塞（原因、已尝试的动作、需要谁解决）
4. 提交 PR（PR 编号、关联 issue、本切片范围、pre-merge 检查结论）
5. 测试结论（测试命令、通过数、失败数、结论；失败数 > 0 时不得报完成）

同一 issue 允许并鼓励开多个 PR：1 个 issue 可拆多个切片，每切片 1 个 PR，都关联同一个 issue。

### R4 单 issue 多 PR 多 worktree

1 个 issue = 1 个目标，MUST 拆成 2 个及以上独立可交付切片，每个切片满足：
可独立运行验证、可独立合并、有明确的文件所有权边界。

**一一对应**：每切片 = 1 次 `git worktree add` + 1 个分支 + 1 个 PR。
禁止 2 个切片共用 worktree、分支，或在 1 个 worktree 里做完多个切片再拆 PR。

**文件所有权隔离**：每切片只写自己登记的目录；2 个切片的独占范围不得重叠。
共享正本（见 `.agent-gate.conf` 的 `SHARED_ORIGIN_RE`）默认只读；要写必须先在 issue 切片表里登记。

**切片表登记格式**（机判按此解析，务必用这个格式）：

```
- `<slice>` → `<独占目录1>`、`<独占目录2>`
```

**PR 关联**：所有 PR 正文引用同一个 issue 编号，用 `Refs: #<编号>`；**不得写 `Closes #<编号>`**。

可执行检查：`bash scripts/new-slice.sh <slice-name> [base]`（唯一写操作是 `git worktree add`）。

### R5 合并分级与授权

任何 PR 合并前，除 R1 外还要完成一次分级评定：

| 等级 | 判定 | 批准主体 | merge 执行 |
|---|---|---|---|
| 绿 GREEN | 机判 8 项全过且独立 reviewer 无异议 | reviewer subagent 即可 | **agent 自动合并** |
| 黄 YELLOW | 命中任一黄级条目 | user（人） | user 批准后由 user 或 agent 代执行（须在 PR 评论留批准引用） |
| 红 RED | 命中任一红级条目 | admin 账号 | **仅 admin 执行；agent 禁止执行合并** |

**黄级条目**：触碰共享正本但已登记为本切片独占；reviewer 提出非阻塞意见；
存在需人工目验的验收命令（已在 PR 正文声明）；新类型改动未被机判覆盖。

**红级条目**：修改治理面文件（`.agent-gate.conf` 的 `GOV_PATHS_RE`，含 `AGENTS.md`、核心脚本、`.github/**`）；
文件所有权越界 ≥ 1 处；force push / `--no-verify` / 篡改检查记录；diff 命中密钥凭据；删除或重命名正本；
reviewer 定性判定存在安全或正确性风险。

**硬约束**：R5 任何等级都不豁免 R1~R4；等级**只升不降**（降级唯一路径是 user/admin 在 PR 评论写明理由改判）；
评级后 PR 出现新 push，评级立即失效，必须重新评级；CI 全绿是绿级必要条件，但不替代本地 R1。

评级记录写进 PR 评论，格式见 `scripts/pr-grade.sh` 的 `GRADE=` 块。

## 1.5 文档引用的检查归属（分级声明）

文档引用失准分三类，检查手段不同，**不要指望 agent 每次自己记得查**：

| 类别 | 例子 | 谁来查 | 判据 |
|---|---|---|---|
| **可达性** | 引用指向不存在的文件 / 断链 / `file:line` 越界 / md 锚点不存在 | **机器必查**：`scripts/check-refs.py`（`pr-grade.sh --check-refs`，已接入 pr-gate 第 5 闸门） | 退出码非 0 即失败 |
| **内容相符** | 引用指向的文件存在，但列名 / 措辞 / 版本号与被引文件对不上 | **独立 reviewer subagent**：机判读不出语义 | reviewer 提出即按黄级处理 |
| **跨正本口径** | 两份正本对同一件事说法相反 | **独立评审 + 状态标记 + 正本单一化** | 评审回路抓；正本唯一 |

- 「机器查不到的」不等于「可以不管」：可达性由机器兜底，**内容相符与跨正本口径必须由独立 reviewer 兜底**——实现者不得给自己的 PR 出评级。
- `.refcheck-ignore` 只登记两类：确认属于外部仓的路径、已登记为「待产出」的物料。新增忽略项必须在 PR 正文说明理由；**不得用它掩盖真实漂移**。
- 有意指向尚不存在物料的文档，在文件头写 `refcheck:skip-file` 声明并说明原因；产物入库后移除声明。

## 2. Spec Kit 阶段顺序

MUST 按以下顺序推进，不得跳阶段，前面阶段未产出文件时不写后面阶段的文件：

1. **constitution**：治理与不可协商约束（本文件）
2. **specify**：`specs/<编号>-<slug>/spec.md`（目标、范围、验收标准）
3. **plan**：`specs/<编号>-<slug>/plan.md`（切片拆分与文件所有权边界）
4. **tasks**：`specs/<编号>-<slug>/tasks.md`（切片拆成可验证任务）
5. **implement**：按 R4 建 worktree、写实现、开 PR、跑 R1、评级、合并

每次阶段切换，MUST 发 1 条 issue 进度评论，写明从哪个阶段进入哪个阶段、产出文件路径。

## 3. 命名约定

- 分支：`{BRANCH_PREFIX}/<slice>`（默认 `feat/<slice>`），`<slice>` 为小写字母、数字、连字符，长度 1~40
- worktree：`{WORKTREE_DIR}/<slice>`（默认 `wt/<slice>`），与分支用同一个 `<slice>`
- 规格目录：`specs/<3 位编号>-<slug>/`
- 脚本：`scripts/<动作>.sh`，用 bash 执行

## 4. 提交信息格式

```
<type>(<slice>): <主题>

<正文：本切片交付内容、验证命令、验证结论；没有正文时整段省略>

Refs: #<issue 编号>
```

- `<type>` 取 6 选 1：`feat`、`fix`、`docs`、`chore`、`spec`、`test`
- `<slice>` MUST 与分支、工作树里的 `<slice>` 完全一致
- `<主题>` ≤ 72 字符，同一仓保持一致，不写句号
- `Refs: #<issue 编号>` 必须存在；**禁止写 `Closes #<编号>`**（关闭 issue 需 user 许可）
- 禁止 `--no-verify`，禁止空提交信息，禁止事后用 `--amend` 抹掉检查记录

**同步基线的合并提交也要合规**：`git merge origin/main -m "chore(<slice>): 同步 main 基线" -m "Refs: #<编号>"`。
默认 message（`Merge remote-tracking branch …`）既不合主题格式也没有 Refs，会被 commit-lint 判红，
进而让 PR 永久失去绿级资格（R1 要求分支包含 main 最新提交，而 R1 又禁止强推 → 流程自锁）。

## 5. 脚本与资产

| 文件 | 作用 |
|---|---|
| `scripts/pre-merge-check.sh` | R1 的只读检查，输出 `SAFE_TO_MERGE` 或 `BLOCKED`（含三件套） |
| `scripts/new-slice.sh` | R4 的切片创建，唯一写操作是 `git worktree add` |
| `scripts/pr-grade.sh` | R5 的机判引擎 + 5 个 pr-gate 子检查 |
| `scripts/check-refs.py` | 文档引用可达性检查器（零依赖，仅标准库） |
| `.agent-gate.conf` | 项目相关项（治理面路径、共享正本、默认 issue、分支/工作树前缀） |
| `.github/workflows/pr-gate.yml` | 每 PR 的 5 道机器闸门 |
| `.github/workflows/dev-sync.yml` | main → dev 自动同步（不需要 dev 分支可删） |

agent 不得修改本文件与上述脚本/配置来规避规则；修改本文件本身需 user 明确许可，并在 issue 中留 1 条评论。
