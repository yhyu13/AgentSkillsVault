#!/usr/bin/env bash
# verify.sh -- Verification loop for the bug-repro skill
#
# This script runs the three meta-checks (fail injection, best-effort
# pass, score stability) and the full eval. See ../references/eval-playbook.md
# for what these mean and why they are mandatory.

set -euo pipefail

SKILL_DIR="$(cd "$(dirname "$0")" && pwd)"
EVAL_FILE="$SKILL_DIR/eval.json"
RESULTS_FILE="$SKILL_DIR/results.json"

echo "=== Verification loop for bug-repro skill ==="
echo "Skill dir: $SKILL_DIR"
echo "Eval file: $EVAL_FILE"
echo

# --- Meta-check 1: fail injection ---
echo "[1/3] Meta-check: fail injection"
echo "  -> Spawn sub-agent, tell it to cut corners."
echo "  -> Expected: eval scores this below 5."
echo "  (Replace this stub with your real runner invocation.)"
echo

# --- Meta-check 2: best-effort pass ---
echo "[2/3] Meta-check: best-effort pass"
echo "  -> Spawn sub-agent, give it the same context a real user would have."
echo "  -> Expected: eval scores this above 7."
echo

# --- Meta-check 3: score stability ---
echo "[3/3] Meta-check: score stability"
echo "  -> Run the same eval 3x with the same skill."
echo "  -> Expected: scores within 1 point of each other."
echo

# --- Full eval across models ---
echo "=== Full eval (cross-model matrix) ==="
echo "Models: claude-opus-4, claude-sonnet-4, gpt-4o"
echo "Pass criteria:"
echo "  - min score per case >= 8"
echo "  - min score across models >= 7"
echo "  - judge agreement within 1 point"
echo

# Stub: in a real setup, invoke the runner here.
# This script is meant to be a *template* you customize to your platform.

cat <<EOF
Results will be written to $RESULTS_FILE with shape:
{
  "skill": "bug-repro",
  "scores": {
    "claude-opus-4": { "tc-01": 9, "tc-02": 2, "tc-03": 9 },
    "claude-sonnet-4": { "tc-01": 8, "tc-02": 3, "tc-03": 8 },
    "gpt-4o": { "tc-01": 8, "tc-02": 2, "tc-03": 7 }
  },
  "meta_verification": { "fail_injection": "pass", "best_effort": "pass", "stability": "pass" },
  "decision": "ship"
}

Until you wire this to your platform, the verification loop is a
template, not a loop. See the SKILL.md at the package root for the
trust curve and what each rung requires.
EOF

exit 0
