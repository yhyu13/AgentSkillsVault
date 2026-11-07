# 3D 场景生成管线的可安装 skill / MCP 清单（2026-11-07）

> 类型：调研报告（**不可安装**，不进 manifest）
> 机器：Windows / PowerShell <u>5.1</u> / Blender <u>5.2.2 LTS</u> / DeepSeek Harness <u>0.2.1-rc.5</u>
> 结论先行：本机 **不需要** 再装第二个 Blender addon；上游 `mcp-for-blender` 与已装的 DSH Blender Bridge addon 线协议互通，一个 addon 可同时喂给 DSH 和任意 MCP 客户端。
> 本文只报「装什么」与「哪些坑已经踩实」，**不改任何 skill**；可复用经验已按 vault 规则追加到 `SKILL_CANDIDATES.md`。

---

## 一、本机实测基线

| # | 事实 | 实测证据 | 状态 |
| --- | --- | --- | --- |
| 1 | Blender <u>5.2.2 LTS</u> 已安装 | `C:\Program Files\Blender Foundation\Blender 5.2\blender.exe` | 已验证 |
| 2 | DSH Blender Plugin <u>2.1.0</u> 已装进 profile | `package.json` 的 `dependencies` + `dsh.profile.bundles` 均含 `@dsh-external/dsh-blender-plugin` | 已验证 |
| 3 | DSH Blender Bridge addon 已装且已在 prefs 持久化启用 | `%APPDATA%\Blender Foundation\Blender\5.2\scripts\addons\dsh_blender_bridge.py`（<u>257,340 bytes</u>）；`ENABLED_ADDONS` 含 `dsh_blender_bridge` | 已验证 |
| 4 | 后端在跑 | `127.0.0.1:9877` ← `DeepSeek Harness`；`127.0.0.1:9876` ← `blender` | 已验证 |
| 5 | 插件自带的唯一验收判据通过 | `/doctor` → `kind=ok`（TCP + ping + bpy 往返全通；ping <u>53 ms</u>；往返 <u>97 ms</u>；calls <u>6</u> / errors <u>0</u>）；`/host/ready` → `ready:true`；<u>28</u> families / <u>186</u> ops | 已验证 |
| 6 | 上游 MCP server 与该 addon 协议互通 | `uvx mcp-for-blender`（PyPI <u>2.2.7</u> / serverInfo <u>1.30.0</u>）跑完 `initialize` → `tools/list`（<u>9</u> 个）→ `tools/call get_scene_info`，返回 Cube / Light / Camera | 已验证 |
| 7 | Unreal / Godot / Unity **均未安装** | `C:\Program Files\Epic Games` 下只有 `Cyberpunk2077` | 已验证 |
| 8 | DSH CLI 位置 | `C:\Users\yuhang\AppData\Local\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd` | 已验证 |

### 本轮推翻的两个旧结论

- 「Blender <u>5.2</u> 用户扩展目录只有 `.cache` ⇒ addon 没装」→ *查错目录*。legacy 单文件 addon 在 `scripts\addons\`，`extensions\` 只管 extension zip 包。
- 「<u>9876</u> 端口被 DSH bridge 独占，是硬约束」→ *不成立*。`dshbb_port` / `addonPort` / `BLENDER_PORT` 三处都可改。

---

## 二、可安装清单

### A 层 · 已装且已验证（不要再动）

| 项 | 来源 / 版本 | 维护状态 | 本机可验证性 | 建议 |
| --- | --- | --- | --- | --- |
| DSH Blender Plugin | `@dsh-external/dsh-blender-plugin` <u>2.1.0</u> | 活跃 | `/doctor` → `kind=ok` | 保持现状 |
| DSH Blender Bridge addon | 插件自带 `addon/dsh_blender_bridge.py` | 随插件 | `ENABLED_ADDONS` 命中 | 保持现状 |
| mcp-for-blender（MCP server） | PyPI <u>2.2.7</u> / serverInfo <u>1.30.0</u> | `ahujasid/mcp-for-blender` <u>33,484★</u>，推送 <u>2026-11-04</u> | MCP stdio 全链路跑通 | 推荐，已装 |
| vault 内 3D skill 家族 | `ai-3d-scene-pipeline` / `ai-3d-character-pipeline` / `blender-game-assets-v2` / `procedural-3d-scenes` / `three-procedural-scenes` / `three-clay-scenes` | 见 `INSTRUCTION.md` | skill 可召回 | 推荐，已装 |

### B 层 · 建议装（缺 API key，装配置可验、生成不可验）

| 项 | 来源 | 维护状态 | 依赖 | 建议 |
| --- | --- | --- | --- | --- |
| Meshy MCP server | `meshy-dev/meshy-mcp-server` <u>91★</u>，推送 <u>2026-11-05</u> | 活跃、官方 | `MESHY_API_KEY` | 建议装 |
| Tripo Python SDK | `Tripo-Developer/tripo-python-sdk` <u>61★</u>，推送 <u>2026-10-14</u> | 活跃、官方 | `TRIPO_API_KEY` | 建议装（比 MCP 包少一层） |

### C 层 · 条件装（缺宿主软件或 key，本机无法验证）

| 项 | 来源 | 维护状态 | 缺什么 |
| --- | --- | --- | --- |
| Unreal MCP | `ChiR24/Unreal_mcp` <u>1,021★</u>，推送 <u>2026-11-06</u> | 活跃 | Unreal Engine |
| UnrealGenAISupport | `prajwalshettydev/UnrealGenAISupport` <u>682★</u>，推送 <u>2026-04-28</u> | 活跃 | UE 插件；它把 Meshy / Tripo / Hunyuan3D / Rodin 一起接进 UE |
| godot-mcp | `Coding-Solo/godot-mcp` <u>6,547★</u>，推送 <u>2026-04-16</u> | 活跃 | Godot |
| DCC-MCP ComfyUI 适配器 | `dcc-mcp/dcc-mcp-comfyui` <u>1★</u>，推送 <u>2026-10-25</u> | 早期 | ComfyUI |
| World Labs Marble + World API | 官方 | 商业 | API 额度；App / API 是**两个独立钱包** |

### D 层 · 明确不装

| 项 | 理由 |
| --- | --- |
| `Tripo-Developer/tripo-mcp` | 推送停在 <u>2025-04-14</u>（<u>19 个月</u>未更新）；Tripo / Hunyuan3D / Rodin / Meshy 接法已内置在 DSH addon 的 `generate_3d` / `import_generated_asset*` 里 |
| Blender 官方 Lab MCP addon | 线协议与现 addon 不同源；装它要停掉现在 `kind=ok` 的通道 |
| Unity 系 MCP | 引擎偏好降权（UE + Godot 优先） |
| 单点 3D 材质 / 镜头 skill（wood / metal / cloth / paper / sky-rays / orbit-inspect…） | 只解决「表面质感」「单个镜头」层，进不了数据驱动 PCG 管线；候选 #45 的 R/A/E 评分里 A 分 ≤ <u>1</u> |

---

## 三、可复用的操作要点（与本 vault 现有 skill 直接相关）

- **Blender addon 的真实落点**：`%APPDATA%\Blender Foundation\Blender\<ver>\scripts\addons\`。判定「装没装」看这个目录 + `bpy.context.preferences.addons`，**不要**看 `extensions\`。探针脚本见工作区 `tools/probe_blender_legacy_addon.py`。
- **一个 addon 够了**。上游 `mcp-for-blender` 的线格式是 `{"type": "<cmd>", "params": {...}}`；DSH addon 回 `{"status": "success", "result": {...}}`；上游 `server.py:242` 只把 `status == "error"` 判为失败，所以 `success` 被正常接受。探针脚本见 `tools/probe_blender_bridge_socket.py` 与 `tools/probe_mcp_stdio.py`。
- **MCP server 的 command 用绝对路径**（`C:\Users\yuhang\miniconda3\Scripts\uvx.exe`）：GUI 启动的 MCP client 不继承终端 PATH，否则 `spawn uvx ENOENT`。
- **GitHub 可达性是时段性的**：本轮同一小时内 `raw.githubusercontent.com` 直连曾 <u>30 秒</u>超时、随后直连与带代理双双 <u>200</u>。任何「代理坏了 / 直连坏了」的结论都必须现场双测，不能复用历史。

---

## 四、未验证项（显式标注）

| 项 | 未验证原因 |
| --- | --- |
| Meshy MCP / Tripo SDK 的端到端生成 | 缺 `MESHY_API_KEY` / `TRIPO_API_KEY` |
| Unreal / Godot 侧任何 MCP | 宿主软件未安装 |
| Blender 官方 Lab addon 的实际可用性 | 需替换现有 addon，与当前已验证状态冲突，未做破坏性验证 |
| World Labs Marble + World API | 商业额度，且 App / API 双钱包成本未评估 |

---

表格总结：

| 选项 | 代价 | 影响 | ROI |
| --- | --- | --- | --- |
| 我1（已执行）：只注册 `blender` MCP server | 约 <u>10 分钟</u>，零下载 | MCode 与 DSH 共用一个 Blender，<u>9</u> 个工具即刻可用 | 高：复用已验证通道，回收周期为<立即> |
| 我2（已执行）：结论进 `SKILL_CANDIDATES.md` 候选 <u>#56–#59</u> | 一次 PR，不改 skill | 下一位不重踩「查错目录」「必须装第二个 addon」 | 高：省一次重复调研，回收周期为<下次同类任务> |
| 你1：再装 Meshy MCP + Tripo SDK | 两个 API key + 配置 | 贴图 / 重拓扑多一个来源，生成仍无法本机验证 | 中：投入约<两小时>，回收周期为<取决于是否真用> |
| 你2：先装 UE <u>5.8</u> 再上 Unreal MCP | UE 安装体量最大 | 引擎侧管线才真正开始可验证 | 低（本阶段）：投入以<数十 GB>计，回收周期为<不可估算> |

> 免责声明：本输出由 AI 辅助生成，仅用于信息整理与研究参考，不构成专业意见或决策依据。
