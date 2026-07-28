@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File ".\tools\setup-art-pipeline.ps1"
if errorlevel 1 (
  echo.
  echo 初始化失败，请查看上方错误信息。
  pause
  exit /b 1
)
echo.
echo 写实美术管线初始化完成。
pause
