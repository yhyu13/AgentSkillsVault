<#
  Publish one Markdown file to Feishu Docs and/or Kingsoft Docs (kdocs).

    Feishu   : lark-cli docs +create / +update      (```mermaid fences become whiteboards)
    Kingsoft : kdocs-cli drive create-file-with-content / otl insert-content

  Usage
    powershell -File scripts/publish-md.ps1 -File .\doc.md
    powershell -File scripts/publish-md.ps1 -File .\doc.md -Target kdocs
    powershell -File scripts/publish-md.ps1 -File .\doc.md -Update     # reuse ids from state

  Options
    -File      Markdown source (UTF-8). Required.
    -Title     Doc title. Default: first "# " heading, else file name.
    -Target    both (default) | feishu | kdocs
    -Update    Overwrite the docs recorded in the state file instead of creating new ones.
    -StateFile Default: $HOME/.agent-publish-state.json (absolute path -> platform ids)

  Notes
    - YAML frontmatter and the first H1 are removed from the body; the H1 becomes the title.
    - kdocs rejects \\ / : * ? " < > | in file names, so the title is swapped to
      full-width lookalikes for the kdocs copy only.
    - Feishu renders ```mermaid as an editable whiteboard; kdocs keeps it as a
      code block (lang=mermaid), so diagrams do not render natively there.
    - Both CLIs must already be authenticated; see scripts/doctor.ps1.
#>
param(
  [Parameter(Mandatory = $true)][string]$File,
  [string]$Title,
  [ValidateSet('both', 'feishu', 'kdocs')][string]$Target = 'both',
  [switch]$Update,
  [string]$StateFile = (Join-Path $HOME '.agent-publish-state.json')
)

# Native CLIs write progress/warnings to stderr. Keep the shell from turning
# that into a terminating error; failures are detected from the parsed result.
$ErrorActionPreference = 'Continue'

function Fail($msg) { Write-Host "ERROR: $msg" -ForegroundColor Red; exit 1 }
function Step($msg) { Write-Host "== $msg" -ForegroundColor Cyan }
function Ok($msg) { Write-Host "   $msg" -ForegroundColor Green }

function Read-Utf8($path) {
  return [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
}

function Write-Utf8($path, $text) {
  $enc = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($path, $text, $enc)
}

function Invoke-Native($cmd, [string[]]$argv) {
  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'SilentlyContinue'
  try {
    $out = & $cmd @argv 2>&1
  } finally {
    $ErrorActionPreference = $prev
  }
  $stdout = ($out | Where-Object { $_ -isnot [System.Management.Automation.ErrorRecord] } | Out-String).Trim()
  $stderr = ($out | Where-Object { $_ -is [System.Management.Automation.ErrorRecord] } | Out-String).Trim()
  return [pscustomobject]@{ Text = $stdout; Err = $stderr; Exit = $LASTEXITCODE }
}

function ConvertTo-KdocsName($title) {
  # kdocs rejects these 9 half-width characters in file names.
  $bad = [char[]]@(0x5C, 0x2F, 0x3A, 0x2A, 0x3F, 0x22, 0x3C, 0x3E, 0x7C)
  $good = [char[]]@(0xFF3C, 0xFF0F, 0xFF1A, 0xFF0A, 0xFF1F, 0xFF02, 0xFF1C, 0xFF1E, 0xFF5C)
  $chars = $title.ToCharArray()
  for ($i = 0; $i -lt $chars.Count; $i++) {
    $idx = [Array]::IndexOf($bad, $chars[$i])
    if ($idx -ge 0) { $chars[$i] = $good[$idx] }
  }
  return (-join $chars)
}

function Split-TitleAndBody($markdown, $fallbackTitle) {
  # Drop YAML frontmatter so the first real heading wins.
  if ($markdown -match '^(?s)^---\r?\n.*?\r?\n---\r?\n') {
    $markdown = $markdown.Substring($Matches[0].Length)
  }
  $lines = $markdown -split "`r?`n"
  $title = $fallbackTitle
  $bodyStart = 0
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match '^#\s+(.+?)\s*$') {
      $title = $Matches[1].Trim()
      $bodyStart = $i + 1
      break
    }
  }
  $body = if ($bodyStart -lt $lines.Count) { ($lines[$bodyStart..($lines.Count - 1)]) -join "`n" } else { '' }
  return [pscustomobject]@{ Title = $title; Body = $body.TrimStart("`n") }
}

function Load-State($path) {
  if (Test-Path -LiteralPath $path) {
    try { return (Read-Utf8 $path | ConvertFrom-Json) } catch { }
  }
  return [pscustomobject]@{}
}

function Save-State($path, $state) {
  Write-Utf8 $path ($state | ConvertTo-Json -Depth 8)
}

function Get-Prop($obj, $name) {
  if ($null -eq $obj) { return $null }
  $p = $obj.PSObject.Properties[$name]
  if ($p) { return $p.Value }
  return $null
}

# ---------------------------------------------------------------- Feishu
function Publish-Feishu($title, $bodyFile, $state, $key) {
  $prev = Get-Prop $state $key
  $prevFeishu = Get-Prop $prev 'feishu'
  $token = Get-Prop $prevFeishu 'token'

  if ($Update -and $token) {
    Step "Feishu: overwrite $token"
    $r = Invoke-Native 'lark-cli' @('docs', '+update', '--doc', $token, '--command', 'overwrite', '--doc-format', 'markdown', '--content', "@$bodyFile")
    $res = $r.Text | ConvertFrom-Json
    if (-not $res.ok) { Fail "feishu update failed: $($r.Text) $($r.Err)" }
    Ok "updated $token"
    return [pscustomobject]@{ token = $token; url = (Get-Prop $prevFeishu 'url') }
  }

  Step "Feishu: create '$title'"
  $r = Invoke-Native 'lark-cli' @('docs', '+create', '--title', $title, '--doc-format', 'markdown', '--content', "@$bodyFile")
  $res = $r.Text | ConvertFrom-Json
  if (-not $res.ok) { Fail "feishu create failed: $($r.Text) $($r.Err)" }
  $doc = $res.data.document
  Ok "created $($doc.document_id)"
  return [pscustomobject]@{ token = $doc.document_id; url = $doc.url }
}

# ---------------------------------------------------------------- kdocs
function Invoke-Kdocs($service, $action, $payload) {
  $tmp = [System.IO.Path]::GetTempFileName()
  try {
    Write-Utf8 $tmp ($payload | ConvertTo-Json -Depth 8 -Compress)
    $r = Invoke-Native 'kdocs-cli' @($service, $action, "@$tmp")
    if (-not $r.Text) { Fail "kdocs $service $action returned nothing: $($r.Err)" }
    $res = $r.Text | ConvertFrom-Json
    # kdocs wraps successful payloads in {code,message,data}; errors keep the envelope.
    if ($res.PSObject.Properties['data'] -and $null -ne $res.data) { return $res.data }
    return $res
  } finally {
    Remove-Item -LiteralPath $tmp -ErrorAction SilentlyContinue
  }
}

function Publish-Kdocs($title, $body, $state, $key) {
  $prev = Get-Prop $state $key
  $prevKdocs = Get-Prop $prev 'kdocs'
  $fileId = Get-Prop $prevKdocs 'file_id'

  if ($Update -and $fileId) {
    Step "kdocs: replace body of $fileId"
    $res = Invoke-Kdocs 'otl' 'insert-content' ([ordered]@{
      file_id = $fileId; title = $title; content = $body; format = 'markdown'; mode = 'replace'
    })
    if ($res.PSObject.Properties['code'] -and $res.code -ne 0) { Fail "kdocs update failed: $($res | ConvertTo-Json -Compress)" }
    Ok "replaced body"
    return [pscustomobject]@{ file_id = $fileId; url = (Get-Prop $prevKdocs 'url') }
  }

  Step "kdocs: create '$title'"
  $res = Invoke-Kdocs 'drive' 'create-file-with-content' ([ordered]@{
    name = (ConvertTo-KdocsName $title); file_extension = 'otl'; content = $body
  })
  if (-not $res.file_id) { Fail "kdocs create failed: $($res | ConvertTo-Json -Compress)" }
  Ok "created $($res.file_id)"
  return [pscustomobject]@{ file_id = $res.file_id; url = $res.link_url }
}

# ---------------------------------------------------------------- main
if (-not (Test-Path -LiteralPath $File)) { Fail "file not found: $File" }
$full = (Resolve-Path -LiteralPath $File).Path
$markdown = Read-Utf8 $full
if (-not $markdown.Trim()) { Fail "file is empty: $full" }

$fallback = [System.IO.Path]::GetFileNameWithoutExtension($full)
$parts = Split-TitleAndBody $markdown $fallback
if ($Title) { $parts.Title = $Title }
if (-not $parts.Body.Trim()) { Fail "document has no body after the title" }

$bodyFile = [System.IO.Path]::GetTempFileName()
Write-Utf8 $bodyFile $parts.Body

$state = Load-State $StateFile
$key = $full
$entry = Get-Prop $state $key
if (-not $entry) { $entry = [pscustomobject]@{} }

$result = [pscustomobject]@{ title = $parts.Title; feishu = $null; kdocs = $null }

if ($Target -in @('both', 'feishu')) {
  $result.feishu = Publish-Feishu $parts.Title $bodyFile $state $key
  $entry | Add-Member -NotePropertyName feishu -NotePropertyValue $result.feishu -Force
}
if ($Target -in @('both', 'kdocs')) {
  $result.kdocs = Publish-Kdocs $parts.Title $parts.Body $state $key
  $entry | Add-Member -NotePropertyName kdocs -NotePropertyValue $result.kdocs -Force
}

$entry | Add-Member -NotePropertyName title -NotePropertyValue $parts.Title -Force
$entry | Add-Member -NotePropertyName updated_at -NotePropertyValue (Get-Date).ToString('s') -Force
$state | Add-Member -NotePropertyName $key -NotePropertyValue $entry -Force
Save-State $StateFile $state
Remove-Item -LiteralPath $bodyFile -ErrorAction SilentlyContinue

Write-Host ''
Write-Host "published: $($parts.Title)"
if ($result.feishu) { Write-Host ("  feishu  {0}" -f $result.feishu.url) }
if ($result.kdocs)  { Write-Host ("  kdocs   {0}" -f $result.kdocs.url) }
Write-Host "  state   $StateFile"
