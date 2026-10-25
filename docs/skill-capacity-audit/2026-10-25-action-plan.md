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
| 4 — fix the confusable skills | ⏸ **queued for user review** | 23 candidate rows written with proposed first lines; **not applied** — AGENTS.md requires a batch review first (§4) |
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

## 4. Phase 4 — the 23 confusable skills (queued for review)

**Not applied.** AGENTS.md: *"Skills are changed only after the user batch-reviews the queue."* The 23 skills and the proposed first lines are in `SKILL_CANDIDATES.md` (rows #27+), so the review is a single read.

Measured pairs at Jaccard ≥ 0.30 (16 pairs, 23 skills):

| pair | Jaccard | fix |
|---|---|---|
| `brand-pptx` / `brand-xlsx` | 0.714 | first line names the format |
| `brand-docx` / `brand-pptx` | 0.690 | as above |
| `brand-docx` / `brand-xlsx` | 0.659 | as above |
| `grill-me` / `grill-with-docs` | 0.556 | differentiate on the output |
| `blog-to-linkedin-post` / `blog-to-twitter-post` | 0.548 | name the platform in the first words |
| `project-update` / `weekly-report` | 0.429 | the trigger is the cadence |
| `aura-asset-images` / `unsplash-asset-images` | 0.419 | name the source in the first words |
| `grafana-loki-label-analyzer` / `grafana-prometheus-label-strategy` | 0.377 | name the backend first |
| `game-dev-loop` / `software-dev-loop` | 0.375 | put the domain in the first words |
| `hands-on-deck` / `pptx` | 0.362 | "edit an existing .pptx" vs "create a deck" |
| `style-*` × 6 | 0.300–0.333 | each first line names the company |
| `style-report` / `style-google` | 0.300 | router says "only when the user names a company style" |

**Acceptance:** `skills_in_at_least_one_shadowing_pair` drops from 23 → ≤ 5, and each rewritten skill wins its own triggers while losing its sibling's. Per skill: bump `version:`, update the `INSTRUCTION.md` row, then build → sync → verify.

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
| `sync-skills.ps1 -Prune` | would delete the 68 hand-installed skills that live outside this vault — collateral damage, not cleanup |
| `-Profile core -PruneToProfile` | removes 211 skills from the user's environment; it is the right lever for Kilo but it is the user's call (§3.3) |
| Codex `[[skills.config]]` entries | the Codex CLI is not installed here; the entries would be inert and unverifiable |
| `agents/openai.yaml` per skill | it writes into the skill dir, which the next `robocopy /MIR` would delete, and it breaks the byte-identical install check |
| editing skill frontmatter to add `disable-model-invocation` | same reason — the vault copy and the installed copy must stay byte-identical for `verify-install.ps1` to mean anything |
| raising the listing budget as the fix | it moves the symptom. The budget is the constraint, not the cause |
| applying the 23 description rewrites | AGENTS.md requires a user batch review first (§4) |

## 8. Definition of done

- [x] all 269 manifest skills installed and byte-identical (`match=269 mismatch=0 missing=0`)
- [x] 0 duplicate frontmatter names, 0 cross-store collisions, 0 divergence
- [x] `html-ppt` restored into the vault from its pinned submodule
- [x] tier file with one explicit row per manifest skill; manifest carries the tier
- [x] Claude Code: 211 tier-B skills hidden from auto-selection, still invocable; token and settings intact
- [x] `verify-capacity.ps1` guard passes
- [x] changes committed on branches → PR → merge
- [ ] 23 shadowing fixes applied (after the batch review of `SKILL_CANDIDATES.md` rows #27+)
- [ ] decision on whether Kilo should run `-Profile core -PruneToProfile`
