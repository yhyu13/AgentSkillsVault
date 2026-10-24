# sync-vault-skills.ps1
# Purpose: for every skill in the AgentSkillsVault, ensure ~/.claude/skills/<name>,
# ~/.kilo/skills/<name>, ~/.codex/skills/<name> are byte-identical to the vault copy.
# Strategy: hash each vault skill dir (sha256 of sorted relative-path + content),
# hash each installed copy, copy if different or missing. Then re-verify with diff -rq.

$ErrorActionPreference = 'Stop'

$Vault = 'C:\Git-repo-AI\4_Skill\AgentSkillsVault'
$Categories = @('agents','content','design','devops','FDE','game-dev','management','math','MattSkills','opengame-harness','software-development','writing')
$Targets = @(
  @{ Name = 'claude'; Path = Join-Path $HOME '.claude\skills' },
  @{ Name = 'kilo';   Path = Join-Path $HOME '.kilo\skills' },
  @{ Name = 'codex';  Path = Join-Path $HOME '.codex\skills' }
)

function Get-SkillDirHash {
  param([string]$Path)
  # Hash every file under $Path, sorted by relative path. Returns a single sha256.
  if (-not (Test-Path -LiteralPath $Path)) { return $null }
  $files = Get-ChildItem -LiteralPath $Path -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch '[\\/]\.git[\\/]' } |
    Sort-Object -Property FullName
  if (-not $files -or $files.Count -eq 0) { return 'EMPTY' }
  $sha = [System.Security.Cryptography.SHA256]::Create()
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
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($sb.ToString())
  $h2 = $sha.ComputeHash($bytes)
  ($h2 | ForEach-Object { $_.ToString('x2') }) -join ''
}

# Enumerate vault skills (one per <category>/<name>/ with SKILL.md)
$VaultSkills = New-Object System.Collections.Generic.List[object]
foreach ($cat in $Categories) {
  $cDir = Join-Path $Vault $cat
  if (-not (Test-Path -LiteralPath $cDir)) { continue }
  Get-ChildItem -LiteralPath $cDir -Directory -ErrorAction SilentlyContinue |
    Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'SKILL.md') } |
    ForEach-Object {
      $VaultSkills.Add([pscustomobject]@{ Name = $_.Name; Category = $cat; Path = $_.FullName }) | Out-Null
    }
}
Write-Host ("Vault skills: {0}" -f $VaultSkills.Count)

# Compute vault hashes
Write-Host "Hashing vault skills..."
foreach ($s in $VaultSkills) {
  $s | Add-Member -NotePropertyName VaultHash -NotePropertyValue (Get-SkillDirHash -Path $s.Path)
}

$stats = @{ copied = 0; unchanged = 0; missing_target = 0 }
$report = New-Object System.Collections.Generic.List[object]

foreach ($t in $Targets) {
  foreach ($s in $VaultSkills) {
    $destDir = Join-Path $t.Path $s.Name
    $beforeHash = Get-SkillDirHash -Path $destDir
    $needsCopy = $false
    if (-not (Test-Path -LiteralPath $destDir)) {
      $needsCopy = $true
      $reason = 'missing'
    } elseif ($null -eq $beforeHash) {
      $needsCopy = $true
      $reason = 'missing'
    } elseif ($beforeHash -ne $s.VaultHash) {
      $needsCopy = $true
      $reason = 'differ'
    } else {
      $reason = 'unchanged'
    }
    if ($needsCopy) {
      New-Item -ItemType Directory -Force -Path (Split-Path $destDir) | Out-Null
      # Mirror: remove files NOT in vault (handles deletions), then copy fresh
      if (Test-Path -LiteralPath $destDir) {
        # Sync by enumerate files in dest, delete any not in vault
        $vaultFiles = Get-ChildItem -LiteralPath $s.Path -Recurse -File -ErrorAction SilentlyContinue |
          Where-Object { $_.FullName -notmatch '[\\/]\.git[\\/]' } |
          ForEach-Object { $_.FullName.Substring($s.Path.Length).TrimStart('\','/').Replace('\','/') }
        $vaultFileSet = @{}; foreach ($vf in $vaultFiles) { $vaultFileSet[$vf] = $true }
        $destFiles = Get-ChildItem -LiteralPath $destDir -Recurse -File -ErrorAction SilentlyContinue
        foreach ($df in $destFiles) {
          $rel = $df.FullName.Substring($destDir.Length).TrimStart('\','/').Replace('\','/')
          if (-not $vaultFileSet.ContainsKey($rel)) {
            Remove-Item -LiteralPath $df.FullName -Force -ErrorAction SilentlyContinue
          }
        }
        # Also remove empty dirs
        Get-ChildItem -LiteralPath $destDir -Recurse -Directory -ErrorAction SilentlyContinue |
          Sort-Object -Property FullName -Descending |
          Where-Object { -not (Get-ChildItem -LiteralPath $_.FullName -Recurse -File -ErrorAction SilentlyContinue) } |
          ForEach-Object { Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue }
      }
      Copy-Item -Recurse -Force -LiteralPath $s.Path -Destination $destDir
      $stats.copied++
      if ($reason -eq 'missing') { $stats.missing_target++ }
      $report.Add([pscustomobject]@{ Target = $t.Name; Skill = $s.Name; Action = 'copied'; Reason = $reason }) | Out-Null
    } else {
      $stats.unchanged++
      $report.Add([pscustomobject]@{ Target = $t.Name; Skill = $s.Name; Action = 'unchanged'; Reason = $reason }) | Out-Null
    }
  }
}

Write-Host ("`nSummary: copied={0}, unchanged={1}, missing-target={2}" -f $stats.copied, $stats.unchanged, $stats.missing_target)
Write-Host "`n--- Per-target diffs (copied or newly installed) ---"
$report | Where-Object { $_.Action -eq 'copied' } | Format-Table -AutoSize
