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
├── software-development/            ← code review, self-review
│   └── aisides-ai-self-review/
├── FDE/                             ← Forward Deployed Engineer / personal knowledge workflows
│   ├── book-chapter-to-vault/       ← .docx book chapter → learning notes + cheatsheet + kanban + mindmap
│   └── analysis-to-vault/           ← long-form analytical article → thesis + argument map + cheatsheet + day-job notes
└── game-dev/                        ← game design + 3D/web game tooling
    ├── cat-game-architecture/
    ├── kimi3-game-gen/
    ├── gdd-markdown-template/
    ├── single-file-html-game/
    ├── technical-design-document/
    └── webapp-testing/
```

## Skills

| Skill | Category | Used By |
|-------|----------|---------|
| devops/kanban-orchestrator | devops | AgentMOD caretaker, AISides caretaker, PKB caretaker |
| devops/kanban-cron-overseer | devops | AgentMOD overseer |
| devops/cron-pipeline-state-machine | devops | (reference pattern) |
| software-development/aisides-ai-self-review | software-development | AISides caretaker |
| FDE/book-chapter-to-vault | FDE | .docx book chapter → learning notes + cheatsheet + kanban + mindmap |
| FDE/analysis-to-vault | FDE | long-form analytical article → thesis + argument map + day-job notes |
| game-dev/cat-game-architecture | game-dev | C.A.T / GDC 2026 AI-driven 3D game refactor |
| game-dev/kimi3-game-gen | game-dev | KIMI3 vibecoding-webapp-swarm (parallel coder agents) |
| game-dev/gdd-markdown-template | game-dev | 13-section GDD scaffold |
| game-dev/single-file-html-game | game-dev | mini-browser-games style single-file HTML games + tier audit |
| game-dev/technical-design-document | game-dev | TDD scaffold (engineering counterpart to GDD) |
| game-dev/webapp-testing | game-dev | Playwright verification of running web game |

See [KNOWLEDGE.md](KNOWLEDGE.md) for operational findings: Claude CLI
adoption status, parallelism config, worker profile setup, and live
board state.

## Install to Hermes

```bash
# Default profile (skill path includes category)
cp -r <category>/<skill-dir> ~/AppData/Local/hermes/skills/<category>/<skill-name>/

# Worker profiles (each has isolated skills/)
cp -r <category>/<skill-dir> ~/.hermes/profiles/<worker>/skills/<category>/<skill-name>/

# Verify
skill_view(name='<skill-name>')
hermes skills list | grep <skill-name>
```

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