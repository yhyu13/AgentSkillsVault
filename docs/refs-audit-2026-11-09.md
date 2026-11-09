# 2026-11-09 引用审计与并行工具

起因：UE 四个 `colleague-ue-*` 的包外引用（`agents/*.md`）只是被评分暴露出来的一个样本。
这次补三件事：把引用问题一次查清、把修复做掉、把检查脚本做成可并行且自带正确性校验。

## 1. 新工具：`docs/skill-capacity-audit/check_refs.py`

职责只有一件：判断 SKILL.md 里的相对路径能不能在**包内**解析。

```powershell
# 全量检查（默认 min(16, CPU) 并发）
py -3 docs\skill-capacity-audit\check_refs.py --root SKILL --jobs 12 --self-check

# 作为门禁（有未豁免断链则退出码 1）
py -3 docs\skill-capacity-audit\check_refs.py --root SKILL --self-check --fail-on-broken --md out.md
```

设计要点：

- **引用提取规则直接 `from score_skills import collect_refs`**，不另写一套，避免两个工具对"什么算引用"产生分歧。
- **`--self-check` 是正确性测试**：同一次运行里先算并发结果，再算单线程结果，逐条比对；不一致打印差异并退出 1。
  实测 276 个 skill：`SELF-CHECK PASS: serial == parallel(jobs=12)`。
- **豁免清单 `refs-allow.txt`**：`<skill>|<fnmatch 模式>|<理由>`。只登记"项目侧路径 / 正文措辞 / 用户自建目录"，
  每条必须写理由；新增前先回答"删掉它使用者会不会真读不到文件"。
- 输出稳定：结果按 skill 名排序，并发不改变顺序。

## 2. 修了一个真 bug：CJK 路径被截断

`score_skills.py` 的路径正则字符集是 `[A-Za-z0-9_.\-]`，遇到中文路径会在第一个汉字处截断：

```
真实路径 references/MacOS升级影响recook和热更包体调研分析/…md
被提取成 references/MacOS          → 误报断链
```

已把字符集扩到 `\u4e00-\u9fff`（`CODE_PATH_RE` / `BARE_PATH_RE` 都改）。影响：这份报告之前的 D 维对含中文路径的 skill 偏低。

## 3. 修复：UE 四个 skill 收进 `references/`

做法：把 WorkBuddy experts 插件里的 `ue-*.md` 原件复制进各 skill 的 `references/`，正文里的
`agents/ue-*.md` 改成 `references/ue-*.md`，并把"来源 A/B"里的本机绝对路径一并改成包内相对路径
（保留一句"原件来自 ue-prod-team 插件，已随包收录"）。

| skill | 修复前 | 修复后 | 断链 |
|---|---|---|---|
| colleague-ue-app-specialist | 3.95 | **6.45** | 2 → 0 |
| colleague-ue-tech-planner | 3.95 | **6.45** | 2 → 0 |
| colleague-ue-prod-team-lead | 5.95 | **6.45** | 0 → 0（补了自引用原件） |
| colleague-ue-engine-architect | 4.45 | **6.95** | 2 → 0 |

四个的 D 维都从 0–2 分区间统一到 2.0。

## 4. 结果：vault 内断链归零

```
修复前：244 skills / 686 refs / 22 skills 有断链 / 49 条断链
修复后：244 skills / 686 refs /  0 skills 有断链 /  0 条断链（豁免 40 条，逐条写明理由）
```

豁免分四类（详见 `refs-allow.txt`）：

1. 正文措辞或模板占位（`docs/superpowers/specs/YYYY-MM-DD-`、`scripts/brandkit/...`、`link`）；
2. 项目侧文档（`docs/architecture/*`、`docs/adr`、`docs/GDD`、`assets/audio`）——让 agent 去读当前项目；
3. 它要求产出的目录（`hackathon-pitch-pipeline` 的 `docs/*`、`multi-agent-repo-governance` 的 `scripts/*`）；
4. 用户自建目录（`hyperframes` 的 `assets/fonts`、`html-ppt` 的 `examples/my-talk`）。

仍报断链的只有 **store 里的 host 侧 skill**（不在 vault，未修）：`aisides-ai-self-review`、`cron-pipeline-state-machine`、
`game-gen-ddd`、`game-skill`、`kanban-cron-overseer`、`kanban-orchestrator`、`lark-drive`、`lark-whiteboard`、`lark-wiki`，
外加 vendor 上游的 `claude-api`（`agents/README.md`）。这些要么依赖各自项目的 docs/，要么依赖同级 skill 目录。

## 5. 并行化：先测，再决定改哪个

| 脚本 | 现状 | 处理 |
|---|---|---|
| `score_skills.py` | 253 skill 串行 3.8s | 加 `--jobs` / `--serial` / `--self-check`；并发一遍 + 自检一遍合计 3.1s（单遍约 1.5s，约 2.5×） |
| `check_refs.py` | 新增 | 默认并发，`--self-check` 证明与串行逐条一致 |
| `verify-install.ps1` | 10.8s（不查视图）/ 13.3s（查 13 个视图） | **不并行**：506 次树哈希本身已很快，改成 RunspacePool 省不到 7s，却要给完整性校验引入并发写风险 |
| `sync-skills.ps1` | 由变更量决定（本次 56 改 + 14 装） | **不并行**：robocopy 是磁盘 I/O，多路并发抢同一块盘；且多个 store 的 junction 创建互相依赖 canonical 目录先就位 |

结论：并行只用在**纯函数式、无共享写**的审计脚本上；安装/校验脚本保持串行，靠测量说明理由。

## 6. 复现

```powershell
# 引用审计（含正确性自检）
py -3 docs\skill-capacity-audit\check_refs.py --root SKILL --jobs 12 --self-check --fail-on-broken

# 评分（含并行正确性自检）
py -3 docs\skill-capacity-audit\score_skills.py --root SKILL --out docs\skill-capacity-audit --date 2026-11-09 --jobs 12 --self-check
```
