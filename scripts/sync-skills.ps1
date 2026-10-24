# Install / refresh every skill listed in scripts/install-manifest.txt into the user-level
# agent skill stores.
#
# Layout rule (see AGENTS.md):
#   ~/.claude/skills/<name>   -> the ONE real copy (canonical store)
#   ~/.kilo/skills/<name>     -> junction view onto the canonical copy
#   ~/.codex/skills/<name>    -> junction view
#   ~/.agents/skills/<name>   -> junction view
#
# HOST entries in the manifest are left untouched (installed outside this vault).
# A skill absent from the manifest is never installed.
#
# Deleting a junction uses `cmd /c rmdir` (removes the link only, not the target).
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/sync-skills.ps1

param(
  [string]$Manifest = (Join-Path (Split-Path -Parent $PSScriptRoot) 'scripts\install-manifest.txt'),
  [switch]$Prune    # remove installed skills that are not in the manifest
)

$ErrorActionPreference = 'Continue'
$Vault = Split-Path -Parent $PSScriptRoot
$ClaudePath = Join-Path $HOME '.claude\skills'
$Views = @(
  (Join-Path $HOME '.kilo\skills'),
  (Join-Path $HOME '.codex\skills'),
  (Join-Path $HOME '.agents\skills')
)

function Get-TreeHash {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return $null }
  $root = (Resolve-Path -LiteralPath $Path).Path
  $files = Get-ChildItem -LiteralPath $root -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch '[\\/]\.git[\\/]' } | Sort-Object FullName
  if (-not $files -or $files.Count -eq 0) { return 'EMPTY' }
  $sb = New-Object System.Text.StringBuilder
  foreach ($f in $files) {
    $rel = $f.FullName.Substring($root.Length).TrimStart('\','/').Replace('\','/')
    [void]$sb.Append($rel).Append('|').Append($f.Length).Append('|').Append((Get-FileHash -LiteralPath $f.FullName -Algorithm SHA256).Hash).Append("`n")
  }
  $sha = [System.Security.Cryptography.SHA256]::Create()
  (($sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($sb.ToString()))) | ForEach-Object { $_.ToString('x2') }) -join ''
}

function Remove-LinkOrDir {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return }
  $item = Get-Item -LiteralPath $Path -Force
  if ($item.LinkType) { cmd /c rmdir "$Path" 2>&1 | Out-Null }
  else { Remove-Item -LiteralPath $Path -Recurse -Force -ErrorAction SilentlyContinue }
}

function Ensure-Junction {
  param([string]$Link, [string]$Target)
  if (Test-Path -LiteralPath $Link) {
    $item = Get-Item -LiteralPath $Link -Force
    if ($item.LinkType -and ($item.Target -contains $Target)) { return 'unchanged' }
    Remove-LinkOrDir -Path $Link
  }
  cmd /c mklink /J "$Link" "$Target" 2>&1 | Out-Null
  if (Test-Path -LiteralPath $Link) { return 'linked' }
  return 'LINK-FAILED'
}

New-Item -ItemType Directory -Force -Path $ClaudePath | Out-Null
foreach ($v in $Views) { New-Item -ItemType Directory -Force -Path $v | Out-Null }

$entries = New-Object System.Collections.Generic.List[object]
foreach ($line in Get-Content -LiteralPath $Manifest -Encoding UTF8) {
  $line = $line.Trim()
  if (-not $line -or $line.StartsWith('#')) { continue }
  $parts = $line -split '\|', 2
  if ($parts.Count -lt 2) { continue }
  $entries.Add([pscustomobject]@{ Name = $parts[0].Trim(); Source = $parts[1].Trim() })
}
Write-Host ("Manifest entries: {0}" -f $entries.Count)

$report = New-Object System.Collections.Generic.List[object]
foreach ($e in $entries) {
  if ($e.Source -eq 'HOST') {
    # Host-local skills are not tracked in this vault, but they still follow the layout rule:
    # the real copy lives in ~/.claude/skills and the other stores are junction views.
    # Some were installed the other way round (real dir in ~/.agents); normalize that here.
    $real = Join-Path $ClaudePath $e.Name
    if (-not (Test-Path -LiteralPath $real)) {
      foreach ($v in $Views) {
        $candidate = Join-Path $v $e.Name
        if (Test-Path -LiteralPath $candidate) {
          $item = Get-Item -LiteralPath $candidate -Force
          if (-not $item.LinkType) {
            Copy-Item -LiteralPath $candidate -Destination $real -Recurse -Force
            Remove-Item -LiteralPath $candidate -Recurse -Force
            break
          }
        }
      }
    }
    foreach ($v in $Views) {
      $r = Ensure-Junction -Link (Join-Path $v $e.Name) -Target $real
      $report.Add([pscustomobject]@{ Skill = $e.Name; Action = 'host'; View = (Split-Path $v -Leaf); ViewAction = $r }) | Out-Null
    }
    $report.Add([pscustomobject]@{ Skill = $e.Name; Action = 'host-skip' }) | Out-Null
    continue
  }
  $srcPath = Join-Path $Vault ($e.Source -replace '/', '\')
  if (-not (Test-Path -LiteralPath $srcPath)) {
    $report.Add([pscustomobject]@{ Skill = $e.Name; Action = 'SOURCE-MISSING' }) | Out-Null
    continue
  }
  $real = Join-Path $ClaudePath $e.Name
  $srcHash = Get-TreeHash -Path $srcPath
  $dstHash = Get-TreeHash -Path $real
  $action = 'unchanged'
  if ($srcHash -ne $dstHash) {
    # A stale junction here would make robocopy write through into another store.
    if (Test-Path -LiteralPath $real) {
      $item = Get-Item -LiteralPath $real -Force
      if ($item.LinkType) { Remove-LinkOrDir -Path $real }
    }
    New-Item -ItemType Directory -Force -Path $real | Out-Null
    robocopy $srcPath $real /MIR /NFL /NDL /NJH /NJS /NP /NC /NS | Out-Null
    $action = if ($dstHash) { 'updated' } else { 'installed' }
  }
  foreach ($v in $Views) {
    $r = Ensure-Junction -Link (Join-Path $v $e.Name) -Target $real
    $report.Add([pscustomobject]@{ Skill = $e.Name; Action = $action; View = (Split-Path $v -Leaf); ViewAction = $r }) | Out-Null
  }
  $report.Add([pscustomobject]@{ Skill = $e.Name; Action = $action }) | Out-Null
}

if ($Prune) {
  $manifestNames = $entries | ForEach-Object { $_.Name }
  # $Views holds plain paths, so build the store list explicitly - a mixed
  # array of hashtables and strings made $store.P null for the view stores
  # and left dangling junctions behind.
  $pruneStores = @(
    @{ N = 'claude'; P = $ClaudePath },
    @{ N = 'kilo';   P = (Join-Path $HOME '.kilo\skills') },
    @{ N = 'codex';  P = (Join-Path $HOME '.codex\skills') },
    @{ N = 'agents'; P = (Join-Path $HOME '.agents\skills') }
  )
  foreach ($store in $pruneStores) {
    foreach ($d in (Get-ChildItem -LiteralPath $store.P -Directory -ErrorAction SilentlyContinue)) {
      if ($manifestNames -notcontains $d.Name) {
        Remove-LinkOrDir -Path $d.FullName
        Write-Host ("PRUNED {0} :: {1}" -f $d.Name, $store.N)
      }
    }
  }
}

$counts = $report | Where-Object { $_.Action -notin @('unchanged','host-skip') } | Group-Object Action
foreach ($c in $counts) { Write-Host ("{0}={1}" -f $c.Name, $c.Count) }
$problems = $report | Where-Object { $_.Action -eq 'SOURCE-MISSING' -or $_.ViewAction -like 'LINK-FAILED*' }
if ($problems) {
  Write-Host "`n--- Problems ---"
  $problems | Format-Table -AutoSize
} else {
  Write-Host "`nNo problems."
}
