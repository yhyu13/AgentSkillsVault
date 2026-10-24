# Verify that every installed skill's content matches its manifest source dir.
# Prints one line per skill:  MATCH|MISMATCH|MISSING  <name>  <source>
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-install.ps1 -Manifest <file>

param([Parameter(Mandatory = $true)][string]$Manifest)

$ErrorActionPreference = 'Continue'
$Vault = Split-Path -Parent $PSScriptRoot
$ClaudePath = Join-Path $HOME '.claude\skills'

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

$ok = 0; $bad = 0; $missing = 0
foreach ($line in Get-Content -LiteralPath $Manifest -Encoding UTF8) {
  $line = $line.Trim()
  if (-not $line -or $line.StartsWith('#')) { continue }
  $parts = $line -split '\|', 2
  if ($parts.Count -lt 2) { continue }
  $name = $parts[0].Trim()
  $src = $parts[1].Trim()
  if ($src -eq 'HOST') {
    Write-Output ("HOST`t{0}" -f $name)
    continue
  }
  $srcPath = Join-Path $Vault $src
  $instPath = Join-Path $ClaudePath $name
  if (-not (Test-Path -LiteralPath $instPath)) { Write-Output ("MISSING`t{0}`t{1}" -f $name, $src); $missing++; continue }
  if (-not (Test-Path -LiteralPath $srcPath)) { Write-Output ("NOSRC`t{0}`t{1}" -f $name, $src); $missing++; continue }
  $hi = Get-TreeHash -Path $instPath
  $hs = Get-TreeHash -Path $srcPath
  if ($hi -eq $hs) { Write-Output ("MATCH`t{0}`t{1}" -f $name, $src); $ok++ }
  else { Write-Output ("MISMATCH`t{0}`t{1}" -f $name, $src); $bad++ }
}
Write-Host ("`nmatch={0} mismatch={1} missing={2}" -f $ok, $bad, $missing)
