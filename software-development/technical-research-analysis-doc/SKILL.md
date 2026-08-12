---
name: technical-research-analysis-doc
description: Write a technical research/analysis doc in the TorchLight 调研分析 format — background first, bold conclusion up front, factor tables (采集项/获取方式/是否已有), impact-chain analysis with file:line code references, mermaid flow/sequence diagrams, official-solution comparison, risks and milestones. Use when the user says "调研分析", "plan doc should look like <参考文档>", asks for a 影响分析 / 影响链条分析 / 方案对比 doc, or hands you a reference .md to imitate. Also use for UE pak/打包/热更/渲染 调研 tasks where you must read engine C++ sources (PakFileUtilities.cpp, IPlatformFilePak.cpp, AutomationTool .cs) and produce a plan.
version: 1.0.0
metadata:
  category: software-development
  created_by: agent
---

# Technical Research / Analysis Doc (调研分析文档)

> Format distilled from `MacOS升级影响recook和热更包体调研分析` (the house style at TorchLight) and applied to `S16 SubPak` pak-splitting research. The doc leads with a conclusion, proves it with factor tables and code traces, and ends with concrete milestones.

## When to use

- User asks for a **调研分析 / 影响分析 / 影响链条分析 / 方案对比** document.
- User provides a **reference doc** and says "plan doc should look like <path>" — imitate that structure.
- Research task that requires reading **engine / plugin C++ or C# sources** and turning findings into a plan (e.g. pak splitting, recook, hot-update, DDC, packaging).

## Output document structure (follow in order)

```markdown
# <标题>调研分析

# 背景
（问题陈述；引用对端讨论/需求原文为 blockquote；必要时贴图）
**结论：<加粗的一句话结论先行>**

---

# 影响 <X> 的因素
> 限定范围 blockquote（引擎版本/平台/链路）。

**从 <角度A> 角度（关注...）：**
|采集项|获取方式|是否已有|
|---|---|---|
|（列出影响该链路的每一个采集项/配置/代码位）|（获取方式：命令/解析日志/文件路径）|已有/无/需新增|

**从 <角度B> 角度（关注...）：**
|...|...|...|

---

# 影响链条分析

## <子主题1>
（结论句 → 代码证据 → file:line 引用 → 因果链）

## <子主题2>
...

---

# 整体流程
```mermaid
flowchart TD
<流程/架构图：模块 → 函数 → :行号 → 分叉/产出物，subgraph 分组>
```
（跨端交互另给 ```mermaid sequenceDiagram```）

## <关键计算/机制1>
（代码块 + 逐行解释；标出"唯一变量/影响点"）

## <关键计算/机制2>
...

---

# <官方/替代方案对比>
## 现状 vs 官方方案
（左旧右新；说明优化层次：直接原因 vs 根本原因）

|维度|方案 A（推荐）|方案 B|
|---|---|---|
|改动面|...|...|
|成本|...|...|

---

# 注意事项 / 风险与待确认 / 里程碑
（M1..Mn，每项带工时）
```

## Writing rules

1. **结论先行**：`# 背景` 之后紧跟 `**结论：...**`，一句话说清"能不能做、怎么做、代价是什么"。
2. **每条结论都要有代码锚点**：用 `文件路径:行号`（如 `PakFileUtilities.cpp:2371`）而非笼统描述；引用真实解析器/函数名（如 `GetPakchunkIndexFromPakFile`）。
3. **影响因素用表格**，列固定为 `采集项 | 获取方式 | 是否已有`；按"关注角度"分组（如 recook 环境 vs 规模；命名解析 vs 热更适配）。
4. **影响链条要分层**：先"直接原因"，再"根本原因"，引用代码逐步推导（如 DDC key → 字节码头字段 → OutputHash → uasset 序列化）。
5. **整体流程用 mermaid 图**（参考文档是 ASCII，但 markdown 渲染优先 mermaid）：
   - 流程/架构用 ```mermaid flowchart TD```，分流程用 subgraph 分组（如"打包流程 vs UnrealPak 分卷"）；
   - 跨端交互（下载/挂载/校验）用 ```mermaid sequenceDiagram```；
   - 节点内标注 `文件:行号` 与关键产出物；复杂机制用独立小节 + 代码块 + `// ← 唯一变量` 注释标出关键行。
   - 若用户明确要求 ASCII 图（或渲染环境不支持 mermaid），再用 ```Apex```/```text``` 块。
6. **方案对比要区分优化层次**：指出某方案是"从直接原因解决"还是"从根本原因解决"，并说明风险（如 DDC key 一致的打包机字节码可能不一致）。
7. **改动草案给出可落地的代码片段**（标注插入文件与位置，如"主流程插入 :6177 CreatePakFile 之前"），而非伪代码占位。
8. 当用户给了参考文档时，**先读参考文档**，提取其节标题、表格列、图表风格再套用。

## Research workflow for engine-source tasks

1. **定位真实源码**：用 glob/grep 找到目标文件（`PakFileUtilities.cpp`、`IPlatformFilePak.cpp`、`CopyBuildToStagingDirectory.Automation.cs`、插件 `.uplugin`），先看文件大小、再 grep 关键符号（`SubChunk|Split|MaxChunkSize|CreatePakFile|MountAllPakFiles|GetPakchunkIndexFromPakFile`）。
2. **核对关键机制**：挂载通配符（`ALL_PAKS_WILDCARD`）、文件名解析器（chunk 索引/base 版本/`_P.pak`）、挂载优先级（`GetPakOrderFromPakFilePath` + `Sort(TGreater)`）、索引/偏移字段类型（int64）。
3. **实测命名**：如用户给到解包目录（`UnrealPakViewer\Intermediate\cache\*`），列出真实 pak 文件名验证命名约定，再定子 pak 命名规则。
4. **影响面排查**：对每个新增产出物（子 pak 文件名），逐个过一遍现有解析器，确认兼容或列出需改点（用表格）。
5. **产出文档**：按上文结构写 markdown，代码片段可直接落盘到计划文档。

## Reference anchors

- 格式范本：`C:\Users\XINDONG\Downloads\MacOS升级影响recook和热更包体调研分析\MacOS升级影响recook和热更包体调研分析.md`
- S16 实例：`F:\XD\P4V\tl_yuhang_testugs\frontend\trunk\S16_subpak\Plan.md`
