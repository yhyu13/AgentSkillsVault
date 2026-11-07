# 蒸馏来源与取舍记录 (aigc-image-control)

记录本 skill 每个部分的出处、保留理由、丢弃内容，以及可复核的证据位置。目的是让"这个方法从哪来、改了什么、为什么改"永远可回答。

## 来源

| 来源 | 类型 | 版本 / 日期 | 用途 |
|------|------|-------------|------|
| `github.com/jiemianduan/poster-style-transfer` | 上游 skill 仓库 | v0.1.0, MIT | 玩法 A（海报风格迁移）与三层锁定、失败处置表 |
| `github.com/jiemianduan/image-to-prompt` | 上游 skill 仓库 | v0.1.0, MIT | 玩法 B（图生提示词）与分析顺序、输出格式、`【】` 变量约定 |
| 《AI 生图可控工作流 · 观众配套说明 v1.0》(段截面, 2026-08-12) | 用户提供的 PDF | 5 页 | 四种玩法的整体框架、角色资产目录、真人肖像 prompt 原文、平台索引、玩法 E（2D→3D） |

上游两个仓库的目录结构（克隆于 2026-11-07，`--depth 1`）：

```
poster-style-transfer/  SKILL.md  README.md  LICENSE  adapters/{cursor,gemini-cli}  agents/openai.yaml
                        references/{poster-style-spec.md, poster-archetypes.md, fidelity-rubric.md}
image-to-prompt/        SKILL.md  README.md  LICENSE  adapters/  agents/openai.yaml
```

两个仓库都只有 Markdown（无脚本、无 eval、无测试），所以本 vault 采用**蒸馏**而非整目录复制：装两个 0.1.0 的近重复 skill 会让观察/推断纪律写两遍、必然漂成两套说法，按 vault 的缺陷审计口径也属于"无法验证的轻量 payload"。

## 保留（原样继承的方法）

- 三层锁定 `Hard lock / Soft lock / Must replace`（poster-style-transfer）。
- "参考图只作设计系统参考，不是编辑目标"（poster-style-transfer）。
- 观察 vs 推断分离、不猜艺术家/seed/模型/焦距（image-to-prompt）。
- 可编辑变量用全角 `【】` **内嵌当前值**，禁止空括号与独立变量清单（image-to-prompt）。
- 多图职责分配（"图 2 只看动作，不参考长相"）与优先级排序（PDF 案例三）。
- 常见失败 → 原因 → 处置表的写法（poster-style-transfer + PDF）。
- 虚构角色转真人肖像的皮肤/布光/禁止项清单（PDF 页 4–5 原文改写为模板）。
- 参考图平台索引与商用版权提示（PDF 页 5）。

## 改动（本 vault 的取舍）

| # | 上游做法 | 本 skill 做法 | 理由 |
|---|----------|---------------|------|
| 1 | 两个独立 skill | 合并为一个 | 共用纪律只写一次；避免同一套方法两个版本 |
| 2 | 精确版式靠文字描述 | 硬规则：密集文字走"生成留白 + HTML/矢量叠字" | 模型不按百分比排版，靠描述必然失真 |
| 3 | 一张图含 5 个视角的设定表 | 改为每角度单张，正脸先定稿 | 多角度单图的一致性失败率最高 |
| 4 | 一次性给完整长 prompt | 分阶段加约束，按失败归因补条目 | 长 prompt 被截断/权重稀释，正负向混写有害 |
| 5 | 无复现约定 | 要求归档 prompt 全文 + 模型 + 参数 + 参考图版本 | 没有 seed/参数就没有复现 |
| 6 | 假定运行时能看图 | 无视觉通道时 fail closed，只出变量模板 | 否则模型会假装"观察到" |
| 7 | 方向性 fidelity rubric | 打勾制验收清单（可被反驳） | 可复算 > 感觉挺像 |
| 8 | "不要复制品牌元素"一句提醒 | 三条合规红线：肖像授权 / 商用授权 / 可识别角色衍生 | 一句提醒挡不住真实风险 |

## 丢弃

- 上游 `adapters/`（Cursor / Gemini CLI 适配文件）与 `agents/openai.yaml`：harness 特定装配，vault 的四个 store 由 manifest 统一管理，不需要。
- 上游 README 的营销与安装说明：与 skill 行为无关。
- `poster-archetypes.md` / `poster-style-spec.md` / `fidelity-rubric.md` 的全文：字段被吸收进 SKILL.md 的"抽取顺序"与三层锁定；需要原始字段表时回上游仓库读。
- PDF 里"一句话总结"+ 视频案例叙述：属于宣传语，不构成可执行步骤。

## 上游已知缺陷（复核时先看这些）

1. 两个仓库均为 v0.1.0，无测试、无 eval、无 changelog —— 上游改动无法评估，重新同步等于重新审一遍。
2. 无 `LICENSE` 冲突：两仓库均为 MIT，本 skill 为其派生作品，保留上游署名义务（`metadata.source`）。
3. 上游 description 面向 Codex 写（"Works with Codex"），未做跨 harness 判别化；本 skill 的 description 已改为按**触发场景**判别。
