# Cron audit accuracy gaps (2026-07-13)

Session: AMG master 9ea3bee → a528125 → fe90b31 (cron job
976adaee381c, amg-agent-pipeline-5, enabled 2026-07-12, paused
2026-07-13 19:30 for audit, resumed 20:03).

## Three accuracy gaps in cron's automated audits

The cron's Agent #5 (project critic) writes `PENDING_PROJECT_AUDIT.md`
after each multi-cycle close. The audit is supposed to be the
ground-truth summary of the cron's work for the parent. Observed
3 systematic accuracy gaps:

### Gap 1: Workdir-relative searches miss repo-root files

**What happened:** Agent #5's v169-v173 audit reported:

> "`AGENTS.md` is MISSING from the project root. Verified via
>  `search_files pattern="AGENTS.md" path="<root>"` → 0 matches."

**Reality:** `AGENTS.md` was at
`/home/hangyu5/Documents/Gitrepo-My/AMG/AGENTS.md` (9762 bytes, dated
Jul 1) — the repo root, NOT in the workdir subdir
`sdv-mod-generator/`. The cron's search path was wrong.

**Root cause:** the cron's workdir is set to
`sdv-mod-generator/`. Its `search_files pattern="AGENTS.md" path="<root>"`
searches the workdir subdir, not the parent repo root. The file
exists one directory up.

**Pattern:** any docs/CRON_RUN_ARCHIVE_*.md or PENDING_*.md
referencing `AGENTS.md` will mislead Agent #5 into flagging the
file as missing.

**Fix (one-time, parent-side):** the parent must verify Agent #5
claims by `ls /home/hangyu5/Documents/Gitrepo-My/AMG/AGENTS.md` (the
repo root), not `ls sdv-mod-generator/`.

**Structural fix (open):** Agent #5's prompt should require
`search_files path=".."` (the parent dir) when looking for
repo-root files like AGENTS.md, CLAUDE.md, .cursorrules. Or use
`read_file ../AGENTS.md` directly.

### Gap 2: Audits claim markers are updated when they're not

**What happened:** Agent #5's v169-v173 audit said:

> "Verified on disk: `PENDING_REVIEW_v172.md` does exist; the v172
>  review is KEEP per a re-audit, so the FIX verdict was overwritten
>  — no action needed unless the file still shows FIX."

**Reality:** when the parent read the file at audit-time, the verdict
was still `**FIX**`. The file had NOT been overwritten. Agent #2 never
re-audited after the source bundle was staged.

**Root cause:** Agent #5 reads the current file content but infers
historical state (it does't have git state since cron is file-only).
When the v172 state evolved (FIX → bundle staged → impl landed → KEEP
should be written), Agent #5 saw the IMPL but not the state transition
that should have produced a KEEP review.

**Pattern:** any Agent #5 claim about a marker's VERDICT is a
best-guess inference, not a verified fact. Always read the file
yourself.

**Fix (one-time, parent-side):** before trusting Agent #5's verdict
claims, `cat docs/PENDING_REVIEW_v<N>.md | head -20` to confirm the
verdict field matches the claim.

**Structural fix (open):** Agent #5's prompt should require it to
`read_file` (not `search_files`) on every cited marker and include
the EXACT file content (not a paraphrase) in the audit. Force the
audit to be a transcript, not a summary.

### Gap 3: Cron's Agent #2 doesn't organically re-audit

**What happened:** v172 went through 22 idle ticks waiting for the
source bundle to be staged. When the parent staged the bundle, Agent
#1 wrote the impl in the same tick (option (a) from
PENDING_SOURCE_BUNDLE.md). The state machine should have routed to
Agent #2 for re-review on the next tick. It didn't — because the
state machine reads `state["review"]` to determine the next agent,
and the v172 review file STILL had `verdict: FIX` from the
pre-bundle state.

**Result:** the stale `verdict: FIX` would have caused the
dispatcher to route every future tick to Agent #1 (re-iterate on
FIX), creating an infinite loop on tool_definition. Even though
the impl was correct, the v173 fidelity audit (which
transitively covered v172) showed KEEP.

**Root cause:** the state machine's "re-iterate on FIX" branch
(Rule 4) fires whenever a FIX verdict is on disk. There's no
"re-audit" branch. The state machine assumes Agent #2 will
organically re-audit when conditions change, but Agent #2 only runs
when `state["review"] is None` (Rule 3) — so it never gets a second
chance.

**Pattern:** any FIX verdict that becomes stale (prerequisite met,
new impl landed) will loop forever until the parent manually
overwrites the review file.

**Fix (one-time, parent-side at 2026-07-13, commit fe90b31):**
overwrote `PENDING_REVIEW_v172.md` with `verdict: KEEP` and cited
the post-bundle evidence (impl on disk, fidelity audit from
v173's review, 26 passing tests).

**Structural fix (open):** add a "re-audit on transitive impl" rule
to Agent #2's prompt. When Agent #1 writes a new commit that
references the same impl (via commit message or marker), Agent #2
should re-audit. Currently the state machine's Rule 4 routes
back to Agent #1 unconditionally.

## Parent-side verification recipe after ANY cron audit

Before trusting `PENDING_PROJECT_AUDIT.md` claims:

1. `cat docs/PENDING_REVIEW_v<N>.md | head -10` — verify the verdict
   field actually matches the claim
2. `git log --oneline -- sdv-mod-generator/` — verify cited commits
   are real and recent
3. `ls /home/hangyu5/Documents/Gitrepo-My/AMG/AGENTS.md` — verify
   repo-root files exist (don't trust the cron's workdir-relative
   search)
4. `PYTHONPATH=. pytest tests/<cited_test>.py -v` — verify the
   cited tests actually pass (the cron's audit is file-only and
   can't run pytest)
5. `unzip -l <zip>` — verify the cited zip files have the cited
   contents (manifest.json, content.json, etc.)

Total: ~3 min per audit. Skipping this is how the v172 stale-FIX
bug would have caused an infinite loop on tool_definition
post-audit.

## Detection cheat sheet for cron's 3 accuracy gaps

| Cron claim | Verify with | Likely wrong if |
|---|---|---|
| "AGENTS.md missing" | `ls /home/hangyu5/Documents/Gitrepo-My/AMG/AGENTS.md` | File exists at repo root |
| "PENDING_REVIEW_v<N>.md shows KEEP" | `head -10 docs/PENDING_REVIEW_v<N>.md` | File shows FIX (or other) |
| "PENDING_TEST_AUDIT_v<N>.md ALL_KEEP" | `head -10 docs/PENDING_TEST_AUDIT_v<N>.md` | Verdict is SOME_DELETE / MAJOR_DELETE |
| "Router keywords wired" | `grep "phase_keyword.*$phase_name" orchestrator/router.py` | No match (cron port miss) |
| "Manifest.json emitted" | `unzip -l <zip> \| grep manifest` | manifest.json missing from zip |
| "All tests pass" | `pytest tests/ -q` | Cron can't run pytest, this is unverified |
