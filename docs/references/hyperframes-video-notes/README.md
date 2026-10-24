# hyperframes-video — 退役前的笔记存档

`hyperframes-video` 这个 skill 已于 2026-10-25 从 vault 与全部用户级 skill store 中移除：
它只是 `hyperframes` + `hyperframes-cli` 的本地改写版（陈旧，错误声称 `media-use` 未安装——
实际上 `media-use` 已安装），重复内容会造成触发噪声。

移除前按审计要求保留了其中**只此一份**的实战笔记：

| 文件 | 内容 |
|---|---|
| `SKILL.md` | 原 skill 正文（含本机 HyperFrames 管线约定、Edge 渲染链、asset 纯文本红线） |
| `调研与安装.md` | HyperFrames 上游调研、Node/ffmpeg/Edge 环境实测、渲染耗时数据 |

其中值得保留的环境事实（已确认在本机仍适用）：

- `npx` 在 PowerShell 被执行策略拦，**必须用 `npx.cmd`**。
- 渲染超时后设 `HYPERFRAMES_RENDER_DETACHED=1` 改后台等日志，**不要 `pgrep -f`**（会匹配到自己）。
- 渲染必须核 `ffprobe` 时长 == 帧数 × `data-duration`。
- 浏览器层用本机 **Microsoft Edge**（`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`），
  不走 chrome-headless-shell——常规浏览器构建没有 `HeadlessExperimental.beginFrame`，
  引擎只有截图路径，无头 `--resolution` 放大到 4K 也不可用。
- 资产走**纯文本**：背景音乐 + 音效 + LUT → 二进制冲突（同 `AGENTS.md` §13.1）。
- `media-use` 已安装（16 文件 / 1.9 MB），功能重叠原因见 §7；`figma` 未装。

上游命令（`hyperframes` / `hyperframes-cli` 两个存活 skill 覆盖同一套 CLI）：

```powershell
npx.cmd hyperframes init <dir>
npx.cmd hyperframes lint
npx.cmd hyperframes check --json      # lint + runtime + layout + contrast，error 必须清零
npx.cmd hyperframes snapshot
npx.cmd hyperframes preview --background
npx.cmd hyperframes render --quality looks --output out.mp4
```
