# OPC 一人公司专家团 · Skill 蒸馏快照

从已安装的 `一人公司专家团` 专家包中抽出的全套 skill，按**父子技能嵌套**结构落盘，
并对每个 skill 做了自包含（self-contained）与质量补强。

- 蒸馏日期：2026-11-12
- 上游来源：`C:/Users/24717/.workbuddy/plugins/marketplaces/experts/plugins/opc-team/skills`
- 方法论：一人企业方法论第二版（https://ft07.com）
- 状态：**已入库 2026-11-20**。skill 移到 `SKILL/management/tier0/opc-orchestrator/`（含 8 个阶段
  子 skill），已在 `scripts/install-manifest.txt`。本目录只保留这份 README 与历史评分 CSV。
- 入库时的改动：补 `templates/state-assumptions.json` + `init_opc_doc.py` 的 `STATE_FILES`
  （原先 SKILL.md 声明必读必写的 `state/assumptions.json` 没人创建）。详见
  `SKILL/management/tier0/opc-orchestrator/audit/REVIEW-2026-11-20.md`
- 防误装：`scripts/build-manifest.ps1` 的 `$skipDirs` 仍含 `DISTILLED`；入库后真正的防线是
  `tier<N>/<leaf>/skills/` 这条跳过规则——否则父 skill 会连带 8 个阶段 skill 一起进安装清单

## 结构（父 skill 内嵌 8 个子 skill）

```
DISTILLED/opc-team/
└── opc-orchestrator/               ← 父技能：总编排，决定下一步调哪个子技能
    ├── SKILL.md
    ├── references/                 file-contract / interaction-protocol / stage-map
    ├── templates/                  会话摘要 + 三份状态文件骨架
    ├── scripts/init_opc_doc.py     一次性建全量 opc-doc/ 目录与状态文件
    └── skills/                     ← 8 个子技能，按阶段顺序
        ├── opc-resource-audit/         01 资源盘点
        ├── opc-niche-positioning/      02 利基定位
        ├── opc-value-proposition/      03 价值主张
        ├── opc-business-model-design/  04 商业模式
        ├── opc-mvp-designer/           06 MVP 设计
        ├── opc-conversion-loop/        07 转化闭环
        ├── opc-asset-ops/              08 资产沉淀
        └── opc-dashboard-review/       09 经营复盘
```

父子关系的依据：`opc-orchestrator/references/stage-map.md` 定义 01→02→03→04→06→07 的线性推进
与 08/09 的触发条件，其余 8 个技能都是它的下辖阶段。因此父技能放外层，阶段技能收进 `skills/`。

## 每个 skill 的标配

| 目录 | 作用 |
|---|---|
| `SKILL.md` | 契约 + 流程 + 边界 + 质量自检 + 常见失败模式 + 阶段衔接契约 + 落盘自检 |
| `references/` | 方法细节（分类表、评分表、模板说明） |
| `templates/` | 该阶段产出物的完整骨架，字段与落盘契约一一对应 |
| `scripts/init_stage.py` | 建该阶段输出目录并写出骨架文件；已存在不覆盖，可重复执行 |

自包含性：每个 skill 只依赖自己目录内的文件。跨 skill 的引用全部是**文字提及技能名**
（如"进入 `opc-mvp-designer`"），不存在指向其它 skill 目录的相对路径，因此单独拷走任意一个
skill 目录仍可完整使用。

## 质量评级（`docs/skill-capacity-audit/score_skills.py`）

| Skill | 蒸馏前 | 蒸馏后 | 补齐项 |
|---|---|---|---|
| opc-orchestrator | 7.45 | **10.0** | version、正文深度、templates、scripts、断链修复 |
| opc-niche-positioning | 7.45 | **10.0** | version、code block、templates、scripts |
| opc-resource-audit | 6.75 | **10.0** | 同上 |
| opc-value-proposition | 6.75 | **10.0** | 同上 + `references/vp-strength-scoring.md` |
| opc-business-model-design | 6.75 | **10.0** | 同上 |
| opc-mvp-designer | 6.75 | **10.0** | 同上 |
| opc-conversion-loop | 6.75 | **10.0** | 同上 |
| opc-asset-ops | 6.75 | **10.0** | 同上 |
| opc-dashboard-review | 6.75 | **10.0** | 同上 |
| **均值** | **6.91** | **10.0** | 全部进入 tier0（≥9.0） |

五维明细（A 契约 / B 深度 / C 载荷 / D 链接 / E 卫生）全部满分，0 断链、0 重复、0 名称不匹配。

复现：

```bash
python docs/skill-capacity-audit/score_skills.py \
  --root DISTILLED/opc-team --recursive \
  --out <输出目录> --date 2026-11-12
```

## 用法

```bash
# 1. 建 opc-doc/ 骨架
python opc-orchestrator/scripts/init_opc_doc.py            # 默认 ./opc-doc
python opc-orchestrator/scripts/init_opc_doc.py D:/work/opc-doc

# 2. 进入某阶段时，建该阶段产出骨架
python opc-orchestrator/skills/opc-resource-audit/scripts/init_stage.py D:/work/opc-doc

# 3. 让 agent 加载对应 SKILL.md 后按流程推进
```

## 与上游的差异

上游 9 个 skill 的**流程与判断规则一字未改**。新增的只有：

1. frontmatter `version: 1.0.0`（溯源用）
2. 每篇末尾四节：产出物模板说明、质量自检清单、常见失败模式、阶段衔接契约 / 落盘自检
3. `templates/` 与 `scripts/`（把原本隐含在文字里的产出物格式显式化为可执行骨架）
4. `opc-value-proposition/references/vp-strength-scoring.md`（主张强度五维评分）

如果上游更新，重新从来源目录复制后在本文基础上重跑补强流程，而不是直接覆盖本目录。
