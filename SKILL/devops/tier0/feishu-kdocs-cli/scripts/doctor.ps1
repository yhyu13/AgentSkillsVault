# Health check for the Feishu / Kingsoft office CLI stack.
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/doctor.ps1
# Read-only: never prints tokens, never changes config.

$ErrorActionPreference = "Continue"
$fail = 0
$warn = 0

function Line($state, $label, $detail) {
    $tag = switch ($state) { "OK" { "[ OK ]" } "WARN" { "[WARN]" } default { "[FAIL]" } }
    Write-Host ("{0} {1,-28} {2}" -f $tag, $label, $detail)
}

function Resolve-Tool($name, $fallback) {
    $cmd = Get-Command $name -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    foreach ($p in $fallback) { if (Test-Path $p) { return $p } }
    return $null
}

# --- lark-cli -------------------------------------------------------------
$npmRoot = if ($env:APPDATA) { Join-Path $env:APPDATA "npm" } else { "" }
$lark = Resolve-Tool "lark-cli" @((Join-Path $npmRoot "lark-cli.cmd"), (Join-Path $npmRoot "lark-cli"))
if ($lark) {
    $v = (& $lark --version 2>&1 | Out-String).Trim()
    Line "OK" "lark-cli" "$v  ($lark)"
    $raw = & $lark auth status 2>&1 | Out-String
    try {
        $st = $raw | ConvertFrom-Json
        $u = $st.identities.user
        if ($u.tokenStatus -eq "valid") {
            Line "OK" "feishu login" ("user=" + $u.userName + " refreshUntil=" + $u.refreshExpiresAt)
        } elseif ($u.status -eq "ready") {
            Line "WARN" "feishu login" "identity ready but token not valid; run: lark-cli auth login"
            $warn++
        } else {
            Line "FAIL" "feishu login" "run: lark-cli auth login --recommend"
            $fail++
        }
    } catch {
        Line "WARN" "feishu login" "auth status not JSON; inspect manually"
        $warn++
    }
} else {
    Line "FAIL" "lark-cli" "not found; npm install -g @larksuite/cli"
    $fail++
}

# --- kdocs-cli ------------------------------------------------------------
$kdocs = Resolve-Tool "kdocs-cli" @(
    (Join-Path $env:LOCALAPPDATA "kdocs-cli\kdocs-cli.exe"),
    (Join-Path $HOME "bin\kdocs-cli.exe")
)
if ($kdocs) {
    $v = (& $kdocs version 2>&1 | Out-String).Trim()
    Line "OK" "kdocs-cli" "$v  ($kdocs)"
    $raw = & $kdocs auth status 2>&1 | Out-String
    try {
        $st = $raw | ConvertFrom-Json
        if ($st.authenticated) {
            Line "OK" "kdocs login" ("source=" + $st.source + " token=" + $st.token)
        } else {
            Line "FAIL" "kdocs login" "run: kdocs-cli auth login  (or set-token via stdin)"
            $fail++
        }
    } catch {
        Line "WARN" "kdocs login" "auth status not JSON; inspect manually"
        $warn++
    }
} else {
    Line "FAIL" "kdocs-cli" "not found; run the official Skill setup.ps1, then copy the exe onto PATH"
    $fail++
}

# --- Skills on disk -------------------------------------------------------
$skills = Join-Path $HOME ".agents\skills"
foreach ($name in @("kdocs", "lark-doc", "lark-im")) {
    if (Test-Path (Join-Path $skills $name)) {
        Line "OK" ("skill " + $name) (Join-Path $skills $name)
    } else {
        Line "WARN" ("skill " + $name) "missing; kdocs: unzip kdocs.zip; lark: npx skills add https://open.feishu.cn --skill -y"
        $warn++
    }
}

# --- Cindy custom MCP entries (optional) ----------------------------------
$cindyDb = Get-ChildItem (Join-Path $env:APPDATA "Cindy") -Filter "cindy-*.db" -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -notmatch "\.bak|migration|lock" } |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
$python = Get-Command python -ErrorAction SilentlyContinue
if ($cindyDb -and $python) {
    $code = @"
import sqlite3, sys
db = r'$($cindyDb.FullName)'
c = sqlite3.connect('file:' + db + '?mode=ro&immutable=1', uri=True)
for i, n, u in c.execute('select id, name, url from custom_mcp_servers'):
    print(f'{i}\t{n}\t{u}')
"@
    $rows = & $python.Source -c $code 2>&1
    if ($LASTEXITCODE -eq 0 -and $rows) {
        foreach ($r in $rows) {
            $p = $r -split "`t"
            Line "OK" ("cindy mcp " + $p[1]) $p[2]
        }
    } else {
        Line "WARN" "cindy mcp" "no custom_mcp_servers rows (or DB unreadable)"
        $warn++
    }
} else {
    Line "WARN" "cindy mcp" "skipped (Cindy DB or python not found)"
    $warn++
}

Write-Host ""
Write-Host ("summary: {0} fail, {1} warn" -f $fail, $warn)
if ($fail -gt 0) { exit 1 } else { exit 0 }
