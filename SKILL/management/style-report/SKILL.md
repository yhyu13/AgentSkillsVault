---
name: style-report
description: "将报告适配六大公司汇报风格：阿里巴巴双轨制（KPI+价值观）、Amazon 叙事/LP、字节 OKR、Google OKR+GRAD、Microsoft Connects/Model-Coach-Care、腾讯产品指标。继承 manage-up-core 五大原则。Use when writing reports in a specific company style — 阿里/亚马逊/字节/谷歌/微软/腾讯风格周报、述职、绩效、Connects。"
version: 1.0.0
metadata:
  category: management
  created_by: agent
---

# 公司风格汇报 (Company-Style Reporting)

继承 `manage-up-core` 五大原则。按公司把报告套进对应汇报文化：业绩/价值观、叙事/LP、OKR、Connects、产品指标。6 个风格共享同一骨架（触发场景 → 必填输入 → 报告模板 → 反空话规则 → 质量检查），只有每家公司的模板、术语、反空话表和检查清单不同。

## 选择风格

按公司/背景/触发词选 `style:`，读对应 reference：

| style | 公司 | 核心 | 触发词 | 文件 |
|---|---|---|---|---|
| alibaba | 阿里巴巴 | KPI + 价值观双轨 | 阿里/六脉神剑/双轨制/价值观考核 | `references/alibaba.md` |
| amazon | Amazon | 叙事 + LP 行为证据 | Amazon/LP/6-pager/Forte | `references/amazon.md` |
| bytedance | 字节跳动 | OKR 高透明度 | 字节/飞书OKR/OKR周报 | `references/bytedance.md` |
| google | Google | OKR + GRAD 0-1.0 | Google/GRAD/Google OKR | `references/google.md` |
| microsoft | Microsoft | Connects + growth mindset | 微软/Connects/Model-Coach-Care | `references/microsoft.md` |
| tencent | 腾讯 | 产品指标 + 环比 | 腾讯/数据先说/产品指标 | `references/tencent.md` |

## 工作流

1. 确认公司风格（从触发词或用户背景）。
2. 读 `references/<style>.md`，按其中「必填输入」向用户收集信息（没有的信息跳过，不编造数据）。
3. 套用其中的「报告模板」成文（完整示例见 `references/<style>-examples.md`）。
4. 过其中的「反空话规则」和「质量检查」。

## 共享原则（所有风格通用）

- **结论先行**：一句话说清核心结论/风险。
- **数据说话**：数字带前后值（从 X 到 Y，±Z%），禁止「表现良好/持续推进」这类空话。
- **事实证据**：价值观/LP/OKR 都要落到具体场景-选择-结果，不喊口号。
- **不编造**：数据只来自用户提供，缺则跳过。
