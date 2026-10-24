# FDE/ — 个人学习库（learning-vault 流程）+ FDE 领域语料

这个目录放两样东西，**不要混为一谈**：

## 1. 两个 domain-agnostic 的学习库流程（skill 本体）

| skill | 输入 → 输出 |
|-------|------------|
| `book-chapter-to-vault/` | .docx 书籍章节 → 学习笔记 + 速查卡 + Kanban 注入 + mindmap 扩展 |
| `analysis-to-vault/` | 长篇分析文章 → 中心论点 + 论点地图 + 速查卡 + 工作应用 |

两个流程的**模板、脚本、验收标准都不绑定任何领域**（见 `book-chapter-to-vault/SKILL.md` 的「Reusability」与「Known limitations」两节）。FDE 只是它们的 worked example 语料来源：

- `analysis-to-vault/examples/deep-analysis-fde/` — FDE 行业深度解析文章的处理产物
- `book-chapter-to-vault/examples/fde-ai-pm-ch2-4/` — FDE AI PM 书第 2–4 章的处理产物（含 `技能树.md`、`kanban.md`）

换任何其他领域的书 / 文章，这两个 skill 都能直接用，只需换 `examples/` 之外的输入目录。

## 2. FDE 领域语料（examples/ 内）

`examples/` 下的原文与笔记是**真实 FDE 材料**，是本目录唯一真正带 FDE 属性的部分：

- `analysis-to-vault/examples/deep-analysis-fde/_raw/深度解析FDE.md`
- `book-chapter-to-vault/examples/fde-ai-pm-ch2-4/_raw/第二章…第三章…第四章….md`

这些是学习资产，不是 skill 依赖，改名/移动会打断示例引用。

## 不在 FDE/ 的东西

- **`investment-masters`**：AlphaGBM 的 15 位投研大师方法蒸馏包（SEC 13F / Buffett / Dalio / Soros），与 FDE 无关。
  原先在 `FDE/investment-masters` 放了一份 `vendor/investment-masters`（submodule @ `b1a304f`）的**逐字节副本**，已删除。
  源仍在 `vendor/investment-masters`，**vendor-only**，不装进分类目录。
  依据：`SKILL_RADAR/2026-10-24-radar-adoption-install-record.md` §9 勘误。

## 相关文档

- `../INSTRUCTION.md` — FDE/ 小节（origin 与来源）
- `../README.md` — 目录树与 skill 总表
- `../docs/skill-capacity-audit/2026-10-24-capacity-audit.md` — 容量评分（`book-chapter-to-vault` 10.0 / `analysis-to-vault` 9.0）
