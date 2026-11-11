@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

where bash >nul 2>nul
if errorlevel 1 (
  echo.
  echo   [!] 找不到 bash。本脚本需要 Git Bash。
  echo       装 Git for Windows 时勾选 "Add to PATH" 即可。
  echo.
  pause
  exit /b 1
)

echo.
bash "scripts/update.sh" %*
echo.
pause
