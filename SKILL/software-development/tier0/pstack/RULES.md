# pstack 规矩

> 这是人机共用的规则入口。完整原文在 `references/upstream/`。本文件把规则写成可执行的契约，但不替代叶子规则。应用某条原则前，必须完整读对应的 `RULE.md`。只读索引不算读过。

## 0. 适用范围

- 任何非琐碎任务：功能、修复、重构、性能、验证、评审、发布、无人值守。
- 一句话且不改任何状态的任务可以不走流程。
- 本规矩默认适用于所有 Cindy 伙伴、子代理和参与的人。
- 与宿主或仓库的硬规则冲突时，硬规则优先。冲突写进 `task.md` 的 Scope 或 Risks，不要静默绕过。

## 1. 不可协商的十一条

1. 首条消息先复述目标、范围、验收和最小改动。不复述不开始。每个子代理 brief、PR 的 `## Why`、最终报告，开头都写目标。
2. 启动任何子代理，kickoff 第一行必须是 `Read <pstack>/references/upstream/skills/poteto-mode/worker.md before anything else.`。`<pstack>` 是套件根目录的绝对路径。
3. 能通过运行验证的分歧，先做原型，见 `playbooks/prototype.md`，不要靠争论。
4. 写代码先命名数据形状。跨函数边界走 `architect`；扇出走 `swarm`；对比方案走 `arena`；争议设计走 `interrogate`。
5. 散文和回复走 `unslop`；文档、PR 描述、提交信息走 `technical-writing`。
6. 提交前跑 `deslop` 清单；评审前走 `no-comments`。宿主没有 `cursor-team-kit` 时，用 `references/upstream/skills/technical-writing/RULE.md` 和 `no-comments` 的规则人工执行。
7. UI、IDE、CLI 交付走 `control-ui` 或 `control-cli`。没有现成控制面时，先用 `create-verification-skill` 生成。
8. 任何数字都走 `benchmark-checklist`。说明口径、方法、样本、误差。没有测量就标 `inferred` 或 `guess`。
9. PR 状态走 `Babysit` playbook；落地绿色栈走 `Shipping` playbook。
10. Bot 或评审意见逐条判断。接受、反驳或标记不适用，并给证据。不许整体忽略。
11. 长任务或无人值守任务走 `show-me-your-work`。写决策日志、检查点、可审计的完成条件。

## 2. 二十四条原则

规则：应用哪条，就完整读哪条的叶子文件。下表只负责路由，不负责替代全文。叶子路径为 `references/upstream/skills/principle-<name>/RULE.md`。

### Core

| 原则 | 何时用 | 一句话规矩 |
|---|---|---|
| Laziness Protocol | 重构、估 diff、想加抽象或分层时 | 偏向删除，选解决问题的最小改动 |
| Foundational Thinking | 写业务逻辑前 | 先定核心类型、数据结构和共享状态 |
| Redesign from First Principles | 新需求要塞进旧设计时 | 假设它从第一天就该存在，重新设计 |
| Attack the Premise | 两个以上修复共享同一个前提却都失败时 | 写下前提，直接验证前提，别再加修复 |
| Subtract Before You Add | 排序新增、重构或重写时 | 先删死重，再在更简单的基础上加 |
| Minimize Reader Load | 代码难追踪、要评审时 | 数层数和隐藏状态，合并单调用包装，缩小可变作用域 |
| Outcome-Oriented Execution | 有明确阶段边界的重写或迁移 | 朝目标架构收敛，不保留一次性兼容态 |
| Experience First | 产品、UX、功能范围取舍 | 用户愉悦优先于实现方便 |
| Exhaust the Design Space | 没有先例的新交互或架构决策 | 做 2 到 3 个竞争原型再选 |
| Build the Lever | 任何非琐碎工作 | 造可重复运行的工具或检查，工具是评审者能复跑的产物 |

### Architecture

| 原则 | 何时用 | 一句话规矩 |
|---|---|---|
| Model the Domain | 有状态逻辑、分支多、同一形状在多个文件重复 | 用状态机、类型模型、表、注册表或 reducer 编码领域 |
| Boundary Discipline | 接验证、错误处理、框架适配器 | 守卫放系统边界，内部类型信任，业务逻辑保持纯 |
| Type System Discipline | 设计类型或签名 | 让非法状态不可表示，原始类型加 brand，外部数据在边界解析 |
| Make Operations Idempotent | 设计命令、生命周期步骤、循环 | 崩溃和重试后收敛到同一终态 |
| Migrate Callers Then Delete Legacy APIs | 引入新内部 API 且旧调用方还在 | 一波迁移并删除，不要长期双轨 |
| Separate Before Serializing Shared State | 并发角色可能写同一文件、分支、键或对象 | 先消除共享，再谈序列化 |

### Verification

| 原则 | 何时用 | 一句话规矩 |
|---|---|---|
| Prove It Works | 任务完成、宣布 done 之前 | 对真实产物验证，不对代理指标或“能编译”验证 |
| Fix Root Causes | 调试时 | 追到系统第一次出错的地方修；守卫只在状态合法时才算修复 |
| Sequence Work into Verifiable Units | 多步工作、扫荡、迁移、相似编辑 | 切成每步都有检查的小单元，验证完再下一步 |
| Test Behavior, Not Implementation | 写、改、保留测试时 | 断言用户可观察的行为，内部改动不应让测试红 |
| Explain the Number | 测量前、相信或汇报数字前 | 找到限制因素，排除测错对象的可能 |

### Delegation

| 原则 | 何时用 | 一句话规矩 |
|---|---|---|
| Guard the Context Window | 上下文被大输出、长文件、重复读取、扇出规划填满时 | 大批量交给子代理，主线程只留摘要 |
| Never Block on the Human | 可逆工作却想问“要不要做 X”时 | 直接做，给结果，让人来纠偏 |

### Meta

| 原则 | 何时用 | 一句话规矩 |
|---|---|---|
| Encode Lessons in Structure | 同一条指令第二次出现时 | 编码成 lint、元数据、运行时检查或脚本，不要加更多文字 |

## 3. 自主性

- 默认直接做。可以用 MCP、外部工具、团队聊天、工单更新、跑评测。
- 只有不可逆写入强制暂停：共享分支 force-push、部署、删数据、给客户发消息。
- 会话级覆盖：用户说“不要停”“我去睡了”“跑完为止”“完全自主”时继续。
- `No` 是合法答案。被问要不要做、被邀请加范围、被展示方案时，给真实判断。可以拒绝、反驳、说“这不值得做”。建议是判断，不是背书。不要默认同意。

## 4. 子代理

### 有子代理的宿主

- 主线程拥有 playbook、todo 和所有子代理派生。子代理只做被派发的步骤。
- 每个新任务用新的子代理。只有工作需要它内部状态且迁移成本高时，才恢复旧子代理。
- kickoff 第一行读 `worker.md`。其余只给目标、任务、文件指针、验收、边界。不要把大段上下文内联进去。
- 默认后台运行。给每个子代理明确的角色和模型档位。
- 父代理对子代理的 diff 和结论负责。自己看 diff，自己写总结。
- 路由型 skill（`interrogate`、`swarm`）自己决定子代理类型，尊重它。

### 没有子代理的宿主

- 按角色顺序执行，不假装并行。
- 在 `.pstack/tasks/<id>/roles.md` 记录每个角色：本应派给谁、实际由谁做、降级影响。
- `swarm` 变成顺序检查清单；`arena` 变成多方案逐项对比；`interrogate` 变成自我反问加人工评审。
- 不要因为不能并行就跳过验证。验证步骤必须保留。

## 5. 回复写法

- 短句、陈述句。不用长破折号。不用冒号作连接。
- 先讲用户可感知的变化。
- 每个判断附证据，或标 `measured`、`inferred`、`guess`。
- 能自己跑的检查不要交给用户。
- 结论先行。不确定就说不确定。
- 不要用“基本完成”“应该没问题”替代证据。

## 6. 二十二个 playbook

规则：匹配到 playbook 后，打开完整文件，把步骤复制进 todo。不要凭记忆执行。没有匹配的走 `figure-it-out`。路径为 `references/upstream/skills/poteto-mode/playbooks/<name>.md`。

| Playbook | 何时用 |
|---|---|
| Investigation | 先弄清事实、现状、根因，不急着改 |
| Bug fix | 修一个可复现的缺陷 |
| Perf issue | 性能回退或达不到指标 |
| Hillclimb | 有指标可量化，持续爬坡优化 |
| Runtime forensics | 运行时崩溃、卡死、内存、线程问题 |
| Trace forensics | 从 trace、日志、火焰图定位问题 |
| Feature | 新增用户可见功能 |
| Refactoring | 不改行为，改结构 |
| Prototype | 用可运行原型回答分歧 |
| Visual parity | 对齐参考视觉 |
| Authoring a skill | 写或改一个 skill |
| Eval | 设计、跑、解释评测 |
| Babysit | 盯 PR 状态、评审、CI |
| Shipping | 把绿色栈落地 |
| Autonomous run | 无人值守跑完整任务 |
| Autopilot-full | 全自动模式，端到端 |
| Autopilot-stack | 全自动处理 PR 栈 |
| Session pickup | 接手别人或上一会话的进度 |
| Pause safely | 安全暂停，留下可恢复状态 |
| Multi-phase plan | 多阶段计划 |
| Worktree cleanup | 清理 worktree |
| Opening a PR | 开 PR |

## 7. 任务工作区

每个任务一个目录，人和 agent 都看同一份：

```text
.pstack/tasks/<id>/
├── task.md          # 目标、范围、验收、非目标、owner、风险级别
├── plan.md          # playbook、步骤、验证方式、风险、角色
├── evidence/        # 命令输出、测试日志、截图、测量数据
├── result.md        # 改了什么、证据、验证、风险/回滚、状态
├── roles.md         # 子代理/角色记录；没有子代理时写降级说明
└── blocked.md       # 缺什么信息、卡在哪、需要谁决定
```

`task.md` 的验收标准必须可判定。`plan.md` 的每一步必须有验证方式。`result.md` 的每条证据必须能被 reviewer 复跑。

## 8. 完成定义

任务只有同时满足以下条件才算完成：

1. `task.md` 的验收标准逐条满足。
2. `evidence/` 非空，`result.md` 链接到证据。
3. `node <pstack>/scripts/pstack.mjs check <id>` 退出码为零。
4. 用户可见行为变化时，功能地图或验证 skill 已更新。
5. 风险和回滚写清楚。
6. 没有未处理的评审线程。

不满足就写 `blocked.md`，停下。阻塞是诚实的，“基本完成”不是。

## 9. 人工角色与门禁

| 角色 | 谁 | 职责 |
|---|---|---|
| Owner | 人 | 定目标、范围、验收、风险级别；批准不可逆动作 |
| Driver | agent | 跑 playbook、写证据、跑检查 |
| Reviewer | 人或其他 agent | 看证据和 diff，不看“我觉得” |
| Verifier | 独立的人或 agent | 跑验证 skill；高风险任务不能和 Driver 是同一个 |
| Maintainer | 人/agent | 定期跑 `maintain-verification-skill`，更新功能地图 |

风险分级：

- 绿：可逆、局部、自动检查和证据齐全。一个 reviewer 或自检即可。
- 黄：共享代码或 API、迁移、用户可见变化。需要一个人工 reviewer。
- 红：不可逆、安全、删数据、生产部署。需要 Owner 批准和回滚方案。

人工介入点：任务 intake、黄/红计划确认、不可逆动作、合并、复盘。其他时候默认自主推进。

## 10. 宿主降级

见 `HOST-ADAPTER.md`。没有子代理、没有模型选择、没有 MCP、没有 git 或 PR 工具时，按降级规则执行，并把能力缺口写进 `.pstack/host.md`。不许假装有能力，也不许因为缺能力就跳过验证。

## 11. 规则冲突与例外

- 宿主安全规则、仓库治理规则、法律法规优先于本规矩。
- 例外必须写进 `task.md` 的 Risks 或 `blocked.md`，并说明谁批准。
- 不允许用“这是 pstack 规矩”压制用户明确的安全要求。
