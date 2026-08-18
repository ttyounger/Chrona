@echo off
setlocal
title Chrona
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-server.ps1"
if errorlevel 1 (
  echo.
  echo Startup failed. Please check startup-error.log.
  pause
)
endlocal
