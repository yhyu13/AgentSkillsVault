# sync-vault-skills-v2.ps1
# Install/refresh every vault skill into the global agent skill stores:
#   ~/.claude/skills, ~/.kilo/skills, ~/.codex/skills  -> byte-identical copies (robocopy /MIR)
#   ~/.agents/skills                                    -> junction "view" -> ~/.claude/skills/<name>
# Skill = any directory containing SKILL.md (recursive), installed flat by leaf name.
# robocopy exits 0..7 — non-zero is normal for changed/missing/etc. We don't fail on exit code.

$ErrorActionPreference = 'Continue'

$Vault = Split-Path -Parent $PSScriptRoot
$CopyTargets = @(
  @{ Name = 'claude'; Path = Join-Path $HOME '.claude\skills' },
  @{ Name = 'kilo';   Path = Join-Path $HOME '.kilo\skills' },
  @{ Name = 'codex';  Path = Join-Path $HOME '.codex\skills' }
)
$AgentsPath = Join-Path $HOME '.agents\skills'
$ClaudePath = Join-Path $HOME '.claude\skills'

function Get-SkillDirHash {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return $null }
  $files = Get-ChildItem -LiteralPath $Path -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch '[\\/]\.git[\\/]' } |
    Sort-Object -Property FullName
  if (-not $files -or $files.Count -eq 0) { return 'EMPTY' }
  $sb = New-Object System.Text.StringBuilder
  foreach ($f in $files) {
    $rel = $f.FullName.Substring($Path.Length).TrimStart('\','/').Replace('\','/')
    [void]$sb.Append($rel).Append('|').Append($f.Length).Append('|')
    try {
      $h = Get-FileHash -LiteralPath $f.FullName -Algorithm SHA256
      [void]$sb.Append($h.Hash)
    } catch {
      [void]$sb.Append('ERR')
    }
    [void]$sb.Append("`n")
  }
  $sha = [System.Security.Cryptography.SHA256]::Create()
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($sb.ToString())
  $h2 = $sha.ComputeHash($bytes)
  ($h2 | ForEach-Object { $_.ToString('x2') }) -join ''
}

# Enumerate vault skills: every dir with SKILL.md, skipping VCS, archived, and tooling dirs.
$VaultSkills = New-Object System.Collections.Generic.List[object]
Get-ChildItem -LiteralPath $Vault -Recurse -Directory -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -notmatch '[\\/](\.git|\.github|\.changeset|\.claude-plugin|\.out-of-scope|node_modules|archived)[\\/]' } |
  Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'SKILL.md') } |
  ForEach-Object {
    $VaultSkills.Add([pscustomobject]@{ Name = $_.Name; Path = $_.FullName }) | Out-Null
  }
Write-Host ("Vault skills: {0}" -f $VaultSkills.Count)

$report = New-Object System.Collections.Generic.List[object]

# 1) Byte-identical copies into claude / kilo / codex
foreach ($t in $CopyTargets) {
  New-Item -ItemType Directory -Force -Path $t.Path | Out-Null
  foreach ($s in $VaultSkills) {
    $destDir = Join-Path $t.Path $s.Name
    $vaultHash = Get-SkillDirHash -Path $s.Path
    $destHash = Get-SkillDirHash -Path $destDir
    if (($vaultHash -eq $destHash) -and ($null -ne $destHash)) {
      $report.Add([pscustomobject]@{ Target = $t.Name; Skill = $s.Name; Action = 'unchanged' }) | Out-Null
      continue
    }
    $action = if ($destHash) { 'updated' } else { 'installed' }
    robocopy $s.Path $destDir /MIR /NFL /NDL /NJH /NJS /NP /NC /NS | Out-Null
    $afterHash = Get-SkillDirHash -Path $destDir
    if ($afterHash -eq $vaultHash) {
      $report.Add([pscustomobject]@{ Target = $t.Name; Skill = $s.Name; Action = $action }) | Out-Null
    } else {
      $report.Add([pscustomobject]@{ Target = $t.Name; Skill = $s.Name; Action = 'MISMATCH-AFTER-COPY' }) | Out-Null
    }
  }
}

# 2) ~/.agents/skills as a junction view onto ~/.claude/skills/<name>
New-Item -ItemType Directory -Force -Path $AgentsPath | Out-Null
foreach ($s in $VaultSkills) {
  $link = Join-Path $AgentsPath $s.Name
  $linkTarget = Join-Path $ClaudePath $s.Name
  if (Test-Path -LiteralPath $link) {
    $existing = Get-Item -LiteralPath $link -Force
    if ($existing.LinkType -and ($existing.Target -contains $linkTarget)) {
      $report.Add([pscustomobject]@{ Target = 'agents'; Skill = $s.Name; Action = 'unchanged' }) | Out-Null
      continue
    }
    Remove-Item -LiteralPath $link -Recurse -Force -ErrorAction SilentlyContinue
  }
  try {
    New-Item -ItemType Junction -Path $link -Target $linkTarget -ErrorAction Stop | Out-Null
    $report.Add([pscustomobject]@{ Target = 'agents'; Skill = $s.Name; Action = 'linked' }) | Out-Null
  } catch {
    $report.Add([pscustomobject]@{ Target = 'agents'; Skill = $s.Name; Action = "LINK-FAILED: $($_.Exception.Message)" }) | Out-Null
  }
}

$installed = ($report | Where-Object { $_.Action -eq 'installed' }).Count
$updated   = ($report | Where-Object { $_.Action -eq 'updated' }).Count
$linked    = ($report | Where-Object { $_.Action -eq 'linked' }).Count
$unchanged = ($report | Where-Object { $_.Action -eq 'unchanged' }).Count
$problems  = $report | Where-Object { $_.Action -notin @('installed','updated','linked','unchanged') }

Write-Host ("`nSummary: installed={0}, updated={1}, linked={2}, unchanged={3}, problems={4}" -f $installed, $updated, $linked, $unchanged, $problems.Count)
if ($problems.Count -gt 0) {
  Write-Host "`n--- Problems ---"
  $problems | Format-Table -AutoSize
}
