---
name: opc-value-proposition
version: 1.0.0
description: Design value propositions for candidate customer segments and help the user choose the strongest one. Use when Codex needs to explain jobs, pains, and gains when needed, check niche-positioning prerequisites, ask one question at a time, present multiple value-proposition options, and write user-confirmed outputs into `opc-doc/`.
---

# 价值主张

## 目标

帮助用户明确“这类人为什么要买你”，并给出可选择的价值主张方案。

## 核心原则

- 默认读写当前工作目录下的 `opc-doc/`
- 教学模式下先解释 jobs、pains、gains
- 一类细分客户对应一类价值主张
- 默认一次只问一个问题；如果几个问题都很轻、彼此紧密相关，可以合并成 2 到 3 个
- 默认给 3 个价值主张方向，并附加 `4. 我有自己的方案`
- 用户确认后再写入正式结果
- 不直接给推荐结论，只做方案分析
- **本阶段只做"为什么买你"的结构化分析，不进入话术设计或内容创作**

## 本阶段边界

### 本步做什么

- 拆解目标用户的 Jobs / Pains / Gains（结构化框架层）
- 分析你的产品/服务如何对应用户需求（框架层）
- 生成 3 个价值主张版本供用户选择（描述性语言，非推广话术）

### 本步不做什么（以下属于后续阶段，不要提前进入）

- ❌ 不写具体广告文案或推广话术（属于资产沉淀阶段）
- ❌ 不设计内容选题或帖子结构（属于资产沉淀阶段）
- ❌ 不做定价策略或收费方案（属于商业模式设计阶段）
- ❌ 不设计转化路径或获客步骤（属于转化闭环阶段）

**越界检测**：如果出现"怎么写标题""小红书文案""怎么说服用户"等执行话题，先记录，再说：
> "这些执行细节很重要，我们会在后续阶段专门处理。现在先把'为什么买你'的逻辑框架确认好。"

## 本步骤必须完成什么

1. 目标细分客户确认
2. Customer Jobs
3. Pains
4. Gains
5. Products / Services
6. Pain Relievers
7. Gain Creators
8. 价值主张版本比较

## 优先确认顺序

1. 目标细分客户
2. Customer Jobs
3. Pains
4. Gains
5. Products / Services
6. Pain Relievers
7. Gain Creators
8. 价值主张版本选择

## 完成标准

- 价值主张画布关键模块已经完整
- 用户已确认当前主打的价值主张版本

## 本步需要解释什么

教学模式下先解释：

- Jobs：用户想完成什么任务
- Pains：用户在完成任务时最痛的阻碍
- Gains：用户理想中想得到的收益
- 价值主张：你准备如何帮助这类用户更好完成任务

## 输入

必须先读取：

- `opc-doc/outputs/02-niche-positioning/segments.md`
- `opc-doc/outputs/02-niche-positioning/target-segment.json`
- `opc-doc/outputs/02-niche-positioning/positioning-statement.md`

如果这些文件缺失，先判断当前对话是否已经明确目标细分和定位。

- 如果没有，先建议调用 `opc-niche-positioning`

## 执行步骤

1. 解释本步目标和术语
2. 默认一次只问一个问题；如果几个问题都很轻、彼此紧密相关，可以合并成 2 到 3 个，例如：
   - 这类用户最想得到的结果是什么？
   - 他们现在最痛的一点是什么？
   - 他们为什么不满意现有方案？
3. 每轮回答后，用白话总结当前 jobs / pains / gains 理解
4. 生成 3 个价值主张版本，例如：
   - 提效型
   - 结果型
   - 降风险型
5. 每个版本都说明适用情况、优点和代价
6. 默认增加 `4. 我有自己的方案`
7. 让用户选择、组合、修改，或直接提出自己的版本
8. 用户确认后，再写入正式结果

## 输出

对话层必须包含：

1. 本步解释
2. 当前 jobs / pains / gains 摘要
3. 3 个价值主张候选 + `4. 我有自己的方案`
4. 每个方案的适用情况、优点和代价
5. 请用户确认或修改

## 落盘检查点（阶段必须完成，不可跳过）

用户明确确认主价值主张版本后，**立即**使用 Write 工具在文件系统上创建以下文件，然后才能进入下一阶段。在对话中描述结论不等于落盘。

**写入文件：**

- `opc-doc/outputs/03-value-proposition/value-proposition-canvas.md`（Jobs / Pains / Gains + Pain Relievers / Gain Creators 完整画布）
- `opc-doc/outputs/03-value-proposition/segment-vp-matrix.md`（目标客群 × 价值主张对应关系）
- `opc-doc/outputs/03-value-proposition/messaging.md`（确认的主价值主张表述，框架层，非广告话术）

**更新状态文件：**

- `opc-doc/state/current-stage.json`（写入：`{"stage": "03-value-proposition", "status": "completed", "next_stage": "04-business-model", "summary": "一句话价值主张核心"}`）
- `opc-doc/state/decisions.json`（追加确认的价值主张版本）

**落盘完成后，在对话中告知用户：**
> "✅ 价值主张结论已保存。下次对话可以从商业模式设计继续。"

**只有落盘完成后，才可以提示进入 `opc-business-model-design`。**

## 何时调用其他 skills

只有在用户确认主价值主张后，才进入 `opc-business-model-design`。

## 异常处理

- 如果用户对术语不熟，必须改用更白话的表达
- 如果多个价值主张都可行，要并列呈现，不要私自替用户拍板

---

## 产出物模板与初始化脚本

本 skill 自带 `templates/` 与 `scripts/`，**不依赖其它 skill 的文件**也能独立运行：
模板给出产出物的完整骨架，脚本负责建目录与写骨架文件（已存在的文件不会被覆盖，可重复执行）。

```bash
# 建到当前目录下的 opc-doc/
python scripts/init_stage.py

# 或指定位置
python scripts/init_stage.py D:/work/opc-doc
```

初始化只是把骨架摆好，**内容必须由对话确认后填写**。落盘完成才允许进入下一阶段。

## 质量自检（落盘前逐条过）

| 检查项 | 通过标准 |
|---|---|
| 客群唯一 | 画布只针对 02 阶段确认的那一个细分，不混装多类人群 |
| Jobs 可观察 | 每条 Job 都是用户能说出口的具体任务，不是抽象需求 |
| Pains 有场景 | 每条痛点都写了在什么场景下出现 |
| 缓解项对应 | 每个 Pain Reliever 都能指回一条 Pain，不凭空新增 |
| 有替代对照 | 每个解法都说明了相对现有替代方案的差异 |
| 停在框架层 | 没有写广告话术、没有写具体选题 |

一句话判据：**把画布上的 "为谁 / 解决什么 / 凭什么相信" 三行连起来读，用户会点头说"对，就是这个"。**

## 常见失败模式与纠偏

| 失败模式 | 表现 | 纠偏动作 |
|---|---|---|
| 人群发散 | 画布里同时出现两类完全不同的人 | 只保留 02 确认的细分，其余另开一份 |
| 把功能当痛点 | "他要一个工具" | 追问：没有这个工具时，他现在的处境是什么 |
| 收益写成卖点 | "让效率提升 300%" | 改成用户视角的原话，再回填数字证据 |
| 解法超前 | Pain Reliever 里已经写到交付流程 | 拉回"你提供什么"，交付细节属于 06 之后 |
| 只给一个主张 | 没有对比项，用户无法判断 | 补足 3 个候选 + `4. 我有自己的方案` |

```text
主张表达的最小结构：
为 [具体人群] 解决 [具体处境下的具体问题]，
不同于 [现有替代方案]，
我提供 [可被感知的差异]。
```

## 阶段衔接契约

| 方向 | 内容 |
|---|---|
| 接收 | `02-niche-positioning/target-segment.json`、`positioning-statement.md` |
| 交付 | `value-proposition-canvas.md`、`segment-vp-matrix.md`、`messaging.md` |
| 下游 | 04 阶段填 Lean Canvas 的独特价值主张格；07 阶段据此定内容类别 |
| 不接收 | 未确认的客群——价值主张一旦脱离具体人群就会退化成行业套话 |

价值主张阶段最容易被跳过的动作，是**给替代方案留位置**。用户不是在你和空白之间选，
而是在你和他现在凑合用的办法之间选。所以画布上每个解法都要写出"相对现有做法的差异"，
写不出差异的那一条，就不是真正的价值。

## 落盘自检

```bash
ls -l opc-doc/outputs/03-value-proposition/
grep -n "Jobs\|Pains\|Gains" opc-doc/outputs/03-value-proposition/value-proposition-canvas.md | head
```

判据：画布五块（Jobs / Pains / Gains / Pain Relievers / Gain Creators）都有内容，且每个
Pain Reliever 都能指回一条具体 Pain。指不回去的条目，要么是多余的解法，要么是漏记的痛点
——两种都要处理，不能留着。评分细则见 [references/vp-strength-scoring.md](references/vp-strength-scoring.md)。
