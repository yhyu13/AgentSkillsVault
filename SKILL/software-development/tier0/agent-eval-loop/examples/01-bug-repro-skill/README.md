# Example: bug-repro skill + eval

This is a complete end-to-end worked example of the **agent-eval-loop**
method, applied to a single skill: `bug-repro`.

## What's here

- `SKILL.md` -- the skill itself, following the 6-section minimum bar
  (When to use / Inputs / Steps / Don'ts / Example / Self-check)
- `eval.json` -- 3 test cases (1 positive, 1 negative, 1 positive on
  stack trace), with hidden dirs, cross-model judge, and pass criteria
- `verify.sh` -- the verification loop: meta-checks + full eval

## How to read it

1. **Read `SKILL.md` first.** Notice that it has all 6 sections, the
   Don'ts are concrete failure modes (not generic platitudes), and
   the Example shows actual test code.
2. **Then read `eval.json`.** Notice:
   - The hidden dirs look like real work (CURSOR-4521, MOB-991,
     SENTRY-77) -- not `eval_001`.
   - The rubric is anchored to specific observable outputs.
   - The judge_model is deliberately marked "different from runner"
     because self-judging is bias.
   - The pass criteria are explicit numbers, not vibes.
3. **Then read `verify.sh`.** It runs the three meta-checks
   (fail injection, best-effort pass, score stability) before the
   full eval. This is the "verify the verification" step that most
   teams skip.

## How to adapt it

To create your own skill + eval pair, copy this directory:

```bash
cp -r examples/01-bug-repro-skill skills/my-new-skill/
```

Then edit:

1. `SKILL.md` -- replace the skill name, the trigger phrases, the
   steps, the don'ts, the example
2. `eval.json` -- replace the test cases, the rubrics, the pass
   criteria
3. `verify.sh` -- wire it to your platform's runner

The eval template is the part teams most often get wrong. Resist the
temptation to make it shorter. Each test case should be expensive to
write and cheap to re-run.

## What this example does NOT do

- It does not include a working runner. The runner is platform-
  specific (Claude Code uses one API, Codex uses another). The
  template `scripts/eval-runner.sh` is a skeleton; replace the
  placeholders with your platform's actual model calls.
- It does not include real test data. The input strings are
  representative but not from a real codebase. Plug in your own
  bug reports.
- It does not pre-fill results.json. Run the verification loop
  and let it produce the results.
