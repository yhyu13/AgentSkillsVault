# AgentSkillsVault

Personal vault of Agent skills sourced from local filesystem
(not the hub). Skills are grouped by category; each category folder
contains one directory per skill with `SKILL.md` plus optional
`references/`, `templates/`, `assets/`, `scripts/`, `examples/`
subdirs.

## Layout

```
AgentSkillsVault/
├── README.md
├── KNOWLEDGE.md
├── agents/                          ← agent autonomy & persistence patterns
│   ├── goal-persistence/            ← Codex product contract (row + idle + anti-drift)
│   └── goal-design-principles/      ← DSH harness architecture (plugins, fold, CAS, phase≠activation)
├── devops/                          ← orchestration, kanban, cron pipelines
│   ├── kanban-orchestrator/
│   ├── kanban-cron-overseer/
│   └── cron-pipeline-state-machine/
├── software-development/            ← code review, self-review, research analysis
│   ├── aisides-ai-self-review/
│   ├── technical-research-analysis-doc/  ← TorchLight 调研分析文档格式 (背景→结论先行→影响链条→mermaid→方案对比)
│   └── journey/                     ← two-column ME/YOU project history + vibe-coding lessons
├── FDE/                             ← Forward Deployed Engineer / personal knowledge workflows
│   ├── book-chapter-to-vault/       ← .docx book chapter → learning notes + cheatsheet + kanban + mindmap
│   └── analysis-to-vault/           ← long-form analytical article → thesis + argument map + cheatsheet + day-job notes
├── game-dev/                        ← game design + 3D/web game tooling
    ├── cat-game-architecture/
    ├── guide-from-probes/           ← deterministic E2E probes → playthrough guide (no screenshots needed)
    ├── kimi3-game-gen/
    ├── gdd-markdown-template/
    ├── intro-scene-until-perfect/
    ├── phaser-gamedev/
    ├── playwright-testing/
    ├── render-quality-loop/         ← screenshot sweep → render-quality evaluation → improve loop
    ├── single-file-html-game/
    ├── technical-design-document/
    ├── three-pbr-workflow/
    └── webapp-testing/
├── math/                            ← rigorous math proof generation + adversarial audit
│   └── rigorous-proof/
├── management/                      ← 职场向上汇报 (ManageUp) + 管理方法论 (mgmt-skill) + 角色顾问
    ├── manage-up-core/ + 14 汇报技能 (weekly-report, project-update, style-* 等)
    ├── mgmt-discipline/ mgmt-individual/ mgmt-org/  (方法论知识库)
    └── bezos-advisor/ god-leader-advisor/ renzhengfei-advisor/ zhangyiming-advisor/  (角色顾问)
└── content/                         ← 博客/长文 → 社媒内容再利用 (Content Repurposing)
    ├── blog-to-twitter-post/
    ├── blog-to-linkedin-post/
    ├── long-blog-to-viral-social-posts/
    ├── tech-design-to-zhihu/        ← 技术设计稿 → 知乎专栏（无 mermaid，出 PNG）
    ├── gracker-writing/             ← 技术文章写作（准确/有用/易读，Android/性能优化长文）
    ├── social-push/                 ← 一句话发布内容到多平台（小红书/X/知乎/微博/微信/掘金/Linux.do）
    └── agent-browser/               ← agent-browser CLI 浏览器自动化（social-push 依赖）
```

## Skills

| Skill | Category | Used By |
|-------|----------|---------|
| agents/goal-persistence | agents | persistent goal: durable state + idle self-start + anti-drift steering + resume |
| agents/goal-design-principles | agents | DSH goal harness: plugins on a capability seam, event-sourced fold, CAS, phase ≠ activation, runtime authority |
| devops/kanban-orchestrator | devops | AgentMOD caretaker, AISides caretaker, PKB caretaker |
| devops/kanban-cron-overseer | devops | AgentMOD overseer |
| devops/cron-pipeline-state-machine | devops | (reference pattern) |
| software-development/aisides-ai-self-review | software-development | AISides caretaker |
| software-development/technical-research-analysis-doc | software-development | UE pak/打包/热更/渲染 调研 → TorchLight 格式分析文档（背景→结论先行→影响链条→mermaid→方案对比） |
| software-development/journey | software-development | two-column ME/YOU project history + vibe-coding lessons |
| FDE/book-chapter-to-vault | FDE | .docx book chapter → learning notes + cheatsheet + kanban + mindmap |
| FDE/analysis-to-vault | FDE | long-form analytical article → thesis + argument map + day-job notes |
| game-dev/cat-game-architecture | game-dev | C.A.T / GDC 2026 AI-driven 3D game refactor |
| game-dev/guide-from-probes | game-dev | deterministic E2E probes (assertions = ground truth) → human-readable playthrough guide |
| game-dev/kimi3-game-gen | game-dev | KIMI3 vibecoding-webapp-swarm (parallel coder agents) |
| game-dev/gdd-markdown-template | game-dev | 13-section GDD scaffold |
| game-dev/intro-scene-until-perfect | game-dev | scope-cut to ONE scene + infinite polish loop (GDD + Art Book + Code Book) |
| game-dev/phaser-gamedev | game-dev | Phaser 3 2D games: scenes, sprites, physics, tilemaps, animations |
| game-dev/playwright-testing | game-dev | Playwright MCP / Vitest / Jest frontend + canvas game testing |
| game-dev/render-quality-loop | game-dev | screenshot sweep → honest render-quality evaluation → improve code loop |
| game-dev/single-file-html-game | game-dev | mini-browser-games style single-file HTML games + tier audit |
| game-dev/technical-design-document | game-dev | TDD scaffold (engineering counterpart to GDD) |
| game-dev/three-pbr-workflow | game-dev | token-friendly Three.js PBR scene scaffolding |
| game-dev/webapp-testing | game-dev | Playwright verification of running web game |
| math/rigorous-proof | math | rigorous math proof generation + adversarial audit (theorem → complete proof → compilable LaTeX) |
| management/manage-up-core | management | ManageUp 核心方法论（反空话五大原则：BLUF/数据锚定/So-What/行动导向/校准语言） |
| management/weekly-report | management | 数据驱动周报/月报 |
| management/project-update | management | 项目进展汇报（红绿灯+风险矩阵） |
| management/performance-review | management | 绩效自评/述职 |
| management/proposal | management | 提案/资源申请（ROI + 不行动代价） |
| management/meeting-summary | management | 会议纪要（聚焦决策与行动项） |
| management/quarterly-review | management | 季度复盘/QBR（记分卡+根因分析） |
| management/upward-email | management | 向上汇报邮件 |
| management/one-on-one-prep | management | 1:1 沟通准备 |
| management/style-bytedance / alibaba / tencent / google / amazon / microsoft | management | 大厂汇报风格（OKR/双轨制/指标/LP/Connects） |
| management/mgmt-discipline | management | 15 管理学科横切方法论知识库 |
| management/mgmt-individual | management | 管理大师/实践者个人方法论（德鲁克/波特/科特勒等） |
| management/mgmt-org | management | 17 标杆企业组织方法论（华为/字节/亚马逊/丰田等） |
| management/bezos-advisor / god-leader-advisor / renzhengfei-advisor / zhangyiming-advisor | management | 角色化管理顾问 |
| content/blog-to-twitter-post | content | 博客 → Twitter/X 帖子（源锚定 + 趋势 + 平台规则 + 视觉简报） |
| content/blog-to-linkedin-post | content | 博客 → LinkedIn 思想领导力帖子（3 版本 + 推荐） |
| content/long-blog-to-viral-social-posts | content | 长文 → 病毒式社媒帖子（钩子模板 + 平台规则） |
| content/tech-design-to-zhihu | content | 技术设计稿 → 知乎专栏：说人话、多 PNG、TL;DR + 收获结论 + PS/PPS/PPPS |
| content/gracker-writing | content | 技术文章写作：准确/有用/易读，翻译腔修正 + 四层质检（Android/性能优化/Perfetto） |
| content/social-push | content | 一句话发布内容到多平台（小红书/X/知乎/微博/微信/掘金/Linux.do），基于 agent-browser |
| content/agent-browser | content | agent-browser CLI 浏览器自动化（快照/ref/登录态，social-push 依赖） |

See [KNOWLEDGE.md](KNOWLEDGE.md) for operational findings: Claude CLI
adoption status, parallelism config, worker profile setup, and live
board state.

## Installation

Every skill is a complete directory containing `SKILL.md` and, when present, its
`references/`, `scripts/`, `templates/`, `assets/`, and `examples/`. Always copy
the whole skill directory. Copying only `SKILL.md` can leave broken links and
missing helper scripts.

The examples below install one skill. Replace `<category>` and `<skill-name>`
with a vault path such as `game-dev/phaser-gamedev`.

### Quick reference

| CLI / agent | Project-level destination | User/global destination | Refresh / verify |
|---|---|---|---|
| Claude Code | `<project>/.claude/skills/<skill-name>/` | `~/.claude/skills/<skill-name>/` | Start a new session or reload Claude Code |
| Codex CLI | `<project>/.codex/skills/<skill-name>/` | `~/.codex/skills/<skill-name>/` | Start a new Codex session |
| Kilo Code CLI | `<project>/.kilo/skills/<skill-name>/` | `~/.kilo/skills/<skill-name>/` | Run `/reload` or start a new session |
| Hermes Agent | N/A; use an external directory for shared project skills | `~/.hermes/skills/<category>/<skill-name>/` | `hermes skills list` |
| Portable Agent Skills | `<project>/.agents/skills/<skill-name>/` | `~/.agents/skills/<skill-name>/` | Restart the compatible agent host |

> **Windows:** `~` means your user profile directory, normally
> `C:\Users\<you>`. Git Bash examples can use `/d/GitRepo-AI/AgentSkillsVault`;
> PowerShell examples should use `D:\GitRepo-AI\AgentSkillsVault`.

### Claude Code

Project installation (recommended for repository-specific skills):

```powershell
$Vault = "D:\GitRepo-AI\AgentSkillsVault"
$Project = "C:\path\to\project"
$Skill = "game-dev\phaser-gamedev"
$Name = Split-Path $Skill -Leaf
New-Item -ItemType Directory -Force "$Project\.claude\skills" | Out-Null
Copy-Item -Recurse -Force "$Vault\$Skill" "$Project\.claude\skills\$Name"
```

Global installation for all projects:

```powershell
$Vault = "D:\GitRepo-AI\AgentSkillsVault"
$Skill = "game-dev\phaser-gamedev"
$Name = Split-Path $Skill -Leaf
New-Item -ItemType Directory -Force "$HOME\.claude\skills" | Out-Null
Copy-Item -Recurse -Force "$Vault\$Skill" "$HOME\.claude\skills\$Name"
```

Reload Claude Code or begin a new session after installation. A project may
intentionally ignore `.claude/`; check `git status` if the skill should be
shared with the team.

### Codex CLI

Project installation:

```powershell
$Vault = "D:\GitRepo-AI\AgentSkillsVault"
$Project = "C:\path\to\project"
$Skill = "game-dev\phaser-gamedev"
$Name = Split-Path $Skill -Leaf
New-Item -ItemType Directory -Force "$Project\.codex\skills" | Out-Null
Copy-Item -Recurse -Force "$Vault\$Skill" "$Project\.codex\skills\$Name"
```

Global installation:

```powershell
$Vault = "D:\GitRepo-AI\AgentSkillsVault"
$Skill = "game-dev\phaser-gamedev"
$Name = Split-Path $Skill -Leaf
New-Item -ItemType Directory -Force "$HOME\.codex\skills" | Out-Null
Copy-Item -Recurse -Force "$Vault\$Skill" "$HOME\.codex\skills\$Name"
```

Start a new Codex session so it rescans the skill directories.

### Kilo Code CLI

Install the CLI if needed:

```bash
npm install -g @kilocode/cli
```

Project installation:

```powershell
$Vault = "D:\GitRepo-AI\AgentSkillsVault"
$Project = "C:\path\to\project"
$Skill = "game-dev\phaser-gamedev"
$Name = Split-Path $Skill -Leaf
New-Item -ItemType Directory -Force "$Project\.kilo\skills" | Out-Null
Copy-Item -Recurse -Force "$Vault\$Skill" "$Project\.kilo\skills\$Name"
```

Global installation:

```powershell
$Vault = "D:\GitRepo-AI\AgentSkillsVault"
$Skill = "game-dev\phaser-gamedev"
$Name = Split-Path $Skill -Leaf
New-Item -ItemType Directory -Force "$HOME\.kilo\skills" | Out-Null
Copy-Item -Recurse -Force "$Vault\$Skill" "$HOME\.kilo\skills\$Name"
```

Kilo also discovers `.agents/skills/` by default and can read
`.claude/skills/` when Claude Code compatibility is enabled. Run `/reload` in
Kilo after copying a skill. For a shared vault without copying files, add an
absolute path under `skills.paths` in `kilo.jsonc`:

```jsonc
{
  "skills": {
    "paths": ["D:/GitRepo-AI/AgentSkillsVault/game-dev"]
  }
}
```

### Hermes Agent

Hermes uses `~/.hermes/skills/` as its primary skill store and supports
category directories:

```powershell
$Vault = "D:\GitRepo-AI\AgentSkillsVault"
$Category = "game-dev"
$Name = "phaser-gamedev"
New-Item -ItemType Directory -Force "$HOME\.hermes\skills\$Category" | Out-Null
Copy-Item -Recurse -Force "$Vault\$Category\$Name" "$HOME\.hermes\skills\$Category\$Name"
```

Verify discovery:

```bash
hermes skills list
```

To let Hermes read the vault directly instead of maintaining copies, add the
category directories you use to `~/.hermes/config.yaml`:

```yaml
skills:
  external_dirs:
    - D:/GitRepo-AI/AgentSkillsVault/game-dev
    - D:/GitRepo-AI/AgentSkillsVault/devops
    - D:/GitRepo-AI/AgentSkillsVault/software-development
    - D:/GitRepo-AI/AgentSkillsVault/FDE
```

Hermes can modify skills in writable external directories. Keep the vault in
Git and review changes before committing. If a skill is published through a
supported Hermes Hub or URL source, prefer `hermes skills inspect` followed by
`hermes skills install`; manually copied vault skills can still be listed and
loaded normally.

### Portable `.agents/skills` installation

For hosts supporting the open Agent Skills compatibility directory, install
project skills under `.agents/skills/`:

```powershell
$Vault = "D:\GitRepo-AI\AgentSkillsVault"
$Project = "C:\path\to\project"
$Skill = "game-dev\phaser-gamedev"
$Name = Split-Path $Skill -Leaf
New-Item -ItemType Directory -Force "$Project\.agents\skills" | Out-Null
Copy-Item -Recurse -Force "$Vault\$Skill" "$Project\.agents\skills\$Name"
```

This is useful when one repository is used with multiple compatible agents.
Support and precedence vary by host, so use a host-native directory when exact
behavior matters.

### Install an entire category

The following PowerShell helper copies every immediate skill directory that
contains a `SKILL.md`:

```powershell
$Vault = "D:\GitRepo-AI\AgentSkillsVault"
$Category = "game-dev"
$Destination = "$HOME\.claude\skills" # Change for Codex, Kilo, etc.
New-Item -ItemType Directory -Force $Destination | Out-Null
Get-ChildItem "$Vault\$Category" -Directory | Where-Object {
  Test-Path (Join-Path $_.FullName "SKILL.md")
} | ForEach-Object {
  Copy-Item -Recurse -Force $_.FullName (Join-Path $Destination $_.Name)
}
```

### Dependencies, MCP servers, and plugins

Skills provide instructions; they do not automatically install the tools they
describe. Read each skill's `SKILL.md`, `README.md`, or adjacent installation
guide and install only the required dependencies. For example, the Phaser
skills have a dedicated [installation guide](game-dev/PHASER-SKILLS-INSTALL.md)
covering Playwright MCP, Pillow, and Phaser.

Review third-party scripts and MCP servers before enabling them. Do not copy
credentials, private assets, generated caches, or machine-specific secrets into
the vault.

## Sync Back to Vault

When installed skills are updated, sync back to the correct category
folder:

```bash
# From installed location to vault
cp -r ~/AppData/Local/hermes/skills/<category>/<skill-name>/ \
  /d/GitRepo-My/AgentSkillsVault/<category>/<skill-name>/

# Verify byte-identical
diff -rq <vault-copy> <installed-copy>
```