#!/usr/bin/env bash
# eval-runner.sh -- minimal eval runner that consumes eval.json
#
# Usage:
#   ./eval-runner.sh <path-to-eval.json>
#
# This is a SKELETON. Real runners need to:
#   1. Spawn the runner model in a hidden working directory
#   2. Capture the agent's output
#   3. Spawn the judge model with the output + the rubric
#   4. Record scores to a results.json
#   5. Compare against pass_criteria
#
# Replace the placeholders marked with <<<...>>> with your platform's
# actual API calls. This file is portable across Claude Code and Codex
# because both expose a way to invoke a model with a prompt.

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <eval.json>" >&2
  exit 2
fi

EVAL_FILE="$1"

if [[ ! -f "$EVAL_FILE" ]]; then
  echo "ERROR: $EVAL_FILE not found" >&2
  exit 2
fi

# Validate the eval.json has the required shape (very minimal check)
for required in skill test_cases models_to_test pass_criteria; do
  if ! grep -q "\"$required\"" "$EVAL_FILE"; then
    echo "ERROR: eval.json missing required key: $required" >&2
    exit 2
  fi
done

SKILL_NAME=$(grep -m1 '"skill"' "$EVAL_FILE" | sed 's/.*"skill"\s*:\s*"\([^"]*\)".*/\1/')
echo "Running eval for skill: $SKILL_NAME"

# Stub: in a real runner, iterate test_cases, spawn runner, spawn judge,
# record results. See the example in examples/01-bug-repro-skill/ for
# a concrete working version.

cat <<EOF
This is the SKELETON runner. To make it real:

1. For each test_case in $EVAL_FILE:
   a. Create test_case.hidden_dir as a fresh, realistic-looking dir
      (NEVER name it 'eval_*' or 'test_*' -- see eval-playbook.md rule 1)
   b. Spawn runner model with test_case.input.user_prompt
   c. Capture output
   d. Spawn judge model with (output, test_case.rubric)
   e. Record (test_case.id, model, score)
2. Compute pass/fail against pass_criteria
3. Print a summary table

See examples/01-bug-repro-skill/ for a working example.
EOF

exit 0
