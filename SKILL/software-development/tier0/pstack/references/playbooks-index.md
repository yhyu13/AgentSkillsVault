# Playbook index

Generated from `references/upstream/skills/poteto-mode/playbooks/*.md`. Read the full playbook and copy its steps into the todo list before executing. The index is a router, not a substitute.

| Playbook | Description | Full text |
|---|---|---|
| `authoring-a-skill` | **You own the skill's voice.** | `references/upstream/skills/poteto-mode/playbooks/authoring-a-skill.md` |
| `autonomous-run` | **You own the exit condition. Define done, then drive to it without stopping.** | `references/upstream/skills/poteto-mode/playbooks/autonomous-run.md` |
| `autopilot-full` | **You own the verdicts, never the PRs. One owner carries each PR from build to merge, and nothing merges until your swarm, which never wrote the code, has proven the code that lan… | `references/upstream/skills/poteto-mode/playbooks/autopilot-full.md` |
| `autopilot-stack` | Run the Autopilot-full playbook, but do not merge. | `references/upstream/skills/poteto-mode/playbooks/autopilot-stack.md` |
| `babysit` | **You own the merge frontier. Declare a mode, clear one PR at a time, stop where the human's call begins.** | `references/upstream/skills/poteto-mode/playbooks/babysit.md` |
| `bug-fix` | **You own this task. Plan, review, verify.** Delegate investigation and the fix to subagents, stay in the lead. Pick each subagent's reasoning level for the job, per the Subagents… | `references/upstream/skills/poteto-mode/playbooks/bug-fix.md` |
| `eval` | **You own the experiment design. Plan, blind, run, synthesize.** | `references/upstream/skills/poteto-mode/playbooks/eval.md` |
| `feature` | **You own the design. Plan, review, verify.** Delegate implementation. Stay in the lead. | `references/upstream/skills/poteto-mode/playbooks/feature.md` |
| `hillclimb` | **You own the metric and the experiment's integrity. Supervise and review. Delegate the attempts.** For sustained, iterative improvement of one measurable thing against a target. … | `references/upstream/skills/poteto-mode/playbooks/hillclimb.md` |
| `investigation` | **You own the answer. Plan, route, write.** | `references/upstream/skills/poteto-mode/playbooks/investigation.md` |
| `multi-phase-plan` | **You own the plan, not the code. The plan is a checklist an owner runs box by box and the operator audits from the evidence.** The plan is the deliverable. Do not implement. | `references/upstream/skills/poteto-mode/playbooks/multi-phase-plan.md` |
| `opening-a-pr` | Invoked at the end of every other playbook. | `references/upstream/skills/poteto-mode/playbooks/opening-a-pr.md` |
| `pause-safely` | **You own a clean stop. Leave a checkpoint a cold-start agent can resume from.** This is explicit only. On "keep going", "going to bed, keep going", or "don't stop", do not pause. | `references/upstream/skills/poteto-mode/playbooks/pause-safely.md` |
| `perf-issue` | **You own the measurement story. Plan, review, verify the numbers.** Tie every fix to a measurement, don't read source instead of measuring. | `references/upstream/skills/poteto-mode/playbooks/perf-issue.md` |
| `prototype` | **You own the design decision, not the code. The prototype is a throwaway instrument. The real build follows Feature.** | `references/upstream/skills/poteto-mode/playbooks/prototype.md` |
| `refactoring` | **You own the contract. The structure changes. The behavior does not.** Distinct from Feature, which adds behavior, and Bug fix, which corrects it. | `references/upstream/skills/poteto-mode/playbooks/refactoring.md` |
| `runtime-forensics` | **You own the diagnosis. Instrument the live process, don't theorize from source.** The deliverable is a cited diagnosis, not a fix. | `references/upstream/skills/poteto-mode/playbooks/runtime-forensics.md` |
| `session-pickup` | **You own the resume point. Read the prior trail, don't redo it.** | `references/upstream/skills/poteto-mode/playbooks/session-pickup.md` |
| `shipping` | **You own what lands. Verify each PR independently, land only the verified run from the root, then keep your hands off the stack.** | `references/upstream/skills/poteto-mode/playbooks/shipping.md` |
| `trace-forensics` | **You own the diagnosis from the artifact.** | `references/upstream/skills/poteto-mode/playbooks/trace-forensics.md` |
| `visual-parity` | **You own pixel-exact equivalence. The baseline is the spec. You do not touch it.** Equivalence is verified by image diff, not by eye. | `references/upstream/skills/poteto-mode/playbooks/visual-parity.md` |
| `worktree-cleanup` | 1. Snapshot and audit. Record `df -h /`, then run `scripts/worktree-audit.sh [-b <pr-base-ref>] [repo-path]` (principle-build-the-lever). Without `-b` it checks `MERGED` against `… | `references/upstream/skills/poteto-mode/playbooks/worktree-cleanup.md` |
