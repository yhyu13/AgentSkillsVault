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
#        powershell ... -File scripts/build-manifest.ps1 -TopBandsPerCategory 2
#        powershell ... -File scripts/build-manifest.ps1 -NoBandFilter
#
# Install scope (how many skill bands per category are installed at all) is read
# from scripts/install-scope.json when present; CLI switches override it.
# The band is the tierN directory of SKILL/<category>/tierN/<skill> set by
# docs/skill-capacity-audit/rearrange-tiers.ps1.

param(
  [string]$Vault = (Split-Path -Parent $PSScriptRoot),
  [int]$TopBandsPerCategory = -1,   # -1 = use scripts/install-scope.json, 0 = no limit
  [switch]$NoBandFilter,
  [string]$OutFile = '',            # write the manifest here instead (freshness probe)
  [switch]$Quiet
)

$ErrorActionPreference = 'Continue'

# Tier assignment: which skills stay in the harness's always-visible listing.
# scripts/skill-tiers.txt is the hand-edited source of truth; this file is
# regenerated from it, so never hand-edit install-manifest.txt.
$TierFile = Join-Path $Vault 'scripts\skill-tiers.txt'
$tiers = @{}
if (Test-Path -LiteralPath $TierFile) {
  foreach ($line in (Get-Content -LiteralPath $TierFile -Encoding UTF8)) {
    $l = $line.Trim()
    if (-not $l -or $l.StartsWith('#') -or $l -notmatch '\|') { continue }
    $p = $l -split '\|', 2
    $tiers[$p[0].Trim()] = $p[1].Trim().ToUpper()
  }
}
$untiered = New-Object System.Collections.Generic.List[string]
function Get-Tier([string]$name) {
  if ($tiers.ContainsKey($name)) { return $tiers[$name] }
  $untiered.Add($name)
  return 'A'   # unlisted skills default to visible; verify-capacity.ps1 flags them
}

# Vendor-sourced skills to install, as "<name>|<relative-vendor-path>".
# Skills retired by the 2026-10-25 defect audit are NOT here any more; their
# upstream copy stays under vendor/ and REMOVED-SKILLS.md records why.
$VendorSkills = @(
  'algorithmic-art|vendor/anthropics-skills/skills/algorithmic-art',
  'canvas-design|vendor/anthropics-skills/skills/canvas-design',
  'claude-api|vendor/anthropics-skills/skills/claude-api',
  'discernment-nudge|vendor/anthropics-skills/skills/discernment-nudge',
  'slack-gif-creator|vendor/anthropics-skills/skills/slack-gif-creator',
  'web-artifacts-builder|vendor/anthropics-skills/skills/web-artifacts-builder',
  'xlsx|vendor/anthropics-skills/skills/xlsx',
  'browser-automation|vendor/claude-skills/engineering/skills/browser-automation',
  'deep-research|vendor/claude-skills/research/deep-research/skills/deep-research',
  'investment-masters|vendor/investment-masters'
)
# docx, pdf and pptx were promoted to curated copies under SKILL/content on
# 2026-10-25: a vendored file must not be edited in place (it is lost on
# `git submodule update`), and the description had to be rewritten so the
# document skills stop shadowing each other. The vendor copies stay as the
# upstream record.

# Host-local skills: installed by hand from outside this vault. Never overwritten.
#
# RETIRED 2026-11-08: the four Kimi v1 game skills (game-proto-validation,
# blender-game-assets, engine-project-agent, game-liveops-assist) used to be
# listed here. Their real directories lived in ~/.agents and were destroyed on
# 2026-11-05 by the old HOST branch of sync-skills.ps1, which deleted a
# non-junction dir before linking - leaving ~/.claude and ~/.agents pointing at
# each other. Nothing is left on disk (searched C:\Users\yuhang and D:\GitRepo-AI),
# and the vault's -v2 successors ship the same skills. The dead links were
# removed and the names are blocked by .kilo/removed-skills.txt.
# See KNOWLEDGE.md "Skill store incident".
$HostSkills = @()

# docs/ holds reference material and retired-skill archives, not installable skills.
# TEMPLATE* 是模板仓（submodule）：里面的 .claude/skills/ 是随模板分发的副本，
# 不是 vault 的 curated 技能——扫进来会覆盖同名技能。
# TEMPLATE is a submodule reference repo (Agent_Template_Repo_Setup1); its
# embedded .claude/skills/ copies must never enter the curated install list.
# Worktrees inside the repo (.cindy-worktrees/, .worktrees/) are full copies of
# this same tree — scanning them made the manifest point at throwaway copies.
$skipDirs = '[\\/](\.git|\.github|\.changeset|\.claude-plugin|\.out-of-scope|\.cindy-worktrees|\.worktrees|node_modules|archived|vendor|docs|TEMPLATE[A-Za-z0-9_-]*)[\\/]'

$curated = @{}
Get-ChildItem -LiteralPath $Vault -Recurse -Directory -ErrorAction SilentlyContinue |
  # Match the VAULT-RELATIVE path, never the absolute one: when the vault itself
  # lives under .cindy-worktrees\<name> (Claude Code worktree checkouts do
  # exactly that), every absolute path contains that segment and the whole tree
  # was skipped - producing a 10-line manifest that sync would then obey.
  Where-Object { $_.FullName.Substring($Vault.Length).TrimEnd('\') -notmatch $skipDirs } |
  Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'SKILL.md') } |
  # Longest path first: the curated set is keyed by leaf directory name, so
  # when a skill directory contains a nested copy of itself the shallow one
  # must win. The map is written below, so the FIRST assignment wins —
  # hence descending sort. (Ascending sort let the deepest copy overwrite
  # the shallow one and pointed the manifest at worktree copies.)
  Sort-Object { $_.FullName.Length } -Descending |
  ForEach-Object {
    $rel = $_.FullName.Substring($Vault.Length).TrimStart('\','/').Replace('\','/')
    if (-not $curated.ContainsKey($_.Name)) { $curated[$_.Name] = $rel }
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

# --- install scope: keep only the top N score bands of each category ---------
# The band is the tierN directory created by docs/skill-capacity-audit/rearrange-tiers.ps1.
# Excluded skills are still in the vault and still listed (as comments) in the
# manifest, so restoring one is a config change plus a sync, not a re-audit.
$effectiveTop = 0
if (-not $NoBandFilter) {
  if ($TopBandsPerCategory -ge 0) {
    $effectiveTop = $TopBandsPerCategory
  } else {
    $scopeFile = Join-Path $Vault 'scripts\install-scope.json'
    if (Test-Path -LiteralPath $scopeFile) {
      try {
        $scope = Get-Content -LiteralPath $scopeFile -Raw -Encoding UTF8 | ConvertFrom-Json
        if ($null -ne $scope.topBandsPerCategory) { $effectiveTop = [int]$scope.topBandsPerCategory }
      } catch {
        Write-Warning ("install-scope.json is unreadable, installing every band: {0}" -f $_)
      }
    }
  }
}

$excluded = @{}
if ($effectiveTop -gt 0) {
  $byCat = @{}
  foreach ($r in $winner.Values) {
    if ($r.Kind -ne 'curated') { continue }
    if ($r.Source -notmatch '^SKILL/([^/]+)/(tier[0-9])/') { continue }
    $cat = $Matches[1]; $band = $Matches[2]
    if (-not $byCat.ContainsKey($cat)) { $byCat[$cat] = @{} }
    if (-not $byCat[$cat].ContainsKey($band)) { $byCat[$cat][$band] = New-Object System.Collections.Generic.List[string] }
    $byCat[$cat][$band].Add($r.Name)
  }
  foreach ($cat in $byCat.Keys) {
    $bands = @($byCat[$cat].Keys | Sort-Object)   # tier0 < tier1 < ... < tier4
    $keep = @($bands | Select-Object -First $effectiveTop)
    foreach ($b in $bands) {
      if ($keep -contains $b) { continue }
      foreach ($n in $byCat[$cat][$b]) {
        $excluded[$n] = [pscustomobject]@{ Source = $winner[$n].Source; Band = $b; Category = $cat }
      }
    }
  }
}

$out = if ($OutFile) { $OutFile } else { Join-Path $Vault 'scripts\install-manifest.txt' }
# Held-back skills get their own file so the CI gate can tell "deliberately not
# installed" apart from "forgotten". check_manifest.py reads it.
# When emitting a probe manifest elsewhere, the hold-back list follows it.
$holdOut = Join-Path (Split-Path $out -Parent) 'install-holdback.txt'
$lines = New-Object System.Collections.Generic.List[string]
$lines.Add('# Install manifest — the authoritative list of user-level skills and their vault source.')
$lines.Add('#')
$lines.Add('# Format:  <skill-name>|<relative-path-in-vault>|<tier>')
$lines.Add('#          <skill-name>|HOST|<tier>   -> installed outside this vault; sync leaves it alone')
$lines.Add('# Lines starting with ''#'' and blank lines are ignored.')
$lines.Add('#')
$lines.Add('# Tier comes from scripts/skill-tiers.txt: A = always model-invocable,')
$lines.Add('# B = installed but hidden from auto-selection, C = not installed.')
$lines.Add('#')
$lines.Add('# THIS FILE IS GENERATED - edit scripts/skill-tiers.txt, not this file.')
$lines.Add('# Rules (see AGENTS.md):')
$lines.Add('#   * ~/.agents/skills/<name>   is the ONE real copy (primary store)')
$lines.Add('#   * ~/.claude, ~/.kilo, ~/.codex ... are junction views onto it (unless linkViews=false)')
$lines.Add('#   * a skill must appear here to be installed; unlisted skills are never auto-installed')
  $lines.Add('#   * removing a line here + deleting it from the stores is how a skill is retired')
  $lines.Add('#')
  $lines.Add('# Skills retired on 2026-10-25 by the defect audit are absent here and are')
  $lines.Add('# documented in REMOVED-SKILLS.md (reason + upstream copy kept for re-adding).')
  $lines.Add('#')
  $lines.Add('# Regenerate with: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-manifest.ps1')
  $lines.Add('#')
  if ($effectiveTop -gt 0) {
    $lines.Add('# INSTALL SCOPE: only the top {0} score band(s) of each category are installed.' -f $effectiveTop)
    $lines.Add('# Set scripts/install-scope.json -> {"topBandsPerCategory": 0} to install every band.')
    $lines.Add('# Skills below the cut are listed as comments at the end of this file.')
  } else {
    $lines.Add('# INSTALL SCOPE: every score band of every category is installed (no filter).')
  }
$lines.Add('')

foreach ($group in @('curated','vendor','host')) {
  $label = switch ($group) {
    'curated' { 'curated (vault-owned)' }
    'vendor'  { 'vendor-sourced (upstream submodules)' }
    'host'    { 'host-local (installed outside this vault; sync leaves them untouched)' }
  }
  $lines.Add("# --- $label ---")
  foreach ($r in ($winner.Values | Where-Object { $_.Kind -eq $group } | Sort-Object Name)) {
    if ($excluded.ContainsKey($r.Name)) { continue }
    $lines.Add(('{0}|{1}|{2}' -f $r.Name, $r.Source, (Get-Tier $r.Name)))
  }
  $lines.Add('')
}

if ($excluded.Count -gt 0) {
  $lines.Add('# --- not installed: below the top {0} band(s) of its category ---' -f $effectiveTop)
  foreach ($name in ($excluded.Keys | Sort-Object)) {
    $e = $excluded[$name]
    $lines.Add(('# {0}|{1}|{2}|band={3}|category={4}' -f $name, $e.Source, (Get-Tier $name), $e.Band, $e.Category))
  }
  $lines.Add('')
}

[System.IO.File]::WriteAllLines($out, $lines, (New-Object System.Text.UTF8Encoding($false)))

# Machine-readable hold-back list, for scripts/check_manifest.py: a curated skill
# absent from the manifest is only an error when it is NOT listed here.
$holdLines = New-Object System.Collections.Generic.List[string]
$holdLines.Add('# Skills deliberately NOT installed: below the top N score bands of their category.')
$holdLines.Add('# Generated by scripts/build-manifest.ps1 from scripts/install-scope.json - do not hand-edit.')
$holdLines.Add('# Format: <skill-name>|<band>|<category>')
foreach ($name in ($excluded.Keys | Sort-Object)) {
  $e = $excluded[$name]
  $holdLines.Add(('{0}|{1}|{2}' -f $name, $e.Band, $e.Category))
}
[System.IO.File]::WriteAllLines($holdOut, $holdLines, (New-Object System.Text.UTF8Encoding($false)))
if (-not $Quiet) {
  Write-Host ("manifest written: {0} skills installed ({1} held back), {2}" -f ($winner.Count - $excluded.Count), $excluded.Count, $out)
}
if ($untiered.Count -gt 0 -and -not $Quiet) {
  Write-Warning ("{0} skill(s) have no row in scripts/skill-tiers.txt and defaulted to tier A: {1}" -f $untiered.Count, ($untiered -join ', '))
}
