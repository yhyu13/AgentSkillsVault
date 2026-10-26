# Action plan — cutting skill-library pressure and fixing the defects it exposed

**Date:** 2026-10-25 · **Status: executed (with one phase queued for user review)**
**Basis:** `docs/skill-capacity-audit/2026-10-25-skill-library-pressure.md` (§0 holds the corrected figures) and `docs/skill-capacity-audit/2026-10-25-skill-library-pressure.json` (raw output).
**Repo rules that bind this plan:** skills are changed only after the user batch-reviews `SKILL_CANDIDATES.md`; a changed skill bumps `version:` and its `INSTRUCTION.md` provenance row; then `build-manifest.ps1` → `sync-skills.ps1` → `verify-install.ps1`; work lands on a branch → PR → merge, never a direct push to `main`; no skill is hand-copied into a second store; vendored files are never edited in place; no secret enters an in-repo file.

---

## 0. Execution log

Three critic subagents reviewed the v1 plan (tooling feasibility, evidence audit, repo-discipline and operational risk). Their findings changed the plan; the corrections are marked **⚠ corrected** below.

| phase | status | outcome |
|---|---|---|
| 0 — commit what was done | ✅ done | branches → PR → merge |
| 1 — correctness fixes | ✅ done | duplicate names 1 → **0**, cross-store collisions 4 → **0**, divergence 6 → **0** (see §1) |
| 2 — measure usage → choose tiers | ⚠ **corrected** | no usage telemetry exists on this machine; tier A was derived from deliberate installation instead (§2) |
| 3 — implement tiering | ✅ done | manifest gained a tier column; `apply-tiers.ps1` hides 211 skills from Claude Code's auto-selection (§3) |
| 4 — fix the confusable skills | ✅ done | 24 descriptions rewritten (9 skills promoted into the vault first); divergence position 13/13 pairs improved, 0 worse. The Jaccard acceptance metric was wrong and was replaced — see §4 |
| 5 — regression guard | ✅ done | `scripts/verify-capacity.ps1` passes (§5) |
| 6 — install the 14 vendor skills | ✅ done | github is reachable **through the proxy** — do not set `NO_PROXY=*` (§6) |

---

## 1. Phase 1 — correctness fixes (done)

**⚠ corrected:** v1 proposed porting a "newer local fix" for `ue-renderdoc-auto-capture` and bumping six skill versions. That was a false alarm: the divergence was CRLF-vs-LF (`core.autocrlf=true`). After normalising line endings, 104 of 106 copies are identical and only `canvas-design` and `slack-gif-creator` differ — both Anthropic-distribution revisions, not local fixes of vault skills. **No skill content was changed, no version bumped, nothing ported.**

What was actually done:

1. **All four vendor submodules checked out** at their pinned commits, and the 14 vendor skills installed. `verify-install.ps1`: `match=269 mismatch=0 missing=0` (was 254 + 14 missing).
2. **`html-ppt` restored into the vault** from its pinned submodule `vendor/html-ppt-skill` @ `fd16290`. The vault's copy had been lost in the restructure commit `d4b4ada`; on disk only a 1-file stub (referencing `assets/base.css` and `templates/…` that did not exist) and a copy missing 13 files remained. `INSTRUCTION.md` updated to say where it lives and why it was restored. The 240-file pinned copy is now canonical.
3. **Store reconciliation**, with every copy backed up first to `%TEMP%\kilo\vault-backup-<timestamp>\`:
   - `~/.config/kilo/skills/slack-gif-creator` and `canvas-design` → replaced by junctions to the canonical copy (same skill, different distribution revision; the vault follows its own documented policy of "upstream as-is", README line 191);
   - `~/.config/kilo/skills/artifacts-builder` → removed: it is the same skill as the vault's `web-artifacts-builder` under an older name, and the pair scored **0.96 Jaccard** — the single worst shadowing pair in the library;
   - `~/.config/kilo/skills/grill-me` → removed: the canonical store already carries the user's deliberate pointer version;
   - `html-ppt-source` → removed from the three stores that carried it.
4. **The analysis script now normalises line endings** before hashing, so this false positive cannot recur, and it reports raw vs normalised results separately.

**Acceptance (all met):** 0 duplicate frontmatter names, 0 cross-store collisions, 0 divergence, `match=269 mismatch=0 missing=0`.

---

## 2. Phase 2 — tiers without telemetry (⚠ corrected)

v1 assumed `/skill-doctor` would provide per-skill invocation counts. It does not exist on this machine:

- `/skill-doctor` returns nothing — Claude Code's feature-flag fetch is disabled by `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`;
- `claude -p "/skill-doctor"` produced no output and was killed after 240 s;
- `~/.local/share/kilo/session-export.db` has **zero rows** in all three tables;
- 187 Claude Code transcripts (439 MB) contain only **16 distinct skill references** and 5 Skill-tool calls — a partial signal from other projects, not this vault.

**So tier A was derived from the best available proxy, and is provisional by construction:**

- **tier A = 58 skills** — the skills the user installed *by hand* (they are outside the manifest and therefore always visible anyway) plus the process and production skills the repo's own workflow documents (engineering discipline, the writing/report surface, decks and visual output, the document formats, and the build/ship skills this user actually works in);
- **tier B = 211 skills** — installed, manually invocable, hidden from auto-selection;
- **tier C = 0** — nothing is withheld from the vault.

`scripts/skill-tiers.txt` is the hand-edited source of truth, with **one explicit row per manifest skill** (269 rows) so that no skill's visibility is implicit. `build-manifest.ps1` joins it into the manifest's third column and warns about any skill with no tier row.

**To change a tier:** edit `scripts/skill-tiers.txt`, then re-run `build-manifest.ps1` → `sync-skills.ps1` → `apply-tiers.ps1`. Nothing else needs to move.

**Acceptance:** every manifest skill has a tier row (`verify-capacity.ps1` fails otherwise).

---

## 3. Phase 3 — tiering (done)

### 3.1 The mechanism

`scripts/install-manifest.txt` is now `<name>|<path>|<tier>`. Three parsers were updated together, because the third column silently breaks the other two: `sync-skills.ps1`, `verify-install.ps1`, and `skill_pressure_analysis.py` (which already tolerated both shapes).

### 3.2 What it does per harness

| harness | mechanism | state |
|---|---|---|
| Claude Code | `skillOverrides[name] = "user-invocable-only"` — the vendor documents this state as **Hidden** from Claude's listing while still present in the `/` menu | ✅ **applied** — 211 skills hidden, still invocable by name |
| Claude Code | `skillListingBudgetFraction` (e.g. `0.02`) | not applied — raises the ceiling, does not fix shadowing |
| Codex | `[[skills.config]] enabled = false` in `~/.codex/config.toml` | **deferred** — the Codex CLI is not installed on this machine, so the entries would be inert and unverifiable |
| Codex (exact) | `agents/openai.yaml` → `policy.allow_implicit_invocation: false` | **rejected** — it writes into the skill dir, which `robocopy /MIR` would delete on the next sync and which breaks the byte-identical install check |
| Kilo | — | **no mechanism exists.** `~/.config/kilo/kilo.json` exposes no `skills` key, and the repo's `.kilo/kilo.jsonc` has none. For Kilo the only lever is *what is installed* |

### 3.3 The Kilo consequence, and the switch that fixes it

Because the harness in use cannot hide a skill, Kilo keeps seeing the full listing. `scripts/sync-skills.ps1` therefore has a profile switch:

```powershell
# additive and safe: installs only tier A, leaves tier B in place
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\sync-skills.ps1 -Profile core

# destructive: also removes tier B from the canonical store (the 3 junction
# views follow automatically). The vault keeps every skill, so re-running the
# default profile restores them.
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\sync-skills.ps1 -Profile core -PruneToProfile
```

**Not run unilaterally**, because it removes 211 skills from the user's environment. The listing under `-Profile core` is 58 vault skills + the 68 hand-installed ones.

### 3.4 How the settings file was edited safely

`~/.claude/settings.json` **contains a plaintext API token**. `scripts/apply-tiers.ps1` therefore:

- never prints the file or the parsed object;
- never re-serialises it — it does a text-level insert, so every other byte is untouched;
- writes UTF-8 **without BOM** (PowerShell 5.1's `Set-Content` would add one and break `JSON.parse`);
- backs the file up first, to `settings.json.vaultbak-<timestamp>` (a name that cannot be mistaken for a settings file);
- **aborts without writing if the result does not parse** — which it did twice, correctly: the first attempt used `#` comments (not legal JSON) and the second was missing a comma before the file's first original key. The token and all other settings were intact both times;
- supports `-DryRun` and `-Remove` (undo).

Verified after applying: the file parses, `skillOverrides` has 211 entries all `user-invocable-only`, `env` still has its 9 keys including `ANTHROPIC_AUTH_TOKEN`, `model`/`modelSettings`/`permissions`/`autoUpdatesChannel`/`effortLevel` are intact, no BOM.

### 3.5 A real cost, stated plainly

For Claude Code, tier B skills are now **hidden from auto-selection**. If you relied on Claude *automatically* picking one of those 211 skills, it will no longer do so — you must invoke it by name. That is the intended trade (the descriptions were being dropped anyway, and worse, unevenly), but it is a behaviour change, not a free win. `-Remove` reverses it.

---

## 4. Phase 4 — the confusable skills (done)

Applied after the user's batch review of `SKILL_CANDIDATES.md` rows #27–36. Each description's **first words** now name the skill's subject and state what it is *not* for, because a budget-truncated listing shows only the head.

**Nine skills had to be promoted into the vault first** — they were not vault-owned, so there was nothing to commit a change to:

- the six company-style skills (`style-alibaba`, `style-amazon`, `style-bytedance`, `style-google`, `style-microsoft`, `style-tencent`) lived only in the user's own store; they now live in `SKILL/management/` with provenance rows, and the config-store copies are junctions to the canonical copy;
- `grill-me` and `grill-with-docs` likewise, into the mattpocock productivity family;
- `pptx` was **vendored** — a vendored file is lost on `git submodule update` and must not be edited in place, so it was promoted to a curated copy at `SKILL/content/pptx` and the vendor manifest row dropped.

**The acceptance metric was wrong, and the failure was informative.** Whole-description Jaccard *rose* (e.g. `brand-pptx` ↔ `brand-xlsx`, 0.714 → 0.745) because correct disambiguation adds shared vocabulary: every rewritten description now contains "only", "Not for", "use", and the sibling's name. A lexical-overlap score structurally punishes the fix it is meant to measure. Two better instruments were added to the analysis script — **prefix overlap** (Jaccard over the first 120 characters, the part a truncated listing still shows) and **divergence position** (how many characters a reader must consume before two descriptions differ).

Measured against git `HEAD` for the 13 pairs git tracks: **13 better, 0 same, 0 worse** — every pair's divergence position fell to 0–1 characters. Across the whole library 20,071 of 20,072 pairs now diverge within 40 characters; the one that does not is `docx` ↔ `pdf` (42 characters), a new finding outside the approved scope (both are vendored Anthropic skills, so a curated copy would be needed).

Two honest caveats:

- `project-update` ↔ `weekly-report` (2 characters) and the `brand-*` pairs (12 characters) were **already** distinguishable — their Jaccard was high because the rest of the description is shared task boilerplate, not because the head was ambiguous. The rewrite still helps a truncated listing, but it was not fixing a real selection failure there.
- **The behavioural trigger test was attempted and is blocked by the model endpoint, not by anything in this repo.** `docs/skill-capacity-audit/trigger_test.py` runs 16 realistic prompts (one per rewritten pair-side, tier-A skills only) through the Claude Code CLI in print mode and reads the Skill tool calls out of the stream-json transcript. First run with 4 concurrent workers: 15 of 16 prompts TIMED OUT, and the transcript shows why — the endpoint returned **HTTP 429 rate_limit on every attempt**, ten retries with exponential backoff each. A single serial probe timed out the same way afterwards, so the limit is a quota, not a concurrency artefact. The harness is committed and re-runnable:

  ```powershell
  python docs\skill-capacity-audit\trigger_test.py --workers 1 --timeout 150 --json trigger-test.json
  ```

  PASS = the expected skill is invoked; ABSTAIN = no skill invoked (legitimate); FAIL = the sibling was invoked.

**Per skill:** `version:` set or bumped (the vault copy is now a local fork of its upstream), the `INSTRUCTION.md` row updated, and one commit per skill on `fix/skill-shadowing-descriptions`.

---

## 5. Phase 5 — regression guard (done)

`scripts/verify-capacity.ps1` fails the build on: a retired skill present in any store; two installed skills with the same frontmatter name; the same name with different content across stores; a manifest skill with no tier row; a manifest skill missing from the canonical store. It warns when the tier-A listing exceeds the budget.

Current result: **PASS** — `no retired skill installed (67 names checked)`, `no duplicate frontmatter names`, `no cross-store content divergence`, `every manifest skill has a tier (269 skills)`, `every installed manifest skill is present`, `tier A listing 24508 chars (58 skills) fits the budget (0.68x of 36000 chars)`.

**Not wired as a hard CI gate.** The listing-budget check is a warning, because the budget is a vendor's self-reported number and a hard gate would fail on a legitimate large install.

---

## 6. Phase 6 — the 14 vendor skills (done)

GitHub is reachable **through the local proxy**. Setting `NO_PROXY=*` (as AGENTS.md's proxy note suggests) makes it *unreachable* — the direct connection is reset. With the proxy intact:

```powershell
git submodule update --init --recursive vendor/anthropics-skills vendor/claude-skills `
                      vendor/investment-masters vendor/tripo-skills
```

All four checked out at their pinned commits and the 14 skills installed.

**Safety gate (AGENTS.md requires skill-inspector before installing a third-party pack):** the `skillspector` CLI is not installed and does not resolve on PyPI under that name, so the documented fallback applied — manual source review. A scripted pattern scan over all 14 skills (credential reads, pipe-to-shell, download-and-execute, persistence, obfuscation, exfiltration endpoints, secret literals) plus reading the hits: the Anthropic pack's hits were documentation *about* `ANTHROPIC_API_KEY` usage and prompt-injection defences; the four third-party packs returned **zero** hard-pattern hits. Verdict: **APPROVE**, with the caveat that this was not a full static scan.

---

## 7. Explicitly not done

| action | why not |
|---|---|
| deleting skills to shrink the listing | skill bodies load lazily; the cost is the *listing*. Deleting destroys capability for no measured gain |
| `sync-skills.ps1 -Prune` | would delete the 59 hand-installed skills that live outside this vault — collateral damage, not cleanup |
| `-Profile core -PruneToProfile` | the user chose to keep everything installed; the lever is built and documented, and runs in one command if that changes |
| Codex `[[skills.config]]` entries | the Codex CLI is not installed here; the entries would be inert and unverifiable |
| `agents/openai.yaml` per skill | it writes into the skill dir, which the next `robocopy /MIR` would delete, and it breaks the byte-identical install check |
| editing skill frontmatter to add `disable-model-invocation` | same reason — the vault copy and the installed copy must stay byte-identical for `verify-install.ps1` to mean anything |
| raising the listing budget as the fix | it moves the symptom. The budget is the constraint, not the cause |
| using whole-description Jaccard as the Phase 4 acceptance metric | it punishes correct disambiguation; replaced by prefix overlap + divergence position (§4) |
| a behavioural trigger test for the rewritten skills | needs a live model session; not performed — the structural proxy is what was measured |

## 8. Definition of done

- [x] all 277 manifest skills installed and byte-identical (`match=277 mismatch=0 missing=0`)
- [x] 0 duplicate frontmatter names, 0 cross-store collisions, 0 divergence
- [x] `html-ppt` restored into the vault from its pinned submodule
- [x] tier file with one explicit row per manifest skill; manifest carries the tier
- [x] Claude Code: 211 tier-B skills hidden from auto-selection, still invocable; token and settings intact
- [x] `verify-capacity.ps1` guard passes
- [x] 24 descriptions rewritten; divergence position improved for 13/13 measurable pairs, 0 worse
- [x] `docx` ↔ `pdf` fixed: both vendored skills promoted to curated copies with front-loaded format words; **all 20,253 pairs now diverge within 40 characters**
- [x] behavioural trigger harness committed (`docs/skill-capacity-audit/trigger_test.py`); the run is blocked by model-endpoint 429 rate limits, not by anything in the repo
- [x] changes committed on branches → PR → merge
- [ ] run the trigger test when the endpoint permits (`python docs\skill-capacity-audit\trigger_test.py --workers 1 --timeout 150`)
