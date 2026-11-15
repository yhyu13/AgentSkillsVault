# Store visibility probe — does the install actually reach the harness?

**Date:** 2026-11-13 · **Host:** the authoring machine (Windows, MSYS Git Bash) · **Mode:** read-only
**Companion note:** [Top 20 agent-skill vault peers](./2026-11-13-agent-skill-vault-peers-top20.md), mechanism **D1** ("ask the harness what it discovered")
**Tool:** `SKILL_RADAR/scripts/store_matrix.py` (prototype, read-only) · `scripts/verify-install.ps1` (existing)

---

## 0. The question

The peer scan found that `alirezarezvani/claude-skills` verifies installs by *asking each harness which skills it discovered*, not by hashing files. That raised an obvious question about this vault: **we prove the copies are byte-identical — but does anything prove the skills are actually reachable?**

So instead of writing that up as advice, I measured it on this machine.

---

## 1. TL;DR

1. **`verify-install.ps1` is narrower than its name.** It verifies *"every manifest entry exists in the primary store and its tree hash equals the vault source"*. With the shipped `install-scope.json` (`linkViews: false`) it sets `$ViewNames = @()` and therefore **never looks at the 13 view stores at all**. It reported `match=113 mismatch=4 missing=19` over 136 manifest entries — accurate for what it checks, silent on store inventory.
2. **One declared store is completely empty.** `~/.kilo/skills` = **0 entries** (`kilo` is not installed on this host). Nothing reports it; `AGENTS.md` lists it as an active junction-view store.
3. **`~/.claude/skills` is not an independent store on this machine.** 192 of its 225 entries are symlinks into `~/.agents/skills`, mtime `2026-11-15 15:01` — the Cindy host re-projects the primary store on every start. Treating it as a "junction view" double-counts ownership.
4. **101 of the 227 entries in the primary store are not ours.** Any assertion of the form "the vault has N skills, the store has N" is wrong unless it is filtered by the manifest. (I made exactly that mistake writing last turn's note before checking.)
5. **The store is out of date for three skills right now, and nothing fails.** On `main` (`959346a`) the verifier reports `match=110 mismatch=6 missing=9`. Decomposed: **3 real drift** (`feishu-kdocs-cli`, `search-fallback`, `gracker-writing`), **1 `__pycache__`-only** (`pptx`), **2 worktree artefacts** (uninitialised vendor submodules). Worst case: `search-fallback` is missing its entire `references/` directory in the store — the installed skill cannot load its own references.
6. **No gate would ever have caught it.** `pr-gate.yml` runs `check_manifest.py` (manifest ↔ vault tree) and never `verify-install.ps1`. Store drift is only visible when a human runs the verifier and reads the exit code.
7. **One mismatch class is unfixable by re-sync.** `pptx` differs only by `__pycache__` — *running a skill's own scripts inside the store breaks byte-identity permanently*, so `mismatch` can never reach 0 while scripts are executed in place.
8. **One mismatch is in the wrong direction.** `gracker-writing`: the installed copy is a day *newer* than the vault and differs in `description:` — the store became the source of truth.

---

## 2. What the existing verifier actually does

`scripts/verify-install.ps1:78–100`, read directly:

```
if (-not $LinkViews) { $ViewNames = @() }        # install-scope.json → linkViews:false
...
$instPath = Join-Path $PrimaryPath $name          # only the primary store
if (-not (Test-Path $instPath)) -> MISSING
if (-not (Test-Path $srcPath))  -> NOSRC
if (Get-TreeHash $instPath) -eq (Get-TreeHash $srcPath) -> MATCH else MISMATCH
```

So it answers one question well: **"is this manifest entry present in the primary store and identical to the vault?"** It cannot answer: is a store empty, is an entry foreign, is a view stale, is the *harness* able to enumerate it.

---

## 3. Measured state (2026-11-13, this host)

`install-scope.json`: `primaryStore=.agents`, `linkViews=false`, `topBandsPerCategory=2` → manifest holds **125** installable skills (59 `A`, 66 `B`) on `main` @ `959346a`.

| store | entries | ours | foreign | reparse | no SKILL.md at depth 1 | of manifest present |
|---|---|---|---|---|---|---|
| `.agents` (primary) | 227 | 125 | 102 | 1 | 5 | **125/125** |
| `.claude` | 225 | 125 | 100 | 193 | 1 | 125/125 |
| `.kilo` | **0** | 0 | 0 | 0 | 0 | 0/125 |
| `.codex` | 31 | 0 | 31 | 0 | 1 | 0/125 |
| `.workbuddy` | 9 | 0 | 9 | 0 | 2 | 0/125 |
| `.hub` | 18 | 0 | 18 | 0 | 0 | 0/125 |
| `.mavis` | 9 | 0 | 9 | 0 | 0 | 0/125 |
| `.minimax` | 9 | 0 | 9 | 0 | 0 | 0/125 |
| `.cursor` | 3 | 0 | 3 | 0 | 0 | 0/125 |
| `.copilot` | 3 | 0 | 3 | 0 | 0 | 0/125 |
| `.kiro` | 32 | 0 | 32 | 0 | 0 | 0/125 |
| `.lingma` | 32 | 0 | 32 | 0 | 0 | 0/125 |
| `.qoder-cn` | 32 | 0 | 32 | 0 | 0 | 0/125 |
| `.codebuddy` | 32 | 0 | 32 | 0 | 0 | 0/125 |

`verify-install.ps1` over the same manifest: **`match=110 mismatch=6 missing=9`**. The 9 missing are all `NOSRC` — vendored-only skills whose `vendor/` submodule is not initialised in this worktree, an artefact of this checkout rather than a defect. The 6 mismatches decompose as:

| skill | what differs | class |
|---|---|---|
| `search-fallback` | `SKILL.md` + `scripts/search.py` differ, **`references/` absent in the store** | real drift — the `tier2 → tier0` move in #41 was never synced |
| `feishu-kdocs-cli` | `SKILL.md`, 2 × `references/*.md`, `scripts/doctor.ps1` | real drift |
| `gracker-writing` | `SKILL.md` line 3 (`description:`); store mtime 2026-11-15 > vault 2026-11-14 | real drift, store ahead of vault |
| `pptx` | `scripts/office/{helpers,validators}/__pycache__` **only** | un-fixable by re-sync |
| `tygg-ai-film-studio`, `investment-masters` | uninitialised `vendor/` submodule | worktree artefact |

Reparse-point detail:
- `.agents` — exactly **1**: `mental-model-writing` → `C:\Git-repo-my\...\写作专栏\mental-model-writing`. An external skill junctioned into the primary store, which is what `scripts/normalize-external-skills.ps1` is for.
- `.claude` — **193**: 192 resolve into `~/.agents/skills`, 1 is the same external skill. The remaining **32 real directories** are foreign installs (`deepseek-stack` + 29 `ds-*` children, `peak-end-interest`), plus one stray file `dual-panel-loop.md`.
- **No foreign entry collides with a manifest name**, so nothing is being shadowed in `.claude` today.

---

## 4. Findings

| id | finding | evidence | severity |
|---|---|---|---|
| F1 | The verifier is scoped to presence + hash in the primary store; `linkViews:false` makes it skip all 13 view stores | `verify-install.ps1:56` `if (-not $LinkViews) { $ViewNames = @() }` | design — but the name promises more |
| F2 | A declared store can be silently empty | `.kilo/skills` = 0 entries; no output line mentions it | low (harness absent) / high as a class |
| F3 | `.claude` is host-projected, not vault-owned | 192 symlinks → `.agents`, mtime `2026-11-15 15:01` (host start) | model clarification |
| F4 | 101/227 primary-store entries are foreign | `store_matrix.py` on `.agents` | medium — invalidates any directory-count claim |
| F5 | 3 skills are drifted in the store on `main`, one missing a whole `references/` dir | `verify-install.ps1` `MISMATCH search-fallback / feishu-kdocs-cli / gracker-writing`; `diff -rq` per skill | **high — live, functional** |
| F6 | `pptx` MISMATCH is `__pycache__` only; running a skill's scripts in the store makes MATCH unreachable | `diff -rq` shows only `scripts/office/{helpers,validators}/__pycache__` | **medium — permanent false positive** |
| F7 | `gracker-writing`: the installed copy is newer than the vault and differs in `description:` | store mtime 2026-11-15 vs vault 2026-11-14, both 285 lines; `diff` on line 3 | **high — the source-of-truth direction inverted** |
| F9 | The PR gate never runs the store verifier | `pr-gate.yml` → `check_manifest.py` only; `grep verify-install` = no match | **high — F5/F7 can persist indefinitely** |
| F8 | A depth-1 `SKILL.md` test cannot see nested marketplace layouts | `.agents/@user_97275c6e/lux3d-cn/SKILL.md` (nested), reported as "no SKILL.md" | method caveat for my own script |

**The two that matter:** F7 is the failure mode the whole primary-store + junction model exists to prevent (someone edited the installed copy, or sync ran against a newer workspace copy). F6 means the verifier's `mismatch` count has a permanent noise floor for every skill that ships runnable scripts — `pptx`, `docx`, `pdf` and the rest will never show green after first use.

---

## 5. What this changes about D1

Last turn's candidate said "`verify-install.ps1` proves files identical, not that the harness sees it". That is directionally right but imprecise, and the imprecision matters:

- It **does** catch presence (`MISSING`) and content drift (`MISMATCH`). It found all three live drifts without help — but only when someone runs it.
- What it cannot do is **inventory**: empty store, foreign entries, stale view, host-projected vs vault-owned, and nested layouts. `store_matrix.py` answers those in ~1 second, read-only.
- The thing it still cannot do — and neither can `store_matrix.py` — is ask a harness *"which skills would you load right now?"*. Only `claude` is on this host (2.1.295, no offline `skills list` subcommand); `codex`/`gemini`/`kilo` are absent, so the peer's per-harness probe cannot be reproduced here. That half of D1 stays unproven, which is the honest state of it.

---

## 6. 判断与建议

| # | action | why now |
|---|---|---|
| 1 | **Put `verify-install.ps1` in `pr-gate.yml`.** Not to block on `mismatch` (see #3) but to publish the count as a check output | F9 — today a drifted store is invisible to every automated gate |
| 2 | **Re-sync the three drifted skills** — `search-fallback` (missing `references/`), `feishu-kdocs-cli`, `gracker-writing` | F5 — live functional drift; `search-fallback` cannot load its own references |
| 3 | Teach `Get-TreeHash` to ignore `__pycache__` / `*.pyc` | F6 — otherwise `mismatch` can never reach 0 and a real check becomes noise |
| 4 | Add a **reverse** drift check (store → vault) and state the rule: only edit the vault, then sync | F7 — `gracker-writing`'s store copy is ahead; no tool looks that way |
| 5 | Promote `store_matrix.py` into `scripts/` and run it beside the verifier | F2/F3/F4 — one second, read-only, answers a class the hasher cannot |
| 6 | Make `AGENTS.md` match the config: either `linkViews:true` (13 real views) or say plainly that `.agents` is the only managed store and `.claude` is host-projected | F1/F3 — two documents describe a model that is switched off |
| 7 | Stop claiming a skill count from a directory listing; always filter by the manifest | F4 — 102/227 entries in the primary store are not ours |

Items 1–4 are corrections to live defects. Items 5–7 are the peer-scan distillation, now backed by a measurement rather than a citation. Item 1 is deliberately *publish, not block*: the current `mismatch` signal is 33% noise (pycache + uninitialised submodules), so gating on it today would train everyone to ignore it — fix #3 and #4 first, then gate.

---

## Sources

- `scripts/install-manifest.txt` (136 entries, committed), `scripts/install-scope.json`, `scripts/verify-install.ps1` (read at lines 40–100)
- `SKILL_RADAR/scripts/store_matrix.py` (this probe), `install-scope.json` parsed for `primaryStore` / `linkViews`
- Live `~/.agents/skills`, `~/.claude/skills`, and 12 further store paths, enumerated read-only on 2026-11-13
- `claude --version` → 2.1.295; `claude --help` subcommands inspected; no offline skill-listing subcommand exists (`plugin`, `mcp`, `doctor`, `agents` only)

*Re-run with `python SKILL_RADAR/scripts/store_matrix.py`. Numbers are a snapshot of one machine on one day; the findings F1/F6/F8 are structural and will reproduce anywhere.*
