# Normalize non-vault (external-source) skills to the vault layout rule:
#   ~/.agents/skills/<name>   = the ONE real copy (primary store)
#   ~/.claude|.kilo|.codex/skills/<name> = junction views
# Nothing is deleted until every duplicate tree is proven byte-identical.
param([switch]$Apply)

$ErrorActionPreference = 'Stop'
$Root = Join-Path $HOME '.agents\skills'
$stores = [ordered]@{
  agents = $Root
  claude = (Join-Path $HOME '.claude\skills')
  kilo   = (Join-Path $HOME '.kilo\skills')
  codex  = (Join-Path $HOME '.codex\skills')
}
$manifest = 'C:\Git-repo-AI\4_Skill\AgentSkillsVault\scripts\install-manifest.txt'
$backup = Join-Path $env:TEMP ('skill-normalize-backup-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))

$inManifest = @{}
foreach ($l in Get-Content $manifest -Encoding UTF8) {
  $t = $l.Trim()
  if ($t -and -not $t.StartsWith('#')) { $inManifest[(($t -split '\|')[0]).Trim()] = 1 }
}

# union of every dir that is not vault-managed (and not codex's .system)
$names = New-Object System.Collections.Generic.HashSet[string]
foreach ($k in $stores.Keys) {
  Get-ChildItem -LiteralPath $stores[$k] -Directory -Force -ErrorAction SilentlyContinue |
    Where-Object { -not $inManifest.ContainsKey($_.Name) -and $_.Name -ne '.system' } |
    ForEach-Object { [void]$names.Add($_.Name) }
}
$names = @($names | Sort-Object)
Write-Host ("external skills: {0}" -f $names.Count)

function Get-TreeHash([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) { return $null }
  $files = Get-ChildItem -LiteralPath $Path -Recurse -File -Force -ErrorAction SilentlyContinue
  $sb = New-Object System.Text.StringBuilder
  foreach ($f in ($files | Sort-Object FullName)) {
    $rel = $f.FullName.Substring($Path.Length).TrimStart('\')
    $fh = (Get-FileHash -LiteralPath $f.FullName -Algorithm MD5).Hash
    [void]$sb.Append($rel).Append('|').Append($fh).Append(';')
  }
  $h = [System.Security.Cryptography.MD5]::Create().ComputeHash(
        [System.Text.Encoding]::UTF8.GetBytes($sb.ToString()))
  return (($h | ForEach-Object { $_.ToString('x2') }) -join '')
}

$plan = New-Object System.Collections.Generic.List[object]
$blocked = New-Object System.Collections.Generic.List[object]

foreach ($n in $names) {
  $state = @{}
  foreach ($k in $stores.Keys) {
    $p = Join-Path $stores[$k] $n
    if (-not (Test-Path -LiteralPath $p)) { $state[$k] = [pscustomobject]@{ Kind = 'absent'; Path = $p; Hash = $null; Target = $null }; continue }
    $it = Get-Item -LiteralPath $p -Force
    $kind = if ($it.LinkType) { 'junction' } else { 'real' }
    $state[$k] = [pscustomobject]@{ Kind = $kind; Path = $p; Hash = (Get-TreeHash $p); Target = $it.Target }
  }
  # pick the authoritative real copy: prefer claude, else the only/last real dir
  $reals = @($stores.Keys | Where-Object { $state[$_].Kind -eq 'real' })
  $hashes = @($reals | ForEach-Object { $state[$_].Hash } | Sort-Object -Unique)
  if ($hashes.Count -gt 1) {
    $blocked.Add([pscustomobject]@{ Name = $n; Why = "CONFLICT real copies differ: " + (($reals | ForEach-Object { "$_=" + $state[$_].Hash.Substring(0,8) }) -join ',') })
    continue
  }
  $source = if ($state['claude'].Kind -eq 'real') { 'claude' } elseif ($reals.Count -ge 1) { $reals[0] } else { $null }
  if (-not $source) {
    # claude is a junction; its target is the real copy elsewhere
    $tgt = $state['claude'].Target
    $source = @($stores.Keys | Where-Object { $state[$_].Kind -eq 'real' -and
                ($state[$_].Path -eq $tgt -or (Resolve-Path -LiteralPath $state[$_].Path).Path -eq (Resolve-Path -LiteralPath $tgt).Path) })[0]
    if (-not $source) { $source = $reals[0] }
  }
  foreach ($k in $stores.Keys) {
    $act = 'skip'
    if ($k -eq 'claude') {
      if ($state['claude'].Kind -eq 'real') { $act = 'keep-real' }
      elseif ($state['claude'].Kind -eq 'junction') { $act = "promote-from-$source" }
      else { $act = "move-from-$source" }
    } else {
      $want = $state[$k].Kind -eq 'junction' -and $state[$k].Target -and
              ((Resolve-Path -LiteralPath $state[$k].Target -ErrorAction SilentlyContinue).Path -eq $Root)
      if ($state[$k].Kind -eq 'junction') { $act = 'relink' }
      elseif ($state[$k].Kind -eq 'real') { $act = 'drop-duplicate-and-link' }
      else { $act = 'link-new' }
    }
    $plan.Add([pscustomobject]@{ Name = $n; Store = $k; Kind = $state[$k].Kind; Action = $act; Source = $source; Hash = if ($state[$k].Hash) { $state[$k].Hash.Substring(0,8) } else { '-' } })
  }
}

$plan | Group-Object Name | ForEach-Object {
  $acts = ($_.Group | ForEach-Object { "$($_.Store):$($_.Action)" }) -join '  '
  Write-Host ("{0,-34} {1}" -f $_.Name, $acts)
}
if ($blocked.Count) {
  Write-Host "--- BLOCKED (content differs, left untouched) ---"
  $blocked | ForEach-Object { Write-Host ("  {0}: {1}" -f $_.Name, $_.Why) }
}

if (-not $Apply) { Write-Host "DRY RUN - nothing changed (pass -Apply)"; exit 0 }

New-Item -ItemType Directory -Force -Path $backup | Out-Null
$done = 0
foreach ($g in ($plan | Group-Object Name)) {
  $n = $g.Name
  $sourceStore = ($g.Group | Select-Object -First 1).Source
  $srcPath = $stores[$sourceStore] + '\' + $n
  $realPath = Join-Path $Root $n
  # 1) make sure the canonical path holds the real copy
  if ((Get-Item -LiteralPath $realPath -Force -ErrorAction SilentlyContinue).LinkType) {
    cmd /c rmdir "$realPath" | Out-Null
  }
  if (-not (Test-Path -LiteralPath $realPath)) {
    if ($sourceStore -eq 'claude') { throw "unreachable" }
    Move-Item -LiteralPath $srcPath -Destination $realPath
    Write-Host ("  MOVED {0}: {1} -> claude" -f $n, $sourceStore)
  }
  # 2) every other store becomes a junction to the canonical copy
  foreach ($k in $stores.Keys) {
    if ($k -eq 'claude') { continue }
    $link = Join-Path $stores[$k] $n
    if (Test-Path -LiteralPath $link) {
      $it = Get-Item -LiteralPath $link -Force
      if ($it.LinkType) { cmd /c rmdir "$link" | Out-Null }
      else {
        Copy-Item -LiteralPath $link -Destination (Join-Path $backup "$k-$n") -Recurse -Force
        Remove-Item -LiteralPath $link -Recurse -Force
      }
    }
    cmd /c mklink /J "$link" "$realPath" | Out-Null
    if (-not (Test-Path -LiteralPath $link)) { Write-Host ("  LINK-FAILED {0} :: {1}" -f $n, $k) }
  }
  $done++
}
Write-Host ("normalized: {0} skill(s); backup at {1}" -f $done, $backup)
