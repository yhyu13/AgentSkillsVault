# capture_rdc.ps1 — rdc-cli launch (ExecuteAndInject, v1.41) + timed capture trigger.
#
# Why not renderdoccmd (v1.45): the python renderdoc module is v1.41 and cannot
# control targets injected by the v1.45 DLL (protocol mismatch, verified).
# Why forward-slash paths: rdc-cli joins app args with shlex.join (POSIX rules);
# backslashes get single-quoted and UE receives garbage. Forward slashes are
# shlex-safe and Windows accepts them fine.
#
# M4 CVar handling: -ExecCmds="r.Shadow.M4.PointLight 0" would contain a space
# (shlex-quoted -> broken), so we use ini [ConsoleVariables] injection instead.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File capture_rdc.ps1 -Name "M4_point_try23_simple_NoM4" -WaitSecs 60 -M4Value 0
#   powershell -ExecutionPolicy Bypass -File capture_rdc.ps1 -Name "M4_point_try23_simple_Wrong" -WaitSecs 25

param(
    [string]$Name     = "M4_point_try23_simple_NoM4",
    [string]$M4Value  = "",   # "0" or "1" -> write r.Shadow.M4.PointLight to ini; "" = use compiled default (1)
    [switch]$GameMode,        # default: editor viewport mode (map has saved editor camera)
    [switch]$KeepOpen         # keep editor open after capture (interactive: adjust camera, capture again)
)

$ErrorActionPreference = "Stop"

$exe     = "C:/Epic/UE_Engine/UE4_27Chaos/UnrealEngine/Engine/Binaries/Win64/UE4Editor.exe"
$proj    = "C:/Epic/UE_Project/UE27Chaos/TopDown27Chaos/TopDown27Chaos.uproject"
$outDir  = "C:\Epic\UE_Project\UE27Chaos\TopDown27Chaos\RenderDoc"
$out     = Join-Path $outDir "$Name.rdc"
$map     = "/Game/TopDownBP/Maps/NewWorld"
$iniFile = "C:\Epic\UE_Project\UE27Chaos\TopDown27Chaos\Saved\Config\Windows\Engine.ini"

Write-Host "[0/5] Cleanup + CVar ini ..."
Get-Process UE4Editor -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Remove-Item $out -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# ---- CVar injection via ini
$iniLines = Get-Content $iniFile -ErrorAction SilentlyContinue
if (-not $iniLines) { $iniLines = @() }
$iniLines = $iniLines | Where-Object { $_ -notmatch '^r\.Shadow\.M4\.PointLight=' }
if ($M4Value -ne "") {
    $hasSection = $iniLines | Where-Object { $_ -eq '[ConsoleVariables]' }
    if (-not $hasSection) { $iniLines += '[ConsoleVariables]' }
    $iniLines += "r.Shadow.M4.PointLight=$M4Value"
}
Set-Content -Path $iniFile -Value $iniLines -Encoding ASCII
if ($M4Value -ne "") { Write-Host "  ini: r.Shadow.M4.PointLight=$M4Value" } else { Write-Host "  ini: cleared (compiled default)" }

Write-Host "[1/5] rdc capture --trigger (inject + launch) ..."
$appArgs = @($exe, $proj, $map)
if ($GameMode) {
    $appArgs += @("-game", "-windowed", "-resx=800", "-resy=600")
} else {
    $appArgs += @("-windowed", "-resx=800", "-resy=600")  # editor mode: opens map in viewport with saved camera
}
$rdcArgs = @("capture", "--trigger", "-o", $out, "--json", "--") + $appArgs
$launchOut = & rdc @rdcArgs 2>&1 | Out-String
Write-Host $launchOut
$uePid = 0
if ($launchOut -match '"pid"\s*:\s*(\d+)') { $uePid = [int]$Matches[1] }
if ($uePid -eq 0) { Write-Error "FAILED: no pid"; exit 1 }
Write-Host "uePid=$uePid"

Write-Host "[2/5] Waiting for viewport frames + capture (window-signal based) ..."
python (Join-Path $outDir "wait_and_capture.py") $out $uePid 360
if ($LASTEXITCODE -ne 0) {
    Get-Process UE4Editor -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Error "FAILED: capture step failed"
    exit 1
}

# restore ini (remove injected cvar)
$iniLines = Get-Content $iniFile -ErrorAction SilentlyContinue | Where-Object { $_ -notmatch '^r\.Shadow\.M4\.PointLight=' }
Set-Content -Path $iniFile -Value $iniLines -Encoding ASCII

if ($KeepOpen) {
    Write-Host "[3/3] DONE (editor left open for interactive capture): $out"
    Write-Host "  Trigger another capture anytime: python $outDir\wait_and_capture.py <new.rdc> $uePid 60"
} else {
    Write-Host "[3/3] Killing editor ..."
    Get-Process UE4Editor -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}

if (Test-Path $out) {
    Write-Host "DONE: $out ($((Get-Item $out).Length) bytes)"
} else {
    Write-Error "FAILED: no capture file"
    exit 1
}
