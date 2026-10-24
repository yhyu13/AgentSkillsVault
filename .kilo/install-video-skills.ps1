# install-video-skills.ps1
# Install the newly vendored `video/` skills into the user-level agent skill stores.
# Layout rule (see INSTRUCTION.md): ~/.claude/skills is the ONLY real store;
# ~/.kilo/skills, ~/.codex/skills, ~/.agents/skills are junction "views" onto it.
#   - new skill : real copy -> ~/.claude/skills/<name>; junction in the other three
#   - existing   : refresh the real copy in ~/.claude/skills/<name>, ensure junctions
# Deleting a junction uses `cmd /c rmdir` (removes the link only).

$ErrorActionPreference = 'Continue'

$Vault = Split-Path -Parent $PSScriptRoot
$VideoDir = Join-Path $Vault 'video'
$ClaudePath = Join-Path $HOME '.claude\skills'
$Views = @(
  (Join-Path $HOME '.kilo\skills'),
  (Join-Path $HOME '.codex\skills'),
  (Join-Path $HOME '.agents\skills')
)

if (-not (Test-Path -LiteralPath $VideoDir)) { Write-Host "no video/ dir"; exit 1 }
New-Item -ItemType Directory -Force -Path $ClaudePath | Out-Null
foreach ($v in $Views) { New-Item -ItemType Directory -Force -Path $v | Out-Null }

function Copy-Tree {
  param([string]$Src, [string]$Dst)
  New-Item -ItemType Directory -Force -Path $Dst | Out-Null
  robocopy $Src $Dst /MIR /NFL /NDL /NJH /NJS /NP /NC /NS | Out-Null
}

function Ensure-Junction {
  param([string]$Link, [string]$Target)
  if (Test-Path -LiteralPath $Link) {
    $item = Get-Item -LiteralPath $Link -Force
    if ($item.LinkType -and ($item.Target -contains $Target)) { return 'unchanged' }
    cmd /c rmdir "$Link" 2>&1 | Out-Null
    if (Test-Path -LiteralPath $Link) { return "LINK-FAILED(exists)" }
  }
  cmd /c mklink /J "$Link" "$Target" | Out-Null
  if (Test-Path -LiteralPath $Link) { return 'linked' } else { return 'LINK-FAILED' }
}

$skills = Get-ChildItem -LiteralPath $VideoDir -Recurse -Directory |
  Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'SKILL.md') }

$report = @()
foreach ($s in $skills) {
  $name = $s.Name
  $real = Join-Path $ClaudePath $name
  Copy-Tree -Src $s.FullName -Dst $real
  $action = 'installed'
  foreach ($v in $Views) {
    $r = Ensure-Junction -Link (Join-Path $v $name) -Target $real
    $report += [pscustomobject]@{ Skill = $name; Store = Split-Path $v -Leaf; Action = $r }
  }
  $report += [pscustomobject]@{ Skill = $name; Store = 'claude'; Action = $action }
}

$report | Where-Object { $_.Action -like 'LINK-FAILED*' } | Format-Table -AutoSize
Write-Host ("`nInstalled {0} video skills into {1} (+ junction views)" -f $skills.Count, $ClaudePath)
