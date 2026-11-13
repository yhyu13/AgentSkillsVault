# Verify that every installed skill's content matches its manifest source dir.
# Prints one line per skill:  MATCH|MISMATCH|MISSING  <name>  <source>
#
# With -CheckViews, also prove the layout rule: every other harness store must
# hold a JUNCTION for each installed skill pointing at the primary store (~/.agents/skills).
# A real directory there is reported as COPY (it drifted from the one-real-copy
# rule and a later sync will not fix it), a missing entry as NOLINK.
#
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-install.ps1 -Manifest <file> [-CheckViews]

param(
  [Parameter(Mandatory = $true)][string]$Manifest,
  [switch]$CheckViews
)

$ErrorActionPreference = 'Continue'
$Vault = Split-Path -Parent $PSScriptRoot

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

# Must stay in step with sync-skills.ps1: the primary store holds the real copy,
# every other store is a junction view. Read the same config.
$ScopeFile = Join-Path $Vault 'scripts\install-scope.json'
$PrimaryStore = '.agents'
$LinkViews = $true
if (Test-Path -LiteralPath $ScopeFile) {
  try {
    $scopeCfg = Get-Content -LiteralPath $ScopeFile -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($scopeCfg.primaryStore) { $PrimaryStore = [string]$scopeCfg.primaryStore }
    if ($null -ne $scopeCfg.linkViews) { $LinkViews = [bool]$scopeCfg.linkViews }
  } catch { }
}
$AllStoreNames = @(
  '.claude', '.kilo', '.codex', '.agents',
  '.workbuddy', '.hub', '.mavis', '.minimax',
  '.cursor', '.copilot', '.kiro', '.lingma', '.qoder-cn', '.codebuddy'
)
$ViewNames = @($AllStoreNames | Where-Object { $_ -ne $PrimaryStore })
if (-not $LinkViews) { $ViewNames = @() }
$PrimaryPath = Join-Path $HOME (Join-Path $PrimaryStore 'skills')
$Views = @($ViewNames | ForEach-Object { Join-Path $HOME (Join-Path $_ 'skills') })

$ok = 0; $bad = 0; $missing = 0
$vOk = 0; $vProblems = New-Object System.Collections.Generic.List[string]
function Get-StoreName {
  param([string]$ViewPath)
  return (Split-Path (Split-Path $ViewPath -Parent) -Leaf)
}

function Test-ViewLinks {
  param([string]$Name)
  $target = Join-Path $PrimaryPath $Name
  foreach ($v in $Views) {
    $link = Join-Path $v $Name
    if (-not (Test-Path -LiteralPath $link)) { $script:vProblems.Add(("NOLINK`t{0}`t{1}" -f $Name, (Get-StoreName $v))); continue }
    $item = Get-Item -LiteralPath $link -Force
    if (-not $item.LinkType) { $script:vProblems.Add(("COPY`t{0}`t{1}" -f $Name, (Get-StoreName $v))); continue }
    if ($item.Target -notcontains $target) { $script:vProblems.Add(("WRONGTARGET`t{0}`t{1}" -f $Name, (Get-StoreName $v))); continue }
    $script:vOk++
  }
}

foreach ($line in Get-Content -LiteralPath $Manifest -Encoding UTF8) {
  $line = $line.Trim()
  if (-not $line -or $line.StartsWith('#')) { continue }
  $parts = $line -split '\|', 3
  if ($parts.Count -lt 2) { continue }
  $name = $parts[0].Trim()
  $src = $parts[1].Trim()
  if ($CheckViews) {
    $tier = if ($parts.Count -ge 3 -and $parts[2].Trim()) { $parts[2].Trim().ToUpper() } else { 'A' }
    if ($tier -ne 'C' -and (Test-Path -LiteralPath (Join-Path $PrimaryPath $name))) { Test-ViewLinks -Name $name }
  }
  if ($src -eq 'HOST') {
    Write-Output ("HOST`t{0}" -f $name)
    continue
  }
  $srcPath = Join-Path $Vault $src
  $instPath = Join-Path $PrimaryPath $name
  if (-not (Test-Path -LiteralPath $instPath)) { Write-Output ("MISSING`t{0}`t{1}" -f $name, $src); $missing++; continue }
  if (-not (Test-Path -LiteralPath $srcPath)) { Write-Output ("NOSRC`t{0}`t{1}" -f $name, $src); $missing++; continue }
  $hi = Get-TreeHash -Path $instPath
  $hs = Get-TreeHash -Path $srcPath
  if ($hi -eq $hs) { Write-Output ("MATCH`t{0}`t{1}" -f $name, $src); $ok++ }
  else { Write-Output ("MISMATCH`t{0}`t{1}" -f $name, $src); $bad++ }
}
Write-Host ("`nmatch={0} mismatch={1} missing={2}" -f $ok, $bad, $missing)
if ($CheckViews) {
  foreach ($p in $vProblems) { Write-Host $p }
  $badViews = $vProblems.Count
  Write-Host ("views: ok={0} problems={1} (stores: {2})" -f $vOk, $badViews, ($ViewNames -join ' '))
}
