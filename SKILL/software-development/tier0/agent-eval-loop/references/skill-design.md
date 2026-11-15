# Skill Design Reference

A skill is **know-how encoded as a reusable workflow**. Not a doc, not
a wiki page, not a "best practices" memo -- a workflow another agent
(or engineer) can follow without asking you.

## The minimum bar

A skill that ships must have **all six** of these sections. Anything
less and the eval will have to compensate with stricter scoring, which
is the wrong place to put that weight.

| # | Section | Purpose | Test question |
|---|---------|---------|---------------|
| 1 | **When to use** | Trigger conditions | "If I read only this, do I know whether to invoke?" |
| 2 | **Inputs** | What the skill needs to start | "Can the agent find all inputs without asking?" |
| 3 | **Steps** | Numbered procedure | "Can another agent follow these in order?" |
| 4 | **Don'ts** | Anti-patterns to avoid | "What does failure look like for this skill?" |
| 5 | **Example** | Real input -> real correct output | "Does the example match the steps?" |
| 6 | **Self-check** | A question the agent should answer before claiming done | "If the agent can't answer this, it isn't done." |

## Worked template

Use `templates/SKILL.template.md` -- it has all six template sections
laid out. The "When to use" section is the most-skipped and the most
important. Without it, the agent either over-invokes (slow, off-topic)
or under-invokes (misses obvious cases).

## Common mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Skill is a doc, not a workflow | Agent reads it, summarises it, doesn't act on it | Rewrite as numbered steps with explicit verbs |
| Steps are too abstract | "Understand the codebase" | Replace with "Read X, note Y, output Z" |
| No "don't" list | Agent repeats the same failure modes | Add an explicit "Do NOT..." section with the failure mode |
| Example is hand-waved | "Returns a JSON" | Show the actual JSON, with realistic values |
| Self-check is missing | Agent claims done too early | Add one yes/no question the agent must answer |

## When NOT to write a skill

- The workflow is one-shot and won't be repeated
- The workflow requires too much human judgment to encode
- The team has only one user (you) -- just keep it in your head for now
- The know-how isn't stable yet (the product is changing weekly)

In any of these cases, write a short prompt instead and revisit in
3 months. Skills have a maintenance cost (see Eval Playbook).
