<h1 align="center">说人话：中文 AI 味清理 skill</h1>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/banner-dark.svg">
    <img src="assets/banner-light.svg" alt="说人话：中文 AI 味清理 skill — 先保信息，再谈风格" width="100%">
  </picture>
</p>

<p align="center">
  <strong>别让模型替你装腔。</strong>
</p>

<p align="center">
  <a href="https://github.com/MrGeDiao/shuorenhua/stargazers"><img src="https://img.shields.io/github/stars/MrGeDiao/shuorenhua?style=for-the-badge&amp;label=stars" alt="GitHub stars"></a>
  <a href="https://github.com/MrGeDiao/shuorenhua/releases"><img src="https://img.shields.io/github/v/release/MrGeDiao/shuorenhua?style=for-the-badge&amp;label=release" alt="GitHub release"></a>
  <a href="evals/benchmark.md"><img src="https://img.shields.io/badge/benchmark-111%20cases-2563eb?style=for-the-badge" alt="Benchmark: 111 cases"></a>
  <a href="evals/real-samples.md"><img src="https://img.shields.io/badge/scenario%20samples-20-16a34a?style=for-the-badge" alt="Scenario samples: 20"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/MrGeDiao/shuorenhua?style=for-the-badge" alt="License"></a>
</p>

<p align="center">
  <a href="#30-秒上手">30 秒上手</a> ·
  <a href="#先看一眼效果">效果</a> ·
  <a href="#保真合同">保真合同</a> ·
  <a href="#怎么判断怎么改">怎么改</a> ·
  <a href="#评测">评测</a> ·
  <a href="#安装">安装</a> ·
  <a href="#常见问题">FAQ</a>
</p>

`说人话` 是一个中文优先的 rewrite skill，清理聊天、进度同步、README、release note、论坛帖、issue 回复和中文长文里的模板感、表演感、工程师腔、翻译腔和无源权威铺垫。给经常用 AI 起草中文的开发者、维护者和写作者用。

改语气之前先保护事实：数字、版本、命令、路径、责任归属和原文已有的关系不动。Codex、Claude Code、Cursor、ChatGPT 和自建 agent 都能接入。

## 30 秒上手

**先试效果，不安装** — 打开[说人话 GPT](https://chatgpt.com/g/g-6a5829b1163481919e1e45851f6bc709-shuo-ren-hua)（ChatGPT，需 Plus / Pro），贴一段文本就能用。

**Claude Code** — 在对话里运行：

```text
/plugin marketplace add MrGeDiao/shuorenhua
/plugin install shuorenhua@shuorenhua
```

装好后直接说「把这段去 AI 味」。手动安装和跟随更新见 [install/claude-code.md](install/claude-code.md)。

**Codex** — clone 后单次使用：

```bash
git clone https://github.com/MrGeDiao/shuorenhua.git && cd shuorenhua
codex exec -C . "读取 ./SKILL.md，按其中规则改写以下文本：……"
```

**其他支持 `skills` 命令的 agent**：

```bash
npx skills add MrGeDiao/shuorenhua
```

只想看问题、不想直接改稿，就加一句「按 annotation mode 只标注不改写」。Cursor、OpenClaw、自建 agent 和更多安装方式见[安装](#安装)。

## 先看一眼效果

**改写前**

> 本次优化在性能方面取得了显著成效，有效改善了接口响应问题，p95 延迟从 480ms 降到 160ms，充分体现了团队持续优化的能力。

**只删套话，容易改坏**

> 这次优化明显降低了接口延迟。

第二版看着短了，`p95`、`480ms` 和 `160ms` 也没了。

**按说人话规则改**

> 这次优化把接口 p95 延迟从 480ms 降到 160ms。

该删的是渲染词，不是证据。这条对应评测集里的硬约束用例 [SF-46](evals/benchmark.md)。更多对照见 [references/examples.md](references/examples.md) 和 [evals/real-samples.md](evals/real-samples.md)。

## 保真合同

去 AI 味最常翻车的地方：句子顺了，事实变了。这里把不能动的部分写成可检查的规则：

- 数字和它修饰的对象一起保留：`p95 从 480ms 降到 160ms` 不能概括成「明显降低」。
- 关系不改写：`展示了云原生架构的潜力` 不能变成 `采用了云原生架构`，潜力不等于已经实现。
- 范围、条件、否定、情态、完成态、方向和强度都算事实，不随姿态一起删。
- 抽象信息不擅自具体化：原文只说「提升效率」，不能补成「省时间」或「降成本」。
- 缺信息就指出缺口，不补。`docs / status` 里的无源结论默认按 `audit-only` 处理。

回读走两个方向：输入里的事实能否在输出逐项找回；输出里的每个新关系能否回指输入依据。规则细节见 [references/protected-spans.md](references/protected-spans.md) 和 [references/positive-style.md](references/positive-style.md)。

## 怎么判断怎么改

不靠词语替换表硬洗全文。处理顺序固定：判主场景（`chat / status / docs / public-writing`）→ 划出数字、版本、命令、引用、责任主体和事实关系 → 判命中强度（`Tier 1 / 2 / 3`）和改写力度 → 先处理句式与段落模式，短语表只兜底 → 保真回读 → 仍有残留再做一次轻量 Residual Audit。

常见处理如下：

| 识别信号 | 默认动作 | 例 |
|------|------|------|
| 开场套话、总结提示 | 删掉提示层，直接回答 | `好问题！让我来解释` → 直接说答案 |
| 商业黑话、价值拔高 | 还原成普通动作；没有信息就删 | `赋能开发者` → 说清具体帮了什么 |
| 工程师姿态腔 | 按宾语判断，换回实际动作 | `把结论落盘` → `把结论写进文档` |
| 过度承接、心理判断 | 删掉发奖状和替人下结论 | `你不是敏感，你只是……` → 回应具体内容 |
| 翻译腔、句子过满 | 缩短主语和动作，保留术语 | `基于……通过……来……` → 直接说动作 |
| 名词化、同义词躲避 | 换回动词，同一对象保持同一叫法 | `进行了优化` → `改了` |
| 无源权威 | `chat / public-writing` 删除不能独立成立的论断；`docs / status` 标缺来源 | 不把裸 `40%` 留成事实 |

完整边界在 [references/](references/)，用例在 [evals/benchmark.md](evals/benchmark.md)。

### 按文本用途分场景

README、release note、论坛帖、issue 回复、API reference 和 FAQ 会进入各自的 Scene Pack：

| Scene Pack | 处理重点 |
|------------|----------|
| README | 第一屏说清是什么、给谁用、解决什么问题 |
| release note | 列变更、验证和限制，不写发版宣言 |
| forum post | 保留维护者的经历、判断和社区语气 |
| issue reply | 先说能否复现、当前判断和下一步 |
| API reference | 保护 endpoint、method、字段、状态码、约束和恢复动作 |
| FAQ | 先回答，再写条件、步骤和限制；不扩大承诺 |

细则和正反例见 [references/scene-packs.md](references/scene-packs.md)。

### 长文不缩水：三档 scope

长文里有些重复和转场看着不够利落，却承担节奏。scope 单独决定能删到什么程度：

| scope | 删整句吗 | 适用 |
|-------|----------|------|
| `structural` | 可以删、并、重排 | 短文，或明确要求重写 |
| `bounded`（长文默认） | 整句空话进「建议删除（待确认）」清单 | `public-writing` 长文 |
| `in-place` | 不删整句，只做句内降调 | 明确要求保留原文结构和节奏 |

三档的取舍过程见 [issue #4](https://github.com/MrGeDiao/shuorenhua/issues/4)，实跑记录见 [evals/results-v1.8.6.md](evals/results-v1.8.6.md) 和 [evals/run-manifest.md](evals/run-manifest.md)。

## v2.3.1 状态

v2.3.1 以 **Opus 单席位**口径收口（维护者 2026-08-21 决定）：r4 全量 Opus 侧硬约束失败 0、SNF 误杀 0/50、SF 通过 57/61，达发布门槛。DeepSeek V4 Pro 撤出正式席位（B-74 真实 L1 + 同条件复跑存在 run-to-run 方差）；Grok 4.6 换席补跑的改写与硬判干净，判分仅闭环 1/7 批，记为辅助证据，第二正式席位补跑留给后续版本。HUMAN direct 样本仍缺 `docs` 和 `status`，`check_repo` 把它报为已知缺口（不阻塞 CI），收齐 12 篇后关闭。完整证据与口径见 [evals/results-v2.3.1.md](evals/results-v2.3.1.md)。

本版改动：

- 新增 [`dist/shuorenhua-mini.md`](dist/shuorenhua-mini.md)（1,500 字符以内、自包含），安装口径统一为 mini / lite / full 三档
- Scene Packs 增加 API reference 和 FAQ；benchmark 从 103 条扩到 111 条（61 SF + 50 SNF）
- 保真回读改为按子句与事实要素建账，输出前做双向核对
- 新增 8 篇 HUMAN 长文 residual 对照，含固定 revision、归属、许可证据和 manifest 校验
- 修复 `references/structures.md` §20 破折号密度判据的计数单位矛盾，统一按插入处计数

## 评测

规则层覆盖 210+ 条中文短语、96 条英文短语和 25 类结构反模式。

当前评测集共 111 条：

| 类型 | 数量 | 目标 |
|------|------|------|
| SF | 61 | 应该改的文本要命中并处理主要问题 |
| SNF | 50 | 本来正常的文本应放行或只做轻提示 |
| 场景样本 | 20 | 整段样本按自然、保真、可直接发评分，长文另看长度节奏 |

这几个数字的关系：111 条是主 benchmark；20 条场景样本是另一套整段评测，不和 111 相加。主 benchmark 里包含 16 条 Scene Pack 正反用例、4 条 Long-form In-place 和 3 条 Bounded 用例。

另有 8 篇 HUMAN 长文 residual 对照：3 篇历史文本、5 篇现代公开文本，6 篇中文原作、2 篇英译中，共 7 个作者组。它们只用于观察假阳性，不进入 benchmark、rewrite 或 judge 分母，也不据此设置「人味」阈值。语料正文及改编沿用各自许可，不适用仓库根目录的 MIT。

发布门槛从 v2.1.0 起分四层：

| 层 | 检查什么 | 是否阻塞发布 |
|----|----------|--------------|
| L1 硬约束 | 编造事实、保护片段漂移、责任归属改变、scope 越界 | 是，失败必须为 0 |
| SNF 误杀 | 不该改的文本被改了 | 是，误杀率须低于 10% |
| L2 风格目标 | 明显套路有没有清干净 | 各模型单独报告趋势 |
| L3 风格观察 | 合格编辑可能合理分歧的写法 | 否，只记录 |

被测模型只看匿名、乱序、不含预期答案的 [evals/benchmark-blind.md](evals/benchmark-blind.md)，judge 再按映射表判分。运行模型、评测集版本和结果登记在 [evals/run-manifest.md](evals/run-manifest.md)。零依赖脚本 `python3 automation/eval/hard_metrics.py --run <批次目录>/` 负责字数留存、破折号密度和 protected spans 粗核，细节见 [automation/eval/README.md](automation/eval/README.md)。

最新 release-ready 证据是 [v2.3.1 的评测记录](evals/results-v2.3.1.md)（Opus 单席位口径）。

## 安装

| 平台 | 文档 |
|------|------|
| Codex | [install/codex.md](install/codex.md) |
| Claude Code | [install/claude-code.md](install/claude-code.md) |
| Cursor / Windsurf | [install/cursor.md](install/cursor.md) |
| OpenClaw | [install/openclaw.md](install/openclaw.md) |
| ChatGPT / Custom GPT | [install/chatgpt.md](install/chatgpt.md) |

三档入口按使用场景选：

| 入口 | 内容 | 适用 |
|------|------|------|
| mini | [`dist/shuorenhua-mini.md`](dist/shuorenhua-mini.md)，1,500 字符以内、自包含 | 单次会话、Custom Instructions、上下文较紧 |
| lite | `SKILL.md` | 临时改写和轻量审稿 |
| full | `SKILL.md + references/` | 长期项目、公开文本、技术文档和误杀防护 |

Claude Code plugin 自带 full。其他平台的复制方式、软链更新和触发配置见上面的安装文档。

项目内长期使用时，可以在 `AGENTS.md` 加一段触发规则：

```markdown
## 写作风格
当任务涉及「去 AI 味」「说人话」「自然一点」「别像模板」这类改写时，遵循 `shuorenhua/SKILL.md`。
对外文本优先按它处理；代码、日志、配置和命令输出不套这个 skill。
```

## English

**shuorenhua (说人话)** is a Chinese-first rewrite skill for Codex, Claude Code, Cursor, ChatGPT, and custom agents. It removes common AI writing patterns in Chinese while protecting numbers, commands, attribution, conditions, and factual relations. The repo includes a 111-case benchmark, false-positive guards, scene-specific rules, and long-form scopes. The latest release is `v2.3.1`.

Claude Code: `/plugin marketplace add MrGeDiao/shuorenhua`, then `/plugin install shuorenhua@shuorenhua`. Other agents: `npx skills add MrGeDiao/shuorenhua`. More guides: [install/](install/).

<sub>关键词 / keywords：中文 AI 写作、中文 humanizer、去 AI 味、AI writing humanizer、Chinese writing style</sub>

## 常见问题

### 这是拿来骗 AI 检测器的吗？

不是。它处理的是模板感、表演感和语域漂移，不承诺绕过检测器。

### 英文能不能用？

可以，但项目以中文为主。英文规则主要处理常见英文套话和中英混写里的模板感。

### 为什么改完有时还是有 AI 味？

清掉通用套路，不等于写出某个具体作者的个人风格。这个项目目前不做长期 voice 拟合。

### 会不会改坏技术文档？

`docs`、`status` 和 `code-context` 采用更保守的规则，命令、路径、版本、报错和指标优先保护。评测无法覆盖所有文本；遇到误杀，请提交脱敏后的 bad case。

## 贡献：bad case 比 star 有用

欢迎提交新的评测样本、边界案例、改写前后对照和误杀案例。

可以使用 [bad case 模板](.github/ISSUE_TEMPLATE/bad-case.md)，也可以贴到[征集 issue](https://github.com/MrGeDiao/shuorenhua/issues/5)。提交前请脱敏，不要附上未授权私聊全文、密钥、内部链接或真实个人身份信息。

加新词之前，先判断它是新模式，还是现有模式的另一种说法。贡献规则见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 相关项目

- [stop-slop](https://github.com/hardikpandya/stop-slop)：英文 AI slop 规则和评分框架
- [humanizer](https://github.com/blader/humanizer)：英文 AI 模式分类
- [avoid-ai-writing](https://github.com/conorbronsdon/avoid-ai-writing)：AI 写作问题分类和严重度参考
- [speak-human-tw](https://github.com/Raymondhou0917/speak-human-tw)：繁体中文去 AI 味，覆盖电子报、社群贴文、销售页和客服信

## Star 增长

[![「说人话」star 增长曲线](https://raw.githubusercontent.com/MrGeDiao/shuorenhua/star-data/star-growth.svg)](https://github.com/MrGeDiao/shuorenhua/stargazers)

## 许可

[MIT](LICENSE)
