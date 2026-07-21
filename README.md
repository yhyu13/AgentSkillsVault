# AgentSkillsVault

Personal vault of Hermes Agent skills sourced from local filesystem
(not the hub). Each skill is a directory containing `SKILL.md` plus
optional `references/`, `templates/`, `scripts/` subdirs.

## Skills

| Skill | Category | Used By |
|-------|----------|---------|
| kanban-orchestrator | devops | AgentMOD caretaker, AISides caretaker, PKB caretaker |
| kanban-cron-overseer | devops | AgentMOD overseer |
| aisides-ai-self-review | software-development | AISides caretaker |
| cron-pipeline-state-machine | devops | (reference pattern) |

See [KNOWLEDGE.md](KNOWLEDGE.md) for operational findings: Claude CLI
adoption status, parallelism config, worker profile setup, and live
board state.

## Install to Hermes

```bash
# Default profile
cp -r <skill-dir> ~/AppData/Local/hermes/skills/<category>/<skill-name>/

# Worker profiles (each has isolated skills/)
cp -r <skill-dir> ~/.hermes/profiles/<worker>/skills/<category>/<skill-name>/

# Verify
skill_view(name='<skill-name>')
hermes skills list | grep <skill-name>
```

## Sync Back to Vault

When installed skills are updated, sync back:

```bash
# From installed location to vault
cp -r ~/AppData/Local/hermes/skills/<category>/<skill-name>/ \
  /d/GitRepo-My/AgentSkillsVault/<skill-name>/

# Verify byte-identical
diff -rq <vault-copy> <installed-copy>
```
