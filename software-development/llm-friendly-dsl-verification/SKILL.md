---
name: llm-friendly-dsl-verification
description: Verify an LLM-friendly DSL end-to-end with evidence.
version: 1.0.0
metadata:
  category: software-development
  created_by: agent
---

# LLM-Friendly DSL Verification Loop

把一个「面 LLM 的 DSL / 目标语言」（配方 → 编译到原生运行时/引擎）从头证明到「LLM 能写对、能编译、能真跑、语义正确、写反能回喂修对」。
提炼自 gdsl 项目（Godot 引擎 GDExtension 配方语言，`doc_ai/GDSL_RETROSPECTIVE.md` + JOURNEY Era 1-27）。

## When to use

- 设计/实现「LLM 写配方而不是写程序」的 DSL（小语法、固定 ontology、确定性、reject-not-retry）。
- 语言会编译到原生运行时（GDExtension / native plugin / 引擎），需要真机验证而不是只验编译。
- 要证明「LLM 友好」——用数字（first-try rate / iterations-to-valid / 语义对错）而不是「应该很友好」。

## 为什么（核心信念）

- **可校验 > 可表达**：把「幻觉 → 运行时崩」提前成「编译错 → 改一下」(reject-not-retry)。
- **文本进 → native 出**：LLM 只见文本配方，本地/native 层不透明。
- **「it works」不是结果，baseline 数字才是**：LLM 友好必须能用第一次尝试成功率、迭代到有效数、语义正确率量化。

## 闭环（五层，每层有真验证）

```
1 编译(reject)   → DSL 编译器吐语法/类型/基类错，报错点名
2 真运行(playtest)→ 配方→native→真引擎/真运行时 加载+调方法+断言状态变
3 语义(golden)   → 对着「人类定义的正确值」断言，抓「写反」（compile-valid 但语义错）
4 回喂修复        → 把 golden 的 FAIL 喂回 LLM，看它能不能改对
5 场景集成        → 配方类型能在真场景实例化、互动、发信号、生命周期干净
```

### 关键：golden 不能循环论证

- **❌ 对着「配方自己写的 effect」断言**（读配方的 `-=1` 就断言 `-=1`）→ LLM 把 `-=1` 写成 `+=1` 照样 PASS（它在执行自己写的错 effect）。
- **✅ 对着「人类定义的期望值」断言**：`{setup: 字段=初值, call: 方法, expect: 字段=期望值}`。期望值来自 spec/用户，不是配方。
- 语义「对不对」是人的判断，不是 agent 的自洽——**期望值必须人参与/早参与**。

## 工具（一套可复用，按需裁）

| 工具 | 作用 |
|---|---|
| `gdslc`（编译器 CLI） | 配方 → C 源 / 场景 tscn |
| `llm_conv_bench.py` | LLM 冷测：语法+few-shot+任务 → 产出配方 → 编译器判有效 → first-try/iterations |
| `playtest.py` | 配方 → DLL → 真引擎跑 → 断言规则真的执行（新实例） |
| `golden.py` | 对着金标准断言（抓写反） |
| `semfix_loop.py` | 写反 → golden FAIL → 喂 LLM → 看它改对 |
| `scene_accept.py` | 配方 → tscn → 真场景加载 → 节点/类/状态/规则断言 |
| `scene_lifecycle.py` | 场景增删实体/玩到终点态 → 生命周期 + 游戏轨迹 |

（gdsl 实现在 `D:\GitRepo-My\godot\gdsl\toolchain\`，可作为样板。）

## LLM 冷测（measure LLM-friendliness）

- **冷测=公平**：LLM 只看「语法参考 + K 个 few-shot + 任务描述」，**禁工具**（`--allowedTools ''`），纯生成。这样测的是「语言本身 LLM 友不友好」，不是「LLM 擅不擅长扒源码」。
- **few-shot 来自真实示例**，不是编的；语法参考要自足（如 string 默认值要写明加引号），否则没示例会因「引号」而非「语言友好」失败。
- **判有效**：编译器（parse+typecheck）通过 = 有效。**别把「运行时正确」混进来**（那是 playtest 层）。
- **迭代**：失败时把编译器报错回喂，让 LLM 改；记 iterations-to-valid（1=首轮过）。
- **度量**：first-try rate / valid rate / mean iterations-to-valid / few-shot 敏感性（K=0 vs K=1）。

## 实施要点（来自踩过的坑）

### ABI / 语言墙（源码核实，不是猜）

- 真流程里经常撞「这个 ABI 没有 XX 函数」：**grep 引擎/API 的 interface/json 源码核实**，再决定绕过还是记录为已知限制。不要凭记忆假设，也不要假装能 engineering around。
- 例（Godot 4.7 GDExtension）：无 `variant_new_string_name`、无 `object_get_instance`、无 `string_destroy`/`string_name_destroy` → 有界泄漏记 AB 墙；实例绑定 `object_set/get_instance_binding` 是跨对象取回调唯一路径。

### 生成目标代码（脚本语言 / GDScript / 目标源码）——3 条铁律

1. **变量声明一次，循环/每场景赋值**（`var owner = null` 一次 + `owner = X.new()` per iter）——重复 `var` 声明 = 解析错 = autoload 不跑 = 引擎 240s 超时。**生成前静态扫一遍 `var` 重声明**。
2. **值当独立参数**，别用 `%` 内插进双引号字符串（内层引号没转义 = 解析错）；`print("FAIL", "X.y", "expected", "hero", "got", ...)`。
3. **字符串值要加引号**变字面量（`"hero"` 不是 `hero`，后者当标识符）。

### 真机/引擎运行

- **隔离项目 + 唯一类名**：Host 会自动加载项目根目录所有 native 插件/`.gdextension`，先加载者赢 → 类名冲突。用独立项目目录 + 唯一类名（如 `Hero` 避 `Player`）。
- **manifest 硬前提**：reloadable/native 标志（如 Godot `reloadable=true`）是热重载/实例追踪的前提——缺了关机清理不生效。
- 断言脚本用 `@tool` autoload + `Type.new()` → 调方法 → `print` + `get_tree().quit()`；退出后检查「ObjectDB leaked / 崩溃」做生命周期自检。

### Windows 工具调用

- **subprocess 拿 CLI 输出**：`text=True, encoding="utf-8", errors="replace"`——vcvars 横幅是 UTF-16/GBK 混合，不 replace 就 `UnicodeDecodeError` 且 stdout 变 None。
- **cl /LD（MSVC 从 Python）**：外包一个临时 `.ps1`（`cmd /c "`"$vcvars`" >nul 2>&1 && cl ..."`）；路径无空格时 cl 参数**裸写**（不要内层引号，否则 PS 在引号处截断 = `TerminatorExpectedAtEndOfString`）。唯一带引号的是 `"$vcvars"`。
- **调 claude/CLI 从 Python**：`PATH` 上的 `claude` 是 `.cmd` 垫片，subprocess(shell=False) 报 `[WinError 2]`——用 native exe 路径（`%APPDATA%\npm\node_modules\@anthropic-ai\claude-code\bin\claude.exe`）。
- **GFW push 重试**：连不上 github 443 是常态；用有界重试（`for i in 1..8; do git push && break; sleep 3; done`），**别把 push 管道接 `| tail`**（exit code 变 tail 的，假成功）。验证用 `git ls-remote` 对比 SHA。

### LLM 运行成本

- `claude -p` 每次 ~$0.20-0.21（base system prompt ~42K token 省不掉）。**先算总预算**（N 任务 × K × 迭代 × $0.21），复跑取均值才稳。
- 用 `--max-turns 1` + `--allowedTools ''`（纯生成）+ `--output-format json`（拿 `.result`/`.total_cost_usd`）。
- 模型可能不是你预期的（CLI 路由到你配置的 provider）——报告里如实写用了哪个模型。

### 自治（别让流程被问询打断）

- `approvals.mode`（Hermes）`manual`→`smart`/`off`，去掉 60s consent 拦阻；新会话生效。
- **lane 内、有合理默认 → 直接做完再报**，别用 `clarify` 停；只有真正需要人判断的（如 golden 语义）才问。
- 长任务用 `delegate_task`/后台+notify，别前台阻塞。

## 交付纪律

- **每层都用真证据**：真 LLM 跑的 first-try、真引擎跑的 playtest/scene——不是生成代码断言。
- **诚实分「已验 / 未验 / 未知」**：把「编译过」和「跑对了」分开，把「没测」直说；别把「cl /c 语法过」当「信号真的发了」。
- **过程落 JOURNEY + 失败反复的坑记下来**（下次对拍跳着走）。

## 参考实现

- gdsl（Godot 配方语言）：`D:\GitRepo-My\godot\gdsl\` + `doc_ai/GDSL_RETROSPECTIVE.md` + JOURNEY。
- 验收线示例：LLM 友好 = 16/16 first-try；语义 = 8/8 golden + 写反被抓 + LLM 修对；场景 = TC-1..8 + 声明式路径。
