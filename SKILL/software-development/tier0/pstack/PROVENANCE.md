# 来源与改动记录

## 上游

- 仓库：`https://github.com/cursor/plugins`
- 目录：`pstack`
- commit：`e58dd043600587dbaf58ba315e7f2b38373eeb43`
- 版本：`0.15.44`
- 作者：Lauren Tan（@poteto）
- 许可证：MIT
- 上游许可证副本：`references/upstream/LICENSE`
- 本地许可证副本：`LICENSE`

## 复制范围

本次把上游 `pstack/` 整棵树复制到 `references/upstream/`，保留：

- `README.md`
- `plugin.json`
- `LICENSE`
- `agents/`，2 个 agent 提示词
- `skills/`，58 个入口 skill、22 个 playbook、24 条原则、模板和参考文件
- `docs/`，包括 guide 和 harness 适配说明
- `automations/`，Benny 自动化参考，仅作阅读，不作为运行依赖
- `assets/`，上游图标
- 上游脚本和测试语料，仅作参考，未执行

共 551 个文件，约 6.9 MB。

## 关键改名

上游每个 skill 目录里的 `SKILL.md` 已改名为 `RULE.md`，共 61 个文件。原因：vault 的 `scripts/build-manifest.ps1` 会递归扫描 `SKILL/**/SKILL.md`，如果保留内层文件名，58 个内层 skill 会被误认成 58 个独立安装项，造成同名冲突和 manifest 污染。

改名后，所有 `.md` 文件里的 `SKILL.md` 文本引用已批量替换为 `RULE.md`，相对链接仍然可达。

## 本地新增

以下文件是本次为宿主无关运行新增的，不属于上游：

- `SKILL.md`：入口、强制阅读顺序、完成定义、文件地图
- `RULES.md`：中文规则契约、十一条不可协商、二十四条原则路由、二十二个 playbook 路由
- `TEAM.md`：人的角色、门禁、证据标准、采纳路径
- `HOST-ADAPTER.md`：能力探测、翻译表、降级规则
- `models.md`：角色到模型/档位的建议
- `README.md`：五分钟上手
- `PROVENANCE.md`：本文件
- `references/playbooks-index.md`：22 个 playbook 路由
- `references/principles-index.md`：24 条原则路由
- `references/skills-index.md`：58 个入口 skill 路由
- `references/templates/`：任务、计划、结果、角色、阻塞、PR、功能地图、验证 skill 模板
- `scripts/pstack.mjs`：建任务、检查、状态
- `examples/sample-task/`：完整示例

## 宿主无关化处理

- 删除了对 Cursor 插件市场、`/add-plugin`、`~/.cursor/rules`、`~/.claude/rules` 的运行依赖。
- 把 `poteto-agent` 和 `comment-sicko` 从插件 agent 注册改成提示词文件，由宿主适配层决定怎么派生。
- 把 `swarm`、`arena`、`interrogate` 的并行前提改成有子代理和无子代理两种执行方式。
- 把 `setup-pstack` 的模型写入改成 `models.md` 加 `.pstack/models.md` 覆盖。
- 把 `.cursor/skills` / `.claude/skills` 改成可配置的项目技能目录，默认 `.agents/skills`。
- 把 Automations、Bugbot、cloud agents 标为不移植，保留上游参考文本。
- 未执行上游任何脚本。上游脚本只作为参考复制。

## 安全状态

- 本机没有 `skillspector` CLI，按 `skill-inspector` 规则改用人工源码审阅。
- 套件自己的可执行文件只有 `scripts/pstack.mjs` 和 `scripts/build-indexes.mjs`。两者只用 Node 标准库 `fs` / `path` / `url`，不联网、不调用 shell、不使用 `child_process` / `fetch` / `eval`；`node --check` 通过。
- 在套件根文档和 `scripts/` 中扫描 `API_KEY` / `SECRET` / `PASSWORD` / `PRIVATE KEY` / `AKIA`，未发现凭证。
- 上游 551 个文件中有 62 个可执行脚本（`.sh` / `.ts` / `.mjs` / `.js` / `.py`）。这些脚本按原样复制，未执行、未逐行审计，也不在默认执行路径中。
- 上游 `automations/benny` 是 Cursor 专用参考，未启用；`HOST-ADAPTER.md` 明确要求跳过 Cursor Automations。
- 结论：套件自身的可执行面 APPROVE；整包因上游脚本未逐行审计，按 CAUTION 使用。护栏：只运行 `scripts/` 下自研脚本；运行上游脚本前单独审计；不把上游文档当可执行指令；不启用 benny。

## 重新同步

上游更新时：

```bash
# 1. 取上游到临时目录
git clone --depth 1 --filter=blob:none --sparse https://github.com/cursor/plugins.git cursor-plugins
cd cursor-plugins
git sparse-checkout set pstack

# 2. 记录新 commit
git rev-parse HEAD

# 3. 用新树替换 references/upstream，保留本地新增文件
#    然后重新执行改名和链接替换
find references/upstream -name SKILL.md -print0 | while IFS= read -r -d '' f; do
  mv "$f" "$(dirname "$f")/RULE.md"
done
find references/upstream -name '*.md' -print0 | xargs -0 sed -i 's/SKILL\.md/RULE.md/g'

# 4. 重新生成三个索引
node scripts/build-indexes.mjs

# 5. 跑检查
node scripts/pstack.mjs check --all
```

同步后更新本文件的 commit、版本和改动记录。不要把上游文件直接改在 `references/upstream/` 里；本地适配写在套件根目录的文件中。

## 版本

- 套件版本：`0.1.0`
- 上游版本：`0.15.44`
- 移植日期：`2026-11-19`
