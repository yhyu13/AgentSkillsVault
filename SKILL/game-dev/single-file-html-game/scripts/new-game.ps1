#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Scaffold a new single-file HTML game from the skill skeleton.

.DESCRIPTION
  Copies the skeleton.html asset into the target repo, rewrites the
  placeholder name/PREFIX/styling, registers the file in
  GAME_TIERS.json (tier "D"), adds a row to README.md's
  "## 游戏总览" section under the matching "###" category, and adds
  a heading + stub row to GAME_AUDIT.md.

.PARAMETER RepoPath
  Path to the mini-browser-games repo. Defaults to CWD.

.PARAMETER Name
  Kebab-case game name without the ".html" suffix. Used for the
  filename, the window.__<name>Test key, and the archive prefix.

.PARAMETER Title
  Chinese title shown in <title> and the README table.

.PARAMETER Category
  README "###" category under "## 游戏总览". One of:
    策略、养成与大型玩法 | 动作、射击与即时反应 |
    益智、解谜与回合 | 模拟、经营与日程

.EXAMPLE
  pwsh scripts/new-game.ps1 -Name my-game -Title "我的游戏" -Category "益智、解谜与回合"
#>
[CmdletBinding()]
param(
  [string]$RepoPath = (Get-Location).Path,
  [Parameter(Mandatory)] [string]$Name,
  [Parameter(Mandatory)] [string]$Title,
  [Parameter(Mandatory)] [ValidateSet(
    "策略、养成与大型玩法",
    "动作、射击与即时反应",
    "益智、解谜与回合",
    "模拟、经营与日程")] [string]$Category,
  [string]$Prefix = ($Name.ToUpper() -replace "[^A-Z0-9]", "")
)

$ErrorActionPreference = "Stop"

$skillRoot = Split-Path -Parent $PSCommandPath
$skeleton  = Join-Path $skillRoot "..\assets\skeleton.html"
$target    = Join-Path $RepoPath "$Name.html"

if (-not (Test-Path $skeleton)) { throw "skeleton not found: $skeleton" }
if (Test-Path $target)          { throw "target already exists: $target" }

if ($Prefix.Length -lt 2) {
  # Derive a 4-letter tag from the kebab name.
  $Prefix = ($Name.ToUpper() -replace "-", "").PadRight(4, "X").Substring(0, 4)
}

# --- copy skeleton with placeholder rewrites ---
$content = Get-Content -Raw -LiteralPath $skeleton -Encoding UTF8
$content = $content -replace "<title>新游戏</title>", "<title>$Title</title>"
$content = $content -replace "<h1>新游戏</h1>",      "<h1>$Title</h1>"
$content = $content -replace '"NEWG"',               "`"$Prefix`""
$content = $content -replace 'window\.__newgTest',   "window.__${Name}Test"
# write without BOM, LF only
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($target, $content.Replace("`r`n", "`n"), $utf8NoBom)

Write-Host "Wrote $target (prefix=$Prefix)"

# --- update GAME_TIERS.json ---
$tiersPath = Join-Path $RepoPath "GAME_TIERS.json"
$tiers = Get-Content -Raw -LiteralPath $tiersPath | ConvertFrom-Json
if ($tiers.tiers.D -notcontains "$Name.html") {
  $tiers.tiers.D = @($tiers.tiers.D) + "$Name.html"
  $tiers.updatedAt = (Get-Date).ToString("yyyy-MM-dd")
  $tiers | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $tiersPath -Encoding UTF8
  Write-Host "Added to GAME_TIERS.json (tier D)"
} else {
  Write-Host "Already present in GAME_TIERS.json"
}

# --- update README.md (insert a row in the matching ### category) ---
$readmePath = Join-Path $RepoPath "README.md"
$readme = Get-Content -LiteralPath $readmePath -Encoding UTF8
$categoryMarker = "### $Category"
$row = "| D | [$Title](https://wangzifan396-wzf.github.io/mini-browser-games/$Name.html) | 待填：内容与玩法 | 待填：操作 |"
$inserted = $false
for ($i = 0; $i -lt $readme.Count; $i++) {
  if ($readme[$i] -match "^$([regex]::Escape($categoryMarker))") {
    # walk forward to the next blank line / next heading
    for ($j = $i + 1; $j -lt $readme.Count; $j++) {
      if ($readme[$j] -match "^(###|##) ") { break }
    }
    $readme = @($readme[0..($j-1)] + $row + $readme[$j..($readme.Count-1)])
    $inserted = $true
    break
  }
}
if ($inserted) {
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllLines($readmePath, $readme, $utf8NoBom)
  Write-Host "Inserted row in README.md under '$Category'"
} else {
  Write-Warning "Could not locate category '$Category' in README.md; add the row manually."
}

# --- update GAME_AUDIT.md ---
$auditPath = Join-Path $RepoPath "GAME_AUDIT.md"
$audit = Get-Content -LiteralPath $auditPath -Encoding UTF8
$heading = "### D 第1款"   # placeholder; bump to match existing count manually
$needFix = $true
for ($i = 0; $i -lt $audit.Count; $i++) {
  if ($audit[$i] -match "^### D 绾э紙\d+ 娆撅級") {
    $current = [int]([regex]::Match($audit[$i], "\d+").Value)
    $audit[$i] = "### D 第$($current + 1)款"
    $newCount = $current + 1
    $needFix = $false
    break
  }
}
if ($needFix) {
  $audit += $heading
  $newCount = 1
}
$audit += "| $Title | `<$Name.html>` | 占位：等待 A 级四项证据 | 0 | 0 | 0 |"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllLines($auditPath, $audit, $utf8NoBom)
Write-Host "Updated GAME_AUDIT.md (D heading now $newCount)"

Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Edit $target — implement tick() / renderer / references."
Write-Host "  2. Implement window.__${Name}Test.validateContent() and referenceResult(i)."
Write-Host "  3. Run: node promo-video/scripts/check-game-tiers.mjs"