---
name: cron-pipeline-state-machine
description: "Reusable pattern for any multi-agent cron dispatcher. State-machine dispatch (not timer-based), parent-written PICK.md authoritative over legacy schedule, Agent #4 (test verifier) as safety net that ALWAYS runs after Agent #3 even when Agent #2 (reviewer) is skipped. Bugs caught at 2026-07-12: dispatcher didn't query PENDING_PICK.md so Agent #1 bootstrapped from stale schedule; skip_review=yes auto-bypass for test-only rounds let broken tests land. Both fixed in amg-pipeline-orchestrator skill."
---

# Multi-Agent Cron Pipeline State Machine

A reusable dispatcher pattern for any multi-agent cron pipeline. Replaces
the simpler "single prompt does everything" approach with explicit state
files + a deterministic state machine.

## When to use

- You have N agents (3-7) that must collaborate on a long-running task
  (generator ports, test coverage sweeps, doc audits, etc.)
- The cron is **file-only** (tirith blocks terminal in subagents)
- Each agent can only see what the prior agents wrote
- Tasks need to be split across multiple cron ticks (≤200 line diffs/tick)

## Core architecture

```
┌─ CRON TICK ──────────────────────────────────────────┐
│ 1. Probe shell (expect BLOCKED)                      │
│ 2. Discover state: scan docs/ for state files        │
│ 3. Apply state machine → pick agent                  │
│ 4. Load agent prompt (skill_view)                    │
│ 5. Execute agent's instructions in THIS session      │
│ 6. Output the agent's final response verbatim        │
└──────────────────────────────────────────────────────┘
```

The dispatcher is the cron's `prompt` field. It does NO work itself —
it only routes.

## State files (in `docs/`)

The state machine reads these:

- `PENDING_PLAN_v<N>.md` — Agent #1's pre-impl plan
- `PENDING_COMMIT_v<N>.md` — Agent #1's post-impl commit marker
  - Contains `skip_review: yes/no` field
- `PENDING_REVIEW_v<N>.md` — Agent #2's review verdict (KEEP/FIX/DELETE)
- `PENDING_TESTS_v<N>.md` — Agent #3's test commit
- `PENDING_TEST_AUDIT_v<N>.md` — Agent #4's audit verdict
  (ALL_KEEP / SOME_RELAX / SOME_DELETE / MAJOR_DELETE)
- `PENDING_PROJECT_AUDIT.md` — Agent #5's project drift audit
- `PENDING_PICK.md` — **PARENT-WRITTEN** priority-ordered task queue

## HARD INVARIANT 3: source-bundle gating breaks the state machine

If the priority queue's top task requires a source bundle the parent
hasn't staged yet, the cron enters an endless FIX loop. Agent #1 plans
the work, Agent #2 says FIX (no fidelity audit possible without the
source), Agent #1 re-plans (idempotent, no real change), repeat.

Observed (2026-07-13 v172 tool_definition): 22 consecutive idle ticks.
`PENDING_SOURCE_BUNDLE.md` accumulates numbered log entries.

Detection: `git log --since='1 hour ago' -- sdv-mod-generator/` shows
no production-code commits, but `last_run_at` advances every 15 min.

Fix: parent runs `git show` for the missing bundle, commits it under
`docs/_source_<phase>.py.txt`, pushes. Next cron tick breaks out.

**Prevention:** the parent MUST pre-stage source bundles BEFORE the
cron plans them. The state machine doesn't gate on bundle-existence —
the loop happens silently. Encode the stage-and-commit step in
PENDING_PICK.md before each new phase.

**Compounding bug — Agent #2 doesn't organically re-audit after the
bundle lands (NEW 2026-07-13).** When the parent stages the bundle,
Agent #1 writes the impl (option (a) from PENDING_SOURCE_BUNDLE.md:
combined plan+impl in one tick). But Agent #2 — which wrote the
original FIX verdict citing the missing bundle — does NOT
automatically re-audit on the next tick. The stale `verdict: FIX` in
`PENDING_REVIEW_v<N>.md` persists, and the dispatcher's state machine
reads the verdict from the file on every tick. Result: the dispatcher
routes EVERY future tick to Agent #1 (re-iterate on FIX) in an
infinite loop, EVEN THOUGH the impl is correct and the v173 audit
(via the state machine's transitive path) shows KEEP.

Observed (2026-07-13, v172 tool_definition): after the parent staged
the bundle, Agent #1 wrote the impl, but the cron's Agent #5
`PENDING_PROJECT_AUDIT.md` claimed the FIX was "overwritten" — it
wasn't. The next-tick state machine would have looped back to
Agent #1 forever. Parent had to manually overwrite
`PENDING_REVIEW_v172.md` with `verdict: KEEP` to unstick the
dispatcher.

**Fix (one-time, parent-side, this kind of stale-FIX is recurring):**
overwrite the stale `PENDING_REVIEW_v<N>.md` with `verdict: KEEP` and
cite the post-bundle evidence (impl on disk, fidelity audit
from v<N+1>'s review, passing tests). Commit the rewrite so the
cron's next cycle reads the correct verdict.

**Structural fix (open, future dispatcher patch):** Agent #2 should
re-audit a commit that follows a FIX verdict if the new commit
references the same impl (transitive fidelity). Currently Agent #2
only runs when `state["review"] is None` (Rule 3 of the state
machine), so it doesn't get a second chance after the FIX. Add a
"re-audit on transitive impl" rule to Agent #2's prompt.

## HARD INVARIANT 1: PENDING_PICK.md takes priority

When PENDING_PICK.md exists, Agent #1 MUST use it. The first-run
bootstrap (derive PICK from a legacy schedule) only fires when BOTH
PENDING_PICK.md AND the legacy schedule are absent.

Why: the parent knows real-time intent ("stage this source bundle NOW
because I just committed it"). A 6-day-stale legacy schedule can
contradict the parent. The v168 incident (2026-07-12) caught this: the
cron's dispatcher didn't query PENDING_PICK.md, Agent #1 bootstrapped
from a stale schedule, and produced broken work the parent never asked
for.

Fix: dispatcher's STEP 2 file scan MUST include PENDING_PICK.md, and
STEP 3 routing passes its content to Agent #1 verbatim.

## HARD INVARIANT 5: Agent #3 can be silently skipped

The state machine routes `commit exists, review=KEEP, tests missing → Agent #3`. This works ONLY if Agent #3 actually runs. Observed failure mode (NEW 2026-07-13, v175/v176/v177 tool_definition test suite):

- Agent #1 writes extensive PLAN + COMMIT markers (often 17-19KB of planning) for a multi-tick test round
- Agent #2 reviews each with verdict KEEP
- The state machine advances to the next tick
- Agent #1 writes PLAN + COMMIT for the NEXT sub-tick
- Agent #2 reviews with KEEP
- Repeat for 3 sub-ticks
- **No `PENDING_TESTS_v<N>.md` ever lands. Agent #3 never wrote any test code.**

The result: 3 cron ticks of wasted planning (v175/v176/v177), no actual test implementation. Eventually Agent #5 or the parent notices the missing tests and triggers RECOVERY rounds (v179/v180) which DO land the test code.

**Why it happens:** Agent #1's prompt allows planning-only markers when the round is large. Agent #2's review KEEPs a plan even when no impl will land this tick. The state machine's "tests missing" branch fires correctly, but Agent #3 was never instructed to actually write — it might decide to "wait for cleaner inputs" and exit [SILENT].

**Detection (parent-side, ANY of these):**
1. `PENDING_COMMIT_v<N>.md` for v175+ exists but `PENDING_TESTS_v<N>.md` is missing — the v175 cycle wrote 3 commits, 3 reviews, 0 tests
2. `PENDING_REVIEW_v<N>.md` has verdict KEEP but the next tick doesn't produce a `PENDING_TESTS_v<N>.md` (the KEEP→tests transition is missing)
3. The test file size hasn't grown across N+ cron ticks despite planning markers accumulating

**Fix (one-time, parent-side):** write the `PENDING_TESTS_v<N>.md` markers manually, then resume. Or: trigger RECOVERY rounds (Agent #1 plans, Agent #3 runs in the same round).

**Structural fix (open, future dispatcher patch):** Agent #3's prompt should require it to write AT LEAST one new test method per round, or explicitly `exit [SILENT]` and append a note explaining why. The current prompt allows Agent #3 to "wait for the next round" indefinitely, breaking the chain. Force a yes-or-no decision per tick.

## HARD INVARIANT 6: cron audits can be inaccurate — parent-side cross-check required

The cron's Agent #5 (project critic) writes `PENDING_PROJECT_AUDIT.md` based on `search_files` queries against the cron's workdir. **Two systematic accuracy gaps observed (2026-07-13):**

1. **Workdir-relative searches miss repo-root files.** Agent #5 ran `search_files pattern="AGENTS.md" path="<workdir>"` and reported "AGENTS.md is MISSING from the project root." But AGENTS.md was at `/home/hangyu5/Documents/Gitrepo-My/AMG/AGENTS.md` (the repo root), NOT in the workdir subdir `sdv-mod-generator/`. The audit was wrong.

2. **Audits claim markers are updated when they're not.** Agent #5's v169-v173 audit said "PENDING_REVIEW_v172.md ... the v172 review is KEEP per a re-audit, so the FIX verdict was overwritten — no action needed unless the file still shows FIX." The file DID still show FIX (verified by the parent). The audit's confidence didn't match reality.

**Pattern:** the cron subagent can't see git state (no shell, no `git log`), so it can't verify a marker's lineage. It reads the current file and infers history, which can be wrong.

**Fix (parent-side, ALWAYS):** before trusting a PENDING_PROJECT_AUDIT.md claim, run `git log` on the cited marker files. If a claim says "FIX was overwritten to KEEP" but the file still shows FIX, the audit is wrong — overwrite the marker yourself with the correct verdict.

**Structural fix (open, future dispatcher patch):** Agent #5's prompt should require it to `read_file` (not `search_files`) on every cited marker and include the EXACT file content (not a paraphrase) in the audit. Force the audit to be a transcript, not a summary.

Why: Agent #1 can't see its own test-writing bugs. Agent #4's audit
catches the 5 known-broken-test patterns:
1. `from x import y` patch propagation
2. Test-bug-in-itself (typos in test names)
3. Source incomplete relative to test
4. Missing `_isolate_test_env` contract (top-level imports)
5. AsyncMock on sync function (or vice versa)

The v168 incident (2026-07-12) caught this: Agent #1 wrote a test file
that hangs pytest indefinitely. Agent #4 would have caught it, but the
cron was paused after tick 1.

Fix: Agent #1's `skip_review=yes` rule must EXCLUDE any change that
touches `tests/`. State machine routes Agent #3 → Agent #4 regardless
of skip_review.

## State machine (copy-paste starting point)

```
state_files = {
    "plan":    last PENDING_PLAN_v<N>.md (or None)
    "commit":  last PENDING_COMMIT_v<N>.md (or None)
    "review":  last PENDING_REVIEW_v<N>.md (or None)
    "tests":   last PENDING_TESTS_v<N>.md (or None)
    "audit":   last PENDING_TEST_AUDIT_v<N>.md (or None)
    "project": PENDING_PROJECT_AUDIT.md (or None)
    "pick":    PENDING_PICK.md (or None)
}

# HARD INVARIANT: check for unfinished FIX cycles BEFORE Rule 6.
# See "Rule 6 masks Rule 4" pitfall below for why this is needed.
if has_unfinished_fix_cycle():
    run impl_agent with unfinished_cycle=latest_unfinished_v
elif state["audit"] is not None and state["project"] is None:
    run critic_agent
elif state["commit"] is None and state["plan"] is None:
    if state["pick"] is not None:
        run impl_agent with pick=state["pick"].content
    else:
        run impl_agent with bootstrap_from="legacy_schedule.md"
elif state["commit"] is not None and state["review"] is None:
    if state["commit"].skip_review == "yes":
        run test_writer_agent  # skip reviewer only
    else:
        run reviewer_agent
elif state["review"] is not None and state["tests"] is None:
    if state["review"].verdict == "KEEP":
        run test_writer_agent
    else:  # FIX or DELETE
        run impl_agent  # iterate
elif state["tests"] is not None and state["audit"] is None:
    run test_verifier_agent  # ALWAYS, even when reviewer was skipped
elif state["audit"] is not None and state["project"] is not None:
    run impl_agent  # new cycle
```

## HARD INVARIANT 7: Rule 6 masks Rule 4 when an earlier cycle is unfinished (NEW 2026-07-14)

The state machine's Rules 1-5 each check "is the LATEST of marker
type X present." Rule 6 matches when `audit != None AND project != None`.
If a recent v<N> has review=FIX with no matching PENDING_TESTS_v<N>.md,
that cycle is UNFINISHED — Rule 4 should apply to v<N> — but Rule 6
also matches, and Rule 6 comes LATER in the chain, so it wins. Agent
#1 gets routed under "new cycle" but cannot plan anything new (the
v<N> is unfinished); it re-emits the same status note 20+ times in a
row while the v<N>'s FIX verdict still blocks the queue.

**Concrete observation (2026-07-14, v183 tool_definition):** Agent #2
returned a legitimate FIX (real contract-drift finding — the plan
asserted `result.passed` from an imagined ValidationResult-style
API when the real return is `list[str]`). Latest audit (v181) was
KEEP, so Rule 6 fired. Agent #1 re-emitted status-only planning
markers for ~20 consecutive ticks (3+ hours of cron time, 0
prod-code lines written).

**Fix:** add a `has_unfinished_fix_cycle()` check BEFORE Rule 6
that scans every PENDING_REVIEW_v*.md, finds the LARGEST v<N>
with `verdict=FIX AND no matching PENDING_TESTS_v<N>.md`, and
routes to Agent #1 with `unfinished_cycle=<v<N>>`. Agent #1 then
reads the FIX feedback, produces a CORRECTED plan+commit with the
SAME v<N> number (do NOT bump to v<N+1>), and the next tick's
state machine naturally fires Rule 4 → Agent #2 → re-review.

```python
import os, re, glob

def has_unfinished_fix_cycle(docs_dir="docs"):
    """Find the latest v<N> with verdict=FIX and no tests written.
    Returns the largest v<N> where (verdict == FIX AND no tests),
    or None if all cycles are KEEP/DELETE+tests or no review.
    """
    pattern = re.compile(r"v(\d+)")
    unfinished = []
    for path in glob.glob(os.path.join(docs_dir, "PENDING_REVIEW_v*.md")):
        m = pattern.search(path)
        if not m:
            continue
        v = int(m.group(1))
        with open(path) as f:
            content = f.read()
        verdict_match = re.search(
            r"^-?\s*verdict:\s*\*?\*?(KEEP|FIX|DELETE)\*?\*?",
            content, re.MULTILINE,
        )
        if not verdict_match or verdict_match.group(1) != "FIX":
            continue
        if os.path.exists(os.path.join(docs_dir, f"PENDING_TESTS_v{v}.md")):
            continue
        unfinished.append((v, str(v)))
    if not unfinished:
        return None
    unfinished.sort(key=lambda x: x[0], reverse=True)
    return unfinished[0][1]
```

**Generalizable rule:** any state machine that uses "presence of
marker" as a state-transition signal is at risk of similar masking
when cycles are interleaved. The fix is always the same: add an
unfinished-cycle check that walks the marker history BEFORE
"full cycle complete" rules. Don't trust the LATEST-of-X to
represent the state of the whole queue.

## Skill organization

Put each agent in its own skill so they can be loaded via `skill_view`:

- `~/.hermes/skills/<project>-pipeline-orchestrator/` — dispatcher + state machine
- `~/.hermes/skills/<project>-agent-1-impl/`
- `~/.hermes/skills/<project>-agent-2-reviewer/`
- `~/.hermes/skills/<project>-agent-3-test-writer/`
- `~/.hermes/skills/<project>-agent-4-test-verifier/`
- `~/.hermes/skills/<project>-agent-5-critic/`

Each agent's SKILL.md has YAML frontmatter (name + description) + the
agent's role-specific prompt. The dispatcher loads them via `skill_view`.

## Anti-patterns (do NOT do this)

1. **Timer-based dispatch** ("run Agent #1 every 15 min regardless of
   state") — produces broken work when previous agents haven't finished
2. **Single mega-prompt** ("Agent #1 plans, implements, tests, and
   reviews in one tick") — perspective-bias: agent can't see own bugs
3. **Cron subagent can spawn subagents** — subagents inherit the
   shell-block, wastes tokens
4. **Auto-skip_review for "trivial" changes** — trivial can still
   be broken; Agent #4 audit catches bugs Agent #1 can't
5. **Dispatcher does work itself** — dispatcher is just routing,
   agents do the work
6. **Unverified assumptions in plans** (NEW 2026-07-12) — Agent #1's
   plan templates should require `search_files` verification of
   claims like "router keywords are wired" or "manifest will be
   emitted" before the cron writes code. The v169 weapon_definition
   port assumed both and landed with neither. Fix: add explicit
   "Step 1.5: VERIFY" sections in Agent #1's prompt that grep for
   the claimed state.

## Post-port verification recipe (NEW 2026-07-12)

After any agent ports a new phase / endpoint / module, the parent
session MUST run this 3-step verification before marking the cycle
complete. The cron can't run pytest, can't start servers, can't grep
the router for keywords — so this is parent-side work.

```bash
# 1. Smoke test the new module/phase
PYTHONPATH=. python -c "
from <module> import <new_class>
print('<module> instantiates')
"
PYTHONPATH=. python -c "
from <registry> import <new_phase>
print('<phase> registered:', '<phase>' in <registry>.list_phases())
"

# 2. End-to-end pipeline test (assumes postgres + redis + uvicorn)
REQ_ID=$(curl -sS -X POST http://localhost:8000/<generate_endpoint> \
  -H 'Content-Type: application/json' \
  -d "{\"user_id\":\"smoke\",\"prompt\":\"<canonical prompt>\"}" \
  | python -c 'import sys,json; print(json.load(sys.stdin)["request_id"])')

for i in $(seq 1 12); do
  sleep 10
  STATUS=$(curl -sS http://localhost:8000/v1/mods/status/$REQ_ID)
  if echo "$STATUS" | grep -q 'done:'; then break; fi
done

# 3. Verify zip structure (for mod-generation pipelines)
find /tmp /home -name "$REQ_ID.zip" 2>/dev/null | head -1 \
  | xargs -I{} unzip -l {}
# Expect: manifest.json + content.json + <phase-specific-data-file>

# 4. Router correctness check
grep 'router.routed' /tmp/uvicorn.log | grep "$REQ_ID" | tail -1
# Expect: "phase":"<new phase>" (not the wrong phase)
```

Total time: ~5 min per port. Skipping this is how the v169
weapon_definition port landed with 2 systemic gaps (router keywords
missing, manifest.json missing from zip). Both gaps took ~10 min to
fix after detection.

**Common gaps to check for:**
- Router keywords not wired in `_PHASE_BY_KEYWORD` (or equivalent
  routing table)
- Phase registered but no `manifest.json` emission
- EditData targets using non-standard paths (cross-check the
  project's standards doc, NOT the T2 judge)
- Test file hangs pytest (run pytest manually, don't trust cron)

## Verification recipe

After dispatcher install:
1. Stage a small task in PENDING_PICK.md (parent-side)
2. Run the cron once (cronjob.run)
3. Verify the agent picked the right task (not a stale legacy pick)
4. Verify the next cron tick routes to the right next agent
5. If a test file was produced, run pytest on it manually (parent-side)
6. If anything is broken, patch the dispatcher skill + the agent's skill

## Reference

- Working example: ~/.hermes/skills/amg-pipeline-orchestrator/ for
  the SDV Mod Generator's 5-agent pipeline (job 976adaee381c)
- Bugs fixed at install: see amg-pipeline-orchestrator/SKILL.md
  "HARD INVARIANT" sections
- **references/2026-07-13-cron-audit-accuracy-gaps.md** — three
  accuracy gaps in Agent #5 audits (workdir-relative search miss,
  marker state inference, Agent #2 stale-FIX loops) + parent-side
  verification recipe. Read this BEFORE trusting any
  PENDING_PROJECT_AUDIT.md claim.