# AgentSkillsVault — Operational Knowledge

Findings from live system inspection (2026-07-22). Captured to prevent
re-discovery of the same facts across sessions.

## Skills Used by Active Cron Jobs

| Skill | Cron Job | Campaign |
|-------|----------|----------|
| kanban-orchestrator | 91fa984e4eba (caretaker, every 5m) | AgentMOD |
| kanban-orchestrator | b993a016ddb6 (caretaker, every 5m) | AISides |
| kanban-orchestrator | bc109fa9f0de (caretaker, every 5m, PAUSED) | PKB |
| kanban-cron-overseer | f2f3fe05f90a (overseer, every 15m) | AgentMOD |
| aisides-ai-self-review | b993a016ddb6 (AISides caretaker) | AISides |

All three skills are now mirrored in this vault, byte-identical to the
installed copies under `~/AppData/Local/hermes/skills/`.

## Claude CLI for Coding — NOT Adopted by Workers

Claude Code CLI IS installed on the host:
- Binary: `/c/Users/XINDONG/AppData/Roaming/npm/claude`
- Version: 2.1.114 (Claude Code)

The `claude-code-worker-delegation` skill EXISTS in the default profile
and documents exactly how a worker should call `claude -p` (print mode)
for mechanical coding subtasks. However, it is NOT installed in any
worker profile:

| Worker Profile | Skills Installed |
|----------------|-----------------|
| modplanner | kanban-orchestrator, kanban-worker |
| modbuilder | kanban-orchestrator, kanban-worker |
| modauditor | kanban-orchestrator, kanban-worker |
| modverifier | kanban-orchestrator, kanban-worker |
| modoverseer | kanban-orchestrator, kanban-worker |

`claude-code-worker-delegation` is absent from all five. Workers code
with their own Hermes model (z-ai/glm-5.2), not Claude CLI.

The cron jobs themselves (caretakers + overseer) have
`enabled_toolsets: ["terminal", "file"]` but are orchestration/oversight
roles, not coding roles. The skill explicitly states: "NOT for
cron/overseer sessions (those are file-only by tirith design)."

## Parallelism — Configured YES, Active NO

Kanban config (from `C:\Users\XINDONG\AppData\Local\hermes\config.yaml`):

```
kanban:
  dispatch_in_gateway: true
  dispatch_interval_seconds: 30    # fast ticks (default 60)
  failure_limit: 2
  max_spawn: 5                     # workers per tick per board
  max_in_progress: 10             # global cap
  max_in_progress_per_profile: 4  # same profile across boards
  auto_decompose: true
  auto_decompose_per_tick: 3
  dispatch_stale_timeout_seconds: 14400  # 4h stale reclaim
```

This ALLOWS parallelism — up to 4 tasks per profile running
simultaneously, up to 10 globally. But live board state (as of
2026-07-22) shows NO active parallelism:

### AgentMOD board (agentmod-human-mindset)
- 1 running (modplanner, A.032 R2)
- 0 ready, 0 todo, 0 blocked
- Single serial chain, not parallel
- Previous parallel chains (A.028 R1 + A.029 B-EXIT-03 + A.030
  B-EXIT-04) have ALL completed

### AISides board (aisides-mvp-v2-completeness)
- 1 running (modauditor, M8 repair 9 audit)
- 1 ready (modverifier — queued, waiting for auditor)
- 1 todo (modoverseer — waiting for verifier)
- Standard serial 5-role chain (audit → verify → oversee)

### PKB board (pkb-mvp-v2)
- Drained. Caretaker cron PAUSED since 2026-07-17.

## Delegation Config

```
delegation:
  max_concurrent_children: 3
  max_spawn_depth: 1       # orchestrator allowed but nesting OFF
  orchestrator_enabled: true
  max_iterations: 50
  inherit_mcp_toolsets: true
```

## Host Environment

- Host: Windows 10
- User home: C:\Users\XINDONG
- Hermes home: C:\Users\XINDONG\AppData\Local\hermes\
- Config: C:\Users\XINDONG\AppData\Local\hermes\config.yaml
- Active model: z-ai/glm-5.2 (provider: custom)
- PostgreSQL 17.10 on 127.0.0.1:5432
- Claude Code CLI v2.1.114 (not used by workers)

## Worker Profiles

Five worker profiles under `~/.hermes/profiles/`:
- modplanner, modbuilder, modauditor, modverifier, modoverseer
- Each has its own skills/ tree (profile skill isolation)
- Skills installed to the default profile are invisible to workers
- After creating/patching a worker skill, copy to each worker:
  `cp -r ~/.hermes/skills/devops/<name> ~/.hermes/profiles/<worker>/skills/devops/<name>`
- Verify: `hermes -p <worker> skills list | grep <name>`

## Vault Layout

Grouped by category as of 2026-08-08. Earlier revisions dumped skills
flat at the repo root; category folders now own them.

```
AgentSkillsVault/
├── README.md
├── KNOWLEDGE.md                      ← this file
├── devops/
│   ├── kanban-orchestrator/          (10 refs + 1 template + SKILL.md)
│   ├── kanban-cron-overseer/         (1 ref + SKILL.md)
│   └── cron-pipeline-state-machine/  (2 refs + SKILL.md)
├── software-development/
│   └── aisides-ai-self-review/       (3 refs + SKILL.md)
├── FDE/                              ← NEW 2026-08-08
│   └── book-chapter-to-vault/        (4 refs + 2 scripts + worked example + SKILL.md)
└── game-dev/
    ├── cat-game-architecture/        (3 refs + SKILL.md)
    ├── kimi3-game-gen/               (5 refs + 1 asset + 1 script + SKILL.md)
    ├── gdd-markdown-template/        (SKILL.md + 26 section assets)
    ├── technical-design-document/    (1 ref + 13 doc assets + SKILL.md)
    └── webapp-testing/               (3 examples + 1 script + SKILL.md)
```

Install procedure (local-copy, not hub):
1. `cp -r <category>/<skill-dir> ~/AppData/Local/hermes/skills/<category>/<skill-name>/`
2. Verify: `skill_view(name='<skill-name>')` returns `readiness_status: available`
3. Verify: `hermes skills list | grep <skill-name>` shows `Status: enabled`
4. For worker profiles: copy to `~/.hermes/profiles/<worker>/skills/<category>/`
