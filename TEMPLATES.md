# TEMPLATES.md — 两个仓库模板怎么用、谁先谁后

本仓通过 submodule 挂了两套「新仓模板」，职责有重叠，直接整套复制会打架。本文说明分层与落地顺序。

| 模板 | 仓库 | 管什么 |
|---|---|---|
| `TEMPLATE-GOVERNANCE` | `yhyu13/Agent_Template_Repo_Governance` | **合并闸门**：R1 冲突与基线检查、R2 分支停止条件、R3 issue 纪律、R4 切片与文件所有权、R5 绿黄红授权、R6 自动化通道；配套 4 个可执行脚本 |
| `TEMPLATE` | `yhyu13/Agent_Template_Repo_Setup1` | **仓的运行形态**：`levels/`（L0–L5 自治等级）、`memory/`（症状路由与不变量）、`specs/`（规格 submodule）、`docs/EXCEPTIONS.md`、`docs/DECISIONS.md` |

## 分层：治理在外，形态在内

```
第 1 层  GOVERNANCE  ← 先套。决定「谁能合、怎么合、什么算完成」
第 2 层  SETUP1      ← 后叠。决定「这个仓怎么记、怎么定级、规格放哪」
```

理由：闸门是**跨项目不变**的约束，形态是**每仓不同**的组织方式。先把闸门固定下来，再按项目裁形态；
反过来会出现「形态文档里写着流程，但没有可执行的检查去兜」。

## 复制顺序与冲突点

1. 先整份复制 `TEMPLATE-GOVERNANCE`（`AGENTS.md`、`docs/`、`scripts/`、`.github/`、`.agent-gate.conf`）。
2. 再把 `TEMPLATE` 的 `levels/`、`memory/`、`specs/`、`docs/EXCEPTIONS.md`、`docs/DECISIONS.md` 作为**新增目录**并入。
3. **两边都有、且只保留一份**的文件：

| 文件 | 保留谁 | 处理 |
|---|---|---|
| `AGENTS.md` | GOVERNANCE | 把 Setup1 的「自治等级 / 记忆 / 例外」压成 2–3 节并入，不另起一份 |
| `docs/GIT_WORKFLOW.md` | GOVERNANCE | Setup1 版本更偏流程叙述，合并后删除 |
| `.github/CODEOWNERS` | GOVERNANCE | 并入 Setup1 的文件所有权条目 |
| `.gitignore` | 合并 | 取并集，别覆盖 |

4. `TEMPLATE` 的 `README.md` 占位块、`levels/` 的示例内容，复制后按项目实际改写或删除，不留空壳。

## 和本仓 skills 的关系

模板管「仓怎么运转」，本仓管「agent 会做什么」。两者靠**项目级依赖登记**接起来：

- 新仓在 `AGENTS.md` 写一张「项目技能依赖」表：场景 → 本仓内的 skill 路径 → 触发点。
- 需要随仓走的 skill，装到 `<project>/.claude/skills/<skill>/`，并在表里标注「已项目级安装」。
- 不随仓走的，只登记路径，依赖全局安装（`~/.agents/skills`）。
- `verify-install.ps1` 校验的是全局安装状态，管不到项目级目录——项目级是否需要单独校验，见待办。

## 待办（未实现）

- [ ] 项目级 skill 的 lock 文件（记录 skill 名 / 来源 commit / tier），让 `verify-install.ps1` 也能校验项目级目录。
- [ ] `registered_agents.json` 目前是空 `{}`，且没有脚本读写它；要么接上 `policy_gate.py`，要么删掉。
- [ ] 本仓 `README.md` 为混合编码（UTF-8 与 GBK 混用），工具无法安全编辑；需要一次单独的转码提交。
