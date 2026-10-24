<#
.SYNOPSIS
  Refresh GitHub star counts for agent-skill topics via the GitHub search API.

.DESCRIPTION
  One search request per topic (sorted by stars, descending). Prints
  "stars<TAB>full_name<TAB>description" so it can be diffed against a
  SKILL_RADAR note.

  Rate limits (unauthenticated): 60 core req/hour, 10 search req/minute.
  Set GITHUB_TOKEN in the environment to raise the limit.

.EXAMPLE
  pwsh -File refresh-stars.ps1 -Topics "agent-skills","observability"

.EXAMPLE
  pwsh -File refresh-stars.ps1 -Topics "topic:agent-skills" -PerPage 100 -OutFile stars.txt
#>
[CmdletBinding()]
param(
  [string[]]$Topics = @("agent-skills", "claude-skills", "ai-agents", "mcp", "observability", "sre"),
  [int]$PerPage = 60,
  [string]$OutFile = ""
)

$ErrorActionPreference = "Stop"
$headers = @{ "User-Agent" = "skill-radar" }
if ($env:GITHUB_TOKEN) { $headers["Authorization"] = "Bearer $env:GITHUB_TOKEN" }

$rows = foreach ($t in $Topics) {
  $q = if ($t -match ":") { $t } else { "topic:$t" }
  $uri = "https://api.github.com/search/repositories?q=$([uri]::EscapeDataString($q))&sort=stars&order=desc&per_page=$PerPage"
  try {
    $res = Invoke-RestMethod -Uri $uri -Headers $headers -TimeoutSec 30
  } catch {
    Write-Warning "query failed: $q :: $($_.Exception.Message)"
    continue
  }
  Write-Host "# topic:$q (total $($res.total_count))"
  foreach ($item in $res.items) {
    "$($item.stargazers_count)`t$($item.full_name)`t$($item.description -replace "`t", ' ')"
  }
  Start-Sleep -Seconds 7   # stay under 10 search req/min
}

if ($OutFile) {
  $rows | Out-File -LiteralPath $OutFile -Encoding utf8
  Write-Host "written: $OutFile ($($rows.Count) rows)"
} else {
  $rows
}
