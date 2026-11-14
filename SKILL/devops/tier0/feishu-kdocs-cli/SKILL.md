---
name: feishu-kdocs-cli
description: "Office cloud CLIs for agents: install, authenticate, verify and troubleshoot Feishu `lark-cli` and Kingsoft/WPS Docs `kdocs-cli`, plus the three China office MCP endpoints (Feishu, WPS SkillHub, Tencent Docs). Use when setting up or re-logging-in 飞书 CLI / 金山文档 CLI, when a command fails with missing scope / PATH / token / device-code errors, when a kdocs or lark command returns 400001 or unknown action, or when wiring 飞书 / 金山文档 / 腾讯文档 MCP into Cindy, Claude or another host. Not a per-command reference: domain commands live in the lark-* Skills and the kdocs Skill."
version: 1.0.0
license: MIT
---

# 飞书 / 金山文档 CLI：安装、鉴权、边界（2026-11-14 实测）

两套官方 CLI 加三个远程 MCP 端点的「装得上、登得进、知道边界」手册。
命令细节不在这里：飞书看 `lark-cli skills read <name>` 或 `lark-cli <domain> --help`，
金山看 `kdocs-cli help <service> <action>`。本 Skill 只回答：**装什么、怎么登、什么不能做、报错怎么修**。

## 何时用 / 不用

用：
- 新机器要装 `lark-cli` / `kdocs-cli`，或换账号、token 过期要重登。
- 命令报 `missing_scope`、`unknown action`、`invalid token`、`command not found`。
- 要把飞书 / 金山 / 腾讯文档的 MCP 接进宿主（Cindy 的自定义 MCP、Claude、Codex 等）。

不用：
- 已知命令、只想查参数 → 直接 `--help` / `help`，不要加载本 Skill。
- 单纯写文档、做 PPT → 用对应的 lark-doc / kdocs-ap 等业务 Skill。

## 一分钟速查（2026-11-14）

| 项 | 值 |
|---|---|
| 飞书 CLI | `lark-cli 1.0.100`，npm 全局包 `@larksuite/cli` |
| 飞书凭证 | 系统凭据 + DPoP；`config.json` 只存 App ID，`appSecret` 由 keychain 托管 |
| 金山 CLI | `kdocs-cli 2.9.6`（官方 Skill 包 v2.9.6 内自带安装脚本） |
| 金山凭证 | Windows 凭据管理器 / macOS Keychain，`auth set-token` 或 `auth login` 写入 |
| 飞书远程 MCP | `https://mcp.feishu.cn/mcp`，OAuth 2.1 + DCR + PKCE |
| 金山远程 MCP | `https://mcp-center.wps.cn/skill_hub/mcp`，自定义 auth-guide 换 token，**638 个工具** |
| 腾讯文档 MCP | `https://docs.qq.com/openapi/mcp`，只认 `Authorization: Bearer <长期 MCP token>` |

## 飞书 CLI

```bash
npm install -g @larksuite/cli            # 需 Node；版本 1.0.100
npx -y skills add https://open.feishu.cn --skill -y   # 24 个官方 Skill，装到 $HOME/.agents/skills
lark-cli config init --new               # 浏览器建应用，阻塞到用户完成
lark-cli auth login --recommend          # 设备码授权
lark-cli auth status                     # 验证：identities.user.tokenStatus == valid
```

`config init --new` 会打印一个 `https://open.feishu.cn/page/cli?user_code=...` 链接并等待；
`auth login` 打印 `https://accounts.feishu.cn/oauth/v1/device/verify?...`。两条命令都**不要**
「打印链接后在同一轮里阻塞等待」：用 `--no-wait --json` 拿 `verification_url` 交给用户，
下一轮再用 `lark-cli auth login --device-code <code>` 续上。设备码 10 分钟过期，过期报 `20082`。

详见 `references/feishu-cli.md`（scope 清单、身份切换、常见错误表）。

## 金山文档 CLI

```bash
# 1) 官方 Skill 包自带安装脚本（无需 Node/Go）
curl -L -o kdocs.zip "https://wpsai.wpscdn.cn/skillhub/pro/v2.9.6/kdocs.zip"
unzip kdocs.zip && powershell -ExecutionPolicy Bypass -File kdocs/scripts/setup.ps1

# 2) 把二进制放进「当前进程 PATH 里已存在」的目录（关键，见坑 #3）
cp "$LOCALAPPDATA/kdocs-cli/kdocs-cli.exe" ~/bin/

# 3) 鉴权（token 只进密钥链）
printf '%s' "$TOKEN" | kdocs-cli auth set-token -
kdocs-cli auth status
kdocs-cli version
```

官方 Skill 目录（`SKILL.md` + `skills/kdocs-*` + `references/`）装到 `$HOME/.agents/skills/kdocs`。
获取「最新版下载链接」不用猜 URL：调用 SkillHub MCP 的 `check_skill_update`
（`{"skill_name":"kdocs","version":"<当前版本>"}`），从 `data.instruction` 里取 zip 地址。

详见 `references/kdocs-cli.md`（11 个 service 的能力面、参数约定、常用配方）。

## 能力边界（当日实测）

| 能力 | 飞书 `lark-cli` | 金山 `kdocs-cli` |
|---|---|---|
| 读消息 / 群 / 知识库 | ✅ 已授权 im 只读 + wiki | — |
| 读云文档正文 | ✅ `docs +fetch`（docx XML/Markdown） | ✅ `drive` + `otl block-query` |
| 新建带正文的文档 | ✅ `docs +create --doc-format markdown` | ✅ `drive create_file_with_content` |
| 上传本地文件 | ✅ `drive` 上传（需 `drive:file:upload`，已授权） | ✅ `drive upload_new_file`（PDF/Markdown/Office 均可） |
| 改已有文档 | ✅ `docs +update`（需写 scope） | ✅ `otl block-insert/update`、`sheet update_range_data`、`wps core_execute` |
| 删除 / 分享 | 高风险写，需用户确认 + `--yes` | 有 delete/close 类，**必须先问用户** |
| 列云盘文件 | ⚠️ `drive files list` 需要 `space:document:retrieve`（当时未授权） | ✅ `drive list_my_files` |
| 日历 / 邮件 | ⚠️ 未授权（`calendar.*`、`mail` 读） | — |
| 腾讯文档 | — | — |

**硬件/账号边界**：飞书某些 scope 被企业管理员标为「不可申请」（如 `vc:meeting.realtime:read`），
重试无意义；金山 SkillHub 授权只接受**个人** WPS 账号，企业账号返回 403。

## 踩坑清单（按出现频率）

1. **`lark-cli: command not found`，但 npm 装成功了** — 全局 bin 没在 PATH。用绝对路径
   `~/AppData/Roaming/npm/lark-cli`（Windows）或 `npm bin -g`，别急着重装。
2. **链接发出去用户才点，设备码已过期（20082）** — 设备码只有 10 分钟。正确姿势：
   `--no-wait --json` 出链接 → 结束本轮 → 用户确认 → `--device-code` 续。
3. **`kdocs-cli` 装好了，Agent 里还是 command not found** — `setup.ps1` 改的是**用户级 PATH**，
   已经在跑的宿主进程（Cindy / Claude / IDE）继承的是旧 PATH。复制 exe 到旧 PATH 里已存在的目录
   （`~/bin` 之类）最稳；重启宿主也可以。
4. **金山 token 传进去只报「长度异常」** — `auth set-token` 不接受短字符串；用 stdin
   `printf '%s' "$TOKEN" | kdocs-cli auth set-token -`，避免 shell 截断与进程列表泄露。
5. **`kdocs-cli drive list_my_files` 的 `--silent` 输出没有 `data` 字段** — `--silent` 就是只输出
   `data` 的内容；要完整包装用 `--compact` 或默认输出。
6. **`otl block-query` 报 `params 为必填`** — 查询字段必须嵌套：`{"file_id":"...","params":{"blockIds":["doc"]}}`；
   只传 `file_id` 才是「全文」。
7. **飞书命令全返回 `missing_scope`** — 不要一条条补；`lark-cli auth login --scope "a b c"` 一次把要的
   都列上，用户勾选一次即可。授权页里「用户跳过」的 scope 可以重试，「管理员禁止」的不要重试。
8. **腾讯文档 OAuth 换 token 永远 `unsupported_grant_type`** — 不是你的参数写错：该端点对第三方
   客户端就是坏的（`auth_code`/`authorization_code`/`refresh_token`/`device_code`，JSON/form/query
   全试过）。只能让用户在 docs.qq.com 空间页生成「MCP token」（1 年有效，需超级会员）。
9. **Cindy 里加了自定义 MCP，当前对话看不到工具** — 自定义 MCP **只对新会话生效**
   （设置 → 工具 → 外部工具）。别在同一条对话里反复重连。
10. **飞书 CLI 插件（Cindy 市场那个）装不上** — 它只支持 Apple Silicon Mac；Windows 用 npm 版
    `@larksuite/cli`，不要在这个插件上耗时间。

## 自检

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/doctor.ps1
```

输出：两个 CLI 的版本、是否在 PATH、鉴权状态、（可选）Cindy 自定义 MCP 里是否已有 wps / qqdocs 条目。
任何一项 FAIL 时按上面的坑位号处理。

## 安全红线

- Token **只**进系统凭据或宿主加密存储；不要写进对话、日志、SKILL.md、脚本参数（用 stdin）。
- 删除 / 关闭 / 转移所有权类操作先向用户确认；飞书 `high-risk-write` 必须带 `--yes` 且仅在你已获确认后。
- 写操作完成后用独立读取验证（`docs +fetch`、`otl block-query`），不要只看 `code: 0`。

## 参考

- `references/feishu-cli.md` — 飞书安装/登录细节、scope 清单、错误表。
- `references/kdocs-cli.md` — 金山 service/action 面、参数约定、配方。
- `references/mcp-endpoints.md` — 三个远程 MCP 的鉴权差异与 Cindy 接入方式。
- `references/verification-2026-11-14.md` — 当日实测记录（环境、命令、返回码、生成的文档链接）。
