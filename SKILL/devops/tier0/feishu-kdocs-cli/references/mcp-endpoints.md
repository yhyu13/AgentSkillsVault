# 三个办公 MCP 端点：鉴权差异与接入

2026-11-14 实测。共同点：都是 Streamable HTTP（`POST /mcp`，`Accept: application/json, text/event-stream`），
都不支持 legacy SSE。

| 端点 | 鉴权 | 工具面 | 可用性 |
|---|---|---|---|
| `https://mcp.feishu.cn/mcp` | OAuth 2.1（DCR + PKCE） | ~15 个（docs / im / user） | 正常 |
| `https://mcp-center.wps.cn/skill_hub/mcp` | 自定义 auth-guide 换 Bearer | **638 个**（drive/sheet/wpp/dbsheet/pdf/aippt…） | 正常 |
| `https://docs.qq.com/openapi/mcp` | `Authorization: Bearer <长期 token>` | 文档空间读写 | OAuth 换 token 端点有 bug |

## 飞书 MCP

```
GET  https://mcp.feishu.cn/.well-known/oauth-protected-resource/mcp
GET  https://accounts.feishu.cn/.well-known/oauth-authorization-server/mcp
POST https://open.feishu.cn/open-apis/app/v1/dcr          # 动态注册
GET  https://accounts.feishu.cn/oauth/v2/mcp/authorize   # + code_challenge
POST https://accounts.feishu.cn/oauth/v3/token           # form-encoded, token_endpoint_auth_method=none
```

- 未带 token 时返回 `401` + `WWW-Authenticate: Bearer realm="mcp", resource_metadata=...`，可直接照着做发现。
  `initialize` 也要求 token（`{"error":{"code":-32010,"message":"oauth required"}}`）。
- scope 是「工具级」的：`mcp-tool:docs:search-doc`、`mcp-tool:im:get-messages` …，
  外加 `offline_access` 换 refresh_token。
- access token 寿命短（小时级），refresh 才是长期凭据；宿主若不支持刷新，几小时后就要重登。
- 只读/简单写入够用；要批量改文档、上传文件、管理群 → 用 CLI。

## 金山文档 MCP（SkillHub）

```bash
# 1) initialize 不需要 token；tools/list 也不需要（返回 ~550 KB / 638 个工具）
# 2) tools/call 必须带 Bearer，否则：
#    {"result":{"content":[{"text":"{\"code\":400006,...未提供认证凭证...}"}]}}
# 3) 取 token：自定义流程，不是标准 OAuth
CODE=$(uuidgen)
open "https://mcp-center.wps.cn/kdocs-auth/auth-guide?auth_code=$CODE"
# 用户登录后轮询：
curl -X POST https://api.wps.cn/office/v5/ai/skill_hub/wps_auth/exchange \
     -H 'content-type: application/json' -d "{\"code\":\"$CODE\"}"
# 202 = 等待登录；200 + data.token = 成功；403 = 企业账号被拒；409 = 用户取消
```

- 同一枚 token 也能喂给 `kdocs-cli auth set-token`（CLI 会先验证再入密钥链）。
- 建议每 2–3 秒轮询；token 拿到后调用 `list_my_files` 自检。
- 638 个工具里绝大多数是写操作，宿主需要「按需暴露」策略，否则每次请求都背着几十万字符 schema。

## 腾讯文档 MCP

```
GET https://docs.qq.com/openapi/mcp/.well-known/oauth-protected-resource
GET https://docs.qq.com/.well-known/oauth-authorization-server
```

- 元数据齐全（DCR、device_code、`docs:read/write/manage`），但 **token 端点对第三方客户端不可用**：
  任何 `grant_type` 都回 `unsupported_grant_type`（JSON/form/query、basic auth、cookie 会话都试过）。
  device 端点则回 `invalid_client for device auth`。
- 现实路径只有一条：用户在 `docs.qq.com/desktop/wikispace` 选空间 → 右上角 AI →
  「使用 MCP」→「获取当前空间 MCP token」（**1 年有效**，需超级会员 / Plus）。
  接入时 `Authorization: Bearer <token>`，工具调用即作用于该空间。
- 频率限制：免费 2000 次/天，超级会员 20000，Plus 40000。

## 接进 Cindy

- 存储：SQLite 表 `custom_mcp_servers`，字段 `id`（`custom_<name>`）、`name`、`transport`（http）、
  `url`、`headers`（JSON）、`sort_order`。UI 路径：设置 → 工具 → 外部工具（自定义 MCP）。
- 只接受**远程** MCP，不支持本地 stdio；headers 可放 `Authorization`，Cindy 会在宿主重写时
  把值转成 `safe-storage:v1:...` 加密串（不要手工回写明文，否则下次又被改写）。
- **只对新会话生效**：保存后当前对话看不到工具，开新对话才加载。判断是否加载成功看
  工具名是否出现 `mcp__<server>__<tool>`。
- 授权码/凭据不要贴进对话；表单里填 Bearer token，或由 Agent 走上面的浏览器流程后写入配置。
