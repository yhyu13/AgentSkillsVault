# 模型与档位映射

这是建议表，不是硬依赖。宿主能选模型就按表选，不能选就用宿主默认，并把实际情况写进 `.pstack/host.md` 和 `result.md`。不要传宿主不认识的模型 slug。

## 一、角色表

| 角色 | 上游建议 | 档位 | 用途 | 宿主不可用时的回退 |
|---|---|---|---|---|
| orchestrator | 宿主默认 | high | 主线程：复述目标、选 playbook、维护 todo、汇总证据 | 宿主默认 |
| code-delegate | opus 5.5 | xhigh | 写代码、重构、修 bug | 同族可用模型，再退宿主默认 |
| judgment-and-prose | opus 5.5 | xhigh | 判断、设计、文档、PR 描述 | 同族可用模型，再退宿主默认 |
| review-panel-a | fable 5.2 | high | 评审面板第一席 | 同族或宿主默认 |
| review-panel-b | opus 5.5 | xhigh | 评审面板第二席 | 同族或宿主默认 |
| review-panel-c | gemini 4 neon | high | 评审面板第三席，跨供应商 | 宿主可用的另一家模型 |
| verification-worker | opus 5.5 | high | 跑验证、采集证据 | 同族或宿主默认 |
| cheap-worker | opus 5.5 | high | 机械编辑、批量小改 | 更便宜的可用模型 |

上游原文的默认值是 opus 5.5 xhigh 用于代码、文字和判断，评审面板为 fable 5.2 / opus 5.5 / gemini 4 neon。这里保留为参考，不要求你的宿主有这些模型。

## 二、档位规则

- 默认从角色的档位开始。
- 最难或最微妙的工作升一档，最高到 xhigh。
- 判断类工作降一档。
- 例行工作降两档或更多。
- 任何角色不超过 xhigh。
- 验证始终用验证角色的档位，不要用最便宜的档位省成本。
- 评审面板各席保持各自档位，不要为了统一而拉平。

## 三、回退顺序

宿主拒绝某个模型或档位时，按这个顺序退：

1. 角色表里的首选。
2. 角色表里的回退。
3. 同族最接近的可用模型。
4. 宿主默认模型，省略 `model` 参数。
5. 如果仍然失败，写 `blocked.md`，不要反复传同一个 slug。

每次回退都写一行说明：原模型、实际模型、原因。写在 `host.md` 或 `result.md`。

## 四、宿主覆盖

在项目里建 `.pstack/models.md`，只写覆盖项：

```markdown
# Local model overrides

- code-delegate: <available-model> / <effort>
- judgment-and-prose: <available-model> / <effort>
- review-panel-a: <available-model> / <effort>
- review-panel-b: <available-model> / <effort>
- review-panel-c: <available-model> / <effort>
- verification-worker: <available-model> / <effort>
- cheap-worker: <available-model> / <effort>
```

没有写的角色用本文件的默认值。宿主完全不能选模型时，整个文件可以留空，但要在 `host.md` 写 `can_select_model: no`。

## 五、Cindy 场景

Cindy 的模型由宿主和会话配置决定，技能本身不应该假设某个 slug。做法是：

- 读 `.pstack/models.md` 的覆盖项。
- 读不到就用宿主当前模型。
- 在 `result.md` 写“模型由宿主决定，实际为 X”。
- 不要为了匹配上游而要求用户切换模型。

## 六、评审面板

评审面板的目的是降低同源偏差。至少两席，最好三席，且至少一席来自不同模型家族。宿主只有一个模型时：

- 用同一模型跑两次独立评审，第二次用不同的提示词和只读上下文。
- 在 `result.md` 标明“同源评审，偏差未消除”。
- 高风险任务仍然要求人工 Reviewer。

## 七、验收

模型映射是否可用，看三件事：

1. 没有某个上游模型时，任务仍能跑完。
2. 每次回退都有记录。
3. `result.md` 能说清实际用了什么模型和档位。
