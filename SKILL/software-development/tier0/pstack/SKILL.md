---
name: pstack
description: Host-neutral pstack work kit for rigorous, evidence-based delivery. Use when the user says pstack, poteto-mode, 按 pstack 规矩做, 严谨工作流, 验证 skill, 证据交付, 团队规矩, or wants humans and multiple agents to follow one engineering workflow without Cursor, Claude Code, Grok, or a plugin runtime. Ships the full rules, 22 playbooks, 24 principles, host adapters, task templates, and an evidence checker.
version: 0.1.0
---

# pstack work kit

This is a host-neutral port of pstack. It is not a summary of pstack. The full
upstream rule text lives under `references/upstream/`, and every rule you apply
must be read from its leaf file. The kit adds the parts a plugin runtime used to
provide: a single entry point, a host adapter, a human-readable team contract, a
task workspace, and a checker that makes "done" mean something.

Works without Cursor, Claude Code, Grok, a plugin marketplace, `poteto-agent`
types, `~/.cursor/rules`, or model-slug routing. If the host has subagents,
MCP, model selection, or a PR tool, the adapter uses them. If it does not, the
adapter degrades explicitly and records the gap.

## Mandatory read order

Before any non-trivial task:

1. Read `RULES.md` in full. It is the human and agent contract.
2. Read `HOST-ADAPTER.md` in full. It maps Cursor and Claude Code names to
   host-neutral actions and defines the fallback for missing capabilities.
3. Read `references/skills-index.md` and pick the entry skill for the task.
4. Read the matched playbook in full under
   `references/upstream/skills/poteto-mode/playbooks/`.
5. Read the full leaf for every principle you apply under
   `references/upstream/skills/` 下的 `principle-<name>/RULE.md`.
6. Read `TEAM.md` if a human will review, approve, or maintain the work.

Do not cite a principle you have not read this session. Do not substitute the
index for the leaf. Do not skip the host adapter because the task "looks
simple".

## First action: create a task workspace

Run this from the repository root:

```bash
node <pstack>/scripts/pstack.mjs new-task <task-id> --title "<short title>"
```

Then fill `.pstack/tasks/<task-id>/task.md` before writing code or changing
state. The task file is the contract. It needs:

- goal, in one sentence, with the user-visible outcome
- scope and non-goals
- acceptance criteria, each one checkable
- owner and risk tier (green, yellow, red)
- deadline or review point, if any

Write the plan in `plan.md` after selecting a playbook. Copy the playbook steps
into the task list. Do not improvise a shorter process.

## Execution rules

- Restate the user's goal and the smallest change that meets it before starting.
- Match the task to one of the 22 playbooks. If none fits, use the
  `figure-it-out` skill.
- Name the data shape before writing code. Use `architect` across a function
  boundary, `swarm` for fan-out, `arena` for a bakeoff, and `interrogate` for a
  contested design.
- Write evidence as you go into `.pstack/tasks/<task-id>/evidence/`. Evidence
  means command output with exit codes, test logs, screenshots or video,
  measured numbers with method, and reproduction steps. "I ran it" is not
  evidence.
- Use a subagent only when the host supports it. Give every subagent a fresh
  brief whose first line is `Read <pstack>/references/upstream/skills/poteto-mode/worker.md before anything else.`
  If the host has no subagents, follow `HOST-ADAPTER.md` and write `roles.md`.
- Never claim completion before `node <pstack>/scripts/pstack.mjs check <task-id>`
  exits zero.

## Definition of done

A task is done only when all of these are true:

1. Every acceptance criterion in `task.md` is met.
2. `evidence/` contains reproducible evidence, and `result.md` links to it.
3. `node <pstack>/scripts/pstack.mjs check <task-id>` passes.
4. User-visible behavior changes have an updated feature map or verification
   skill entry.
5. Risks and rollback are written down.
6. No review thread is left unresolved.

Otherwise write `blocked.md` with the missing information and stop. A blocked
task is honest. A "basically done" task is not.

## Human and team use

- `RULES.md` is the canonical rulebook. It is written so a person can follow it
  without an agent.
- `TEAM.md` defines the human roles, gates, evidence standard, and weekly
  maintenance.
- `README.md` is the five-minute onboarding.
- `models.md` is the role-to-model table. It is advisory. If the host cannot
  select a model, use the host default and record that in `.pstack/host.md`.

## File map

| Path | What it is |
|---|---|
| `RULES.md` | Canonical non-negotiables, principles index, autonomy, subagents, writing, playbook routing |
| `TEAM.md` | Human roles, gates, evidence standard, definition of done, maintenance |
| `HOST-ADAPTER.md` | Capability probe and Cursor/Claude Code to host-neutral translation |
| `models.md` | Role-to-model and effort defaults, with fallbacks |
| `references/upstream/` | Full upstream pstack text. Inner `SKILL.md` files are renamed `RULE.md` |
| `references/playbooks-index.md` | 22 playbooks and when to use each |
| `references/principles-index.md` | 24 principles and the full leaf path |
| `references/skills-index.md` | 58 entry skills and their leaf paths |
| `references/templates/` | Task, plan, result, roles, blocked, PR, feature-map, verification-skill templates |
| `scripts/pstack.mjs` | Task scaffolding, checker, status |
| `examples/sample-task/` | A filled example that passes the checker |
| `PROVENANCE.md` | Upstream commit, license, modifications, re-sync procedure |

## Non-negotiables that are easy to get wrong

- Do not flatten pstack into many standalone skills. The kit is one skill with
  reference files, so sibling paths keep working and leaf names stay unique.
- Do not run upstream scripts blindly. They are copied as reference and are not
  audited for your host. The kit's own `scripts/pstack.mjs` is the executable
  contract.
- Do not let a subagent run the whole playbook. The main thread owns the
  playbook and the task list.
- Do not replace evidence with confidence. If you cannot run the check, say so
  and mark the task blocked.

## Upstream and license

Upstream: `https://github.com/cursor/plugins/tree/main/pstack` at commit
`e58dd043600587dbaf58ba315e7f2b38373eeb43`, version `0.15.44`, MIT.
See `PROVENANCE.md` and `LICENSE`.
