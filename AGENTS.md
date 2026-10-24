# AGENTS.md — AgentSkillsVault

Vault of Agent Skills. One skill = one directory containing `SKILL.md` (plus optional
`references/`, `scripts/`, `templates/`, `assets/`, `examples/`). Skills are installed
flat into the user-level agent stores by **leaf directory name** — so leaf names must be
globally unique across the whole vault.

## Layout

```
SKILL/<category>/<skill>/SKILL.md   curated skills (categories: content, design, devops,
                                    game-dev, knowledge-vault, management, software-development,
                                    video, writing, agents, …)
vendor/<repo>/                      upstream git submodules — source of truth for re-adding
                                    skills; NOT installed unless listed in the manifest
docs/                               audits, reports, audit python scripts (not installable)
scripts/                            manifest build / sync / verify tooling
.kilo/                              harness-local sync scripts + pinned/removed skill lists
```

- `SKILL/` is the only source of curated skills. A skill dir is any directory that
  contains a `SKILL.md`; nesting is allowed (`software-development/mattpocock/skills/engineering/tdd`
  installs as `tdd`).
- `vendor/` submodules are pinned by commit. Editing a vendored file is lost on
  `git submodule update` — vendored skills are copied into `SKILL/`, never edited in place.
- `README.md` and `INSTRUCTION.md` are the human-facing index and provenance record.
  **The manifest and the file tree are the executable truth** — those two docs drift.

## Install / distribution model (single real copy + junction views)

```
~/.claude/skills/<name>    the ONE real copy (canonical store)
~/.kilo/skills/<name>      junction view  \
~/.codex/skills/<name>     junction view   } -> ~/.claude/skills/<name>
~/.agents/skills/<name>    junction view  /
```

- Create a view: `cmd /c mklink /J <link> <target>` (junction needs no admin; `ln -s`
  under MSYS silently degrades to a copy unless `MSYS=winsymlinks:nativestrict`).
- Delete a view: `cmd /c rmdir <link>` — **only** the link. `Remove-Item -Recurse` on a
  junction in PS 5.1 can delete the target's contents.
- Never hand-copy a skill into a second store. That is how a foreign `SKILL.md` silently
  overwrote a vault copy before.

## Commands (the workflow that matters)

```powershell
# 1. regenerate the authoritative install list from the tree
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\build-manifest.ps1
# 2. install / refresh every listed skill into the four user stores
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\sync-skills.ps1
# 3. prove the stores match the vault byte-for-byte
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\verify-install.ps1 -Manifest scripts\install-manifest.txt
```

- `scripts/install-manifest.txt` is **the** install list: `<name>|<vault-relative-path>`,
  `HOST` for skills living outside the vault. A skill absent from the manifest is never
  installed; removing a line is how a skill is retired.
- **Manifest paths are relative to the repo root, not to `SKILL/`.** Any move/rename/add of
  a skill dir invalidates the manifest — regenerate it, otherwise sync reports
  `SOURCE-MISSING` and silently installs nothing for that skill.
- `scripts/compare-skill.ps1 -A <dir> -B <dir>` compares two skill trees by content hash
  (use it to prove a re-sync landed).
- `build-manifest.ps1` picks up *every* dir with a `SKILL.md` outside `vendor/` and
  `docs/`, so a stray copy of a skill anywhere in the tree becomes an install entry.
- `.kilo/sync-vault-skills-v2.ps1` is the older whole-tree installer (byte copies into
  claude/kilo/codex, junction for `.agents`); `.kilo/pinned-skills.txt` lists the
  vendor-only skills it may install. Prefer `scripts/sync-skills.ps1`.

## Retired skills

68 skills were retired on 2026-10-25 by the defect audit (unusable / broken payload
references / low quality / not standalone). They are:

- removed from `SKILL/` and from every user store,
- absent from the manifest (so sync cannot resurrect them),
- listed with the reason and the retained upstream copy in `REMOVED-SKILLS.md`,
- blocked by `.kilo/removed-skills.txt`.

The audit tooling lives in `docs/skill-capacity-audit/` (`score_skills.py`,
`defect_audit.py`, `render_defect_report.py`, …). Re-adding a retired skill means fixing
it upstream first, then copying from `vendor/` — not un-retiring it in place.

## Provenance — every skill must have an origin

`INSTRUCTION.md` is the authoritative origin record (types: `repo` / `sibling` / `local`).
**Never add a skill without a row there**, and update the row when the upstream moves.
- `repo` → re-clone or `npx skills add <org>/<repo> --skill <name>`, then copy the whole
  skill dir; verify with `diff -rq` / `compare-skill.ps1`.
- `sibling` → `Copy-Item -Recurse -Force` from the sibling repo under `D:\GitRepo-AI\`.
- `local` → edit in place and bump the frontmatter `version:`.

Copy the **whole** skill directory, never only `SKILL.md` — relative links into
`references/` and helper scripts break otherwise.

Before installing any third-party pack, run the `skill-inspector` skill
(`software-development/skill-inspector`, NVIDIA SkillSpector) for injection/exfiltration
checks.

## Editing discipline for skills

- **Do not change a skill while working on a task.** Append the finding to
  `SKILL_CANDIDATES.md` (one row: finding, evidence, target skill, suggested location).
  Skills are changed only after the user batch-reviews the queue.
- `git pull` before touching a skill: multiple sessions/machines edit this vault.
- One session per skill; commit and push right after the change.
- After changing a skill: bump `version:`, update the `INSTRUCTION.md` provenance row,
  then re-run `build-manifest.ps1` → `sync-skills.ps1` → `verify-install.ps1` and confirm
  byte-identical copies in the user store.

## Windows / host quirks (this machine)

- Shell is PowerShell 5.1. `Remove-Item -Recurse` on a junction is dangerous; use
  `cmd /c rmdir`.
- Console encoding is GBK: Chinese text in CLI output is mojibake and Python CLIs die on
  emoji (`UnicodeEncodeError`). Set `PYTHONIOENCODING=utf-8` + `PYTHONUTF8=1`, and read
  UTF-8 files with the file-read tool rather than trusting the console rendering.
- `npm`/`npx` on Windows: the execution policy blocks `npm.ps1` — call `npm.cmd` /
  `npx.cmd`. A dead proxy (`HTTP_PROXY=127.0.0.1:8889` returning 403 to GitHub) breaks
  `git push`; clear the proxy vars or set `NO_PROXY=*` before pushing.
- Third-party installers using `curl … | sh` are macOS/Linux only — Windows needs the
  `.ps1` path or `uvx <pkg> setup`.

## Git flow

Work on a feature branch, commit, push the branch, merge it into `main`, then push
`main`. `main` and `origin/main` are currently in sync; the working branch is ahead.
Submodules: `git submodule update --init --recursive` before touching `vendor/`.

## Where to look

| need | file |
|---|---|
| what a skill is / where it lives | `SKILL/` tree, `scripts/install-manifest.txt` |
| where a skill came from / how to update it | `INSTRUCTION.md` |
| install to Claude Code / Codex / Kilo / Hermes | `README.md` (per-harness sections) |
| why a skill was removed | `REMOVED-SKILLS.md` |
| quality scores and defect classes | `docs/skill-capacity-audit/` |
| pending reusable findings | `SKILL_CANDIDATES.md` |
| host/cron/kanban operational facts | `KNOWLEDGE.md`, `JOURNEY.md` |
