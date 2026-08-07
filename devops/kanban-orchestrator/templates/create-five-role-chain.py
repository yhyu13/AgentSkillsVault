#!/usr/bin/env python3 -B
"""Reusable template: create a five-role Kanban chain (planner → implementer → auditor → verifier → overseer).

This template is used when the caretaker cron does NOT auto-create repair chains on REWORK
(the common case — the caretaker prompt must explicitly enable REWORK auto-continuation, and
many campaigns don't have it configured). The orchestrator (parent session) runs this script
to create the full dependency-linked chain in one shot.

BEFORE RUNNING:
  1. Set BOARD, WORKSPACE, SKILL, PARENT_OVERSEER, CYCLE_ID below.
  2. Set FINDING_TEXT to the exact finding from the overseer's REWORK/STOP report.
  3. Set ROLE_INSTRUCTIONS for each role (planner/implementer/auditor/verifier/overseer).
  4. Set the ROLES list with (assignee_profile, role_short, title, instructions) tuples.

USAGE:
  python3 -B create-five-role-chain.py

The script:
  - Creates 5 cards with parent links (each card's parent is the previous card).
  - Uses --idempotency-key to prevent duplicate chains on retry.
  - Uses --workspace "dir:D:/Path/To/Repo" (forward slashes on Windows!).
  - Parses the returned task ID from JSON output.
  - Prints a summary of created card IDs.

COMMON PITFALLS:
  - Backslash workspace paths on Windows bash get eaten → use forward slashes.
  - hermes kanban --board <slug> <verb> — --board goes BEFORE the verb.
  - The parent overseer is the PREVIOUS chain's overseer (the one that issued REWORK/STOP).
  - Each card needs a unique idempotency key including the role and cycle ID.
"""
import json
import re
import subprocess
import sys

# ════════════════════════════════════════════════════════════════════
# CONFIGURATION — edit these for your campaign
# ════════════════════════════════════════════════════════════════════

BOARD = "aisides-mvp-v2-completeness"
WORKSPACE = "dir:D:/GitRepo-My/AISidesProject"  # forward slashes on Windows!
PARENT_OVERSEER = "t_REPLACE_ME"  # the overseer card that issued REWORK or STOP
SKILL = "aisides-ai-self-review"
CYCLE_ID = "mvp-v2-mN-repairN-finding-description-YYYYMMDD"

# The exact finding text from the overseer's REWORK/STOP report
FINDING_TEXT = "Replace with the exact finding from .hermes/aisides-oversight.md"

# ════════════════════════════════════════════════════════════════════
# ROLE INSTRUCTIONS — edit per finding
# ════════════════════════════════════════════════════════════════════

PLANNER_INSTRUCTIONS = """Inspect live Git state, the specification, implementation, tests, and latest oversight evidence. Select exactly one smallest dependency-ready increment that resolves the finding. Write/update .hermes/aisides-current-plan.md with scope, exclusions, files, acceptance criteria, validation, and realistic verification. Do NOT implement."""

IMPLEMENTER_INSTRUCTIONS = """Consume only the fresh accepted plan in .hermes/aisides-current-plan.md. Implement using TDD where practical. Run targeted and relevant regression checks. Record factual evidence in .hermes/aisides-implementation-report.md. Do NOT commit or push."""

AUDITOR_INSTRUCTIONS = """Independently map every plan criterion and applicable product requirement to source/test evidence. Inspect changed code and tests; run focused checks. Fail on missing coverage. Do NOT edit implementation. Write .hermes/aisides-spec-audit.md."""

VERIFIER_INSTRUCTIONS = """Exercise a realistic repository workflow, not merely unit tests. Use safe local fixtures and mocked external/paid providers only. Do NOT edit implementation. Write .hermes/aisides-real-verification.md. Mark unavailable external proof honestly; never synthesize results."""

OVERSEER_INSTRUCTIONS = """Consume all fresh stage evidence and independently inspect Git state. Rerun core validation. Write .hermes/aisides-oversight.md with DECISION: GO|REWORK|STOP, findings, and the single next action.

DECISION SEMANTICS:
- GO means the finding is resolved. The caretaker will create the next cycle.
- REWORK directs the next planner to the defect. The caretaker will create the repair chain.
- STOP is terminal.

IMPORTANT: After required validation and report writing, stop using tools and return the three markers exactly once."""

# ════════════════════════════════════════════════════════════════════
# ROLES — (assignee_profile, role_short, title, instructions)
# ════════════════════════════════════════════════════════════════════

ROLES = [
    ("modplanner", "planner", "AISides M? repair N: plan <finding>", PLANNER_INSTRUCTIONS),
    ("modbuilder", "implementer", "AISides M? repair N: implement <finding>", IMPLEMENTER_INSTRUCTIONS),
    ("modauditor", "auditor", "AISides M? repair N: audit <finding>", AUDITOR_INSTRUCTIONS),
    ("modverifier", "verifier", "AISides M? repair N: verify realistic <finding> behavior", VERIFIER_INSTRUCTIONS),
    ("modoverseer", "overseer", "AISides M? repair N: oversee remediation and GO/REWORK/STOP decision", OVERSEER_INSTRUCTIONS),
]

# ════════════════════════════════════════════════════════════════════
# IMPL — don't edit below unless the API changes
# ════════════════════════════════════════════════════════════════════

FINDINGS_BODY = """Cycle ID: {CYCLE_ID}. Role: {ROLE}. Parent: {PARENT}.

EXACT FINDING (from .hermes/aisides-oversight.md):
'{FINDING}'

TASK:
- Inspect live Git state, the specification, implementation, tests, and the latest oversight evidence.
- Select exactly one smallest dependency-ready increment that resolves the finding.
- Write/update .hermes/aisides-current-plan.md with scope, exclusions, files, acceptance criteria, validation, and realistic verification.
- Do NOT implement.

AUTHORITY: Use python3 -B (Python 3.13). Exclude PYTHONPATH; set PYTHONDONTWRITEBYTECODE=1. Do NOT commit, stage, push, access credentials, edit .env, log in to external services, or portray mocked provider as external proof.

IMPORTANT: After required validation and report writing, stop using tools and return the three markers exactly once. Do NOT run optional temporary scripts, ad-hoc verification, cleanup probes, cache probes, or extra narration after the report.

End response with exactly:
STAGE_SUMMARY: <short factual result>
CYCLE_ID: {CYCLE_ID}
STAGE_STATUS: SUCCESS|FAILURE|BLOCKED
"""


def run_cmd(args):
    cmd = ["hermes", "kanban", "--board", BOARD] + args
    print("+ " + " ".join(cmd[:6]) + " ...", file=sys.stderr)
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if result.returncode != 0:
        print("STDERR:", result.stderr, file=sys.stderr)
        print("STDOUT:", result.stdout, file=sys.stderr)
        raise RuntimeError(f"Command failed (exit {result.returncode})")
    return result.stdout


def create_card(title, assignee, parent, role, idempotency_key):
    body = FINDINGS_BODY.format(
        CYCLE_ID=CYCLE_ID,
        ROLE=role,
        PARENT=parent,
        FINDING=FINDING_TEXT,
    )
    args = ["create", title,
            "--assignee", assignee,
            "--workspace", WORKSPACE,
            "--skill", SKILL,
            "--idempotency-key", idempotency_key,
            "--max-retries", "2"]
    if parent:
        args.extend(["--parent", parent])
    args.extend(["--body", body, "--json"])
    stdout = run_cmd(args)
    try:
        data = json.loads(stdout)
        task_id = data.get("task_id") or data.get("id")
        if not task_id:
            raise RuntimeError(f"No task_id in JSON: {stdout}")
        return task_id
    except json.JSONDecodeError:
        m = re.search(r"(t_[0-9a-f]{8})", stdout)
        if m:
            return m.group(1)
        raise RuntimeError(f"Could not parse task id from: {stdout}")


def main():
    created = {}
    parent = PARENT_OVERSEER
    for assignee, role_short, title, _ in ROLES:
        idem_key = f"{CYCLE_ID}-{role_short}"
        task_id = create_card(
            title=title,
            assignee=assignee,
            parent=parent,
            role=role_short,
            idempotency_key=idem_key,
        )
        created[role_short] = task_id
        print(f"[OK] {role_short}: {task_id} (parent={parent})", file=sys.stderr)
        parent = task_id

    print("\n=== CREATED CHAIN ===", file=sys.stderr)
    for role, tid in created.items():
        print(f"{role}: {tid}", file=sys.stderr)
    print(json.dumps({"created": created, "cycle_id": CYCLE_ID, "board": BOARD, "parent_overseer": PARENT_OVERSEER}, indent=2))


if __name__ == "__main__":
    main()
