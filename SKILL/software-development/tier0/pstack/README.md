# pstack 工作套件

一套不依赖 Grok Bot、Cursor、Claude Code 或插件市场的 pstack 工作方式。Cindy 伙伴和人看同一套规矩，用同一份任务目录，按同一套证据标准验收。

## 这是什么

- 一个自包含 skill：`pstack`。
- 完整的上游规则、22 个 playbook、24 条原则、58 个入口 skill，全部在 `references/upstream/`。
- 一层宿主适配：`HOST-ADAPTER.md` 把 Cursor/Claude Code 的专有名字翻译成普通动作。
- 一套人的手册：`RULES.md` 和 `TEAM.md`。
- 一个可执行的完成检查：`scripts/pstack.mjs check`。

它不是“提炼 pstack 的精华”。它是把 pstack 的规矩原样搬到一个不挑宿主的工作套件里，并补上原插件运行时提供的部分。

## 安装

### 在这个 vault 里

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\build-manifest.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\sync-skills.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\verify-install.ps1 -Manifest scripts\install-manifest.txt
```

同步后，真实副本在 `~/.agents/skills/pstack`，其他宿主是 junction 视图。

### 在别的宿主里

把整个 `pstack` 目录复制到宿主的技能目录：

- Cindy / 通用 agent：`~/.agents/skills/pstack`
- Claude Code：`~/.claude/skills/pstack` 或项目 `.claude/skills/pstack`
- Codex：Codex 的技能目录或项目内
- 普通 LLM：把 `RULES.md`、`TEAM.md` 和匹配的 playbook 贴进上下文

不需要 `/plugin marketplace add`，不需要 `/plugin install`，不需要 `~/.cursor/rules`。

## 五分钟上手

在仓库根目录：

```bash
node <pstack>/scripts/pstack.mjs new-task fix-login --title "Fix login redirect"
```

编辑 `.pstack/tasks/fix-login/task.md`：

```markdown
## Goal
登录成功后跳转到用户原本要去的页面，而不是首页。

## Scope
- 改登录回调的重定向逻辑
- 不改登录表单样式

## Acceptance
- [ ] 未登录访问 /settings 后登录，落在 /settings
- [ ] 直接访问 /login 登录，落在首页
- [ ] 现有登录测试全部通过

## Non-goals
- 不改第三方登录
- 不改会话存储

## Owner
@alice

## Risk tier
yellow

## Deadline
2026-11-20
```

然后对 agent 说：

```text
按 pstack 规矩做。读 RULES.md 和 HOST-ADAPTER.md，选 Bug fix playbook，
建 .pstack/tasks/fix-login/，每一步写证据，最后跑 pstack check。
```

Agent 应该先复述目标、范围、验收和最小改动，再开始。做完后：

```bash
node <pstack>/scripts/pstack.mjs check fix-login
```

退出码为零才算完成。

## 人和 agent 的分工

| 人 | agent |
|---|---|
| 定目标、验收、范围、风险级别 | 复述并补全四样 |
| 批准不可逆动作 | 执行 playbook，写证据 |
| 看证据和 diff | 跑检查，写 result |
| 决定是否加范围 | 发现范围膨胀时停下 |
| 周维护功能地图 | 跑 maintain-verification-skill |

详细角色和门禁见 `TEAM.md`。

Cindy 伙伴先读 `CINDY-QUICKSTART.md`，它按任务目录逐项说明 `task.md`、`plan.md`、`evidence/`、`result.md` 怎么填，以及 `pstack check` 的每种失败怎么修。

## 文件地图

| 路径 | 用途 |
|---|---|
| `SKILL.md` | 入口和强制阅读顺序 |
| `RULES.md` | 十一条不可协商、二十四条原则、二十二个 playbook、完成定义 |
| `TEAM.md` | 人的角色、门禁、证据标准、周维护 |
| `CINDY-QUICKSTART.md` | Cindy 伙伴的五分钟上手：任务目录怎么填、完成检查怎么验 |
| `HOST-ADAPTER.md` | 能力探测、翻译表、降级规则 |
| `models.md` | 角色到模型/档位的建议 |
| `references/upstream/` | 上游全文，内层 `SKILL.md` 已改名 `RULE.md` |
| `references/playbooks-index.md` | 22 个 playbook 的路由表 |
| `references/principles-index.md` | 24 条原则的路由表 |
| `references/skills-index.md` | 58 个入口 skill 的路由表 |
| `references/templates/` | task、plan、result、roles、blocked、PR、feature-map、verification-skill 模板 |
| `scripts/pstack.mjs` | 建任务、检查、状态 |
| `examples/sample-task/` | 一个能通过检查的完整示例 |
| `PROVENANCE.md` | 上游 commit、许可证、改动、重新同步步骤 |

## 常用命令

```bash
# 建任务
node <pstack>/scripts/pstack.mjs new-task <id> --title "<title>"

# 检查一个任务
node <pstack>/scripts/pstack.mjs check <id>

# 检查全部任务
node <pstack>/scripts/pstack.mjs check --all

# 看任务状态
node <pstack>/scripts/pstack.mjs status
```

## 明确不做的事

- 不移植 Cursor 插件市场、Automations、Benny、Bugbot、cloud agents 的运行时。
- 不注册 `poteto-agent` 或 `comment-sicko` 为插件 agent，只保留它们的提示词。
- 不把 58 个 skill 平铺成 58 个独立安装项。套件是一个 skill，内部用 `RULE.md` 组织。
- 不执行上游脚本。上游脚本作为参考保留，套件自己的可执行契约是 `scripts/pstack.mjs`。

## 来源

上游：`https://github.com/cursor/plugins/tree/main/pstack`
commit：`e58dd043600587dbaf58ba315e7f2b38373eeb43`
版本：`0.15.44`
许可证：MIT，见 `LICENSE`。

改动和重新同步步骤见 `PROVENANCE.md`。
