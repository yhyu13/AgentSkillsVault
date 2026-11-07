# 证据映射：六个手法 ↔ 可查证据

来源项目：Aholo 黑客松仓 `yhyu13/Hackthon_Aholo_20261107`（2026-11）。
路径相对该仓根目录。本文件的作用：让 skill 的每条主张都能被当场核对，而不是"据说"。

## 手法 1 · 状态标记防「假设写成完成」

| 证据 | 位置 | 抓到了什么 |
|---|---|---|
| PRD 语义验收器 | `specs/005-hackathon-prd/validate_prd.py` | `has_blocking_u10()` 拒绝「非阻断 / 不阻断 / 已解除 / 已满足 / 已完成」五类措辞用在 U-10 上；`check("Lux3D evidence status honest")` 禁止出现「已满足 Lux3D」；「不得把旧 QA 当作新证据」；提交时间未核对时写死日期即失败 |
| 未决项编号 | `specs/005-hackathon-prd/tasks.md`、`docs/prd/product-prd.md` 的 `U-01`~`U-11` | U 编号三处对齐（正文 / spec / tasks）由脚本比对，归属与状态不一致即失败 |

要点：状态标记不是"写作规范"，是**可执行断言**。写法决定了它能不能被机器查。

## 手法 2 · 正本单一化

| 证据 | 位置 | 抓到了什么 |
|---|---|---|
| 决策记录正本 | `docs/pitch/decisions.md` | 八节结构：口径（已定稿，不要再改）/ 版本演进 / 关键决策与被否决的方案 / 逐项核实 / 评分对齐 / 未决事项 / 文件清单 / 来源 |
| 口径冲突实例 | 同一会话内 大纲 v5 / 正文 v5.2 / PRD v1.2 | 三份口径互相矛盾，实现方读哪份都可能错 |

决策记录里"被否决的方案"一节是常被忽略但最值钱的部分：它保存了"为什么不选另一条路"，
避免下一届重新讨论同一个问题。

## 手法 3 · 风险前置

| 证据 | 位置 | 抓到了什么 |
|---|---|---|
| 48 小时 Go/No-Go 闸门 | `docs/review-gate/README.md` | 闸门对象唯一化：U-10（Lux3D 能否出可用资产）；三步最小验证、总耗时 ≤48 小时、明确"不写产品代码"；含"判定与降级"与三条闸门纪律 |
| 评分对齐 | `docs/review-gate/README.md`、`docs/onboard-value/README.md` | 讲师四张卡（空间卡 / 问题卡 / Lux3D 卡 / 项目卡）逐条映射到"做没做 / 证据在哪 / 还缺什么" |

关键差别：闸门对象只有一个。列三个闸门等于没有闸门。

## 手法 4 · 独立上下文评审

| 轮次 | 评审方 | 结论 | 抓到的具体问题 | 记录位置 |
|---|---|---|---|---|
| 第 1 轮（`prd-review-spec`，PR #47） | fresh-context reviewer | `REQUEST_CHANGES` | 非法 FR 编号可 false-green；带空白的远程资源属性可 false-green；装饰列表被误判不存在；评分单位冲突 | issue #25 评论 [2026-11-06T17:15:25Z](https://github.com/yhyu13/Hackthon_Aholo_20261107/issues/25#issuecomment-6690836308) |
| 第 2 轮（`prd-direction-v12` / `pitch-roadshow-v1`，PR #76 / #77） | DSH 只读沙箱（`dsh headless`） | `changes_requested` | 1 critical + 4 major + 4 minor；critical = 评审期间 worktree 脏（评审对象本身不干净） | issue #25 评论 [2026-11-07T10:56:03Z](https://github.com/yhyu13/Hackthon_Aholo_20261107/issues/25#issuecomment-6705899522) |

> **别去 PR 的 review 区找**：这两轮评审的原始结论只写在 issue 评论里，PR #47 / #76 / #77 的
> review 区与评论区都是空的。引用时给评论链接，不要写「PR #47 的评审」这种指不到位置的说法。
> 第 1 轮四项里的三项另有仓内锚点（`specs/005-hackathon-prd/validate_prd.py` 的 `self_test()`
> 用例 + `specs/005-hackathon-prd/tasks.md:62`「评审回归：非法命名空间、001 装饰列表、
> 远程资源变体与普通外链」）；「评分单位冲突」目前只有上面那条 issue 评论一处记录。

可复用的评审契约：给评审者**可检查的标准**（"AC-13 必须是真实表格行"），不给"好不好"。
另附一条：评审前先确认工作树干净，否则评审意见本身不可信。

## 手法 5 · 真实案例定坐标

| 证据 | 位置 | 作用 |
|---|---|---|
| 竞品形式对比与欠缺清单 | `docs/competitor-review/README.md`、`docs/competitor-review/team-gap.md` | 同类产品：形态 / 代价 / 判据 / 用户角色 |
| 三案例横向对照 | `docs/video-ref/design/04-cross-case-comparison.md` | 同题材参考件：往届作品 / 方案论证片 / 行业案例 |

缺任一类，"我们新在哪"就说不清。

## 手法 6 · 版本留档

| 证据 | 位置 | 说明 |
|---|---|---|
| 版本演进节 | `docs/pitch/decisions.md` 第二节 | 大纲 v1 → v5 的演进被逐版留档，可追溯每次改动的原因 |
| PRD 版本 | `docs/prd/product-prd.md`（当前 v1.2） | v1.1 **未另存文件**，只存在于 git 历史（PR #47 / #61）；对比要回 git 历史查 |

## 反面清单（本项目真实踩过的）

- 旧 demo 冒充新成果 → 验收器拒（U-08 / U-10）
- 未决项被写成"已解决" → 验收器拒
- 提交时间凭印象写死 → 验收器拒
- 数字前后不一致（表格 4 条 / 正文写"三条"）→ 独立评审抓
- 交叉引用指向不存在的小节 → 独立评审抓
- 切片独占目录越界 → 仓库侧 ownership-check 抓（与本 skill 无关，但同样属于"边界要机器查"）
