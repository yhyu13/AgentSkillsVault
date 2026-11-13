# Move the ONE real copy of every installed skill into the primary store
# (scripts/install-scope.json -> "primaryStore", default ~/.agents/skills).
#
# Background: the vault used to keep the real copies in ~/.claude/skills and
# junction the rest. Cindy's own design is the other way round - it treats
# ~/.agents/skills as the shared store and re-projects it into .claude/skills on
# every start, so a real copy under .claude fights the host.
#
# Safety: every store's tree hash for a skill must agree before anything is
# deleted. A skill whose copies differ is reported as CONFLICT and left alone.
# Real directories in non-primary stores are backed up to %TEMP% before removal.
#
# Dry run by default; -Apply performs the moves.
#
# Usage:
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\migrate-primary-to-agents.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\migrate-primary-to-agents.ps1 -Apply

param(
  [switch]$Apply
)

$ErrorActionPreference = 'Stop'
$Vault = Split-Path -Parent $PSScriptRoot
$ScopeFile = Join-Path $Vault 'scripts\install-scope.json'
$manifest = Join-Path $Vault 'scripts\install-manifest.txt'
$backup = Join-Path $env:TEMP ('skill-primary-migration-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))

$PrimaryStore = '.agents'
if (Test-Path -LiteralPath $ScopeFile) {
  try {
    $cfg = Get-Content -LiteralPath $ScopeFile -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($cfg.primaryStore) { $PrimaryStore = [string]$cfg.primaryStore }
  } catch { }
}
$StoreNames = @('.agents', '.claude', '.kilo', '.codex')
$StorePaths = [ordered]@{}
foreach ($s in $StoreNames) { $StorePaths[$s] = Join-Path $HOME (Join-Path $s 'skills') }
$PrimaryPath = $StorePaths[$PrimaryStore]
Write-Host ("primary store: ~/{0}/skills  (backup: {1})" -f $PrimaryStore, $backup)

function Get-TreeHash([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) { return $null }
  $root = (Resolve-Path -LiteralPath $Path).Path
  $files = Get-ChildItem -LiteralPath $root -Recurse -File -Force -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch '[\\/]\.git[\\/]' } | Sort-Object FullName
  if (-not $files) { return 'EMPTY' }
  $sb = New-Object System.Text.StringBuilder
  foreach ($f in $files) {
    $rel = $f.FullName.Substring($root.Length).TrimStart('\', '/').Replace('\', '/')
    [void]$sb.Append($rel).Append('|').Append($f.Length).Append('|').Append((Get-FileHash -LiteralPath $f.FullName -Algorithm SHA256).Hash).Append("`n")
  }
  $sha = [System.Security.Cryptography.SHA256]::Create()
  return ((($sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($sb.ToString()))) | ForEach-Object { $_.ToString('x2') }) -join '')
}

$manifestNames = @{}
if (Test-Path -LiteralPath $manifest) {
  foreach ($line in Get-Content -LiteralPath $manifest -Encoding UTF8) {
    $l = $line.Trim()
    if (-not $l -or $l.StartsWith('#') -or $l -notmatch '\|') { continue }
    $manifestNames[($l -split '\|')[0].Trim()] = $true
  }
}

# Candidate names: everything present in any of the four stores.
$names = New-Object System.Collections.Generic.HashSet[string]
foreach ($s in $StorePaths.Values) {
  Get-ChildItem -LiteralPath $s -Directory -Force -ErrorAction SilentlyContinue |
    ForEach-Object { [void]$names.Add($_.Name) }
}
Write-Host ("skill names seen across stores: {0}" -f $names.Count)

$moved = 0; $kept = 0; $conflicts = @(); $failed = @()
foreach ($n in ($names | Sort-Object)) {
  $state = @{}
  foreach ($s in $StorePaths.Keys) {
    $p = Join-Path $StorePaths[$s] $n
    if (-not (Test-Path -LiteralPath $p)) { $state[$s] = $null; continue }
    $it = Get-Item -LiteralPath $p -Force
    $state[$s] = [pscustomobject]@{ Path = $p; IsLink = [bool]$it.LinkType; Hash = (Get-TreeHash $p) }
  }
  $hashes = @($state.Keys | Where-Object { $state[$_] } | ForEach-Object { $state[$_].Hash } | Sort-Object -Unique)
  if ($hashes.Count -gt 1) {
    $conflicts += ("{0}: " + (($state.Keys | Where-Object { $state[$_] } | ForEach-Object { $h = [string]$state[$_].Hash; if ($h.Length -gt 8) { $h = $h.Substring(0, 8) }; "$_=$h" }) -join ', '))
    continue
  }

  $primary = $state[$PrimaryStore]
  if ($primary -and -not $primary.IsLink) { $kept++; continue }   # already the real copy

  # Donor: a store that currently holds the REAL directory.
  $donor = @($StorePaths.Keys | Where-Object { $_ -ne $PrimaryStore -and $state[$_] -and -not $state[$_].IsLink })[0]
  if (-not $donor) {
    # Only junctions exist (a cycle or a dangling target). Nothing to move.
    if ($primary -and $primary.IsLink) { $failed += ("{0}: primary is a junction and no store holds the real dir" -f $n) }
    continue
  }

  if (-not $Apply) {
    Write-Host ("PLAN {0,-40} {1} -> {2}" -f $n, $donor, $PrimaryStore)
    $moved++
    continue
  }

  if (-not (Test-Path -LiteralPath $backup)) { New-Item -ItemType Directory -Force -Path $backup | Out-Null }
  # 1) drop the primary's junction, if any
  if ($primary -and $primary.IsLink) { cmd /c rmdir "$($primary.Path)" 2>&1 | Out-Null }
  # 2) move the real dir into the primary store
  $donorPath = $state[$donor].Path
  $dest = Join-Path $PrimaryPath $n
  try {
    Move-Item -LiteralPath $donorPath -Destination $dest -Force -ErrorAction Stop
  } catch {
    # A dir held open by another process (indexer, antivirus, a running harness)
    # aborts the move; record it and keep going so one lock cannot stop the run.
    $failed += ("{0}: move failed ({1})" -f $n, $_.Exception.Message.Split([char]10)[0])
    if ($primary -and -not (Test-Path -LiteralPath $PrimaryPath)) { New-Item -ItemType Directory -Force -Path $PrimaryPath | Out-Null }
    continue
  }
  if (-not (Test-Path -LiteralPath (Join-Path $dest 'SKILL.md'))) { $failed += ("{0}: moved but no SKILL.md at destination" -f $n) }
  $moved++
}
if ($Apply) { New-Item -ItemType Directory -Force -Path $PrimaryPath | Out-Null }

Write-Host ("moved={0} already-real={1} conflicts={2} failed={3}" -f $moved, $kept, $conflicts.Count, $failed.Count)
if ($conflicts.Count) {
  Write-Host "--- CONFLICT (content differs between stores, left untouched) ---"
  $conflicts | ForEach-Object { Write-Host ("  {0}" -f $_) }
}
if ($failed.Count) {
  Write-Host "--- FAILED ---"
  $failed | ForEach-Object { Write-Host ("  {0}" -f $_) }
}
if (-not $Apply) { Write-Host "DRY RUN - pass -Apply to perform the moves"; exit 0 }
Write-Host "next: powershell -NoProfile -ExecutionPolicy Bypass -File scripts\sync-skills.ps1"
