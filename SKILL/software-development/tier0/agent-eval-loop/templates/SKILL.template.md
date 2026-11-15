---
name: <skill-name>
description: |
  <One sentence: what this skill does + when to use it. Include trigger
  phrases a user might say. Be specific. If a user could read this and
  not know whether to invoke, the description is too vague.>
license: <MIT | Apache-2.0 | ...>
---

# <Skill Title>

> One-line summary: <verb> + <object> + <quality bar>

## When to use

Invoke when ALL of these are true:

- <situation 1>
- <situation 2>
- <NOT this kind of task -- be explicit about out-of-scope>

Do NOT invoke for: <out-of-scope examples>

## Inputs

Before starting, you need:

- <input 1> -- how to obtain it
- <input 2> -- how to obtain it

If any input is missing, stop and ask. Do not guess.

## Steps

1. <First action. Use a verb. Specify the output of this step.>
2. <Second action. Builds on the output of step 1.>
3. <Third action.>
4. <Final action. Specify what "done" looks like.>

## Don'ts

- Do NOT <anti-pattern 1> -- because <concrete failure mode>
- Do NOT <anti-pattern 2> -- because <concrete failure mode>
- Do NOT <anti-pattern 3> -- because <concrete failure mode>

## Example

**Input**: <realistic input the user might give>

**Output**:
```
<actual output, formatted, with realistic values>
```

## Self-check

Before claiming done, answer YES to all of these:

- [ ] Did I follow every numbered step in order?
- [ ] Did I avoid every item in the Don'ts list?
- [ ] Does my output match the Example format exactly?
- [ ] Could another agent, given this same input, produce a substantially
      similar output without asking me?
- [ ] If I were reviewing this output, would I approve it without
      changes?

If any answer is NO, do not claim done. Fix the gap and re-run.
