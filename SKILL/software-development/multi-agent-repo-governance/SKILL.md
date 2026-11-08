---
name: multi-agent-repo-governance
description: >-
  给「多个 AI agent 并行改同一个 GitHub 仓」的仓装上一整套可复用的治理骨架：五条硬规则
  （合并前冲突检查 / 默认分支停止条件 / issue 纪律 / 单 issue 多切片多 worktree / 绿黄红分级授权）、
  五个会真跑命令的 PR 闸门（提交格式 / 所有权越界 / 脚本语法 / PR 模板 / 文档引用可达）、
  一份 AGENTS.md 模板与配套脚本（pre-merge-check、new-slice、pr-grade、check-refs）。
  适用于：新仓要让多个 agent 并行提交、agent 合并事故频发、CI 全绿但合并后文档链接 404、
  agent 把「未验证」写成「已完成」、PR 模板与提交格式反复不合规、需要把人工门禁固化成机器闸门。
  不适用于：单人单分支的小仓、纯代码风格/测试框架类规范、已有成熟治理体系且不想改动的仓。
metadata:
  category: software-development
  created_by: agent
  version: 1.0.0
  origin: local (distilled from the Aholo hackathon repo's R1~R5 governance, 2026-11)
---

# 多 Agent 协作仓的治理骨架

一句话：**把「agent 能不能合、合了会不会出事」从靠自觉变成靠机器判定，并给出可复制的文件。**

这个 skill 交付的是**一套可拷进新仓的文件**，不是一个流程说明：
`AGENTS.md` 模板 + 5 个脚本 + 2 个 workflow + 1 个配置 + 1 个文档骨架。
拷完就能用；换项目只改 `.agent-gate.conf`。

## 何时用

- 用户说「多个 agent 并行改这个仓」「agent 老是乱合」「给新仓配一套 agent 规矩」
- 出现这类症状：PR 在 CI 红着被合、agent 改了别人的文件、文档里的链接 404、
  agent 把没验证的写成完成了、提交格式反复不合规
- 用户要把「人工检查」固化成「机器必查」

**不调用**：单人单分支的小仓（用不上五层门禁）；纯代码风格 / 测试框架规范；
已有成熟治理体系且用户不想改动的仓（先问，别去覆盖别人的 AGENTS.md）。

## 目录

```
multi-agent-repo-governance/
├── SKILL.md                        ← 本文件
├── references/
│   ├── governance-model.md         ← 五条规则为什么这样定（判据、失效条件、授权矩阵）
│   ├── ci-gates.md                 ← 五个闸门怎么接、required checks、账单假红排障
│   ├── doc-layout-rules.md         ← 目录职责、一份正本、引用检查三级分类、忽略清单
│   └── anti-patterns.md            ← 10 个真实踩过的坑：症状 → 根因 → 对策
└── templates/                      ← 拷进目标仓的文件（相对路径引用，可直接复制）
    ├── AGENTS.md                   ← 治理文件模板（五条硬规则 + 提交格式 + 命名 + §1.5 引用检查归属）
    ├── .agent-gate.conf            ← 项目相关项：治理面路径 / 共享正本 / 默认 issue / 分支前缀
    ├── .refcheck-ignore            ← 引用忽略清单样例
    ├── .github/workflows/
    │   ├── pr-gate.yml             ← 每 PR 的 5 道机器闸门
    │   └── dev-sync.yml            ← main → dev 自动同步（不需要 dev 分支可删）
    ├── scripts/
    │   ├── pre-merge-check.sh      ← R1：冲突试算 + 主线脏检查 + 基线包含 + 三件套
    │   ├── new-slice.sh            ← R4：建 worktree + 分支（唯一写操作是 git worktree add）
    │   ├── pr-grade.sh             ← R5 机判引擎 + 5 个子检查
    │   └── check-refs.py           ← 文档引用可达性检查器（零依赖，只标准库）
    └── docs/README.md              ← 文档目录骨架与写法要求
```

## 落地步骤

1. 把 `templates/` 整个拷进目标仓根（`.github/`、`scripts/`、`docs/README.md` 都要）。
2. 改 `templates/.agent-gate.conf` → 仓根 `.agent-gate.conf`：
   - `GOV_PATHS_RE`：治理面文件（改了就必须 admin 批准）。默认含 `AGENTS.md`、`scripts/pre-merge-check.sh`、`scripts/new-slice.sh`、`.github/**`
   - `SHARED_ORIGIN_RE`：共享正本目录（默认只读，要写必须登记为切片独占）
   - `DEFAULT_ISSUE`：PR 正文没写 `Refs:` 时的兜底 issue
   - `BRANCH_PREFIX` / `WORKTREE_DIR`：默认 `feat` / `wt`
3. 把 `templates/AGENTS.md` 拷成仓根 `AGENTS.md`，按项目改写 `{占位符}` 与规则细节。
4. 接 CI：`.github/workflows/pr-gate.yml` 已含 5 个 job；再到仓库 Settings → Branches →
   `main` 加 branch protection，把 5 个 job 勾成 required checks + 禁 force push。
   **没有 branch protection 时，绿级只是靠 agent 自觉。**
5. 自检：`bash scripts/pr-grade.sh --selftest`（机判引擎自测）、
   `python scripts/check-refs.py --all`（引用可达性，应输出 0 处）。

## 三层门禁（速查）

| 层 | 管什么 | 判据 | 谁执行合并 |
|---|---|---|---|
| H1 冲突与基线 | 能不能合 | `scripts/pre-merge-check.sh` → `SAFE_TO_MERGE` + 三件套（TTL 10 分钟） | —— |
| H2 所有权与正本 | 该不该合 | `pr-grade.sh --check-ownership`（越界 0 处） | —— |
| H3 分级与授权 | 谁来合 | 绿=agent 自动；黄=要 user 批准（agent 可代执行并留引用）；红=只有 admin 执行 | 见下 |

三层**不互相豁免**，每层单独出结论，结论有保质期。
详情见 [references/governance-model.md](references/governance-model.md)。

## 五个闸门（速查）

| job | 抓什么 |
|---|---|
| `commit-lint` | 主题格式 / `Refs: #N` / 禁 `Closes` / ≤72 字符 |
| `ownership-check` | 改了本切片独占范围之外的文件 |
| `syntax` | 改动的 `*.sh` 过 `bash -n` |
| `template-check` | PR 模板小节齐全 + pre-merge 三件套原文 |
| `refs-check` | 文档引用可达：路径 / md 锚点 / `file:line` 越界 |

**每个 job 都必须真跑命令**。判据抽自 PR 正文的地方只能当「人已声明的事实」，不能当机器检查——
这条是从真实事故里换来的（`test_fail` 一度是从正文 grep「失败 N 个」，死链一路放行）。
接线与排障见 [references/ci-gates.md](references/ci-gates.md)。

## 文档引用检查的三级分类（速查）

| 类别 | 谁查 |
|---|---|
| 可达性（路径/锚点/行号） | **机器必查**：`scripts/check-refs.py`（`pr-grade.sh --check-refs`） |
| 内容相符（列名/措辞/版本号对不上） | **独立 reviewer subagent**——机判读不出语义 |
| 跨正本口径（两份正本说法相反） | 独立评审 + 状态标记 + 正本单一化 |

**别指望 agent 每次自己记得查**：实测「机器查不到」的两类必须由独立 reviewer 兜底，
实现者不得给自己的 PR 出评级。规则见 [references/doc-layout-rules.md](references/doc-layout-rules.md)。

## 常见任务怎么做

| 任务 | 做法 |
|---|---|
| 开一个新切片 | `bash scripts/new-slice.sh <slice> [base]` → 在 issue 切片表登记 `- \`<slice>\` → \`<独占目录>\`` → 写码 → 提交带 `Refs: #<issue>` |
| 提交前自检 | `bash scripts/pr-grade.sh --pr <N>`（机判）+ 独立 reviewer 出 `GRADE=` 块 |
| 合并前 | `bash scripts/pre-merge-check.sh origin/<branch> main` → 贴**完整输出**（含 `SAFE_TO_MERGE` / `CHECK_TIMESTAMP` / `MAIN_HEAD`）→ TTL 内执行合并 |
| 文档引用报错 | `python scripts/check-refs.py --pr <N>` 看清单；确实是外部仓路径或待产出物料 → 写进 `.refcheck-ignore` 并在 PR 正文说明理由；整篇在讲「还缺什么」→ 文件头加 `refcheck:skip-file` 声明 |
| CI 全员红但没报错 | 看 check-run 注解原文；`started_at` 与 `completed_at` 只差 1~2 秒 = 没拿到 runner = **账单封锁**，不是权限问题（见 [references/ci-gates.md](references/ci-gates.md)） |
| 同步基线后 commit-lint 红了 | 用合规 merge message：`git merge origin/main -m "chore(<slice>): 同步 main 基线" -m "Refs: #<issue>"` |

## 先读哪篇

- 想知道**为什么这样定**、什么时候能偏离 → [references/governance-model.md](references/governance-model.md)
- 要**接 CI / 排查 CI** → [references/ci-gates.md](references/ci-gates.md)
- 要**整文档 / 定正本** → [references/doc-layout-rules.md](references/doc-layout-rules.md)
- 要**避坑 / 排查事故** → [references/anti-patterns.md](references/anti-patterns.md)

## 自检

```bash
python templates/scripts/check-refs.py --root templates --dir   # 本 skill 自己的引用必须全通
bash -n templates/scripts/pr-grade.sh && bash -n templates/scripts/pre-merge-check.sh
bash -n templates/scripts/new-slice.sh
```

## 何时失效

- 团队只有一个 agent、串行干活：五层门禁的成本高于收益，用 H1 + `refs-check` 两道就够
- 交付周期以周计、不是小时级并发：R1 的 10 分钟 TTL 与「每 PR 单独跑检查」会变成负担
- 仓库不是 GitHub：CI 闸门的部分要改写，脚本层（H1/H2）仍可用
