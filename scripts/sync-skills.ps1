# Install / refresh every skill listed in scripts/install-manifest.txt into the user-level
# agent skill stores.
#
# Layout rule (see AGENTS.md):
#   ~/.claude/skills/<name>   -> the ONE real copy (canonical store)
#   every other <store>/skills/<name> -> junction view onto the canonical copy
#     views: .kilo .codex .agents .workbuddy .hub .mavis .minimax
#            .cursor .copilot .kiro .lingma .qoder-cn .codebuddy
# Retired skills (.kilo/removed-skills.txt) are pruned from every store on each
# run, but only when the entry is a vault-created junction.
#
# HOST entries in the manifest are left untouched (installed outside this vault).
# A skill absent from the manifest is never installed.
#
# Deleting a junction uses `cmd /c rmdir` (removes the link only, not the target).
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/sync-skills.ps1
#        ... -AutoRegenerate   # rewrite the manifest first instead of aborting
#        ... -SkipFreshnessCheck
#
# Freshness guard: before touching any store this script regenerates the manifest
# in memory and compares it with scripts/install-manifest.txt. A stale manifest is
# refused, because running sync from an old checkout silently re-installs skills
# that were deliberately held back (this happened on 2026-11-13: a concurrent
# session synced a 286-entry manifest and undid a 129-skill reduction).

param(
  [string]$Manifest = (Join-Path (Split-Path -Parent $PSScriptRoot) 'scripts\install-manifest.txt'),
  [switch]$Prune,        # remove installed skills that are not in the manifest
  [string]$Profile = 'all',  # 'all' installs tiers A+B; 'core' installs tier A only
  [switch]$PruneToProfile, # with -Profile core, also REMOVE tier B skills from the canonical store
  [switch]$SkipFreshnessCheck,
  [switch]$AutoRegenerate
)

$ErrorActionPreference = 'Continue'
$Vault = Split-Path -Parent $PSScriptRoot

# --- manifest freshness guard ------------------------------------------------
if (-not $SkipFreshnessCheck) {
  $gen = Join-Path $PSScriptRoot 'build-manifest.ps1'
  if ((Test-Path -LiteralPath $gen) -and (Test-Path -LiteralPath $Manifest)) {
    if ($AutoRegenerate) {
      Write-Host 'freshness: regenerating the manifest (-AutoRegenerate)'
      & powershell -NoProfile -ExecutionPolicy Bypass -File $gen | Out-Host
    } else {
      $probeDir = Join-Path ([System.IO.Path]::GetTempPath()) ('manifest-probe-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
      New-Item -ItemType Directory -Force -Path $probeDir | Out-Null
      $probe = Join-Path $probeDir 'install-manifest.txt'
      & powershell -NoProfile -ExecutionPolicy Bypass -File $gen -OutFile $probe -Quiet | Out-Null
      $a = @(Get-Content -LiteralPath $Manifest -Encoding UTF8)
      $b = @(Get-Content -LiteralPath $probe -Encoding UTF8 -ErrorAction SilentlyContinue)
      $same = ($a.Count -eq $b.Count) -and -not (Compare-Object $a $b -SyncWindow 0)
      Remove-Item -LiteralPath $probeDir -Recurse -Force -ErrorAction SilentlyContinue
      if (-not $same) {
        Write-Host ''
        Write-Error ("manifest is STALE: {0} does not match what this checkout generates. Refusing to touch the stores.`n  fix: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-manifest.ps1`n  or:  add -AutoRegenerate to this command`n  a stale manifest re-installs skills that the current install scope holds back." -f $Manifest)
        exit 3
      }
      Write-Host 'freshness: manifest matches this checkout'
    }
  }
}
$ClaudePath = Join-Path $HOME '.claude\skills'
# Every harness store that receives a junction view onto the canonical copy.
# `.cc-switch\skills` is deliberately absent: it holds no skills (it is a
# config dir), so linking 240 entries into it would only be noise.
$ViewNames = @(
  '.kilo', '.codex', '.agents',        # original three
  '.workbuddy', '.hub', '.mavis', '.minimax',   # harnesses with their own curated sets
  '.cursor', '.copilot', '.kiro', '.lingma', '.qoder-cn', '.codebuddy'  # hyperframes stores
)
$Views = @($ViewNames | ForEach-Object { Join-Path $HOME (Join-Path $_ 'skills') })

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

# A view path is <home>\.<store>\skills, so the store name is the grandparent.
function Get-StoreName {
  param([string]$ViewPath)
  return (Split-Path (Split-Path $ViewPath -Parent) -Leaf)
}

# Link every view to an already-installed canonical copy. Used when the vault
# source is unavailable so the skill cannot be re-synced, but the installed copy
# is still the one real copy and every store must see it.
function Sync-ViewsFromCanonical {
  param([string]$Name)
  $real = Join-Path $ClaudePath $Name
  if (-not (Test-Path -LiteralPath $real)) { return 'SOURCE-MISSING' }
  if (-not (Test-Path -LiteralPath (Join-Path $real 'SKILL.md'))) { return 'SOURCE-MISSING' }
  $failed = 0
  foreach ($v in $Views) {
    $link = Join-Path $v $Name
    $existing = if (Test-Path -LiteralPath $link) { Get-Item -LiteralPath $link -Force } else { $null }
    if ($existing -and -not $existing.LinkType) { continue }   # foreign real dir, not ours
    $r = Ensure-Junction -Link $link -Target $real
    if ($r -eq 'LINK-FAILED') { $failed++ }
  }
  if ($failed -gt 0) { return 'SOURCE-MISSING-LINK-FAILED' }
  return 'source-missing-viewed'
}

New-Item -ItemType Directory -Force -Path $ClaudePath | Out-Null
foreach ($v in $Views) { New-Item -ItemType Directory -Force -Path $v | Out-Null }

$entries = New-Object System.Collections.Generic.List[object]
$skipped = New-Object System.Collections.Generic.List[string]
foreach ($line in Get-Content -LiteralPath $Manifest -Encoding UTF8) {
  $line = $line.Trim()
  if (-not $line -or $line.StartsWith('#')) { continue }
  # 3 fields: name | path | tier. Older 2-field manifests still parse.
  $parts = $line -split '\|', 3
  if ($parts.Count -lt 2) { continue }
  $tier = if ($parts.Count -ge 3 -and $parts[2].Trim()) { $parts[2].Trim().ToUpper() } else { 'A' }
  $entries.Add([pscustomobject]@{ Name = $parts[0].Trim(); Source = $parts[1].Trim(); Tier = $tier })
}
Write-Host ("Manifest entries: {0}" -f $entries.Count)

# -Profile core -PruneToProfile shrinks the always-visible listing for harnesses
# that have no "hide a skill" mechanism (Kilo has none): tier B skills are
# removed from the canonical store, and the three junction views follow because
# they point at it. The vault keeps every skill, so re-running with the default
# profile restores them.
if ($PruneToProfile) {
  if ($Profile -eq 'all') { Write-Error '-PruneToProfile requires -Profile core.'; exit 1 }
  $keep = @{}
  foreach ($e in $entries) { if ($e.Tier -eq 'A') { $keep[$e.Name] = $true } }
  $removed = 0
  foreach ($d in (Get-ChildItem -LiteralPath $ClaudePath -Directory -Force -ErrorAction SilentlyContinue)) {
    if ($keep.ContainsKey($d.Name)) { continue }
    if (-not (Test-Path -LiteralPath (Join-Path $d.FullName 'SKILL.md'))) { continue }
    Remove-Item -LiteralPath $d.FullName -Recurse -Force
    $removed++
  }
  Write-Host ("prune-to-profile: removed {0} non-tier-A skill(s) from the canonical store" -f $removed)
}

$report = New-Object System.Collections.Generic.List[object]
foreach ($e in $entries) {
  # Tier C is vault-only. Under -Profile core only tier A is installed, so the
  # always-visible listing of harnesses without a hide mechanism stays small.
  if ($e.Tier -eq 'C') {
    $report.Add([pscustomobject]@{ Skill = $e.Name; Action = 'tier-C-skipped' }) | Out-Null
    $skipped.Add($e.Name)
    continue
  }
  if ($Profile -eq 'core' -and $e.Tier -ne 'A') {
    $report.Add([pscustomobject]@{ Skill = $e.Name; Action = 'tier-skipped-core-profile' }) | Out-Null
    $skipped.Add($e.Name)
    continue
  }
  if ($e.Source -eq 'HOST') {
    # Host-local skills are not tracked in this vault, but they still follow the layout rule:
    # the real copy lives in ~/.claude/skills and the other stores are junction views.
    # Some were installed the other way round (real dir in ~/.agents); normalize that here.
    #
    # SAFETY (2026-11-08): a HOST skill whose real dir sat in ~/.agents used to be
    # "normalized" by Ensure-Junction, which deletes a non-junction dir first - that
    # destroyed four Kimi v1 game skills on 2026-11-05, leaving .claude and .agents
    # pointing at each other. So: never delete a real directory here, and never link
    # into a cycle. If the real copy is missing and no view holds a REAL dir, report
    # it and leave every store alone.
    $real = Join-Path $ClaudePath $e.Name
    $realItem = if (Test-Path -LiteralPath $real) { Get-Item -LiteralPath $real -Force } else { $null }
    $realIsLink = $realItem -and $realItem.LinkType

    if (-not $realItem -or $realIsLink) {
      # Look for a REAL directory (the actual content) in any view.
      $donor = $null
      foreach ($v in $Views) {
        $candidate = Join-Path $v $e.Name
        if (-not (Test-Path -LiteralPath $candidate)) { continue }
        $item = Get-Item -LiteralPath $candidate -Force
        if (-not $item.LinkType) { $donor = $candidate; break }
      }
      if ($donor) {
        if ($realIsLink) { cmd /c rmdir "$real" 2>&1 | Out-Null }
        New-Item -ItemType Directory -Force -Path $real | Out-Null
        robocopy $donor $real /MIR /NFL /NDL /NJH /NJS /NP /NC /NS | Out-Null
        cmd /c rmdir "$donor" 2>&1 | Out-Null
        $report.Add([pscustomobject]@{ Skill = $e.Name; Action = 'host-materialized'; ViewAction = '' }) | Out-Null
      }
      else {
        # Either every view points back at $real (a cycle) or nothing holds content.
        $selfRef = $realIsLink -and (@($realItem.Target) -match [regex]::Escape((Join-Path $ClaudePath '')))
        $action = if ($realItem -or $selfRef) { 'host-dangling-cycle' } else { 'host-content-missing' }
        $report.Add([pscustomobject]@{ Skill = $e.Name; Action = $action }) | Out-Null
        continue
      }
    }

    foreach ($v in $Views) {
      $link = Join-Path $v $e.Name
      $existing = if (Test-Path -LiteralPath $link) { Get-Item -LiteralPath $link -Force } else { $null }
      if ($existing -and -not $existing.LinkType) {
        # A real dir here is content the vault does not own; leave it and say so.
        $report.Add([pscustomobject]@{ Skill = $e.Name; Action = 'host'; View = (Get-StoreName $v); ViewAction = 'FOREIGN-REAL-KEPT' }) | Out-Null
        continue
      }
      $r = Ensure-Junction -Link $link -Target $real
      $report.Add([pscustomobject]@{ Skill = $e.Name; Action = 'host'; View = (Get-StoreName $v); ViewAction = $r }) | Out-Null
    }
    $report.Add([pscustomobject]@{ Skill = $e.Name; Action = 'host-skip' }) | Out-Null
    continue
  }
  $srcPath = Join-Path $Vault ($e.Source -replace '/', '\')
  if (-not (Test-Path -LiteralPath $srcPath)) {
    # The vault source is gone (usually an uninitialized submodule in this
    # worktree) but the canonical copy is still installed and valid. Views must
    # still exist, otherwise adding a store silently drops every such skill.
    $report.Add([pscustomobject]@{ Skill = $e.Name; Action = (Sync-ViewsFromCanonical -Name $e.Name) }) | Out-Null
    continue
  }
  # A failed submodule clone leaves an empty source dir behind. Installing it would
  # create a skill dir with no SKILL.md - a skill that can never load. Treat it as missing.
  if (-not (Test-Path -LiteralPath (Join-Path $srcPath 'SKILL.md'))) {
    $report.Add([pscustomobject]@{ Skill = $e.Name; Action = (Sync-ViewsFromCanonical -Name $e.Name) }) | Out-Null
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
    $report.Add([pscustomobject]@{ Skill = $e.Name; Action = $action; View = (Get-StoreName $v); ViewAction = $r }) | Out-Null
  }
  $report.Add([pscustomobject]@{ Skill = $e.Name; Action = $action }) | Out-Null
}

$manifestNames = @{}
foreach ($e in $entries) { $manifestNames[$e.Name] = $true }

# Retired skills must not survive in ANY store (AGENTS.md: "removed from SKILL/
# and from every user store"). This runs unconditionally because it enforces an
# invariant, not a preference.
#
# Ownership rule: the vault only ever creates JUNCTIONS in a view store, so a
# junction is vault-owned and safe to delete. A real directory belongs to
# whatever installer put it there - `hyperframes-cli`, `hyperframes-registry`
# and `media-use` are on the retired list and are also real dirs in the six
# hyperframes stores, installed by the hyperframes installer. Deleting those
# would break another toolchain, so they are kept and reported.
$RetiredFile = Join-Path $Vault '.kilo\removed-skills.txt'
$retired = @{}
if (Test-Path -LiteralPath $RetiredFile) {
  foreach ($l in Get-Content -LiteralPath $RetiredFile -Encoding UTF8) {
    $l = $l.Trim()
    if ($l -and -not $l.StartsWith('#')) { $retired[$l] = $true }
  }
}
$retiredRemoved = 0
$retiredKept = New-Object System.Collections.Generic.List[string]
if ($retired.Count -gt 0) {
  # Canonical store: a real dir here is vault-installed unless the manifest says
  # it is a HOST skill, so those are the only ones left alone.
  foreach ($d in (Get-ChildItem -LiteralPath $ClaudePath -Directory -Force -ErrorAction SilentlyContinue)) {
    if (-not $retired.ContainsKey($d.Name)) { continue }
    if ($manifestNames.ContainsKey($d.Name)) { continue }
    Remove-LinkOrDir -Path $d.FullName
    $retiredRemoved++
  }
  foreach ($v in $Views) {
    foreach ($d in (Get-ChildItem -LiteralPath $v -Directory -Force -ErrorAction SilentlyContinue)) {
      if (-not $retired.ContainsKey($d.Name)) { continue }
      if ($d.LinkType) {
        cmd /c rmdir "$($d.FullName)" 2>&1 | Out-Null
        $retiredRemoved++
      }
      else { $retiredKept.Add(('{0}/{1}' -f (Get-StoreName $v), $d.Name)) }
    }
  }
}
Write-Host ("retired-pruned={0}" -f $retiredRemoved)
if ($retiredKept.Count -gt 0) {
  Write-Host ("retired kept (foreign real dirs, not vault-owned): {0}" -f (($retiredKept | Sort-Object -Unique) -join ', '))
}

if ($Prune) {
  # Only junction views are pruned: a real dir in a foreign store is someone
  # else's install (custom skills, another installer) and is never deleted here.
  foreach ($v in $Views) {
    foreach ($d in (Get-ChildItem -LiteralPath $v -Directory -Force -ErrorAction SilentlyContinue)) {
      if (-not $manifestNames.ContainsKey($d.Name) -and $d.LinkType) {
        cmd /c rmdir "$($d.FullName)" 2>&1 | Out-Null
        Write-Host ("PRUNED {0} :: {1}" -f $d.Name, (Get-StoreName $v))
      }
    }
  }
}

$counts = $report | Where-Object { $_.Action -notin @('unchanged','host-skip','tier-C-skipped','tier-skipped-core-profile') } | Group-Object Action
foreach ($c in $counts) { Write-Host ("{0}={1}" -f $c.Name, $c.Count) }
if ($skipped.Count -gt 0) {
  Write-Host ("tier-skipped={0} (profile '{1}': tier C is vault-only; tier B is installed only under profile 'all')" -f $skipped.Count, $Profile)
}
$problems = $report | Where-Object { $_.Action -eq 'SOURCE-MISSING' -or $_.ViewAction -like 'LINK-FAILED*' }
if ($problems) {
  Write-Host "`n--- Problems ---"
  $problems | Format-Table -AutoSize
} else {
  Write-Host "`nNo problems."
}
