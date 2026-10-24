---
name: ai-3d-toolchain
description: >-
  AI 3D 资产生产环境（Tripo + Blender + Unity）的搭建与自检：Blender CLI 无头脚本、
  Blender MCP（ahujasid/blender-mcp）、Tripo 官方 Blender 插件与 API、Auto-Rig Pro、
  Unity CLI + Unity MCP、Mixamo 动作库。Use when the user asks to set up or debug the
  toolchain for AI-driven 3D game assets（Blender 装不上 / MCP 装不上 / Unity 接管不了 /
  Tripo 出不了模型 / 绑骨蒙皮做不了），或要在 Windows 上跑 Blender/Unity 自动化。
metadata:
  category: game-dev
  version: 1.0.0
  origin: local (distilled)
  source:
    article: 'https://ooo.run/post/how-to-use-ai-build-3d-games.html'
    submodules:
      - 'vendor/blender-mcp → https://github.com/ahujasid/blender-mcp'
      - 'vendor/tripo-3d-for-blender → https://github.com/Tripo-Developer/tripo-3d-for-blender'
      - 'vendor/unity-mcp → https://github.com/CoplayDev/unity-mcp'
      - 'vendor/tripo-skills → https://github.com/meterlong/tripo-skills'
---

# AI 3D 生产工具链：Tripo + Blender + Unity

## 何时调

- "用 AI 做 3D 游戏 / 3D 场景 / 3D 角色，需要先搭环境"
- "Blender 装不上 / MCP 装不上 / MCP 连不上 Blender"
- "AI 接管不了 Unity / Unity MCP 怎么装"
- "Tripo 出的模型没法在引擎里用 / 没有 API key"
- "自动绑骨蒙皮（Auto-Rig Pro）怎么用"

## 不适用

- 只做 2D / 网页小游戏（用 `single-file-html-game` / `phaser-gamedev`）
- 只做浏览器 3D 渲染（用 `three-pbr-workflow` / `procedural-3d-scenes`）
- 已装好环境、只想生产资产（直接走 `ai-3d-scene-pipeline` / `ai-3d-character-pipeline`）

## 零、先记住本仓库的物理事实

- 本仓库已经把四个上游仓库以 **git submodule** 挂在 `vendor/` 下，**不要重新 clone**：
  `vendor/blender-mcp`（MCP server + Blender 插件源码）、`vendor/tripo-3d-for-blender`
  （Tripo 官方 Blender 插件）、`vendor/unity-mcp`（MCP for Unity，MIT）、
  `vendor/tripo-skills`（Tripo API skill）。
- 上游 skill `tripo-3d-generation` 的实体在 `vendor/tripo-skills/SKILL.md`，用户级已装到
  `~/.claude/skills/tripo-3d-generation`。要重新分发，从 `vendor/tripo-skills` 取。

## 一、组件清单与判据

| 组件 | 装哪 | 判据 |
|---|---|---|
| Blender 本体 | 系统 | `blender --version` 有输出；CLI 走 `blender -b -P script.py`（无头） |
| Blender MCP | `vendor/blender-mcp` | MCP server 起得来；Blender 侧插件端点通 |
| Tripo 官方插件 | `vendor/tripo-3d-for-blender` | Blender 里出现 Tripo 面板；需要 Tripo API key |
| Tripo API skill | `vendor/tripo-skills` | `~/.claude/skills/tripo-3d-generation/SKILL.md` 存在 |
| Auto-Rig Pro | 付费插件 | Blender 里能跑 bind + skin；**没有它，角色链路要在 Blender 里手搓骨骼** |
| Unity | Unity 6.x | 官方 Unity MCP 走 `com.unity.ai.assistant` 包；或用 `vendor/unity-mcp`（MIT）装进 Package Manager |
| Mixamo | 网页 | 下载 `.fbx` 动作，用于重定向 |

## 二、Windows 上的三道墙（实测）

> 证据来自本机实测（Blender 5.2.2 + blender_mcp），不是推测。

1. **别照抄 `curl … | sh` 装 MCP。** `blender-mcp/install.sh` 头注释明写 "for macOS and
   Linux"；本机 `sh` MISSING、`bash` = `C:\Windows\system32\bash.exe`（WSL 桩），
   照抄会"成功"装进**另一个** `$HOME`。Windows 走 `install.ps1` 或 `uvx <pkg> setup`。
2. **GBK 控制台会让 Python CLI 崩在 emoji 上**，而且崩在"配置已经写完之后"：
   `UnicodeEncodeError: 'gbk' codec can't encode character '\u2713'`。
   设 `PYTHONIOENCODING=utf-8` + `PYTHONUTF8=1` 再跑。看到 traceback 先确认副作用是否已发生
   （同一次运行 `%APPDATA%\Code\User\mcp.json` 其实已写入）。
3. **Blender 5.x 启用 legacy 单文件插件**：prefs 恢复会报 `No module named '<addon>'`。
   正确姿势 = startup 脚本先 `sys.path.append(scripts/addons)` 再 `addon_utils.enable()`；
   startup 脚本**必须**有 `register()`；`importlib` 按路径加载会触发 reload 的
   `spec not found`；`--addons` 仅当次有效、不持久。

## 三、Blender 侧

```bash
# 无头脚本（AI 批量改模型的标准入口）
blender -b -P scripts/optimize_model.py -- --in a.glb --out b.glb
```

- 自动化里所有操作走 `bpy`，不要让 Agent 手动点 UI。
- 结构清理/重拓扑/导出格式在 Blender 做；生成在 Tripo 做；场景组装在 Blender+Unity 做。

## 四、Tripo 侧

- 注册与 API key：<https://studio.tripo3d.ai/>
- 两种用法：Blender 插件（人在环内点）或 API（Agent 全自动，见 `tripo-3d-generation` skill）。
- **静态场景道具**用高精度模型（H3.1），**角色**用 Smart Mesh P2.0（四边面拓扑，详见
  `ai-3d-character-pipeline`）。

## 五、Unity 侧

- 官方 MCP（Unity 6.3+ / AI Assistant 包）：<https://learn.unity.com/tutorial/get-started-with-unity-mcp>
- 第三方 MIT 版 MCP for Unity（本仓库 `vendor/unity-mcp`）：
  Package Manager → Add package from git URL →
  `https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity`
  然后 `Window → MCP for Unity → Configure All Detected Clients`。
- 引擎侧交付形态（WebGL / Android / PC）决定最后打包目标，先定再做。

## 六、验收的最小门槛

1. `blender --version` 有输出，`blender -b -P` 跑得通一个空脚本。
2. MCP 客户端里能看到 blender 工具列表，并且能取到当前场景信息。
3. Tripo 能出**一个**模型并导出 glb/fbx（不需要好看，只要链路通）。
4. Unity 项目里 MCP 能读场景层级 + 控制台日志。
5. Auto-Rig Pro 能对一个简单人偶跑完 bind + skin（若要角色链路）。

## 七、红线

- 不要在 Blender 里手点 UI 让 Agent"看着做"——改成脚本 + 多机位截图，产出可复现。
- 不要跳过"白模检查"直接贴图（拓扑不对时贴图会毁掉）。
- 不要在没有多机位截图的情况下宣称"场景还原完成"。
