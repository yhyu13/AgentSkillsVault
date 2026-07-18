# Rule 6 masks Rule 4 when an earlier cycle is unfinished (2026-07-14)

## The bug in one sentence

The dispatcher's state machine inspects the LATEST of each marker
type. Rule 6 ("new cycle") fires when `audit != None AND project != None`.
But a recent v<N> with `review=FIX AND no matching
PENDING_TESTS_v<N>.md` is an UNFINISHED cycle. Rule 4 should apply
to v<N>, but Rule 6 also matches, and Rule 6 comes LATER in the
chain, so it wins. Agent #1 gets routed under "new cycle" but
cannot plan anything new; it re-emits the same status note 20+ times
in a row.

## v183 reproduction transcript (2026-07-14, 02:50-15:50 local time)

### State entering the bug

After cron Agent #3 landed v181 sanitizer tests (full cycle complete
for v181), the dispatcher was at:

- `audit=v181-test-audit (ALL_KEEP)` — Rule 5 satisfied
- `project=PENDING_PROJECT_AUDIT.md (K-cycle, exists)` — Rule 1 satisfied
- `review=v183 (FIX, legitimate contract-drift finding by Agent #2)` — Rule 4 should apply
- `tests=v181 (present)` — Rule 4's "tests == None" condition NOT met
- `commit=v183 (present)` — Rule 3's "commit == None" condition NOT met
- `plan=v183 (present)` — Rule 2's "plan == None" condition NOT met

So Rule 6 fires ("new cycle"), routing to Agent #1. But v183 is
unfinished. Agent #1 cannot legitimately plan anything new (the
v183 plan+commit is locked under FIX verdict and the work has not
been reworked to address Agent #2's feedback). So Agent #1 re-emits
status-only planning markers — v184.md, v185.md, ..., v202.md.

### Concrete timestamps

- 2026-07-14 02:38 → first status-only marker (v184.md)
- 2026-07-14 02:50 → 2nd marker
- 2026-07-14 03:12 → 3rd marker
- ...continues every 15 min...
- 2026-07-14 15:29 → 20th marker (v202.md)

**Total: 20 consecutive ticks (3+ hours of cron time, 0 prod-code
lines written).** The cron's "ok" status reported success to the
user, but the queue was deadlocked.

### Why Agent #2's FIX was legitimate (not a stale-FIX bug like v172)

v183's review found THREE real contract-drift issues:

1. Plan asserted `result.passed` / `.passed is True` / `.issues == []`
   from an imagined `ValidationResult` API. The real API is
   `validate_output(out) returns list[str]`.
2. Plan said `generate_structured` should return a `ToolListSchema`
   instance. But `generate()` immediately runs `ToolListSchema(**result)`,
   so the mock must return a raw dict `{"tools": [...]}`.
3. Output key in plan was `tools.json`. Real key is
   `assets/tool_definition/tools.json`.

These were real bugs the planner missed. Agent #2 did its job. The
problem was the state machine didn't re-route Agent #1 to address
v<N>'s FIX once the next new cycle fired.

### Detection (parent-side, ANY of these = you're in the loop)

1. **Rapid accumulation of v<latest+1>.md through v<latest+N>.md
   status notes** in `docs/`. The cron has been "new cycling" for
   hours; the only producer is Agent #1's status-note template.
2. **`PENDING_PROJECT_AUDIT.md` is fresh (K-cycle) but the
   corresponding `PENDING_TEST_AUDIT_v<N>.md` for the v<N> with
   review=FIX is missing.** No tests were ever written.
3. **`PENDING_PLAN_v<N+1>.md` and beyond contain "status note"
   or "parent-gated, no plan produced"** rather than a real plan.

## The fix (applied 2026-07-14)

Three skill files updated:

1. **`amg-pipeline-orchestrator/SKILL.md`** (17833 bytes) — added
   the unfinished-FIX check to the state machine diagram + pitfall
   #5 in the pitfalls section.
2. **`amg-pipeline-orchestrator/DISPATCHER_PROMPT.md`** (10671 bytes)
   — added the unfinished-FIX check inside Rule 6's branch (BEFORE
   the "new cycle" routing) + full Python implementation of
   `has_unfinished_fix_cycle()`.
3. **`amg-agent-1-planner-impl/SKILL.md`** (10691 bytes) — added
   `unfinished_cycle=<vN>` as a third dispatch argument + explicit
   instructions for handling it.

### The Python helper (the reusable bit)

```python
import os, re, glob

def has_unfinished_fix_cycle(docs_dir="sdv-mod-generator/docs"):
    """Find the latest v<N> with verdict=FIX and no tests written.
    Walks every PENDING_REVIEW_v*.md, extracts the verdict line,
    checks whether a matching PENDING_TESTS_v<N>.md exists.
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

### Verified the fix works (2026-07-14 15:50)

The very next cron tick after applying the patch correctly fired
the unfinished-FIX check:

> `dispatched_to: amg-agent-1-planner-impl`
> `state_before: review=v183=FIX (unfinished cycle); commit=v183 (corrected), plan=v226 status-note, audit=v181=ALL_KEEP, project=present; PICK present with v182+v183+v184+ queued; Rule 4 unfinished-FIX override fires (Rule 6 also matches).`

Agent #1 produced a corrected v183 plan+commit that addresses all
3 of Agent #2's findings:
- `errors = generator.validate_output(out)` (real API, not imagined `.passed`)
- Raw mapping mocks `{"tools": [...]}`
- Output key `assets/tool_definition/tools.json`
- Proper ordering — v182 must land first before v183

Test count unchanged: 31/31 pass. Agent #1 only modified markers,
not test code.

## Why this fix generalizes beyond this cron

Any state machine that uses "presence of marker" as a state-transition
signal is at risk of similar masking when cycles are interleaved. The
fix is always the same: add an unfinished-cycle check that walks the
marker history BEFORE "full cycle complete" rules. Don't trust the
LATEST-of-X to represent the state of the whole queue.

Three examples of similar state-machine bugs from other contexts:

1. **CI/CD pipelines that mark a release "ready" when the latest
   commit is green.** A green main with a red release-candidate
   branch is masked if the check only looks at main.

2. **Build systems that fire "deploy" when "latest build
   succeeded."** A successful head build + a failed canary build =
   masked deploy.

3. **Multi-agent task queues that "advance" when the latest task
   is complete.** An in-progress task before the latest completed
   task = masked advance.

In all three: walk the FULL history before declaring "done" with
a rule that only inspects the latest item.

## Alternative fix considered: re-key state on the highest v<N> in flight

Instead of inspecting "the LATEST of each marker type," the
dispatcher could inspect the highest v<N> across all markers and
reconstruct its state. e.g., for the v183 case:

- `state[v183] = {plan: present, commit: present, review: FIX, tests: None, audit: None}`
- `state[v181] = {plan: present, commit: present, review: KEEP, tests: present, audit: ALL_KEEP}`

Then the state machine picks the most-incomplete cycle (v183) and
routes to its next-needed agent (Agent #1 re-iterate, since review
is FIX).

This is more correct but requires restructuring all state
references. The "unfinished-FIX check" fix is the minimum-disruption
patch — it only adds one check before Rule 6. The full re-keying
can come later.

## Parent-side workaround (one-shot, before the patch lands)

If the dispatcher is in the loop and the parent wants to unstick it
NOW without patching the skill:

1. Read PENDING_REVIEW_v<N>.md's feedback_for_agent_1 section.
2. Manually produce a CORRECTED PENDING_PLAN_v<N>.md +
   PENDING_COMMIT_v<N>.md that addresses the feedback.
3. The next cron tick should fire Rule 3 (commit exists, no
   review for the new commit) → Agent #2 → re-review.

This is what the v172 stale-FIX workaround looks like. It's
labor-intensive and doesn't scale — the skill patch is the
structural fix.
