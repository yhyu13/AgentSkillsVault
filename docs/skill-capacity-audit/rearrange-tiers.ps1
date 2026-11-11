# Re-score every curated skill and re-bucket it into SKILL/<category>/tier<N>/<skill>.
#
# tier0 >= 9.0, tier1 8.0-8.99, tier2 7.0-7.99, tier3 6.0-6.99, tier4 < 6.0
# (score = docs/skill-capacity-audit/score_skills.py, allowlist-aware).
#
# Dry run by default; -Apply performs `git mv`. Safe to re-run: skills already in
# the right bucket are skipped. A skill whose leaf name equals its category
# (SKILL/<name>/SKILL.md) cannot be nested inside itself and is reported instead.
#
# Usage:
#   powershell -NoProfile -ExecutionPolicy Bypass -File docs\skill-capacity-audit\rearrange-tiers.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File docs\skill-capacity-audit\rearrange-tiers.ps1 -Apply

param(
  [string]$Vault = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)),
  [switch]$Apply,
  [int]$Jobs = 12
)

$ErrorActionPreference = 'Continue'
$SkillRoot = Join-Path $Vault 'SKILL'
$Scorer = Join-Path $PSScriptRoot 'score_skills.py'
$Out = Join-Path ([System.IO.Path]::GetTempPath()) ('tier-audit-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory -Force -Path $Out | Out-Null

$env:PYTHONIOENCODING = 'utf-8'
$env:PYTHONUTF8 = '1'
& py -3 $Scorer --root $SkillRoot --recursive --out $Out --date (Get-Date -Format 'yyyy-MM-dd') --jobs $Jobs | Out-Null
$csvPath = Join-Path $Out ((Get-Date -Format 'yyyy-MM-dd') + '-capacity-scores.csv')
if (-not (Test-Path $csvPath)) { Write-Error "score_skills.py produced no CSV in $Out"; exit 1 }

$rows = Import-Csv $csvPath
$moved = 0; $skipped = 0; $blocked = @(); $failed = @()

foreach ($r in $rows) {
  $src = $r.path
  $rel = $src.Substring($SkillRoot.Length).TrimStart('\')
  $parts = $rel -split '\\'
  $cat = $parts[0]
  $leaf = $r.skill
  $score = [double]$r.score
  $tier = if ($score -ge 9) { 'tier0' } elseif ($score -ge 8) { 'tier1' } elseif ($score -ge 7) { 'tier2' } elseif ($score -ge 6) { 'tier3' } else { 'tier4' }
  $dst = Join-Path (Join-Path (Join-Path $SkillRoot $cat) $tier) $leaf

  if ($leaf -eq $cat) { $blocked += ("{0} (leaf == category; choose a real category first)" -f $rel); continue }
  if ($src -eq $dst) { $skipped++; continue }
  if (Test-Path -LiteralPath $dst) { $failed += ("target exists: {0}" -f $dst); continue }

  if (-not $Apply) { Write-Host ("PLAN {0,-8} {1} -> {2}/{3}" -f $tier, $rel, $cat, $tier); $moved++; continue }

  $parent = Split-Path $dst -Parent
  if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
  git -C $Vault mv -- $src $dst 2>&1 | Out-Null
  if (Test-Path -LiteralPath (Join-Path $dst 'SKILL.md')) {
    $moved++
    Write-Host ("MOVED {0} -> {1}/{2}" -f $rel, $cat, $tier)
  } else {
    $failed += ("git mv failed: {0}" -f $rel)
  }
}

Write-Host ("`nskills={0} moved={1} already-correct={2} blocked={3} failed={4}" -f $rows.Count, $moved, $skipped, $blocked.Count, $failed.Count)
$blocked | ForEach-Object { Write-Host ("  BLOCKED {0}" -f $_) }
$failed | ForEach-Object { Write-Host ("  FAILED  {0}" -f $_) }
if (-not $Apply) { Write-Host "`n(dry run - re-run with -Apply to move)" }
if ($failed.Count -gt 0) { exit 1 }
