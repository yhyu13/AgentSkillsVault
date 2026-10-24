# INSTRUCTION.md — gracker-writing

This directory is a **vendored copy** of the upstream `gracker-writing` skill.
The canonical source is kept as its own git repo so this vault copy can track
upstream changes instead of drifting.

## Origin source repo

- **Repo:** https://github.com/yhyu13/gracker-writing
- **Local clone:** `D:\GitRepo-AI\gracker-writing` (branch `main`, remote `origin`)
- **License:** MIT — keep `LICENSE` with every copy (MIT requires the notice).

Do not fix upstream issues by editing the vault copy directly. Pull the source
repo, then re-copy.

## What is copied

The whole skill directory, matching upstream:

- `SKILL.md`
- `README.md`
- `LICENSE`
- `agents/openai.yaml`
- `references/` (android-terminology, copy-editing, human-feel, quality-gate, refinement-mode, style-rules)
- `.gitignore` (upstream build artifact; harmless here)

## Track upstream changes

```powershell
git -C D:\GitRepo-AI\gracker-writing fetch origin
git -C D:\GitRepo-AI\gracker-writing log --oneline origin/main -5
```

## Update this vault copy

1. Pull upstream in the source clone:

   ```powershell
   git -C D:\GitRepo-AI\gracker-writing pull
   ```

2. Re-copy the whole directory into the vault (`.git` is excluded by naming the
   items explicitly):

   ```powershell
   $Src   = "D:\GitRepo-AI\gracker-writing"
   $Vault = "D:\GitRepo-AI\AgentSkillsVault\content\gracker-writing"
   Remove-Item -Recurse -Force $Vault
   New-Item -ItemType Directory -Force $Vault | Out-Null
   Copy-Item -Force "$Src\SKILL.md","$Src\README.md","$Src\LICENSE","$Src\.gitignore" $Vault
   Copy-Item -Recurse -Force "$Src\agents","$Src\references" $Vault
   ```

3. Re-install to the three agent hosts (see below).

4. Commit and push the vault.

## Installed copies

| Host | Path |
|------|------|
| Kilo Code | `~/.kilo/skills/gracker-writing/` |
| Claude Code | `~/.claude/skills/gracker-writing/` |
| Codex CLI | `~/.codex/skills/gracker-writing/` |

```powershell
$Vault = "D:\GitRepo-AI\AgentSkillsVault\content\gracker-writing"
Copy-Item -Recurse -Force $Vault "$HOME\.kilo\skills\gracker-writing"
Copy-Item -Recurse -Force $Vault "$HOME\.claude\skills\gracker-writing"
Copy-Item -Recurse -Force $Vault "$HOME\.codex\skills\gracker-writing"
```

Start a new session (or run `/reload` in Kilo) after updating so the host
rescans the skill.
