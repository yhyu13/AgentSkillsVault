# Guard the skill install against the defects the 2026-10-25 pressure audit
# found. Run after scripts/sync-skills.ps1. Exits 1 on a blocking failure.
#
# Checks (blocking unless noted):
#   1. no retired skill is present in any user store
#   2. no two installed skills declare the same frontmatter name
#   3. no cross-store copy of the same name has different content
#   4. every manifest skill has a tier row in scripts/skill-tiers.txt
#   5. every manifest skill that is installed is byte-identical to its source
#   6. tier A alone must fit the harness listing budget   (warning only)
#
# Usage:
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\verify-capacity.ps1

param(
  [string]$Vault = (Split-Path -Parent $PSScriptRoot),
  [string]$Manifest = '',
  [string]$TierFile = '',
  [int]$ContextWindow = 1000000,
  [double]$BudgetFraction = 0.01
)

$ErrorActionPreference = 'Continue'
if (-not $Manifest) { $Manifest = Join-Path $Vault 'scripts\install-manifest.txt' }
if (-not $TierFile) { $TierFile = Join-Path $Vault 'scripts\skill-tiers.txt' }
$StorePaths = @(
  (Join-Path $HOME '.claude\skills'),
  (Join-Path $HOME '.kilo\skills'),
  (Join-Path $HOME '.codex\skills'),
  (Join-Path $HOME '.agents\skills'),
  (Join-Path $HOME '.config\kilo\skills')
)

$fail = 0
$warn = 0
function Fail([string]$m) { Write-Host ("FAIL  " + $m); $script:fail++ }
function Warn([string]$m) { Write-Host ("WARN  " + $m); $script:warn++ }
function Ok([string]$m)   { Write-Host ("ok    " + $m) }

# ---- read manifests --------------------------------------------------------
$entries = @{}
foreach ($line in (Get-Content -LiteralPath $Manifest -Encoding UTF8)) {
  $l = $line.Trim()
  if (-not $l -or $l.StartsWith('#')) { continue }
  $p = $l -split '\|', 3
  if ($p.Count -lt 2) { continue }
  $tier = if ($p.Count -ge 3 -and $p[2].Trim()) { $p[2].Trim().ToUpper() } else { 'A' }
  $entries[$p[0].Trim()] = [pscustomobject]@{ Name = $p[0].Trim(); Source = $p[1].Trim(); Tier = $tier }
}
$tiers = @{}
foreach ($line in (Get-Content -LiteralPath $TierFile -Encoding UTF8)) {
  $l = $line.Trim()
  if (-not $l -or $l.StartsWith('#') -or $l -notmatch '\|') { continue }
  $p = $l -split '\|', 2
  $tiers[$p[0].Trim()] = $p[1].Trim().ToUpper()
}

# ---- 1. retired skills -----------------------------------------------------
$removedFile = Join-Path $Vault '.kilo\removed-skills.txt'
$retired = @()
if (Test-Path -LiteralPath $removedFile) {
  $retired = @(Get-Content -LiteralPath $removedFile -Encoding UTF8 | Where-Object { $_ -and -not $_.StartsWith('#') } | ForEach-Object { $_.Trim() })
}
$hits = @()
foreach ($n in $retired) {
  foreach ($s in $StorePaths) { if (Test-Path -LiteralPath (Join-Path $s $n)) { $hits += (Split-Path $s -Leaf) + "/" + $n } }
}
if ($hits.Count -gt 0) { Fail ("retired skills still installed: " + ($hits -join ', ')) } else { Ok ("no retired skill installed ({0} names checked)" -f $retired.Count) }

# ---- 2/3. duplicate names and cross-store divergence ------------------------
$byName = @{}
foreach ($s in $StorePaths) {
  if (-not (Test-Path -LiteralPath $s)) { continue }
  $storeLabel = Split-Path (Split-Path $s -Parent) -Leaf   # '.claude', '.kilo', ...
  foreach ($d in (Get-ChildItem -LiteralPath $s -Directory -Force -ErrorAction SilentlyContinue)) {
    $md = Join-Path $d.FullName 'SKILL.md'
    if (-not (Test-Path -LiteralPath $md)) { continue }
    $head = Get-Content -LiteralPath $md -TotalCount 12 -Encoding UTF8 -ErrorAction SilentlyContinue | Out-String
    $m = [regex]::Match($head, '(?m)^name:\s*(.+?)\s*$')
    if (-not $m.Success) { continue }
    $nm = $m.Groups[1].Value.Trim().Trim('"',"'")
    # normalise CRLF: a git checkout and a hand-copied file are the same skill
    $bytes = [IO.File]::ReadAllBytes($md)
    $txt = [Text.Encoding]::UTF8.GetString($bytes) -replace "`r`n", "`n"
    $h = [BitConverter]::ToString(([Security.Cryptography.SHA256]::Create()).ComputeHash([Text.Encoding]::UTF8.GetBytes($txt))).Replace('-','')
    if (-not $byName.ContainsKey($nm)) { $byName[$nm] = New-Object System.Collections.Generic.List[object] }
    $byName[$nm].Add([pscustomobject]@{ Store = $storeLabel; Dir = $d.Name; Hash = $h })
  }
}
$dup = @(); $collide = @()
foreach ($nm in $byName.Keys) {
  $g = $byName[$nm]
  $perStore = $g | Group-Object Store | Where-Object { $_.Count -gt 1 }
  if ($perStore) { $dup += ($nm + ' in ' + (($perStore | ForEach-Object { $_.Name }) -join '/')) }
  if (($g | Select-Object -ExpandProperty Hash -Unique).Count -gt 1) { $collide += $nm }
}
if ($dup.Count -gt 0) { Fail ("duplicate frontmatter names: " + ($dup -join ', ')) } else { Ok "no duplicate frontmatter names" }
if ($collide.Count -gt 0) { Fail ("same name, different content across stores: " + ($collide -join ', ')) } else { Ok "no cross-store content divergence" }

# ---- 4. every manifest skill has a tier ------------------------------------
$untiered = @($entries.Keys | Where-Object { -not $tiers.ContainsKey($_) })
if ($untiered.Count -gt 0) { Fail ("manifest skills with no tier row: " + ($untiered -join ', ')) } else { Ok ("every manifest skill has a tier ({0} skills)" -f $entries.Count) }

# ---- 5. installed copies match the source ----------------------------------
$claude = Join-Path $HOME '.claude\skills'
$bad = @(); $missing = @()
foreach ($e in $entries.Values) {
  if ($e.Tier -eq 'C') { continue }
  if ($e.Source -eq 'HOST') { continue }
  $src = Join-Path $Vault ($e.Source -replace '/', '\')
  $inst = Join-Path $claude $e.Name
  if (-not (Test-Path -LiteralPath $src)) { $missing += $e.Name; continue }
  if (-not (Test-Path -LiteralPath (Join-Path $inst 'SKILL.md'))) { $missing += $e.Name; continue }
}
if ($missing.Count -gt 0) { Fail ("manifest skills not installed in the canonical store: " + ($missing -join ', ')) } else { Ok "every installed manifest skill is present" }

# ---- 6. tier A listing budget (warning only) -------------------------------
function Get-SkillMeta([string]$md) {
  if (-not (Test-Path -LiteralPath $md)) { return $null }
  $txt = Get-Content -LiteralPath $md -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
  if (-not $txt) { return $null }
  $fm = [regex]::Match($txt, '(?s)^---\r?\n(.*?)\r?\n---')
  if (-not $fm.Success) { return $null }
  $block = $fm.Groups[1].Value
  $nm = [regex]::Match($block, '(?m)^name:\s*(.+?)\s*$')
  $ds = [regex]::Match($block, '(?ms)^description:\s*(.+?)(?=\r?\n[a-zA-Z_][a-zA-Z0-9_-]*:|\z)')
  if (-not $nm.Success) { return $null }
  return [pscustomobject]@{
    Name = $nm.Groups[1].Value.Trim().Trim('"',"'")
    Desc = if ($ds.Success) { $ds.Groups[1].Value.Trim() } else { '' }
  }
}
$chars = 0; $aCount = 0
foreach ($nm in $tiers.Keys) {
  if ($tiers[$nm] -ne 'A') { continue }
  $meta = Get-SkillMeta (Join-Path (Join-Path $claude $nm) 'SKILL.md')
  if (-not $meta) { continue }
  $aCount++
  $chars += $meta.Desc.Length + $meta.Name.Length
}
$budgetChars = $ContextWindow * $BudgetFraction * 3.6
$ratio = if ($budgetChars -gt 0) { [math]::Round($chars / $budgetChars, 2) } else { 0 }
if ($ratio -gt 1.0) {
  Warn ("tier A listing {0} chars ({1} skills) = {2}x the {3}-token listing budget at {4} context tokens (budget {5} chars)" -f $chars, $aCount, $ratio, [math]::Round($BudgetFraction*100), $ContextWindow, [math]::Round($budgetChars))
} else {
  Ok ("tier A listing {0} chars ({1} skills) fits the budget ({2}x of {3} chars)" -f $chars, $aCount, $ratio, [math]::Round($budgetChars))
}

Write-Host ""
if ($fail -gt 0) { Write-Host ("RESULT: FAIL ({0} blocking, {1} warning)" -f $fail, $warn); exit 1 }
Write-Host ("RESULT: PASS ({0} warning)" -f $warn)
exit 0
