# 2026-11-14 实测记录

环境：Windows 11 + Git Bash、Node 22.16、Python 3.13、Cindy Desktop（Pi 引擎）。
所有命令都在 Cindy 的 bash 工具里执行，等价于用户终端。

## 基线

| 项 | 值 |
|---|---|
| `lark-cli --version` | `lark-cli version 1.0.100` |
| `kdocs-cli version` | `2.9.6` |
| 飞书应用 | 一键创建（`config init --new`），App ID `cli_aa7d5c0cd6b81c14` |
| 飞书用户 | Hang Yu，`tokenStatus=valid`，refresh 至 2026-11-21 |
| 金山 drive | `1427945015`（`special`） |
| 金山 Skill | `kdocs` v2.9.6 → `$HOME/.agents/skills/kdocs` |

## 读：已验证

```bash
lark-cli im +chat-list --types=group --page-size 2
# -> Team Hardline / 俞航 AI 加速人生's Feishu Assistant

lark-cli im +messages-search --query "会议" --page-size 3
# -> ok:true, has_more:true，返回真实消息体

lark-cli wiki spaces list --page-size 3
# -> 11.07 Aholo黑客松 / AI Tutor PBL / Project Hardline ...

kdocs-cli drive list_my_files '{"page_size":2}' --silent
# -> drive 1427945015，项目 Game Dev / Aholo黑客松 2026 上海同济站

kdocs-cli drive search_files '{"keyword":"周报","page_size":3}' --silent
# -> 写工作周报初稿.otl

kdocs-cli otl block-query '{"file_id":"HeMmeYmS8rMFfxomEkenxxicyiq9yGKTv"}' --silent
# -> 返回 title / heading / paragraph / list 块，含正文
```

## 写：已验证（本 Skill 写作时新建的两篇测试文档）

```bash
kdocs-cli drive create_file_with_content '{
  "name":"Cindy 上传测试 2026-11-14","file_extension":"otl",
  "content":"# 你好世界，我是cindy\n\n..."}'
# -> action=created_with_content bytes_written=197
#    file_id=F2cWfF7TtxMMWFF1trUe1xf6iTwn4mc1V
#    https://www.kdocs.cn/l/cba7TUOOC84c
```

读回复核：`otl block-query` 依次返回「Cindy 上传测试 2026-11-14 / 你好世界，我是cindy / …」。

```bash
lark-cli docs +create --title "Cindy 上传测试 2026-11-14" \
  --doc-format markdown --content @upload-test.md
# -> ok:true document_id=UmsUdENB2oAQibx3yT7cGEIxnVe
#    https://z8fdqawp6q.feishu.cn/docx/UmsUdENB2oAQibx3yT7cGEIxnVe
```

读回复核：`docs +fetch --doc <id>` 返回
`<title>Cindy 上传测试 2026-11-14</title><p>你好世界，我是cindy</p>…`（revision 3）。

结论：两套 CLI 都不只是「读」——能建带正文的文档、能上传本地文件、能改已有文档。

## 远程 MCP 实测

| 端点 | 实测结果 |
|---|---|
| `https://mcp.feishu.cn/mcp` | 无 token → `401` + `WWW-Authenticate`（含 resource_metadata、15 个 scope）；`initialize` 也要求 token（`-32010 oauth required`）；DCR 于 `open.feishu.cn/open-apis/app/v1/dcr` 返回 `201` + `client_id` |
| `https://mcp-center.wps.cn/skill_hub/mcp` | `initialize`、`tools/list` 免 token（638 个工具，响应约 550 KB）；`tools/call` 无 token → `{"code":400006,...未提供认证凭证}`；带 Bearer → `list_my_files` 返回真实云盘 |
| `https://docs.qq.com/openapi/mcp` | 无 token → `401 invalid_token`；`tools/list` 同样被拦；OAuth token 端点对第三方客户端始终 `unsupported_grant_type` |

飞书 MCP 的 DCR 注册示例（公开客户端、无 secret）：

```json
POST /open-apis/app/v1/dcr
{"client_name":"Cindy MCP","redirect_uris":["http://127.0.0.1:4711/callback"],
 "grant_types":["authorization_code","refresh_token"],"response_types":["code"],
 "token_endpoint_auth_method":"none"}
```

## Cindy 侧

- 自定义 MCP 写入后，当前会话 `availableServers` 不含新 server；新会话才加载（文档口径一致）。
- 宿主重写配置后，`headers` 列从明文变成 `safe-storage:v1:...`，说明凭据被托管加密。
- 子 agent（scout / worker）不透传 `mcp__*` 工具，不能拿子 agent 验证 MCP。
