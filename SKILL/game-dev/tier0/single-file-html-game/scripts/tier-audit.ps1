#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Run the full mini-browser-games tier + catalog + audit pipeline and
  summarise which check failed.

.DESCRIPTION
  Runs (in order):
    1. node promo-video/scripts/check-game-tiers.mjs
    2. node promo-video/scripts/check-pages-catalog.mjs   (skipped if --skip-mobile)
    3. node promo-video/scripts/audit-games.mjs
    4. git diff --check

  Each step is timed. Any non-zero exit code is reported but does not
  stop the rest of the pipeline (use -StopOnFirst to halt on first
  failure). Exit code of this script is 0 only if every step passed.

.PARAMETER RepoPath
  Path to the mini-browser-games repo. Defaults to CWD.

.PARAMETER SkipMobile
  Skip check-pages-catalog.mjs (Playwright). Use when chromium is not
  installed or when iterating on tier-metadata-only edits.

.PARAMETER StopOnFirst
  Stop the pipeline on the first failing check.

.EXAMPLE
  pwsh scripts/tier-audit.ps1

.EXAMPLE
  pwsh scripts/tier-audit.ps1 -SkipMobile -StopOnFirst
#>
[CmdletBinding()]
param(
  [string]$RepoPath = (Get-Location).Path,
  [switch]$SkipMobile,
  [switch]$StopOnFirst
)

$ErrorActionPreference = "Continue"

function Invoke-Step {
  param([string]$Label, [string]$Command, [string[]]$Arguments)
  Write-Host ""
  Write-Host "==> $Label" -ForegroundColor Cyan
  Write-Host "    $Command $($Arguments -join ' ')"
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  & $Command @Arguments
  $code = $LASTEXITCODE
  $sw.Stop()
  $script:results += [pscustomobject]@{
    Label = $Label
    Command = "$Command $($Arguments -join ' ')"
    ExitCode = $code
    Seconds = [math]::Round($sw.Elapsed.TotalSeconds, 1)
  }
  if ($code -ne 0) {
    Write-Host "    FAILED ($code) in $($sw.Elapsed.TotalSeconds)s" -ForegroundColor Red
    if ($StopOnFirst) { throw "stopping on first failure: $Label" }
  } else {
    Write-Host "    OK in $($sw.Elapsed.TotalSeconds)s" -ForegroundColor Green
  }
}

$script:results = @()

Set-Location -LiteralPath $RepoPath

Invoke-Step "tier JSON + README/AUDIT counts" "node" @("promo-video/scripts/check-game-tiers.mjs")

if (-not $SkipMobile) {
  Invoke-Step "catalog + mobile + desktop smoke test" "node" @("promo-video/scripts/check-pages-catalog.mjs")
} else {
  Write-Host ""
  Write-Host "==> catalog + mobile + desktop smoke test" -ForegroundColor Yellow
  Write-Host "    SKIPPED (-SkipMobile)" -ForegroundColor Yellow
}

Invoke-Step "broader audit" "node" @("promo-video/scripts/audit-games.mjs")

Invoke-Step "git diff --check" "git" @("diff", "--check")

Write-Host ""
Write-Host "================ summary ================" -ForegroundColor Cyan
$script:results | Format-Table -AutoSize | Out-String | Write-Host

$failed = @($script:results | Where-Object { $_.ExitCode -ne 0 })
if ($failed.Count -gt 0) {
  Write-Host "$($failed.Count) check(s) failed." -ForegroundColor Red
  exit 1
}
Write-Host "All checks passed." -ForegroundColor Green
exit 0