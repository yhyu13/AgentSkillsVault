# Compare an installed skill dir against a candidate source dir by content hash.
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/compare-skill.ps1 -A <dir> -B <dir>
param([string]$A, [string]$B)

function Get-TreeHash {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return $null }
  # Resolve to an absolute path: relative paths would break the relative-path slicing below.
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

$ha = Get-TreeHash -Path $A
$hb = Get-TreeHash -Path $B
[pscustomobject]@{ A = $A; B = $B; Match = ($ha -eq $hb); HashA = $ha; HashB = $hb }
