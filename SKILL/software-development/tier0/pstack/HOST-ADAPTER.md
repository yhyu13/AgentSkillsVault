# 宿主适配层

pstack 上游默认跑在 Cursor 和 Claude Code 的插件运行时里。这套 kit 不依赖它们。本文件把所有宿主专有名字翻译成宿主无关动作，并规定能力缺失时怎么降级。

## 一、先做能力探测

开始任务前，在项目根目录创建 `.pstack/host.md`，用下面的模板填写。只填事实，不填愿望。

```markdown
# Host capability probe

- host: <Cindy / Claude Code / Codex / other>
- host_version: <version>
- can_spawn_subagents: <yes / no>
- can_run_background: <yes / no>
- can_select_model: <yes / no>
- can_use_mcp: <yes / no>
- can_run_shell: <yes / no>
- can_read_write_files: <yes / no>
- can_use_git: <yes / no>
- can_use_pr_tool: <yes / no>
- probed_at: <YYYY-MM-DD>
- notes: <known gaps>
```

能力探测只做一次，写进项目。宿主升级或换机器时重做。

## 二、翻译表

| 上游写法 | 宿主无关动作 | 宿主没有时 |
|---|---|---|
| `/poteto-mode` | 读 `RULES.md` 和本文件，进入 pstack 模式 | 用户说“按 pstack 规矩做”或“pstack mode”即可 |
| `Task` / `Agent` | 调用宿主的子代理工具 | 顺序执行角色，写 `roles.md` |
| `subagent_type: "poteto-agent"` | 用 `references/upstream/agents/poteto-agent.md` 作为子代理提示词 | 主线程读该文件并扮演该角色，写降级说明 |
| `subagent_type: "comment-sicko"` | 用 `references/upstream/agents/comment-sicko.md` 作为只读评审提示词 | 主线程按该文件逐条评审 |
| `generalPurpose` | 宿主的通用子代理 | 主线程执行 |
| `Explore` / `readonly` | 宿主的只读子代理，明确禁止编辑 | 主线程只读检查，事后看 `git status` |
| `environment: "cloud"` | 独立 worktree 或独立 clone | 本地分支，串行执行 |
| `run_in_background` | 宿主后台任务 | 前台执行，步骤间写检查点 |
| `model` / `effort` | 按 `models.md` 选宿主可用模型 | 用宿主默认，记录在 `host.md` |
| `~/.cursor/rules/pstack-models.mdc` | 读套件内 `models.md` | 没有模型选择时忽略 |
| `~/.claude/rules/pstack-models.md` | 读套件内 `models.md` | 没有模型选择时忽略 |
| `.cursor/skills/` | 项目技能目录，默认 `.agents/skills/` | 用项目约定目录，写进 `host.md` |
| `.claude/skills/` | 项目技能目录，默认 `.agents/skills/` | 同上 |
| Cursor Automations / `update_state` / `SendToUser` | cron、CI、人工检查清单 | 跳过该步骤，写一行 `Skipped in <host>: <step>. <reason>.` |
| Bugbot | `gh pr` 评审线程或宿主的 PR 工具 | 人工逐条判断，记录在 `result.md` |
| Cursor cloud agents | worktree、远程 runner 或本地分支 | 本地执行，串行 |
| `disable-model-invocation` | 忽略，入口 skill 可被显式调用 | 用“pstack mode”显式触发 |
| `icon` / `color` | 忽略 | 忽略 |
| `cursor-team-kit` 的 `/deslop` | 用 `references/upstream/skills/technical-writing/RULE.md` 和 `no-comments` 人工执行 | 在 `result.md` 写“deslop 人工执行” |
| `control-ui` / `control-cli` | 项目自己的控制 CLI，由 `create-verification-skill` 生成 | 先造最小控制面，再验证 |

## 三、降级规则

### 没有子代理

- 不假装并行。按角色顺序做。
- 每个角色开始和结束写 `roles.md`：角色、任务、输入、输出、耗时、降级影响。
- `swarm` 变成顺序检查清单；`arena` 变成多方案逐项对比；`interrogate` 变成自我反问加人工评审。
- 验证步骤不能省。没有独立 Verifier 时，至少让 Reviewer 跑一遍关键检查。

### 没有模型选择

- 用宿主默认模型。
- 在 `host.md` 记录“模型不可选”，在 `result.md` 记录实际使用的模型。
- 不要假装用了某个模型。不要传宿主不认识的模型 slug。

### 没有 MCP

- 优先用 shell、HTTP、文件系统完成。
- 都不行时，写 `blocked.md`，说明缺哪个工具、需要谁提供。
- 不要用假数据绕过。

### 没有 git 或 PR 工具

- 用宿主支持的版本控制或补丁文件。
- 产出 `result.md` 和 `pr.md`，把 diff、验证命令、证据路径写清楚。
- 没有 PR 工具不等于可以跳过评审。

### 没有后台任务

- 前台执行，长任务分阶段。
- 每阶段结束写检查点和证据。
- 需要等待时，写清楚在等什么、下一步是什么。

### 没有项目技能目录

- 把生成的验证 skill 放在 `.pstack/verify/<app>/`，在 `host.md` 记录路径。
- 下次会话先读 `host.md`，不要重复探测。

## 四、常见宿主示例

### Cindy

- 技能从 `~/.agents/skills/pstack` 加载，junction 到各宿主。
- 有子代理时用子代理，没有时按 `roles.md` 顺序执行。
- 用文件工具读写 `.pstack/tasks/<id>/`。
- 用 shell 跑 `node scripts/pstack.mjs check`。
- 模型选择由宿主决定，`models.md` 只作建议。

### Claude Code

- 可以把套件放在 `~/.claude/skills/pstack` 或项目 `.claude/skills/pstack`。
- 有 `Agent` 工具时，用 `general-purpose` 或只读子代理。
- 没有插件市场也能用，不需要 `/plugin install`。
- 用 `gh` 处理 PR 和评审线程。

### Codex

- 把套件放在 Codex 的技能目录或项目内。
- 没有子代理时顺序执行。
- 用 shell 和文件工具完成证据采集。
- 模型选择按 Codex 的配置，不传上游 slug。

### 普通 LLM 对话框

- 把 `RULES.md`、`TEAM.md` 和匹配的 playbook 贴进上下文。
- 没有文件工具时，让模型输出 `task.md`、`plan.md`、`result.md` 的完整内容，由人保存。
- 没有 shell 时，证据只能是用户提供的输出或截图，必须标明来源。
- 仍然执行完成定义，不能因为环境弱就降低标准。

## 五、明确不移植的东西

- Cursor 插件市场和 `/add-plugin`。
- Cursor Automations、Benny 自动化的运行时。
- Bugbot 的专有检查和评论格式。
- Cursor cloud agents 的 dashboard 和自有机器。
- `poteto-agent` / `comment-sicko` 的插件注册机制。这里只保留它们的提示词。
- `~/.cursor/rules` 和 `~/.claude/rules` 的模型规则写入。
- 上游的图标、颜色、斜杠命令注册。

这些内容在上游参考里保留，作为理解上下文的材料，不作为运行依赖。

## 六、适配层的验收

适配是否成功，看四件事：

1. 没有插件市场，任务能从头跑到 check 通过。
2. 没有子代理，`roles.md` 能解释每个角色由谁做、影响是什么。
3. 没有模型选择，`host.md` 和 `result.md` 能说清实际用了什么。
4. 没有 PR 工具，`pr.md` 和 diff 仍然能让 reviewer 复核。
