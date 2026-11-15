# Eval Playbook

An eval is **a unit test for an agent skill**. The same standards apply:
deterministic inputs, observable outputs, a scoring function that
distinguishes pass from fail. The unique challenge with agents is that
they can sense being evaluated and change behavior -- so the design
must actively defeat that.

## The four mandatory rules

These are not optional. Skipping any one of them will make your eval
report "10/10" while the skill is silently broken.

### Rule 1: Hidden directories

The eval runner should drop the agent into a working directory whose
name does not reveal it is being tested. Names like `eval_001`,
`test_run`, `agent_qa` are giveaway signals. Use names that look like
real work: a JIRA ticket number, a feature branch, a real product
directory.

Why this matters: agents that sense they are being tested engage
"performance mode" -- they are more careful, more compliant, and
hide their natural failure modes. The eval result then has no
relationship to how the skill behaves in production.

```bash
# WRONG
mkdir test_run_01 && cd test_run_01

# RIGHT
mkdir -p ~/work/CURSOR-4521/repro && cd ~/work/CURSOR-4521/repro
```

### Rule 2: Cross-model judge

The model that runs the skill and the model that scores the output
must be **different models** (or at minimum, the same model with very
different prompts). Self-judging has two failure modes:

- **Leniency bias** -- the model gives itself partial credit because
  it understands its own reasoning
- **Family bias** -- the model is biased toward outputs that look
  like its own training distribution

In practice: if the skill is designed to be used with model A, score
with model B. If you only have one model, use a different prompt
template and require the scores to agree within a small margin.

### Rule 3: Hill climb with `/loop`

The eval should be runnable in a loop where the **skill** changes
between iterations and the **eval itself stays fixed**. This forces
you to climb toward a stable optimum rather than overfitting to
the eval.

```text
# pseudo-code
loop:
  modify skill
  run eval
  log (skill_version, score)
  if score >= threshold: stop
```

`/loop` in Cursor is the built-in implementation. The principle
generalizes: any iteration that changes the eval to make the score
go up is **cheating**, not progress.

### Rule 4: Cross-model matrix

If you have access to multiple models, run the same eval on each and
record the score matrix. A skill that scores 10/10 on one model and
4/10 on another is **brittle** -- it has memorized one model's
preferences. A skill that scores 8-10 across all models is
**generalized**.

Output schema:

```json
{
  "skill": "bug-repro",
  "scores": {
    "claude-opus-4": 9.5,
    "claude-sonnet-4": 8.5,
    "gpt-4o": 8.0
  },
  "decision": "ship" // if min(scores) >= 7
}
```

## Scoring rubric

A scoring rubric must be **specific enough that two different judges
agree on the score within 1 point out of 10**. If they don't agree,
the rubric is too vague.

| Score | Meaning | Anchored description |
|-------|---------|----------------------|
| 0 | Did not attempt | No output, or output completely off-topic |
| 3 | Attempted but wrong | Followed some steps, produced wrong result |
| 5 | Partial success | Followed steps, got core right, missed details |
| 7 | Substantially correct | All required outputs present, minor stylistic issues |
| 10 | Indistinguishable from human expert | Production-ready, no edits needed |

Judge instruction template:

> You are evaluating an agent's output against a rubric. Score 0-10
> using the table above. **First write 2-3 sentences of justification,
> then give the score.** If your justification does not cite a specific
> rubric row, your score is invalid.

## The meta-verification

Before you trust any eval, run these three checks:

1. **Fail injection** -- spawn a sub-agent and explicitly tell it to
   cut corners. Confirm the eval scores this below 5.
2. **Best-effort pass** -- spawn a sub-agent and give it the same
   context a real user would have. Confirm the eval scores this
   above 7.
3. **Score stability** -- run the same eval 3x with the same skill.
   Confirm scores are within 1 point of each other.

If any check fails, fix the eval before fixing the skill.

## Eval lifecycle

```
write skill v1
  -> write eval v1
  -> run meta-verification (3 checks)
  -> if meta-verification fails: rewrite eval, goto 2
  -> run /loop hill climb until score >= threshold
  -> ship skill + eval as a pair
  -> any future change to skill: re-run eval, gate the change on score
```

The skill and the eval are **versioned together**. A skill change
without an eval re-run is a regression you don't know about.
