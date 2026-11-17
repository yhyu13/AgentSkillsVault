---
name: agent-eval-loop
description: |
  Build a Skill + Eval + Verification triad for any agent workflow, then
  ascend the trust curve from local observation to cloud automation. Use
  this when the user wants to (1) encode a team best practice as a reusable
  skill, (2) write a unit test for an agent skill ("skill is hallucinating,
  how do I check?"), (3) establish a trust loop before running cloud agents
  at scale, or (4) move from "agent I have to babysit" to "agent I trust
  to ship PRs to main." This skill teaches the methodology distilled from
  the Cursor team's public talk by a SpaceXAI engineer.
license: MIT
metadata:
  author: derived from B 站 BV1ceYR65EmK (Cursor 团队工程师公开 talk)
  audience: any coding agent (Claude Code, Codex, etc.)
  version: 0.1.0
---

# agent-eval-loop

> **One-liner**: Encode know-how into a Skill, write an Eval for it, build a Verification loop around that Eval, then ascend from local observation to cloud automation.

## Why this exists

Coding agents hallucinate. They guess when they should look up. They skip
verification when they should cross-check. The fix is not "a better model"
-- the fix is a **trust loop built from three parts**:

| Part | What it is | One-line test |
|------|------------|---------------|
| **Skill** | Know-how encoded as a reusable workflow | "Can another agent follow this without asking me?" |
| **Eval** | Unit test for an agent skill | "If I change the skill, does the score move?" |
| **Verification** | Trust loop around the eval | "Can I trust the eval itself?" |

The mistake most teams make is to **skip the verification step** and
jump to cloud agents. Without a working verification loop, scaling agents
is just hallucinating faster.

## When to invoke this skill

Invoke when the user says any of:

- "Write a skill for X" / "把这个流程做成 skill"
- "How do I know my agent is doing the right thing?" / "怎么验证 agent 真的做对了"
- "I want to run more agents in parallel" / "我能不能多开几个 agent"
- "My agent is hallucinating, what do I do?" / "agent 又瞎编了"
- "Set up a verification loop" / "做一个 verification 系统"
- "Build me a P-Stack / Cursor-style skill + eval"

Do **not** invoke for: short ad-hoc tasks, single-turn edits, anything
where the user has not asked for repeatability or trust scaling.

## The method (3 steps + 1 curve)

### Step 1: Build the Skill

Turn know-how into a workflow. See `references/skill-design.md` for the
full template. Minimum bar:

- One-sentence definition of when to invoke
- Numbered steps the agent should follow
- Explicit "don't" list (anti-patterns you want it to avoid)
- Worked example: a real input -> a real correct output
- Self-check question: "If I gave this to a new engineer, would they
  produce the same result?"

### Step 2: Build the Eval

Eval = unit test for the agent skill. See `references/eval-playbook.md`.

Mandatory design rules:

1. **Hidden directories** -- never let the eval'd agent know it is being
   evaluated. Agents change their behavior when they sense a test.
   Cleverly-named working dirs are not cosmetic; they are correctness.
2. **Cross-model judge** -- the model that runs the skill != the model
   that scores the output. Self-judging introduces bias.
3. **Hill climb with `/loop`** -- run the eval iteratively until the
   score hits your threshold (e.g. 10/10). Each iteration should
   tweak the skill, not the eval.
4. **Cross-model matrix** -- if you have access to multiple models,
   run the eval on each. A skill that only works on one model is
   fragile.

### Step 3: Verify the verification

This is the step most teams skip. **You must eval the eval.**

- Spawn a sub-agent and ask it to deliberately fail the skill
- Confirm the eval catches the failure (score drops)
- Spawn another sub-agent and ask it to follow the skill
- Confirm the eval rewards the success (score rises)
- If both checks pass, the verification loop is functional

If the eval cannot distinguish "agent trying hard" from "agent slop",
the verification loop is broken. Fix the eval, not the skill.

### Step 4: Ascend the trust curve

Do **not** spawn 100 cloud agents on day 1. The trust curve is:

1. **Local + observe** -- run the skill yourself, watch every tool call
   and every thinking block. Build a baseline.
2. **Verify the verification** -- run the meta-checks above.
3. **Cloud agents on signal** -- spawn cloud agents that pick up real
   signals (bug reports, scheduled tasks, etc.), not random prompts.
4. **Auto-merge PRs** -- only after cloud agents produce PRs that you
   would have approved yourself.

Each rung requires an honest self-check: "Do I trust this enough to
not babysit it?" If the answer is no, **stay on the current rung longer**.
There is no shortcut. Trust is built, not installed.

See `references/trust-curve.md` for the full ladder.

## Outputs of this skill

When invoked, produce:

1. A new directory `<repo>/skills/<skill-name>/` (or wherever the user's
   platform expects) with a `SKILL.md` following the team's skill format
2. An `eval.json` in that directory using `templates/eval.template.json`
3. A `verify.sh` (or platform equivalent) that runs the eval + the
   meta-verification
4. A short report to the user covering: skill definition, eval design
   choices (especially the 4 mandatory rules), trust-curve rung the
   user is on, and what the next rung requires

## Files in this skill

- `SKILL.md` -- you are here
- `references/skill-design.md` -- how to design a good skill
- `references/eval-playbook.md` -- eval design rules + scoring rubric
- `references/verification-patterns.md` -- common verification patterns
- `references/trust-curve.md` -- local -> cloud -> auto-merge ladder
- `templates/SKILL.template.md` -- copy-paste skill skeleton
- `templates/eval.template.json` -- copy-paste eval schema
- `scripts/eval-runner.sh` -- bash runner that consumes eval.json
- `examples/01-bug-repro-skill/` -- end-to-end worked example
- `README.md` -- cross-platform install (Claude Code + Codex)

## Constraints

- This skill is **methodology, not magic**. It will not turn a bad
  prompt into a good agent. It will, however, surface the assumptions
  your team is hiding from itself.
- Do not invoke if the user has not agreed to the meta-investment.
  Building a real eval + verification loop takes 30-90 minutes the
  first time. If the user wants a one-shot, just do the work, do not
  build infrastructure for it.
- Never trust a passing eval as proof the skill works. Always run
  the meta-verification (Step 3) before declaring done.

## Provenance

Distilled from a B 站 public talk by a SpaceXAI engineer on the Cursor
team (BV1ceYR65EmK, ~13 min). The talk covers the same three-part
loop in the context of P-Stack; this skill generalizes it so any
team using any coding agent can apply it.
