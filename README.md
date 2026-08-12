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
├── devops/                          ← orchestration, kanban, cron pipelines
│   ├── kanban-orchestrator/
│   ├── kanban-cron-overseer/
│   └── cron-pipeline-state-machine/
├── software-development/            ← code review, self-review, research analysis
│   ├── aisides-ai-self-review/
│   └── technical-research-analysis-doc/  ← TorchLight 调研分析文档格式 (背景→结论先行→影响链条→mermaid→方案对比)
├── FDE/                             ← Forward Deployed Engineer / personal knowledge workflows
│   ├── book-chapter-to-vault/       ← .docx book chapter → learning notes + cheatsheet + kanban + mindmap
│   └── analysis-to-vault/           ← long-form analytical article → thesis + argument map + cheatsheet + day-job notes
└── game-dev/                        ← game design + 3D/web game tooling
    ├── cat-game-architecture/
    ├── kimi3-game-gen/
    ├── gdd-markdown-template/
    ├── intro-scene-until-perfect/
    ├── phaser-gamedev/
    ├── playwright-testing/
    ├── single-file-html-game/
    ├── technical-design-document/
    ├── three-pbr-workflow/
    └── webapp-testing/
```

## Skills

| Skill | Category | Used By |
|-------|----------|---------|
| devops/kanban-orchestrator | devops | AgentMOD caretaker, AISides caretaker, PKB caretaker |
| devops/kanban-cron-overseer | devops | AgentMOD overseer |
| devops/cron-pipeline-state-machine | devops | (reference pattern) |
| software-development/aisides-ai-self-review | software-development | AISides caretaker |
| software-development/technical-research-analysis-doc | software-development | UE pak/打包/热更/渲染 调研 → TorchLight 格式分析文档（背景→结论先行→影响链条→mermaid→方案对比） |
| FDE/book-chapter-to-vault | FDE | .docx book chapter → learning notes + cheatsheet + kanban + mindmap |
| FDE/analysis-to-vault | FDE | long-form analytical article → thesis + argument map + day-job notes |
| game-dev/cat-game-architecture | game-dev | C.A.T / GDC 2026 AI-driven 3D game refactor |
| game-dev/kimi3-game-gen | game-dev | KIMI3 vibecoding-webapp-swarm (parallel coder agents) |
| game-dev/gdd-markdown-template | game-dev | 13-section GDD scaffold |
| game-dev/intro-scene-until-perfect | game-dev | scope-cut to ONE scene + infinite polish loop (GDD + Art Book + Code Book) |
| game-dev/phaser-gamedev | game-dev | Phaser 3 2D games: scenes, sprites, physics, tilemaps, animations |
| game-dev/playwright-testing | game-dev | Playwright MCP / Vitest / Jest frontend + canvas game testing |
| game-dev/single-file-html-game | game-dev | mini-browser-games style single-file HTML games + tier audit |
| game-dev/technical-design-document | game-dev | TDD scaffold (engineering counterpart to GDD) |
| game-dev/three-pbr-workflow | game-dev | token-friendly Three.js PBR scene scaffolding |
| game-dev/webapp-testing | game-dev | Playwright verification of running web game |

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