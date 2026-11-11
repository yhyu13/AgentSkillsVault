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

## Skill store incident — 4 Kimi v1 game skills lost (2026-11-05, found 2026-11-08)

While extending the junction layout to 10 more harness stores, four HOST skills
(`blender-game-assets`, `engine-project-agent`, `game-liveops-assist`,
`game-proto-validation`) were found as **self-referential junction cycles**:

```
~/.claude/skills/<name>  -> ~/.agents/skills/<name>    (since 2026-11-03)
~/.agents/skills/<name>  -> ~/.claude/skills/<name>    (since 2026-11-05 06:59)
```

- Both ends are junctions; no real directory exists anywhere on disk (searched
  `C:\Users\yuhang` and `D:\GitRepo-AI`, max depth 7). The content is gone.
- Cause: the old HOST branch in `sync-skills.ps1` called `Ensure-Junction`, which
  deletes a non-junction directory before creating the link. The real dir lived in
  `~/.agents`, so it was deleted and replaced with a link back to `~/.claude`,
  which already pointed at `~/.agents`.
- Impact is low: the vault's `-v2` successors (`blender-game-assets-v2`,
  `engine-project-agent-v2`, `game-liveops-assist-v2`, `game-proto-validation-v2`)
  are installed and working.
- Fixed in `sync-skills.ps1`: HOST entries never delete a real directory, never
  link into a cycle, and report `host-dangling-cycle` / `host-content-missing`
  instead. `vssadmin` could not check shadow copies (needs admin).
- Resolved 2026-11-08 (user decision): the 16 dead links were removed with
  `cmd /c rmdir` (link only), the four names went into `.kilo/removed-skills.txt`,
  `$HostSkills` in `scripts/build-manifest.ps1` was emptied, and the incident is
  recorded in `REMOVED-SKILLS.md`.

## Worker Profiles

Five worker profiles under `~/.hermes/profiles/`:
- modplanner, modbuilder, modauditor, modverifier, modoverseer
- Each has its own skills/ tree (profile skill isolation)
- Skills installed to the default profile are invisible to workers
- After creating/patching a worker skill, copy to each worker:
  `cp -r ~/.hermes/skills/devops/<name> ~/.hermes/profiles/<worker>/skills/devops/<name>`
- Verify: `hermes -p <worker> skills list | grep <name>`

## Governance checks — traps and recipes (learned 2026-11-11)

Eleven facts earned the hard way while landing the task-grade gate, the
TEMPLATE submodule bump and the tier re-bucketing. Each one cost a red check
or a wasted round; none is guessable from the docs alone.

**1. A PR author cannot approve their own PR.** A repository with one admin,
where the agent opens PRs under that admin's `gh` login, can never satisfy
"non-author approving review". Every yellow/red PR deadlocks.
→ Fixed by the `ADMIN-APPROVE <head SHA>` comment protocol in
`scripts/task_policy.py` (`_admin_comment_login`); see
`docs/governance/task-grade-policy.md`.

**2. A skipped required check blocks merges forever.** GitHub reports it as
"Expected — waiting", so a job-level `if:` switch to turn a gate off turns
*everything* off instead. → Gates stay unconditional in CI and pass through
inside the check (`authorization_gate.enabled` in
`.github/task-grade-policy.json`).

**3. `gh run rerun` reuses the original run's workflow version.** A PR whose
check fails because the gate is old cannot be rescued by re-running it; the
rerun prints the same old error. → Merge main into the PR branch
(`gh pr update-branch`) so the head carries the new check code.

**4. Every gate job checks out `github.event.pull_request.head.sha`.** The
checking code therefore comes from the PR branch, not from main. Consequence:
"the PR that fixes the gate waits for the gate" (bootstrap paradox, hit by
PR #25 → #26). → Update the branch; the long-term fix is to run policy code
from main instead of the head.

**5. GitGuardian reads `.gitguardian.yaml` from the default branch only.**
Adding the file inside a PR does not silence that PR's findings.
`gitguardian` is not a required check, so it does not block merges.

**6. `enforce_admins: true` leaves even the admin with no bypass.** The only
escape is toggling branch protection by hand — which is why the two fixes
above exist: they make approval possible instead.

**7. `scripts/build-manifest.ps1` tested its skip regex against the ABSOLUTE
path.** Any vault living under a skipped segment (a worktree at
`<repo>/.cindy-worktrees/<name>/`) matches `.cindy-worktrees` and loses every
skill: the manifest went 246 → 10 entries. Committing that would make
`sync-skills.ps1` act on a list missing 236 skills. → Never trust a manifest
regenerated from a nested path without diffing; a correct regeneration on an
unchanged tree produces **zero diff** (that is the acceptance test). The fix
(tests the vault-relative path) is pending — see `SKILL_CANDIDATES.md`.

**8. The `py` launcher does not exist on this host.** Scripts calling
`py -3` fail outright; `python` and `python3` are on PATH. Audit a script
with `powershell -NoProfile -ExecutionPolicy Bypass -File <script>` before
committing it, not after CI.

**9. A wholesale move turns "changed markdown" checks into a historical-debt
scanner.** Re-bucketing 246 skills renamed 1437 tracked `.md` files; the
ref check scans every changed file, so it surfaced 256 unreachable links
across 83 files that were already broken on main (verified by hand on one).
→ Scope such checks to content changes (skip pure renames, `R100`) and queue
the debt separately; do not let an unrelated PR absorb it.

**10. Multiple sessions can force-push the same branch while you work.** On
2026-11-11 another session replaced this branch three times (…→`fdb087c`
→`7eb870f`) and merged it. → `git fetch` before every push, keep a local
`backup/<name>` ref before a force-push, and when someone else's version
wins, verify its content (manifest rows, required checks) instead of
reflexively re-pushing your own.

**11. HTTPS to GitHub is unreliable on this host; SSH is not.** `git fetch`
over https dies with `Recv failure: Connection was reset`, `gh` occasionally
loses `api.github.com`. → Use `NO_PROXY='*'` with the proxy vars unset, push
over `git@github.com:…`, read state through `gh api`, and retry rather than
concluding the operation failed.

## Vault Layout

Grouped by category as of 2026-08-08; since 2026-11-11 every curated skill sits
in a quality bucket: `SKILL/<category>/tier<N>/<skill>/SKILL.md`
(`tier0` ≥ 9.0 … `tier4` < 6.0, scored by
`docs/skill-capacity-audit/score_skills.py`; re-bucket with
`docs/skill-capacity-audit/rearrange-tiers.ps1`). The bucket is a *quality*
tier — unrelated to the `A`/`B`/`C` visibility column in
`scripts/skill-tiers.txt`.

```
AgentSkillsVault/
├── README.md
├── KNOWLEDGE.md                      ← this file
├── AGENTS.md                         ← agent rules (imported by CLAUDE.md)
├── SKILL/
│   ├── <category>/tier<N>/<skill>/SKILL.md
│   └── …                             curated skills, 246 as of 2026-11-11
├── TEMPLATE/                         agent workflow template (submodule)
├── TEMPLATE-GOVERNANCE/              template + multi-agent governance (submodule)
├── vendor/<repo>/                    upstream submodules, re-add source only
├── docs/                             audits, governance docs, reports
├── scripts/                          manifest build / sync / verify / policy gate
└── .github/                          pr-gate.yml (required checks) + task-grade policy
```

The per-category listings that used to live here went stale the moment skills
were re-bucketed; `scripts/install-manifest.txt` (generated) is the truthful
list of what exists and where.

Install procedure (local-copy, not hub):
1. `cp -r <category>/<skill-dir> ~/AppData/Local/hermes/skills/<category>/<skill-name>/`
2. Verify: `skill_view(name='<skill-name>')` returns `readiness_status: available`
3. Verify: `hermes skills list | grep <skill-name>` shows `Status: enabled`
4. For worker profiles: copy to `~/.hermes/profiles/<worker>/skills/<category>/`
