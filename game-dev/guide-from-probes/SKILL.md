---
name: guide-from-probes
description: Turn an existing deterministic E2E probe (Playwright tests that already capture screenshots at ASSERTED moments) into a complete human-readable how-to / playthrough guide — without needing to view a single image. Use when user says "write a play how to guide" / "通关攻略" / "dump to doc" / "写个新手教程" / "how do I play this" / "explain the whole game". Ground truth = the probe's shot() call sites + assertions, NOT the pixels.
metadata:
  type: workflow
  applies-to: documentation, e2e-testing, playthrough-guide, screenshots, how-to, playwright, user-guide
  case-study: 8_lifegame (2026-08-16 commit d5583c9 — see §9)
---

# guide-from-probes（从确定性探针出攻略）

> **核心理念**：你**不需要亲眼看截图**，甚至**不该**依赖看截图，就能写出一份完整、准确、可版本化的新手攻略/通关指南——只要项目已经有一套**确定性 E2E 探针**（Playwright 脚本在每个被断言的状态点上截图）。**探针的断言才是 ground truth，像素不是。**
>
> 这个 skill 的流程 = **recon → ground-truth → curate → promote → author → commit**（6 步）。输入是「一堆探针截图 + 探针源码」，输出是「一份图文攻略 + 它的截图，同 commit 入库」。
>
> **强制 deliverable**：`docs/playthrough/`（或项目等价目录）里的攻略 doc + 截图。没截图 = 攻略只有一半；截图没入库 = 下次打开全是红叉。
>
> **重要**：本文件只给**抽象 pattern**。具体截图名 / 事件 id / 常量值 / 目录名都来自 [项目] 本身，不要复制 §9 case study 的具体内容。

---

## 1. 何时使用这个 skill

**Trigger 关键词**（任何一个）：
- 用户说 "write a play how to guide" / "通关攻略" / "whole game progress" / "dump to doc"
- 用户说 "写个新手教程" / "how do I play this" / "explain the whole game"
- 项目已有一套会在关键状态点截图的 E2E / Playwright / 探针脚本，用户想把它变成给人看的文档
- 你（或用户）处在一个**看不了图**的环境（模型无视觉 / 图片太大 / 环境只给 `[Unsupported Image]`）

**何时不使用**：
- 项目**还没有**任何会截图的确定性测试 —— 那得先写探针（这是另一件事，不是本 skill）
- 用户只想要一张图、一个字段的解释（那是普通问答，不是"全流程攻略"）
- 截图是**手工截的**、没有对应断言（像素没有 ground truth，可信度打折——但仍可用 §3 的"读源码补 ground truth"兜底）

---

## 2. 哲学 / Why

### 2.1 为什么「像素不可靠，断言可靠」

一张孤立的截图告诉你"长这样"，但**不告诉你"这是游戏流程的哪一步、这个状态对不对"**。而一个确定性探针里，`shot(name)` 几乎总是紧跟一条断言：

```js
if (ev.id !== 'open_account') throw ...   // 先证明这局是「开户」
await shot('t1-3-event.png')              // 再截图 —— 内容被上面那条断言锁定
```

**所以截图的语义是被测试「证明」出来的**，不是靠肉眼猜的。当你看不了图（模型无视觉），这条性质是救命稻草；即使你看得了图，断言也告诉你"这张图该看什么、该信什么"。

### 2.2 错误路径 vs 正确路径

| 错误路径 | 正确路径 |
|---------|---------|
| 起 dev server 重新截图 | 先盘点已有探针截图，**复用**再决定要不要补 |
| 肉眼猜每张图"是什么" | 读 `shot()` 调用点 + 相邻断言，语义是**被证明的** |
| 用 `t3-4-event.png` 这种原始名写进 doc | 语义化重命名（`07-choose-track.png`），文件名自解释 |
| 截图留在探针产物目录（git 排除） | **promote** 进 `docs/` 提交，攻略和截图一起入库 |
| 按"第 1 关、第 2 关…"逐关流水账 | 讲清楚 **1 个循环 + 关键机制 + 隐藏系统 + 路线表** |
| 攻略里的数字凭记忆写 | 每个数字都溯源到 `constants.ts` / data 文件那一行 |

---

## 3. 六步流程（recon → ground-truth → curate → promote → author → commit）

> 每步有 deliverable + 验证门。顺序固定：**先 recon 再决定要不要重新截图**（多数时候不用）。

### Step 1 — Recon（盘点已有探针 + 截图）

**目标**：搞清楚"已经有什么"，而不是"我要生成什么"。

1. 列出探针脚本目录（`scripts/*.mjs`），找出哪些会截图（grep `shot(` / `screenshot(`）。
2. 列出截图产物目录（`showcase/` / `render/` 等），`ls -la` 看**修改时间**——刚跑过的探针产物 = 最新代码 + 已通过断言 = 可直接复用。
3. 读探针脚本里 `shot(name)` 的**每一个调用点**，记录「截图名 → 触发它的游戏状态」。

**验证门**：你手里有一张「截图名 → 语义」的映射表，且每张都能追溯到一条探针断言。

### Step 2 — Ground-truth（读探针断言 + 源码常量，不读像素）

**目标**：为每张截图建立"被证明的语义"，并补齐攻略需要的所有**数字**。

1. 读探针脚本里 `shot()` **前后 10 行**：断言了什么（`ev.id === ...` / `phase === ...` / 字段值），这张图就锁定了什么。
2. 读**源码数据契约**，不读 UI 渲染：`assets.ts`（品种/风险/价格）、`constants.ts`（规则/阈值/目标）、`cells.ts`（地点）、`Simulation.ts`（关键状态机）——攻略里每个数字都要从这里来，不靠记忆。
3. 对**看不到图**的情况：把「截图名 → 断言 → 源码常量」三件套对齐，caption 就比肉眼更可信。

**验证门**：攻略里即将出现的每个数字/规则，你都能报出它在哪个文件的哪一行。

### Step 3 — Curate（选最小完整弧线 + 语义化命名）

**目标**：挑**最少但完整**的一组截图，一张覆盖一个游戏阶段，按流程顺序重命名。

- 原则：**一张一个阶段**。少到不能再少，但仍能串起"从开局到结局"的完整弧线。
- 重命名成自解释：`01-origin-choice.png` / `06-invest-first-trade.png` / `14-summary.png`——让 doc 里 `![](06-invest-first-trade.png)` 光看文件名就知道是啥。
- 关键机制（如两步走交易）值得**一张专门的图**，即使它只是流程中间的一个 UI 态。

**验证门**：最终截图清单 = 游戏阶段清单的一一对应，无冗余、无缺口。

### Step 4 — Promote（临时产物 → 入库产物）

**目标**：把选中的截图从"探针产物目录"复制到"提交目录"。

- 探针产物目录（`showcase/`）通常被 commit 排除或 gitignore——那是**可再生垃圾**。
- 攻略截图要放进 `docs/playthrough/`（或项目等价目录），和攻略 doc 一起 `git add`，版本化。
- 用 `cp`，不是移动：保留探针产物原地可再生成，攻略目录是独立快照。

**验证门**：`git status` 里攻略目录的截图是 staged 的新文件，探针产物目录不被误提交。

### Step 5 — Author（写 doc：1 个循环 + 关键机制 + 隐藏系统 + 路线表）

**目标**：写一份"读者扫一遍就会玩"的攻略，而不是"第 N 关流水账"。

**结构公式**（顺序固定）：

1. **一句话**：这游戏在玩什么（3 个目标，一句话串起来）。
2. **开局**：出身/初始选择 → 目标 → 地图（3 张图）。
3. **一个循环**：把重复的每周/每关流程讲**一次**，配 1 张图 + 8 步列表。读者懂了循环 = 懂了游戏。
4. **关键机制**：最需要搞懂的 1-2 个交互（如两步走交易），配专门截图，讲规则表。
5. **隐藏系统**：UI **不直接告诉你**、但决定"怎么赢"的东西（如贵人信任 / 复盘能力）。这是攻略的价值所在——玩家自己玩发现不了。
6. **路线表**：一张"第几周去哪、为什么"的表，给一条可复制的打法。
7. **结局**：结算/诊断/总结，配总结截图。
8. **附录**：覆盖版本号、截图来源、相关设计文档链接。

**关键原则**：**隐藏系统 > 流水账**。攻略和"游戏内教程"的区别，就在你能不能讲清 UI 没说出口的胜负手。

### Step 6 — Commit（doc + 截图同 commit，范围精确）

**目标**：攻略和它的截图**同一个 commit**，只提交攻略相关文件。

- 提交范围精确到攻略目录（`docs/playthrough/`），不夹带探针产物、不夹带别的 game。
- commit message 写清：正文 + N 张截图来源（哪个探针、哪条路线）。

**验证门**：`git show --stat HEAD` 只有攻略 doc + 它的 N 张截图，无杂项。

---

## 4. 「数字必须溯源」铁律

攻略里的每一个数字、每一条规则，都必须能报出**来源文件:行**：

| 攻略里写什么 | 必须来自哪里（举例，非固定） |
|---|---|
| 品种 / 风险 / 初始价格 | `assets.ts` |
| 佣金率 / T+1 / 最小单位 / 涨跌停 | `constants.ts` 的 `TRADING_RULES` |
| 认知阈值 / 信任命中率 / 目标金额 | `constants.ts` |
| 地点 → 产出 → 风险 | `cells.ts` |
| 觉醒 / 复盘的条件 | `Simulation.ts` 的对应函数 |

**为什么**：攻略是长期文档，代码会变。凭记忆写数字 = 写 bug；溯源写数字 = 自动正确 + 版本可查。

---

## 5. 脚本工具箱

| 动作 | 命令（举例，非固定） |
|------|---------------------|
| 盘点会截图的探针 | `grep -rn "shot(" scripts/` |
| 看截图产物 + 时间 | `ls -la showcase/` |
| 复制选中截图入库 | `cp showcase/t3-4-event.png docs/playthrough/07-choose-track.png` |
| 提交攻略 | `git add docs/playthrough/ && git commit` |

> 本 skill **不负责写探针**。探针是输入，不是产出。如果项目没有探针，先回到「写确定性测试」的活。

---

## 6. Deliverable 模板（强制）

攻略 doc 骨架（`docs/playthrough/README.md`）：

```markdown
# <游戏名> · 通关全流程攻略
> 逐屏图文攻略 + 截图来源（哪个探针、哪条路线、版本）

## 0. 这游戏在玩什么（一句话 + 3 个目标）
## 1. 开局（出身/初始选择，配图 + 对比表）
## 2. 地图 / 资源（配图 + 表：地点→产出→风险）
## 3. 一个循环（8 步，讲一次，配图）
## 4. 关键机制（最需搞懂的交互，配专门图 + 规则表）
## 5. 隐藏系统（UI 没说的胜负手，2-3 条主线）
## 6. 路线表（第 N 步去哪、为什么）
## 7. 结局（结算/诊断，配图）
## 8. 附：版本 / 截图来源 / 设计文档链接
```

> **没有「隐藏系统」章节 = 没做攻略**，只是把 UI 抄了一遍。

---

## 7. Anti-patterns

### ❌ 反模式 1 — 起 server 重新截图
> 已有探针产物，却为了"全新截图"重启 dev server
**问题**：探针产物是**刚跑过 + 断言通过**的最新快照，重截是重复劳动。
**正解**：先 recon；只有缺某个关键状态时才补截。

### ❌ 反模式 2 — 靠肉眼猜图
> 看不了图就卡住，或看得到就"感觉这是选方向"
**问题**：肉眼没有 ground truth，猜错语义 = 攻略写错章节。
**正解**：读 `shot()` 相邻断言，语义被测试锁定。

### ❌ 反模式 3 — 截图用原始名直接嵌 doc
> `![](t3-4-event.png)` 这种
**问题**：文件名不解释，读者和未来的你都不知道这是啥阶段。
**正解**：语义化重命名成 `07-choose-track.png`。

### ❌ 反模式 4 — 截图留在探针产物目录
> 攻略引用 `showcase/*.png`，但 `showcase/` 被 commit 排除
**问题**：别人 checkout 后所有图红叉。
**正解**：promote 进 `docs/` 并提交。

### ❌ 反模式 5 — 按关卡流水账
> 第 1 关……第 2 关……第 17 关……
**问题**：重复、读不下去、读者记不住。
**正解**：讲 1 个循环 + 关键机制 + 隐藏系统 + 路线表。

### ❌ 反模式 6 — 数字凭记忆
> "认知要 60 才能……大概 60 吧"
**问题**：攻略成了 bug 农场，代码一改全错。
**正解**：每个数字溯源到 `constants.ts:行`。

### ❌ 反模式 7 — doc 和截图分两个 commit
> 先提交 doc，截图"稍后补"
**问题**：doc 与图 drift，review 时对不上。
**正解**：同 commit。

---

## 8. 验证这个 skill 是否工作

每做完一份攻略，问自己：
- [ ] 有没有先 **recon** 已有探针截图，而不是直接重截？
- [ ] 每张截图能不能报出「它被哪条断言锁定」？
- [ ] 攻略里每个数字能不能报出「来自哪个文件哪一行」？
- [ ] 截图清单是不是「游戏阶段」的一一对应（无冗余、无缺口）？
- [ ] 截图有没有**语义化重命名**（不是 `t3-4.png`）？
- [ ] 截图有没有 **promote 进 `docs/`** 并提交（不是留在探针产物目录）？
- [ ] doc 有没有「**1 个循环 + 关键机制 + 隐藏系统 + 路线表**」四件套？
- [ ] doc 和截图是不是**同一个 commit**，范围精确？
- [ ] 「隐藏系统」章节是不是真的讲了 UI 没说的胜负手（不是抄 UI）？

9 个 ✅ = 攻略质量合格。<6 个 = 漏了某步，回去补。

---

## 9. Case Study — 8_lifegame（2026-08-16 commit d5583c9）

> **本节是唯一的具体参考**，其他章节都是抽象 pattern。在别的项目用这个 skill，**不要复制本节的具体截图名 / 事件 id / 常量值 / 目录名**——它们都来自 8_lifegame 本身。

### 9.1 项目背景

- **项目**：`8_lifegame`（股神模拟器）——17 周校园生活 + 模拟盘炒股 + 贵人觉醒的 React 游戏
- **本次**：用户要"write a play how to guide with screen shots and explanation for whole game progress, dump to doc"

### 9.2 实际执行（六步）

1. **Recon**：`ls -la showcase/` → 发现当天早上 `showcase.mjs` 刚重生成的一批 `t{N}-*.png`，可直接复用。
2. **Ground-truth**：环境对 PNG 返回 `[Unsupported Image]`（看不了图）→ 读 `showcase.mjs` 的 `shot()` 调用点：`t1-3-event` 前面断言 `ev.id === 'open_account'`，`t3-3-event` 前面注释"4-choice 选方向 card"……每张图的语义被锁定。再读 `assets.ts`（7 品种）、`constants.ts`（T+1/佣金/阈值/目标）、`cells.ts`（8 栋楼）。
3. **Curate**：从 60+ 张里挑 14 张，一张一个阶段，重命名 `01-origin-choice.png` … `14-summary.png`。
4. **Promote**：`cp showcase/t3-4-event.png docs/playthrough/07-choose-track.png`（×14）——因为 `showcase/` 被 commit 排除。
5. **Author**：doc 用「1 个循环 + 两步走交易 + 两条隐藏主线(贵人信任/复盘能力) + 15 周路线表」结构，第 14 节专门讲 UI 没说的两条主线。
6. **Commit**：`d5583c9 docs(8lg): playthrough how-to guide — whole-game walkthrough with 14 screenshots`，15 文件（1 doc + 14 图）。

### 9.3 关键 takeaway（给下一个项目）

- ✅ 「探针断言 = ground truth」在**看不了图**的环境是决定性优势，不是障碍
- ✅ 「复用 > 重截」：当天刚跑过的探针产物，比任何手工重截都可信
- ✅ 「promote 临时 → 入库」：截图不 `cp` 进 `docs/` 就是红叉 docs
- ✅ 「隐藏系统 > 流水账」：攻略的价值 = 讲清 UI 没说出口的胜负手（贵人信任 / 复盘能力）
- ❌ 8_lifegame 的「t1-3 = open_account / t3-3 = choose_track」映射不可复制——事件 id 是项目专属
- ❌ 8_lifegame 的「showcase/ 被排除」是项目约定，别的项目可能是 `artifacts/` 或根本没排除

---

*整理人：用户（需求）+ Claude（执行）· 事实来源 = 8_lifegame showcase.mjs 探针 + 源码常量 + commit d5583c9 · 版本 v1（2026-08-16）*
