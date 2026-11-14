# 飞书 CLI（lark-cli）安装与鉴权细节

版本基线：**1.0.100**（2026-11-14）。上游 `github.com/larksuite/cli`，
npm 包 `@larksuite/cli`。

## 安装

```bash
npm install -g @larksuite/cli      # 需要 Node；装完 lark-cli --version 验证
npx -y skills add https://open.feishu.cn --skill -y   # 24 个官方 Skill → $HOME/.agents/skills/lark-*
```

源码构建需要 Go ≥1.23 + Python 3，一般不需要。Skill 不是可选项：`lark-doc` 等业务
知识都在 Skill 里，CLI 自身 `--help` 只给命令骨架。

## 建应用（一次性）

```bash
lark-cli config init --new
```

- 阻塞式：打印 `https://open.feishu.cn/page/cli?user_code=...`，用户在浏览器里完成「一键建应用」。
- 成功后写 `appId`（形如 `cli_xxxx`）与 `brand: feishu|lark`；`appSecret` 存系统凭据。
- 在「Agent 工作区」（环境里有 `OPENCLAW_HOME` / `HERMES_HOME`）里默认拒绝执行，除非加
  `--force-init`。已有宿主应用时用 `lark-cli config bind`，不要另建一个。
- 非交互方式：`--app-id` + `--app-secret-stdin`（secret 走 stdin）。

## 登录（设备码）

```bash
lark-cli auth login --recommend          # 常用 scope 一把梭
lark-cli auth login --scope "a b c"      # 精确补权限
lark-cli auth login --no-wait --json     # 只拿 device_code + verification_url
lark-cli auth login --device-code <code> # 用户确认后收尾
lark-cli auth status
```

- 设备码 **10 分钟**过期，过期报 `20082`「授权请求已过期」→ 重新 `--no-wait --json` 生成，不要复用旧链接。
- 用户想扫码：`lark-cli auth qrcode "<verification_url>" --output qr.png --size 320`
  （PNG 必须落在 cwd / `/tmp` / `~/files` 之内）。URL 必须原样使用，不改参数。
- `auth status` 关键字段：`identities.user.tokenStatus`（`valid`）、`expiresAt`、
  `refreshExpiresAt`、`scope`、`openId`。`refreshExpiresAt` 之后必须重新登录。
- 身份：默认 `auto`（有用户身份走用户）。需要机器人身份时每条命令加 `--as bot`。
- 退出：`lark-cli auth logout`；多账号：`auth list` / `--name` profile。

## scope 与边界

`--recommend` 一次性给到 im / docs / drive / wiki / base / sheets / slides / task / approval /
minutes 等约 150 个 scope，但下面这些需要**用户单独勾选**，不勾就没有：

| 缺了会怎样 | 需要的 scope |
|---|---|
| `drive files list` 报 `space:document:retrieve` | `space:document:retrieve` |
| 搜文档 `docs +search` 无结果 | `search:docs:read` |
| 日历全部命令失败 | `calendar:calendar.event:read` 等 `calendar.*` |
| 读邮件失败 | `mail:user_mailbox.message.body:read` 等 |
| OKR 失败 | `okr.*` |

授权页里分三类：已授予、`[用户跳过，可重试]`、`[不可申请，勿重试]`（企业管理员禁用，
例如 `vc:meeting.realtime:read`）。只对前者重试。

## 命令发现

```bash
lark-cli --help                      # 24 个 domain
lark-cli <domain> --help             # +shortcut 优先，其次 raw API resource
lark-cli schema <service.resource.method>
lark-cli skills read lark-doc        # 读随包 Skill（含 JSON/Markdown 写作规范）
```

常用只读：

```bash
lark-cli im +chat-list --types=group --page-size 5
lark-cli im +messages-search --query "会议" --page-size 3
lark-cli wiki spaces list --page-size 3
lark-cli docs +search --query "周报"
lark-cli docs +fetch --doc <document_id>
```

写入（需确认）：

```bash
lark-cli docs +create --title "标题" --doc-format markdown --content @body.md
lark-cli docs +update --doc <id> --mode append --content @body.md
lark-cli drive upload ...            # 本地文件上传，需 drive:file:upload
```

## 错误表

| 现象 | 原因 | 处理 |
|---|---|---|
| `command not found` | 全局 bin 不在 PATH | 用绝对路径或修 PATH，别重装 |
| `20082 授权请求已过期` | 设备码 >10 分钟 | 重新 `--no-wait --json` |
| `missing_scope` | 用户未勾选 | `auth login --scope "..."` 精确补 |
| `invalid_client`（自建 OAuth） | DCR 未注册 / redirect 不匹配 | 重新注册，redirect 必须逐字符一致 |
| `unknown subcommand` | 猜了命令名 | `--help` + `schema`，`+shortcut` 优先 |
| 输出被截断/转义坏 | 多行 `--content` 走了 shell 引号 | 用 `@file` 或 `-`（stdin） |

## 与 MCP 的关系

飞书另有一套**远程** MCP（`https://mcp.feishu.cn/mcp`，OAuth），工具面比 CLI 小得多
（约 15 个：搜文档、读文档、建文档、改文档、评论、搜群、读消息、读已读状态）。
CLI 覆盖面大、写操作细；MCP 适合「只读 + 少工具」的宿主。两者可以并存。
