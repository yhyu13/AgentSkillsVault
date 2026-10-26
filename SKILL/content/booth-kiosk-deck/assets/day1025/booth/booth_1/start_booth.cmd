@echo off
rem 展位机一键启动：Edge 全屏 kiosk，允许无手势自动出声，开机即循环播放。
rem 退出：Alt+F4。独立用户目录，保证参数在已有 Edge 进程时也生效。
set "HERE=%~dp0"
set "EDGE=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE%" set "EDGE=msedge"
start "" "%EDGE%" --kiosk "file:///%HERE:\=/%slides.html" --edge-kiosk-type=fullscreen --autoplay-policy=no-user-gesture-required --no-first-run --user-data-dir="%TEMP%\booth1-edge-kiosk"
