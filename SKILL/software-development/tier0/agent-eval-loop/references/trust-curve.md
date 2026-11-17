# Trust Curve: From Local Observation to Cloud Automation

The trust curve is **how much you trust the agent to do work without
you watching**. The mistake is to start at the top (spawn 100 cloud
agents) before you have built any of the rungs.

## The four rungs

### Rung 1: Local + observe

You run the agent on your own machine. You watch every tool call,
every thinking block, every file edit. You are the verification.

Sign you are here:
- You scroll through transcripts after every agent run
- You read the diffs the agent produced
- You re-run the agent's commands manually to confirm

Time to stay here: **at least 1-2 weeks per skill**. If you skip this,
you are trusting an unverified system.

What you produce at this rung:
- A baseline of "what the agent does when I let it run"
- A list of failure modes you have personally observed
- A revised skill that addresses those failure modes

### Rung 2: Verify the verification

You have an eval. You run the meta-checks (see `eval-playbook.md`).
You confirm the eval actually distinguishes "agent trying" from
"agent slop."

Sign you are here:
- The eval consistently scores 8+ when you give the agent a fair
  shot
- The eval consistently scores 3- when you tell the agent to cut
  corners
- Two different judges give scores within 1 point of each other

What you produce at this rung:
- A passing meta-verification report
- A documented threshold (e.g. "ship if score >= 8 across all models")
- Confidence that the eval is not lying to you

### Rung 3: Cloud agents on signal

You spawn cloud agents, but **only on real signals**: bug reports,
scheduled tasks, well-defined refactors. The agent has the skill +
the eval, and it self-checks before producing a PR.

Sign you are here:
- You have a queue of signals (GitHub issues, Linear tickets, etc.)
- The cloud agent picks them up and produces a PR per signal
- You review the PR diff, not the agent's transcript

What you produce at this rung:
- A signal router (often a Discord bot or webhook)
- A runbook for "what to do when the cloud agent produces a bad PR"
- A metric: PRs auto-opened per day, PRs auto-merged per day

Critical rule: **the cloud agent must run the same eval that the
local one does.** No skipping because "it's faster in the cloud."

### Rung 4: Auto-merge PRs

The eval score is the merge gate. The cloud agent opens a PR, the
PR runs the eval in CI, and if the score is above the threshold the
PR is merged without human review.

Sign you are here:
- A streak of N consecutive auto-merged PRs with no production
  incident
- Trust is no longer a feeling, it's a number (N auto-merges, M
  incidents, M / N < 0.01)
- The team has forgotten what manual review feels like

What you produce at this rung:
- A measured rollback rate
- A way to disable auto-merge instantly (kill switch)
- A monthly retro where the team reviews a random sample of
  auto-merged PRs and confirms they were correct

## Why you cannot skip rungs

Each rung depends on the previous one:

- Rung 2 without Rung 1 = trusting an unverified eval
- Rung 3 without Rung 2 = spawning cloud agents that pass a lying eval
- Rung 4 without Rung 3 = auto-merging PRs that the team has not
  reviewed in aggregate

The talk's most-quoted line is: **"It just keeps coming back to
trust."** Trust is not a vibe; it is the product of doing each rung
honestly.

## When to descend

If a Rung-3 incident happens (auto-merged PR causes a production
outage), you do not jump back to Rung 1. You:

1. Disable auto-merge (Rung 3 -> Rung 3 with humans in the loop)
2. Add the failure case to the eval (Rung 2 enhancement)
3. Run the meta-verification again (Rung 2 re-check)
4. Resume Rung 3 with the new eval

Trust is not linear. It goes up in batches and down in incidents.
The verification loop is what makes the descent recoverable.
