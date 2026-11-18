# 名称核对

2026-08-14 读取 `cursor/plugins` 的 `pstack/README.md` 与 `plugin.json`。插件版本是 0.15.36。这里只解决影片转写和仓库名称不一致的问题，不复制 README。

## README 中的名称

Cursor 里可以直接用下表名称。Claude Code 会加插件前缀：`/poteto-mode` 是 `/pstack:poteto-mode`，其他名称由适配层映射。

| 名称 | 用途 |
|---|---|
| `/setup-pstack` | 检测可用模型并分配角色 |
| `/poteto-mode` | 日常总入口；README 列出 23 本 playbook |
| `/how` | 系统现在怎么运作 |
| `/why` | 当初为什么这样设计 |
| `/sharpen` | 把原提示做深，不扩大任务 |
| `/architect` | 先定调用方式、类型和模块形状 |
| `/arena` | 同一题并行多做，再取各版优点 |
| `/tdd` | 修缺陷且本地测试便宜时，先写会失败的测试 |
| `/create-verification-skill` | 项目还没有验收技能时，生成带功能图的本地技能 |
| `/maintain-verification-skill` | 验收技能已经偏离产品时，做一次有证据的修正 |
| `/blast-radius` | 看起来很小的改动也可能波及别处；用运行结果证明为什么安全 |
| `/interrogate` | 不同模型拆同一份 diff，只保留能复现的发现 |
| `/swarm` | 不同切片上的多个工作者，最后汇总；不是同一份 diff 的交叉审查 |
| `/show-me-your-work` | 留下可复查的决策记录 |
| `/correct` | 把反复错误修到架构、自动检查、测试，文档最后 |

## 影片里听错、不要照写的说法

| 转写误听 | 实际 |
|---|---|
| P-STACK、Potato Mode | pstack、poteto-mode |
| 房贷架构 | 防呆架构 |
| Mac Pocock、GrillMe | Matt Pocock、grill-me |
| Shoppen | sharpen |
| 比稿 | `/arena`，画面字幕写“比稿” |
| 工地主任 | 讲者比喻，不是产品名称 |

## 数量的口径

README 明确列出 23 本 playbook、24 条原则 skill，以及技能表里的 34 个其他 skill。34 + 24 = 58，所以影片“将近 60”和这份 README 一致。仓库后续新增或改名时，以目录实数为准。

官方仓库：<https://github.com/cursor/plugins/tree/main/pstack>

讲者非良237的拆解：B 站 BV12D4E6NEMn，简介指向 YouTube `l_xDqUm0MDQ`。
