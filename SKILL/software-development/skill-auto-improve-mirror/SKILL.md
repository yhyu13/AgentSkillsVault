---
name: skill-auto-improve-mirror
description: Use when improving or mirroring skills across harnesses.
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [skills, mirror, agent-skills, kilo-code, interoperability]
    related_skills: [hermes-agent, hermes-agent-skill-authoring]
---

# Skill Auto-Improve & Mirror

## When to Use

Use this skill when you need to: (1) improve an existing skill in place with
versioning, (2) mirror Hermes skills into the cross-tool `~/.agents/skills/`
location so other Agent-Skills-spec harnesses (Kilo Code, Cursor, Claude Code)
pick them up, or (3) reconcile a divergence between a Hermes skill and its
mirrored copy.

Improve Hermes skills in place and propagate them to other harnesses that
implement the Agent Skills spec (Kilo Code, Cursor, Claude Code, etc.) via the
cross-tool `~/.agents/skills/` location.

## Core rules (non-negotiable)

1. **Improve in place.** Edit the existing SKILL.md; NEVER rename the skill or
   create a parallel copy. `name` must equal the parent folder name.
2. **Version = `metadata.version` (label) + git (history).** The spec has no
   first-class `version` field; its only sanctioned slot is `metadata` (an
   arbitrary string map). Hermes top-level `version` is ignored by other
   harnesses, so move it under `metadata` on mirror.
3. **Bump `metadata.version` (semver) after every improvement.**
4. **Never clobber target-side edits.** If `~/.agents/skills/<name>/` diverged
   locally, flag a CONFLICT instead of overwriting.

## Steps

1. Read the existing skill first (`skill_view`), then patch in place
   (`skill_manage(action='patch')`).
2. Bump `metadata.version`.
3. Mirror to other harnesses:
   ```
   python3 scripts/mirror_agent_skills.py --dry-run
   python3 scripts/mirror_agent_skills.py --apply
   ```
4. Read the report table; for any CONFLICT, reconcile manually (compare bodies,
   pick the correct merge, bump version).

## Mirror script usage

```
python3 scripts/mirror_agent_skills.py [--source DIR] [--target DIR] [--apply] [--dry-run]
```

- `--source`  Hermes skills tree (auto-detected: `$HERMES_HOME/skills`,
  `~/.hermes/skills`, `%LOCALAPPDATA%\hermes\skills`).
- `--target`  default `~/.agents/skills/` (cross-tool: Kilo Code, Cursor, Claude Code).
- `--dry-run` (default) preview only; `--apply` actually writes.

The script copies the WHOLE skill directory (scripts/, references/, assets/),
not just SKILL.md, and normalizes the frontmatter.

## Reconciliation logic

| state | action |
|---|---|
| target missing | COPY |
| source version > target | UPDATE (patch body in place) |
| target version > source | SKIP (target ahead) |
| equal versions, different body | CONFLICT (don't overwrite) |
| equal | UNCHANGED |

## Triggers

- **Manual:** run the script.
- **Auto-improve loop:** run the mirror immediately after any skill_manage patch.
- **Scheduled:** `no_agent=true` cron running the script every ~15-30m
  (idempotent, cheap, writes only on change).

## Pitfalls

- Kilo Code hard-requires `name` == dirname; flatten Hermes category subdirs
  into flat `<name>/` folders.
- Move Hermes top-level `version` → `metadata.version` on mirror.
- Copy the full dir (scripts/references/assets), not just SKILL.md.
- Bash `python` may be 2.7 in some venvs — use `python3`.

## Verification

- Re-run `--dry-run`; confirm the table shows UNCHANGED / expected actions.
- Confirm target files exist: `ls ~/.agents/skills/<name>/SKILL.md`.
