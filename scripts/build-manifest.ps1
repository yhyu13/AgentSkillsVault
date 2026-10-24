# Regenerate scripts/install-manifest.txt from the vault contents.
#
# Source of truth for WHICH skills get installed:
#   1. every curated (non-vendor) skill dir in the vault that contains SKILL.md
#   2. an explicit list of vendor-sourced skills (vendor/<repo>/... paths)
#   3. an explicit list of host-local skills (installed outside this vault)
#
# Curated wins over vendor when both provide the same skill name.
# Host-local skills are never overwritten by this script.
#
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-manifest.ps1

param(
  [string]$Vault = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Continue'

# Vendor-sourced skills to install, as "<name>|<relative-vendor-path>".
# Skills retired by the 2026-10-25 defect audit are NOT here any more; their
# upstream copy stays under vendor/ and REMOVED-SKILLS.md records why.
$VendorSkills = @(
  'algorithmic-art|vendor/anthropics-skills/skills/algorithmic-art',
  'canvas-design|vendor/anthropics-skills/skills/canvas-design',
  'claude-api|vendor/anthropics-skills/skills/claude-api',
  'discernment-nudge|vendor/anthropics-skills/skills/discernment-nudge',
  'docx|vendor/anthropics-skills/skills/docx',
  'pdf|vendor/anthropics-skills/skills/pdf',
  'pptx|vendor/anthropics-skills/skills/pptx',
  'slack-gif-creator|vendor/anthropics-skills/skills/slack-gif-creator',
  'web-artifacts-builder|vendor/anthropics-skills/skills/web-artifacts-builder',
  'xlsx|vendor/anthropics-skills/skills/xlsx',
  'browser-automation|vendor/claude-skills/engineering/skills/browser-automation',
  'deep-research|vendor/claude-skills/research/deep-research/skills/deep-research',
  'investment-masters|vendor/investment-masters',
  'tripo-3d-generation|vendor/tripo-skills'
)

# Host-local skills: installed by hand from outside this vault. Never overwritten.
# Currently none: `goal-persistence` moved into the vault (agents/goal-persistence),
# `media-use` was retired 2026-10-25, and `orchestrate` was an empty orphan dir
# with no SKILL.md (never loadable) and was removed.
$HostSkills = @()

# docs/ holds reference material and retired-skill archives, not installable skills.
$skipDirs = '[\\/](\.git|\.github|\.changeset|\.claude-plugin|\.out-of-scope|node_modules|archived|vendor|docs)[\\/]'

$curated = @{}
Get-ChildItem -LiteralPath $Vault -Recurse -Directory -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -notmatch $skipDirs } |
  Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'SKILL.md') } |
  ForEach-Object {
    $rel = $_.FullName.Substring($Vault.Length).TrimStart('\','/').Replace('\','/')
    $curated[$_.Name] = $rel
  }

$rows = New-Object System.Collections.Generic.List[object]

foreach ($k in ($curated.Keys | Sort-Object)) {
  $rows.Add([pscustomobject]@{ Name = $k; Source = $curated[$k]; Kind = 'curated' })
}
foreach ($v in $VendorSkills) {
  $p = $v -split '\|', 2
  $rows.Add([pscustomobject]@{ Name = $p[0]; Source = $p[1]; Kind = 'vendor' })
}
foreach ($h in $HostSkills) {
  $rows.Add([pscustomobject]@{ Name = $h; Source = 'HOST'; Kind = 'host' })
}

# Curated beats vendor for the same name; host always wins.
$winner = @{}
foreach ($r in $rows) {
  if (-not $winner.ContainsKey($r.Name)) { $winner[$r.Name] = $r; continue }
  $cur = $winner[$r.Name]
  if ($cur.Kind -eq 'host') { continue }
  if ($cur.Kind -eq 'curated' -and $r.Kind -eq 'vendor') { continue }
  $winner[$r.Name] = $r
}

$out = Join-Path $Vault 'scripts\install-manifest.txt'
$lines = New-Object System.Collections.Generic.List[string]
$lines.Add('# Install manifest — the authoritative list of user-level skills and their vault source.')
$lines.Add('#')
$lines.Add('# Format:  <skill-name>|<relative-path-in-vault>')
$lines.Add('#          <skill-name>|HOST          -> installed outside the vault; sync leaves it alone')
$lines.Add('# Lines starting with ''#'' and blank lines are ignored.')
$lines.Add('#')
$lines.Add('# Rules (see AGENTS.md):')
$lines.Add('#   * ~/.claude/skills/<name>   is the ONE real copy (canonical store)')
$lines.Add('#   * ~/.kilo/skills, ~/.codex/skills, ~/.agents/skills are junction views onto it')
$lines.Add('#   * a skill must appear here to be installed; unlisted skills are never auto-installed')
  $lines.Add('#   * removing a line here + deleting it from the stores is how a skill is retired')
  $lines.Add('#')
  $lines.Add('# Skills retired on 2026-10-25 by the defect audit are absent here and are')
  $lines.Add('# documented in REMOVED-SKILLS.md (reason + upstream copy kept for re-adding).')
  $lines.Add('#')
  $lines.Add('# Regenerate with: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-manifest.ps1')
$lines.Add('')

foreach ($group in @('curated','vendor','host')) {
  $label = switch ($group) {
    'curated' { 'curated (vault-owned)' }
    'vendor'  { 'vendor-sourced (upstream submodules)' }
    'host'    { 'host-local (installed outside this vault; sync leaves them untouched)' }
  }
  $lines.Add("# --- $label ---")
  foreach ($r in ($winner.Values | Where-Object { $_.Kind -eq $group } | Sort-Object Name)) {
    $lines.Add(('{0}|{1}' -f $r.Name, $r.Source))
  }
  $lines.Add('')
}

[System.IO.File]::WriteAllLines($out, $lines, (New-Object System.Text.UTF8Encoding($false)))
Write-Host ("manifest written: {0} skills ({1})" -f $winner.Count, $out)
