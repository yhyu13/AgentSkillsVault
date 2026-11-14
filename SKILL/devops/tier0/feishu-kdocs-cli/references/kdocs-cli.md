# 金山文档 CLI（kdocs-cli）安装与用法细节

版本基线：**2.9.6**（2026-11-14）。官方 Skill 包 `kdocs.zip` 内含 `SKILL.md`、
`skills/kdocs-*`、`references/`、`scripts/setup.{ps1,sh,cjs}`，以及从 CDN 下载的预编译二进制。
上游入口：`https://www.kdocs.cn/latest`（不是 GitHub）。

## 安装

```bash
# 拿最新包（版本号可自查，见下）
curl -L -o kdocs.zip "https://wpsai.wpscdn.cn/skillhub/pro/v2.9.6/kdocs.zip"
unzip kdocs.zip
powershell -ExecutionPolicy Bypass -File kdocs/scripts/setup.ps1    # Windows
bash kdocs/scripts/setup.sh                                          # macOS / Linux
```

- 默认装到 `%LOCALAPPDATA%\kdocs-cli\kdocs-cli.exe`（Windows）或 `~/.local/bin`（类 Unix），
  校验 SHA256，并把安装目录追加到**用户级** PATH。
- **已经在运行的宿主进程不会看到新 PATH**。把 exe 复制到旧 PATH 里已有的目录
  （`~/bin`、`~/.local/bin`）即可，不必重启宿主。
- Skill 目录（`SKILL.md` + 子 skills + references）应落到 `$HOME/.agents/skills/kdocs`；
  只复制 SKILL.md 会断掉相对链接。
- 查最新版：调用 SkillHub MCP 的 `check_skill_update({"version":"2.9.6","skill_name":"kdocs"})`，
  `data.instruction` 里是 zip 地址；CLI 升级用 `kdocs-cli upgrade [-y|--check|--rollback]`。

## 鉴权

```bash
kdocs-cli auth status
printf '%s' "$TOKEN" | kdocs-cli auth set-token -   # 只进系统密钥链
kdocs-cli auth login                                # 浏览器 OAuth，自动写密钥链
kdocs-cli auth logout
```

优先级：`--token` > `KINGSOFT_DOCS_TOKEN` 环境变量 > 系统密钥链。
`auth status` 会报 `keychain.available`、`source`、token 脱敏值；token 长度 <100 时直接拒收。

同一枚 token 可以两用：CLI 走密钥链，远程 MCP 走 `Authorization: Bearer`（见
`mcp-endpoints.md`）。

## 能力面（11 个 service）

| service | 用途 | action 数 |
|---|---|---|
| `drive` | 文件/文件夹、上传下载、分享、标签、回收站 | 54 |
| `sheet` | 表格（读写、格式、公式） | 64 |
| `otl` | 智能文档块级读写 | 6 |
| `dbsheet` | 多维表格（表/字段/记录/视图） | 73 |
| `form` | 智能表单 | 4 |
| `wpp` | 演示文稿（含 JSAPI execute） | 125 |
| `aippt` | AI 生成 PPT | 1 |
| `wps` | 在线文字（段落/字符格式等原子操作） | 287 |
| `pdf` | PDF 读取/拆分/导出 | 11 |
| `kwiki` | 个人知识库 | 9 |
| `auto_sheet` | 自动化流程 | 9 |

`kdocs-cli --help` 打印这张表；`kdocs-cli help <service> <action>` 打印工具卡（适用/禁用/
约束/示例），**调用前先看**，比猜参数快。

## 参数约定

```bash
kdocs-cli <service> <action> '<json>'          # 点号变空格，snake_case action
kdocs-cli call <tool_name> '<json>'            # 直接按工具名调
```

- 位置参数是一整个 JSON 对象；PowerShell 下用单引号包住，内部双引号不用转义。
- 全局输出选项：`--compact`（紧凑 JSON）、`--silent`（**只输出 `data` 内容**）、
  `--verbose`（请求详情走 stderr）。
- 嵌套参数要放对层级：`otl block-query` 的 `blockIds` 在 `params` 里，不在顶层。
- 超长参数用 `@file` 或 stdin；`content_base64` 之类不要手拼。

## 配方

```bash
# 列根目录
kdocs-cli drive list_my_files '{"page_size":20}' --silent

# 搜索
kdocs-cli drive search_files '{"keyword":"周报","page_size":5}' --silent

# 读智能文档全文
kdocs-cli otl block-query '{"file_id":"<id>"}' --silent

# 新建带 Markdown 正文的智能文档（.otl）
kdocs-cli drive create_file_with_content '{
  "name":"标题","file_extension":"otl",
  "content":"# 标题\n\n正文"}' --silent

# 新建 Word / Excel / Markdown
kdocs-cli drive create_file_with_content '{"name":"纪要","file_extension":"docx","content":"# 纪要\n..."}'
kdocs-cli drive create_file_with_content '{"name":"台账","file_extension":"xlsx","rangeData":[{"row_from":0,"row_to":0,"col_from":0,"col_to":1,"formula":[["姓名","部门"]]}]}'

# 上传本地文件
kdocs-cli drive upload_new_file '{"file_path":"C:/tmp/a.pdf","parent_id":"0"}'
```

支持的 `file_extension`：`otl` `docx` `md` `pdf` `xls` `xlsx` `ksheet` `dbt`。
`name` 里**不要**带后缀。

## 错误表

| 现象 | 原因 | 处理 |
|---|---|---|
| `params 为必填` | 字段写在顶层 | 嵌进 `"params": {...}` |
| `unknown action` / `unknown service` | 版本旧或拼错 | `kdocs-cli help`；必要时 `upgrade -y` |
| `Token 长度异常（仅 N 字符）` | 传了空值/被 shell 截断 | 改 stdin 管道 |
| `code: 400001` | 参数缺失或类型错 | 看 `param_detail`，按工具卡重写 |
| 整文件「无权访问」 | 文件级权限 | 停止对该文件重试，找所有者授权 |
| 403（SkillHub 授权页） | 企业账号 | 换个人 WPS 账号 |

## 与 MCP 的关系

同一个后端还有远程 MCP（`https://mcp-center.wps.cn/skill_hub/mcp`，638 个工具）。
CLI 轻、按需查帮助；MCP 适合宿主原生挂工具，但工具面巨大，接之前先想清楚宿主是否支持
延迟暴露（tool search / codemode），否则上下文会被 638 个 schema 淹没。
