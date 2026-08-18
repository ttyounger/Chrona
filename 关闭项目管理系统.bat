@echo off
setlocal
title Stop Chrona
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop-server.ps1"
if errorlevel 1 pause
endlocal
