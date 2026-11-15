# Verification Patterns

Once you have a Skill and an Eval, you need a **Verification loop**
around them. This is where most teams quietly give up -- the eval
exists, but no one runs it, no one trusts it, and the skill drifts.

A verification pattern is **how you arrange the skill + eval into a
process the team actually runs**.

## Pattern 1: Pre-commit gate

The eval runs on every skill change before commit. The commit is
blocked if the score drops below the threshold.

```yaml
# .github/workflows/skill-eval.yml
on:
  pull_request:
    paths:
      - 'skills/**/SKILL.md'
jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: ./scripts/eval-runner.sh skills/my-skill/eval.json
      - if: failure()
        run: |
          echo "Skill regression detected. See eval report."
          exit 1
```

Best for: skills that gate production behavior. Slow (1-5 min per PR)
but catches regressions.

## Pattern 2: Background scoring

The eval runs on a random sample of production skill invocations and
scores them asynchronously. Failures are alerted but not blocking.

Best for: skills where the cost of a regression is low and the cost
of a slow PR is high. Watch for: silent drift if the alert isn't
read.

## Pattern 3: Pre-merge gate + post-merge shadow

Run a fast eval pre-merge, then run a deeper eval (full cross-model
matrix) post-merge. Pre-merge catches obvious regressions, post-merge
catches subtle ones.

Best for: high-stakes skills where pre-merge eval must be < 60s but
you still want deeper confidence.

## Pattern 4: Crowd-graded eval

A small set of human reviewers rate a random 5% of skill outputs.
If the human rating correlates with the eval score (Pearson > 0.7),
the eval is calibrated. If not, the eval is broken.

Best for: skills where the output is subjective (writing, design
choices) and the eval is necessarily a proxy.

## Pattern 5: Adversarial red-team

A dedicated red-team agent is given the skill and a goal: "Make the
skill fail without the eval noticing." Outputs the red-team produces
that pass the eval are **eval gaps** that must be patched.

Best for: security-sensitive skills or skills that touch customer data.

## Choosing a pattern

| If your skill is... | Use pattern |
|---------------------|-------------|
| A code review, a refactor | 1 (pre-commit gate) |
| A documentation writer, a log summarizer | 2 (background scoring) |
| A test-generator, a CI helper | 3 (pre + post-merge) |
| A tone-of-voice writer, a UX microcopy | 4 (crowd-graded) |
| A security helper, a customer-data scrubber | 5 (red-team) |

You can combine: pattern 1 for fast PR-time feedback, pattern 2 for
production drift, pattern 5 for quarterly adversarial review.

## Anti-pattern: "We have evals, we just don't run them"

If the eval isn't in the critical path (CI, merge, alert), it isn't a
verification loop -- it's a document. **Make the verification loop
the only way to ship a skill change**, or admit you don't really
trust the eval yet and go back to Step 2.
